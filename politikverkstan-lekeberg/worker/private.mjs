import {handleCollaboration} from './collaboration.mjs';
import {handleFiles} from './files.mjs';
import {handleCases} from './cases.mjs';
/* Private political workroom. All authorization is server-side, fail closed.
 * Cloudflare Access JWT signature + issuer + audience; D1 user allow-list & role.
 * No visitor IP / coalition telemetry is ever combined with document content. */
import {WORKROOM_HTML} from './workroom-page.mjs';
const H={'content-type':'application/json; charset=utf-8','cache-control':'private, no-store','x-content-type-options':'nosniff'};
const out=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:H});
const err=(status,message)=>out({error:message},status);
const maxBody=45_000;
const normEmail=e=>String(e||'').trim().toLowerCase();
const validEmail=e=>e.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const clean=(v,max=500)=>String(v??'').trim().slice(0,max);
const validStatus=new Set(['ide','utkast','granskning','godkand','inlamnad','besvarad']);
const allowedCategory=new Set(['Skola och utbildning','Omsorg och socialtjänst','Ekonomi och styrning','Trafik och infrastruktur','Trygghet','Miljö och samhällsbyggnad','Kommunal service','Annat']);
const base64=s=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-s.length%4)%4)),c=>c.charCodeAt(0));
const b64json=s=>JSON.parse(new TextDecoder().decode(base64(s)));
function readOrigin(r){const origin=r.headers.get('Origin');return !origin||origin===new URL(r.url).origin;}
async function bodyJson(req,limit=maxBody){if(Number(req.headers.get('content-length')||0)>limit)throw Error('För stor begäran');let raw=await req.text();if(raw.length>limit)throw Error('För stor begäran');return JSON.parse(raw);}
export function normalizeMotion(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Ogiltigt dokument');
 const clauses=Array.isArray(raw.clauses)?raw.clauses.map(x=>clean(x,600)).filter(Boolean).slice(0,12):[];
 const name=clean(raw.signer,130),party=clean(raw.party,90);
 return {title:clean(raw.title,160),category:allowedCategory.has(raw.category)?raw.category:'Annat',problem:clean(raw.problem,6000),motivation:clean(raw.motivation,8500),proposal:clean(raw.proposal,1500),clauses,signer:name,party,date:/^\d{4}-\d{2}-\d{2}$/.test(raw.date)?raw.date:new Date().toISOString().slice(0,10),status:validStatus.has(raw.status)?raw.status:'utkast',reference:clean(raw.reference,140),notes:clean(raw.notes,2000)};
}
let certCache={domain:'',expiry:0,keys:null};
export async function verifyPrivateAccess(req,env){
 const team=clean(env.ACCESS_TEAM_DOMAIN,255),aud=clean(env.ACCESS_AUD,255);
 if(!/^[a-z0-9-]+\.cloudflareaccess\.com$/.test(team)||!aud)return null;
 const token=req.headers.get('Cf-Access-Jwt-Assertion');if(!token||token.length>16000)return null;
 try{
  const parts=token.split('.');if(parts.length!==3||parts.some(x=>!x||!/^[\w-]+$/.test(x)))return null;
  const head=b64json(parts[0]),claims=b64json(parts[1]);
  if(head.alg!=='RS256'||typeof head.kid!=='string')return null;
  const now=Math.floor(Date.now()/1000);
  if(claims.iss!==`https://${team}`||!(Array.isArray(claims.aud)?claims.aud.includes(aud):claims.aud===aud)||typeof claims.exp!=='number'||claims.exp<=now||typeof claims.iat!=='number'||claims.iat>now+60||typeof claims.nbf==='number'&&claims.nbf>now+60)return null;
  const email=normEmail(claims.email);if(!validEmail(email))return null;
  let keys;if(certCache.domain===team&&certCache.expiry>Date.now())keys=certCache.keys;
  else{const r=await fetch(`https://${team}/cdn-cgi/access/certs`,{headers:{accept:'application/json'}});if(!r.ok)return null;const j=await r.json();keys=j.keys||[];certCache={domain:team,expiry:Date.now()+5*60_000,keys};}
  const jwk=keys.find(k=>k.kid===head.kid&&k.kty==='RSA'&&(!k.alg||k.alg==='RS256'));if(!jwk)return null;
  const key=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
  const ok=await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,base64(parts[2]),new TextEncoder().encode(parts[0]+'.'+parts[1]));
  return ok?{email}:null;
 }catch{return null;}
}
async function requireUser(req,env){const identity=await verifyPrivateAccess(req,env);if(!identity)return null;if(!env.DB)return null;
 const row=await env.DB.prepare('SELECT email, display_name, role, active FROM work_users WHERE email=?').bind(identity.email).first();
 return row?.active===1&&['admin','user'].includes(row.role)?row:null;
}
async function documentList(env,user){const r=await env.DB.prepare('SELECT id,title,status,category,revision,created_at,updated_at FROM work_motions WHERE owner_email=? ORDER BY updated_at DESC LIMIT 150').bind(user.email).all();return r.results||[];}
async function ownDoc(env,user,id){return env.DB.prepare('SELECT * FROM work_motions WHERE id=? AND owner_email=?').bind(id,user.email).first();}
function motionResponse(row){return {id:row.id,revision:row.revision,created_at:row.created_at,updated_at:row.updated_at,...JSON.parse(row.content_json)};}
function routeId(path){const parts=path.split('/');return parts.length===5&&/^[0-9a-f-]{36}$/.test(parts[4])?parts[4]:null;}
function htmlPage(){const bytes=new Uint8Array(18);crypto.getRandomValues(bytes);const nonce=btoa(String.fromCharCode(...bytes));return new Response(WORKROOM_HTML.replaceAll('__CSP_NONCE__',nonce),{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store, private','x-content-type-options':'nosniff','x-frame-options':'DENY','referrer-policy':'no-referrer','content-security-policy':`default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; form-action 'self'; frame-ancestors 'none'`}});}
async function userAdmin(req,env,user,path){if(user.role!=='admin')return err(403,'Administratörsbehörighet krävs');
 if(path==='/api/private/users'&&req.method==='GET'){
  const r=await env.DB.prepare('SELECT email,display_name,role,active,created_at FROM work_users ORDER BY created_at DESC').all();return out({users:r.results||[]});
 }
 if(path==='/api/private/users'&&req.method==='POST'){
  const v=await bodyJson(req);const email=normEmail(v.email);if(!validEmail(email))return err(400,'Ogiltig e-postadress');const role=v.role==='admin'?'admin':'user';const name=clean(v.name,120).replace(/\s+/g,' ');if(!name||/[\x00-\x1F\x7F]/.test(name))return err(400,'Ange ett giltigt visningsnamn');
  await env.DB.prepare('INSERT INTO work_users(email,display_name,role,active,created_at) VALUES(?,?,?,?,?) ON CONFLICT(email) DO UPDATE SET display_name=excluded.display_name,role=excluded.role,active=1').bind(email,name,role,1,new Date().toISOString()).run();return out({ok:true});
 }
 const match=path.match(/^\/api\/private\/users\/([^/]+)$/);
 if(match&&req.method==='PATCH'){
  const email=normEmail(decodeURIComponent(match[1]));const v=await bodyJson(req);if(!validEmail(email)||!v||typeof v!=='object'||Array.isArray(v))return err(400,'Ogiltiga uppgifter');
  const row=await env.DB.prepare('SELECT email,display_name,role,active FROM work_users WHERE email=?').bind(email).first();if(!row)return err(404,'Användaren finns inte');
  if(!['display_name','role','active'].some(k=>Object.hasOwn(v,k)))return err(400,'Inga ändringar angivna');
  const role=Object.hasOwn(v,'role')?v.role:row.role,active=Object.hasOwn(v,'active')?v.active:!!row.active;
  if(!['user','admin'].includes(role)||typeof active!=='boolean')return err(400,'Ogiltiga behörigheter');
  let name=row.display_name;
  if(Object.hasOwn(v,'display_name')){if(typeof v.display_name!=='string')return err(400,'Ogiltigt visningsnamn');name=v.display_name.trim().replace(/\s+/g,' ');if(!name||name.length>120||/[\x00-\x1F\x7F]/.test(name))return err(400,'Visningsnamnet måste vara 1–120 tecken');}
  if(email===user.email&&(!active||role!=='admin'))return err(409,'Du kan inte stänga av ditt eget administratörskonto');
  await env.DB.prepare('UPDATE work_users SET display_name=?,role=?,active=? WHERE email=?').bind(name,role,active?1:0,email).run();return out({ok:true});
 }
 return err(404,'Okänd begäran');
}
export async function handlePrivate(req,env){
 const url=new URL(req.url),path=url.pathname,method=req.method;
 if(!['GET','POST','PUT','PATCH','DELETE'].includes(method))return err(405,'Metod tillåts inte');
 if(!readOrigin(req))return err(403,'Otillåtet ursprung');
 if(!env.DB)return err(503,'Databasen är inte konfigurerad');
 try{
  const identity=await verifyPrivateAccess(req,env);if(!identity)return err(403,'Inloggning via Cloudflare Access krävs');
  // One-time bootstrap: an existing user table must be empty and email must match secret.
  if(path==='/api/private/bootstrap'&&method==='POST'){
   if(normEmail(env.BOOTSTRAP_ADMIN_EMAIL)!==identity.email||!validEmail(identity.email))return err(403,'Bootstrap är inte tillåten');
   const count=await env.DB.prepare('SELECT COUNT(*) AS n FROM work_users').first();if(Number(count?.n)!==0)return err(409,'Administratör finns redan');
   const v=await bodyJson(req);const display_name=typeof v.display_name==='string'?v.display_name.trim().replace(/\s+/g,' '):'';if(!display_name||display_name.length>120||/[\x00-\x1F\x7F]/.test(display_name))return err(400,'Ange ditt visningsnamn (1–120 tecken');
   await env.DB.prepare("INSERT INTO work_users(email,display_name,role,active,created_at) VALUES(?,?, 'admin',1,?)").bind(identity.email,display_name,new Date().toISOString()).run();return out({ok:true});
  }
  if(path==='/arbetsrum/setup'&&method==='GET'){
   if(normEmail(env.BOOTSTRAP_ADMIN_EMAIL)!==identity.email||!validEmail(identity.email))return err(403,'Installationsåtkomst nekad');
   const count=await env.DB.prepare('SELECT COUNT(*) AS n FROM work_users').first();
   if(Number(count?.n)!==0)return new Response(null,{status:302,headers:{location:'/arbetsrum','cache-control':'no-store'}});
   const page=`<!doctype html><html lang="sv"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Aktivera arbetsrum</title><style>body{font:16px system-ui;background:#f5f7fb;color:#1b2450;display:grid;min-height:100vh;place-items:center;margin:0}.box{background:#fff;padding:36px;max-width:500px;border:1px solid #e0e6f2;border-radius:18px}button{background:#141b4d;color:white;border:0;border-radius:10px;padding:13px 20px;font:inherit;cursor:pointer}</style><main class="box"><h1>Aktivera Politikverkstan</h1><p>Inloggad identitet: <strong>${identity.email.replace(/[&<>"']/g,'')}</strong></p><p>Skapa det första administratörskontot. Detta kan bara göras en gång och kräver rätt Cloudflare Access-identitet.</p><label for="displayName">Visningsnamn</label><input id="displayName" maxlength="120" required autocomplete="name" style="display:block;width:100%;margin:8px 0 19px;padding:10px;border:1px solid #bbc6de;border-radius:9px"><button id="go">Aktivera administratören</button><p id="status" role="status"></p></main><script nonce="setup">document.getElementById('go').addEventListener('click',async()=>{const r=await fetch('/api/private/bootstrap',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({display_name:document.getElementById('displayName').value})});const d=await r.json();if(r.ok)location.href='/arbetsrum';else document.getElementById('status').textContent=d.error||'Aktivering misslyckades';});</script></html>`;
   return new Response(page,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store, private','x-frame-options':'DENY','referrer-policy':'no-referrer','content-security-policy':"default-src 'none'; script-src 'nonce-setup'; connect-src 'self'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'"}});
  }
  const user=await requireUser(req,env);if(!user)return err(403,'Ditt konto är inte godkänt i arbetsrummet');
  if(path==='/arbetsrum'||path==='/arbetsrum/')return method==='GET'?htmlPage():err(405,'Metod tillåts inte');
  if(path==='/api/private/me'&&method==='GET')return out({user:{email:user.email,name:user.display_name,role:user.role}});
  if(path==='/api/private/directory'&&method==='GET'){
   const records=await env.DB.prepare('SELECT email,display_name FROM work_users WHERE active=1 ORDER BY display_name,email LIMIT 120').all();
   return out({users:records.results||[]});
  }
  if(path.startsWith('/api/private/users'))return userAdmin(req,env,user,path);
  if(path==='/api/private/branding'&&method==='GET'){
   const item=await env.DB.prepare('SELECT png_base64 FROM work_branding WHERE id=1').first();return out({logo:item?.png_base64?`data:image/png;base64,${item.png_base64}`:null});
  }
  if(path==='/api/private/branding'&&method==='POST'){
   if(user.role!=='admin')return err(403,'Administratörsbehörighet krävs');
   const v=await bodyJson(req,360000);if(v.logo===null){await env.DB.prepare('DELETE FROM work_branding WHERE id=1').run();return out({ok:true});}
   if(typeof v.logo!=='string'||v.logo.length>360000||v.logo.length<100||!/^[A-Za-z0-9+/]+={0,2}$/.test(v.logo))return err(400,'Endast PNG upp till cirka 250 KB är tillåten');
   const raw=atob(v.logo);if(raw.length>250000||!raw.startsWith('\x89PNG\r\n\x1a\n'))return err(400,'Ogiltig PNG');
   const view=new DataView(Uint8Array.from(raw,c=>c.charCodeAt(0)).buffer);const w=view.getUint32(16),h=view.getUint32(20);if(w<1||h<1||w>2400||h>2400)return err(400,'Orimlig bildstorlek');
   await env.DB.prepare('INSERT INTO work_branding(id,png_base64,updated_at) VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET png_base64=excluded.png_base64,updated_at=excluded.updated_at').bind(v.logo,new Date().toISOString()).run();return out({ok:true});
  }
  const cases=await handleCases(req,env,user);if(cases)return cases;
  const files=await handleFiles(req,env,user);if(files)return files;
  const collab=await handleCollaboration(req,env,user);if(collab)return collab;
  if(path==='/api/private/motions'&&method==='GET')return out({motions:await documentList(env,user)});
  if(path==='/api/private/motions'&&method==='POST'){
   const v=normalizeMotion(await bodyJson(req));const id=crypto.randomUUID(),now=new Date().toISOString();
   await env.DB.prepare('INSERT INTO work_motions(id,owner_email,title,status,category,content_json,revision,created_at,updated_at) VALUES(?,?,?,?,?,?,1,?,?)').bind(id,user.email,v.title||'Ny motion',v.status,v.category,JSON.stringify(v),now,now).run();
   return out({id,revision:1,updated_at:now,...v},201);
  }
  const id=routeId(path);
  if(id){
   const row=await ownDoc(env,user,id);if(!row)return err(404,'Dokumentet finns inte eller saknar åtkomst');
   if(method==='GET')return out({motion:motionResponse(row)});
   if(method==='PUT'){
    const raw=await bodyJson(req);if(!Number.isInteger(raw.revision)||raw.revision!==row.revision)return err(409,'Dokumentet har ändrats i en annan session. Ladda om innan du sparar igen.');
    const v=normalizeMotion(raw),now=new Date().toISOString();
    const changed=await env.DB.prepare('UPDATE work_motions SET title=?,status=?,category=?,content_json=?,revision=revision+1,updated_at=? WHERE id=? AND owner_email=? AND revision=?').bind(v.title||'Ny motion',v.status,v.category,JSON.stringify(v),now,id,user.email,row.revision).run();
    if(changed.meta?.changes===0)return err(409,'Konflikt vid sparning');
    await env.DB.prepare('INSERT INTO work_motion_versions(motion_id,revision,content_json,created_at) VALUES(?,?,?,?)').bind(id,row.revision,row.content_json,now).run();
    return out({id,revision:row.revision+1,updated_at:now,...v});
   }
   if(method==='DELETE'){await env.DB.prepare('DELETE FROM work_motions WHERE id=? AND owner_email=?').bind(id,user.email).run();return out({ok:true});}
  }
  if(path.match(/^\/api\/private\/motions\/[0-9a-f-]{36}\/versions$/)&&method==='GET'){
   const docId=path.split('/')[4],row=await ownDoc(env,user,docId);if(!row)return err(404,'Saknar åtkomst');const ver=await env.DB.prepare('SELECT revision,created_at FROM work_motion_versions WHERE motion_id=? ORDER BY revision DESC LIMIT 30').bind(docId).all();return out({versions:ver.results||[]});
  }
  if(path.match(/^\/api\/private\/motions\/[0-9a-f-]{36}\/restore$/)&&method==='POST'){
   const docId=path.split('/')[4],row=await ownDoc(env,user,docId);if(!row)return err(404,'Saknar åtkomst');const payload=await bodyJson(req);if(!Number.isInteger(payload.revision))return err(400,'Ogiltig version');
   const previous=await env.DB.prepare('SELECT content_json FROM work_motion_versions WHERE motion_id=? AND revision=?').bind(docId,payload.revision).first();if(!previous)return err(404,'Versionen finns inte');
   const v=normalizeMotion(JSON.parse(previous.content_json)),now=new Date().toISOString();
   await env.DB.batch([
     env.DB.prepare('INSERT INTO work_motion_versions(motion_id,revision,content_json,created_at) VALUES(?,?,?,?)').bind(docId,row.revision,row.content_json,now),
     env.DB.prepare('UPDATE work_motions SET title=?,status=?,category=?,content_json=?,revision=revision+1,updated_at=? WHERE id=? AND owner_email=? AND revision=?').bind(v.title||'Ny motion',v.status,v.category,JSON.stringify(v),now,docId,user.email,row.revision)
   ]);
   return out({id:docId,revision:row.revision+1,updated_at:now,...v});
  }
  if(path==='/api/private/ideas'&&method==='GET'){
   const r=await env.DB.prepare('SELECT id,title,category,problem,action,source_url FROM work_ideas WHERE published=1 ORDER BY created_at DESC LIMIT 60').all();return out({ideas:r.results||[]});
  }
  if(path==='/api/private/ideas'&&method==='POST'){
   if(user.role!=='admin')return err(403,'Administratörsbehörighet krävs');const v=await bodyJson(req),id=crypto.randomUUID();
   await env.DB.prepare('INSERT INTO work_ideas(id,title,category,problem,action,source_url,published,created_at) VALUES(?,?,?,?,?,?,1,?)').bind(id,clean(v.title,160),allowedCategory.has(v.category)?v.category:'Annat',clean(v.problem,1200),clean(v.action,1200),clean(v.source_url,500),new Date().toISOString()).run();return out({id,ok:true},201);
  }
  return err(404,'Okänd begäran');
 }catch(e){if(e instanceof SyntaxError||e.message==='För stor begäran'||e.message==='Ogiltigt dokument')return err(400,e.message);console.error('Private workspace error',e.message);return err(503,'Tjänsten kunde inte slutföra begäran');}
}
