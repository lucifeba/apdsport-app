import type{AgentEnv,Analysis}from'./client-types';
export const enc=new TextEncoder();
export const now=()=>new Date().toISOString();
export const num=(v:string|undefined,d:number)=>Number.isFinite(parseInt(v||'',10))?parseInt(v||'',10):d;
export const yes=(v:string|undefined,d=false)=>v==null?d:v.toLowerCase()==='true';
export const json=(v:unknown,s=200)=>new Response(JSON.stringify(v),{status:s,headers:{'content-type':'application/json; charset=utf-8'}});
export const clean=(s:string)=>s.replace(/\u0000/g,'').replace(/\s+/g,' ').trim();
export function text(v:unknown):string{if(['string','number','boolean'].includes(typeof v))return clean(String(v));if(!v||typeof v!=='object')return'';const o=v as Record<string,unknown>;for(const k of['text','content','summary','point','item','description','value','title','name']){const x=text(o[k]);if(x)return x;}return Object.values(o).map(text).filter(Boolean).join(': ')}
export const list=(v:unknown)=>Array.isArray(v)?v.map(text).filter(Boolean).slice(0,12):[];
export async function hash(s:string){const d=await crypto.subtle.digest('SHA-256',enc.encode(s));return[...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,'0')).join('')}
export function safe(a:string,b:string){if(a.length!==b.length)return false;let d=0;for(let i=0;i<a.length;i++)d|=a.charCodeAt(i)^b.charCodeAt(i);return d===0}
export async function checkpoint(e:AgentEnv,k:string){return(await e.DB.prepare('SELECT value FROM checkpoints WHERE key=?').bind(k).first<{value:string}>())?.value||null}
export async function setCheckpoint(e:AgentEnv,k:string,v:string){await e.DB.prepare('INSERT INTO checkpoints(key,value,updated_at) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at').bind(k,v,now()).run()}
export function review(a:Analysis){return((a.review_points.length?a.review_points:[...a.red_flags,...a.pending_questions]).join('; ')||a.summary||'Revisión general').slice(0,1900)}