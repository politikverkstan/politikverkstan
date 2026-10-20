import {handlePrivate} from './private.mjs';
/* Cloudflare Worker: privacy-minimized optional aggregate telemetry; fail-closed private administration.
 * Not part of the public HTML bundle. No visitor IP is read on telemetry endpoint. */
const JSON_HEADERS={'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'};
function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:JSON_HEADERS});}
function responseError(status, msg){return json({error:msg},status);}
function base64urlDecode(s){if(!/^[A-Za-z0-9_-]+$/.test(s))throw Error('Invalid base64url');return Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-s.length%4)%4)),c=>c.charCodeAt(0));}
function jsonPart(str){return JSON.parse(new TextDecoder().decode(base64urlDecode(str)));}
function parseOrigin(req){const origin=req.headers.get('Origin');return !origin || origin===new URL(req.url).origin;}
const PARTY_CODES=['C','FL','KD','L','M','MP','S','SD','V'];
function normalizeGroups(groups){
 if(!Array.isArray(groups)||groups.length<1||groups.length>9)throw Error('Invalid grouping');
 const seen=new Set();let normalized=[];
 for(const g of groups){if(!Array.isArray(g)||!g.length||g.length>9)throw Error('Invalid group');
  let arr=[];for(const p of g){if(typeof p!=='string'||!PARTY_CODES.includes(p)||seen.has(p))throw Error('Invalid party');seen.add(p);arr.push(p);}
  normalized.push(arr.sort());
 }
 if(seen.size!==9)throw Error('Missing party');
 return normalized.sort((a,b)=>a.join('+').localeCompare(b.join('+'))).map(g=>g.join('+')).join('|');
}
async function recordSecurity(env, req, status){
 if(env.SECURITY_LOG_ENABLED!=='true'||!env.DB)return;
 // Only failed/admin security requests: never connect IP addresses to political scenario event streams.
 const addr=req.headers.get('CF-Connecting-IP');if(!addr||addr.length>64||!/^[:.0-9a-fA-F]+$/.test(addr))return;
 try{await env.DB.prepare('INSERT INTO security_events (stamp, ip, category, status) VALUES (?, ?, ?, ?)').bind(new Date().toISOString(),addr,'admin_denied',status).run();}catch{}
}
async function authorize(req,env){
 // Two layers: Cloudflare Access protects the hostname/path and we verify the signed JWT ourselves.
 const team=env.ACCESS_TEAM_DOMAIN, aud=env.ACCESS_AUD, whitelist=env.ADMIN_EMAILS;
 if(!team||!aud||!whitelist||!/^[-a-z0-9]+\.cloudflareaccess\.com$/.test(team))return null;
 const token=req.headers.get('Cf-Access-Jwt-Assertion');if(!token||token.length>16000)return null;
 try{
  const parts=token.split('.');if(parts.length!==3)return null;
  const header=jsonPart(parts[0]),payload=jsonPart(parts[1]);
  if(header.alg!=='RS256'||typeof header.kid!=='string'||typeof payload!=='object')return null;
  const now=Math.floor(Date.now()/1000);
  if(payload.iss!==`https://${team}`||!Array.isArray(payload.aud)||!payload.aud.includes(aud)||typeof payload.exp!=='number'||payload.exp<=now||typeof payload.nbf==='number'&&payload.nbf>now+30)return null;
  if(typeof payload.email!=='string'||!whitelist.split(',').map(x=>x.trim().toLowerCase()).filter(Boolean).includes(payload.email.toLowerCase()))return null;
  const certs=await fetch(`https://${team}/cdn-cgi/access/certs`,{headers:{accept:'application/json'}});
  if(!certs.ok)return null;
  const jwks=await certs.json();const jwk=(jwks.keys||[]).find(k=>k.kid===header.kid&&k.kty==='RSA');if(!jwk)return null;
  const key=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
  const signed=new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
  if(!await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,base64urlDecode(parts[2]),signed))return null;
  return {email:payload.email};
 }catch{return null;}
}
function adminHtml(nonce){return `<!doctype html><html lang="sv"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Administration | Politikverkstan Lekeberg</title><style nonce="${nonce}">
:root{font-family:system-ui,-apple-system,sans-serif;color:#182b42;background:#f3f6fa}*{box-sizing:border-box}body{margin:0}header{background:#10233c;color:white;padding:25px max(24px,calc((100% - 1020px)/2))}main{max-width:1020px;margin:32px auto;padding:0 22px}.metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:14px}.metric,.card{background:white;border:1px solid #e2e7ef;border-radius:12px;padding:20px}.metric b{font-size:29px;display:block;margin:8px 0}.muted,small{color:#5e6d80}.card{margin-top:18px;overflow:auto}table{width:100%;border-collapse:collapse}th,td{text-align:left;border-bottom:1px solid #e2e7ef;padding:11px}th{font-size:13px;color:#52627a}td{font-size:14px}button{border:1px solid #cbd5e1;background:white;color:#13253d;border-radius:9px;padding:10px 14px;cursor:pointer}header small{color:#ccd8e8}#error{color:#a41a35}h1{margin:0 0 6px;font-size:26px}h2{font-size:19px}
</style></head><body><header><h1>Politikverkstan · Administration</h1><small>Skyddad servervy · sammanställd statistik, aldrig individbaserad kartellhistorik</small></header><main><button id="refresh">Uppdatera statistik</button><p id="error" role="alert"></p><div class="metrics" id="metrics"></div><section class="card"><h2>Vanligaste frivilligt delade kartellindelningarna</h2><p class="muted">Endast kombinationer med minst 5 observationer visas. Inga IP-adresser eller identifierare ingår.</p><table><thead><tr><th>Karteller</th><th>Antal analyser</th></tr></thead><tbody id="coalitions"></tbody></table></section><section class="card"><h2>Per dag</h2><table><thead><tr><th>Dag (UTC)</th><th>Frivilligt delade analyser</th></tr></thead><tbody id="daily"></tbody></table></section><section class="card"><h2>Teknisk säkerhetslogg</h2><p class="muted">Endast blockerade adminanrop, om säkerhetsloggning har aktiverats separat. Automatisk gallring efter 7 dagar.</p><table><thead><tr><th>Tid (UTC)</th><th>IP (säkerhet)</th><th>Status</th></tr></thead><tbody id="security"></tbody></table></section><p class="muted">Adminstatistik är inte ett mått på unika besökare. Ingen automatisk koppling görs mellan IP-adresser och testade karteller.</p></main><script nonce="${nonce}">
const $=x=>document.getElementById(x);function cell(row,value){const e=document.createElement('td');e.textContent=String(value);row.append(e)}
function table(id,rows,columns){const body=$(id);body.replaceChildren();for(const item of rows){const tr=document.createElement('tr');for(const k of columns)cell(tr,item[k]??'');body.append(tr)}if(!rows.length){const tr=document.createElement('tr');const td=document.createElement('td');td.colSpan=columns.length;td.textContent='Inga uppgifter tillgängliga';tr.append(td);body.append(tr)}}
async function load(){ $('error').textContent=''; try{const r=await fetch('/admin?summary=1',{credentials:'same-origin',cache:'no-store'});if(!r.ok)throw Error('Kan inte läsa skyddad statistik (HTTP '+r.status+').');const data=await r.json();const metrics=$('metrics');metrics.replaceChildren();for(const [label,value] of [['Statistikläge',data.enabled?'På':'Av'],['Totalt delade analyser',data.total||0],['Olika kartellindelningar',data.distinct||0],['Loggning av IP',data.securityLogEnabled?'Aktiverad':'Avstängd']]){const el=document.createElement('div');el.className='metric';const cap=document.createElement('small');cap.textContent=label;const num=document.createElement('b');num.textContent=String(value);el.append(cap,num);metrics.append(el)}table('coalitions',data.coalitions||[],['signature','count']);table('daily',data.daily||[],['day','count']);table('security',data.security||[],['stamp','ip','status']);}catch(e){ $('error').textContent=e.message;}}
$('refresh').addEventListener('click',load);load();</script></body></html>`;}
function adminResponse(){const bytes=new Uint8Array(18);crypto.getRandomValues(bytes);const nonce=btoa(String.fromCharCode(...bytes));return new Response(adminHtml(nonce),{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store, private','x-frame-options':'DENY','x-content-type-options':'nosniff','referrer-policy':'no-referrer','content-security-policy':`default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'`}});}
async function summary(env){
 const result={enabled:env.TELEMETRY_ENABLED==='true',securityLogEnabled:env.SECURITY_LOG_ENABLED==='true',total:0,distinct:0,coalitions:[],daily:[],security:[]};
 if(env.DB&&result.enabled){
  const all=await env.DB.prepare('SELECT COALESCE(SUM(count),0) AS total, COUNT(DISTINCT signature) AS distinct_count FROM coalition_counts').first();
  result.total=all?.total||0;result.distinct=all?.distinct_count||0;
  const top=await env.DB.prepare('SELECT signature, SUM(count) AS count FROM coalition_counts GROUP BY signature HAVING SUM(count)>=5 ORDER BY count DESC, signature ASC LIMIT 20').all();result.coalitions=top.results||[];
  const daily=await env.DB.prepare('SELECT day, SUM(count) AS count FROM coalition_counts GROUP BY day ORDER BY day DESC LIMIT 30').all();result.daily=daily.results||[];
 }
 if(env.DB&&result.securityLogEnabled){const sec=await env.DB.prepare("SELECT stamp,ip,status FROM security_events WHERE stamp>=strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-7 days') ORDER BY stamp DESC LIMIT 40").all();result.security=sec.results||[];}
 return result;
}
export default {
 async fetch(req,env){const url=new URL(req.url);let path=url.pathname;const admin=path==='/admin'||path==='/admin/'||path.startsWith('/api/admin/');
  if(path==='/arbetsrum'||path.startsWith('/arbetsrum/')||path.startsWith('/api/private/'))return handlePrivate(req,env);
  if(admin){
   const authorized=await authorize(req,env);
   if(!authorized){await recordSecurity(env,req,403);return responseError(403,'Åtkomst nekad');}
   if(!['GET','HEAD'].includes(req.method))return responseError(405,'Metod tillåts inte');
   try{if((path==='/admin'||path==='/admin/')&&url.searchParams.get('summary')==='1')return json(await summary(env));if(path==='/admin'||path==='/admin/')return adminResponse();if(path==='/api/admin/summary')return json(await summary(env));return responseError(404,'Saknas');}
   catch{return responseError(503,'Administrationsdata ej tillgängliga');}
  }
  if(path==='/api/telemetry'){
   if(req.method!=='POST')return responseError(405,'Metod tillåts inte');
   if(env.TELEMETRY_ENABLED!=='true'||!env.DB)return responseError(503,'Statistik ej aktiverad');
   if(!parseOrigin(req))return responseError(403,'Otillåtet ursprung');
   const ct=req.headers.get('content-type')||'';if(!ct.startsWith('application/json'))return responseError(415,'JSON krävs');
   if(Number(req.headers.get('content-length')||0)>2048)return responseError(413,'För stor begäran');
   let body;try{const raw=await req.text();if(raw.length>2048)return responseError(413,'För stor begäran');body=JSON.parse(raw);}catch{return responseError(400,'Ogiltigt format');}
   if(!body||body.event!=='coalition_analyzed'||body.consent!==true)return responseError(400,'Frivilligt godkännande krävs');
   let signature;try{signature=normalizeGroups(body.groups);}catch{return responseError(400,'Ogiltig kartellindelning');}
   try{const day=new Date().toISOString().slice(0,10);await env.DB.prepare('INSERT INTO coalition_counts (day,signature,count) VALUES (?, ?, 1) ON CONFLICT(day,signature) DO UPDATE SET count=count+1').bind(day,signature).run();return json({ok:true});}
   catch{return responseError(503,'Statistik kunde inte lagras');}
  }
  if(path.startsWith('/api/'))return responseError(404,'Okänt API');
  if(path==='/Mandatportal-Lekeberg'||path==='/Mandatportal-Lekeberg.html')return Response.redirect(url.origin+'/',301);
  if(env.ASSETS)return env.ASSETS.fetch(req);
  return responseError(503,'Statiska filer saknas');
 },
 async scheduled(event,env){if(!env.DB)return;try{await env.DB.prepare("DELETE FROM security_events WHERE stamp < strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-7 days')").run();}catch{console.error('Security retention cleanup failed');}try{await env.DB.prepare("DELETE FROM coalition_counts WHERE day < date('now','-90 days')").run();}catch{console.error('Aggregate retention cleanup failed');}}
};
export {normalizeGroups,authorize};
