/* 1.9–2.0. The case's existing ACL and revision controls protect these records.
 * Every association with an official document is explicitly selected by a user. */
const dossierKinds={handling:'Handling',protokoll:'Protokoll',statistik:'Statistik',annan:'Annan källa'};
const dossierTypes={faktafel:'Faktafel',motsagelse:'Motsägelse',underlagsbrist:'Underlagsbrist',risk:'Risk',politisk_invandning:'Politisk invändning'};
const dossierLevels={kritisk:'Kritisk',betydande:'Betydande',mindre:'Mindre'};
const dossierNewSource=()=>({title:'',url:'',reference:'',kind:'handling',checked:false});
const dossierNewFinding=()=>({title:'',type:'underlagsbrist',severity:'betydande',reference:'',impact:'',action:'',status:'open'});
let dossierEditing=null;
const dossierDateSource=c=>(state.officialCalendarMeetings||[]).find(m=>m.meeting_date===c.meeting_date&&m.committee===c.committee);
function dossierSourceRows(c){
 return (c.source_refs||[]).map((d,i)=>'<div class="dossier-entry"><div class="dossier-entry-head"><strong>'+h(d.title)+'</strong><span class="chip">'+h(dossierKinds[d.kind]||'Handling')+'</span></div>'+
  (d.url?'<a href="'+h(d.url)+'" target="_blank" rel="noopener noreferrer">Öppna originalkälla ↗</a>':'')+
  (d.reference?'<small>Dokument, datum eller sida: '+h(d.reference)+'</small>':'')+
  '<small>'+(d.checked?'Manuellt källkontrollerad':'Inte källkontrollerad')+'</small>'+
  (c.can_edit?'<div class="dossier-actions"><button type="button" class="btn btn-sm" data-dossier-edit-source="'+i+'">Redigera</button><button type="button" class="btn btn-sm btn-danger" data-dossier-delete-source="'+i+'">Ta bort</button></div>':'')+'</div>').join('');
}
function dossierFindingRows(c){
 return (c.findings||[]).map((f,i)=>'<div class="dossier-entry '+(f.severity==='kritisk'?'dossier-critical':'')+'"><div class="dossier-entry-head"><strong>'+h(f.title)+'</strong><span class="chip">'+h(dossierLevels[f.severity]||'Betydande')+'</span></div>'+
  '<small>'+h(dossierTypes[f.type]||f.type)+' · '+(f.status==='resolved'?'Åtgärdad':'Öppen')+'</small>'+
  (f.reference?'<p><b>Belägg:</b> '+h(f.reference)+'</p>':'')+
  (f.impact?'<p><b>Betydelse:</b> '+h(f.impact)+'</p>':'')+
  (f.action?'<p><b>Åtgärd:</b> '+h(f.action)+'</p>':'')+
  (c.can_edit?'<div class="dossier-actions"><button type="button" class="btn btn-sm" data-dossier-edit-finding="'+i+'">Redigera</button><button type="button" class="btn btn-sm btn-danger" data-dossier-delete-finding="'+i+'">Ta bort</button></div>':'')+'</div>').join('');
}
function dossierSelect(value,options){
 return Object.entries(options).map(([key,label])=>'<option value="'+h(key)+'"'+(value===key?' selected':'')+'>'+h(label)+'</option>').join('');
}
function dossierSourceForm(c){
 if(dossierEditing?.type!=='source')return '';
 const d=dossierEditing.value||dossierNewSource(),match=dossierDateSource(c),docs=match?.documents||[];
 return '<form id="dossier-source-form" class="dossier-form"><h3>'+ (dossierEditing.index<0?'Ny källa':'Redigera källa')+'</h3>'+
  (docs.length?'<label class="field"><span>Föreslå från officiellt publicerade handlingar samma sammanträdesdatum</span><select id="dossier-source-suggestion"><option value="">Välj själv</option>'+
   docs.slice(0,100).map((doc,i)=>'<option value="'+i+'">'+h(doc.title)+'</option>').join('')+'</select></label>'+
   '<p class="case-hint">Du måste själv kontrollera att handlingen verkligen hör till detta ärende.</p>':'')+
  '<label class="field"><span>Titel</span><input name="title" required maxlength="160" value="'+h(d.title||'')+'"></label>'+
  '<label class="field"><span>Original-URL (https)</span><input name="url" type="url" maxlength="1024" value="'+h(d.url||'')+'"></label>'+
  '<label class="field"><span>Dokumentdatum, sida eller paragraf</span><input name="reference" maxlength="180" value="'+h(d.reference||'')+'"></label>'+
  '<label class="field"><span>Typ</span><select name="kind">'+dossierSelect(d.kind,dossierKinds)+'</select></label>'+
  '<label><input type="checkbox" name="checked"'+(d.checked?' checked':'')+'> Jag har själv kontrollerat denna referens mot originalkällan</label>'+
  '<div class="dossier-actions"><button class="btn btn-primary" type="submit">Spara källpost</button><button class="btn" type="button" data-dossier-cancel="1">Avbryt</button></div></form>';
}
function dossierFindingForm(){
 if(dossierEditing?.type!=='finding')return '';
 const d=dossierEditing.value||dossierNewFinding();
 return '<form id="dossier-finding-form" class="dossier-form"><h3>'+(dossierEditing.index<0?'Ny iakttagelse':'Redigera iakttagelse')+'</h3>'+
  '<label class="field"><span>Påstående eller iakttagelse</span><input name="title" maxlength="160" required value="'+h(d.title||'')+'"></label>'+
  '<div class="formgrid"><label class="field"><span>Klassificering</span><select name="type">'+dossierSelect(d.type,dossierTypes)+'</select></label>'+
  '<label class="field"><span>Betydelse</span><select name="severity">'+dossierSelect(d.severity,dossierLevels)+'</select></label></div>'+
  '<label class="field"><span>Belägg, källa och sida</span><textarea name="reference" maxlength="350" rows="2">'+h(d.reference||'')+'</textarea></label>'+
  '<label class="field"><span>Verksamhetsmässig eller ekonomisk betydelse</span><textarea name="impact" maxlength="500" rows="2">'+h(d.impact||'')+'</textarea></label>'+
  '<label class="field"><span>Föreslagen komplettering eller åtgärd</span><textarea name="action" maxlength="500" rows="2">'+h(d.action||'')+'</textarea></label>'+
  '<label class="field"><span>Status</span><select name="status">'+dossierSelect(d.status,{open:'Öppen',resolved:'Åtgärdad'})+'</select></label>'+
  '<div class="dossier-actions"><button class="btn btn-primary" type="submit">Spara iakttagelse</button><button class="btn" type="button" data-dossier-cancel="1">Avbryt</button></div></form>';
}
function caseDossierPage(c){
 const decision=c.official_decision||{text:'',date:'',reference:'',url:'',verification:'not_checked'};
 const sourceCount=(c.source_refs||[]).length,open=(c.findings||[]).filter(f=>f.status!=='resolved');
 const source=dossierDateSource(c),editable=c.can_edit!==false;
 return '<section class="card case-dossier" id="case-dossier"><div><span class="eyebrow">1.9 · KÄLLSTYRD ÄRENDEAKT</span><h2>Handlingar och granskning</h2>'+
  '<p class="case-hint">Dokumentlänkar kopplas till ärendet först när du själv väljer dem. Ingen PDF-text eller privat fil kopieras automatiskt.</p></div>'+
  '<div class="split-line"><h3>Källregister ('+sourceCount+')</h3>'+
  (editable&&sourceCount<12?'<button class="btn btn-sm" type="button" id="dossier-add-source">+ Källa</button>':'')+'</div>'+
  (dossierSourceRows(c)||'<p class="case-hint">Inga handlingar kopplade. Komplettera med dokument, datum och sidnummer.</p>')+
  dossierSourceForm(c)+
  '<div class="split-line"><h3>Granskningspunkter ('+open.length+' öppna)</h3>'+
  (editable&&(c.findings||[]).length<15?'<button class="btn btn-sm" type="button" id="dossier-add-finding">+ Iakttagelse</button>':'')+'</div>'+
  (dossierFindingRows(c)||'<p class="case-hint">Inga iakttagelser registrerade.</p>')+
  dossierFindingForm()+'</section>'+
  '<section class="card case-dossier" id="dossier-decision"><div><span class="eyebrow">2.0 · BESLUT OCH ANSVAR</span><h2>Kommunalt beslut och protokoll</h2>'+
  '<p class="case-hint">Detta är separat från interna ställningstaganden. En manuell källavstämning är användarens dokumentation och inte en automatisk myndighetsverifiering.</p></div>'+
  (decision.verification==='source_checked'?
   '<p class="dossier-warning">Källan har markerats som manuellt avstämd. Kontrollera alltid att protokollet är justerat och att beslutet inte senare ändrats.</p>':
   '<p class="official-warning">Beslutet är inte markerat som kontrollerat mot justerat protokoll.</p>')+
  (editable?'<form id="dossier-decision-form" class="dossier-form">'+
   '<label class="field"><span>Beslutstext (enligt protokoll, inte eget ställningstagande)</span><textarea name="text" maxlength="3500" rows="4">'+h(decision.text||'')+'</textarea></label>'+
   '<div class="formgrid"><label class="field"><span>Beslutsdatum</span><input type="date" name="date" value="'+h(decision.date||'')+'"></label>'+
   '<label class="field"><span>Paragraf / ärendenummer</span><input name="reference" maxlength="180" value="'+h(decision.reference||'')+'"></label></div>'+
   '<label class="field"><span>Länk till justerat protokoll (https)</span><input type="url" name="url" maxlength="1024" value="'+h(decision.url||'')+'"></label>'+
   '<label class="field"><span>Avstämning</span><select name="verification">'+dossierSelect(decision.verification||'not_checked',{not_checked:'Inte kontrollerat',source_checked:'Jag har manuellt avstämt mot angivet protokoll'})+'</select></label>'+
   '<div class="dossier-actions"><button class="btn btn-primary" type="submit">Spara beslutsuppgift</button>'+
   '<button class="btn" id="dossier-new-followup" type="button">+ Skapa uppföljning</button></div></form>':
   '<div class="dossier-decision-summary">'+(decision.text?'<p>'+h(decision.text)+'</p>':'<p>Inget beslut registrerat.</p>')+
    (decision.url?'<a href="'+h(decision.url)+'" target="_blank" rel="noopener noreferrer">Öppna angivet protokoll ↗</a>':'')+
    '<small>'+h(decision.date||'')+' · '+h(decision.reference||'')+'</small></div>')+
  '<p class="case-hint">Ansvarig, tidsfrist och status hanteras i avsnittet Uppföljningar nedan. Ett sparat beslut skapar inte automatiskt någon uppföljning.</p></section>';
}
async function dossierSaveCase(patch){
 const current=state.caseCurrent;
 if(!current?.id||current.can_edit===false)throw Error('Ingen redigeringsbehörighet');
 if(state.caseDirty||state.caseNoteDirty)throw Error('Spara andra ärendeändringar innan du uppdaterar ärendeakten.');
 const payload={...current,...patch,meeting_notes:undefined,revision:current.revision,
  motion_id:current.is_owner?current.motion_id||null:null,file_id:current.is_owner?current.file_id||null:null};
 const saved=await api('/api/private/cases/'+encodeURIComponent(current.id),'PUT',payload);
 await loadCases();
 const next=state.caseItems.find(x=>x.id===current.id);
 if(next)state.caseCurrent={...next,labels:[...(next.labels||[])]};
 dossierEditing=null;
 await loadCaseWorkflow(current.id);render();
}
function attachCaseDossierActions(){
 const c=state.caseCurrent;
 if(!c?.id)return;
 const open=(type,index,value)=>{if(state.caseDirty||state.caseNoteDirty){toast('Spara övriga ärendeändringar först.',true);return;}
  dossierEditing={type,index,value};render();$(type==='source'?'dossier-source-form':'dossier-finding-form')?.scrollIntoView({block:'nearest'});};
 $('dossier-add-source')?.addEventListener('click',()=>open('source',-1,dossierNewSource()));
 $('dossier-add-finding')?.addEventListener('click',()=>open('finding',-1,dossierNewFinding()));
 document.querySelectorAll('[data-dossier-edit-source]').forEach(b=>b.addEventListener('click',()=>open('source',Number(b.dataset.dossierEditSource),{...c.source_refs[Number(b.dataset.dossierEditSource)]})));
 document.querySelectorAll('[data-dossier-edit-finding]').forEach(b=>b.addEventListener('click',()=>open('finding',Number(b.dataset.dossierEditFinding),{...c.findings[Number(b.dataset.dossierEditFinding)]})));
 document.querySelectorAll('[data-dossier-cancel]').forEach(b=>b.addEventListener('click',()=>{dossierEditing=null;render();}));
 $('dossier-source-suggestion')?.addEventListener('change',e=>{
  const docs=dossierDateSource(c)?.documents||[],index=Number(e.target.value),document=docs[index];
  if(!e.target.value||!document)return;
  const form=$('dossier-source-form');form.elements.title.value=document.title;
  form.elements.url.value=document.url;form.elements.kind.value='handling';form.elements.checked.checked=false;
 });
 for(const kind of ['source','finding']){
  const form=$(kind==='source'?'dossier-source-form':'dossier-finding-form');
  form?.addEventListener('submit',async e=>{
   e.preventDefault();const item=Object.fromEntries(new FormData(form));
   if(kind==='source')item.checked=form.elements.checked.checked;
   const key=kind==='source'?'source_refs':'findings',items=[...(c[key]||[])],index=dossierEditing?.index??-1;
   if(index<0)items.push(item);else items[index]=item;
   const submit=form.querySelector('[type="submit"]');submit.disabled=true;
   try{await dossierSaveCase({[key]:items});toast(kind==='source'?'Källan sparades.':'Iakttagelsen sparades.');}
   catch(error){submit.disabled=false;toast(error.message,true);}
  });
 }
 for(const kind of ['source','finding']){
  document.querySelectorAll('[data-dossier-delete-'+kind+']').forEach(b=>b.addEventListener('click',async()=>{
   if(!confirm('Ta bort denna post från ärendeakten?'))return;
   const key=kind==='source'?'source_refs':'findings',idx=Number(b.dataset[kind==='source'?'dossierDeleteSource':'dossierDeleteFinding']);
   try{await dossierSaveCase({[key]:(c[key]||[]).filter((_,i)=>i!==idx)});toast('Posten togs bort.');}
   catch(error){toast(error.message,true);}
  }));
 }
 $('dossier-decision-form')?.addEventListener('submit',async e=>{
  e.preventDefault();const f=e.currentTarget,decision=Object.fromEntries(new FormData(f));
  if(decision.verification==='source_checked'&&!confirm('Har du själv kontrollerat beslutstext, datum och paragraf mot ett justerat protokoll? Detta markeras bara som manuell avstämning.'))return;
  const submit=f.querySelector('[type=submit]');submit.disabled=true;
  try{await dossierSaveCase({official_decision:decision});toast('Beslutsuppgiften sparades.');}
  catch(error){submit.disabled=false;toast(error.message,true);}
 });
 $('dossier-new-followup')?.addEventListener('click',()=>{
  workflowState.followupEdit={status:'open',details:'',due_date:'',assignee_email:'',meeting_id:''};
  render();$('wf-followup-form')?.scrollIntoView({block:'start'});
 });
}
