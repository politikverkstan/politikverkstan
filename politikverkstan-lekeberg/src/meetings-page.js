
/* The page functions are injected into the protected workroom's IIFE. */
function meetingListCard(x){
 const m=state.meetingCurrent;
 return `<button type="button" class="meeting-list-entry ${m?.id===x.id?'selected':''}" data-meeting-open="${h(x.id)}">
 <strong>${h(x.title)}</strong><small>${h(x.committee)} · ${h(x.meeting_date)}${x.start_time?' kl. '+h(x.start_time):''}</small>
 <span>${x.scope==='team'?'Gemensamt':'Privat'} · ${Number(x.agenda_count)||0} punkter · ${h(meetingStatuses[x.status]||x.status)}</span></button>`;
}
function meetingMetaForm(m){
 const owner=m.is_owner!==false;
 return `<form id="meeting-form" class="card meeting-metadata">
  <div class="case-edit-head"><div><span class="eyebrow">${m.scope==='team'?'GEMENSAMT SAMMANTRÄDE':'PRIVAT SAMMANTRÄDE'}</span><h2>${m.id?'Sammanträdesuppgifter':'Nytt sammanträde'}</h2></div><span class="chip">${m.id?'Revision '+m.revision:'Ej sparat'}</span></div>
  <fieldset ${owner?'':'disabled'}><div class="formgrid">
   <label class="field"><span>Rubrik</span><input name="title" required maxlength="160" value="${h(m.title)}" placeholder="Sammanträde"></label>
   <label class="field"><span>Instans</span><select name="committee">${meetingCommittees.map(x=>`<option ${m.committee===x?'selected':''}>${h(x)}</option>`).join('')}</select></label>
   <label class="field"><span>Datum</span><input type="date" name="meeting_date" required value="${h(m.meeting_date)}"></label>
   <label class="field"><span>Tid (valfritt)</span><input type="time" name="start_time" value="${h(m.start_time||'')}"></label>
   <label class="field"><span>Plats / mötesform</span><input name="location" maxlength="160" value="${h(m.location||'')}"></label>
   <label class="field"><span>Status</span><select name="status">${Object.entries(meetingStatuses).map(([k,v])=>`<option value="${k}" ${m.status===k?'selected':''}>${h(v)}</option>`).join('')}</select></label>
  </div></fieldset>
  ${m.official_source_url?`<p class="case-hint">Officiellt publicerat sammanträde: <a href="${h(m.official_source_url)}" target="_blank" rel="noopener noreferrer">Kontrollera datum och kallelse hos kommunen ↗</a>. Denna länk är en källa, inte ett bekräftat beslut.</p>`:''}
  <div class="meeting-form-actions">
   ${owner?'<button type="submit" class="btn btn-primary">Spara sammanträdet</button>':'<span class="case-hint">Enbart skaparen kan ändra sammanträdet och dagordningen.</span>'}
   ${m.id?'<button type="button" class="btn" id="meeting-print-button">Skriv ut mötesunderlag</button>':''}
   ${m.id&&owner?'<button type="button" class="btn btn-danger" id="meeting-delete">Radera</button>':''}
   <span class="case-save-info" id="meeting-save-info" role="status">${state.meetingDirty?'Osparade ändringar':''}</span>
  </div>
 </form>`;
}
function meetingAgendaRow(item,i,m){
 return `<div class="meeting-agenda-row">
  <span class="meeting-agenda-number">${i+1}</span>
  <div class="meeting-agenda-info"><strong>${h(item.title)}</strong>
   <small>${item.case_title?'Kopplat ärende: '+h(item.case_title):item.case_link_restricted?'Kopplad handling saknar åtkomst':'Fristående punkt'}</small>
   ${item.preparation?`<p><b>Förberedelser:</b> ${h(item.preparation)}</p>`:''}
   ${item.outcome?`<p><b>Utfall:</b> ${h(item.outcome)}</p>`:''}
   ${item.follow_up?`<p><b>Uppföljning:</b> ${h(item.follow_up)}</p>`:''}
  </div>
  <div class="meeting-agenda-actions">
   ${item.case_id?`<button type="button" class="btn btn-sm" data-meeting-case="${h(item.case_id)}">Öppna ärende</button>`:''}
   ${m.is_owner!==false&&m.scope==='mine'&&!item.case_id?`<button type="button" class="btn btn-sm" data-meeting-create-case="${h(item.id)}">Skapa privat ärende</button>`:''}
   ${m.is_owner!==false?`<button type="button" class="btn btn-sm" data-meeting-item-edit="${h(item.id)}">Redigera</button>`:''}
   ${m.is_owner!==false?`<button type="button" class="btn btn-sm" data-meeting-move="${h(item.id)}" data-direction="-1" ${i===0?'disabled':''} aria-label="Flytta upp ${h(item.title)}">↑</button>`:''}
   ${m.is_owner!==false?`<button type="button" class="btn btn-sm" data-meeting-move="${h(item.id)}" data-direction="1" ${i===state.meetingAgenda.length-1?'disabled':''} aria-label="Flytta ned ${h(item.title)}">↓</button>`:''}
  </div>
 </div>`;
}
function meetingDetails(m){
 if(!m)return '<div class="card case-empty"><h2>Välj ett sammanträde</h2><p>Öppna ett sammanträde eller skapa ett nytt. Nya sammanträden är privata från början.</p></div>';
 const isOwner=m.is_owner!==false;
 return meetingMetaForm(m)+(m.id?
 (isOwner?`<section class="card meeting-sharing"><h2>Delning</h2>
  <p>Delat möte innebär att alla godkända användare kan läsa dagordningen. Privata ärenden får inte automatiskt kopplas till delade möten.</p>
  <form id="meeting-sharing-form"><label class="field"><span>Synlighet</span><select name="scope">
   <option value="mine" ${m.scope==='mine'?'selected':''}>Privat (bara jag)</option>
   <option value="team" ${m.scope==='team'?'selected':''}>Gemensamt (godkända användare)</option>
  </select></label><button type="submit" class="btn">Spara delning</button></form>
 </section>`:'')+
 `<section class="card meeting-agenda">
  <div class="meeting-agenda-head"><div><h2>Dagordning</h2><p>Lägg till punkter, koppla ärenden och notera utfall och uppföljning.</p></div>
   ${isOwner?'<button type="button" class="btn btn-primary" id="meeting-add-item">+ Ny punkt</button>':''}
  </div>
  ${state.meetingAgenda.length?state.meetingAgenda.map((a,i)=>meetingAgendaRow(a,i,m)).join(''):'<p class="case-hint">Dagordningen är tom.</p>'}
  ${state.meetingItemEdit&&isOwner?`<form id="meeting-item-form" class="meeting-item-form">
   <h3>${state.meetingItemEdit.id?'Redigera dagordningspunkt':'Ny dagordningspunkt'}</h3>
   ${meetingItemFields(state.meetingItemEdit)}
   <div class="meeting-form-actions"><button class="btn btn-primary" type="submit">Spara punkten</button>
    <button class="btn" type="button" id="meeting-item-cancel">Avbryt</button>
    ${state.meetingItemEdit.id?'<button class="btn btn-danger" type="button" id="meeting-item-delete">Ta bort punkt</button>':''}
   </div>
  </form>`:''}
 </section>
 <section class="card meeting-personal-notes"><h2>Mina personliga mötesanteckningar</h2>
  <p>Anteckningarna är bara dina. De delas inte med andra och ingår inte i utskriften.</p>
  <form id="meeting-note-form"><label class="field"><span>Privat mötesanteckning</span><textarea name="personal_note" maxlength="4500" rows="5">${h(state.meetingNote)}</textarea></label>
   <button type="submit" class="btn">Spara mina anteckningar</button><span id="meeting-note-status" class="case-save-info" role="status">${state.meetingNoteDirty?'Osparade anteckningar':''}</span>
  </form>
 </section>`+meetingPrintPage(m)
 :'');
}
function meetingsPage(){
 const officialSelected=(state.officialCalendarMeetings||[]).find(m=>m.source_url===state.officialSelectedUrl);
 if(officialSelected)return officialAgendaDetails(officialSelected);
 const filtered=state.meetingList.filter(x=>(state.meetingVisibility==='all'||(state.meetingVisibility==='mine'?x.scope==='mine'&&x.is_owner:x.scope==='team'))&&(!state.meetingSearch||[x.title,x.committee,x.meeting_date,x.location].join(' ').toLocaleLowerCase('sv-SE').includes(state.meetingSearch.toLocaleLowerCase('sv-SE'))));
 return `
 ${officialCalendarView()}
 ${header('SAMMANTRÄDESVERKSTAD','Sammanträden','Skapa dagordningar, koppla ärenden och förbered kommunfullmäktige och nämndmöten. Privata mötesanteckningar hålls alltid separata.','<button type="button" class="btn btn-primary" id="meeting-new">'+icons.plus+' Nytt sammanträde</button>')}
 <section class="meeting-layout">
  <div class="card meeting-list-pane">
   <div class="case-scope-tabs" role="group" aria-label="Filtrera sammanträden">
    ${[['all','Alla'],['mine','Mina privata'],['team','Gemensamma']].map(([key,label])=>`<button type="button" class="btn btn-sm ${state.meetingVisibility===key?'btn-primary':''}" data-meeting-visibility="${key}">${label}</button>`).join('')}
   </div>
   <label class="field"><span>Sök sammanträden</span><input id="meeting-search" value="${h(state.meetingSearch)}" placeholder="Nämnd, rubrik eller datum" autocomplete="off"></label>
   <div class="meeting-list">${filtered.length?filtered.map(meetingListCard).join(''):'<p class="empty">Inga sammanträden motsvarar urvalet.</p>'}</div>
  </div>
  <div class="meeting-detail-pane">${meetingDetails(state.meetingCurrent)}</div>
 </section>
 `;
}
