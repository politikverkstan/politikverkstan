/* Authenticated D1-backed file area. Caller has verified Cloudflare Access and active work_users.
 * Private by default; team scope is an explicit choice visible to all active accounts.
 * No public URL is exposed and downloads are always attachments.
 */
const JSON_HEADERS={'content-type':'application/json; charset=utf-8','cache-control':'private, no-store','x-content-type-options':'nosniff'};
const MAX_FILE=10*1024*1024;
const QUOTA=100*1024*1024;
const PART=192*1024;
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const respond=(obj,status=200)=>new Response(JSON.stringify(obj),{status,headers:JSON_HEADERS});
const error=(status,message)=>respond({error:message},status);
const scopeValid=s=>s==='mine'||s==='team';
const now=()=>new Date().toISOString();
function safeName(raw){
 if(typeof raw!=='string')return '';
 const s=raw.trim();
 return s&&s.length<=180&&!/[\/\\\x00-\x1f\x7f]/.test(s)&&s!=='.'&&s!=='..'?s:'';
}
async function parse(req){
 const len=Number(req.headers.get('content-length')||0);
 if(len>12000)return null;
 const text=await req.text();
 if(text.length>12000)return null;
 try{const x=JSON.parse(text);return x&&typeof x==='object'&&!Array.isArray(x)?x:null;}catch{return null;}
}
async function validFolder(db,user,id,scope){
 if(id===null)return true;
 if(typeof id!=='string'||!uuid.test(id))return false;
 const row=await db.prepare('SELECT owner_email,scope FROM work_folders WHERE id=?').bind(id).first();
 return !!row&&row.scope===scope&&(scope==='team'||row.owner_email===user.email);
}
function b64(part){
 let binary='';
 for(let i=0;i<part.length;i+=8192)binary+=String.fromCharCode(...part.subarray(i,i+8192));
 return btoa(binary);
}
function decoded(parts,total){
 const target=new Uint8Array(total);let offset=0;
 for(const row of parts){
  const bin=atob(row.data_base64);
  if(offset+bin.length>total)throw Error('Skadat filinnehåll');
  for(let i=0;i<bin.length;i++)target[offset+i]=bin.charCodeAt(i);
  offset+=bin.length;
 }
 if(offset!==total)throw Error('Ofullständigt filinnehåll');
 return target;
}
export async function handleFiles(req,env,user){
 const path=new URL(req.url).pathname,method=req.method,db=env.DB;
 if(!path.startsWith('/api/private/files')&&!path.startsWith('/api/private/folders'))return null;
 if(path==='/api/private/files'&&method==='GET'){
  const scope=new URL(req.url).searchParams.get('scope')||'mine';
  if(!scopeValid(scope))return error(400,'Ogiltig filarea');
  const shared=scope==='team';
  const folders=await db.prepare(shared?'SELECT id,parent_id,name,owner_email,scope,created_at FROM work_folders WHERE scope=? ORDER BY name COLLATE NOCASE LIMIT 500':'SELECT id,parent_id,name,owner_email,scope,created_at FROM work_folders WHERE scope=? AND owner_email=? ORDER BY name COLLATE NOCASE LIMIT 500').bind(...(shared?[scope]:[scope,user.email])).all();
  const files=await db.prepare(shared?'SELECT id,folder_id,name,owner_email,scope,mime_type,size_bytes,created_at FROM work_files WHERE scope=? ORDER BY created_at DESC LIMIT 1000':'SELECT id,folder_id,name,owner_email,scope,mime_type,size_bytes,created_at FROM work_files WHERE scope=? AND owner_email=? ORDER BY created_at DESC LIMIT 1000').bind(...(shared?[scope]:[scope,user.email])).all();
  return respond({folders:folders.results||[],files:files.results||[]});
 }
 if(path==='/api/private/folders'&&method==='POST'){
  const data=await parse(req);if(!data)return error(400,'Ogiltiga mappuppgifter');
  const scope=data.scope,name=safeName(data.name),parent=data.parent_id===undefined?null:data.parent_id;
  if(!scopeValid(scope)||!name||!await validFolder(db,user,parent,scope))return error(400,'Ogiltigt mappnamn eller plats');
  const id=crypto.randomUUID(),time=now();
  await db.prepare('INSERT INTO work_folders(id,owner_email,scope,parent_id,name,created_at,updated_at) VALUES(?,?,?,?,?,?,?)').bind(id,user.email,scope,parent,name,time,time).run();
  return respond({id,name,parent_id:parent,scope},201);
 }
 const folder=path.match(/^\/api\/private\/folders\/([0-9a-f-]{36})$/i);
 if(folder&&uuid.test(folder[1])){
  const row=await db.prepare('SELECT * FROM work_folders WHERE id=?').bind(folder[1]).first();
  if(!row||row.owner_email!==user.email)return error(404,'Mappen finns inte eller får inte ändras');
  if(method==='PATCH'){
   const data=await parse(req),name=safeName(data?.name);
   if(!name)return error(400,'Ogiltigt mappnamn');
   await db.prepare('UPDATE work_folders SET name=?,updated_at=? WHERE id=? AND owner_email=?').bind(name,now(),row.id,user.email).run();
   return respond({ok:true});
  }
  if(method==='DELETE'){
   const nested=await db.prepare('SELECT COUNT(*) AS n FROM work_folders WHERE parent_id=?').bind(row.id).first();
   const files=await db.prepare('SELECT COUNT(*) AS n FROM work_files WHERE folder_id=?').bind(row.id).first();
   if(Number(nested?.n)||Number(files?.n))return error(409,'Mappen måste vara tom innan den kan raderas');
   await db.prepare('DELETE FROM work_folders WHERE id=? AND owner_email=?').bind(row.id,user.email).run();
   return respond({ok:true});
  }
  return error(405,'Metod tillåts inte');
 }
 if(path==='/api/private/files'&&method==='POST'){
  const len=Number(req.headers.get('content-length')||0);
  if(len>MAX_FILE+50000)return error(413,'Filen är för stor (högst 10 MB)');
  if(!(req.headers.get('content-type')||'').toLowerCase().startsWith('multipart/form-data;'))return error(415,'Använd filuppladdning');
  const form=await req.formData(),file=form.get('file'),scope=form.get('scope'),folderInput=form.get('folder_id');
  const folderId=folderInput?String(folderInput):null,name=safeName(file?.name||'');
  if(!file||typeof file.arrayBuffer!=='function'||!scopeValid(scope)||!name||!await validFolder(db,user,folderId,scope))return error(400,'Ogiltig fil eller målmapp');
  if(file.size>MAX_FILE)return error(413,'Filen är för stor (högst 10 MB)');
  const size=Number(file.size);
  const usage=await db.prepare('SELECT COALESCE(SUM(size_bytes),0) AS n FROM work_files WHERE owner_email=?').bind(user.email).first();
  if(Number(usage?.n||0)+size>QUOTA)return error(413,'Lagringsutrymmet på 100 MB per användare är fullt');
  const bytes=new Uint8Array(await file.arrayBuffer());
  if(bytes.length!==size||bytes.length>MAX_FILE)return error(413,'Ogiltig filstorlek');
  const id=crypto.randomUUID(),time=now(),mime=typeof file.type==='string'&&file.type.length<=100?file.type:'application/octet-stream';
  const statements=[db.prepare('INSERT INTO work_files(id,owner_email,scope,folder_id,name,mime_type,size_bytes,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)').bind(id,user.email,scope,folderId,name,mime,size,time,time)];
  for(let pos=0,seq=0;pos<bytes.length;pos+=PART,seq++){
   statements.push(db.prepare('INSERT INTO work_file_chunks(file_id,seq,data_base64) VALUES(?,?,?)').bind(id,seq,b64(bytes.subarray(pos,pos+PART))));
  }
  await db.batch(statements);
  return respond({id,name,scope,size_bytes:size},201);
 }
 const fileMatch=path.match(/^\/api\/private\/files\/([0-9a-f-]{36})(\/download)?$/i);
 if(fileMatch&&uuid.test(fileMatch[1])){
  const row=await db.prepare('SELECT * FROM work_files WHERE id=?').bind(fileMatch[1]).first();
  if(!row||(row.scope==='mine'&&row.owner_email!==user.email))return error(404,'Filen finns inte eller saknar åtkomst');
  if(fileMatch[2]&&method==='GET'){
   const parts=await db.prepare('SELECT data_base64 FROM work_file_chunks WHERE file_id=? ORDER BY seq ASC').bind(row.id).all();
   const buffer=decoded(parts.results||[],row.size_bytes);
   return new Response(buffer,{headers:{
    'content-type':'application/octet-stream','content-length':String(buffer.length),
    'content-disposition':"attachment; filename=\"document\"; filename*=UTF-8''"+encodeURIComponent(row.name),
    'cache-control':'private, no-store','x-content-type-options':'nosniff','x-frame-options':'DENY'
   }});
  }
  if(fileMatch[2])return error(405,'Metod tillåts inte');
  if(row.owner_email!==user.email)return error(404,'Endast filens ägare får ändra eller radera den');
  if(method==='DELETE'){
   await db.prepare('DELETE FROM work_files WHERE id=? AND owner_email=?').bind(row.id,user.email).run();
   return respond({ok:true});
  }
  if(method==='PATCH'){
   const data=await parse(req);if(!data)return error(400,'Ogiltiga filuppgifter');
   const newName=data.name===undefined?row.name:safeName(data.name);
   const newScope=data.scope===undefined?row.scope:data.scope;
   const newFolder=data.folder_id===undefined?(newScope===row.scope?row.folder_id:null):data.folder_id;
   if(!newName||!scopeValid(newScope)||!await validFolder(db,user,newFolder,newScope))return error(400,'Ogiltigt namn eller målmapp');
   await db.prepare('UPDATE work_files SET name=?,scope=?,folder_id=?,updated_at=? WHERE id=? AND owner_email=?').bind(newName,newScope,newFolder,now(),row.id,user.email).run();
   return respond({ok:true});
  }
  return error(405,'Metod tillåts inte');
 }
 return error(404,'Okänd filbegäran');
}
