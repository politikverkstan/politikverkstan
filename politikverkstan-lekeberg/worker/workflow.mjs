/* Politikverkstan 1.0. Only invoked after Cloudflare Access, active allow-list
 * and same-origin write validation in private.mjs. No public endpoints. */
const headers={'content-type':'application/json; charset=utf-8','cache-control':'private, no-store','x-content-type-options':'nosniff'};
const send=(v,status=200)=>new Response(JSON.stringify(v),{status,headers});
const fail=(status,error)=>send({error},status);
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const dateOk=s=>s===''||typeof s==='string'&&/^\d{4}-\d\d-\d\d$/.test(s)&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
function value(d,k,max,required=false){
 if(typeof d[k]!=='string'||d[k].length>max)throw Error('Ogiltigt fält: '+k);
 const v=d[k].trim();if(required&&!v)throw Error('Fält saknas: '+k);return v;
}
async function input(req){
 if(Number(req.headers.get('content-length')||0)>16000)throw Error('För stor begäran');
 const raw=await req.text();if(raw.length>16000)throw Error('För stor begäran');
 const data=JSON.parse(raw);
 if(!data||typeof data!=='object'||Array.isArray(data))throw Error('Ogiltiga uppgifter');
 return data;
}
async function accessibleCase(db,user,id){
 const row=await db.prepare("SELECT id,scope,owner_email,assignee_email FROM work_cases WHERE id=? AND (owner_email=? OR scope='team')").bind(id,user.email).first();
 return row||null;
}
const canEdit=(c,u)=>c.owner_email===u.email||c.scope==='team'&&c.assignee_email===u.email;
async function validAssignee(db,email){
 if(!email)return true;
 return !!await db.prepare('SELECT email FROM work_users WHERE email=? AND active=1').bind(email).first();
}
async function linkedMeeting(db,user,caseRow,id){
 if(!id)return true;
 const row=await db.prepare("SELECT id,scope,owner_email FROM work_meetings WHERE id=? AND (owner_email=? OR scope='team')").bind(id,user.email).first();
 return !!row&&(caseRow.scope!=='team'||row.scope==='team');
}
async function fullFollowups(db,user,c){
 const rows=await db.prepare("SELECT f.*,m.scope AS meeting_scope,m.owner_email AS meeting_owner,m.title AS meeting_title FROM work_followups f LEFT JOIN work_meetings m ON m.id=f.meeting_id WHERE f.case_id=? ORDER BY CASE f.status WHEN 'open' THEN 0 ELSE 1 END,f.due_date,f.created_at LIMIT 300").bind(c.id).all();
 return (rows.results||[]).map(r=>({
  id:r.id,case_id:r.case_id,title:r.title,details:r.details,status:r.status,due_date:r.due_date,
  assignee_email:r.assignee_email,revision:r.revision,creator_email:r.creator_email,
  meeting_id:r.meeting_id&&(r.meeting_owner===user.email||r.meeting_scope==='team')?r.meeting_id:null,
  meeting_title:r.meeting_id&&(r.meeting_owner===user.email||r.meeting_scope==='team')?r.meeting_title:null,
  created_at:r.created_at,updated_at:r.updated_at,completed_at:r.completed_at,
  can_edit:canEdit(c,user)
 }));
}
async function caseHistory(db,user,c,url){
 const offset=Math.min(100000,Math.max(0,Number(url.searchParams.get('offset'))||0));
 const own=c.owner_email===user.email;
 const rows=await db.prepare("SELECT id,actor_email,kind,case_revision,changes_json,created_at FROM work_case_events WHERE case_id=? AND (?=1 OR scope_at_event='team' AND ?='team') ORDER BY created_at DESC,rowid DESC LIMIT 76 OFFSET ?").bind(c.id,own?1:0,c.scope,offset).all();
 const data=rows.results||[];const events=data.slice(0,75).map(e=>({...e,changes:JSON.parse(e.changes_json),changes_json:undefined}));
 return send({events,next_offset:data.length>75?offset+75:null});
}
async function search(db,user,url){
 const query=(url.searchParams.get('q')||'').trim().slice(0,80);
 if(query.length<2)return send({results:[]});
 const like='%'+query+'%',email=user.email;
 const sql=[
 ["case","SELECT c.id,c.title,c.committee AS context,c.updated_at FROM work_cases c WHERE (c.owner_email=? OR c.scope='team') AND (c.title LIKE ? OR c.committee LIKE ? OR json_extract(c.content_json,'$.summary') LIKE ? OR json_extract(c.content_json,'$.questions') LIKE ?) ORDER BY c.updated_at DESC LIMIT 30",[email,like,like,like,like]],
 ["meeting","SELECT m.id,m.title,m.committee || ' · ' || m.meeting_date AS context,m.updated_at FROM work_meetings m WHERE (m.owner_email=? OR m.scope='team') AND (m.title LIKE ? OR m.committee LIKE ? OR EXISTS(SELECT 1 FROM work_meeting_items i WHERE i.meeting_id=m.id AND i.title LIKE ?)) ORDER BY m.meeting_date DESC LIMIT 30",[email,like,like,like]],
 ["motion","SELECT m.id,m.title,m.category AS context,m.updated_at FROM work_motions m WHERE m.trashed_at IS NULL AND m.archived_at IS NULL AND (m.owner_email=? OR m.team_permission<>'none' OR EXISTS(SELECT 1 FROM work_motion_shares sh WHERE sh.motion_id=m.id AND sh.email=?)) AND (m.title LIKE ? OR m.category LIKE ?) ORDER BY m.updated_at DESC LIMIT 30",[email,email,like,like]],
 ["file","SELECT f.id,f.name AS title,CASE WHEN f.scope='team' THEN 'Gemensamt dokument' ELSE 'Privat dokument' END AS context,f.updated_at FROM work_files f WHERE (f.owner_email=? OR f.scope='team') AND f.name LIKE ? ORDER BY f.updated_at DESC LIMIT 30",[email,like]]
 ];
 const groups=await Promise.all(sql.map(async ([type,statement,args])=>{
  const response=await db.prepare(statement).bind(...args).all();
  return (response.results||[]).map(r=>({...r,type}));
 }));
 return send({results:groups.flat().sort((a,b)=>String(b.updated_at).localeCompare(String(a.updated_at))).slice(0,100)});
}
function normalizeFollowup(v){
 const title=value(v,'title',160,true),details=value(v,'details',3000);
 const due_date=value(v,'due_date',10),status=value(v,'status',10);
 if(!dateOk(due_date)||!['open','done'].includes(status))throw Error('Ogiltig tidpunkt eller status');
 const assignee_email=v.assignee_email||null,meeting_id=v.meeting_id||null;
 if(assignee_email!==null&&(typeof assignee_email!=='string'||assignee_email.length>254))throw Error('Ogiltig ansvarig');
 if(meeting_id!==null&&!uuid.test(meeting_id))throw Error('Ogiltig sammanträdeskoppling');
 return {title,details,due_date,status,assignee_email,meeting_id};
}
async function followupWrite(req,db,user,c,id){
 if(!canEdit(c,user))return fail(403,'Bara ägare eller ansvarig får ändra uppföljningar');
 const raw=await input(req),v=normalizeFollowup(raw);
 if(!await validAssignee(db,v.assignee_email))return fail(400,'Ansvarig saknar aktivt konto');
 if(!await linkedMeeting(db,user,c,v.meeting_id))return fail(403,'Sammanträdet kan inte kopplas med denna åtkomst');
 const now=new Date().toISOString();
 if(!id){
  const followupId=crypto.randomUUID();
  await db.prepare("INSERT INTO work_followups(id,case_id,meeting_id,title,details,due_date,assignee_email,status,creator_email,editor_email,created_at,updated_at,completed_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)")
   .bind(followupId,c.id,v.meeting_id,v.title,v.details,v.due_date,v.assignee_email,v.status,user.email,user.email,now,now,v.status==='done'?now:null).run();
  return send({id:followupId,revision:1},201);
 }
 const row=await db.prepare('SELECT * FROM work_followups WHERE id=? AND case_id=?').bind(id,c.id).first();
 if(!row)return fail(404,'Uppföljningen finns inte');
 if(!Number.isSafeInteger(raw.revision)||raw.revision!==row.revision)return fail(409,'Uppföljningen har ändrats, ladda om');
 const result=await db.prepare('UPDATE work_followups SET title=?,details=?,due_date=?,assignee_email=?,status=?,meeting_id=?,editor_email=?,revision=revision+1,updated_at=?,completed_at=? WHERE id=? AND revision=?')
 .bind(v.title,v.details,v.due_date,v.assignee_email,v.status,v.meeting_id,user.email,now,v.status==='done'?(row.completed_at||now):null,id,row.revision).run();
 return result.meta?.changes===1?send({id,revision:row.revision+1}):fail(409,'Uppföljningen har ändrats');
}
async function position(db,user,c,req){
 const current=await db.prepare('SELECT * FROM work_case_positions WHERE case_id=?').bind(c.id).first();
 if(req.method==='GET'){
  // Private drafting is not exposed simply because a case later became shared.
  if(current&&current.status==='personal'&&c.owner_email!==user.email)return send({position:null});
  return send({position:current||null,can_edit:c.owner_email===user.email});
 }
 if(req.method!=='PUT')return fail(405,'Metod tillåts inte');
 if(c.owner_email!==user.email)return fail(403,'Bara ärendets ägare får fastställa ett gemensamt ställningstagande');
 const v=await input(req);
 const body=value(v,'body',3500,true),status=value(v,'status',25),source=value(v,'source',1000),anchored_on=value(v,'anchored_on',10);
 if(!['discussion','personal','proposed','endorsed'].includes(status)||!dateOk(anchored_on))throw Error('Ogiltig status eller datum');
 if(status==='endorsed'&&(c.scope!=='team'||!source||!anchored_on))return fail(400,'Förankring kräver delat ärende, datum och verifierbar källa');
 if(status!=='endorsed'&&anchored_on)return fail(400,'Förankringsdatum får endast anges för förankrat ställningstagande');
 if(current&&(!Number.isSafeInteger(v.revision)||v.revision!==current.revision))return fail(409,'Ställningstagandet har ändrats');
 const now=new Date().toISOString();
 if(!current){
  await db.prepare('INSERT INTO work_case_positions(case_id,body,status,source,anchored_on,actor_email,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)')
  .bind(c.id,body,status,source,anchored_on,user.email,now,now).run();
 }else{
  const r=await db.prepare('UPDATE work_case_positions SET body=?,status=?,source=?,anchored_on=?,actor_email=?,revision=revision+1,updated_at=? WHERE case_id=? AND revision=?')
  .bind(body,status,source,anchored_on,user.email,now,c.id,v.revision).run();
  if(r.meta?.changes!==1)return fail(409,'Ställningstagandet har ändrats');
 }
 return send({ok:true,revision:(current?.revision||0)+1});
}
export async function handleWorkflow(req,env,user){
 const url=new URL(req.url),path=url.pathname,method=req.method,db=env.DB;
 if(!path.startsWith('/api/private/workflow/'))return null;
 // Classify failures without leaking SQL or private case data to the caller.
 let section='arbetsflödet';
 try{
  if(path==='/api/private/workflow/search'){
   section='sökningen';
   return method==='GET'?await search(db,user,url):fail(405,'Metod tillåts inte');
  }
  const parts=path.split('/');
  // /api/private/workflow/cases/{case}/history|meetings|followups|position
  if(parts[4]==='cases'&&uuid.test(parts[5]||'')&&parts.length===7){
   const c=await accessibleCase(db,user,parts[5]);if(!c)return fail(404,'Ärendet finns inte eller saknar åtkomst');
   switch(parts[6]){
    case 'history':
     section='ändringshistoriken';
     return method==='GET'?await caseHistory(db,user,c,url):fail(405,'Metod tillåts inte');
    case 'meetings':{
     section='sammanträdeskopplingarna';
     if(method!=='GET')return fail(405,'Metod tillåts inte');
     const r=await db.prepare("SELECT i.id AS item_id,i.title AS agenda_title,i.outcome,i.follow_up,m.id,m.title,m.meeting_date,m.committee,m.status FROM work_meeting_items i JOIN work_meetings m ON m.id=i.meeting_id WHERE i.case_id=? AND (m.owner_email=? OR m.scope='team') ORDER BY m.meeting_date DESC,i.position LIMIT 150").bind(c.id,user.email).all();
     return send({meetings:r.results||[]});
    }
    case 'followups':
     section='uppföljningarna';
     if(method==='GET')return send({followups:await fullFollowups(db,user,c)});
     if(method==='POST')return await followupWrite(req,db,user,c,null);
     return fail(405,'Metod tillåts inte');
    case 'position':
     section='ställningstagandet';
     return await position(db,user,c,req);
   }
  }
  // /api/private/workflow/followups/{id}
  if(parts[4]==='followups'&&parts.length===6&&uuid.test(parts[5]||'')){
   section='uppföljningen';
   const row=await db.prepare('SELECT case_id FROM work_followups WHERE id=?').bind(parts[5]).first();
   if(!row)return fail(404,'Uppföljningen finns inte');
   const c=await accessibleCase(db,user,row.case_id);if(!c)return fail(404,'Uppföljningen finns inte');
   if(method==='PUT')return await followupWrite(req,db,user,c,parts[5]);
   return fail(405,'Metod tillåts inte');
  }
  return fail(404,'Okänd funktion');
 }catch(e){
  if(e instanceof SyntaxError||/^(För stor|Ogiltig|Fält saknas)/.test(e.message))return fail(400,e.message);
  console.error('Workflow error in '+section,e.message);
  return send({error:'Kunde inte läsa eller uppdatera '+section+'. Kontrollera Cloudflare Worker-loggen och att relevanta D1-tabeller finns.',section,code:'WORKFLOW_UNAVAILABLE'},503);
 }
}
