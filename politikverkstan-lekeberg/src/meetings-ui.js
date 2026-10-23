/* 0.9.0 — meeting workshop helpers; injected inside workroom.js IIFE by build.py */
const meetingStatuses={planned:'Planerat',held:'Genomfört',closed:'Avslutat'};
const meetingCommittees=['Kommunfullmäktige','Kommunstyrelsen','Barn- och utbildningsnämnden','Socialnämnden','Bygg- och miljönämnden','Valnämnden','Sydnärkes IT-nämnd','Sydnärkes miljö- och byggnämnd','Annat'];
const meetingEmpty=()=>({title:'',committee:'Kommunfullmäktige',meeting_date:'',start_time:'',location:'',official_source_url:'',status:'planned',scope:'mine',is_owner:true,revision:1});
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
function officialAgendaDetails(m){
 const agenda=Array.isArray(m.agenda)?m.agenda:[],docs=Array.isArray(m.documents)?m.documents:[];
 const current=state.meetingCurrent;
 const canImport=current?.id&&current.is_owner!==false&&current.official_source_url===m.source_url;
 return `<section class="official-agenda-view" aria-labelledby="official-agenda-title">
  <div class="official-agenda-heading">
   <button class="btn btn-sm" type="button" id="official-agenda-back">← Till kalendern</button>
   <span class="eyebrow">OFFENTLIG DAGORDNING · LEKEBERGS KOMMUN</span>
   <h1 id="official-agenda-title">${h(m.committee)}</h1>
   <p>${h(m.meeting_date)}${m.start_time?' · kl. '+h(m.start_time):''}${m.end_time?'–'+h(m.end_time):''}${m.location?' · '+h(m.location):''}</p>
  </div>
  <div class="official-agenda-layout">
   <section class="card official-agenda-main" aria-labelledby="official-items-heading">
    <h2 id="official-items-heading">Dagordningspunkter <small>(${agenda.length})</small></h2>
    <p class="case-hint">Välj en punkt för att skapa en egen privat förberedelse. Inget hämtas automatiskt till Arbetsytans privata handlingar.</p>
    ${m.agenda_error?'<p class="official-warning" role="status">'+h(m.agenda_error)+' – tidigare identifierade uppgifter kan visas.</p>':''}
    ${agenda.length?'<ol class="official-agenda-list">'+agenda.map((a,i)=>`<li class="official-agenda-entry">
     <div class="official-agenda-entry-heading"><span class="official-agenda-number">${h(a.number)}.</span><strong>${h(a.title)}</strong></div>
     <button class="btn btn-sm" type="button" data-official-point="${h(m.source_url)}" data-official-index="${i}">${canImport?'Lägg till i mitt möte':'Förbered punkten'}</button>
    </li>`).join('')+'</ol>':'<p class="case-hint">Ingen dagordning kunde identifieras säkert. Öppna kommunens originalkallelse för kontroll.</p>'}
   </section>
   <aside class="official-agenda-side">
    <section class="card official-agenda-source">
     <h2>Källa och publicering</h2>
     <p>Uppgifterna kommer från MeetingPlus och kan ändras. Kontrollera alltid originalkallelsen, bilagorna och eventuellt justerat protokoll.</p>
     ${m.agenda_changed_at?'<p class="case-hint">Senast identifierad ändring: '+h(m.agenda_changed_at.slice(0,16).replace('T',' '))+' UTC</p>':''}
     <a class="btn btn-sm" href="${h(m.source_url)}" target="_blank" rel="noopener noreferrer">Öppna mötet i MeetingPlus ↗</a>
    </section>
    <section class="card official-agenda-documents">
     <h2>Offentliga handlingar <small>(${docs.length})</small></h2>
     ${docs.length?'<details><summary>Visa dokumentlänkar</summary><ul class="official-document-list">'+docs.map(d=>'<li><a href="'+h(d.url)+'" target="_blank" rel="noopener noreferrer">'+h(d.title)+' ↗</a></li>').join('')+'</ul></details>':'<p class="case-hint">Inga handlingar har identifierats i publiceringen. Kontrollera MeetingPlus.</p>'}
    </section>
   </aside>
  </div>
 </section>`;
}
function officialCalendarView(){
 const meetings=state.officialCalendarMeetings||[];
 const sources=state.officialCalendarSources||[];
 const month=officialCalendarMonth();
 const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Stockholm',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const [year,mon]=month.split('-').map(Number);
 const first=new Date(Date.UTC(year,mon-1,1));
 const count=new Date(Date.UTC(year,mon,0)).getUTCDate();
 const offset=(first.getUTCDay()+6)%7;
 const cells=Array.from({length:Math.ceil((offset+count)/7)*7},(_,i)=>{
  const day=i-offset+1;
  if(day<1||day>count)return '<div class="official-day outside" aria-hidden="true"></div>';
  const date=month+'-'+String(day).padStart(2,'0');
  const events=meetings.filter(m=>m.meeting_date===date);
  const isToday=date===today;
  return `<div class="official-day${isToday?' is-today':''}"><span class="official-day-number"${isToday?' aria-current="date"':''}>${day}</span>${isToday?'<span class="official-today-label">Idag</span>':''}
    ${events.map(m=>`<div class="official-event-wrap"><a class="official-event" href="${h(m.source_url)}" target="_blank" rel="noopener noreferrer" title="${h(m.committee+' '+(m.start_time||'')+' '+(m.location||''))}"><b>${h({kf:'KF',bun:'BUN',sn:'SN',ks:'KS'}[m.committee_key]||m.committee)}</b> ${h(m.start_time||'')}${m.end_time?'–'+h(m.end_time):''}</a><button type="button" class="official-prepare" data-official-agenda="${h(m.source_url)}" aria-label="Visa dagordning för ${h(m.committee)} ${h(m.meeting_date)}">Dagordning</button><button type="button" class="official-prepare" data-official-prepare="${h(m.source_url)}" aria-label="Förbered ${h(m.committee)} ${h(m.meeting_date)}">Förbered</button></div>`).join('')}</div>`;
 });
 const synced=sources.filter(s=>s.last_success_at).sort((a,b)=>b.last_success_at.localeCompare(a.last_success_at));
 const last=synced[0]?.last_success_at||'';
 const failures=sources.filter(s=>s.last_error);
 // Show stale or never-confirmed sources without suggesting that cached data is current.
 const stale=sources.filter(s=>{
  const seen=Date.parse(s.last_success_at||'');
  return !Number.isFinite(seen)||Date.now()-seen>48*60*60*1000;
 });
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
   <p>Mötestider från MeetingPlus, inlästa automatiskt via GitHub två gånger per dygn. Klicka på mötet för att kontrollera kommunens originaluppgifter. Dina privata sammanträden påverkas inte.</p></div>
   <div class="official-calendar-buttons"><button class="btn btn-sm" type="button" id="official-calendar-refresh">Uppdatera vy</button>
   </div></div>
  ${state.officialCalendarError?`<p class="db-alert" role="status">${h(state.officialCalendarError)}</p>`:''}
  <div class="official-calendar-status"><span>${last?'Senast lyckade hämtning: '+h(last.replace('T',' ').slice(0,16))+' (UTC)':'Ännu ingen bekräftad hämtning'}</span>
   ${failures.length?`<span class="official-warning">Misslyckade källor: ${h(failures.map(x=>sourceNames[x.committee_key]||x.committee_key).join(', '))}. Tidigare uppgifter visas där de finns.</span>`:''}
   ${stale.length?`<span class="official-warning" role="status">Kalenderuppgifter saknar färsk bekräftelse (över 48 timmar): ${h(stale.map(s=>sourceNames[s.committee_key]||s.committee_key).join(', '))}. Kontrollera originalet i MeetingPlus.</span>`:''}</div>
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
  ${!meetings.length?'<p class="db-empty">Ännu inga publicerade sammanträden inlästa. GitHub kontrollerar kommunens sidor automatiskt morgon och kväll.</p>':''}
  <p class="case-hint">Uppgifterna kommer från extern publicering och kan ändras. Kalendern är inte en kallelse eller ett protokoll.</p>
 </section>`;
}
function attachOfficialCalendarActions(){
 $('official-agenda-back')?.addEventListener('click',()=>{
  if((workHistoryEntry()?.depth||0)>0)workGoBack();
  else{state.officialSelectedUrl='';render();}
 });
 document.querySelectorAll('[data-official-agenda]').forEach(b=>b.addEventListener('click',()=>{
  state.officialSelectedUrl=b.dataset.officialAgenda;recordWorkView();render();window.scrollTo(0,0);
 }));
 document.querySelectorAll('[data-official-point]').forEach(b=>b.addEventListener('click',async()=>{
  const m=state.officialCalendarMeetings.find(x=>x.source_url===b.dataset.officialPoint);
  const a=m?.agenda?.[Number(b.dataset.officialIndex)];if(!a)return;
  const preparation='Offentlig källa: '+m.source_url+'\nDagordningspunkt '+a.number+'. Kontrollera bilagor och uppdateringar i MeetingPlus.';
  const current=state.meetingCurrent;
  if(current?.id&&current.is_owner!==false&&current.official_source_url===m.source_url){
   if(!meetingSafeToLeave())return;
   try{
    await api('/api/private/meetings/'+current.id+'/items','POST',{title:a.title,case_id:null,preparation,outcome:'',follow_up:''});
    await openMeeting(current.id);state.officialSelectedUrl='';recordWorkView();render();
    document.getElementById('meeting-form')?.scrollIntoView({block:'start'});
    toast('Den valda offentliga punkten har lagts till i ditt sammanträde.');
   }catch(e){toast(e.message,true);}
   return;
  }
  if(!meetingSafeToLeave())return;
  state.meetingCurrent={...meetingEmpty(),title:m.committee+' – mötesförberedelser',committee:m.committee,
   meeting_date:m.meeting_date,start_time:m.start_time||'',location:m.location||'',official_source_url:m.source_url};
  state.meetingAgenda=[];state.meetingNote='';state.meetingItemEdit=null;state.meetingDirty=false;
  state.meetingNoteDirty=false;state.meetingItemDirty=false;state.officialPendingPoint={title:a.title,preparation};
  state.officialSelectedUrl='';recordWorkView();render();
  document.getElementById('meeting-form')?.scrollIntoView({block:'start'});
  toast('Offentlig punkt vald. Spara ditt privata sammanträde för att lägga till punkten.');
 }));

 document.querySelectorAll('[data-official-prepare]').forEach(button=>button.addEventListener('click',()=>{
  if(!meetingSafeToLeave())return;
  const meeting=state.officialCalendarMeetings.find(m=>m.source_url===button.dataset.officialPrepare);
  if(!meeting)return;
  state.meetingCurrent={
   ...meetingEmpty(),title:meeting.committee+' – mötesförberedelser',
   committee:meeting.committee,meeting_date:meeting.meeting_date,
   start_time:meeting.start_time||'',location:meeting.location||'',
   official_source_url:meeting.source_url
  };
  state.meetingAgenda=[];state.meetingNote='';state.meetingItemEdit=null;state.officialPendingPoint=null;
  state.meetingDirty=false;state.meetingNoteDirty=false;state.meetingItemDirty=false;
  render();
  document.getElementById('meeting-form')?.scrollIntoView({behavior:'smooth',block:'start'});
  toast('Privat mötesutkast förifyllt. Klicka på Spara sammanträdet för att skapa det.');
 }));

 document.querySelectorAll('[data-official-month]').forEach(b=>b.addEventListener('click',()=>changeOfficialMonth(Number(b.dataset.officialMonth))));
 $('official-calendar-refresh')?.addEventListener('click',async()=>{
  await loadOfficialCalendar();render();
 });

}
