import {OFFICIAL_MEETING_CACHE} from './official-meetings-cache.mjs';
/* Lekeberg public MeetingPlus calendar. No private credentials, document
 * downloads, meeting notes or user data are sent to the source website.
 * Four fixed allowlisted sources. GitHub Actions fetches, Cloudflare serves cached data. */
export const OFFICIAL_SOURCES=[
 {key:'kf',name:'Kommunfullmäktige',slug:'kommunfullmaktige'},
 {key:'bun',name:'Barn- och utbildningsnämnden',slug:'barn-och-utbildningsnamnden'},
 {key:'sn',name:'Socialnämnden',slug:'socialnamnden'},
 {key:'ks',name:'Kommunstyrelsen',slug:'kommunstyrelsen'}
];
const origin='https://meetings.lekeberg.se';
const decode=s=>String(s).replace(/&(?:nbsp|amp|lt|gt|quot|#39|#x([0-9a-f]+)|#(\d+));/gi,(m,h,n)=>{
 if(h||n){const code=parseInt(h||n,h?16:10);return code>31&&code<0x110000?String.fromCodePoint(code):' ';}
 return {'&nbsp;':' ','&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&#39;':"'" }[m.toLowerCase()]||' ';
});
const plain=s=>decode(String(s).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ')).trim();
const dateOK=d=>/^\d{4}-\d{2}-\d{2}$/.test(d)&&!Number.isNaN(Date.parse(d+'T00:00:00Z'))&&new Date(d+'T00:00:00Z').toISOString().slice(0,10)===d;
const timeOK=t=>!t||/^([01]\d|2[0-3]):[0-5]\d$/.test(t);
const localDate=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Stockholm',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export function parseOfficialMeetings(html,source,today=localDate()){
 if(!source||!OFFICIAL_SOURCES.some(s=>s.key===source.key&&s.slug===source.slug))throw Error('Okänd sammanträdeskälla');
 if(typeof html!=='string'||html.length>1_600_000)throw Error('Oväntat svar från sammanträdesportalen');
 const cutoff=new Date(today+'T00:00:00Z');cutoff.setUTCDate(cutoff.getUTCDate()-31);
 const minimum=cutoff.toISOString().slice(0,10);
 const found=new Map();
 // Both document and links come from MeetingPlus public committee pages.
 for(const m of html.matchAll(/<a\b[^>]*\bhref\s*=\s*(["'])([^"']+)\1[^>]*>([\s\S]*?)<\/a>/gi)){
  let u;try{u=new URL(decode(m[2]),origin);}catch{continue;}
  if(u.origin!==origin||!u.pathname.startsWith('/committees/'+source.slug+'/'))continue;
  const match=u.pathname.match(/\/mote-(\d{4}-\d{2}-\d{2})(?:\/)?$/);
  if(!match||!dateOK(match[1])||match[1]<minimum)continue;
  // Avoid duplicate URL variants and fragments. A meeting can change its time.
  const url=origin+u.pathname.replace(/\/$/,'');
  const rowStart=html.lastIndexOf('<tr',m.index);
  const rowEnd=html.indexOf('</tr>',m.index+m[0].length);
  const inRow=rowStart>=0&&rowEnd>=0&&m.index-rowStart<1200&&rowEnd-m.index<1600;
  const after=inRow?html.slice(m.index+m[0].length,rowEnd):html.slice(m.index+m[0].length,m.index+m[0].length+350);
  const label=plain(m[3]);
  // MeetingPlus places its schedule in an aria-label on the public link,
  // with the place in a separate div role="cell" rather than a <tr>.
  const opening=m[0].slice(0,m[0].indexOf('>')+1);
  const aria=opening.match(/\baria-label\s*=\s*(["'])(.*?)\1/i);
  const timeText=(decode(aria?.[2]||'')+' '+label+' '+plain(after).slice(0,110));
  const times=timeText.match(/((?:[01]\d|2[0-3]):[0-5]\d)\s*[-–]\s*((?:[01]\d|2[0-3]):[0-5]\d)/)||
    timeText.match(/([01]\d|2[0-3]):[0-5]\d\s*[-–]\s*/);
  const start=times?times[0].slice(0,5):'';
  const end=times&&times[2]?times[2]:'';
  if(!timeOK(start)||!timeOK(end))continue;
  // Prefer the next table cell; otherwise do not guess the place.
  let location='';
  if(inRow){
   const cells=html.slice(rowStart,rowEnd).match(/<td\b[^>]*>[\s\S]*?<\/td>/gi)||[];
   if(cells.length>=2)location=plain(cells.at(-1));
  }
  // For non-table layouts accept only the first adjacent short text block.
  if(!location){
   const locationCell=after.match(/class\s*=\s*["'][^"']*\blocation-text\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/i);
   if(locationCell)location=plain(locationCell[1]);
  }
  if(!location){
   const part=after.match(/^\s*(?:<\/(?:a|div|span)>\s*)*(?:<(?:td|div|span|p)[^>]*>)?\s*([^<]{2,140})/i);
   if(part)location=plain(part[1]);
  }
  if(/^\d{4}|^(?:Datum|Plats|Kommande|Tidigare)/i.test(location))location='';
  found.set(url,{source_url:url,committee_key:source.key,committee:source.name,meeting_date:match[1],start_time:start,end_time:end,location:location.slice(0,160)});
 }
 return [...found.values()].sort((a,b)=>a.meeting_date.localeCompare(b.meeting_date)||a.source_url.localeCompare(b.source_url));
}
function sourceUrl(s){return origin+'/committees/'+s.slug;}
// A compiled snapshot is loaded with the Worker. No outbound subrequest is
// performed by Cloudflare, including when reading the authenticated calendar.
export function normalizeCachedCalendar(snapshot,today=localDate()){
 const entries=Array.isArray(snapshot?.sources)?snapshot.sources:[];
 const seen=new Set(),meetings=[],sources=[];
 const minimum=new Date(today+'T00:00:00Z');minimum.setUTCDate(minimum.getUTCDate()-31);
 const cutoff=minimum.toISOString().slice(0,10);
 for(const source of OFFICIAL_SOURCES){
  const item=entries.find(x=>x?.committee_key===source.key);
  let accepted=0;
  for(const m of Array.isArray(item?.meetings)?item.meetings.slice(0,250):[]){
   if(typeof m?.source_url!=='string')continue;
   let uri;try{uri=new URL(m.source_url);}catch{continue;}
   if(uri.origin!==origin||!uri.pathname.startsWith('/committees/'+source.slug+'/')||uri.search||uri.hash)continue;
   const date=uri.pathname.match(/\/mote-(\d{4}-\d{2}-\d{2})\/?$/)?.[1];
   if(!date||date!==m.meeting_date||!dateOK(date)||date<cutoff)continue;
   if(!timeOK(m.start_time)||!timeOK(m.end_time))continue;
   const canonical=uri.origin+uri.pathname.replace(/\/$/,'');
   if(seen.has(canonical))continue;seen.add(canonical);
   meetings.push({
    source_url:canonical,
    committee_key:source.key,committee:source.name,meeting_date:date,
    start_time:m.start_time||'',end_time:m.end_time||'',
    location:typeof m.location==='string'?m.location.slice(0,160):''
   });accepted++;
  }
  sources.push({
   committee_key:source.key,
   last_attempt_at:typeof item?.last_attempt_at==='string'?item.last_attempt_at:'',
   last_success_at:typeof item?.last_success_at==='string'?item.last_success_at:'',
   last_count:Number(item?.last_count)||0,
   last_error:typeof item?.last_error==='string'?item.last_error.slice(0,120):''
  });
 }
 meetings.sort((a,b)=>a.meeting_date.localeCompare(b.meeting_date)||a.start_time.localeCompare(b.start_time)||a.committee_key.localeCompare(b.committee_key));
 return {meetings:meetings.slice(0,280),sources,committees:OFFICIAL_SOURCES.map(s=>({key:s.key,name:s.name,url:sourceUrl(s)})),can_sync:false,source:'github'};
}
const headers={'content-type':'application/json; charset=utf-8','cache-control':'private, no-store','x-content-type-options':'nosniff'};
const reply=(v,status=200)=>new Response(JSON.stringify(v),{status,headers});
export async function handleOfficialMeetings(req,env,user){
 const path=new URL(req.url).pathname;
 if(path!=='/api/private/official-meetings'&&path!=='/api/private/official-meetings/sync')return null;
 if(req.method!=='GET' || path.endsWith('/sync')){
  return reply({error:'Kommunens möten hämtas automatiskt genom GitHub. Uppdatera kalendern för att se senaste publicerade uppgifter.'},405);
 }
 return reply(normalizeCachedCalendar(OFFICIAL_MEETING_CACHE));
}
