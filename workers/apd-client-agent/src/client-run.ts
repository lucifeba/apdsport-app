import type{AgentEnv,Analysis,Source}from'./client-types';
import{now,num,yes,hash,checkpoint,setCheckpoint}from'./client-utils';
import{sources}from'./client-google';
import{analyze,priority}from'./client-analysis';
import{publish}from'./client-outputs';

async function previous(e:AgentEnv,ref:string,key:string){
  const row=await e.DB.prepare('SELECT source_key,analysis_json FROM sources WHERE client_ref=? AND source_key<>? ORDER BY processed_at DESC LIMIT 1').bind(ref,key).first<{source_key:string;analysis_json:string}>();
  if(!row)return null;
  try{return{key:row.source_key,a:JSON.parse(row.analysis_json)as Analysis}}catch{return null}
}

async function handle(e:AgentEnv,token:string,source:Source){
  const key=`${source.sourceType}:${source.id}`;
  const contentHash=await hash(source.text);
  const dry=yes(e.DRY_RUN,true);
  const old=await e.DB.prepare('SELECT revision,content_hash,status FROM sources WHERE source_key=?').bind(key).first<{revision:string;content_hash:string;status:string}>();
  if(old&&old.revision===source.revision&&old.content_hash===contentHash&&(dry||old.status!=='SIMULADO'))return'skipped';

  const ref=`CP-${(await hash(source.clientSeed)).slice(0,8).toUpperCase()}`;
  const prev=await previous(e,ref,key);
  const analysis=await analyze(e,source,prev?.a||null);
  const pr=priority(source,analysis);
  const at=now();
  let fileId='';
  let url='SIMULACIÓN';

  if(!dry){
    const output=await publish(e,token,source,ref,analysis,pr.label,pr.score);
    fileId=output.fileId;
    url=output.url;
  }

  await e.DB.prepare(`INSERT INTO sources(source_key,source_type,external_id,revision,modified_at,content_hash,title_hash,mime_type,client_ref,status,priority,priority_score,material_type,draft_file_id,draft_url,slack_channel,slack_ts,notion_page_id,analysis_json,metadata_json,previous_source_key,processed_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(source_key) DO UPDATE SET revision=excluded.revision,modified_at=excluded.modified_at,content_hash=excluded.content_hash,title_hash=excluded.title_hash,mime_type=excluded.mime_type,client_ref=excluded.client_ref,status=excluded.status,priority=excluded.priority,priority_score=excluded.priority_score,material_type=excluded.material_type,draft_file_id=excluded.draft_file_id,draft_url=excluded.draft_url,slack_channel='',slack_ts='',notion_page_id='',analysis_json=excluded.analysis_json,metadata_json=excluded.metadata_json,previous_source_key=excluded.previous_source_key,processed_at=excluded.processed_at,updated_at=excluded.updated_at`).bind(key,source.sourceType,source.id,source.revision,source.modifiedAt,contentHash,await hash(source.title),source.mimeType,ref,dry?'SIMULADO':'PENDIENTE',pr.label,pr.score,analysis.material_type,fileId,url,'','','',JSON.stringify(analysis),JSON.stringify(source.metadata),prev?.key||null,at,at).run();
  return'processed';
}

export async function run(e:AgentEnv,trigger:string){
  const started=now();
  const inserted=await e.DB.prepare('INSERT INTO runs(trigger_type,started_at,status) VALUES(?,?,?)').bind(trigger,started,'RUNNING').run();
  const id=Number(inserted.meta.last_row_id);
  let discovered=0,processed=0,skipped=0,failed=0,queued=0;
  const errors:string[]=[];

  try{
    const cp=await checkpoint(e,'last_successful_scan');
    const init=await checkpoint(e,'system_initialized_at');
    const since=cp?new Date(cp):init?new Date(init):new Date(Date.now()-num(e.LOOKBACK_MINUTES,90)*60000);
    const found=await sources(e,since);
    const all=found.items.sort((a,b)=>a.modifiedAt.localeCompare(b.modifiedAt));
    const items=all.slice(0,num(e.MAX_ITEMS_PER_RUN,3));
    discovered=all.length;
    queued=Math.max(0,all.length-items.length);

    for(const source of items){
      try{(await handle(e,found.token,source))==='processed'?processed++:skipped++}
      catch(error){failed++;errors.push(`${source.sourceType}:${source.id}: ${error instanceof Error?error.message:String(error)}`)}
    }

    if(!failed)await setCheckpoint(e,'last_successful_scan',queued&&items.length?items[items.length-1].modifiedAt:started);
    const status=failed?'PARTIAL':'SUCCESS';
    await e.DB.prepare('UPDATE runs SET finished_at=?,status=?,discovered=?,processed=?,skipped=?,failed=?,detail=? WHERE id=?').bind(now(),status,discovered,processed,skipped,failed,JSON.stringify({queued,errors}),id).run();
    return{id,status,discovered,processed,skipped,failed,queued,dryRun:yes(e.DRY_RUN,true),errors};
  }catch(error){
    const message=error instanceof Error?error.message:String(error);
    await e.DB.prepare("UPDATE runs SET finished_at=?,status='FAILED',detail=? WHERE id=?").bind(now(),message,id).run();
    console.error('APD Client Agent failed',message);
    throw error;
  }
}
