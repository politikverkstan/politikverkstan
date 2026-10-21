/* Private political case dossiers. The authenticated D1 user's e-mail is the
 * sole ownership boundary. No team/public access, including for admins. */
const HEADERS={'content-type':'application/json; charset=utf-8','cache-control':'private, no-store','x-content-type-options':'nosniff'};
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:HEADERS});
const fail=(code,message)=>json({error:message},code);
const statuses=new Set(['nytt','granskning','stallningstagande','beslutat','uppfoljning','avslutat']);
const committees=new Set(['Kommunfullmäktige','Kommunstyrelsen','Barn- och utbildningsnämnden','Socialnämnden','Bygg- och miljönämnden','Valnämnden','Sydnärkes IT-nämnd','Sydnärkes miljö- och byggnämnd','Annat']);
const fields={summary:6000,alternatives:4500,finances:4500,risks:4500,questions:4500,recommendation:3500,meeting_notes:4500,decision:3500,follow_up:3500,sources:3500};
const short=(v,max)=>typeof v==='string'?v.trim().slice(0,max):'';
const validDate=v=>v===''||typeof v==='string'&&/^\d{4}-\d\d-\d\d$/.test(v)&&!Number.isNaN(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;
const validId=x=>typeof x==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(x);
async function body(req){
 if(Number(req.headers.get('content-length')||0)>35000)throw new Error('För stort ärende');
 const raw=await req.text();if(raw.length>35000)throw new Error('För stort ärende');
 const value=JSON.parse(raw);if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Ogiltiga ärendeuppgifter');
 return value;
}
export function normalizeCase(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Ogiltigt ärende');
 const title=short(input.title,160);if(!title)throw Error('Ange en rubrik');
 if(typeof input.title!=='string'||input.title.length>160)throw Error('Rubriken får vara högst 160 tecken');
 const meeting_date=input.meeting_date??'';
 if(!validDate(meeting_date))throw Error('Ogiltigt mötesdatum');
 if(input.labels!==undefined&&(!Array.isArray(input.labels)||input.labels.length>8))throw Error('Högst åtta etiketter');
 const labels=[...new Set((input.labels||[]).map(v=>short(v,30)).filter(Boolean))];
 if(labels.some(x=>x.length>30)||labels.length>8)throw Error('Ogiltiga etiketter');
 const content={};
 for(const [field,max] of Object.entries(fields)){
  if(input[field]!==undefined&&(typeof input[field]!=='string'||input[field].length>max))throw Error('För långt eller ogiltigt fält: '+field);
  content[field]=short(input[field],max);
 }
 const status= input.status??'nytt',committee=input.committee??'Annat';
 if(!statuses.has(status)||!committees.has(committee))throw Error('Ogiltig status eller nämnd');
 const motion_id=input.motion_id||null,file_id=input.file_id||null;
 if(motion_id!==null&&!validId(motion_id))throw Error('Ogiltig motionskoppling');
 if(file_id!==null&&!validId(file_id))throw Error('Ogiltig dokumentkoppling');
 return {title,status,committee,meeting_date,labels,content,motion_id,file_id};
}
function fromRow(row){
 const content=JSON.parse(row.content_json);
 return {id:row.id,owner_email:row.owner_email,revision:row.revision,
  title:row.title,status:row.status,committee:row.committee,meeting_date:row.meeting_date,
  labels:JSON.parse(row.labels_json),motion_id:content.motion_id??null,file_id:content.file_id??null,
  ...Object.fromEntries(Object.keys(fields).map(k=>[k,content[k]||''])),
  created_at:row.created_at,updated_at:row.updated_at};
}
async function allowedMotion(db,user,id){
 if(!id)return true;
 const row=await db.prepare('SELECT id FROM work_motions WHERE id=? AND owner_email=? AND trashed_at IS NULL').bind(id,user.email).first();
 return Boolean(row);
}
async function allowedFile(db,user,id){
 if(!id)return true;
 const row=await db.prepare("SELECT id FROM work_files WHERE id=? AND owner_email=? AND scope='mine'").bind(id,user.email).first();
 return Boolean(row);
}
export async function handleCases(req,env,user){
 const path=new URL(req.url).pathname,method=req.method;
 if(!path.startsWith('/api/private/cases'))return null;
 const id=path.match(/^\/api\/private\/cases\/([^/]+)$/)?.[1];
 if(path!=='/api/private/cases'&&!id)return fail(404,'Okänd ärendesökväg');
 if(id&&!validId(id))return fail(404,'Ärendet finns inte');
 try{
  if(path==='/api/private/cases'&&method==='GET'){
   const rows=await env.DB.prepare('SELECT * FROM work_cases WHERE owner_email=? ORDER BY updated_at DESC LIMIT 250').bind(user.email).all();
   return json({cases:(rows.results||[]).map(fromRow)});
  }
  if(path==='/api/private/cases'&&method==='POST'){
   const value=normalizeCase(await body(req));
   if(!await allowedMotion(env.DB,user,value.motion_id)||!await allowedFile(env.DB,user,value.file_id))return fail(403,'Kopplat dokument tillhör inte din privata arbetsyta');
   const id=crypto.randomUUID(),now=new Date().toISOString(),payload=JSON.stringify({...value.content,motion_id:value.motion_id,file_id:value.file_id});
   await env.DB.prepare('INSERT INTO work_cases(id,owner_email,title,committee,status,meeting_date,labels_json,content_json,revision,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,1,?,?)').bind(id,user.email,value.title,value.committee,value.status,value.meeting_date,JSON.stringify(value.labels),payload,now,now).run();
   return json({id,revision:1,updated_at:now},201);
  }
  if(!id)return fail(405,'Metod tillåts inte');
  const old=await env.DB.prepare('SELECT * FROM work_cases WHERE id=? AND owner_email=?').bind(id,user.email).first();
  if(!old)return fail(404,'Ärendet finns inte eller saknar åtkomst');
  if(method==='GET')return json({case:fromRow(old)});
  if(method==='DELETE'){
   const result=await env.DB.prepare('DELETE FROM work_cases WHERE id=? AND owner_email=?').bind(id,user.email).run();
   return result.meta?.changes===0?fail(404,'Ärendet finns inte'):json({ok:true});
  }
  if(method==='PUT'){
   const raw=await body(req);
   if(!Number.isSafeInteger(raw.revision)||raw.revision!==old.revision)return fail(409,'Ärendet har ändrats. Ladda om innan du sparar.');
   const value=normalizeCase(raw);
   if(!await allowedMotion(env.DB,user,value.motion_id)||!await allowedFile(env.DB,user,value.file_id))return fail(403,'Kopplat dokument tillhör inte din privata arbetsyta');
   const now=new Date().toISOString(),payload=JSON.stringify({...value.content,motion_id:value.motion_id,file_id:value.file_id});
   const r=await env.DB.prepare('UPDATE work_cases SET title=?,committee=?,status=?,meeting_date=?,labels_json=?,content_json=?,revision=revision+1,updated_at=? WHERE id=? AND owner_email=? AND revision=?').bind(value.title,value.committee,value.status,value.meeting_date,JSON.stringify(value.labels),payload,now,id,user.email,old.revision).run();
   if(r.meta?.changes!==1)return fail(409,'Ärendet har ändrats. Ladda om innan du sparar.');
   return json({id,revision:old.revision+1,updated_at:now});
  }
  return fail(405,'Metod tillåts inte');
 }catch(e){
  if(e instanceof SyntaxError||/^(För stort ärende|Ogiltig|Ange en rubrik|Rubriken får|Högst åtta|För långt)/.test(e.message))return fail(400,e.message);
  console.error('Casework error',e.message);
  return fail(503,'Ärendehanteringen kan inte nås. Kontrollera att migrering 0007 är genomförd.');
 }
}
