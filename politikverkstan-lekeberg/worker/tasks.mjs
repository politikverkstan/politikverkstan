/* Personal tasks, 0.9.2. Entry point protected by Access JWT and D1 allowlist.
 * Task existence, linking and deletion are owner-only, even for administrators. */
const HEADERS={'content-type':'application/json; charset=utf-8','cache-control':'private, no-store','x-content-type-options':'nosniff'};
const output=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:HEADERS});
const fail=(status,error)=>output({error},status);
const validId=x=>typeof x==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(x);
function validDate(s){
 return s===''||typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
}
async function requestJson(req){
 if(Number(req.headers.get('content-length')||0)>10000)throw Error('För stor begäran');
 const raw=await req.text();if(raw.length>10000)throw Error('För stor begäran');
 const data=JSON.parse(raw);if(!data||typeof data!=='object'||Array.isArray(data))throw Error('Ogiltiga uppgifter');
 return data;
}
export function normalizeTask(value){
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Ogiltig uppgift');
 if(typeof value.title!=='string'||!value.title.trim()||value.title.length>160)throw Error('Rubrik krävs, högst 160 tecken');
 const date=value.due_date??'';
 if(!validDate(date))throw Error('Ogiltigt förfallodatum');
 const priority=value.priority??'normal';
 if(!['high','normal','low'].includes(priority))throw Error('Ogiltig prioritet');
 const case_id=value.case_id||null,meeting_id=value.meeting_id||null;
 if(case_id!==null&&!validId(case_id))throw Error('Ogiltig ärendekoppling');
 if(meeting_id!==null&&!validId(meeting_id))throw Error('Ogiltig möteskoppling');
 if(value.done!==undefined&&typeof value.done!=='boolean')throw Error('Ogiltig status');
 return {title:value.title.trim(),due_date:date,priority,case_id,meeting_id,done:!!value.done};
}
async function permittedLink(db,user,id,table){
 if(!id)return true;
 const record=await db.prepare('SELECT id FROM '+table+" WHERE id=? AND (owner_email=? OR scope='team')").bind(id,user.email).first();
 return !!record;
}
const redact=row=>({...row,done:!!row.done});
async function linksAllowed(env,user,data){
 return await permittedLink(env.DB,user,data.case_id,'work_cases')&&
 await permittedLink(env.DB,user,data.meeting_id,'work_meetings');
}
function badRequest(e){
 if(e instanceof SyntaxError||/^(För stor|Ogiltig|Rubrik krävs)/.test(e.message))return fail(400,e.message);
 console.error('Private task error',e.message);return fail(503,'Uppgifterna kunde inte hämtas just nu. Försök igen eller kontakta administratören.');
}
export async function handleTasks(req,env,user){
 const path=new URL(req.url).pathname,method=req.method;
 if(path!=='/api/private/tasks'&&!path.startsWith('/api/private/tasks/'))return null;
 try{
  if(path==='/api/private/tasks'){
   if(method==='GET'){
    const res=await env.DB.prepare('SELECT * FROM work_tasks WHERE owner_email=? ORDER BY done ASC,CASE priority WHEN ? THEN 0 WHEN ? THEN 1 ELSE 2 END ASC,CASE WHEN due_date=? THEN 1 ELSE 0 END ASC,due_date ASC,updated_at DESC LIMIT 250').bind(user.email,'high','normal','').all();
    return output({tasks:(res.results||[]).map(redact)});
   }
   if(method==='POST'){
    const data=normalizeTask(await requestJson(req));
    if(!await linksAllowed(env,user,data))return fail(403,'Du saknar åtkomst till kopplat ärende eller sammanträde');
    const id=crypto.randomUUID(),now=new Date().toISOString();
    await env.DB.prepare('INSERT INTO work_tasks(id,owner_email,title,due_date,priority,done,case_id,meeting_id,revision,created_at,updated_at,completed_at) VALUES(?,?,?,?,?,?,?,?,1,?,?,?)').bind(id,user.email,data.title,data.due_date,data.priority,data.done?1:0,data.case_id,data.meeting_id,now,now,data.done?now:null).run();
    return output({id,revision:1},201);
   }
   return fail(405,'Metod tillåts inte');
  }
  const id=path.slice('/api/private/tasks/'.length);
  if(!validId(id))return fail(404,'Uppgiften finns inte');
  const old=await env.DB.prepare('SELECT * FROM work_tasks WHERE id=? AND owner_email=?').bind(id,user.email).first();
  if(!old)return fail(404,'Uppgiften finns inte');
  if(method==='GET')return output({task:redact(old)});
  if(method==='DELETE'){
   const r=await env.DB.prepare('DELETE FROM work_tasks WHERE id=? AND owner_email=?').bind(id,user.email).run();
   return r.meta?.changes===1?output({ok:true}):fail(404,'Uppgiften finns inte');
  }
  if(method==='PATCH'){
   const input=await requestJson(req);
   if(!Number.isSafeInteger(input.revision)||input.revision!==old.revision)return fail(409,'Uppgiften har ändrats. Ladda om.');
   const data=normalizeTask({...old,done:!!old.done,...input});
   if(!await linksAllowed(env,user,data))return fail(403,'Du saknar åtkomst till kopplat ärende eller sammanträde');
   const now=new Date().toISOString(),completed=data.done?(old.done?old.completed_at||now:now):null;
   const r=await env.DB.prepare('UPDATE work_tasks SET title=?,due_date=?,priority=?,done=?,case_id=?,meeting_id=?,revision=revision+1,updated_at=?,completed_at=? WHERE id=? AND owner_email=? AND revision=?').bind(data.title,data.due_date,data.priority,data.done?1:0,data.case_id,data.meeting_id,now,completed,id,user.email,old.revision).run();
   return r.meta?.changes===1?output({ok:true,revision:old.revision+1}):fail(409,'Uppgiften har ändrats. Ladda om.');
  }
  return fail(405,'Metod tillåts inte');
 }catch(e){return badRequest(e);}
}
