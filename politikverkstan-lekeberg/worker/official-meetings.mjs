/* Lekeberg public MeetingPlus calendar. No private credentials, document
 * downloads, meeting notes or user data are sent to the source website.
 * Four fixed allowlisted URLs only; runs on the Worker cron or admin request. */
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
  const timeText=(label+' '+plain(after).slice(0,110));
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
   const part=after.match(/^\s*(?:<\/(?:a|div|span)>\s*)*(?:<(?:td|div|span|p)[^>]*>)?\s*([^<]{2,140})/i);
   if(part)location=plain(part[1]);
  }
  if(/^\d{4}|^(?:Datum|Plats|Kommande|Tidigare)/i.test(location))location='';
  found.set(url,{source_url:url,committee_key:source.key,committee:source.name,meeting_date:match[1],start_time:start,end_time:end,location:location.slice(0,160)});
 }
 return [...found.values()].sort((a,b)=>a.meeting_date.localeCompare(b.meeting_date)||a.source_url.localeCompare(b.source_url));
}
function sourceUrl(s){return origin+'/committees/'+s.slug;}
export async function syncOfficialMeetings(env,{fetcher=fetch,now=new Date().toISOString()}={}){
 if(!env.DB)throw Error('Databasbindning saknas');
 const status=[];
 for(const source of OFFICIAL_SOURCES){
  const url=sourceUrl(source);
  try{
   const result=await fetcher(url,{headers:{accept:'text/html'},redirect:'error',signal:AbortSignal.timeout(12000)});
   if(!result.ok||!((result.headers.get('content-type')||'').includes('text/html')))throw Error('Källan svarade inte med HTML');
   const html=await result.text();
   const records=parseOfficialMeetings(html,source,now.slice(0,10));
   // Empty result may mean changed markup, outage or legitimately no future meetings.
   // Preserve previous data, report the problem instead of erasing valid entries.
   if(!records.length)throw Error('Inga igenkända möten – kontrollera källformatet');
   for(const m of records){
    await env.DB.prepare(`INSERT INTO official_meetings
    (source_url,committee_key,committee,meeting_date,start_time,end_time,location,first_seen_at,last_seen_at,updated_at)
    VALUES(?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(source_url) DO UPDATE SET committee=excluded.committee,
     meeting_date=excluded.meeting_date,start_time=excluded.start_time,end_time=excluded.end_time,
     location=excluded.location,last_seen_at=excluded.last_seen_at,
     updated_at=CASE WHEN meeting_date IS NOT excluded.meeting_date OR start_time IS NOT excluded.start_time
      OR end_time IS NOT excluded.end_time OR location IS NOT excluded.location THEN excluded.updated_at ELSE official_meetings.updated_at END`)
     .bind(m.source_url,m.committee_key,m.committee,m.meeting_date,m.start_time,m.end_time,m.location,now,now,now).run();
   }
   await env.DB.prepare(`INSERT INTO official_meeting_sources
    (committee_key,source_url,last_attempt_at,last_success_at,last_count,last_error)
    VALUES(?,?,?,?,?,'')
    ON CONFLICT(committee_key) DO UPDATE SET source_url=excluded.source_url,
    last_attempt_at=excluded.last_attempt_at,last_success_at=excluded.last_success_at,
    last_count=excluded.last_count,last_error=''`)
    .bind(source.key,url,now,now,records.length).run();
   status.push({committee:source.name,count:records.length,ok:true});
  }catch(e){
   // Do not expose upstream response contents or credentials in logs.
   console.error('Official meeting sync failed:',source.key,String(e.message).slice(0,120));
   await env.DB.prepare(`INSERT INTO official_meeting_sources
    (committee_key,source_url,last_attempt_at,last_error)
    VALUES(?,?,?,'Källan kunde inte läsas')
    ON CONFLICT(committee_key) DO UPDATE SET last_attempt_at=excluded.last_attempt_at,
    last_error=excluded.last_error`).bind(source.key,url,now).run();
   status.push({committee:source.name,ok:false});
  }
 }
 return {status,updated:status.some(s=>s.ok)};
}
const headers={'content-type':'application/json; charset=utf-8','cache-control':'private, no-store','x-content-type-options':'nosniff'};
const reply=(o,status=200)=>new Response(JSON.stringify(o),{status,headers});
export async function handleOfficialMeetings(req,env,user){
 const path=new URL(req.url).pathname;
 if(path!=='/api/private/official-meetings'&&path!=='/api/private/official-meetings/sync')return null;
 if(path.endsWith('/sync')){
  if(req.method!=='POST')return reply({error:'Metod tillåts inte'},405);
  if(user.role!=='admin')return reply({error:'Administratör krävs'},403);
  // Avoid parallel rapid polls from users; scheduled checks use the same tables.
  const last=await env.DB.prepare('SELECT MAX(last_attempt_at) AS stamp FROM official_meeting_sources').first();
  if(last?.stamp&&Date.now()-Date.parse(last.stamp)<5*60_000)return reply({error:'Synkronisering utfördes nyligen, försök senare'},429);
  return reply(await syncOfficialMeetings(env));
 }
 if(req.method!=='GET')return reply({error:'Metod tillåts inte'},405);
 const [meetings,sources]=await Promise.all([
  env.DB.prepare("SELECT source_url,committee_key,committee,meeting_date,start_time,end_time,location,last_seen_at,updated_at FROM official_meetings WHERE meeting_date>=date('now','-31 days') ORDER BY meeting_date,start_time,committee LIMIT 280").all(),
  env.DB.prepare('SELECT committee_key,last_attempt_at,last_success_at,last_count,last_error FROM official_meeting_sources ORDER BY committee_key').all()
 ]);
 return reply({meetings:meetings.results||[],sources:sources.results||[],committees:OFFICIAL_SOURCES.map(s=>({key:s.key,name:s.name,url:sourceUrl(s)})),can_sync:user.role==='admin'});
}
