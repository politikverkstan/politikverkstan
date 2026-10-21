/* 0.9.0 event handlers; injected into the workroom IIFE before attach(). */
function attachMeetingActions(){
 const reload=async id=>{await loadMeetings();if(id)await openMeeting(id);render();};
 $('meeting-new')?.addEventListener('click',()=>{
  if(!meetingSafeToLeave())return;
  state.meetingCurrent=meetingEmpty();state.meetingAgenda=[];state.meetingNote='';
  state.meetingItemEdit=null;state.meetingDirty=false;state.meetingNoteDirty=false;state.meetingItemDirty=false;render();
 });
 document.querySelectorAll('[data-meeting-open]').forEach(b=>b.addEventListener('click',async()=>{
  if(!meetingSafeToLeave())return;
  try{await openMeeting(b.dataset.meetingOpen);render();}catch(e){toast('Sammanträdet kunde inte öppnas: '+e.message,true);}
 }));
 document.querySelectorAll('[data-meeting-visibility]').forEach(b=>b.addEventListener('click',()=>{state.meetingVisibility=b.dataset.meetingVisibility;render();}));
 $('meeting-search')?.addEventListener('input',e=>{
  const cursor=e.target.selectionStart;
  state.meetingSearch=e.target.value;render();
  const field=$('meeting-search');field?.focus();field?.setSelectionRange(cursor,cursor);
 });
 const form=$('meeting-form');
 form?.addEventListener('input',e=>{
  const name=e.target.name;
  if(!name||!state.meetingCurrent)return;
  state.meetingCurrent[name]=e.target.value;state.meetingDirty=true;
  const label=$('meeting-save-info');if(label)label.textContent='Osparade ändringar';
 });
 form?.addEventListener('change',e=>{
  const name=e.target.name;if(!name||!state.meetingCurrent)return;
  state.meetingCurrent[name]=e.target.value;state.meetingDirty=true;
 });
 form?.addEventListener('submit',async e=>{
  e.preventDefault();const m=state.meetingCurrent;if(!m||m.is_owner===false)return;
  const button=form.querySelector('[type="submit"]');button.disabled=true;
  try{
   const url=m.id?'/api/private/meetings/'+m.id:'/api/private/meetings';
   const answer=await api(url,m.id?'PUT':'POST',{title:m.title,committee:m.committee,meeting_date:m.meeting_date,start_time:m.start_time||'',location:m.location||'',status:m.status,revision:m.revision});
   state.meetingDirty=false;await reload(m.id||answer.id);toast('Sammanträdet sparades.');
  }catch(error){button.disabled=false;toast(error.message,true);}
 });
 $('meeting-sharing-form')?.addEventListener('submit',async e=>{
  e.preventDefault();const m=state.meetingCurrent;
  if(!m?.id||m.is_owner===false)return;
  if(state.meetingDirty||state.meetingItemDirty||state.meetingNoteDirty){toast('Spara övriga ändringar innan du delar.',true);return;}
  const scope=new FormData(e.currentTarget).get('scope');
  if(scope==='team'&&m.scope!=='team'&&!confirm('Dela sammanträdet och dagordningens innehåll med ALLA aktiva och godkända användare? Privata anteckningar delas inte.'))return;
  if(scope==='mine'&&m.scope==='team'&&!confirm('Göra sammanträdet privat? Övriga användare förlorar åtkomsten.'))return;
  try{await api('/api/private/meetings/'+m.id+'/sharing','PUT',{scope,revision:m.revision});await reload(m.id);toast('Delningen är uppdaterad.');}
  catch(error){toast(error.message,true);}
 });
 $('meeting-delete')?.addEventListener('click',async()=>{
  const m=state.meetingCurrent;if(!m?.id||m.is_owner===false||!confirm('Radera sammanträdet, dagordningen och personliga mötesanteckningar permanent? Kopplade ärenden raderas inte.'))return;
  try{await api('/api/private/meetings/'+m.id,'DELETE');state.meetingCurrent=null;state.meetingAgenda=[];state.meetingNote='';state.meetingDirty=false;state.meetingNoteDirty=false;state.meetingItemDirty=false;await reload(null);toast('Sammanträdet raderades.');}
  catch(error){toast(error.message,true);}
 });
 $('meeting-add-item')?.addEventListener('click',()=>{
  if(!meetingSafeToLeave())return;
  state.meetingItemEdit=meetingItemEmpty();state.meetingItemDirty=false;render();
  $('meeting-item-form')?.scrollIntoView({block:'nearest'});
 });
 document.querySelectorAll('[data-meeting-item-edit]').forEach(b=>b.addEventListener('click',()=>{
  if(!meetingSafeToLeave())return;
  const item=state.meetingAgenda.find(i=>i.id===b.dataset.meetingItemEdit);
  if(!item)return;
  state.meetingItemEdit={...item};state.meetingItemDirty=false;render();
  $('meeting-item-form')?.scrollIntoView({block:'nearest'});
 }));
 $('meeting-item-cancel')?.addEventListener('click',()=>{
  if(!meetingSafeToLeave())return;
  state.meetingItemEdit=null;state.meetingItemDirty=false;render();
 });
 const itemForm=$('meeting-item-form');
 itemForm?.addEventListener('input',e=>{
  const name=e.target.name;
  if(name&&state.meetingItemEdit){state.meetingItemEdit[name]=e.target.value;state.meetingItemDirty=true;}
 });
 itemForm?.addEventListener('change',e=>{
  const name=e.target.name;
  if(name&&state.meetingItemEdit){state.meetingItemEdit[name]=e.target.value;state.meetingItemDirty=true;}
 });
 itemForm?.addEventListener('submit',async e=>{
  e.preventDefault();const m=state.meetingCurrent,item=state.meetingItemEdit;
  if(!m?.id||m.is_owner===false||!item)return;
  const endpoint='/api/private/meetings/'+m.id+'/items'+(item.id?'/'+item.id:'');
  const button=itemForm.querySelector('[type="submit"]');button.disabled=true;
  try{
   await api(endpoint,item.id?'PUT':'POST',{title:item.title,case_id:item.case_id||null,preparation:item.preparation||'',outcome:item.outcome||'',follow_up:item.follow_up||''});
   state.meetingItemDirty=false;await reload(m.id);toast('Dagordningspunkten sparades.');
  }catch(error){button.disabled=false;toast(error.message,true);}
 });
 $('meeting-item-delete')?.addEventListener('click',async()=>{
  const m=state.meetingCurrent,item=state.meetingItemEdit;
  if(!m?.id||!item?.id||m.is_owner===false||!confirm('Ta bort denna dagordningspunkt? Det kopplade ärendet påverkas inte.'))return;
  try{await api('/api/private/meetings/'+m.id+'/items/'+item.id,'DELETE');state.meetingItemDirty=false;await reload(m.id);toast('Punkten togs bort.');}
  catch(error){toast(error.message,true);}
 });
 document.querySelectorAll('[data-meeting-move]').forEach(button=>button.addEventListener('click',async()=>{
  if(!meetingSafeToLeave())return;
  const m=state.meetingCurrent;if(!m?.id||m.is_owner===false)return;
  try{
   await api('/api/private/meetings/'+m.id+'/items/'+button.dataset.meetingMove+'/move','POST',{direction:Number(button.dataset.direction)});
   await reload(m.id);
  }catch(error){toast(error.message,true);}
 }));
 const noteForm=$('meeting-note-form');
 noteForm?.addEventListener('input',e=>{
  if(e.target.name!=='personal_note')return;
  state.meetingNote=e.target.value;state.meetingNoteDirty=true;
  const label=$('meeting-note-status');if(label)label.textContent='Osparade privata anteckningar';
 });
 noteForm?.addEventListener('submit',async e=>{
  e.preventDefault();const m=state.meetingCurrent;if(!m?.id)return;
  const button=noteForm.querySelector('[type="submit"]');button.disabled=true;
  try{
   await api('/api/private/meetings/'+m.id+'/notes','PUT',{personal_note:state.meetingNote});
   state.meetingNoteDirty=false;button.disabled=false;
   const label=$('meeting-note-status');if(label)label.textContent='Privata anteckningar sparade';
   toast('Dina privata mötesanteckningar sparades.');
  }catch(error){button.disabled=false;toast(error.message,true);}
 });
 document.querySelectorAll('[data-meeting-case]').forEach(b=>b.addEventListener('click',async()=>{
  if(!meetingSafeToLeave())return;
  const caseId=b.dataset.meetingCase;
  await openTab('cases');
  const c=state.caseItems.find(x=>x.id===caseId);
  if(!c){toast('Ärendet är inte tillgängligt för dig.',true);return;}
  state.caseCurrent={...c,labels:[...(c.labels||[])]};state.caseDirty=false;state.caseNoteDirty=false;
  try{await loadCaseComments(caseId);}catch{state.caseComments=[];}
  render();
 }));
 $('meeting-print-button')?.addEventListener('click',()=>{
  if(!meetingSafeToLeave())return;
  window.print();
 });
}
