import Database from 'better-sqlite3';
import { google } from 'googleapis';
import OpenAI from 'openai';
import { createHash } from 'node:crypto';
import { setTimeout as sleep } from 'node:timers/promises';

const env = (name: string, fallback = '') => process.env[name] ?? fallback;
const required = (name: string) => { const v = env(name); if (!v) throw new Error(`Missing env ${name}`); return v; };
const dryRun = env('DRY_RUN', 'true') === 'true';
const once = process.argv.includes('--once');
const intervalMs = Number(env('POLL_INTERVAL_MINUTES', '60')) * 60_000;

const db = new Database(env('DATABASE_PATH', './apd-client-agent.sqlite'));
db.pragma('journal_mode = WAL');
db.exec(`
CREATE TABLE IF NOT EXISTS sources (
  source_key TEXT PRIMARY KEY,
  source_type TEXT NOT NULL,
  external_id TEXT NOT NULL,
  revision TEXT,
  modified_at TEXT,
  content_hash TEXT NOT NULL,
  client_ref TEXT,
  status TEXT NOT NULL DEFAULT 'PROCESSED',
  draft_url TEXT,
  slack_ts TEXT,
  notion_page_id TEXT,
  processed_at TEXT NOT NULL,
  raw_meta TEXT
);
CREATE TABLE IF NOT EXISTS runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  status TEXT NOT NULL,
  discovered INTEGER NOT NULL DEFAULT 0,
  processed INTEGER NOT NULL DEFAULT 0,
  skipped INTEGER NOT NULL DEFAULT 0,
  error TEXT
);
CREATE TABLE IF NOT EXISTS decisions (
  source_key TEXT PRIMARY KEY,
  decision TEXT NOT NULL,
  decided_at TEXT NOT NULL,
  note TEXT
);
`);

const oauth = new google.auth.OAuth2(required('GOOGLE_CLIENT_ID'), required('GOOGLE_CLIENT_SECRET'), env('GOOGLE_REDIRECT_URI', 'http://localhost'));
oauth.setCredentials({ refresh_token: required('GOOGLE_REFRESH_TOKEN') });
const gmail = google.gmail({ version: 'v1', auth: oauth });
const drive = google.drive({ version: 'v3', auth: oauth });
const docs = google.docs({ version: 'v1', auth: oauth });
const openai = new OpenAI({ apiKey: required('OPENAI_API_KEY') });

const keywords = ['cuestionario','check-in','check in','seguimiento','formulario','analítica','analitica','informe','trainingpeaks','nutrición','nutricion','fueling','lesión','lesion'];
const sensitivePatterns = [/\b\d{8}[A-Z]\b/i,/\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b/g,/\b(?:\+34\s*)?[6789]\d{8}\b/g,/\b\d{2,3}(?:[.,]\d+)?\s?kg\b/gi];
const sha = (s: string) => createHash('sha256').update(s).digest('hex');
const anon = (seed: string) => `CP-${sha(seed).slice(0,8).toUpperCase()}`;
const clean = (s: string) => sensitivePatterns.reduce((acc, p) => acc.replace(p, '[REDACTADO]'), s);
const likelyRelevant = (s: string) => keywords.some(k => s.toLowerCase().includes(k));

function decodeBase64Url(data?: string | null) {
  if (!data) return '';
  return Buffer.from(data.replace(/-/g,'+').replace(/_/g,'/'), 'base64').toString('utf8');
}
function flattenParts(parts: any[] = []): string {
  let out = '';
  for (const p of parts) {
    if (p.mimeType === 'text/plain' || p.mimeType === 'text/html') out += '\n' + decodeBase64Url(p.body?.data);
    if (p.parts) out += flattenParts(p.parts);
  }
  return out;
}

async function listGmailSince(afterEpoch: number) {
  const q = `after:${afterEpoch} (${keywords.map(k => `\"${k}\"`).join(' OR ')})`;
  const r = await gmail.users.messages.list({ userId: env('GOOGLE_USER','me'), q, maxResults: 100 });
  return r.data.messages ?? [];
}

