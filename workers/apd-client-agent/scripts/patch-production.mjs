import fs from 'node:fs';

const file = new URL('../src/index.ts', import.meta.url);
let code = fs.readFileSync(file, 'utf8');

const replace = (before, after, label) => {
  if (!code.includes(before)) throw new Error(`Patch target not found: ${label}`);
  code = code.replace(before, after);
};

if (!code.includes("from './text-normalizer'")) {
  code = `import { normalizeList } from './text-normalizer';\n${code}`;
}

replace(
  "function arr(v: unknown) { return Array.isArray(v) ? v.map(x=>clean(String(x))).filter(Boolean).slice(0,12) : []; }",
  "function arr(v: unknown) { return normalizeList(v); }",
  'structured AI lists',
);

replace(
  "const q=encodeURIComponent(`after:${Math.floor(since.getTime()/1000)}`);",
  "const base=String((env as any).GMAIL_QUERY||'label:\"APD/Entrada Cliente\"').trim(),q=encodeURIComponent(`${base} after:${Math.floor(since.getTime()/1000)}`);",
  'Gmail controlled query',
);

replace(
  "async function drive(token:string,since:Date){const q=encodeURIComponent(`modifiedTime > '${since.toISOString()}' and trashed = false`)",
  "async function drive(env:Env,token:string,since:Date){const inbox=String((env as any).GOOGLE_INBOX_FOLDER_ID||'');if(!inbox)return[];const q=encodeURIComponent(`'${inbox}' in parents and modifiedTime > '${since.toISOString()}' and trashed = false`)",
  'Drive controlled folder',
);

replace(
  "[gmail(env,token,since),drive(token,since)]",
  "[gmail(env,token,since),drive(env,token,since)]",
  'Drive environment forwarding',
);

replace(
  "old=await env.DB.prepare('SELECT revision,content_hash FROM sources WHERE source_key=?').bind(key).first<{revision:string;content_hash:string}>();if(old&&old.revision===s.revision&&old.content_hash===hash)return'skipped';",
  "old=await env.DB.prepare('SELECT revision,content_hash,status FROM sources WHERE source_key=?').bind(key).first<{revision:string;content_hash:string;status:string}>();if(old&&old.revision===s.revision&&old.content_hash===hash&&(bool(env.DRY_RUN,true)||old.status!=='SIMULADO'))return'skipped';",
  'simulation promotion',
);

replace(
  "Devuelve SOLO JSON válido con: material_type",
  "Devuelve SOLO JSON válido. Todos los arrays deben contener solo strings, nunca objetos. Campos: material_type",
  'AI output contract',
);

replace(
  "env.AI.run(env.AI_MODEL||'@cf/meta/llama-3.1-8b-instruct'",
  "env.AI.run(env.AI_MODEL||'@cf/meta/llama-3.1-8b-instruct-fast'",
  'active AI fallback',
);

const oldRun = code.match(/async function run\(env:Env,trigger:string\)\{[\s\S]*?\}\n\nasync function verifySlack/);
if (!oldRun) throw new Error('Patch target not found: run loop');
const run = `async function notifyFailure(env:Env,text:string){const channel=String((env as any).SLACK_ALERT_CHANNEL_ID||'');if(!channel||!env.SLACK_BOT_TOKEN)return;try{await fetch('https://slack.com/api/chat.postMessage',{method:'POST',headers:{authorization:\`Bearer \${env.SLACK_BOT_TOKEN}\`,'content-type':'application/json'},body:JSON.stringify({channel,text:text.slice(0,3500),unfurl_links:false})});}catch(e){console.error('alert_failed',e);}}\n\nasync function run(env:Env,trigger:string){const started=now(),ins=await env.DB.prepare('INSERT INTO runs(trigger_type,started_at,status) VALUES(?,?,?)').bind(trigger,started,'RUNNING').run(),id=Number(ins.meta.last_row_id);let discovered=0,processed=0,skipped=0,failed=0,queued=0;const errors:string[]=[];try{const cp=await checkpoint(env,'last_successful_scan'),init=await checkpoint(env,'system_initialized_at'),since=cp?new Date(cp):init?new Date(init):new Date(Date.now()-int(env.LOOKBACK_MINUTES,90)*60000),token=await accessToken(env),[gm,dr]=await Promise.all([gmail(env,token,since),drive(env,token,since)]),all=[...gm,...dr].sort((a,b)=>a.modifiedAt.localeCompare(b.modifiedAt)),limit=int(env.MAX_ITEMS_PER_RUN,3),items=all.slice(0,limit);discovered=all.length;queued=Math.max(0,all.length-items.length);for(const s of items){try{(await handle(env,token,s))==='processed'?processed++:skipped++;}catch(e){failed++;errors.push(\`\${s.sourceType}:\${s.id}: \${e instanceof Error?e.message:String(e)}\`);}}if(!failed)await setCheckpoint(env,'last_successful_scan',queued&&items.length?items[items.length-1].modifiedAt:started);const status=failed?'PARTIAL':'SUCCESS';await env.DB.prepare('UPDATE runs SET finished_at=?,status=?,discovered=?,processed=?,skipped=?,failed=?,detail=? WHERE id=?').bind(now(),status,discovered,processed,skipped,failed,JSON.stringify({queued,errors}),id).run();if(failed)await notifyFailure(env,\`⚠️ *Agente Cliente APD - \${status}*\\nEjecución: \${id}\\nDescubiertos: \${discovered}\\nProcesados: \${processed}\\nFallidos: \${failed}\\nEn cola: \${queued}\\n\${errors.join(' | ').slice(0,2000)}\`);return{id,status,discovered,processed,skipped,failed,queued,dryRun:bool(env.DRY_RUN,true),errors};}catch(e){const message=e instanceof Error?e.message:String(e);await env.DB.prepare(\"UPDATE runs SET finished_at=?,status='FAILED',detail=? WHERE id=?\").bind(now(),message,id).run();await notifyFailure(env,\`🚨 *Agente Cliente APD - FAILED*\\nEjecución: \${id}\\n\${message.slice(0,2500)}\`);throw e;}}\n\nasync function verifySlack`;
code = code.replace(oldRun[0], run);

fs.writeFileSync(file, code);
console.log('Production hardening patch applied');
