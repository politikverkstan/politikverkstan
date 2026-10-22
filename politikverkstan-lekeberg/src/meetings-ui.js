/* 0.9.0 — meeting workshop helpers; injected inside workroom.js IIFE by build.py */
const meetingStatuses={planned:'Planerat',held:'Genomfört',closed:'Avslutat'};
const meetingCommittees=['Kommunfullmäktige','Kommunstyrelsen','Barn- och utbildningsnämnden','Socialnämnden','Bygg- och miljönämnden','Valnämnden','Sydnärkes IT-nämnd','Sydnärkes miljö- och byggnämnd','Annat'];
const meetingEmpty=()=>({title:'',committee:'Kommunfullmäktige',meeting_date:'',start_time:'',location:'',status:'planned',scope:'mine',is_owner:true,revision:1});
const meetingItemEmpty=()=>({title:'',case_id:null,preparation:'',outcome:'',follow_up:''});
async function loadMeetings(){const r=await api('/api/private/meetings');state.meetingList=r.meetings||[];}
async function openMeeting(id){
 const r=await api('/api/private/meetings/'+encodeURIComponent(id));
 state.meetingCurrent={...r.meeting};state.meetingAgenda=r.agenda||[];
 state.meetingNote=r.personal_note||'';state.meetingDirty=false;state.meetingNoteDirty=false;state.meetingItemEdit=null;
}
function meetingSafeToLeave(){return !(state.meetingDirty||state.meetingNoteDirty||state.meetingItemDirty)||confirm('Det finns osparade mötesuppgifter eller privata anteckningar. Lämna utan att spara?');}
function meetingCandidates(){
 const m=state.meetingCurrent;
 return state.caseItems.filter(c=>c.scope==='team'||(m?.scope!=='team'&&c.is_owner));
}
function meetingPrintPage(m){
 return '<article id="meeting-print" class="meeting-print"><header><small>POLITIKVERKSTAN · INTERNT MÖTESUNDERLAG</small><h1>'+h(m.title)+'</h1><p>'+h(m.committee)+' · '+h(m.meeting_date)+(m.start_time?' kl. '+h(m.start_time):'')+(m.location?' · '+h(m.location):'')+'</p><p>Ej officiellt protokoll. Kontrollera beslut och källor.</p></header>'+
 state.meetingAgenda.map((a,i)=>'<section><h2>'+(i+1)+'. '+h(a.title)+'</h2>'+
 (a.case_title?'<p><strong>Kopplat ärende:</strong> '+h(a.case_title)+'</p>':'')+
 (a.preparation?'<h3>Förberedelser</h3><p>'+h(a.preparation)+'</p>':'')+
 (a.outcome?'<h3>Antecknat utfall</h3><p>'+h(a.outcome)+'</p>':'')+
 (a.follow_up?'<h3>Uppföljning</h3><p>'+h(a.follow_up)+'</p>':'')+
 '</section>').join('')+
 '<footer>Personliga mötesanteckningar ingår inte i denna utskrift. Endast internt arbetsmaterial.</footer></article>';
}
function meetingItemFields(item){
 return `
 <label class="field"><span>Dagordningspunkt</span><input name="title" required maxlength="160" value="${h(item.title||'')}" placeholder="Rubrik på dagordningspunkt"></label>
 <label class="field"><span>Kopplat ärende (valfritt)</span><select name="case_id"><option value="">Ingen koppling</option>
  ${meetingCandidates().map(c=>`<option value="${h(c.id)}" ${c.id===item.case_id?'selected':''}>${h(c.title)} · ${c.scope==='team'?'Gemensamt':'Privat'}</option>`).join('')}
 </select></label>
 <label class="field"><span>Underlag och förberedelser</span><textarea name="preparation" maxlength="4500" rows="3">${h(item.preparation||'')}</textarea></label>
 <label class="field"><span>Antecknat utfall (efter mötet)</span><textarea name="outcome" maxlength="3500" rows="2">${h(item.outcome||'')}</textarea></label>
 <label class="field"><span>Att göra och uppföljning</span><textarea name="follow_up" maxlength="3500" rows="2">${h(item.follow_up||'')}</textarea></label>
 `;
}


