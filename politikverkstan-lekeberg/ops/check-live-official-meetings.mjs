import {OFFICIAL_SOURCES,parseOfficialMeetings} from '../worker/official-meetings.mjs';
// Diagnostic only: public URLs, no cookies, private data, or page dumps.
for(const source of OFFICIAL_SOURCES){
 const url='https://meetings.lekeberg.se/committees/'+source.slug;
 try{
  const r=await fetch(url,{headers:{accept:'text/html','user-agent':'Politikverkstan-CalendarCheck/1.0 (+public meeting metadata)'},signal:AbortSignal.timeout(10000)});
  const html=await r.text();
  const pathAnchors=[...html.matchAll(/href\s*=\s*(["'])(.*?)\1/gi)].map(x=>x[2]).filter(x=>x.includes('mote-'));
  const parsed=parseOfficialMeetings(html,source);
  console.log(source.key,'HTTP',r.status,'type',r.headers.get('content-type'),'bytes',html.length,'matching-links',pathAnchors.length,'parsed',parsed.length,'example-links',JSON.stringify(pathAnchors.slice(0,3)));
 }catch(e){console.log(source.key,'ERR',String(e.name||'Error'),String(e.message).slice(0,160));}
}
