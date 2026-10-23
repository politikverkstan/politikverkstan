// Executed only by the scheduled GitHub runner (not by Cloudflare).
// Fetches public source pages; writes a validated, data-only JS snapshot to the Worker bundle.
import {readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {OFFICIAL_SOURCES,parseOfficialMeetings} from '../worker/official-meetings.mjs';
import {OFFICIAL_MEETING_CACHE} from '../worker/official-meetings-cache.mjs';
import {parseOfficialAgenda} from '../worker/official-agenda.mjs';

const target=fileURLToPath(new URL('../worker/official-meetings-cache.mjs',import.meta.url));
const now=new Date().toISOString(),today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Stockholm',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const prior=OFFICIAL_MEETING_CACHE.sources||[];
const sources=[];
let successes=0;
for(const source of OFFICIAL_SOURCES){
 const old=prior.find(s=>s.committee_key===source.key);
 const item={
  committee_key:source.key,last_attempt_at:now,
  last_success_at:old?.last_success_at||'',last_count:Number(old?.last_count)||0,
  last_error:'',meetings:Array.isArray(old?.meetings)?old.meetings:[]
 };
 try{
  const response=await fetch('https://meetings.lekeberg.se/committees/'+source.slug,{
   headers:{accept:'text/html','accept-language':'sv-SE,sv;q=0.9','user-agent':'Politikverkstan-GitHub-Calendar/1.0'},
   redirect:'error',signal:AbortSignal.timeout(16000)
  });
  if(!response.ok)throw Error('HTTP '+response.status);
  if(!(response.headers.get('content-type')||'').toLowerCase().includes('text/html'))throw Error('Fel innehållsformat');
  const html=await response.text();

  const matches=parseOfficialMeetings(html,source,today);
  if(!matches.length)throw Error('Ingen igenkänd möteslänk');
  item.meetings=await Promise.all(matches.map(async meeting=>{
   const previous=old?.meetings?.find(p=>p.source_url===meeting.source_url);
   try{
    const response=await fetch(meeting.source_url,{
     headers:{accept:'text/html','accept-language':'sv-SE,sv;q=0.9','user-agent':'Politikverkstan-GitHub-Agenda/1.5'},
     redirect:'error',signal:AbortSignal.timeout(12000)
    });
    if(!response.ok)throw Error('HTTP '+response.status);
    if(!(response.headers.get('content-type')||'').toLowerCase().includes('text/html'))throw Error('Fel svarstyp');
    const publicHtml=await response.text();
    const detail=parseOfficialAgenda(publicHtml,meeting.source_url);
    const oldValue=JSON.stringify({agenda:previous?.agenda||[],documents:previous?.documents||[]});
    const changed=oldValue!==JSON.stringify({agenda:detail.agenda,documents:detail.documents});
    return {...meeting,...detail,agenda_checked_at:now,agenda_changed_at:changed?now:previous?.agenda_changed_at||now,agenda_error:''};
   }catch{
    return {...meeting,agenda:previous?.agenda||[],documents:previous?.documents||[],
     agenda_status:previous?.agenda_status||'not_identified',
     agenda_checked_at:previous?.agenda_checked_at||'',agenda_changed_at:previous?.agenda_changed_at||'',
     agenda_error:'Offentlig mötessida kunde inte kontrolleras'};
   }
  }));
  item.last_success_at=now;
  item.last_count=matches.length;
  successes++;
  console.log(source.key+': '+matches.length+' verifierade offentliga möten');
 }catch(error){
  const msg=String(error?.message||'');
  item.last_error=/^HTTP [1-5]\d\d$/.test(msg)?msg:
   error?.name==='TimeoutError'?'Tidsgräns':
   msg==='Ingen igenkänd möteslänk'?'Möteslänkar kunde inte identifieras':
   'Källan kunde inte läsas';
  console.warn(source.key+': '+item.last_error+' (föregående mötesuppgifter bevarade)');
 }
 sources.push(item);
}
if(!successes)throw Error('Samtliga fyra MeetingPlus-hämtningar misslyckades; befintlig kalender behålls oförändrad.');
const next={version:2,generated_at:now,sources};
const body='// Public, automatically refreshed by .github/workflows/meetingplus-calendar.yml.\n'+
 'export const OFFICIAL_MEETING_CACHE = '+JSON.stringify(next,null,2)+';\n';
if(body.length>650000)throw Error('Oväntat stort kalenderunderlag. Avbryter.');
writeFileSync(target,body,'utf8');
console.log('Uppdaterade kalenderunderlaget:',successes,'av',OFFICIAL_SOURCES.length,'källor.');