// Official MeetingPlus meetings are read-only and live outside work_meetings.
async function loadOfficialCalendar(){
 try{
  const data=await api('/api/private/official-meetings');
  state.officialCalendarMeetings=data.meetings||[];
  state.officialCalendarSources=data.sources||[];
  state.officialCalendarCommittees=data.committees||[];
  state.officialCalendarAdmin=!!data.can_sync;
  state.officialCalendarError='';
 }catch(e){
  state.officialCalendarError='Kommunens sammanträdeskalender kunde inte läsas. Dina egna sammanträden fungerar fortfarande.';
 }
}
function officialCalendarMonth(){
 if(state.officialCalendarMonth)return state.officialCalendarMonth;
 const d=new Date(),sv=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Stockholm',year:'numeric',month:'2-digit'}).format(d);
 return sv.slice(0,7);
}
function changeOfficialMonth(offset){
 const [year,month]=officialCalendarMonth().split('-').map(Number);
 const d=new Date(Date.UTC(year,month-1+offset,1));
 state.officialCalendarMonth=d.toISOString().slice(0,7);
 render();
}
function officialCalendarView(){
 const meetings=state.officialCalendarMeetings||[];
 const sources=state.officialCalendarSources||[];
 const month=officialCalendarMonth();
 const [year,mon]=month.split('-').map(Number);
 const first=new Date(Date.UTC(year,mon-1,1));
 const count=new Date(Date.UTC(year,mon,0)).getUTCDate();
 const offset=(first.getUTCDay()+6)%7;
 const cells=Array.from({length:Math.ceil((offset+count)/7)*7},(_,i)=>{
  const day=i-offset+1;
  if(day<1||day>count)return '<div class="official-day outside" aria-hidden="true"></div>';
  const date=month+'-'+String(day).padStart(2,'0');
  const events=meetings.filter(m=>m.meeting_date===date);
  return `<div class="official-day"><span class="official-day-number">${day}</span>
    ${events.map(m=>`<a class="official-event" href="${h(m.source_url)}" target="_blank" rel="noopener noreferrer" title="${h(m.committee+' '+(m.start_time||'')+' '+(m.location||''))}"><b>${h({kf:'KF',bun:'BUN',sn:'SN',ks:'KS'}[m.committee_key]||m.committee)}</b> ${h(m.start_time||'')}${m.end_time?'–'+h(m.end_time):''}</a>`).join('')}</div>`;
 });
 const synced=sources.filter(s=>s.last_success_at).sort((a,b)=>b.last_success_at.localeCompare(a.last_success_at));
 const last=synced[0]?.last_success_at||'';
 const failures=sources.filter(s=>s.last_error);
 const sourceNames=Object.fromEntries((state.officialCalendarCommittees||[]).map(c=>[c.key,c.name]));
 const sourceDetails=(state.officialCalendarCommittees||[]).map(c=>{
  const item=sources.find(s=>s.committee_key===c.key);
  const result=item?.last_error?'Kunde inte uppdateras: '+item.last_error:
   item?.last_success_at?'Senast inlästa möten: '+item.last_count:'Ännu inte hämtad';
  return `<li><a href="${h(c.url)}" target="_blank" rel="noopener noreferrer">${h(c.name)} ↗</a>
   <span class="${item?.last_error?'official-warning':''}">${h(result)}</span></li>`;
 }).join('');
 return `<section class="card official-calendar" aria-labelledby="official-calendar-title">
  <div class="official-calendar-header"><div><span class="eyebrow">OFFENTLIG SAMMANTRÄDESKALENDER</span><h2 id="official-calendar-title">Lekebergs kommun</h2>
   <p>Automatiskt hämtade mötestider från MeetingPlus. Öppna ett möte för officiell information. Dina privata sammanträden nedan påverkas inte.</p></div>
   <div class="official-calendar-buttons"><button class="btn btn-sm" type="button" id="official-calendar-refresh">Uppdatera vy</button>
   ${state.officialCalendarAdmin?'<button class="btn btn-sm" type="button" id="official-calendar-sync">Hämta från kommunen</button>':''}</div></div>
  ${state.officialCalendarError?`<p class="db-alert" role="status">${h(state.officialCalendarError)}</p>`:''}
  <div class="official-calendar-status"><span>${last?'Senast lyckade hämtning: '+h(last.replace('T',' ').slice(0,16))+' (UTC)':'Ännu ingen bekräftad hämtning'}</span>
   ${failures.length?`<span class="official-warning">Misslyckade källor: ${h(failures.map(x=>sourceNames[x.committee_key]||x.committee_key).join(', '))}. Tidigare uppgifter visas där de finns.</span>`:''}</div>
  <details class="official-source-diagnostics" ${failures.length?'open':''}><summary>Visa hämtstatus per nämnd</summary>
   <ul>${sourceDetails}</ul></details>
  <div class="official-month"><button class="btn btn-sm" type="button" data-official-month="-1" aria-label="Föregående månad">←</button>
  <h3>${h(new Intl.DateTimeFormat('sv-SE',{month:'long',year:'numeric',timeZone:'UTC'}).format(first))}</h3>
  <button class="btn btn-sm" type="button" data-official-month="1" aria-label="Nästa månad">→</button></div>
  <div class="official-calendar-grid" role="group" aria-label="Offentliga möten">
   ${['Mån','Tis','Ons','Tor','Fre','Lör','Sön'].map(x=>`<div class="official-weekday">${x}</div>`).join('')}
   ${cells.join('')}
  </div>
  <div class="official-calendar-footer">
   ${(state.officialCalendarCommittees||[]).map(c=>`<a href="${h(c.url)}" target="_blank" rel="noopener noreferrer">${h(c.name)} ↗</a>`).join('')}
  </div>
  ${!meetings.length?'<p class="db-empty">Inga inlästa sammanträden. En automatisk hämtning sker varje dygn. Administratören kan starta den direkt.</p>':''}
  <p class="case-hint">Uppgifterna kommer från extern publicering och kan ändras. Kalendern är inte en kallelse eller ett protokoll.</p>
 </section>`;
}
function attachOfficialCalendarActions(){
 document.querySelectorAll('[data-official-month]').forEach(b=>b.addEventListener('click',()=>changeOfficialMonth(Number(b.dataset.officialMonth))));
 $('official-calendar-refresh')?.addEventListener('click',async()=>{
  await loadOfficialCalendar();render();
 });
 $('official-calendar-sync')?.addEventListener('click',async e=>{
  const b=e.currentTarget;b.disabled=true;
  try{const result=await api('/api/private/official-meetings/sync','POST',{});
   await loadOfficialCalendar();render();
   const failed=(result.status||[]).filter(x=>!x.ok);
   const ok=(result.status||[]).filter(x=>x.ok);
   const info=failed.length?'Misslyckade källor: '+failed.map(x=>x.committee+(x.error?' ('+x.error+')':'')).join(', '):
    ok.length?'Alla fyra sammanträdeskällor är uppdaterade.':'Ingen sammanträdeskälla kunde uppdateras.';
   toast(info,failed.length>0);
  }catch(err){b.disabled=false;toast('Synkroniseringen kunde inte startas: '+err.message,true);}
 });
}
