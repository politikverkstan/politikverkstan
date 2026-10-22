/* Browser/mouse navigation for the protected workroom.
 * Only a view identifier is kept in history state. NEVER store actual document
 * content, personal notes or sensitive case text in browser history. */
const WORK_HISTORY_KEY='politikverkstanWorkroom';
const workTabs=new Set(['overview','search','meetings','cases','motions','shared','files','editor','ideas','users']);
function workSnapshot(){
 return {
  tab:state.tab,
  caseId:state.tab==='cases'?(state.caseCurrent?.id||null):null,
  meetingId:state.tab==='meetings'?(state.meetingCurrent?.id||null):null,
  motionId:state.tab==='editor'?(state.motion?.id||null):null
 };
}
function workHistoryEntry(){
 const entry=history.state?.[WORK_HISTORY_KEY];
 return entry&&workTabs.has(entry.tab)&&Number.isSafeInteger(entry.depth)?entry:null;
}
function sameWorkView(a,b){
 return !!a&&!!b&&a.tab===b.tab&&
  (a.caseId||null)===(b.caseId||null)&&
  (a.meetingId||null)===(b.meetingId||null)&&
  (a.motionId||null)===(b.motionId||null);
}
function recordWorkView(){
 const target=workSnapshot(),prior=workHistoryEntry();
 if(sameWorkView(prior,target))return;
 history.pushState({...history.state,[WORK_HISTORY_KEY]:{...target,depth:(prior?.depth||0)+1}},'');
}
function workGoBack(){
 if((workHistoryEntry()?.depth||0)>0){history.back();return;}
 if(state.tab!=='overview')openTab('overview');
}
async function restoreWorkHistory(event){
 const target=event.state?.[WORK_HISTORY_KEY];
 if(!target||!workTabs.has(target.tab))return;
 if(target.tab==='users'&&state.user?.role!=='admin')return;
 if(sameWorkView(target,workSnapshot())){render();return;}
 // A cancelled browser Back must return the history cursor to its original
 // entry. When Forward arrives, it matches the still-mounted current view.
 if(!caseSafeToLeave()||!meetingSafeToLeave()){history.forward();return;}
 state.caseDirty=false;state.caseNoteDirty=false;
 state.meetingDirty=false;state.meetingNoteDirty=false;state.meetingItemDirty=false;
 // A history entry for a list must discard a currently open detail in that tab.
 if(target.tab==='cases'){state.caseCurrent=null;state.caseComments=[];}
 if(target.tab==='meetings'){state.meetingCurrent=null;state.meetingAgenda=[];state.meetingNote='';state.meetingItemEdit=null;}
 try{
  await openTab(target.tab,true);
  if(state.tab!==target.tab)return;
  if(target.tab==='cases'&&!target.caseId){
   state.caseCurrent=null;state.caseComments=[];state.caseDirty=false;state.caseNoteDirty=false;render();
  }else if(target.tab==='meetings'&&!target.meetingId){
   state.meetingCurrent=null;state.meetingAgenda=[];state.meetingItemEdit=null;
   state.meetingNote='';state.meetingDirty=false;state.meetingNoteDirty=false;render();
  }else if(target.tab==='cases'&&target.caseId){
   const record=state.caseItems.find(x=>x.id===target.caseId);
   if(record){
    state.caseCurrent={...record,labels:[...(record.labels||[])]};
    try{await loadCaseComments(record.id);}catch{state.caseComments=[];}
    await loadCaseWorkflow(record.id);
    render();
   }
  }else if(target.tab==='meetings'&&target.meetingId){
   try{await openMeeting(target.meetingId);render();}catch(e){toast('Mötet kunde inte öppnas: '+e.message,true);}
  }else if(target.tab==='editor'&&target.motionId){
   await openMotion(target.motionId,true);
  }
 }catch(e){toast('Det gick inte att gå tillbaka: '+e.message,true);}
}
function initializeWorkHistory(){
 history.replaceState({...history.state,[WORK_HISTORY_KEY]:{...workSnapshot(),depth:0}},'');
 window.addEventListener('popstate',restoreWorkHistory);
}
