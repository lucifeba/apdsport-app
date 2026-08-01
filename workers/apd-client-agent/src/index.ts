import type{AgentEnv}from'./client-types';
import{json,safe}from'./client-utils';
import{run}from'./client-run';

export default{
  async scheduled(_controller:ScheduledController,e:AgentEnv,ctx:ExecutionContext){
    ctx.waitUntil(run(e,'CRON').catch(console.error));
  },
  async fetch(request:Request,e:AgentEnv,ctx:ExecutionContext){
    const url=new URL(request.url);
    if(request.method==='POST'&&url.pathname==='/admin/run'){
      const presented=(request.headers.get('authorization')||'').replace(/^Bearer\s+/i,'').trim();
      const expected=(e.ADMIN_TOKEN||'').trim();
      if(!expected||!safe(presented,expected))return json({ok:false,error:'unauthorized'},401);
      const task=run(e,'MANUAL');
      ctx.waitUntil(task);
      return json(await task);
    }
    return json({ok:true,service:'apd-client-agent',outputs:['google-docs','d1'],endpoints:['/health','/admin/run']});
  }
};
