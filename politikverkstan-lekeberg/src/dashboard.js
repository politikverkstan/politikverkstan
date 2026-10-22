/* 0.9.2 — personal action dashboard. All data comes from authenticated, owner-scoped APIs. */
const dashboardToday=()=>{
 const d=new Date();
 return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
};
const dashboardLabels={high:'Hög',normal:'Normal',low:'Låg'};
const taskBlank=()=>({title:'',due_date:'',priority:'normal',case_id:'',meeting_id:'',done:false});
async function loadDashboard(){
 const names=['cases','meetings','tasks','followups'];
 const results=await Promise.allSettled(names.map(x=>api(x==='followups'?'/api/private/workflow/dashboard':'/api/private/'+x)));
 const dest={cases:'dashboardCases',meetings:'dashboardMeetings',tasks:'dashboardTasks',followups:'dashboardFollowups'};
 const errors=[];
 for(let i=0;i<names.length;i++){
  const name=names[i],result=results[i];
  if(result.status==='fulfilled'){
   state[dest[name]]=result.value[name]||[];
   if(name==='followups')state.dashboardFollowupsTotal=Number(result.value.total_open||0);
  }else{
   state[dest[name]]=[];
   if(name==='followups')state.dashboardFollowupsTotal=null;
   errors.push({name,message:result.reason?.message||'Okänt fel'});
  }
 }
 state.dashboardErrors=errors;
 state.dashboardLoaded=true;
}
function dashboardPage(){
 const now=dashboardToday();
 const meetings=[...(state.dashboardMeetings||[])].filter(m=>m.meeting_date>=now&&m.status!=='closed')
  .sort((a,b)=>a.meeting_date.localeCompare(b.meeting_date)||String(a.start_time).localeCompare(String(b.start_time)));
 const cases=(state.dashboardCases||[]).filter(c=>c.is_owner||c.assignee_email===state.user?.email);
 const activeCases=cases.filter(c=>!['avslutat','beslutat'].includes(c.status))
  .sort((a,b)=>((a.status==='uppfoljning'?0:1)-(b.status==='uppfoljning'?0:1))||(a.meeting_date||'9999').localeCompare(b.meeting_date||'9999'));
 const tasks=(state.dashboardTasks||[]),open=tasks.filter(t=>!t.done);
 const pending=[...open].sort((a,b)=>(dashboardPriorityValue(a.priority)-dashboardPriorityValue(b.priority))||
  (a.due_date||'9999').localeCompare(b.due_date||'9999'));
 const overdue=open.filter(t=>t.due_date&&t.due_date<now);
 const followups=state.dashboardFollowups||[];
 const followupsError=state.dashboardErrors?.some(e=>e.name==='followups');
 const tasksError=state.dashboardErrors?.some(e=>e.name==='tasks');
 const followupsTotal=state.dashboardFollowupsTotal??0;
 const drafts=(state.motions||[]).filter(m=>['ide','utkast','granskning'].includes(m.status));
 const errors=state.dashboardErrors||[];
 const stats=[
  {count:meetings.length,label:'Kommande sammanträden',note:'Möten du har åtkomst till',tab:'meetings'},
  {count:activeCases.length,label:'Ärenden att hantera',note:'Dina och dina tilldelade',tab:'cases'},
  {count:followupsError||tasksError?'–':open.length+followupsTotal,label:'Att följa upp',
   note:followupsError||tasksError?'Uppföljningarna är inte fullständiga':open.length+' egna uppgifter · '+followupsTotal+' '+(followupsTotal===1?'ärendeuppföljning':'ärendeuppföljningar'),
   jump:'followups'},
  {count:drafts.length,label:'Motionsutkast',note:'Mina pågående motioner',tab:'motions'}
 ];
 const edit=state.dashboardTaskEdit||taskBlank();
 return `
 <section class="db-root" aria-label="Min arbetsöversikt">
  <div class="db-head"><div><span class="eyebrow">MITT POLITISKA ARBETE</span><h2>Min arbetsöversikt</h2><p>Kommande sammanträden, tilldelade ärenden och mina egna uppgifter. Innehållet är bara synligt för behöriga användare.</p></div>
   <button type="button" class="btn btn-sm" id="db-refresh" aria-label="Uppdatera arbetsöversikten">Uppdatera</button></div>
  ${errors.length?`<div class="db-alert" role="status">Vissa uppgifter kunde inte hämtas: ${errors.map(x=>x.name==='tasks'?'Mina uppgifter':x.name==='cases'?'Ärenden':x.name==='followups'?'Ärendeuppföljningar':'Sammanträden').join(', ')}. Värdena nedan kan vara ofullständiga.</div>`:''}
  <div class="db-kpis">${stats.map(x=>`<button type="button" class="db-kpi" ${x.jump?'data-db-followups-jump="1"':'data-tab="'+x.tab+'"'}><strong>${h(x.count)}</strong><span>${h(x.label)}</span><small>${h(x.note)}</small></button>`).join('')}</div>
  <div class="db-columns">
   <section class="card db-panel" aria-labelledby="db-meetings-heading">
    <div class="db-panel-head"><h3 id="db-meetings-heading">Kommande sammanträden</h3><button type="button" class="aw-viewall" data-tab="meetings">Alla möten →</button></div>
    ${meetings.length?meetings.slice(0,4).map(m=>`<button type="button" class="db-link-row" data-dashboard-meeting="${h(m.id)}"><span class="db-date">${h(m.meeting_date)}${m.start_time?' · '+h(m.start_time):''}</span><strong>${h(m.title)}</strong><small>${h(m.committee)} · ${m.scope==='team'?'Gemensamt':'Privat'} · ${Number(m.agenda_count)||0} punkter</small></button>`).join(''):'<p class="db-empty">Inga kommande sammanträden finns registrerade.</p>'}
   </section>
   <section class="card db-panel" aria-labelledby="db-cases-heading">
    <div class="db-panel-head"><h3 id="db-cases-heading">Mina ansvariga ärenden</h3><button type="button" class="aw-viewall" data-tab="cases">Alla ärenden →</button></div>
    ${activeCases.length?activeCases.slice(0,4).map(c=>`<button type="button" class="db-link-row" data-dashboard-case="${h(c.id)}">
     <span class="db-date">${h(c.committee)}${c.meeting_date?' · '+h(c.meeting_date):''}</span><strong>${h(c.title)}</strong>
     <small>${h(caseStatuses[c.status]||c.status)} · ${c.assignee_email===state.user?.email&&!c.is_owner?'Tilldelat mig':'Mitt ärende'} · ${c.scope==='team'?'Gemensamt':'Privat'}</small></button>`).join(''):'<p class="db-empty">Inga aktiva ärenden är tilldelade dig eller ägs av dig.</p>'}
   </section>
  </div>
  <section class="card db-panel db-followups" id="db-followups" aria-labelledby="db-followups-heading">
   <div class="db-panel-head"><div><h3 id="db-followups-heading">Öppna ärendeuppföljningar</h3>
    <p>Uppföljningar i dina ärenden eller som tilldelats dig i ett gemensamt ärende. Personliga uppgifter visas separat nedan.</p></div>
    <span class="chip">${followupsError?'Ej tillgängligt':followupsTotal+' öppna'}</span></div>
   ${followupsError?'<p class="db-empty">Ärendeuppföljningarna kunde inte hämtas. Försök med Uppdatera.</p>':
     followups.length?followups.slice(0,6).map(f=>`<button type="button" class="db-link-row" data-dashboard-case="${h(f.case_id)}">
      <span class="db-date">${f.due_date?(f.due_date<now?'Försenad · ':'Senast ')+h(f.due_date):'Ingen tidsfrist'}</span>
      <strong>${h(f.title)}</strong>
      <small>Ärende: ${h(f.case_title)}${f.assignee_email?' · Ansvarig: '+h(f.assignee_email):''}</small></button>`).join(''):
     '<p class="db-empty">Inga öppna ärendeuppföljningar som du ansvarar för eller äger.</p>'}
   ${!followupsError&&followupsTotal>6?`<p class="db-muted">Ytterligare ${followupsTotal-6} öppna uppföljningar visas i respektive ärende.</p>`:''}
  </section>
  <section class="card db-panel db-tasks" aria-labelledby="db-tasks-heading">
    <div class="db-panel-head"><div><h3 id="db-tasks-heading">Mina uppgifter</h3><p>Personlig att-göra-lista. Uppgifterna delas inte med andra användare.</p></div><span class="chip">${overdue.length?overdue.length+' försenade':open.length+' öppna'}</span></div>
    ${state.dashboardErrors?.some(e=>e.name==='tasks')?'<p class="db-empty">Uppgifterna kunde inte hämtas just nu.</p>':`
     <div class="db-task-list">
       ${pending.slice(0,8).map(t=>dashboardTaskRow(t,now)).join('')||'<p class="db-empty">Inga öppna uppgifter. Lägg till en nedan.</p>'}
     </div>
     ${open.length>8?`<p class="db-muted">${open.length-8} ytterligare öppna uppgifter visas inte i snabböversikten. Avsluta eller prioritera uppgifter för att få plats.</p>`:''}
     <form id="db-task-form" class="db-task-form">
      <h4>${edit.id?'Redigera min uppgift':'Lägg till en uppgift'}</h4>
      <label class="field"><span>Uppgift</span><input name="title" required maxlength="160" value="${h(edit.title||'')}" placeholder="Vad behöver göras?"></label>
      <div class="db-task-fields">
       <label class="field"><span>Klart senast</span><input type="date" name="due_date" value="${h(edit.due_date||'')}"></label>
       <label class="field"><span>Prioritet</span><select name="priority">${Object.entries(dashboardLabels).map(([k,v])=>`<option value="${k}" ${edit.priority===k?'selected':''}>${v}</option>`).join('')}</select></label>
       <label class="field"><span>Koppla ärende</span><select name="case_id"><option value="">Ingen koppling</option>${(state.dashboardCases||[]).map(c=>`<option value="${h(c.id)}" ${edit.case_id===c.id?'selected':''}>${h(c.title)}</option>`).join('')}</select></label>
       <label class="field"><span>Koppla sammanträde</span><select name="meeting_id"><option value="">Ingen koppling</option>${(state.dashboardMeetings||[]).map(m=>`<option value="${h(m.id)}" ${edit.meeting_id===m.id?'selected':''}>${h(m.title)} · ${h(m.meeting_date)}</option>`).join('')}</select></label>
      </div>
      <div class="db-form-actions"><button type="submit" class="btn btn-primary">${edit.id?'Spara ändringar':'Lägg till'}</button>${edit.id?'<button type="button" class="btn" id="db-task-cancel">Avbryt</button>':''}</div>
     </form>
     ${tasks.some(t=>t.done)?`<details class="db-completed"><summary>Avslutade uppgifter (${tasks.filter(t=>t.done).length})</summary>${tasks.filter(t=>t.done).slice(0,12).map(t=>dashboardTaskRow(t,now)).join('')}</details>`:''}
    `}
  </section>
 </section>
 `;
}
function dashboardPriorityValue(priority){return priority==='high'?0:priority==='normal'?1:2;}
function dashboardTaskRow(task,today){
 const linkedCase=(state.dashboardCases||[]).find(x=>x.id===task.case_id);
 const linkedMeeting=(state.dashboardMeetings||[]).find(x=>x.id===task.meeting_id);
 const overdue=!task.done&&task.due_date&&task.due_date<today;
 return `<div class="db-task-row ${task.done?'db-done':''}">
  <label class="db-task-check"><input type="checkbox" data-db-task-toggle="${h(task.id)}" ${task.done?'checked':''} aria-label="Markera ${h(task.title)} som ${task.done?'inte klar':'klar'}"><span>${h(task.title)}</span></label>
  <div class="db-task-meta">
   <span class="db-priority db-priority-${h(task.priority)}">${h(dashboardLabels[task.priority]||'Normal')}</span>
   ${task.due_date?`<span class="${overdue?'db-overdue':''}">${overdue?'Försenad · ':''}${h(task.due_date)}</span>`:''}
   ${linkedCase?`<button type="button" class="db-inline-link" data-dashboard-case="${h(linkedCase.id)}">Ärende: ${h(linkedCase.title)}</button>`:''}
   ${linkedMeeting?`<button type="button" class="db-inline-link" data-dashboard-meeting="${h(linkedMeeting.id)}">Möte: ${h(linkedMeeting.title)}</button>`:''}
  </div>
  <div class="db-task-actions"><button type="button" class="btn btn-sm" data-db-task-edit="${h(task.id)}">Redigera</button><button type="button" class="btn btn-sm" data-db-task-delete="${h(task.id)}">Ta bort</button></div>
 </div>`;
}
async function dashboardOpenCase(id){
 await openTab('cases');
 if(state.tab!=='cases')return;
 const found=state.caseItems.find(c=>c.id===id);
 if(!found){toast('Ärendet är inte längre tillgängligt för dig.',true);return;}
 state.caseCurrent={...found,labels:[...(found.labels||[])]};
 try{await loadCaseComments(id);}catch{state.caseComments=[];}
 await loadCaseWorkflow(id);
 recordWorkView();render();
}
async function dashboardOpenMeeting(id){
 await openTab('meetings');
 if(state.tab!=='meetings')return;
 try{await openMeeting(id);recordWorkView();render();}catch(e){toast('Sammanträdet är inte tillgängligt: '+e.message,true);}
}
function attachDashboard(){
 document.querySelectorAll('[data-db-followups-jump]').forEach(b=>b.addEventListener('click',()=>$('db-followups')?.scrollIntoView({block:'start',behavior:'smooth'})));
 $('db-refresh')?.addEventListener('click',async()=>{
  const button=$('db-refresh');button.disabled=true;
  try{await loadDashboard();render();toast('Arbetsöversikten uppdaterades.');}
  catch(e){button.disabled=false;toast(e.message,true);}
 });
 document.querySelectorAll('[data-dashboard-case]').forEach(b=>b.addEventListener('click',()=>dashboardOpenCase(b.dataset.dashboardCase)));
 document.querySelectorAll('[data-dashboard-meeting]').forEach(b=>b.addEventListener('click',()=>dashboardOpenMeeting(b.dataset.dashboardMeeting)));
 document.querySelectorAll('[data-db-task-toggle]').forEach(el=>el.addEventListener('change',async()=>{
  const task=(state.dashboardTasks||[]).find(t=>t.id===el.dataset.dbTaskToggle);
  if(!task)return;
  el.disabled=true;
  try{await api('/api/private/tasks/'+task.id,'PATCH',{revision:task.revision,done:el.checked});await loadDashboard();render();}
  catch(e){el.disabled=false;el.checked=!el.checked;toast(e.message,true);}
 }));
 document.querySelectorAll('[data-db-task-edit]').forEach(b=>b.addEventListener('click',()=>{
  const task=(state.dashboardTasks||[]).find(t=>t.id===b.dataset.dbTaskEdit);
  if(!task)return;
  state.dashboardTaskEdit={...task};render();$('db-task-form')?.scrollIntoView({block:'nearest'});
 }));
 document.querySelectorAll('[data-db-task-delete]').forEach(b=>b.addEventListener('click',async()=>{
  const task=(state.dashboardTasks||[]).find(t=>t.id===b.dataset.dbTaskDelete);
  if(!task||!confirm('Ta bort denna personliga uppgift?'))return;
  try{await api('/api/private/tasks/'+task.id,'DELETE');state.dashboardTaskEdit=null;await loadDashboard();render();toast('Uppgiften togs bort.');}
  catch(e){toast(e.message,true);}
 }));
 $('db-task-cancel')?.addEventListener('click',()=>{state.dashboardTaskEdit=null;render();});
 $('db-task-form')?.addEventListener('submit',async e=>{
  e.preventDefault();const form=e.currentTarget;
  const values=Object.fromEntries(new FormData(form));
  const edit=state.dashboardTaskEdit;
  const request={title:values.title,priority:values.priority,due_date:values.due_date,case_id:values.case_id||null,meeting_id:values.meeting_id||null};
  const btn=form.querySelector('[type=submit]');btn.disabled=true;
  try{
   await api(edit?.id?'/api/private/tasks/'+edit.id:'/api/private/tasks',edit?.id?'PATCH':'POST',edit?.id?{...request,revision:edit.revision}:request);
   state.dashboardTaskEdit=null;await loadDashboard();render();toast('Uppgiften sparades.');
  }catch(error){btn.disabled=false;toast(error.message,true);}
 });
}
