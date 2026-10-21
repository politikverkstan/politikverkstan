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
function meetingSafeToLeave(){return !(state.meetingDirty||state.meetingNoteDirty)||confirm('Det finns osparade mötesuppgifter eller privata anteckningar. Lämna utan att spara?');}
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
