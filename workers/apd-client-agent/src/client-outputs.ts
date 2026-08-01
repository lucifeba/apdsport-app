import type{AgentEnv,Analysis,Source}from'./client-types';
import{now}from'./client-utils';
import{createDoc}from'./client-google';

const section=(title:string,value:string|string[])=>`${title}\n${Array.isArray(value)?(value.length?value.map(item=>`- ${item}`).join('\n'):'- Sin datos'):(value||'Sin datos')}\n\n`;

function draft(source:Source,ref:string,analysis:Analysis,priority:string,score:number){
  return `BORRADOR PRIVADO - ${ref}\n\nFuente: ${source.title}\nOrigen: ${source.sourceType}\nModificado: ${source.modifiedAt}\nEstado: PENDIENTE DE REVISIÓN HUMANA\nPrioridad: ${priority} (${score}/100)\n\n${section('Resumen',analysis.summary)}${section('Objetivo',analysis.objective)}${section('Qué ha cambiado',analysis.changes)}${section('Qué mejora',analysis.improved)}${section('Qué empeora',analysis.worsened)}${section('Qué se mantiene',analysis.maintained)}${section('Banderas rojas',analysis.red_flags)}${section('Preguntas pendientes',analysis.pending_questions)}${section('Hipótesis de trabajo',analysis.hypotheses)}${section('Entrenamiento',analysis.training)}${section('Nutrición y fueling',analysis.nutrition_fueling)}${section('Recuperación',analysis.recovery)}${section('Métricas',analysis.metrics)}${section('Puntos a revisar',analysis.review_points)}${section('Mensaje propuesto',analysis.reply_message)}Tiempo estimado ahorrado: ${analysis.minutes_saved} min\n\nAVISO: Documento interno. No enviar automáticamente al cliente.`;
}

export async function publish(e:AgentEnv,token:string,source:Source,ref:string,analysis:Analysis,priority:string,score:number){
  const doc=await createDoc(e,token,`${ref} - ${analysis.material_type} - ${now().slice(0,10)}`,draft(source,ref,analysis,priority,score));
  return{fileId:doc.id,url:doc.url};
}