async function readGmail(id: string) {
  const r = await gmail.users.messages.get({ userId: env('GOOGLE_USER','me'), id, format: 'full' });
  const h = Object.fromEntries((r.data.payload?.headers ?? []).map(x => [x.name?.toLowerCase() ?? '', x.value ?? '']));
  const body = decodeBase64Url(r.data.payload?.body?.data) || flattenParts(r.data.payload?.parts);
  const text = `${h.subject ?? ''}\n${body}`;
  return { id, modifiedAt: new Date(Number(r.data.internalDate ?? Date.now())).toISOString(), revision: r.data.historyId ?? '', title: h.subject ?? 'Sin asunto', text, meta: { threadId: r.data.threadId, from: h.from } };
}

async function listDriveSince(iso: string) {
  const q = `modifiedTime > '${iso}' and trashed = false`;
  const r = await drive.files.list({ q, pageSize: 100, fields: 'files(id,name,mimeType,modifiedTime,version,webViewLink,parents,description)' });
  return (r.data.files ?? []).filter(f => likelyRelevant(`${f.name ?? ''} ${f.description ?? ''}`));
}

async function readDrive(file: any) {
  let text = '';
  if (file.mimeType === 'application/vnd.google-apps.document') {
    const r = await docs.documents.get({ documentId: file.id });
    for (const c of r.data.body?.content ?? []) for (const e of c.paragraph?.elements ?? []) text += e.textRun?.content ?? '';
  } else if (file.mimeType?.startsWith('text/')) {
    const r = await drive.files.get({ fileId: file.id, alt: 'media' }, { responseType: 'text' as any });
    text = String(r.data ?? '');
  } else {
    text = `${file.name ?? ''}\n${file.description ?? ''}`;
  }
  return { id: file.id, modifiedAt: file.modifiedTime ?? new Date().toISOString(), revision: String(file.version ?? ''), title: file.name ?? 'Archivo', text, meta: { mimeType: file.mimeType, webViewLink: file.webViewLink } };
}

async function analyse(input: {sourceType:string; title:string; text:string; externalId:string}) {
  const prompt = `Eres el Agente Cliente APD. Analiza material de un cliente deportivo para revisión humana. No diagnostiques. Devuelve JSON estricto con: material_type, client_reference_hint, objective, summary, changes, red_flags, pending_questions, hypotheses, training, nutrition_fueling, recovery, metrics, reply_message, priority_score_0_100, review_points, minutes_saved. Evita nombres completos y datos sensibles en cualquier campo destinado a Slack. Material:\n${input.title}\n${input.text.slice(0,50000)}`;
  const r = await openai.responses.create({ model: env('OPENAI_MODEL','gpt-5-mini'), input: prompt });
  const raw = r.output_text.trim().replace(/^```json\s*/,'').replace(/```$/,'');
  return JSON.parse(raw);
}

function draftBody(a: any, ref: string, source: any) {
  const section = (t:string,v:any) => `${t}\n${Array.isArray(v) ? v.map(x=>`- ${x}`).join('\n') : (v ?? 'Sin datos')}\n\n`;
  return `BORRADOR PRIVADO — ${ref}\n\nFuente: ${source.title}\nModificado: ${source.modifiedAt}\nEstado: PENDIENTE DE REVISIÓN HUMANA\n\n${section('Resumen',a.summary)}${section('Objetivo',a.objective)}${section('Cambios desde seguimiento anterior',a.changes)}${section('Banderas rojas',a.red_flags)}${section('Preguntas pendientes',a.pending_questions)}${section('Hipótesis no diagnósticas',a.hypotheses)}${section('Propuesta inicial de entrenamiento',a.training)}${section('Nutrición y fueling',a.nutrition_fueling)}${section('Recuperación',a.recovery)}${section('Métricas',a.metrics)}${section('Mensaje de respuesta propuesto',a.reply_message)}AVISO: Este documento es un borrador interno. No enviar automáticamente al cliente.`;
}

