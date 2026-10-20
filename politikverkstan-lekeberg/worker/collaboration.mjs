/* Politikverkstan 0.5.1. Document-level ACL; user already authenticated and active.
   No SQL endpoint is exposed. Query strings are bound parameters. */
const headers={'content-type':'application/json; charset=utf-8','cache-control':'private, no-store','x-content-type-options':'nosniff'};
const send=(value,status=200)=>new Response(JSON.stringify(value),{status,headers});
const error=(status,message)=>send({error:message},status);
const clean=(v,n=500)=>String(v??'').trim().slice(0,n);
const email=e=>clean(e,254).toLowerCase();
const emailOk=e=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const cats=new Set(['Skola och utbildning','Omsorg och socialtjänst','Ekonomi och styrning','Trafik och infrastruktur','Trygghet','Miljö och samhällsbyggnad','Kommunal service','Annat']);
const statuses=new Set(['ide','utkast','granskning','godkand','inlamnad','besvarad']);
const ideastatuses=new Set(['ny','diskussion','underlag','redo','motion','avslutad']);
const perms=['none','read','comment','edit'];
const uuid='[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const now=()=>new Date().toISOString();
function strength(p){return perms.indexOf(p||'none');}
async function parse(req){if(Number(req.headers.get('content-length')||0)>50000)throw Error('För stor begäran');const t=await req.text();if(t.length>50000)throw Error('För stor begäran');const v=JSON.parse(t);if(!v||typeof v!=='object'||Array.isArray(v))throw Error('Ogiltigt objekt');return v;}
function normalize(v){const clauses=Array.isArray(v.clauses)?v.clauses.slice(0,12).map(x=>clean(x,600)).filter(Boolean):[];
 return {title:clean(v.title,160),category:cats.has(v.category)?v.category:'Annat',problem:clean(v.problem,6000),motivation:clean(v.motivation,8500),proposal:clean(v.proposal,1500),clauses,signer:clean(v.signer,130),party:clean(v.party,90),date:/^\d{4}-\d{2}-\d{2}$/.test(v.date)?v.date:now().slice(0,10),status:statuses.has(v.status)?v.status:'utkast',reference:clean(v.reference,140),notes:clean(v.notes,2000)};
}
async function getDoc(db,user,id){const row=await db.prepare(`SELECT m.*,u.display_name AS owner_name, (SELECT s.permission FROM work_motion_shares s WHERE s.motion_id=m.id AND s.email=?) AS direct_permission FROM work_motions m LEFT JOIN work_users u ON u.email=m.owner_email WHERE m.id=?`).bind(user.email,id).first();
 if(!row)return null;const permission=row.owner_email===user.email?'owner':strength(row.team_permission)>=strength(row.direct_permission)?row.team_permission:row.direct_permission;
 if(permission==='none'||!permission)return null;return {...row,permission};
}
const can=(row,p)=>row?.permission==='owner'||strength(row?.permission)>=strength(p);
function docResponse(row){return {id:row.id,owner_email:row.owner_email,owner_name:row.owner_name,team_permission:row.team_permission,permission:row.permission,origin_idea_id:row.origin_idea_id,revision:row.revision,created_at:row.created_at,updated_at:row.updated_at,...JSON.parse(row.content_json)};}
async function listDocs(db,user,scope){const rows=(await db.prepare(`SELECT m.id,m.owner_email,u.display_name AS owner_name,m.title,m.status,m.category,m.revision,m.created_at,m.updated_at,m.team_permission,m.origin_idea_id,
 (SELECT s.permission FROM work_motion_shares s WHERE s.motion_id=m.id AND s.email=?) AS direct_permission,
 (SELECT COUNT(*) FROM work_motion_comments c WHERE c.motion_id=m.id AND c.status='open') AS open_comments, (SELECT COUNT(*) FROM work_motion_shares sh2 WHERE sh2.motion_id=m.id) AS share_count
 FROM work_motions m LEFT JOIN work_users u ON u.email=m.owner_email
 WHERE m.owner_email=? OR (m.owner_email<>? AND (m.team_permission<>'none' OR EXISTS(SELECT 1 FROM work_motion_shares sh WHERE sh.motion_id=m.id AND sh.email=?)))
 ORDER BY m.updated_at DESC LIMIT 300`).bind(user.email,user.email,user.email,user.email).all()).results||[];
 return rows.filter(r=>scope==='all'||(scope==='mine'?r.owner_email===user.email:scope==='team'?r.owner_email!==user.email&&r.team_permission!=='none':scope==='direct'?r.owner_email!==user.email&&!!r.direct_permission:r.owner_email!==user.email)).map(r=>({...r,permission:r.owner_email===user.email?'owner':strength(r.team_permission)>=strength(r.direct_permission)?r.team_permission:r.direct_permission, directly_shared:!!r.direct_permission,direct_permission:undefined}));
}
async function listComments(db,table,col,id){return (await db.prepare(`SELECT c.id,c.author_email,u.display_name AS author_name,c.body,${table==='work_motion_comments'?'c.status,':''}c.created_at FROM ${table} c LEFT JOIN work_users u ON u.email=c.author_email WHERE c.${col}=? ORDER BY c.created_at ASC LIMIT 150`).bind(id).all()).results||[];}
function match(path,suffix=''){return path.match(new RegExp(`^/api/private/motions/(${uuid})${suffix}$`));}
async function motions(req,env,user,path,method){const db=env.DB;
 if(path==='/api/private/motions'&&method==='GET'){const scope=new URL(req.url).searchParams.get('scope')||'mine';if(!['mine','shared','team','direct','all'].includes(scope))return error(400,'Ogiltigt filter');return send({motions:await listDocs(db,user,scope)});}
 if(path==='/api/private/motions'&&method==='POST'){
  const raw=await parse(req),v=normalize(raw),id=crypto.randomUUID(),t=now();let source=null;
  if(raw.origin_idea_id){if(!new RegExp('^'+uuid+'$').test(raw.origin_idea_id))return error(400,'Ogiltig idékoppling');const idea=await db.prepare('SELECT id FROM work_ideas WHERE id=? AND published=1').bind(raw.origin_idea_id).first();if(!idea)return error(404,'Idén finns inte');source=idea.id;}
  await db.prepare('INSERT INTO work_motions(id,owner_email,title,status,category,content_json,revision,created_at,updated_at,origin_idea_id) VALUES(?,?,?,?,?,?,1,?,?,?)').bind(id,user.email,v.title||'Ny motion',v.status,v.category,JSON.stringify(v),t,t,source).run();
  return send({...v,id,revision:1,owner_email:user.email,permission:'owner',team_permission:'none',origin_idea_id:source,updated_at:t},201);
 }
 let m=match(path);if(m){const doc=await getDoc(db,user,m[1]);if(!doc)return error(404,'Dokumentet finns inte eller saknar åtkomst');
  if(method==='GET')return send({motion:docResponse(doc)});
  if(method==='PUT'){
   if(!can(doc,'edit'))return error(403,'Du saknar redigeringsbehörighet');const raw=await parse(req);if(!Number.isInteger(raw.revision)||raw.revision!==doc.revision)return error(409,'Dokumentet har ändrats av någon annan. Din text finns kvar i redigeraren.');
   const v=normalize(raw),t=now();const changes=await db.batch([
    db.prepare("UPDATE work_motions SET title=?,status=?,category=?,content_json=?,revision=revision+1,updated_at=? WHERE id=? AND revision=? AND (owner_email=? OR team_permission='edit' OR EXISTS(SELECT 1 FROM work_motion_shares WHERE motion_id=work_motions.id AND email=? AND permission='edit'))").bind(v.title||'Ny motion',v.status,v.category,JSON.stringify(v),t,m[1],doc.revision,user.email,user.email),
    db.prepare('INSERT INTO work_motion_versions(motion_id,revision,content_json,created_at,editor_email) SELECT ?,?,?,?,? WHERE EXISTS (SELECT 1 FROM work_motions WHERE id=? AND revision=? AND updated_at=?)').bind(m[1],doc.revision,doc.content_json,t,user.email,m[1],doc.revision+1,t)
   ]);if(!changes[0]?.meta?.changes)return error(409,'Dokumentet har ändrats under sparning');
   return send({...v,id:m[1],revision:doc.revision+1,updated_at:t});
  }
  if(method==='DELETE'){
   if(doc.permission!=='owner')return error(403,'Bara ägaren kan ta bort dokumentet');
   // Avoid FK deletion issues on sites without explicit PRAGMA foreign_keys.
   await db.batch([db.prepare('DELETE FROM work_motion_comments WHERE motion_id=?').bind(m[1]),db.prepare('DELETE FROM work_motion_shares WHERE motion_id=?').bind(m[1]),db.prepare('DELETE FROM work_motion_versions WHERE motion_id=?').bind(m[1]),db.prepare('DELETE FROM work_motions WHERE id=? AND owner_email=?').bind(m[1],user.email)]);return send({ok:true});
  }
 }
 m=match(path,'/shares');if(m){const row=await getDoc(db,user,m[1]);if(!row||row.permission!=='owner')return error(404,'Endast ägaren kan hantera delning');
  if(method==='GET'){const shares=(await db.prepare('SELECT s.email,u.display_name,s.permission FROM work_motion_shares s INNER JOIN work_users u ON u.email=s.email AND u.active=1 WHERE s.motion_id=? ORDER BY s.email').bind(m[1]).all()).results||[];return send({team_permission:row.team_permission,shares});}
  if(method==='PUT'){
   const raw=await parse(req);if(!perms.includes(raw.team_permission)||!Array.isArray(raw.shares)||raw.shares.length>80)return error(400,'Ogiltiga delningsinställningar');const recipients=[],seen=new Set();
   for(const s of raw.shares){const e=email(s?.email),p=s?.permission;if(!emailOk(e)||e===user.email||seen.has(e)||!['read','comment','edit'].includes(p))return error(400,'Ogiltig mottagare eller behörighet');seen.add(e);recipients.push({email:e,permission:p});}
   if(recipients.length){const rows=(await db.prepare(`SELECT email FROM work_users WHERE active=1 AND email IN (${recipients.map(()=>'?').join(',')})`).bind(...recipients.map(x=>x.email)).all()).results||[];if(rows.length!==recipients.length)return error(400,'Någon mottagare saknar aktivt konto');}
   const t=now(),statements=[db.prepare('UPDATE work_motions SET team_permission=? WHERE id=? AND owner_email=?').bind(raw.team_permission,m[1],user.email),db.prepare('DELETE FROM work_motion_shares WHERE motion_id=?').bind(m[1])];for(const s of recipients)statements.push(db.prepare('INSERT INTO work_motion_shares(motion_id,email,permission,created_at) VALUES(?,?,?,?)').bind(m[1],s.email,s.permission,t));await db.batch(statements);return send({ok:true});
  }
 }
 m=match(path,'/comments');if(m){const row=await getDoc(db,user,m[1]);if(!row)return error(404,'Saknar åtkomst');
  if(method==='GET')return send({comments:await listComments(db,'work_motion_comments','motion_id',m[1])});
  if(method==='POST'){if(!can(row,'comment'))return error(403,'Kommentarsbehörighet krävs');const raw=await parse(req),body=clean(raw.body,3000);if(!body)return error(400,'Kommentaren är tom');const id=crypto.randomUUID(),t=now();await db.prepare('INSERT INTO work_motion_comments(id,motion_id,author_email,body,status,created_at,updated_at) VALUES(?,?,?,? ,\'open\',?,?)').bind(id,m[1],user.email,body,t,t).run();return send({id,ok:true},201);}
 }
 m=match(path,`/comments/(${uuid})`);if(m&&method==='PATCH'){const row=await getDoc(db,user,m[1]);if(!row)return error(404,'Saknar åtkomst');if(!can(row,'edit'))return error(403,'Redigeringsbehörighet krävs');const raw=await parse(req);if(!['open','resolved'].includes(raw.status))return error(400,'Ogiltig status');const result=await db.prepare('UPDATE work_motion_comments SET status=?,updated_at=? WHERE id=? AND motion_id=?').bind(raw.status,now(),m[2],m[1]).run();return result.meta?.changes?send({ok:true}):error(404,'Kommentar finns inte');}
 m=match(path,'/versions');if(m&&method==='GET'){const row=await getDoc(db,user,m[1]);if(!row)return error(404,'Saknar åtkomst');const versions=(await db.prepare('SELECT revision,created_at,editor_email FROM work_motion_versions WHERE motion_id=? ORDER BY revision DESC LIMIT 40').bind(m[1]).all()).results||[];return send({versions});}
 m=match(path,'/restore');if(m&&method==='POST'){const row=await getDoc(db,user,m[1]);if(!row)return error(404,'Saknar åtkomst');if(!can(row,'edit'))return error(403,'Redigeringsbehörighet krävs');const raw=await parse(req);if(!Number.isInteger(raw.revision)||!Number.isInteger(raw.current_revision)||raw.current_revision!==row.revision)return error(409,'Dokumentet har ändrats. Hämta aktuell version innan återställning');const previous=await db.prepare('SELECT content_json FROM work_motion_versions WHERE motion_id=? AND revision=?').bind(m[1],raw.revision).first();if(!previous)return error(404,'Versionen finns inte');const v=normalize(JSON.parse(previous.content_json)),t=now();const changes=await db.batch([
   db.prepare("UPDATE work_motions SET title=?,status=?,category=?,content_json=?,revision=revision+1,updated_at=? WHERE id=? AND revision=? AND (owner_email=? OR team_permission='edit' OR EXISTS(SELECT 1 FROM work_motion_shares WHERE motion_id=work_motions.id AND email=? AND permission='edit'))").bind(v.title||'Ny motion',v.status,v.category,JSON.stringify(v),t,m[1],row.revision,user.email,user.email),
   db.prepare('INSERT INTO work_motion_versions(motion_id,revision,content_json,created_at,editor_email) SELECT ?,?,?,?,? WHERE EXISTS (SELECT 1 FROM work_motions WHERE id=? AND revision=? AND updated_at=?)').bind(m[1],row.revision,row.content_json,t,user.email,m[1],row.revision+1,t)
   ]);if(!changes[0]?.meta?.changes)return error(409,'Dokumentet har ändrats');return send({...v,id:m[1],revision:row.revision+1,updated_at:t});}
 return error(404,'Okänd begäran');
}
async function ideas(req,env,user,path,method){const db=env.DB;
 if(path==='/api/private/ideas'&&method==='GET'){const rows=(await db.prepare(`SELECT i.id,i.title,i.category,i.problem,i.action,i.source_url,i.owner_email,i.status,i.created_at,i.updated_at,u.display_name AS owner_name,(SELECT COUNT(*) FROM work_idea_comments c WHERE c.idea_id=i.id) AS comment_count FROM work_ideas i LEFT JOIN work_users u ON u.email=i.owner_email WHERE i.published=1 ORDER BY i.updated_at DESC LIMIT 200`).all()).results||[];return send({ideas:rows});}
 if(path==='/api/private/ideas'&&method==='POST'){const v=await parse(req);if(!clean(v.title,160))return error(400,'Rubrik krävs');const t=now(),id=crypto.randomUUID();await db.prepare(`INSERT INTO work_ideas(id,title,category,problem,action,source_url,published,created_at,owner_email,status,updated_at) VALUES(?,?,?,?,?,?,1,?,?,?,?)`).bind(id,clean(v.title,160),cats.has(v.category)?v.category:'Annat',clean(v.problem,2000),clean(v.action,2000),clean(v.source_url,500),t,user.email,'ny',t).run();return send({id,ok:true},201);}
 let match=path.match(new RegExp(`^/api/private/ideas/(${uuid})$`));if(match&&method==='PATCH'){const row=await db.prepare('SELECT * FROM work_ideas WHERE id=? AND published=1').bind(match[1]).first();if(!row)return error(404,'Idén finns inte');if(row.owner_email!==user.email&&user.role!=='admin')return error(403,'Endast ansvarig eller administratör får ändra idén');const v=await parse(req),st=ideastatuses.has(v.status)?v.status:row.status;const title=clean(v.title??row.title,160);if(!title)return error(400,'Rubrik krävs');await db.prepare('UPDATE work_ideas SET title=?,category=?,problem=?,action=?,source_url=?,status=?,updated_at=? WHERE id=?').bind(title,cats.has(v.category)?v.category:row.category,clean(v.problem??row.problem,2000),clean(v.action??row.action,2000),clean(v.source_url??row.source_url,500),st,now(),match[1]).run();return send({ok:true});}
 match=path.match(new RegExp(`^/api/private/ideas/(${uuid})/motions$`));if(match&&method==='GET'){
  const idea=await db.prepare('SELECT id FROM work_ideas WHERE id=? AND published=1').bind(match[1]).first();if(!idea)return error(404,'Idén finns inte');
  const visible=(await db.prepare(`SELECT m.id,m.title,m.status,m.owner_email,m.updated_at FROM work_motions m
   WHERE m.origin_idea_id=? AND (m.owner_email=? OR m.team_permission<>'none' OR EXISTS(SELECT 1 FROM work_motion_shares sh WHERE sh.motion_id=m.id AND sh.email=?))
   ORDER BY m.updated_at DESC LIMIT 50`).bind(match[1],user.email,user.email).all()).results||[];
  return send({motions:visible});
 }
 match=path.match(new RegExp(`^/api/private/ideas/(${uuid})/comments$`));if(match){const row=await db.prepare('SELECT id FROM work_ideas WHERE id=? AND published=1').bind(match[1]).first();if(!row)return error(404,'Idén finns inte');if(method==='GET')return send({comments:await listComments(db,'work_idea_comments','idea_id',match[1])});if(method==='POST'){const raw=await parse(req),body=clean(raw.body,3000);if(!body)return error(400,'Kommentaren är tom');const id=crypto.randomUUID();await db.prepare('INSERT INTO work_idea_comments(id,idea_id,author_email,body,created_at) VALUES(?,?,?,?,?)').bind(id,match[1],user.email,body,now()).run();return send({ok:true,id},201);}}
 return error(404,'Okänd begäran');
}
export async function handleCollaboration(req,env,user){const path=new URL(req.url).pathname;try{if(path.startsWith('/api/private/motions'))return await motions(req,env,user,path,req.method);if(path.startsWith('/api/private/ideas'))return await ideas(req,env,user,path,req.method);return null;}catch(e){if(e instanceof SyntaxError||['För stor begäran','Ogiltigt objekt'].includes(e.message))return error(400,'Ogiltig indata');console.error('Collaboration error',e.message);return error(503,'Begäran kunde inte slutföras');}}
