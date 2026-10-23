/* 1.8 - next meeting preparation in the protected workroom.
 * Reuses meeting and agenda APIs. Public sources remain read-only.
 * No new database rows are created without an explicit user action. */
const prepToday=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Stockholm',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const prepTitleKey=x=>String(x||'').trim().replace(/\s+/g,' ').toLocaleLowerCase('sv-SE');
const prepHasWork=item=>{
 const text=String(item?.preparation||'').trim();
 if(!text)return false;
 return !/^Offentlig källa:\s*https:\/\/meetings\.lekeberg\.se\/[^\n]+\nDagordningspunkt \d+\.\s*Kontrollera bilagor och uppdateringar i MeetingPlus\.$/.test(text);
};
function prepOptions(){
 const today=prepToday();
 const official=(state.officialCalendarMeetings||[]).filter(m=>m.meeting_date>=today).map(m=>({
  key:m.source_url,kind:'official',date:m.meeting_date,time:m.start_time||'',title:m.committee,official:m
 }));
 const officialKeys=new Set(official.map(m=>m.key));
 const personalSource=(state.meetingList?.length?state.meetingList:(state.dashboardMeetings||[]));
 const personal=personalSource.filter(m=>m.meeting_date>=today&&m.status!=='closed'&&(!m.official_source_url||!officialKeys.has(m.official_source_url))).map(m=>({
  key:m.id,kind:'private',date:m.meeting_date,time:m.start_time||'',title:m.title,meeting:m
 }));
 return [...official,...personal].sort((a,b)=>a.date.localeCompare(b.date)||a.time.localeCompare(b.time)||a.title.localeCompare(b.title,'sv-SE')).slice(0,60);
}
function prepSelected(){
 const options=prepOptions();
 return options.find(o=>o.key===state.prepSelectedKey)||options[0]||null;
}
function prepLinkedMeeting(option){
 if(!option)return null;
 if(option.kind==='private')return option.meeting;
 return (state.meetingList||[]).filter(m=>m.official_source_url===option.key)
  .sort((a,b)=>Number(!!(b.is_owner&&b.scope==='mine'))-Number(!!(a.is_owner&&a.scope==='mine')))[0]||null;
}
async function prepSelect(key,updateHistory=true){
 const option=prepOptions().find(o=>o.key===key)||prepOptions()[0]||null;
 if(!meetingSafeToLeave())return false;
 state.prepSelectedKey=option?.key||'';
 state.prepEditingId='';state.prepDraft=null;state.meetingItemDirty=false;
 const linked=prepLinkedMeeting(option);
 if(linked?.id){try{await openMeeting(linked.id);}catch(error){toast('Mötet kunde inte hämtas: '+error.message,true);state.meetingCurrent=null;state.meetingAgenda=[];}}
 else{state.meetingCurrent=null;state.meetingAgenda=[];state.meetingNote='';state.meetingItemEdit=null;
  state.meetingDirty=false;state.meetingNoteDirty=false;}
 if(updateHistory)recordWorkView();
 render();
 return true;
}
function prepItems(option,linked){
 const official=option?.kind==='official'?option.official:
  (state.officialCalendarMeetings||[]).find(m=>m.source_url===linked?.official_source_url);
 const saved=state.meetingCurrent?.id===linked?.id?(state.meetingAgenda||[]):[];
 const taken=new Set(),rows=[];
 for(const entry of (official?.agenda||[])){
  const match=saved.find(x=>!taken.has(x.id)&&prepTitleKey(x.title)===prepTitleKey(entry.title));
  if(match)taken.add(match.id);
  rows.push({number:entry.number,title:entry.title,entry,privateItem:match||null});
 }
 for(const item of saved.filter(x=>!taken.has(x.id))){
  rows.push({number:null,title:item.title,entry:null,privateItem:item});
 }
 return {official,rows};
}
function meetingPreparationPage(){
 const options=prepOptions(),selected=prepSelected();
 if(!selected)return '<section class="prep-root">'+header('MIN FÖRBEREDELSE','Mitt nästa sammanträde','Samla källor, ärenden och egna förberedelser på en plats.')+
  '<div class="card"><h2>Inga kommande sammanträden hittades</h2><p>Inga offentliga sammanträden eller åtkomliga egna möten finns registrerade inom den inlästa perioden. Kontrollera kommunens MeetingPlus eller öppna Sammanträden för att skapa ett eget möte.</p><button class="btn btn-primary" data-tab="meetings">Öppna sammanträden</button></div></section>';
 const linked=prepLinkedMeeting(selected),privateReady=linked&&state.meetingCurrent?.id===linked.id;
 const current=privateReady?state.meetingCurrent:null,editable=!!(current?.is_owner&&current.scope==='mine');
 const {official,rows}=prepItems(selected,linked);
 const completed=rows.filter(r=>r.privateItem&&prepHasWork(r.privateItem)).length;
 const percent=rows.length?Math.round(100*completed/rows.length):0;
 const source=official?.source_url||linked?.official_source_url||'';
 const docs=official?.documents||[];
 const last=official?.agenda_changed_at?.slice(0,16).replace('T',' ')||'';
 const selector=options.length>1?'<label class="field prep-choice"><span>Välj sammanträde</span><select id="prep-meeting-choice">'+
  options.map(o=>'<option value="'+h(o.key)+'" '+(o.key===selected.key?'selected':'')+'>'+h(o.date+' · '+o.title)+'</option>').join('')+
  '</select></label>':'';
 const info=current?'<span class="chip">'+(current.scope==='team'?'Gemensamt':'Privat')+'</span>':official?'<span class="chip">Offentlig källa</span>':'';
 const status=rows.length?'<div class="prep-progress-head"><strong>'+completed+' av '+rows.length+' punkter med egna förberedelser</strong><span>'+percent+' %</span></div>'+
  '<div class="prep-progress" role="progressbar" aria-label="Punkter med egna förberedelser" aria-valuemin="0" aria-valuemax="'+rows.length+'" aria-valuenow="'+completed+'"><span style="width:'+percent+'%"></span></div>':
  '<p class="case-hint">Inga identifierade dagordningspunkter finns ännu.</p>';
 const list=rows.length?rows.map((row,index)=>{
  const item=row.privateItem,withNotes=item&&prepHasWork(item);
  const label=withNotes?'Underlag antecknat':item?.follow_up?.trim()?'Uppföljning noterad':item?.case_id?'Ärende kopplat, förberedelse saknas':'Ej påbörjad';
  const edit=editable&&item?.id&&state.prepEditingId===item.id;
  return '<li class="prep-item"><div class="prep-item-head"><span class="prep-number">'+h(row.number??(index+1))+'.</span><div class="prep-item-title"><strong>'+h(row.title)+'</strong>'+
   '<span class="prep-item-status '+(withNotes?'has-work':'')+'">'+h(label)+'</span>'+
   (item?.case_link_restricted?'<small>Kopplat ärende kan inte läsas med din behörighet.</small>':'')+'</div></div>'+
   (item?.follow_up?'<p class="prep-follow-up"><b>Att följa upp:</b> '+h(item.follow_up)+'</p>':'')+
   (item?.preparation&&withNotes?'<p class="prep-notes-preview">'+h(item.preparation)+'</p>':'')+
   '<div class="prep-actions">'+
   (item?.case_id?'<button class="btn btn-sm" type="button" data-prep-case="'+h(item.case_id)+'">Öppna ärende</button>':'')+
   (editable&&item?.id?'<button class="btn btn-sm" type="button" data-prep-edit="'+h(item.id)+'">'+(edit?'Stäng redigering':'Skriv förberedelse')+'</button>':'')+
   (editable&&!item?.id&&row.entry?'<button class="btn btn-sm" type="button" data-prep-add="'+index+'">Lägg till i mitt möte</button>':'')+
   '</div>'+
   (edit?'<form class="prep-edit-form" id="prep-edit-form" data-prep-form="'+h(item.id)+'">'+
    '<label class="field"><span>Underlag, frågor och förberedelser (privat mötesmaterial)</span><textarea name="preparation" maxlength="4500" rows="5">'+h(state.prepDraft?.preparation??item.preparation??'')+'</textarea></label>'+
    '<label class="field"><span>Att göra eller följa upp</span><textarea name="follow_up" maxlength="3500" rows="3">'+h(state.prepDraft?.follow_up??item.follow_up??'')+'</textarea></label>'+
    '<button class="btn btn-primary" type="submit">Spara förberedelsen</button> <button class="btn" type="button" id="prep-cancel-edit">Avbryt</button></form>':'')+
   '</li>';
 }).join(''):'<p class="case-hint">Kontrollera den officiella kallelsen. Du kan fortfarande skapa ett privat möte och lägga till egna punkter.</p>';
 return '<section class="prep-root">'+
  header('SAMMANTRÄDESFÖRBEREDELSE','Mitt nästa sammanträde','Samlad överblick över offentlig dagordning och de förberedelser du själv sparat. Inga automatiskt antagna beslut.')+
  '<div class="prep-top card">'+selector+'<div class="prep-top-heading"><div><span class="eyebrow">AKTUELLT SAMMANTRÄDE</span><h2>'+h(selected.title)+'</h2><p>'+h(selected.date)+(selected.time?' · kl. '+h(selected.time):'')+(official?.location?' · '+h(official.location):'')+'</p></div>'+info+'</div>'+
  status+'<div class="prep-top-actions">'+
  (source?'<a class="btn" href="'+h(source)+'" target="_blank" rel="noopener noreferrer">Officiell kallelse ↗</a>':'')+
  (current?'<button class="btn btn-primary" type="button" id="prep-open-private">'+(current.scope==='team'?'Öppna gemensamt möte':'Öppna mitt möte och mina anteckningar')+'</button>': '')+
  (official&&!editable?'<button class="btn" type="button" id="prep-create-private">Skapa egen privat förberedelse</button>':
   !current?'<button class="btn" data-tab="meetings">Öppna sammanträden</button>':
   '<button class="btn" data-tab="meetings">Öppna sammanträden</button>')+
  '</div></div>'+
  '<div class="prep-columns"><section class="card prep-agenda" aria-labelledby="prep-agenda-label"><div class="prep-heading"><h2 id="prep-agenda-label">Dagordning och arbetsläge</h2><small>'+rows.length+' punkter</small></div>'+
  '<p class="case-hint">”Underlag antecknat” betyder bara att egna uppgifter har sparats, inte att sakfrågan är färdiggranskad. Du väljer uttryckligen vilka offentliga punkter som ska läggas till i ditt privata möte.</p>'+
  '<ol class="prep-list">'+list+'</ol></section>'+
  '<aside class="prep-side"><section class="card"><h2>Källor och handlingar</h2>'+
  (source?'<p>Kommunens information är originalkälla. Dagordningen kan ändras. Kontrollera datum, bilagor och justerat protokoll.</p>':'<p>Ingen verifierad originalkälla kopplad till detta privata möte.</p>')+
  (official?.agenda_error?'<p class="official-warning">'+h(official.agenda_error)+'</p>':'')+
  (last?'<p class="case-hint">Senast identifierad ändring: '+h(last)+' UTC</p>':'')+
  (docs.length?'<details><summary>Offentliga handlingar ('+docs.length+')</summary><ul class="prep-docs">'+docs.map(d=>'<li><a href="'+h(d.url)+'" target="_blank" rel="noopener noreferrer">'+h(d.title)+' ↗</a></li>').join('')+'</ul></details>':
   '<p class="case-hint">Inga länkade handlingar har identifierats för detta möte.</p>')+
  '</section><section class="card"><h2>Arbetsflöde</h2><p>1. Kontrollera originalhandlingarna. 2. Anteckna frågor och underlag. 3. Koppla egna ärenden eller skriv yrkanden i Skrivverkstaden. 4. Följ upp faktiskt beslut efter sammanträdet.</p>'+
  '<p class="case-hint">Privata anteckningar visas inte i offentlig dagordning och förs aldrig automatiskt över.</p></section></aside></div></section>';
}
function attachMeetingPreparation(){
 $('prep-meeting-choice')?.addEventListener('change',async e=>{
  try{if(!await prepSelect(e.target.value))render();}catch(error){toast(error.message,true);render();}
 });
 $('prep-create-private')?.addEventListener('click',async()=>{
  const option=prepSelected(),official=option?.official;
  if(!official||!meetingSafeToLeave())return;
  const mine=(state.meetingList||[]).find(m=>m.official_source_url===official.source_url&&m.is_owner&&m.scope==='mine');
  if(mine){await prepSelect(option.key);toast('Befintlig privat förberedelse öppnad.');return;}
  if(!confirm('Skapa ett privat sammanträde kopplat till kommunens publicering? Dagordningspunkter och handlingar importeras inte automatiskt.'))return;
  const button=$('prep-create-private');button.disabled=true;
  try{
   const input={...meetingEmpty(),title:official.committee+' – mötesförberedelser',committee:official.committee,
    meeting_date:official.meeting_date,start_time:official.start_time||'',location:official.location||'',official_source_url:official.source_url};
   const created=await api('/api/private/meetings','POST',input);
   await loadMeetings();await prepSelect(option.key);toast('Privat mötesförberedelse skapad. Välj punkterna du vill arbeta med.');
  }catch(e){button.disabled=false;toast('Kunde inte skapa möte: '+e.message,true);}
 });
 $('prep-open-private')?.addEventListener('click',async()=>{
  if(!meetingSafeToLeave())return;
  const m=prepLinkedMeeting(prepSelected());if(!m?.id)return;
  await openTab('meetings');if(state.tab!=='meetings')return;
  state.officialSelectedUrl='';
  try{await openMeeting(m.id);recordWorkView();render();$('meeting-form')?.scrollIntoView({block:'start'});}
  catch(e){toast(e.message,true);}
 });
 document.querySelectorAll('[data-prep-add]').forEach(btn=>btn.addEventListener('click',async()=>{
  const option=prepSelected(),linked=prepLinkedMeeting(option),index=Number(btn.dataset.prepAdd);
  const rows=prepItems(option,linked).rows,item=rows[index];
  if(!item?.entry||item.privateItem||!linked?.id||!linked.is_owner)return;
  if(!meetingSafeToLeave())return;
  btn.disabled=true;
  try{
   await api('/api/private/meetings/'+encodeURIComponent(linked.id)+'/items','POST',{
    title:item.title,case_id:null,preparation:'',outcome:'',follow_up:''
   });
   await prepSelect(option.key);toast('Punkten har lagts till i din privata dagordning.');
  }catch(e){btn.disabled=false;toast(e.message,true);}
 }));
 document.querySelectorAll('[data-prep-edit]').forEach(btn=>btn.addEventListener('click',()=>{
  if(!meetingSafeToLeave())return;
  const item=(state.meetingAgenda||[]).find(x=>x.id===btn.dataset.prepEdit);
  if(!item)return;
  state.prepEditingId=state.prepEditingId===item.id?'':item.id;state.prepDraft=null;state.meetingItemDirty=false;render();
  $('prep-edit-form')?.scrollIntoView({block:'nearest'});
 }));
 $('prep-cancel-edit')?.addEventListener('click',()=>{
  if(!meetingSafeToLeave())return;
  state.prepEditingId='';state.prepDraft=null;state.meetingItemDirty=false;render();
 });
 const form=$('prep-edit-form');
 form?.addEventListener('input',()=>{
  state.prepDraft=Object.fromEntries(new FormData(form));
  state.meetingItemDirty=true;
 });
 form?.addEventListener('submit',async e=>{
  e.preventDefault();const option=prepSelected(),linked=prepLinkedMeeting(option);
  const item=(state.meetingAgenda||[]).find(x=>x.id===form.dataset.prepForm);
  if(!linked?.id||!linked.is_owner||!item)return;
  const fields=Object.fromEntries(new FormData(form)),submit=form.querySelector('[type=submit]');
  submit.disabled=true;
  try{
   await api('/api/private/meetings/'+encodeURIComponent(linked.id)+'/items/'+encodeURIComponent(item.id),'PUT',{
    title:item.title,case_id:item.case_id||null,preparation:fields.preparation||'',
    outcome:item.outcome||'',follow_up:fields.follow_up||''
   });
   state.meetingItemDirty=false;state.prepEditingId='';state.prepDraft=null;
   await openMeeting(linked.id);render();toast('Förberedelsen sparades privat.');
  }catch(error){submit.disabled=false;toast('Kunde inte spara: '+error.message,true);}
 });
 document.querySelectorAll('[data-prep-case]').forEach(btn=>btn.addEventListener('click',()=>dashboardOpenCase(btn.dataset.prepCase)));
}
