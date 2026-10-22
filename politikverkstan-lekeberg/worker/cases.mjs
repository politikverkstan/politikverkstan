/* 0.8.0 Casework. All routes are invoked only AFTER verified Cloudflare Access,
 * active D1 allow-list authorization, and same-origin checks in private.mjs.
 * A case is private by default. "team" means all approved ACTIVE accounts in
 * this single SD Lekeberg workroom, not a future multi-tenant organization. */
const H={'content-type':'application/json; charset=utf-8','cache-control':'private, no-store','x-content-type-options':'nosniff'};
const out=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:H});
const err=(code,message)=>out({error:message},code);
const statuses=new Set(['nytt','granskning','stallningstagande','beslutat','uppfoljning','avslutat']);
const committees=new Set(['Kommunfullmäktige','Kommunstyrelsen','Barn- och utbildningsnämnden','Socialnämnden','Bygg- och miljönämnden','Valnämnden','Sydnärkes IT-nämnd','Sydnärkes miljö- och byggnämnd','Annat']);
const fields={summary:6000,alternatives:4500,finances:4500,risks:4500,questions:4500,recommendation:3500,decision:3500,follow_up:3500,sources:3500};
const MAX_NOTE=4500,MAX_COMMENT=3000;
const clean=(v,max)=>typeof v==='string'?v.trim().slice(0,max):'';
const validDate=v=>v===''||typeof v==='string'&&/^\d{4}-\d\d-\d\d$/.test(v)&&!Number.isNaN(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;
const validId=x=>typeof x==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(x);
async function body(req){
 if(Number(req.headers.get('content-length')||0)>35000)throw Error('För stor begäran');
 const raw=await req.text();if(raw.length>35000)throw Error('För stor begäran');
 const value=JSON.parse(raw);if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Ogiltiga uppgifter');
 return value;
}
export function normalizeCase(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Ogiltigt ärende');
 const title=clean(input.title,160);
 if(!title)throw Error('Ange en rubrik');
 if(typeof input.title!=='string'||input.title.length>160)throw Error('Rubriken får vara högst 160 tecken');
 const date=input.meeting_date??'';
 if(!validDate(date))throw Error('Ogiltigt mötesdatum');
 if(input.labels!==undefined&&(!Array.isArray(input.labels)||input.labels.length>8))throw Error('Högst åtta etiketter');
 const labels=[...new Set((input.labels||[]).map(x=>clean(x,30)).filter(Boolean))];
 if((input.labels||[]).some(x=>typeof x!=='string'||x.length>30)||labels.length>8)throw Error('Ogiltiga etiketter');
 const content={};
 for(const [field,max] of Object.entries(fields)){
  if(input[field]!==undefined&&(typeof input[field]!=='string'||input[field].length>max))throw Error('För långt eller ogiltigt fält: '+field);
  content[field]=clean(input[field],max);
 }
 if(input.meeting_notes!==undefined&&(typeof input.meeting_notes!=='string'||input.meeting_notes.length>MAX_NOTE))throw Error('Ogiltiga privata anteckningar');
 const status=input.status??'nytt',committee=input.committee??'Annat';
 if(!statuses.has(status)||!committees.has(committee))throw Error('Ogiltig status eller nämnd');
 const motion_id=input.motion_id||null,file_id=input.file_id||null;
 if(motion_id!==null&&!validId(motion_id))throw Error('Ogiltig motionskoppling');
 if(file_id!==null&&!validId(file_id))throw Error('Ogiltig dokumentkoppling');
 return {title,status,committee,meeting_date:date,labels,content,motion_id,file_id,
  meeting_notes:input.meeting_notes===undefined?undefined:input.meeting_notes.trim()};
}
async function hasOwnMotion(db,user,id){
 if(!id)return true;
 return !!await db.prepare('SELECT id FROM work_motions WHERE id=? AND owner_email=? AND trashed_at IS NULL').bind(id,user.email).first();
}
async function hasOwnFile(db,user,id){
 if(!id)return true;
 return !!await db.prepare("SELECT id FROM work_files WHERE id=? AND owner_email=? AND scope='mine'").bind(id,user.email).first();
}
function visible(row,user){return row&&(row.owner_email===user.email||row.scope==='team');}
function owner(row,user){return row.owner_email===user.email;}
function editor(row,user){return owner(row,user)||row.scope==='team'&&row.assignee_email===user.email;}
async function findCase(env,user,id){
 const row=await env.DB.prepare('SELECT * FROM work_cases WHERE id=? AND (owner_email=? OR scope=?)').bind(id,user.email,'team').first();
 return row||null;
}
async function notes(env,user){
 const data=await env.DB.prepare('SELECT case_id,body FROM work_case_notes WHERE user_email=?').bind(user.email).all();
 return new Map((data.results||[]).map(x=>[x.case_id,x.body]));
}
async function note(env,user,id){
 const row=await env.DB.prepare('SELECT body FROM work_case_notes WHERE case_id=? AND user_email=?').bind(id,user.email).first();
 return row?.body||'';
}
function publicCase(row,user,personalNotes=''){
 const content=JSON.parse(row.content_json);
 const isOwner=owner(row,user);
 return {id:row.id,owner_email:row.owner_email,scope:row.scope,assignee_email:row.assignee_email||null,
  can_edit:editor(row,user),is_owner:isOwner,revision:row.revision,title:row.title,
  status:row.status,committee:row.committee,meeting_date:row.meeting_date,
  labels:JSON.parse(row.labels_json),
  // Linked private files/motions are only ever exposed to their actual owner.
  motion_id:isOwner?(content.motion_id||null):null,file_id:isOwner?(content.file_id||null):null,
  ...Object.fromEntries(Object.keys(fields).map(k=>[k,content[k]||''])),
  meeting_notes:personalNotes,created_at:row.created_at,updated_at:row.updated_at};
}
const payload=v=>JSON.stringify({...v.content,motion_id:v.motion_id,file_id:v.file_id});
async function writeNote(env,user,id,value){
 const now=new Date().toISOString();
 await env.DB.prepare('INSERT INTO work_case_notes(case_id,user_email,body,updated_at) VALUES(?,?,?,?) ON CONFLICT(case_id,user_email) DO UPDATE SET body=excluded.body,updated_at=excluded.updated_at').bind(id,user.email,value,now).run();
}
async function assigneeAllowed(env,user,email){
 if(!email)return true;
 const row=await env.DB.prepare('SELECT email FROM work_users WHERE email=? AND active=1').bind(email).first();
 return !!row;
}
export async function handleCases(req,env,user){
 const pathname=new URL(req.url).pathname,method=req.method;
 if(pathname==='/api/private/cases'){
  try{
   if(method==='GET'){
    const rows=await env.DB.prepare("SELECT * FROM work_cases WHERE owner_email=? OR scope='team' ORDER BY updated_at DESC LIMIT 250").bind(user.email).all();
    const privateNotes=await notes(env,user);
    return out({cases:(rows.results||[]).filter(r=>visible(r,user)).map(r=>publicCase(r,user,privateNotes.get(r.id)||''))});
   }
   if(method==='POST'){
    const v=normalizeCase(await body(req));
    if(!await hasOwnMotion(env.DB,user,v.motion_id)||!await hasOwnFile(env.DB,user,v.file_id))return err(403,'Kopplat dokument tillhör inte din privata arbetsyta');
    const id=crypto.randomUUID(),now=new Date().toISOString();
    // Never allow a client to create a team record without an explicit share action.
    await env.DB.prepare('INSERT INTO work_cases(id,owner_email,title,committee,status,meeting_date,labels_json,content_json,revision,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,1,?,?)').bind(id,user.email,v.title,v.committee,v.status,v.meeting_date,JSON.stringify(v.labels),payload(v),now,now).run();
    if(v.meeting_notes)await writeNote(env,user,id,v.meeting_notes);
    return out({id,revision:1,updated_at:now},201);
   }
   return err(405,'Metod tillåts inte');
  }catch(e){return catchCase(e);}
 }
 if(!pathname.startsWith('/api/private/cases/'))return null;
 const parts=pathname.split('/'),id=parts[4],action=parts[5]||'';
 if(parts.length>6||!validId(id)||!['','sharing','notes','comments'].includes(action))return err(404,'Ärendet finns inte');
 try{
  const row=await findCase(env,user,id);
  if(!row)return err(404,'Ärendet finns inte eller saknar åtkomst');
  if(action==='notes'){
   if(method==='GET')return out({meeting_notes:await note(env,user,id)});
   if(method!=='PUT')return err(405,'Metod tillåts inte');
   const data=await body(req);
   if(typeof data.meeting_notes!=='string'||data.meeting_notes.length>MAX_NOTE)return err(400,'Anteckningen är för lång');
   await writeNote(env,user,id,data.meeting_notes.trim());
   return out({ok:true});
  }
  if(action==='comments'){
   if(method==='GET'){
    const r=await env.DB.prepare('SELECT c.id,c.body,c.created_at,c.author_email,w.display_name AS author_name FROM work_case_comments c LEFT JOIN work_users w ON w.email=c.author_email WHERE c.case_id=? ORDER BY c.created_at,id LIMIT 200').bind(id).all();
    return out({comments:r.results||[]});
   }
   if(method!=='POST')return err(405,'Metod tillåts inte');
   const data=await body(req);
   if(typeof data.body!=='string'||!data.body.trim()||data.body.length>MAX_COMMENT)return err(400,'Kommentaren måste vara 1–3000 tecken');
   const comment_id=crypto.randomUUID(),now=new Date().toISOString();
   await env.DB.prepare('INSERT INTO work_case_comments(id,case_id,author_email,body,created_at) VALUES(?,?,?,?,?)').bind(comment_id,id,user.email,data.body.trim(),now).run();
   return out({id:comment_id,created_at:now},201);
  }
  if(action==='sharing'){
   if(!owner(row,user))return err(403,'Bara ägaren får dela och tilldela ärendet');
   if(method!=='PUT')return err(405,'Metod tillåts inte');
   const data=await body(req);
   if(!['mine','team'].includes(data.scope))return err(400,'Ogiltigt delningsläge');
   const assignee=data.scope==='team'?(data.assignee_email||null):null;
   if(assignee!==null&&(typeof assignee!=='string'||assignee.length>254||!await assigneeAllowed(env,user,assignee)))return err(400,'Ansvarig måste ha ett aktivt konto');
   if(!Number.isSafeInteger(data.revision)||data.revision!==row.revision)return err(409,'Ärendet har ändrats. Ladda om före delning.');
   const now=new Date().toISOString();
   const r=await env.DB.prepare('UPDATE work_cases SET scope=?,assignee_email=?,last_editor_email=?,revision=revision+1,updated_at=? WHERE id=? AND owner_email=? AND revision=?').bind(data.scope,assignee,user.email,now,id,user.email,row.revision).run();
   return r.meta?.changes===1?out({ok:true,revision:row.revision+1,updated_at:now}):err(409,'Ärendet har ändrats.');
  }
  if(method==='GET')return out({case:publicCase(row,user,await note(env,user,id))});
  if(method==='DELETE'){
   if(!owner(row,user))return err(403,'Bara ägaren får radera ärendet');
   const result=await env.DB.prepare('DELETE FROM work_cases WHERE id=? AND owner_email=?').bind(id,user.email).run();
   return result.meta?.changes===1?out({ok:true}):err(404,'Ärendet finns inte');
  }
  if(method==='PUT'){
   if(!editor(row,user))return err(403,'Endast ägaren eller utsedd ansvarig får redigera');
   const raw=await body(req);
   if(!Number.isSafeInteger(raw.revision)||raw.revision!==row.revision)return err(409,'Ärendet har ändrats. Ladda om innan du sparar.');
   const v=normalizeCase(raw),isOwner=owner(row,user);
   // An assignee cannot replace or borrow the owner's private file/motion IDs.
   if(!isOwner&&(v.motion_id||v.file_id))return err(403,'Privata dokumentkopplingar kan endast ändras av ägaren');
   if(isOwner&&(!await hasOwnMotion(env.DB,user,v.motion_id)||!await hasOwnFile(env.DB,user,v.file_id)))return err(403,'Kopplat dokument tillhör inte din privata arbetsyta');
   if(!isOwner){
    const old=JSON.parse(row.content_json);
    v.motion_id=old.motion_id||null;v.file_id=old.file_id||null;
   }
   const now=new Date().toISOString();
   const r=await env.DB.prepare('UPDATE work_cases SET title=?,committee=?,status=?,meeting_date=?,labels_json=?,content_json=?,last_editor_email=?,revision=revision+1,updated_at=? WHERE id=? AND revision=? AND (owner_email=? OR (scope=? AND assignee_email=?))').bind(v.title,v.committee,v.status,v.meeting_date,JSON.stringify(v.labels),payload(v),user.email,now,id,row.revision,user.email,'team',user.email).run();
   if(r.meta?.changes!==1)return err(409,'Ärendet har ändrats. Ladda om innan du sparar.');
   // Legacy 0.7.0 compatibility. Kept strictly separate and per user.
   if(v.meeting_notes!==undefined)await writeNote(env,user,id,v.meeting_notes);
   return out({id,revision:row.revision+1,updated_at:now});
  }
  return err(405,'Metod tillåts inte');
 }catch(e){return catchCase(e);}
}
function catchCase(e){
 if(e instanceof SyntaxError||/^(För stor|Ogiltig|Ange en rubrik|Rubriken får|Högst åtta|För långt)/.test(e.message))return err(400,e.message);
 console.error('Casework error',e.message);
 return err(503,'Ärendehanteringen är inte tillgänglig. Kontrollera migrering 0008.');
}
