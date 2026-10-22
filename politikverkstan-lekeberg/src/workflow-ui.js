/* Version 1.0 - UI helpers injected inside the protected workroom IIFE. */
const workflowState={caseId:null,events:[],nextOffset:null,links:[],followups:[],position:null,
 loading:false,errors:{},followupEdit:null,search:'',searchResults:[],searchLoading:false};
const wfRoot='/api/private/workflow/';
const wfCase=id=>wfRoot+'cases/'+encodeURIComponent(id)+'/';
function wfDate(date){return h(String(date||'').slice(0,16).replace('T',' '));}
function wfLabel(key){
 const names={title:'Rubrik',committee:'Instans',status:'Status',meeting_date:'Mötesdatum',
  labels:'Etiketter',scope:'Delning',assignee_email:'Ansvarig',body:'Text',
  source:'Underlag',anchored_on:'Förankringsdatum',due_date:'Tidsfrist',
  follow_up:'Uppföljning',recommendation:'Rekommendation'};
 return names[key]||caseFields.find(x=>x[0]===key)?.[1]||key;
}
function wfText(v){return Array.isArray(v)?v.join(', '):v&&typeof v==='object'?JSON.stringify(v):String(v??'');}
function wfDiff(change){
 const prev=change.before||{},next=change.after||{};
 const keys=[...new Set([...Object.keys(prev),...Object.keys(next)])];
 const result=[];
 for(const key of keys){
  if(key==='content'){
   const old=prev.content||{},updated=next.content||{};
   for(const sub of new Set([...Object.keys(old),...Object.keys(updated)])){
    if(JSON.stringify(old[sub])!==JSON.stringify(updated[sub]))
     result.push([wfLabel(sub),wfText(old[sub]),wfText(updated[sub])]);
   }
  }else if(JSON.stringify(prev[key])!==JSON.stringify(next[key])){
   result.push([wfLabel(key),wfText(prev[key]),wfText(next[key])]);
  }
 }
 return result;
}
function wfEvent(event){
 const change=event.changes||{},kind={created:'Skapades',edited:'Ändrat ärende',
  sharing:'Delning/ansvar',followup:'Uppföljning',position:'Ställningstagande'}[event.kind]||event.kind;
 const changes=wfDiff(change);
 return '<div class="wf-history-event"><div class="wf-history-title"><strong>'+h(kind)+'</strong><small>'+
  wfDate(event.created_at)+' · '+h(event.actor_email)+' · version '+h(event.case_revision)+'</small></div>'+
  (changes.length?'<details><summary>Visa ändringar ('+changes.length+')</summary><div class="wf-diff">'+
   changes.map(x=>'<div><strong>'+h(x[0])+'</strong><small>Före: '+h(x[1]||'–')+'</small><small>Efter: '+h(x[2]||'–')+'</small></div>').join('')+'</div></details>':
   '<p class="case-hint">'+h(change.action||change.title||'Händelsen registrerades')+'</p>')+'</div>';
}
async function loadCaseWorkflow(id){
 if(!id){
  workflowState.caseId=null;workflowState.events=[];workflowState.nextOffset=null;
  workflowState.links=[];workflowState.followups=[];workflowState.position=null;workflowState.errors={};return;
 }
 workflowState.loading=true;
 try{
  const root=wfCase(id),keys=['history','meetings','followups','position'];
  const settled=await Promise.allSettled(keys.map(key=>api(root+key)));
  if(state.caseCurrent?.id!==id)return;
  workflowState.caseId=id;workflowState.errors={};
  const read=(key,index)=>{
   if(settled[index].status==='fulfilled')return settled[index].value;
   workflowState.errors[key]=settled[index].reason?.message||'Förfrågan misslyckades';
   return null;
  };
  const history=read('history',0),meetings=read('meetings',1);
  const followups=read('followups',2),position=read('position',3);
  workflowState.events=history?.events||[];workflowState.nextOffset=history?.next_offset??null;
  workflowState.links=meetings?.meetings||[];
  workflowState.followups=followups?.followups||[];workflowState.position=position?.position||null;
 }catch(error){
  if(state.caseCurrent?.id===id){
   workflowState.caseId=id;
   workflowState.errors={history:error.message,meetings:error.message,followups:error.message,position:error.message};
  }
 }finally{workflowState.loading=false;}
}
function wfSectionError(key){
 const msg=workflowState.errors[key];
 return msg?'<div class="wf-section-error" role="alert"><p>'+h(msg)+'</p><button type="button" class="btn btn-sm" data-wf-retry="'+h(key)+'">Försök igen</button></div>':'';
}
function workflowCaseSections(c){
 if(workflowState.caseId!==c.id)return '<section class="card wf-panel"><p class="case-hint">Laddar spårbarhet och uppföljning…</p></section>';
 const editable=c.can_edit,own=c.is_owner,p=workflowState.position;
 const edit=workflowState.followupEdit;
 return '<section class="card wf-panel"><div class="split-line"><h2>Ärendets sammanträden</h2><span class="chip">'+(workflowState.errors.meetings?'Ej tillgängligt':workflowState.links.length+' punkter')+'</span></div>'+
  '<p class="case-hint">Sammanträden där ärendet finns på dagordningen.</p>'+
  (workflowState.errors.meetings?wfSectionError('meetings'):workflowState.links.length?workflowState.links.map(m=>'<div class="wf-row"><div><strong>'+h(m.title)+'</strong><small>'+
   h(m.committee)+' · '+h(m.meeting_date)+' · '+h(m.agenda_title)+'</small>'+
   (m.outcome?'<p><strong>Antecknat utfall:</strong> '+h(m.outcome)+'</p>':'')+
   (m.follow_up?'<p><strong>Antecknad uppföljning:</strong> '+h(m.follow_up)+'</p>':'')+
   '</div><button class="btn btn-sm" type="button" data-wf-meeting="'+h(m.id)+'">Öppna</button></div>').join(''):
   '<p class="case-hint">Inga åtkomliga sammanträden är kopplade till ärendet.</p>')+'</section>'+
  '<section class="card wf-panel"><div class="split-line"><h2>Uppföljningar</h2>'+
   (editable&&!workflowState.errors.followups?'<button type="button" class="btn btn-sm" id="wf-new-followup">+ Ny uppföljning</button>':'')+'</div>'+
   '<p class="case-hint">Registrera vad som ska göras, vem som ansvarar och när det ska vara klart.</p>'+
   (workflowState.errors.followups?wfSectionError('followups'):workflowState.followups.length?workflowState.followups.map(f=>'<div class="wf-row"><div><strong>'+h(f.title)+'</strong><small>'+
    (f.status==='done'?'Avslutad':'Öppen')+(f.due_date?' · Senast '+h(f.due_date):'')+
    (f.assignee_email?' · '+h(f.assignee_email):'')+'</small>'+
    (f.details?'<p>'+h(f.details)+'</p>':'')+
    (f.meeting_title?'<small>Sammanträde: '+h(f.meeting_title)+'</small>':'')+'</div>'+
    (editable?'<button type="button" class="btn btn-sm" data-wf-followup="'+h(f.id)+'">Ändra</button>':'')+'</div>').join(''):
    '<p class="case-hint">Inga uppföljningar registrerade.</p>')+
    (editable&&!workflowState.errors.followups&&edit!==null?'<form id="wf-followup-form" class="wf-form"><h3>'+
     (edit.id?'Ändra uppföljning':'Ny uppföljning')+'</h3>'+
     '<label class="field"><span>Uppgift</span><input name="title" required maxlength="160" value="'+h(edit.title||'')+'"></label>'+
     '<label class="field"><span>Beskrivning</span><textarea name="details" maxlength="3000" rows="2">'+h(edit.details||'')+'</textarea></label>'+
     '<div class="formgrid"><label class="field"><span>Tidsfrist</span><input name="due_date" type="date" value="'+h(edit.due_date||'')+'"></label>'+
     '<label class="field"><span>Status</span><select name="status"><option value="open"'+(edit.status!=='done'?' selected':'')+'>Öppen</option><option value="done"'+(edit.status==='done'?' selected':'')+'>Avslutad</option></select></label></div>'+
     '<label class="field"><span>Ansvarig</span><select name="assignee_email"><option value="">Ingen utsedd</option>'+
     (state.caseDirectory||[]).map(u=>'<option value="'+h(u.email)+'"'+(u.email===edit.assignee_email?' selected':'')+'>'+h(u.display_name||u.email)+'</option>').join('')+
     '</select></label>'+
     '<label class="field"><span>Sammanträde (valfritt)</span><select name="meeting_id"><option value="">Ingen koppling</option>'+
     workflowState.links.filter((m,i,arr)=>arr.findIndex(x=>x.id===m.id)===i).map(m=>'<option value="'+h(m.id)+'"'+(edit.meeting_id===m.id?' selected':'')+'>'+h(m.title)+'</option>').join('')+
     '</select></label><div class="toolbar"><button class="btn btn-primary" type="submit">Spara uppföljning</button>'+
     '<button type="button" class="btn" id="wf-cancel-followup">Avbryt</button></div></form>':'')+
    '</section>'+
   '<section class="card wf-panel"><h2>Ställningstagande och förankring</h2>'+
    '<p class="case-hint">Markera som förankrat först när ställningstagandet har bekräftats. Ange datum och källa.</p>'+
    (workflowState.errors.position?wfSectionError('position'):own?'<form id="wf-position-form" class="wf-form">'+
     '<label class="field"><span>Ställningstagande</span><textarea name="body" maxlength="3500" rows="3" required>'+h(p?.body||'')+'</textarea></label>'+
     '<label class="field"><span>Status</span><select name="status">'+
     [['discussion','Arbetsdiskussion'],['personal','Personligt'],['proposed','Föreslaget gemensamt'],['endorsed','Förankrat gemensamt']].map(x=>
     '<option value="'+x[0]+'"'+((p?.status||'discussion')===x[0]?' selected':'')+'>'+x[1]+'</option>').join('')+'</select></label>'+
     '<label class="field"><span>Källa/beslutsform</span><input name="source" maxlength="1000" value="'+h(p?.source||'')+'" placeholder="Exempelvis daterat mötesbeslut"></label>'+
     '<label class="field"><span>Förankringsdatum (endast förankrat)</span><input name="anchored_on" type="date" value="'+h(p?.anchored_on||'')+'"></label>'+
     '<button class="btn btn-primary" type="submit">Spara ställningstagande</button></form>':
     p?'<div class="wf-row"><div><strong>'+h(({discussion:'Arbetsdiskussion',personal:'Personligt',proposed:'Föreslaget',endorsed:'Förankrat'}[p.status]||p.status))+
     '</strong><p>'+h(p.body)+'</p>'+(p.source?'<small>Källa: '+h(p.source)+'</small>':'')+
     (p.anchored_on?'<small> · '+h(p.anchored_on)+'</small>':'')+'</div></div>':
     '<p class="case-hint">Inget delat ställningstagande registrerat.</p>')+'</section>'+
   '<section class="card wf-panel"><div class="split-line"><h2>Ändringshistorik</h2><span class="chip">'+(workflowState.errors.history?'Ej tillgängligt':workflowState.events.length+' inlästa')+'</span></div>'+
    (workflowState.errors.history?wfSectionError('history'):workflowState.events.length?workflowState.events.map(wfEvent).join(''):'<p class="case-hint">Ännu inga historikhändelser.</p>')+
    (workflowState.nextOffset!==null&&!workflowState.errors.history?'<button type="button" class="btn" id="wf-more-history">Visa äldre händelser</button>':'')+
   '</section>';
}
function workflowSearchPage(){
 return header('GEMENSAM SÖKNING','Sök i arbetsytan','Sök bland de ärenden, sammanträden, motioner och dokument som ditt konto har åtkomst till.')+
  '<section class="card wf-search"><form id="wf-search-form" class="formgrid"><label class="field"><span>Sökord (minst två tecken)</span>'+
   '<input name="q" type="search" maxlength="80" value="'+h(workflowState.search)+'" placeholder="Rubrik, nämnd, dokumentnamn…" autocomplete="off"></label>'+
   '<button type="submit" class="btn btn-primary">Sök</button></form>'+
   (workflowState.searchLoading?'<p>Söker…</p>':'')+
   '<div class="wf-results">'+(workflowState.searchResults.length?workflowState.searchResults.map(r=>{
    const text='<span class="chip">'+h(({case:'Ärende',meeting:'Sammanträde',motion:'Motion',file:'Dokument'}[r.type]||r.type))+'</span>'+
      '<strong>'+h(r.title)+'</strong><small>'+h(r.context||'')+' · '+wfDate(r.updated_at)+'</small>';
    return r.type==='file'?'<a class="wf-search-result" href="/api/private/files/'+encodeURIComponent(r.id)+'/download">'+text+'</a>':
      '<button class="wf-search-result" type="button" data-wf-result="'+h(r.type)+'" data-wf-id="'+h(r.id)+'">'+text+'</button>';
   }).join(''):'<p class="case-hint">Ange en sökfras och välj Sök.</p>')+'</div></section>';
}
function attachWorkflowActions(){
 const id=state.caseCurrent?.id;
 document.querySelectorAll('[data-wf-retry]').forEach(b=>b.addEventListener('click',async()=>{await loadCaseWorkflow(id);render();}));
 $('wf-new-followup')?.addEventListener('click',()=>{workflowState.followupEdit={status:'open',details:'',due_date:'',assignee_email:'',meeting_id:''};render();});
 document.querySelectorAll('[data-wf-followup]').forEach(b=>b.addEventListener('click',()=>{
  workflowState.followupEdit={...workflowState.followups.find(x=>x.id===b.dataset.wfFollowup)};
  render();
 }));
 $('wf-cancel-followup')?.addEventListener('click',()=>{workflowState.followupEdit=null;render();});
 $('wf-followup-form')?.addEventListener('submit',async e=>{
  e.preventDefault();if(!id||state.caseDirty||state.caseNoteDirty){toast('Spara först ärendets andra ändringar.',true);return;}
  const f=e.currentTarget,values=Object.fromEntries(new FormData(f)),edit=workflowState.followupEdit;
  try{
   await api(edit?.id?wfRoot+'followups/'+edit.id:wfCase(id)+'followups',edit?.id?'PUT':'POST',
    {...values,meeting_id:values.meeting_id||null,assignee_email:values.assignee_email||null,...(edit?.id?{revision:edit.revision}:{})});
   workflowState.followupEdit=null;await loadCaseWorkflow(id);render();toast('Uppföljningen sparades.');
  }catch(error){toast(error.message,true);}
 });
 $('wf-position-form')?.addEventListener('submit',async e=>{
  e.preventDefault();if(!id||state.caseDirty||state.caseNoteDirty){toast('Spara först ärendets andra ändringar.',true);return;}
  const f=e.currentTarget,values=Object.fromEntries(new FormData(f));
  if(values.status==='endorsed'&&!confirm('Bekräfta att detta ställningstagande faktiskt är förankrat och att datum och källa är kontrollerade.'))return;
  try{
   await api(wfCase(id)+'position','PUT',{...values,...(workflowState.position?{revision:workflowState.position.revision}:{})});
   await loadCaseWorkflow(id);render();toast('Ställningstagandet sparades.');
  }catch(error){toast(error.message,true);}
 });
 $('wf-more-history')?.addEventListener('click',async()=>{
  try{
   const data=await api(wfCase(id)+'history?offset='+workflowState.nextOffset);
   workflowState.events.push(...(data.events||[]));workflowState.nextOffset=data.next_offset;render();
  }catch(error){toast(error.message,true);}
 });
 document.querySelectorAll('[data-wf-meeting]').forEach(b=>b.addEventListener('click',async()=>{
  if(!caseSafeToLeave())return;const meeting=b.dataset.wfMeeting;
  await openTab('meetings');
  if(state.tab!=='meetings')return;
  try{await openMeeting(meeting);recordWorkView();render();}catch(error){toast(error.message,true);}
 }));
 $('wf-search-form')?.addEventListener('submit',async e=>{
  e.preventDefault();const query=String(new FormData(e.currentTarget).get('q')||'').trim();
  workflowState.search=query;workflowState.searchLoading=true;
  if(query.length<2){workflowState.searchResults=[];workflowState.searchLoading=false;render();return;}
  try{workflowState.searchResults=(await api(wfRoot+'search?q='+encodeURIComponent(query))).results||[];render();}
  catch(error){toast(error.message,true);}finally{workflowState.searchLoading=false;}
 });
 document.querySelectorAll('[data-wf-result]').forEach(b=>b.addEventListener('click',async()=>{
  const type=b.dataset.wfResult,recordId=b.dataset.wfId;
  try{
   if(type==='motion'){await openMotion(recordId);return;}
   await openTab(type==='meeting'?'meetings':'cases');
   if(type==='meeting'){await openMeeting(recordId);recordWorkView();render();}
   else{
    const found=state.caseItems.find(c=>c.id===recordId);
    if(!found)throw Error('Ärendet är inte längre tillgängligt');
    state.caseCurrent={...found,labels:[...(found.labels||[])]};state.caseDirty=false;state.caseNoteDirty=false;
    await Promise.all([loadCaseComments(recordId),loadCaseWorkflow(recordId)]);
    recordWorkView();render();
   }
  }catch(error){toast(error.message,true);}
 }));
}
