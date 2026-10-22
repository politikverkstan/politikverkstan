/* 0.9.0 Sammanträdesverkstad. Invoked ONLY after Cloudflare Access JWT,
   allowlisted active account and same-origin mutation validation in private.mjs.
   A meeting is private by default; "team" means all approved active users. */
const headers={'content-type':'application/json; charset=utf-8','cache-control':'private, no-store','x-content-type-options':'nosniff'};
const json=(v,s=200)=>new Response(JSON.stringify(v),{status:s,headers});
const error=(s,message)=>json({error:message},s);
const idOK=id=>typeof id==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(id);
const meetingStatuses=new Set(['planned','held','closed']);
const committees=new Set(['Kommunfullmäktige','Kommunstyrelsen','Barn- och utbildningsnämnden','Socialnämnden','Bygg- och miljönämnden','Valnämnden','Sydnärkes IT-nämnd','Sydnärkes miljö- och byggnämnd','Annat']);
const dateOK=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;
async function readBody(req){
 if(Number(req.headers.get('content-length')||0)>18000)throw Error('För stor begäran');
 const str=await req.text();if(str.length>18000)throw Error('För stor begäran');
 const data=JSON.parse(str);
 if(!data||typeof data!=='object'||Array.isArray(data))throw Error('Ogiltiga uppgifter');
 return data;
}
function textField(obj,key,max,required=false){
 if(typeof obj[key]!=='string'||obj[key].length>max)throw Error('Ogiltigt eller för långt fält: '+key);
 const value=obj[key].trim();
 if(required&&!value)throw Error('Obligatoriskt fält saknas: '+key);
 return value;
}
export function normalizeMeeting(v){
 if(!v||typeof v!=='object')throw Error('Ogiltigt möte');
 const title=textField(v,'title',160,true),committee=textField(v,'committee',120,true);
 const meeting_date=textField(v,'meeting_date',10,true),start_time=textField(v,'start_time',5);
 const location=textField(v,'location',160),status=textField(v,'status',20,true);
 if(!committees.has(committee))throw Error('Ogiltig instans');
 if(!dateOK(meeting_date))throw Error('Ogiltigt mötesdatum');
 if(start_time&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(start_time))throw Error('Ogiltigt klockslag');
 if(!meetingStatuses.has(status))throw Error('Ogiltig mötesstatus');
 return {title,committee,meeting_date,start_time,location,status};
}
export function normalizeAgenda(v){
 if(!v||typeof v!=='object'||Array.isArray(v))throw Error('Ogiltig dagordningspunkt');
 const title=textField(v,'title',160,true);
 const preparation=textField(v,'preparation',4500),outcome=textField(v,'outcome',3500),follow_up=textField(v,'follow_up',3500);
 const case_id=v.case_id||null;
 if(case_id!==null&&!idOK(case_id))throw Error('Ogiltig ärendekoppling');
 return {title,preparation,outcome,follow_up,case_id};
}
const accessible=(row,user)=>row.owner_email===user.email||row.scope==='team';
const owns=(row,user)=>row.owner_email===user.email;
async function meetingRow(env,user,id){
 const row=await env.DB.prepare("SELECT * FROM work_meetings WHERE id=? AND (owner_email=? OR scope='team')").bind(id,user.email).first();
 return row||null;
}
function meetingOutput(row,user){
 return {id:row.id,owner_email:row.owner_email,title:row.title,committee:row.committee,
  meeting_date:row.meeting_date,start_time:row.start_time,location:row.location,status:row.status,
  scope:row.scope,revision:row.revision,created_at:row.created_at,updated_at:row.updated_at,
  is_owner:owns(row,user),agenda_count:Number(row.agenda_count||0)};
}
async function casePermitted(env,user,meeting,caseId){
 if(!caseId)return true;
 const row=await env.DB.prepare('SELECT id,scope,owner_email FROM work_cases WHERE id=?').bind(caseId).first();
 return !!row&&(row.owner_email===user.email||row.scope==='team')&&(meeting.scope==='mine'||row.scope==='team');
}
async function agenda(env,user,meeting){
 const result=await env.DB.prepare('SELECT i.*,c.title AS case_title,c.scope AS case_scope,c.owner_email AS case_owner FROM work_meeting_items i LEFT JOIN work_cases c ON c.id=i.case_id WHERE i.meeting_id=? ORDER BY i.position,i.created_at,i.id LIMIT 150').bind(meeting.id).all();
 return (result.results||[]).map(x=>{
  const canSeeCase=!!x.case_id&&(x.case_owner===user.email||x.case_scope==='team');
  return {id:x.id,position:x.position,title:x.title,preparation:x.preparation,
   outcome:x.outcome,follow_up:x.follow_up,
   case_id:canSeeCase?x.case_id:null,
   case_title:canSeeCase?x.case_title:null,
   case_link_restricted:!!x.case_id&&!canSeeCase,created_at:x.created_at,updated_at:x.updated_at};
 });
}
async function meetingNote(env,user,id){
 const row=await env.DB.prepare('SELECT body FROM work_meeting_notes WHERE meeting_id=? AND user_email=?').bind(id,user.email).first();
 return row?.body||'';
}
async function meetingPage(env,user,row){
 return {meeting:meetingOutput(row,user),agenda:await agenda(env,user,row),personal_note:await meetingNote(env,user,row.id)};
}
function handleError(e){
 if(e instanceof SyntaxError||/^(För stor|Ogiltig|Obligatoriskt)/.test(e.message))return error(400,e.message);
 console.error('Meetings error',e.message);
 return error(503,'Sammanträden kunde inte hämtas just nu. Försök igen eller kontakta administratören.');
}
export async function handleMeetings(req,env,user){
 const path=new URL(req.url).pathname;
 if(path!=='/api/private/meetings'&&!path.startsWith('/api/private/meetings/'))return null;
 const method=req.method;
 try{
  if(path==='/api/private/meetings'){
   if(method==='GET'){
    const list=await env.DB.prepare("SELECT m.*,(SELECT COUNT(*) FROM work_meeting_items i WHERE i.meeting_id=m.id) AS agenda_count FROM work_meetings m WHERE m.owner_email=? OR m.scope='team' ORDER BY m.meeting_date DESC,m.updated_at DESC LIMIT 180").bind(user.email).all();
    return json({meetings:(list.results||[]).filter(m=>accessible(m,user)).map(m=>meetingOutput(m,user))});
   }
   if(method==='POST'){
    const v=normalizeMeeting(await readBody(req)),id=crypto.randomUUID(),now=new Date().toISOString();
    // Private regardless of any scope supplied in the request.
    await env.DB.prepare("INSERT INTO work_meetings(id,owner_email,title,committee,meeting_date,start_time,location,status,scope,revision,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,'mine',1,?,?)").bind(id,user.email,v.title,v.committee,v.meeting_date,v.start_time,v.location,v.status,now,now).run();
    return json({id,revision:1},201);
   }
   return error(405,'Metod tillåts inte');
  }
  const match=path.match(/^\/api\/private\/meetings\/([a-f0-9-]{36})(?:\/(sharing|notes|items)(?:\/([a-f0-9-]{36})(?:\/(move))?)?)?$/);
  if(!match||!idOK(match[1])||(match[3]&&!idOK(match[3])))return error(404,'Sammanträdet finns inte');
  const [,id,action='',itemId='',operation='']=match;
  const row=await meetingRow(env,user,id);
  if(!row)return error(404,'Sammanträdet finns inte eller saknar åtkomst');
  const canEdit=owns(row,user);
  if(action==='notes'){
   if(method==='GET')return json({personal_note:await meetingNote(env,user,id)});
   if(method!=='PUT')return error(405,'Metod tillåts inte');
   const v=await readBody(req);
   if(typeof v.personal_note!=='string'||v.personal_note.length>4500)return error(400,'Egna anteckningar får vara högst 4500 tecken');
   const now=new Date().toISOString();
   await env.DB.prepare("INSERT INTO work_meeting_notes(meeting_id,user_email,body,updated_at) VALUES(?,?,?,?) ON CONFLICT(meeting_id,user_email) DO UPDATE SET body=excluded.body,updated_at=excluded.updated_at").bind(id,user.email,v.personal_note.trim(),now).run();
   return json({ok:true});
  }
  if(action==='sharing'){
   if(!canEdit)return error(403,'Bara ägaren får ändra delning');
   if(method!=='PUT')return error(405,'Metod tillåts inte');
   const v=await readBody(req);
   if(!['mine','team'].includes(v.scope))return error(400,'Ogiltigt delningsläge');
   if(!Number.isSafeInteger(v.revision)||v.revision!==row.revision)return error(409,'Sammanträdet har ändrats. Ladda om.');
   if(v.scope==='team'){
    // Sharing a private agenda MUST NOT expose private linked cases by accident.
    const unsafe=await env.DB.prepare("SELECT COUNT(*) AS n FROM work_meeting_items i JOIN work_cases c ON c.id=i.case_id WHERE i.meeting_id=? AND c.scope<>'team'").bind(id).first();
    if(Number(unsafe?.n||0)>0)return error(409,'Dagordningen har privata ärendekopplingar. Ta bort dem eller dela ärendena uttryckligen innan sammanträdet delas.');
   }
   const r=await env.DB.prepare('UPDATE work_meetings SET scope=?,revision=revision+1,updated_at=? WHERE id=? AND owner_email=? AND revision=?').bind(v.scope,new Date().toISOString(),id,user.email,row.revision).run();
   return r.meta?.changes===1?json({ok:true,revision:row.revision+1}):error(409,'Sammanträdet har ändrats.');
  }
  if(action==='items'){
   if(!itemId){
    if(method==='GET')return json({agenda:await agenda(env,user,row)});
    if(method!=='POST')return error(405,'Metod tillåts inte');
    if(!canEdit)return error(403,'Bara ägaren får ändra dagordningen');
    const v=normalizeAgenda(await readBody(req));
    if(!await casePermitted(env,user,row,v.case_id))return error(403,'Ärendet kan inte kopplas med denna åtkomst');
    const current=await env.DB.prepare('SELECT COALESCE(MAX(position),-1)+1 AS next FROM work_meeting_items WHERE meeting_id=?').bind(id).first();
    const item=crypto.randomUUID(),now=new Date().toISOString();
    await env.DB.prepare('INSERT INTO work_meeting_items(id,meeting_id,position,title,case_id,preparation,outcome,follow_up,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(item,id,Number(current?.next||0),v.title,v.case_id,v.preparation,v.outcome,v.follow_up,now,now).run();
    return json({id:item},201);
   }
   const old=await env.DB.prepare('SELECT * FROM work_meeting_items WHERE id=? AND meeting_id=?').bind(itemId,id).first();
   if(!old)return error(404,'Dagordningspunkten finns inte');
   if(method==='GET')return canEdit?json({item:old}):error(403,'Bara ägaren får läsa råa dagordningsuppgifter');
   if(!canEdit)return error(403,'Bara ägaren får ändra dagordningen');
   if(operation==='move'){
    if(method!=='POST')return error(405,'Metod tillåts inte');
    const v=await readBody(req);if(![-1,1].includes(v.direction))return error(400,'Ogiltig riktning');
    const list=await env.DB.prepare('SELECT id,position FROM work_meeting_items WHERE meeting_id=? ORDER BY position,created_at,id').bind(id).all();
    const items=list.results||[],idx=items.findIndex(x=>x.id===itemId),other=items[idx+v.direction];
    if(!other)return json({ok:true});
    const now=new Date().toISOString();
    // Single update, no duplicate-index state even for an interrupted request.
    await env.DB.prepare('UPDATE work_meeting_items SET position=CASE WHEN id=? THEN ? WHEN id=? THEN ? ELSE position END,updated_at=? WHERE meeting_id=? AND id IN (?,?)').bind(itemId,other.position,other.id,old.position,now,id,itemId,other.id).run();
    return json({ok:true});
   }
   if(method==='DELETE'){
    await env.DB.prepare('DELETE FROM work_meeting_items WHERE id=? AND meeting_id=?').bind(itemId,id).run();
    return json({ok:true});
   }
   if(method!=='PUT')return error(405,'Metod tillåts inte');
   const v=normalizeAgenda(await readBody(req));
   if(!await casePermitted(env,user,row,v.case_id))return error(403,'Ärendet kan inte kopplas med denna åtkomst');
   await env.DB.prepare('UPDATE work_meeting_items SET title=?,case_id=?,preparation=?,outcome=?,follow_up=?,updated_at=? WHERE id=? AND meeting_id=?').bind(v.title,v.case_id,v.preparation,v.outcome,v.follow_up,new Date().toISOString(),itemId,id).run();
   return json({ok:true});
  }
  if(action)return error(404,'Okänd sammanträdesåtgärd');
  if(method==='GET')return json(await meetingPage(env,user,row));
  if(!canEdit)return error(403,'Bara ägaren får ändra sammanträdet');
  if(method==='DELETE'){
   await env.DB.prepare('DELETE FROM work_meetings WHERE id=? AND owner_email=?').bind(id,user.email).run();
   return json({ok:true});
  }
  if(method==='PUT'){
   const v=await readBody(req);
   if(!Number.isSafeInteger(v.revision)||v.revision!==row.revision)return error(409,'Sammanträdet har ändrats. Ladda om.');
   const data=normalizeMeeting(v),now=new Date().toISOString();
   const result=await env.DB.prepare('UPDATE work_meetings SET title=?,committee=?,meeting_date=?,start_time=?,location=?,status=?,revision=revision+1,updated_at=? WHERE id=? AND owner_email=? AND revision=?').bind(data.title,data.committee,data.meeting_date,data.start_time,data.location,data.status,now,id,user.email,row.revision).run();
   return result.meta?.changes===1?json({ok:true,revision:row.revision+1}):error(409,'Sammanträdet har ändrats.');
  }
  return error(405,'Metod tillåts inte');
 }catch(e){return handleError(e);}
}