async function createPrivateDoc(title: string, body: string) {
  const created = await drive.files.create({ requestBody: { name: title, mimeType: 'application/vnd.google-apps.document', parents: [required('GOOGLE_DRAFTS_FOLDER_ID')] }, fields: 'id,webViewLink' });
  await docs.documents.batchUpdate({ documentId: created.data.id!, requestBody: { requests: [{ insertText: { location: { index: 1 }, text: body } }] } });
  const meta = await drive.permissions.list({ fileId: created.data.id!, fields: 'permissions(id,type,role,emailAddress)' });
  for (const p of meta.data.permissions ?? []) if (p.type !== 'user' || p.role !== 'owner') await drive.permissions.delete({ fileId: created.data.id!, permissionId: p.id! }).catch(()=>{});
  return created.data.webViewLink!;
}

async function postSlack(a: any, ref: string, draftUrl: string) {
  const token = required('SLACK_BOT_TOKEN');
  const channel = env('SLACK_CHANNEL_ID','C0BGS1D8YJW');
  const priority = Number(a.priority_score_0_100 ?? 0) >= 75 ? 'ROJA' : Number(a.priority_score_0_100 ?? 0) >= 45 ? 'NARANJA' : 'VERDE';
  const points = clean(Array.isArray(a.review_points) ? a.review_points.join('; ') : String(a.review_points ?? 'Revisión general'));
  const text = `*${ref}* · ${clean(String(a.material_type ?? 'Material'))}\n*Estado:* PENDIENTE · *Prioridad:* ${priority}\n*Revisar:* ${points}\n*Tiempo estimado ahorrado:* ${Number(a.minutes_saved ?? 10)} min\n<${draftUrl}|Abrir borrador protegido>\n\n✅ aprobar · 🔁 revisar · ⏸ posponer · ❌ descartar`;
  if (dryRun) return { ts: 'dry-run', url: '' };
  const r = await fetch('https://slack.com/api/chat.postMessage', { method:'POST', headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'}, body:JSON.stringify({channel,text}) });
  const j:any = await r.json(); if (!j.ok) throw new Error(`Slack: ${j.error}`);
  return { ts:j.ts, url:'' };
}

async function createNotion(a:any, ref:string, sourceType:string, modifiedAt:string, draftUrl:string, keyHash:string) {
  if (!env('NOTION_TOKEN') || !env('NOTION_DATA_SOURCE_ID')) return '';
  if (dryRun) return 'dry-run';
  const score = Number(a.priority_score_0_100 ?? 0);
  const priority = score >= 75 ? 'ROJA' : score >= 45 ? 'NARANJA' : 'VERDE';
  const properties:any = {
    'Caso': { title:[{text:{content:ref}}] },
    'Cliente ID': { rich_text:[{text:{content:ref}}] },
    'Material': { select:{name:String(a.material_type ?? 'Datos')} },
    'Estado': { select:{name:'PENDIENTE'} },
    'Prioridad': { select:{name:priority} },
    'Score': { number:score },
    'Origen': { select:{name:sourceType} },
    'Modificado': { date:{start:modifiedAt} },
    'Creado': { date:{start:new Date().toISOString()} },
    'Borrador': { url:draftUrl },
    'Puntos a revisar': { rich_text:[{text:{content:clean(String(a.review_points ?? '')).slice(0,1900)}}] },
    'Minutos ahorrados': { number:Number(a.minutes_saved ?? 10) },
    'Contiene sensible': { checkbox:false },
    'ID externo hash': { rich_text:[{text:{content:keyHash}}] }
  };
  const r = await fetch('https://api.notion.com/v1/pages',{method:'POST',headers:{Authorization:`Bearer ${required('NOTION_TOKEN')}`,'Notion-Version':'2022-06-28','Content-Type':'application/json'},body:JSON.stringify({parent:{database_id:required('NOTION_DATA_SOURCE_ID')},properties})});
  const j:any = await r.json(); if (!r.ok) throw new Error(`Notion: ${JSON.stringify(j)}`); return j.id;
}

async function handle(sourceType:'GMAIL'|'DRIVE', source:any) {
  const contentHash = sha(source.text);
  const key = `${sourceType}:${source.id}`;
  const previous:any = db.prepare('SELECT * FROM sources WHERE source_key=?').get(key);
  if (previous && previous.content_hash === contentHash && previous.revision === source.revision) return false;
  if (!likelyRelevant(`${source.title}\n${source.text}`)) return false;
  const analysis = await analyse({sourceType,title:source.title,text:source.text,externalId:source.id});
  const ref = anon(analysis.client_reference_hint || source.id);
  const body = draftBody(analysis,ref,source);
  const draftUrl = dryRun ? 'DRY_RUN' : await createPrivateDoc(`${ref} — ${analysis.material_type ?? 'Revisión'} — ${new Date().toISOString().slice(0,10)}`,body);
  const slack = await postSlack(analysis,ref,draftUrl);
  const notionId = await createNotion(analysis,ref,sourceType,source.modifiedAt,draftUrl,sha(key));
  db.prepare(`INSERT INTO sources(source_key,source_type,external_id,revision,modified_at,content_hash,client_ref,status,draft_url,slack_ts,notion_page_id,processed_at,raw_meta)
    VALUES(@key,@sourceType,@id,@revision,@modifiedAt,@contentHash,@ref,'PROCESSED',@draftUrl,@slackTs,@notionId,@processedAt,@meta)
    ON CONFLICT(source_key) DO UPDATE SET revision=excluded.revision,modified_at=excluded.modified_at,content_hash=excluded.content_hash,client_ref=excluded.client_ref,draft_url=excluded.draft_url,slack_ts=excluded.slack_ts,notion_page_id=excluded.notion_page_id,processed_at=excluded.processed_at,raw_meta=excluded.raw_meta`).run({key,sourceType,id:source.id,revision:source.revision,modifiedAt:source.modifiedAt,contentHash,ref,draftUrl,slackTs:slack.ts,notionId,processedAt:new Date().toISOString(),meta:JSON.stringify(source.meta)});
  return true;
}

async function run() {
  const started = new Date();
  const runId = Number(db.prepare("INSERT INTO runs(started_at,status) VALUES(?, 'RUNNING')").run(started.toISOString()).lastInsertRowid);
  let discovered=0, processed=0, skipped=0;
  try {
    const lookback = Number(env('GOOGLE_LOOKBACK_MINUTES','90'));
    const last:any = db.prepare("SELECT MAX(processed_at) last FROM sources").get();
    const since = last?.last ? new Date(new Date(last.last).getTime()-10*60_000) : new Date(Date.now()-lookback*60_000);
    const gm = await listGmailSince(Math.floor(since.getTime()/1000)); discovered += gm.length;
    for (const m of gm) { const ok = await handle('GMAIL',await readGmail(m.id!)); ok ? processed++ : skipped++; }
    const df = await listDriveSince(since.toISOString()); discovered += df.length;
    for (const f of df) { const ok = await handle('DRIVE',await readDrive(f)); ok ? processed++ : skipped++; }
    db.prepare("UPDATE runs SET finished_at=?,status='OK',discovered=?,processed=?,skipped=? WHERE id=?").run(new Date().toISOString(),discovered,processed,skipped,runId);
    console.log(JSON.stringify({status:'OK',discovered,processed,skipped,dryRun}));
  } catch (e:any) {
    db.prepare("UPDATE runs SET finished_at=?,status='ERROR',discovered=?,processed=?,skipped=?,error=? WHERE id=?").run(new Date().toISOString(),discovered,processed,skipped,String(e?.stack ?? e),runId);
    throw e;
  }
}

while (true) {
  await run();
  if (once) break;
  await sleep(intervalMs);
}
