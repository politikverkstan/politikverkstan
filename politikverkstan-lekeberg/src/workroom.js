(()=>{'use strict';
const $=id=>document.getElementById(id);
const THEME_KEY='politikverkstan-theme';
function initialTheme(){
 try{const saved=localStorage.getItem(THEME_KEY);if(saved==='light'||saved==='dark')return saved;}catch{}
 return window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';
}
let currentTheme=initialTheme();document.documentElement.dataset.theme=currentTheme;
function toggleTheme(){
 currentTheme=currentTheme==='dark'?'light':'dark';
 document.documentElement.dataset.theme=currentTheme;
 try{localStorage.setItem(THEME_KEY,currentTheme);}catch{}
 render();
}

const h=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const state={tab:'overview',sharedTab:'team',motionView:'active',sharedView:'active',ideaView:'active',ideaHistory:[],user:null,motions:[],shared:[],motion:null,ideas:[],users:[],directory:[],shares:null,comments:[],ideaComments:[],ideaLinks:[],selectedIdea:null,dirty:false,saving:false,saveTimer:null,notice:'',history:[],review:[],logoDataUri:null,pdfVariant:'sd',fileScope:'mine',fileFolder:null,folders:[],files:[],caseItems:[],caseCurrent:null,caseSearch:'',caseFilter:'all',caseDirty:false,caseFiles:[],fileSearch:'',caseDirectory:[],caseComments:[],caseVisibility:'all',caseNoteDirty:false,meetingList:[],officialCalendarMeetings:[],officialCalendarSources:[],officialCalendarCommittees:[],officialCalendarMonth:'',officialCalendarError:'',officialCalendarAdmin:false,meetingCurrent:null,meetingAgenda:[],meetingNote:'',meetingSearch:'',meetingVisibility:'all',meetingDirty:false,meetingNoteDirty:false,meetingItemEdit:null,dashboardCases:[],dashboardMeetings:[],dashboardTasks:[],dashboardFollowups:[],dashboardFollowupsTotal:null,dashboardErrors:[],dashboardLoaded:false,dashboardTaskEdit:null};
const cats=['Skola och utbildning','Omsorg och socialtjänst','Ekonomi och styrning','Trafik och infrastruktur','Trygghet','Miljö och samhällsbyggnad','Kommunal service','Annat'];
const statuses={ide:'Idé',utkast:'Utkast',granskning:'För granskning',godkand:'Internt godkänd',inlamnad:'Inlämnad',besvarad:'Besvarad'};
function newMotion(){return {title:'',category:'Annat',problem:'',motivation:'',proposal:'',clauses:[''],signer:'',party:'Sverigedemokraterna',date:new Date().toISOString().slice(0,10),status:'utkast',reference:'',notes:''};}
async function api(url,method='GET',value){const opt={method,credentials:'same-origin',cache:'no-store',headers:{accept:'application/json'}};if(value!==undefined){opt.headers['content-type']='application/json';opt.body=JSON.stringify(value);}const r=await fetch(url,opt);let data={};try{data=await r.json();}catch{}if(!r.ok)throw Error(data.error||'Servern svarade med HTTP '+r.status);return data;}
function toast(message,error=false){const old=$('toast');old?.remove();let el=document.createElement('div');el.className='toast'+(error?' error':'');el.id='toast';el.textContent=message;document.body.append(el);setTimeout(()=>el.remove(),4800);}
const svg=(p)=>`<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
const icons={calendar:svg('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18"/>'),folder:svg('<path d="M3 7V5h7l2 3h9v12H3V7Z"/>'),clipboard:svg('<rect x="5" y="4" width="14" height="18" rx="2"/><path d="M9 4V2h6v2M8 12h8M8 16h5"/>'),file:svg('<path d="M6 2h8l4 4v16H6zM14 2v5h4M9 12h6M9 16h6"/>'),pen:svg('<path d="m4 16-1 5 5-1L20 8l-4-4L4 16ZM14 6l4 4"/>'),search:svg('<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>'),shield:svg('<path d="M12 2 21 6v6c0 5-3 8-9 10-6-2-9-5-9-10V6z"/><path d="m9 12 2 2 4-4"/>'),write:svg('<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>'),home:svg('<path d="m3 10 9-7 9 7v10H3z"/><path d="M9 20v-7h6v7"/>'),list:svg('<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>'),bulb:svg('<path d="M9 18h6m-5 4h4M9 14a6 6 0 1 1 6 0l-1 3h-4l-1-3z"/>'),users:svg('<circle cx="9" cy="8" r="4"/><path d="M2 21v-2a7 7 0 0 1 14 0v2M17 4a4 4 0 0 1 0 8m2 3a6 6 0 0 1 3 6"/>'),arrow:svg('<path d="m9 18 6-6-6-6"/>'),download:svg('<path d="M12 3v12m0 0 4-4m-4 4-4-4M4 17v4h16v-4"/>'),plus:svg('<path d="M12 5v14M5 12h14"/>')};
function nav(id,label,icon){return `<button class="sidebutton ${state.tab===id?'active':''}" type="button" data-tab="${id}">${icons[icon]} ${label}</button>`;}
function shell(){return `<div class="layout"><aside class="sidebar"><div class="brand"><div class="brand-icon" aria-hidden="true">P</div><div><span>Politikverkstan</span><small>LEKEBERG · ARBETSYTA</small></div><button class="mobile-toggle" id="mobile-menu" type="button" aria-label="Visa meny">☰</button></div><div class="navs"><div class="side-section">DIN ARBETSYTA</div>${nav('overview','Översikt','home')}${nav('search','Sök i arbetsytan','search')}${nav('meetings','Sammanträden','calendar')}${nav('cases','Ärenden','clipboard')}${nav('motions','Mina motioner','file')}${nav('shared','Våra motioner','users')}${nav('files','Filer','folder')}${nav('editor','Motionsverkstad','pen')}${nav('ideas','Våra idéer','bulb')}${state.user?.role==='admin'?`<div class="side-section" style="margin-top:26px">ADMINISTRATION</div>${nav('users','Användare','shield')}`:''}</div><div class="sidebar-tail"><strong>${h(state.user?.name||state.user?.email||'')}</strong><p>${state.user?.role==='admin'?'Administratör':'Standardanvändare'}</p><a href="/">← Till publik Mandat & samverkan</a></div></aside><div class="main"><header class="topbar"><div class="work-topbar-left"><button type="button" class="work-nav-back" id="work-nav-back" title="Tillbaka" aria-label="Tillbaka till föregående vy" ${state.tab==='overview'&&(workHistoryEntry()?.depth||0)===0?'disabled':''}><span class="work-back-symbol" aria-hidden="true">←</span><span>Tillbaka</span></button><div><div class="eyebrow">Inloggningsskyddad arbetsyta</div><h2>${h({overview:'Översikt',search:'Sök i arbetsytan',motions:'Mina motioner',shared:'Våra motioner',editor:'Motionsverkstad',ideas:'Våra idéer',files:'Dokumentarkiv',cases:'Ärenden',meetings:'Sammanträden',users:'Användarhantering'}[state.tab])}</h2></div></div><div class="topactions"><span class="chip">Skyddad inloggning</span><button class="btn btn-sm theme-toggle" id="theme-toggle" type="button" aria-label="${currentTheme==='dark'?'Byt till ljust tema':'Byt till mörkt tema'}" title="Växla ljust/mörkt tema"><span class="theme-symbol" aria-hidden="true">${currentTheme==='dark'?'☀':'☾'}</span> ${currentTheme==='dark'?'Ljust':'Mörkt'}</button><a class="btn btn-sm" href="/">Publik portal</a></div></header><main class="container">${main()}</main></div></div>`;}
function header(kicker,title,desc,right=''){return `<div class="headline"><div><div class="eyebrow">${h(kicker)}</div><h1>${h(title)}</h1><p>${h(desc)}</p></div>${right}</div>`;}
function main(){switch(state.tab){case 'search':return workflowSearchPage();case 'motions':return motionsPage();case 'shared':return sharedPage();case 'files':return filesPage();case 'cases':return casesPage();case 'meetings':return meetingsPage();case 'editor':return editorPage();case 'ideas':return ideasPage();case 'users':return usersPage();default:return overviewPage();}}

function overviewPage(){
 const seen=new Set();
 const latest=[...state.motions,...state.shared].sort((a,b)=>String(b.updated_at||'').localeCompare(String(a.updated_at||''))).filter(m=>{
  if(!m?.id||seen.has(m.id))return false;seen.add(m.id);return true;
 }).slice(0,3);
 return `
 <section class="aw-hero">
  <div class="aw-hero-copy"><div class="aw-overline">VÄLKOMMEN TILL ARBETSYTAN</div>
   <h1>Politikverkstan</h1><p>Samla idéer, skriv motioner och arbeta tillsammans i Lekeberg. Här visas bara material som ditt konto har åtkomst till.</p>
   <div class="aw-hero-buttons"><button type="button" class="btn btn-primary" data-new="1">${icons.plus} Skapa en motion</button><button type="button" class="btn aw-secondary" data-tab="cases">Ärenden ${icons.arrow}</button></div>
  </div>
 </section>
 ${dashboardPage()}
 <div class="aw-shortcuts">
  <button class="aw-shortcut" type="button" data-tab="motions"><span class="aw-shortcut-icon">${icons.file}</span><span><strong>Mina motioner</strong><small>${state.motions.length} aktiva motioner och utkast i din privata arbetsyta</small></span>${icons.arrow}</button>
  <button class="aw-shortcut" type="button" data-tab="shared"><span class="aw-shortcut-icon">${icons.users}</span><span><strong>Våra motioner</strong><small>Gemensamma motioner som du har behörighet att läsa</small></span>${icons.arrow}</button>
 </div>
 <div class="aw-dashboard">
  <section class="aw-latest"><div class="aw-section-head"><div><div class="aw-overline">DINA OCH DELADE DOKUMENT</div><h2>Senaste motioner</h2></div><button class="aw-viewall" type="button" data-tab="motions">Visa mina motioner ${icons.arrow}</button></div>
   <div class="aw-motion-grid">
   ${latest.length?latest.map(m=>`<button class="aw-motion-card" type="button" data-open="${h(m.id)}"><div class="aw-document-art" aria-hidden="true">${icons.write}</div><span class="aw-motion-category">${h(m.category||'Annat')}</span><strong>${h(m.title||'Ny motion')}</strong><p>${h(m.owner_email&&m.owner_email!==state.user.email?'Delad av '+(m.owner_name||m.owner_email):m.team_permission&&m.team_permission!=='none'?'Delad med gruppen':'Privat dokument')}</p><span class="aw-card-meta">${h(statuses[m.status]||'Utkast')} · Uppdaterad ${h((m.updated_at||'').slice(0,10))}</span></button>`).join(''):'<div class="aw-no-docs">Inga motioner att visa ännu. Skapa en motion eller öppna Våra motioner för att komma igång.</div>'}
   </div>
  </section>
  <div class="aw-workbox"><div class="aw-work-icon" aria-hidden="true">${icons.write}</div><div class="aw-overline">SKYDDAD ARBETSYTA</div><h2>Motionsverkstad</h2><p>Arbeta vidare från en idé till ett färdigt förslag. Spara utkast och exportera till PDF.</p><button class="btn btn-primary aw-work-action" type="button" data-tab="editor">Öppna verkstaden ${icons.arrow}</button></div>
 </div>
 <section class="aw-bottom"><h2>Snabbåtkomst</h2><div class="aw-bottom-links"><button type="button" data-tab="meetings">Sammanträden ${icons.arrow}</button><button type="button" data-tab="cases">Mina ärenden ${icons.arrow}</button><button type="button" data-tab="files">Dokumentarkiv ${icons.arrow}</button><button type="button" data-tab="ideas">Våra idéer ${icons.arrow}</button><button type="button" data-tab="shared">Gemensamma motioner ${icons.arrow}</button></div></section>
 <p class="footer-note">Politikverkstan är ett fristående arbetsverktyg och inte Lekebergs kommuns officiella system. Ett dokument blir inte inlämnat genom att sparas eller exporteras här.</p>`;
}
function motionList(docs){if(!docs.length)return '<div class="empty">Här finns inga dokument som du har åtkomst till ännu.</div>';return `<div class="list">${docs.map(d=>`<div class="docrow"><div><strong>${h(d.title||'Ny motion')}</strong><small>${h(d.owner_email&&d.owner_email!==state.user?.email?'Av '+(d.owner_name||d.owner_email)+' · ':'')}${h(d.category)} · ${h(statuses[d.status]||'Utkast')} · ${d.owner_email===state.user?.email?(d.team_permission!=='none'?'Delad med gruppen':d.share_count?'Delad med '+d.share_count+' person(er)':'Privat'):'Behörighet: '+({read:'läsa',comment:'kommentera',edit:'redigera'}[d.permission]||'läsa')} · Ändrad ${h((d.updated_at||'').slice(0,16).replace('T',' '))}</small></div><div class="doc-actions"><button class="btn btn-sm" data-open="${h(d.id)}">Öppna ${icons.arrow}</button>${d.owner_email===state.user?.email?`<details class="actions-menu"><summary aria-label="Fler åtgärder för ${h(d.title)}">⋯</summary><div class="action-options">${d.trashed_at?`<button data-life="restore" data-doc="${h(d.id)}">Återställ</button><button class="danger" data-life="purge" data-doc="${h(d.id)}">Radera permanent</button>`:d.archived_at?`<button data-life="unarchive" data-doc="${h(d.id)}">Återaktivera</button><button class="danger" data-life="trash" data-doc="${h(d.id)}">Flytta till papperskorgen</button>`:`<button data-life="archive" data-doc="${h(d.id)}">Arkivera motion</button><button class="danger" data-life="trash" data-doc="${h(d.id)}">Flytta till papperskorgen</button>`}</div></details>`:''}</div></div>`).join('')}</div>`;}
function lifeTabs(key,choices){return `<div class="toolbar life-tabs" role="group" aria-label="Dokumentstatus">${choices.map(([value,label])=>`<button class="btn ${state[key]===value?'btn-primary':''}" data-life-tab="${key}" data-view="${value}">${label}</button>`).join('')}</div>`;}
function motionsPage(){const view=state.motionView,docs=view==='active'?state.motions:view==='archived'?state.myArchived:state.myTrash;
 return `${header('Dokumentbibliotek','Mina motioner','Dina utkast, avslutade dokument och papperskorg. Delade motioner förblir samma dokument.','<button class="btn btn-primary" data-new="1">+ Ny motion</button>')}
 <div class="card">${lifeTabs('motionView',[['active','Aktiva'],['archived','Arkiverade'],['trash','Papperskorg']])}
 <div class="split-line"><h2>${view==='active'?'Aktiva dokument':view==='archived'?'Arkiverade dokument':'Papperskorg'}</h2><span class="chip">${(docs||[]).length} dokument</span></div>
 <label class="field"><span>Sök motioner</span><input id="motion-search" value="${h(state.motionSearch||'')}" placeholder="Rubrik, område eller status"></label>
 ${motionList((docs||[]).filter(d=>!state.motionSearch||[d.title,d.category,statuses[d.status]].join(' ').toLowerCase().includes(state.motionSearch.toLowerCase())))}</div>`;}
function sharedPage(){const source=state.sharedView==='archived'?state.sharedArchived:state.shared;
 const filtered=(source||[]).filter(x=>state.sharedTab==='team'?x.team_permission!=='none':x.owner_email!==state.user?.email&&x.directly_shared);
 return `${header('Gemensamt arbete','Våra motioner','Gemensamma motioner visas även för dig som äger dem. Delade med mig visar personliga delningar från andra.')}
 <div class="card">${lifeTabs('sharedView',[['active','Aktiva'],['archived','Arkiverade']])}<div class="toolbar"><button class="btn ${state.sharedTab==='team'?'btn-primary':''}" data-shared-tab="team">Gemensamma motioner</button><button class="btn ${state.sharedTab==='direct'?'btn-primary':''}" data-shared-tab="direct">Delade med mig</button><span class="chip">${filtered.length} dokument</span></div>
 <label class="field"><span>Sök bland delade motioner</span><input id="shared-search" value="${h(state.sharedSearch||'')}" placeholder="Rubrik, ägare, område"></label>
 ${motionList(filtered.filter(d=>!state.sharedSearch||[d.title,d.category,d.owner_name,d.owner_email].join(' ').toLowerCase().includes(state.sharedSearch.toLowerCase())))}</div>`;}

const permLabel={none:'Privat',read:'Kan läsa',comment:'Kan kommentera',edit:'Kan redigera',owner:'Ägare'};
function commentsUi(){return `<section class="card" style="margin-top:20px"><div class="split-line"><h2>Kommentarer</h2><span class="chip">${state.comments.filter(c=>c.status==='open').length} öppna</span></div><p>Intern diskussion. Kommentarerna följer inte med i PDF:en.</p>
${state.comments.length?state.comments.map(c=>`<div class="comment"><strong>${h(c.author_name||c.author_email)}</strong> <small>${h(c.created_at?.slice(0,16).replace('T',' '))} · ${c.status==='resolved'?'Åtgärdad':'Öppen'}</small><p>${h(c.body)}</p>${canEdit()?`<button class="btn btn-sm" data-resolve="${h(c.id)}" data-status="${c.status==='open'?'resolved':'open'}">${c.status==='open'?'Markera åtgärdad':'Öppna igen'}</button>`:''}</div>`).join(''):'<div class="empty">Inga kommentarer ännu.</div>'}
${canComment()?`<form id="comment-form" class="field"><span>Ny kommentar</span><textarea name="body" required maxlength="3000" placeholder="Skriv en synpunkt eller fråga"></textarea><button class="btn btn-primary" type="submit">Kommentera</button></form>`:''}</section>`;}
function canEdit(){if(state.motion?.archived_at||state.motion?.trashed_at)return false;return ['owner','edit'].includes(state.motion?.permission);}
function canComment(){if(state.motion?.archived_at||state.motion?.trashed_at)return false;return ['owner','edit','comment'].includes(state.motion?.permission);}
function shareUi(){const m=state.motion;if(!m?.id||m.trashed_at)return '';if(m.permission!=='owner')return `<div class="a-note">Delning: ${h(permLabel[m.permission]||'Läsbehörighet')}. Ansvarig: ${h(m.owner_name||m.owner_email||'')}</div>`;
const people=state.shares?.shares||[];return `<section class="card share-card"><div class="split-line"><div><h2>Dela motion</h2><p>Privat som standard. Bara du kan ändra delningen.</p></div><span class="chip">Ägare</span></div><form id="share-form"><label class="field"><span>Delning med hela arbetsgruppen</span><select name="team_permission"><option value="none">Privat / ingen gruppåtkomst</option><option value="comment" ${state.shares?.team_permission==='comment'?'selected':''}>Kan läsa och kommentera</option><option value="read" ${state.shares?.team_permission==='read'?'selected':''}>Kan läsa</option><option value="edit" ${state.shares?.team_permission==='edit'?'selected':''}>Kan läsa, kommentera och redigera</option></select></label>
<div class="section-title"><h3>Utvalda användare</h3><span class="muted">Ange rättighet per person</span></div>${state.directory.filter(u=>u.email!==state.user.email).map(u=>{const found=people.find(v=>v.email===u.email);return `<label class="share-person"><span>${h(u.display_name||u.email)} <small>${h(u.email)}</small></span><select data-share-email="${h(u.email)}"><option value="none">Ingen delning</option>${['read','comment','edit'].map(per=>`<option value="${per}" ${found?.permission===per?'selected':''}>${permLabel[per]}</option>`).join('')}</select></label>`;}).join('')||'<p>Inga andra godkända användare finns ännu.</p>'}
<button class="btn btn-primary" type="submit">Spara delning</button></form></section>`;}
function reviewMotion(m){let r=[];if(!m.title?.trim())r.push(['warn','Saknar rubrik.']);if(!m.problem?.trim()&&!m.motivation?.trim())r.push(['warn','Beskriv bakgrund och motivering.']);const cs=(m.clauses||[]).filter(s=>String(s).trim());if(!cs.length)r.push(['warn','Lägg till minst en att-sats.']);else if(cs.length>3)r.push(['warn','Fler än tre att-satser. Överväg att förenkla eller dela motionen.']);else r.push(['ok',`${cs.length} att-sats${cs.length>1?'er':''} – rimlig omfattning.`]);for(const c of cs)if(c.trim().split(/\s+/).length>37)r.push(['warn','En att-sats är ovanligt lång och kan behöva delas eller förenklas.']);if(!m.signer?.trim())r.push(['warn','Ange motionärens namn.']);r.push(['warn','Kontrollera själv kommunal kompetens, kostnader, tidigare beslut och valbar inlämningsrutin. Dessa frågor verifieras inte automatiskt.']);return r;}
function clauseUi(){let list=state.motion?.clauses||[];return `${list.map((c,i)=>`<div class="clause-item"><span class="clause-no">${i+1}.</span><textarea data-clause="${i}" aria-label="Att-sats ${i+1}" placeholder="att ...">${h(c)}</textarea><button class="btn btn-sm btn-danger" data-clause-del="${i}" aria-label="Ta bort att-sats ${i+1}">×</button></div>`).join('')}`;}
function renderPaper(m,variant=state.pdfVariant){const sd=variant==='sd';return `<div class="paper ${sd?'paper-blue':'paper-neutral'}"><div class="paper-letterhead">${sd?(state.logoDataUri?`<img src="${state.logoDataUri}" alt="Godkänd partilogotyp" class="paper-logo">`:'')+`<div class="paper-brand"><strong>Sverigedemokraterna</strong><span>LEKEBERG</span></div>`:'<div class="paper-brand"><span>FORMELL MOTION</span></div>'}</div><div class="paper-overline">Motion till Lekebergs kommunfullmäktige</div><h2>${h(m.title||'Rubrik på motionen')}</h2>${m.problem?`<p>${h(m.problem)}</p>`:'<p style="color:#a0aaba">Bakgrund...</p>'}${m.motivation?`<p>${h(m.motivation)}</p>`:''}${m.proposal?`<p>${h(m.proposal)}</p>`:''}<div class="decision">Förslag till beslut</div><div class="clauses">${(m.clauses||[]).filter(Boolean).map((c,i)=>`<p><span class="clause-prefix">${i+1}.</span> ${h(/^att\s/i.test(c)?c:'att '+c)}</p>`).join('')||'<p style="color:#a0aaba">att ...</p>'}</div><p class="signature">${m.date?'Lekeberg, '+h(m.date):''}<br>${h(m.signer||'Motionärens namn').replace(/\n/g,'<br>')}<br>${h(m.party||'Partibeteckning')}</p><div class="paper-footer">${sd?'SVERIGEDEMOKRATERNA LEKEBERG':''}</div></div>`;}
function editorPage(){const m=state.motion;if(!m)return `${header('Motionsverkstad','Skapa en motion','Använd guiden för att skapa ett nytt utkast.') }<button class="btn btn-yellow" data-new="1">Börja skriva</button>`;
return `${header('Motionsverkstad',m.id?'Redigera motion':'Ny motion','Fyll i det du vet. Texten är fullt redigerbar och sparas till ditt privata dokumentbibliotek.')}
<div class="toolbar">${m.archived_at||m.trashed_at?`<span class="chip">${m.trashed_at?'I papperskorgen':'Arkiverad – skrivskyddad'}</span>`:''}${canEdit()?'<button class="btn btn-primary" id="save-motion">Spara nu</button>':''}<label class="sr-only" for="pdf-template">PDF-mall</label><select id="pdf-template" class="pdf-template" aria-label="PDF-mall"><option value="sd" ${state.pdfVariant==='sd'?'selected':''}>SD Lekeberg</option><option value="neutral" ${state.pdfVariant==='neutral'?'selected':''}>Neutral mall</option></select><button class="btn" id="export-motion">${icons.download} Exportera PDF</button><button class="btn" id="duplicate-motion">Duplicera</button>${m.permission==='owner'?`<button class="btn" id="archive-motion">${m.trashed_at?'Återställ från papperskorgen':m.archived_at?'Återaktivera':'Arkivera motion'}</button>${!m.trashed_at?'<button class="btn btn-danger" id="trash-motion">Papperskorg</button>':'<button class="btn btn-danger" id="purge-motion">Radera permanent</button>'}`:''}${m.id?'<button class="btn" id="versions-motion">Tidigare versioner</button>':''}<span class="saving" id="save-status">${state.dirty?'Ändringar inte sparade':'Alla ändringar sparade'}</span></div>
${m.permission!=='owner'?`<div class="a-note">${h(permLabel[m.permission]||'Läsbehörighet')} – ägare: ${h(m.owner_name||m.owner_email||'')}. ${canEdit()?'Du kan redigera och kommentera.':canComment()?'Du kan kommentera men inte redigera texten.':'Du kan endast läsa och exportera dokumentet.'}</div>`:''}<div class="a-note">Lekebergs riktlinjer kräver tydliga, självständiga att-satser. Verktyget rekommenderar normalt 1–2, men ingen juridisk maxgräns gäller. Kontrollera sakuppgifter och låt alltid motionären godkänna sluttexten.</div>
<div class="editor-layout"><section class="card"><h2>1. Grunduppgifter</h2>
<label class="field"><span>Rubrik</span><input data-field="title" maxlength="160" value="${h(m.title)}" placeholder="Kort och konkret beskrivning"></label>
<div class="formgrid"><label class="field"><span>Ämnesområde</span><select data-field="category">${cats.map(c=>`<option ${m.category===c?'selected':''}>${h(c)}</option>`).join('')}</select></label><label class="field"><span>Status</span><select data-field="status">${Object.entries(statuses).map(([v,t])=>`<option value="${v}" ${m.status===v?'selected':''}>${t}</option>`).join('')}</select></label></div>
<div class="section-title"><h3>2. Bakgrund och motivering</h3></div><label class="field"><span>Vilket problem vill du lösa?</span><textarea class="big" data-field="problem" placeholder="Vad är problemet? Vem berörs? Varför behöver kommunen agera?">${h(m.problem)}</textarea></label>
<label class="field"><span>Varför behövs förändringen?</span><textarea class="big" data-field="motivation" placeholder="Saklig motivering och eventuella källor. Ange inte osäker information som fakta.">${h(m.motivation)}</textarea></label>
<label class="field"><span>Vad vill du uppnå? <span class="hint">Valfritt separat stycke</span></span><textarea data-field="proposal" placeholder="Beskriv åtgärden. Själva beslutet formuleras nedan.">${h(m.proposal)}</textarea></label>
<div class="section-title"><h3>3. Förslag till beslut</h3><button class="btn btn-sm" id="add-clause">+ Lägg till att-sats</button></div><div id="clause-fields">${clauseUi()}</div>
<div class="section-title"><h3>4. Undertecknare och uppföljning</h3></div><div class="formgrid"><label class="field"><span>Motionärens namn</span><textarea data-field="signer" rows="2" placeholder="En motionär per rad">${h(m.signer)}</textarea></label><label class="field"><span>Partibeteckning</span><input data-field="party" value="${h(m.party)}"></label><label class="field"><span>Datum</span><input data-field="date" type="date" value="${h(m.date)}"></label><label class="field"><span>Ärendenummer <span class="hint">Om sådant finns</span></span><input data-field="reference" value="${h(m.reference)}"></label></div>
<label class="field"><span>Egna arbetsanteckningar <span class="hint">Skrivs inte ut i PDF</span></span><textarea data-field="notes">${h(m.notes)}</textarea></label></section>
<aside class="card preview"><h2>Dokumentförhandsgranskning</h2><p>A4-inspirerad förhandsgranskning. PDF-filen kan ha andra sidbrytningar vid längre texter.</p><div id="live-paper">${renderPaper(m)}</div><div id="motion-review">${reviewUi(m)}</div><p class="muted" style="font-size:11px">Kontrollera fakta och formalia innan motionen lämnas in.</p></aside></div><div class="collab-grid">${shareUi()}${commentsUi()}</div>`;}
function reviewUi(m){return `<div class="review"><h3>Kvalitetskontroll</h3>${reviewMotion(m).map(([k,msg])=>`<p class="${k}">${k==='ok'?'✓':'!'} ${h(msg)}</p>`).join('')}</div>`;}
const ideaStatuses={ny:'Ny idé',diskussion:'Under diskussion',underlag:'Behöver underlag',redo:'Redo för motion',motion:'Motion påbörjad',avslutad:'Avslutad'};
function ideasPage(){const current=state.ideas.filter(x=>state.ideaView==='all'||(state.ideaView==='closed'?x.status==='avslutad':x.status!=='avslutad'));
 return `${header('Gemensam idébank','Våra idéer','Alla godkända användare kan lägga till idéer, diskutera och utveckla dem till motioner. Förslag blir inte automatiskt förankrade ställningstaganden.')}
<div class="card"><h2>Registrera en idé</h2><form id="idea-form"><div class="formgrid"><label class="field"><span>Rubrik</span><input name="title" required maxlength="160"></label><label class="field"><span>Ämnesområde</span><select name="category">${cats.map(c=>`<option>${h(c)}</option>`).join('')}</select></label></div><label class="field"><span>Vilket problem behöver undersökas?</span><textarea name="problem" required></textarea></label><label class="field"><span>Förslag på åtgärd</span><textarea name="action"></textarea></label><label class="field"><span>Verifierad källänk (valfritt)</span><input name="source_url" type="url"></label><button class="btn btn-primary" type="submit">Publicera i Våra idéer</button></form></div>
<div class="toolbar life-tabs" role="group" aria-label="Filtrera idéer">${[['active','Aktiva idéer'],['closed','Avslutade idéer'],['all','Alla idéer']].map(([v,l])=>`<button class="btn ${state.ideaView===v?'btn-primary':''}" data-idea-view="${v}">${l} (${v==='all'?state.ideas.length:v==='active'?state.ideas.filter(x=>x.status!=='avslutad').length:state.ideas.filter(x=>x.status==='avslutad').length})</button>`).join('')}</div>
 <div class="toolbar"><label class="field" style="flex:1"><span>Sök bland idéer</span><input id="idea-search" value="${h(state.ideaSearch||'')}" placeholder="Sök rubrik, problem eller område"></label></div>
${current.filter(x=>!state.ideaSearch||[x.title,x.problem,x.action,x.category].join(' ').toLowerCase().includes(state.ideaSearch.toLowerCase())).map(x=>`<div class="card idea-card"><div class="split-line"><h3>${h(x.title)}</h3><span class="chip">${h(ideaStatuses[x.status]||'Ny idé')}</span></div><p class="muted">${h(x.category)} · Ansvarig: ${h(x.owner_name||x.owner_email||'Äldre gemensamt förslag')}</p><p>${h(x.problem)}</p><p><strong>Möjlig åtgärd:</strong> ${h(x.action)}</p>${/^https:\/\//.test(x.source_url)?`<p><a href="${h(x.source_url)}" target="_blank" rel="noopener noreferrer">Granska källa ↗</a></p>`:''}
<div class="toolbar"><button class="btn btn-sm" data-idea="${h(x.id)}">Skapa motion av idé</button><button class="btn btn-sm" data-idea-comments="${h(x.id)}">Kommentarer (${Number(x.comment_count)||0})</button>${x.owner_email===state.user.email||state.user.role==='admin'?`<select aria-label="Idéstatus" data-idea-status="${h(x.id)}">${Object.entries(ideaStatuses).map(([k,v])=>`<option value="${k}" ${x.status===k?'selected':''}>${h(v)}</option>`).join('')}</select>`:''}</div>
${state.selectedIdea===x.id?`<div class="idea-thread"><h4>Motioner med koppling till idén</h4>${state.ideaLinks.length?state.ideaLinks.map(m=>`<p><button class="btn btn-sm" data-open="${h(m.id)}">${h(m.title)} – ${h(statuses[m.status]||'Utkast')}</button></p>`).join(''):'<p class="muted">Inga länkade motioner som du har åtkomst till.</p>'}<h4>Statushistorik</h4>${state.ideaHistory.length?state.ideaHistory.map(y=>`<p class="muted">${h(y.changed_at.slice(0,16).replace('T',' '))}: ${h(ideaStatuses[y.old_status]||y.old_status)} → ${h(ideaStatuses[y.new_status]||y.new_status)} (${h(y.editor_email)})</p>`).join(''):'<p class="muted">Inga tidigare statusbyten registrerade.</p>'}<h4>Diskussion</h4>${state.ideaComments.map(c=>`<div class="comment"><strong>${h(c.author_name||c.author_email)}</strong><small>${h(c.created_at?.slice(0,16).replace('T',' '))}</small><p>${h(c.body)}</p></div>`).join('')||'<p>Inga kommentarer ännu.</p>'}<form id="idea-comment-form" data-id="${h(x.id)}"><label class="field"><span>Kommentera idén</span><textarea required name="body" maxlength="3000"></textarea></label><button class="btn btn-primary" type="submit">Spara kommentar</button></form></div>`:''}</div>`).join('')||'<div class="card empty">Inga idéer motsvarar sökningen ännu.</div>'}`;}

const caseStatuses={nytt:'Nytt',granskning:'Under granskning',stallningstagande:'Ställningstagande',beslutat:'Beslutat',uppfoljning:'Uppföljning',avslutat:'Avslutat'};
const caseFields=[
 ['summary','Ärendet och bakgrunden','Vad handlar ärendet om? Skilj underlag från egna bedömningar.'],
 ['alternatives','Alternativ och nollalternativ','Vilka handlingsalternativ finns, inklusive att inte förändra något?'],
 ['finances','Ekonomiska konsekvenser','Budget/utfall, investerings- och driftskostnader, finansiering och långsiktig effekt.'],
 ['risks','Risker och konsekvenser','Risk, sannolikhet, konsekvens och möjliga motåtgärder.'],
 ['questions','Frågor till förvaltningen','Vad behöver kompletteras eller kontrolleras före beslut?'],
 ['recommendation','Förslag till ställningstagande','Arbetsförslag, inte ett officiellt partiyttrande. Texten blir synlig för andra om ärendet delas.'],
 ['decision','Beslut / faktiskt utfall','Fyll i efter att beslut har fattats. Ange beslutskälla.'],
 ['follow_up','Uppföljning och ansvar','Vad ska följas upp, av vem och när?'],
 ['sources','Källor och dokumentreferenser','Ange dokumenttitel, datum, sidnummer eller URL.']
];
const caseEmpty=()=>({title:'',committee:'Kommunfullmäktige',status:'nytt',meeting_date:'',labels:[],scope:'mine',assignee_email:null,meeting_notes:'',is_owner:true,can_edit:true,motion_id:null,file_id:null,...Object.fromEntries(caseFields.map(([key])=>[key,'']))});
async function loadCases(){const result=await api('/api/private/cases');state.caseItems=result.cases||[];}
async function loadCaseComments(id){
 if(!id){state.caseComments=[];return;}
 const result=await api('/api/private/cases/'+id+'/comments');state.caseComments=result.comments||[];
}
async function loadCaseDirectory(){
 try{state.caseDirectory=(await api('/api/private/directory')).users||[];}
 catch(e){state.caseDirectory=[];toast('Användarlistan kunde inte laddas: '+e.message,true);}
}
async function loadCaseFiles(){
 try{const data=await api('/api/private/files?scope=mine');state.caseFiles=data.files||[];}
 catch(e){state.caseFiles=[];toast('Dokumentarkivet kan inte läsas: '+e.message,true);}
}
function casePrintPage(c){
 const fields=caseFields.filter(([k])=>c[k]).map(([k,label])=>'<section><h2>'+h(label)+'</h2><p>'+h(c[k])+'</p></section>').join('');
 const motion=state.motions.find(m=>m.id===c.motion_id),file=state.caseFiles.find(f=>f.id===c.file_id);
 const attachments=[motion?'Egen motion: '+(motion.title||'Namnlös motion'):'',file?'Privat fil: '+file.name:''].filter(Boolean);
 const linked=attachments.length?'<section><h2>Kopplade handlingar</h2><p>'+attachments.map(h).join(' · ')+'</p><small>Handlingarnas innehåll ingår inte automatiskt i denna utskrift.</small></section>':'';
 return '<article class="case-print" id="case-print"><div class="case-print-head"><small>POLITIKVERKSTAN · INTERNT ARBETSUNDERLAG</small><h1>'+h(c.title)+'</h1><p>'+h(c.committee)+' · '+h(caseStatuses[c.status]||'Utkast')+(c.meeting_date?' · Möte '+h(c.meeting_date):'')+'</p><p class="case-private-marker">Arbetsmaterial. Personliga mötesanteckningar ingår inte. Ej kommunalt beslutsprotokoll eller officiellt partiyttrande.</p></div>'+linked+fields+
 '<p class="case-print-foot">Sammanställt i Politikverkstan. Verifiera källor, belopp och beslutsstatus före extern användning.</p></article>';
}

function casesPage(){
 const filtered=state.caseItems.filter(c=>
  (state.caseVisibility==='all'||(state.caseVisibility==='mine'?c.scope!=='team'&&c.is_owner:c.scope==='team'))&&
  (state.caseFilter==='all'||c.status===state.caseFilter)&&
  (!state.caseSearch||[c.title,c.committee,c.status,c.summary,c.questions,...(c.labels||[])].join(' ').toLocaleLowerCase('sv-SE').includes(state.caseSearch.toLocaleLowerCase('sv-SE')))
 );
 const selected=state.caseCurrent;
 const editable=selected?.can_edit!==false,owner=selected?.is_owner!==false;
 return `
  ${header('ÄRENDEN & MÖTESFÖRBEREDELSER','Mina och våra ärenden','Egna ärenden är privata tills du delar dem uttryckligen. Gruppens godkända användare kan läsa och kommentera delade ärenden. Personliga anteckningar delas aldrig.','<button class="btn btn-primary" id="case-new">'+icons.plus+' Nytt ärende</button>')}
  <section class="case-layout">
   <div class="card case-list-pane">
    <div class="case-scope-tabs" role="group" aria-label="Ärendetyp">${[['all','Alla'],['mine','Mina privata'],['team','Våra gemensamma']].map(([v,label])=>`<button type="button" class="btn btn-sm ${state.caseVisibility===v?'btn-primary':''}" data-case-visibility="${v}">${label}</button>`).join('')}</div>
    <div class="case-list-controls">
     <label class="field"><span>Sök ärenden och etiketter</span><input id="case-search" value="${h(state.caseSearch)}" placeholder="Rubrik, nämnd, etikett eller fråga" autocomplete="off"></label>
     <label class="field"><span>Status</span><select id="case-filter"><option value="all">Alla statusar</option>${Object.entries(caseStatuses).map(([k,v])=>`<option value="${k}" ${state.caseFilter===k?'selected':''}>${h(v)}</option>`).join('')}</select></label>
    </div>
    <div class="case-results" aria-live="polite">${filtered.length?filtered.map(c=>`<button type="button" class="case-result ${selected?.id===c.id?'selected':''}" data-case-open="${h(c.id)}">
     <strong>${h(c.title)}</strong>
     <span class="case-scope-label">${c.scope==='team'?'Gemensamt ärende':'Privat ärende'}${c.scope==='team'&&c.assignee_email?' · Ansvarig: '+h(c.assignee_email):''}</span>
     <small>${h(c.committee)} · ${h(caseStatuses[c.status]||c.status)}${c.meeting_date?' · '+h(c.meeting_date):''}</small><span class="case-tags">${(c.labels||[]).map(x=>`<span>${h(x)}</span>`).join('')}</span>
    </button>`).join(''):'<p class="empty">Inga ärenden motsvarar urvalet. Skapa ett nytt ärende för att börja.</p>'}</div>
   </div>
   <div class="case-editor-pane">${selected?`
    <form id="case-form" class="card case-editor">
     <div class="case-edit-head"><div><span class="eyebrow">${selected.scope==='team'?'GEMENSAMT ARBETSMATERIAL':'PRIVAT ARBETSMATERIAL'}</span><h2>${selected.id?'Ärende':'Nytt ärende'}</h2></div>
      <span class="chip">${selected.id?'Version '+selected.revision:'Ej sparat'}</span></div>
     <p class="case-hint">${selected.id?'Ägare: '+h(selected.owner_email||state.user.email)+(selected.assignee_email?' · Ansvarig: '+h(selected.assignee_email):''):'Det nya ärendet är privat tills du själv delar det.'}</p>
     <fieldset class="case-main-fields" ${editable?'':'disabled'}>
      <div class="formgrid">
       <label class="field"><span>Ärenderubrik</span><input name="title" required maxlength="160" value="${h(selected.title)}"></label>
       <label class="field"><span>Nämnd / instans</span><select name="committee">${['Kommunfullmäktige','Kommunstyrelsen','Barn- och utbildningsnämnden','Socialnämnden','Bygg- och miljönämnden','Valnämnden','Sydnärkes IT-nämnd','Sydnärkes miljö- och byggnämnd','Annat'].map(v=>`<option ${selected.committee===v?'selected':''}>${h(v)}</option>`).join('')}</select></label>
       <label class="field"><span>Status</span><select name="status">${Object.entries(caseStatuses).map(([v,k])=>`<option value="${v}" ${selected.status===v?'selected':''}>${h(k)}</option>`).join('')}</select></label>
       <label class="field"><span>Mötesdatum (om känt)</span><input name="meeting_date" type="date" value="${h(selected.meeting_date||'')}"></label>
      </div>
      <label class="field"><span>Etiketter (högst åtta, högst 30 tecken per etikett)</span><input name="labels" value="${h((selected.labels||[]).join(', '))}" placeholder="Budget, BUN, skolskjuts"></label>
      ${owner?`<div class="formgrid">
       <label class="field"><span>Koppla egen motion</span><select name="motion_id"><option value="">Ingen motion</option>${state.motions.filter(m=>!m.trashed_at).map(m=>`<option value="${h(m.id)}" ${selected.motion_id===m.id?'selected':''}>${h(m.title||'Namnlös motion')}</option>`).join('')}</select></label>
       <label class="field"><span>Koppla privat fil</span><select name="file_id"><option value="">Ingen fil</option>${state.caseFiles.filter(f=>f.scope==='mine').map(f=>`<option value="${h(f.id)}" ${selected.file_id===f.id?'selected':''}>${h(f.name)}</option>`).join('')}</select></label>
      </div>`:'<p class="case-hint">Ägarens privata fil- och motionskopplingar är inte tillgängliga för övriga.</p>'}
      ${owner&&selected.motion_id&&state.motions.some(x=>x.id===selected.motion_id)?`<p><button class="btn btn-sm" type="button" data-open="${h(selected.motion_id)}">Öppna kopplad motion ${icons.arrow}</button></p>`:''}
      ${owner&&selected.file_id&&state.caseFiles.some(x=>x.id===selected.file_id)?`<p><a class="btn btn-sm" href="/api/private/files/${encodeURIComponent(selected.file_id)}/download">Hämta kopplad privat fil ${icons.download}</a></p>`:''}
      ${caseFields.map(([key,label,tip])=>`<label class="field"><span>${h(label)}</span><small class="case-hint">${h(tip)}</small><textarea name="${key}" maxlength="${key==='summary'?6000:key==='recommendation'||key==='decision'||key==='follow_up'||key==='sources'?3500:4500}" rows="3">${h(selected[key]||'')}</textarea></label>`).join('')}
     </fieldset>
     <div class="case-form-actions">
      ${editable?`<button class="btn btn-primary" type="submit">${icons.write} Spara ärendet</button>`:'<p class="case-hint">Du kan läsa och kommentera. Bara ägaren eller utsedd ansvarig får redigera.</p>'}
      ${selected.id?`<button class="btn" type="button" id="case-print-btn">${icons.download} Skriv ut / spara som PDF</button>`:''}
      ${selected.id&&owner?`<button class="btn btn-danger" type="button" id="case-delete">Ta bort</button>`:''}
      <span class="case-save-info" id="case-save-info" role="status">${state.caseDirty?'Osparade ändringar':''}</span>
     </div>
    </form>
    ${selected.id&&owner?`<section class="card case-sharing">
     <h2>Delning och ansvar</h2>
     <p>Privat är standard. Om du väljer gemensamt kan alla aktiva, godkända konton i SD Lekebergs Arbetsyta läsa och kommentera ärendet. Utsedd ansvarig får också redigera. Privata anteckningar, filer och egna motioner delas inte automatiskt.</p>
     <form id="case-sharing-form">
      <div class="formgrid">
       <label class="field"><span>Åtkomst</span><select name="scope"><option value="mine" ${selected.scope!=='team'?'selected':''}>Privat (bara jag)</option><option value="team" ${selected.scope==='team'?'selected':''}>Gemensamt (alla godkända användare)</option></select></label>
       <label class="field"><span>Ansvarig för delat ärende</span><select name="assignee_email"><option value="">Ingen utsedd ansvarig</option>${state.caseDirectory.filter(u=>u.email!==state.user.email).map(u=>`<option value="${h(u.email)}" ${selected.assignee_email===u.email?'selected':''}>${h(u.display_name||u.email)}</option>`).join('')}</select></label>
      </div><button type="submit" class="btn">Spara delning och ansvar</button>
     </form></section>`:''}
    ${selected.id?`<section class="card case-private-notes"><h2>Mina personliga mötesanteckningar</h2><p>Syns bara för dig, även när ärendet är gemensamt. Ingår inte i beslutsunderlagets utskrift.</p>
     <form id="case-note-form"><label class="field"><span>Mina anteckningar</span><textarea name="meeting_notes" maxlength="4500" rows="4">${h(selected.meeting_notes||'')}</textarea></label><button class="btn" type="submit">Spara mina privata anteckningar</button><span id="case-note-info" class="case-save-info" role="status">${state.caseNoteDirty?'Osparade anteckningar':''}</span></form>
    </section>
    <section class="card case-discussion"><h2>Ärendediskussion</h2><p>Kommentarer i gemensamma ärenden är synliga för alla godkända användare. Kommentarer i privata ärenden ser bara ägaren.</p>
     <div class="case-comments">${state.caseComments.map(c=>`<div class="case-comment"><div><strong>${h(c.author_name||c.author_email)}</strong><small>${h((c.created_at||'').slice(0,16).replace('T',' '))}</small></div><p>${h(c.body)}</p></div>`).join('')||'<p class="case-hint">Inga kommentarer ännu.</p>'}</div>
     <form id="case-comment-form"><label class="field"><span>Ny kommentar</span><textarea name="body" required maxlength="3000" rows="3"></textarea></label><button class="btn btn-primary" type="submit">Publicera kommentar</button></form>
    </section>
    ${workflowCaseSections(selected)}
    ${casePrintPage(selected)}`:''}
   `:'<div class="card case-empty"><h2>Välj ett ärende</h2><p>Öppna ett ärende till vänster eller skapa ett nytt. Privata ärenden och anteckningar visas aldrig på den publika sidan.</p></div>'}</div>
  </section>
 `;
}

function usersPage(){if(state.user?.role!=='admin')return '<p>Åtkomst nekad</p>';return `${header('Administration','Användare','Ge behörighet till enskilda personer. De måste även tillåtas i Cloudflare Access för att kunna logga in.')}
<div class="card"><h2>Lägg till användare</h2><form id="user-form" class="formgrid"><label class="field"><span>Namn</span><input name="name" maxlength="120" required></label><label class="field"><span>E-postadress</span><input name="email" type="email" required></label><label class="field"><span>Behörighet</span><select name="role"><option value="user">Standardanvändare</option><option value="admin">Administratör</option></select></label><div style="align-self:center"><button type="submit" class="btn btn-primary">Godkänn användare</button></div></form></div><div class="card"><h2>Godkända konton</h2><div style="overflow:auto"><table class="admin-table"><thead><tr><th>E-postadress</th><th>Namn</th><th>Roll</th><th>Status</th><th>Åtgärd</th></tr></thead><tbody>${state.users.map(u=>`<tr><td>${h(u.email)}</td><td><input class="account-name" data-name="${h(u.email)}" maxlength="120" value="${h(u.display_name)}" aria-label="Visningsnamn för ${h(u.email)}"></td><td><select data-role="${h(u.email)}"><option value="user" ${u.role==='user'?'selected':''}>Användare</option><option value="admin" ${u.role==='admin'?'selected':''}>Admin</option></select></td><td>${u.active?'Aktiv':'Inaktiv'}</td><td><button class="btn btn-sm" data-update="${h(u.email)}">Spara roll</button> <button class="btn btn-sm" data-save-name="${h(u.email)}">Spara namn</button> <button class="btn btn-sm ${u.active?'btn-danger':''}" data-active="${h(u.email)}">${u.active?'Inaktivera':'Aktivera'}</button></td></tr>`).join('')}</tbody></table></div></div><div class="card"><h2>Dokumentprofil – logotyp</h2><p>Ladda upp en godkänd SD-logotyp som PNG (max 250 KB). Bilden används endast i SD-motionsmallen. Kontrollera att du har rätt att använda filen.</p><label class="field"><span>Logotyp PNG</span><input type="file" id="branding-file" accept="image/png"></label><div class="toolbar"><button class="btn btn-primary" id="branding-save">Spara logotyp</button><button class="btn" id="branding-remove">Ta bort logotyp</button></div>${state.logoDataUri?`<img src="${state.logoDataUri}" alt="Aktuell logotyp" style="max-height:78px;max-width:160px;object-fit:contain">`:'<p class="muted">Ingen logotyp uppladdad. PDF-mallen visar endast text.</p>'}</div><div class="a-note">En användare behöver både ett aktivt konto här och en tillåtande policy i Cloudflare Access. Ändringar i Access kan behöva göras separat.</div>`;}
async function openTab(tab,fromHistory=false){if(!fromHistory&&tab!=='cases'&&!caseSafeToLeave())return;
 if(!fromHistory&&tab!=='meetings'&&!meetingSafeToLeave())return;
 if(tab!=='cases'){state.caseDirty=false;state.caseNoteDirty=false;state.caseCurrent=null;state.caseComments=[];}
 if(tab!=='meetings'){state.meetingDirty=false;state.meetingNoteDirty=false;state.meetingCurrent=null;state.meetingAgenda=[];state.meetingItemEdit=null;}
 if(state.dirty&&state.motion){try{await saveMotion(false);}catch(e){toast('Kunde inte spara dokumentet före navigering: '+e.message,true);return;}}
 state.tab=tab;if(tab==='overview'){await loadDashboard();}if(tab==='meetings'){try{await loadMeetings();await loadCases();}catch(e){state.tab='overview';render();toast('Sammanträden kunde inte öppnas. '+e.message,true);return;}}if(tab==='meetings')await loadOfficialCalendar();if(tab==='cases'){try{await loadCases();await loadCaseFiles();await loadCaseDirectory();}catch(e){state.tab='overview';render();toast('Ärendehanteringen kunde inte öppnas. '+e.message,true);return;}}if(tab==='ideas')await loadIdeas();if(tab==='shared')await loadShared();if(tab==='files')await loadFiles();if(tab==='users'&&state.user?.role==='admin')await loadUsers();if(!fromHistory)recordWorkView();render();window.scrollTo(0,0);
}
async function createMotion(initial){try{const doc=await api('/api/private/motions','POST',{...newMotion(),...initial});state.motion=doc;state.tab='editor';state.dirty=false;await loadMotions();await openMotion(doc.id);}catch(e){toast(e.message,true);}}
async function openMotion(id,fromHistory=false){if(!caseSafeToLeave()||!meetingSafeToLeave())return;state.caseDirty=false;state.caseNoteDirty=false;try{const r=await api('/api/private/motions/'+id);state.motion=r.motion;state.dirty=false;state.shares=null;state.comments=[];if(r.motion.permission==='owner'){try{state.shares=await api('/api/private/motions/'+id+'/shares');state.directory=(await api('/api/private/directory')).users;}catch(e){toast('Delningsinställningar kunde inte laddas: '+e.message,true);}}state.comments=(await api('/api/private/motions/'+id+'/comments')).comments;state.tab='editor';if(!fromHistory)recordWorkView();render();window.scrollTo(0,0);}catch(e){toast(e.message,true);}}
async function loadShared(){try{state.shared=(await api('/api/private/motions?scope=shared')).motions;state.sharedArchived=(await api('/api/private/motions?scope=shared&lifecycle=archived')).motions;}catch(e){toast(e.message,true);}}
async function loadMotions(){try{state.motions=(await api('/api/private/motions')).motions;state.myArchived=(await api('/api/private/motions?scope=mine&lifecycle=archived')).motions;state.myTrash=(await api('/api/private/motions?scope=mine&lifecycle=trash')).motions;}catch(e){toast(e.message,true);}}
async function loadIdeas(){try{state.ideas=(await api('/api/private/ideas')).ideas;}catch(e){toast(e.message,true);}}
async function loadUsers(){try{state.users=(await api('/api/private/users')).users;}catch(e){toast(e.message,true);}}
function markDirty(){state.editSeq=(state.editSeq||0)+1;state.dirty=true;const lbl=$('save-status');if(lbl)lbl.textContent='Ändringar inte sparade';clearTimeout(state.saveTimer);state.saveTimer=setTimeout(()=>saveMotion(false).catch(e=>toast('Autosparning misslyckades: '+e.message,true)),1800);updatePreview();}
function updatePreview(){if($('live-paper'))$('live-paper').innerHTML=renderPaper(state.motion);if($('motion-review'))$('motion-review').innerHTML=reviewUi(state.motion);}
async function saveMotion(show=true){
 clearTimeout(state.saveTimer);
 if(state.savePending){await state.savePending;if(!state.dirty){if(show)toast('Ändringarna är sparade.');return;}}
 if(!state.motion?.id||!state.dirty){if(show)toast('Inga osparade ändringar');return;}
 if(!canEdit())throw Error('Du saknar redigeringsbehörighet');
 const doc=state.motion,seq=state.editSeq||0,payload={...doc,clauses:doc.clauses.slice(),revision:doc.revision};
 const status=$('save-status');if(status)status.textContent='Sparar…';
 const promise=api('/api/private/motions/'+doc.id,'PUT',payload);state.savePending=promise;
 try{
  const r=await promise;doc.revision=r.revision;doc.updated_at=r.updated_at;
  if(seq===state.editSeq){state.dirty=false;if(status)status.textContent='Sparad '+new Date().toLocaleTimeString('sv-SE');}
  else{state.dirty=true;if(status)status.textContent='Nya ändringar väntar på sparning';clearTimeout(state.saveTimer);state.saveTimer=setTimeout(()=>saveMotion(false).catch(e=>toast(e.message,true)),550);}
  await loadMotions();if(show)toast('Motionen sparades.');
 }finally{state.savePending=null;}
}
async function lifecycle(id,action){try{
 if(state.dirty&&state.motion?.id===id)await saveMotion(false);
 if(action==='trash'&&!confirm('Flytta motionen till papperskorgen? Om den är delad försvinner den från andra användares vanliga listor.'))return;
 if(action==='purge'){
   const answer=prompt('Permanent radering tar bort motionen, versioner och kommentarer och kan inte ångras. Skriv RADERA för att fortsätta:');
   if(answer!=='RADERA')return;
   await api('/api/private/motions/'+id+'/purge','POST',{confirm:'RADERA'});
 }else await api('/api/private/motions/'+id+'/lifecycle','POST',{action});
 await loadMotions();await loadShared();
 if(state.motion?.id===id){if(action==='purge'||action==='trash'){state.motion=null;state.tab='motions';state.motionView=action==='trash'?'trash':'active';}
 else {state.motion=(await api('/api/private/motions/'+id)).motion;}}
 render();toast({archive:'Motionen arkiverades.',unarchive:'Motionen återaktiverades.',trash:'Motionen flyttades till papperskorgen.',restore:'Motionen återställdes.',purge:'Motionen raderades permanent.'}[action]);
 }catch(e){toast(e.message,true);}}

function folderPath(id){
 const names=[],used=new Set();let cur=id;
 while(cur&&!used.has(cur)){used.add(cur);const row=state.folders.find(f=>f.id===cur);if(!row)break;names.unshift(row.name);cur=row.parent_id;}
 return names.join(' / ');
}
function filesPage(){
 const scope=state.fileScope,here=state.fileFolder;
 const query=(state.fileSearch||'').toLocaleLowerCase('sv-SE').trim();
 const dirs=query?[]:state.folders.filter(f=>f.parent_id===here);
 const docs=state.files.filter(f=>(query?f.name.toLocaleLowerCase('sv-SE').includes(query):f.folder_id===here));
 const crumbs=[],seen=new Set();let cursor=here;
 while(cursor&&!seen.has(cursor)){seen.add(cursor);const f=state.folders.find(x=>x.id===cursor);if(!f)break;crumbs.unshift(f);cursor=f.parent_id;}
 return `${header('FILHANTERING','Dokumentarkiv','Lagra egna handlingar, PDF-exporter och gemensamma dokument. Mina dokument är privata. Våra dokument är tillgängliga för alla godkända användare.')}
 <section class="card file-area">
  <label class="field"><span>Sök filer i alla mappar inom valt filområde</span><input id="file-search" value="${h(state.fileSearch||'')}" placeholder="Sök dokumentnamn och filtyper" autocomplete="off"></label>
  <div class="toolbar file-scope-tabs"><button class="btn ${scope==='mine'?'btn-primary':''}" data-file-scope="mine">Mina dokument</button><button class="btn ${scope==='team'?'btn-primary':''}" data-file-scope="team">Våra dokument</button></div>
  ${scope==='team'?'<p class="file-warning">Observera: Alla aktiva och godkända användare i arbetsrummet kan se och ladda ned filer här. Lägg inte privata handlingar i denna filarea.</p>':'<p class="muted">Den här filarean är privat och syns bara för dig, även om du är administratör.</p>'}
  <div class="file-crumbs"><button class="btn btn-sm" data-folder-open="">${scope==='mine'?'Mina dokument':'Våra dokument'}</button>${crumbs.map(f=>' / <button class="btn btn-sm" data-folder-open="'+h(f.id)+'">'+h(f.name)+'</button>').join('')}</div>
  <div class="file-actions"><form id="upload-files"><label class="file-picker"><span>Välj filer (max 10 MB per fil)</span><input type="file" name="files" id="file-picker" multiple required></label><button class="btn btn-primary" type="submit">Ladda upp</button></form><button class="btn" id="new-file-folder">+ Ny mapp</button></div>
  <p class="file-limit">Högst 10 MB per fil och totalt 100 MB per användare. PDF-exporter från motionsverkstaden sparas automatiskt i Mina dokument.</p>
  <div class="file-list">
   ${here&&!query?'<div class="file-row"><div><strong>↰ Överordnad mapp</strong></div><button class="btn btn-sm" data-folder-open="'+h(state.folders.find(f=>f.id===here)?.parent_id||'')+'">Öppna</button></div>':''}
   ${dirs.map(f=>'<div class="file-row"><div><strong>📁 '+h(f.name)+'</strong><small>Mapp</small></div><div class="file-row-actions"><button class="btn btn-sm" data-folder-open="'+h(f.id)+'">Öppna</button>'+(f.owner_email===state.user.email?'<button class="btn btn-sm" data-folder-rename="'+h(f.id)+'">Byt namn</button><button class="btn btn-sm btn-danger" data-folder-delete="'+h(f.id)+'">Ta bort</button>':'')+'</div></div>').join('')}
   ${docs.map(f=>'<div class="file-row"><div><strong>📄 '+h(f.name)+'</strong><small>'+h(f.owner_email===state.user.email?'Min fil':'Uppladdad av '+f.owner_email)+' · '+(f.size_bytes/1024).toFixed(1)+' KB · '+h((f.created_at||'').slice(0,16).replace('T',' '))+(query?' · Mapp: '+h(folderPath(f.folder_id)||'Rotmappen'):'')+'</small></div><div class="file-row-actions"><a class="btn btn-sm" href="/api/private/files/'+encodeURIComponent(f.id)+'/download">Ladda ned</a>'+(f.owner_email===state.user.email?'<button class="btn btn-sm" data-file-rename="'+h(f.id)+'">Byt namn</button><button class="btn btn-sm" data-file-move="'+h(f.id)+'">Flytta</button><button class="btn btn-sm" data-file-share="'+h(f.id)+'">'+(scope==='mine'?'Dela':'Gör privat')+'</button><button class="btn btn-sm btn-danger" data-file-delete="'+h(f.id)+'">Ta bort</button>':'')+'</div></div>').join('')}
   ${!docs.length&&!dirs.length?'<div class="empty">Mappen är tom. Skapa en mapp eller ladda upp en fil.</div>':''}
  </div>
 </section>`;
}
async function loadFiles(){
 const result=await api('/api/private/files?scope='+encodeURIComponent(state.fileScope));
 state.files=result.files||[];state.folders=result.folders||[];
 if(state.fileFolder&&!state.folders.some(f=>f.id===state.fileFolder))state.fileFolder=null;
}
async function sendFile(file,scope='mine',folder=null){
 const form=new FormData();form.append('file',file);form.append('scope',scope);if(folder)form.append('folder_id',folder);
 const r=await fetch('/api/private/files',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{accept:'application/json'},body:form});
 let result={};try{result=await r.json();}catch{}
 if(!r.ok)throw Error(result.error||'Filen kunde inte sparas (HTTP '+r.status+').');
 return result;
}
async function fileAction(url,method,data){
 const result=await api(url,method,data);await loadFiles();render();return result;
}



function caseSafeToLeave(){return !(state.caseDirty||state.caseNoteDirty)||confirm('Du har osparade ändringar eller privata anteckningar. Fortsätta utan att spara?');}
function attachCaseActions(){
 $('case-new')?.addEventListener('click',()=>{if(!caseSafeToLeave())return;workflowState.caseId=null;workflowState.followupEdit=null;state.caseCurrent=caseEmpty();state.caseComments=[];state.caseDirty=false;state.caseNoteDirty=false;render();});
 document.querySelectorAll('[data-case-open]').forEach(b=>b.addEventListener('click',async()=>{
  if(!caseSafeToLeave())return;
  const record=state.caseItems.find(c=>c.id===b.dataset.caseOpen);if(!record)return;
  state.caseCurrent={...record,labels:[...(record.labels||[])]};state.caseDirty=false;state.caseNoteDirty=false;
  try{await loadCaseComments(record.id);}catch(e){state.caseComments=[];toast('Kommentarerna kunde inte hämtas: '+e.message,true);}
  await loadCaseWorkflow(record.id);
  recordWorkView();render();
 }));
 document.querySelectorAll('[data-case-visibility]').forEach(b=>b.addEventListener('click',()=>{state.caseVisibility=b.dataset.caseVisibility;render();}));
 $('case-search')?.addEventListener('input',e=>{const pos=e.target.selectionStart;state.caseSearch=e.target.value;render();$('case-search')?.focus();$('case-search')?.setSelectionRange(pos,pos);});
 $('case-filter')?.addEventListener('change',e=>{state.caseFilter=e.target.value;render();});
 $('file-search')?.addEventListener('input',e=>{const pos=e.target.selectionStart;state.fileSearch=e.target.value;render();$('file-search')?.focus();$('file-search')?.setSelectionRange(pos,pos);});
 const form=$('case-form');
 form?.addEventListener('input',e=>{const field=e.target.name;if(!field||!state.caseCurrent)return;
  state.caseCurrent[field]=field==='labels'?e.target.value.split(',').map(x=>x.trim()).filter(Boolean):e.target.value;
  state.caseDirty=true;const label=$('case-save-info');if(label)label.textContent='Osparade ändringar';
 });
 form?.addEventListener('change',e=>{const field=e.target.name;if(field&&state.caseCurrent){
  state.caseCurrent[field]=field==='labels'?e.target.value.split(',').map(x=>x.trim()).filter(Boolean):e.target.value;state.caseDirty=true;
 }});
 form?.addEventListener('submit',async e=>{
  e.preventDefault();const current=state.caseCurrent;if(!current||current.can_edit===false)return;
  const payload={...current,meeting_notes:undefined,labels:[...new Set((current.labels||[]).map(x=>x.trim()).filter(Boolean))],motion_id:current.is_owner===false?null:(current.motion_id||null),file_id:current.is_owner===false?null:(current.file_id||null)};
  const submit=form.querySelector('[type="submit"]');submit.disabled=true;
  try{
   const result=await api(current.id?'/api/private/cases/'+current.id:'/api/private/cases',current.id?'PUT':'POST',payload);
   await loadCases();const updated=state.caseItems.find(c=>c.id===result.id);
   state.caseCurrent=updated?{...updated,labels:[...(updated.labels||[])]}:null;
   state.caseDirty=false;state.caseNoteDirty=false;state.caseComments=[];
   if(result.id)try{await loadCaseComments(result.id);}catch{}
   if(result.id)await loadCaseWorkflow(result.id);
   render();toast('Ärendet sparades.');
  }catch(error){submit.disabled=false;toast(error.message,true);}
 });
 $('case-sharing-form')?.addEventListener('submit',async e=>{
  e.preventDefault();const current=state.caseCurrent;if(!current?.id||!current.is_owner)return;
  if(state.caseDirty||state.caseNoteDirty){toast('Spara ändringar och privata anteckningar innan du ändrar delning.',true);return;}
  const data=new FormData(e.currentTarget),scope=data.get('scope'),assignee_email=scope==='team'?(data.get('assignee_email')||null):null;
  if(scope==='team'&&current.scope!=='team'&&!confirm('Dela ärendets gemensamma text med ALLA aktiva och godkända användare i Arbetsytan? Personliga anteckningar och privata filer delas inte.'))return;
  if(scope==='mine'&&current.scope==='team'&&!confirm('Göra ärendet privat igen? Övriga får då inte längre läsa eller kommentera ärendet.'))return;
  try{
   await api('/api/private/cases/'+current.id+'/sharing','PUT',{scope,assignee_email,revision:current.revision});
   await loadCases();const updated=state.caseItems.find(c=>c.id===current.id);
   state.caseCurrent=updated?{...updated}:null;await loadCaseWorkflow(current.id);render();toast(scope==='team'?'Ärendet delas nu med den godkända arbetsgruppen.':'Ärendet är nu privat.');
  }catch(error){toast(error.message,true);}
 });
 const notes=$('case-note-form');
 notes?.addEventListener('input',e=>{if(state.caseCurrent&&e.target.name==='meeting_notes'){
  state.caseCurrent.meeting_notes=e.target.value;state.caseNoteDirty=true;
  const label=$('case-note-info');if(label)label.textContent='Osparade privata anteckningar';
 }});
 notes?.addEventListener('submit',async e=>{
  e.preventDefault();if(!state.caseCurrent?.id)return;
  const current=state.caseCurrent,button=notes.querySelector('[type="submit"]');button.disabled=true;
  try{
   await api('/api/private/cases/'+current.id+'/notes','PUT',{meeting_notes:current.meeting_notes||''});
   state.caseNoteDirty=false;button.disabled=false;const label=$('case-note-info');if(label)label.textContent='Privata anteckningar sparade';
   toast('Dina privata anteckningar sparades.');
  }catch(error){button.disabled=false;toast(error.message,true);}
 });
 $('case-comment-form')?.addEventListener('submit',async e=>{
  e.preventDefault();if(!state.caseCurrent?.id)return;
  const current=state.caseCurrent,form=e.currentTarget,comment=form.elements.body.value.trim();
  if(!comment)return;
  const button=form.querySelector('[type="submit"]');button.disabled=true;
  try{
   await api('/api/private/cases/'+current.id+'/comments','POST',{body:comment});
   await loadCaseComments(current.id);render();toast('Kommentaren publicerades.');
  }catch(error){button.disabled=false;toast(error.message,true);}
 });
 $('case-delete')?.addEventListener('click',async()=>{
  if(!state.caseCurrent?.id||state.caseCurrent.is_owner===false||!confirm('Radera ärendet och dess kommentarer permanent?'))return;
  try{
   await api('/api/private/cases/'+state.caseCurrent.id,'DELETE');await loadCases();
   state.caseCurrent=null;workflowState.caseId=null;state.caseComments=[];state.caseDirty=false;state.caseNoteDirty=false;
   render();toast('Ärendet raderades.');
  }catch(error){toast(error.message,true);}
 });
 $('case-print-btn')?.addEventListener('click',()=>{
  if(state.caseDirty||state.caseNoteDirty){toast('Spara ändringarna innan du skriver ut beslutsunderlaget.',true);return;}
  window.print();
 });
}

function attach(){
 attachWorkflowActions();
 attachCaseActions();
 attachMeetingActions();
 attachDashboard();
 $('work-nav-back')?.addEventListener('click',workGoBack);
  $('theme-toggle')?.addEventListener('click',toggleTheme);

 document.querySelectorAll('[data-file-scope]').forEach(b=>b.addEventListener('click',async()=>{
  state.fileScope=b.dataset.fileScope;state.fileFolder=null;
  try{await loadFiles();render();}catch(e){toast(e.message,true);}
 }));
 document.querySelectorAll('[data-folder-open]').forEach(b=>b.addEventListener('click',()=>{state.fileFolder=b.dataset.folderOpen||null;state.fileSearch='';render();}));
 $('new-file-folder')?.addEventListener('click',async()=>{const name=prompt('Namn på den nya mappen:');if(name===null)return;try{await fileAction('/api/private/folders','POST',{name,scope:state.fileScope,parent_id:state.fileFolder});toast('Mappen skapades.');}catch(e){toast(e.message,true);}});
 $('upload-files')?.addEventListener('submit',async e=>{e.preventDefault();const button=e.currentTarget.querySelector('button[type=submit]');const chosen=[...($('file-picker')?.files||[])];if(!chosen.length)return;
  button.disabled=true;let completed=0;
  try{for(const file of chosen){await sendFile(file,state.fileScope,state.fileFolder);completed++;}await loadFiles();render();toast(completed+' fil(er) uppladdade.');}
  catch(ex){await loadFiles();render();toast(completed+' fil(er) uppladdade. '+ex.message,true);}
 });
 document.querySelectorAll('[data-folder-rename]').forEach(b=>b.addEventListener('click',async()=>{const f=state.folders.find(x=>x.id===b.dataset.folderRename);const name=prompt('Nytt mappnamn:',f?.name||'');if(name===null)return;try{await fileAction('/api/private/folders/'+f.id,'PATCH',{name});}catch(e){toast(e.message,true);}}));
 document.querySelectorAll('[data-folder-delete]').forEach(b=>b.addEventListener('click',async()=>{if(!confirm('Ta bort denna tomma mapp?'))return;try{await fileAction('/api/private/folders/'+b.dataset.folderDelete,'DELETE');}catch(e){toast(e.message,true);}}));
 document.querySelectorAll('[data-file-rename]').forEach(b=>b.addEventListener('click',async()=>{const f=state.files.find(x=>x.id===b.dataset.fileRename);const name=prompt('Nytt filnamn:',f?.name||'');if(name===null)return;try{await fileAction('/api/private/files/'+f.id,'PATCH',{name});}catch(e){toast(e.message,true);}}));
 document.querySelectorAll('[data-file-delete]').forEach(b=>b.addEventListener('click',async()=>{if(!confirm('Radera filen permanent? Detta går inte att ångra.'))return;try{await fileAction('/api/private/files/'+b.dataset.fileDelete,'DELETE');toast('Filen raderades.');}catch(e){toast(e.message,true);}}));
 document.querySelectorAll('[data-file-share]').forEach(b=>b.addEventListener('click',async()=>{const f=state.files.find(x=>x.id===b.dataset.fileShare);if(!f)return;const scope=f.scope==='mine'?'team':'mine';if(!confirm(scope==='team'?'Dela filen med alla aktiva användare i Våra dokument?':'Göra filen privat igen?'))return;
  try{await fileAction('/api/private/files/'+f.id,'PATCH',{scope,folder_id:null});toast(scope==='team'?'Filen är nu delad med gruppen.':'Filen är nu privat.');}catch(e){toast(e.message,true);}
 }));
 document.querySelectorAll('[data-file-move]').forEach(b=>b.addEventListener('click',async()=>{const f=state.files.find(x=>x.id===b.dataset.fileMove);if(!f)return;
  const options=[{id:null,name:'Rotmappen'},...state.folders.map(x=>({id:x.id,name:folderPath(x.id)}))];
  const msg='Flytta filen till vilken mapp?\n'+options.map((x,i)=>i+': '+x.name).join('\n')+'\n\nAnge nummer:';
  const answer=prompt(msg,'0');if(answer===null)return;const n=Number(answer);
  if(!Number.isInteger(n)||n<0||n>=options.length){toast('Ogiltigt mappnummer.',true);return;}
  try{await fileAction('/api/private/files/'+f.id,'PATCH',{folder_id:options[n].id});toast('Filen flyttades.');}catch(e){toast(e.message,true);}
 }));

 document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>openTab(b.dataset.tab)));
 document.querySelectorAll('[data-new]').forEach(b=>b.addEventListener('click',()=>createMotion()));
 document.querySelectorAll('[data-open]').forEach(b=>b.addEventListener('click',()=>openMotion(b.dataset.open)));
 document.querySelectorAll('[data-shared-tab]').forEach(b=>b.addEventListener('click',()=>{state.sharedTab=b.dataset.sharedTab;render();}));
 document.querySelectorAll('[data-life-tab]').forEach(b=>b.addEventListener('click',()=>{state[b.dataset.lifeTab]=b.dataset.view;render();}));
 document.querySelectorAll('[data-idea-view]').forEach(b=>b.addEventListener('click',()=>{state.ideaView=b.dataset.ideaView;render();}));
 document.querySelectorAll('[data-life]').forEach(b=>b.addEventListener('click',()=>lifecycle(b.dataset.doc,b.dataset.life)));
 $('archive-motion')?.addEventListener('click',()=>lifecycle(state.motion.id,state.motion.trashed_at?'restore':state.motion.archived_at?'unarchive':'archive'));
 $('trash-motion')?.addEventListener('click',()=>lifecycle(state.motion.id,'trash'));
 $('purge-motion')?.addEventListener('click',()=>lifecycle(state.motion.id,'purge'));
 if(state.tab==='editor'&&!canEdit()){document.querySelectorAll('[data-field],[data-clause],#add-clause,[data-clause-del]').forEach(e=>e.disabled=true);}
 $('mobile-menu')?.addEventListener('click',()=>document.querySelector('.sidebar').classList.toggle('mobile-open'));
 document.querySelectorAll('[data-field]').forEach(f=>{const act=()=>{state.motion[f.dataset.field]=f.value;markDirty();};f.addEventListener('input',act);f.addEventListener('change',act);});
 document.querySelectorAll('[data-clause]').forEach(f=>f.addEventListener('input',()=>{state.motion.clauses[Number(f.dataset.clause)]=f.value;markDirty();}));
 document.querySelectorAll('[data-clause-del]').forEach(b=>b.addEventListener('click',()=>{if(state.motion.clauses.length===1)state.motion.clauses=[''];else state.motion.clauses.splice(Number(b.dataset.clauseDel),1);markDirty();render();}));
 $('add-clause')?.addEventListener('click',()=>{if(state.motion.clauses.length>=12){toast('Högst 12 att-satser kan registreras; överväg att dela motionen.',true);return;}state.motion.clauses.push('');markDirty();render();});
 $('save-motion')?.addEventListener('click',()=>saveMotion().catch(e=>toast(e.message,true)));
  $('export-motion')?.addEventListener('click',async()=>{
  try{
   if(state.dirty)await saveMotion(false);
   await api('/api/private/motions/'+state.motion.id);
   const blob=await window.MotionPDF.createPdf(state.motion,$('pdf-template')?.value||'sd',state.logoDataUri);
   const name='motion-'+(state.motion.title||'utkast').toLowerCase().replace(/[^a-zåäö0-9]+/g,'-').slice(0,48)+'.pdf';
   let storageError=null;
   try{await sendFile(new File([blob],name,{type:'application/pdf'}),'mine',null);}catch(e){storageError=e.message;}
   const link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download=name;document.body.append(link);link.click();
   setTimeout(()=>{URL.revokeObjectURL(link.href);link.remove();},300);
   toast(storageError?'PDF hämtad, men kunde inte arkiveras i Mina dokument: '+storageError:'PDF skapad och sparad i Mina dokument. Dokumentet är inte automatiskt inlämnat.',!!storageError);
  }catch(e){toast(e.message,true);}
 });
 $('duplicate-motion')?.addEventListener('click',()=>createMotion({...state.motion,id:undefined,title:state.motion.title+' – kopia',status:'utkast'}));
 $('versions-motion')?.addEventListener('click',async()=>{try{const d=await api('/api/private/motions/'+state.motion.id+'/versions');if(!d.versions.length){toast('Inga tidigare versioner ännu.');return;}const text=d.versions.map(v=>`Version ${v.revision} (${v.created_at.slice(0,16).replace('T',' ')})${v.editor_email?' – redigerad av '+v.editor_email:''}`).join('\n');let choice=prompt('Tillgängliga tidigare versioner:\n'+text+'\n\nAnge versionsnummer för att återställa.');if(choice===null)return;const version=Number(choice);if(!d.versions.some(x=>x.revision===version)){toast('Versionen finns inte.',true);return;}if(!confirm('Återställa version '+version+'? En ny version skapas.'))return;const r=await api('/api/private/motions/'+state.motion.id+'/restore','POST',{revision:version,current_revision:state.motion.revision});state.motion=r;state.dirty=false;render();toast('Version återställd.');}catch(e){toast(e.message,true);}});
 $('share-form')?.addEventListener('submit',async e=>{e.preventDefault();try{if(state.dirty)await saveMotion(false);const team=e.currentTarget.querySelector('[name="team_permission"]').value;const shares=[...e.currentTarget.querySelectorAll('[data-share-email]')].filter(el=>el.value!=='none').map(el=>({email:el.dataset.shareEmail,permission:el.value}));if(team!=='none'&&!confirm('Göra motionen tillgänglig för hela arbetsgruppen med vald behörighet?'))return;await api('/api/private/motions/'+state.motion.id+'/shares','PUT',{team_permission:team,shares});state.shares=await api('/api/private/motions/'+state.motion.id+'/shares');state.motion.team_permission=team;await loadMotions();render();toast('Delningen uppdaterades.');}catch(ex){toast(ex.message,true);}});
 $('comment-form')?.addEventListener('submit',async e=>{e.preventDefault();try{await api('/api/private/motions/'+state.motion.id+'/comments','POST',{body:e.currentTarget.elements.body.value});state.comments=(await api('/api/private/motions/'+state.motion.id+'/comments')).comments;render();toast('Kommentaren sparades.');}catch(ex){toast(ex.message,true);}});
 document.querySelectorAll('[data-resolve]').forEach(b=>b.addEventListener('click',async()=>{try{await api('/api/private/motions/'+state.motion.id+'/comments/'+b.dataset.resolve,'PATCH',{status:b.dataset.status});state.comments=(await api('/api/private/motions/'+state.motion.id+'/comments')).comments;render();}catch(e){toast(e.message,true);}}));
 document.querySelectorAll('[data-idea-comments]').forEach(b=>b.addEventListener('click',async()=>{try{state.selectedIdea=state.selectedIdea===b.dataset.ideaComments?null:b.dataset.ideaComments;state.ideaComments=state.selectedIdea?(await api('/api/private/ideas/'+state.selectedIdea+'/comments')).comments:[];state.ideaLinks=state.selectedIdea?(await api('/api/private/ideas/'+state.selectedIdea+'/motions')).motions:[];state.ideaHistory=state.selectedIdea?(await api('/api/private/ideas/'+state.selectedIdea+'/history')).history:[];render();}catch(e){toast(e.message,true);}}));
 $('idea-comment-form')?.addEventListener('submit',async e=>{e.preventDefault();try{await api('/api/private/ideas/'+e.currentTarget.dataset.id+'/comments','POST',{body:e.currentTarget.elements.body.value});state.ideaComments=(await api('/api/private/ideas/'+state.selectedIdea+'/comments')).comments;await loadIdeas();render();toast('Kommentaren sparades.');}catch(ex){toast(ex.message,true);}});
 document.querySelectorAll('[data-idea-status]').forEach(el=>el.addEventListener('change',async()=>{try{await api('/api/private/ideas/'+el.dataset.ideaStatus,'PATCH',{status:el.value});await loadIdeas();state.ideaHistory=state.selectedIdea?(await api('/api/private/ideas/'+state.selectedIdea+'/history')).history:[];render();toast(el.value==='avslutad'?'Idén flyttades till Avslutade idéer.':'Idéstatus ändrad.');}catch(ex){toast(ex.message,true);}}));
 ['idea-search','motion-search','shared-search'].forEach(id=>$(id)?.addEventListener('input',e=>{const pos=e.target.selectionStart;const key={'idea-search':'ideaSearch','motion-search':'motionSearch','shared-search':'sharedSearch'}[id];state[key]=e.target.value;render();const field=$(id);field.focus();field.setSelectionRange(pos,pos);}));
 document.querySelectorAll('[data-idea]').forEach(b=>b.addEventListener('click',()=>{const idea=state.ideas.find(x=>x.id===b.dataset.idea);if(idea)createMotion({title:idea.title,category:idea.category,problem:idea.problem,proposal:idea.action,origin_idea_id:idea.id});}));
 $('idea-form')?.addEventListener('submit',async e=>{e.preventDefault();try{const v=Object.fromEntries(new FormData(e.currentTarget));await api('/api/private/ideas','POST',v);await loadIdeas();render();toast('Idén har sparats.');}catch(ex){toast(ex.message,true);}});
 $('branding-save')?.addEventListener('click',async()=>{try{const file=$('branding-file')?.files?.[0];if(!file||file.type!=='image/png'||file.size>250000)throw Error('Välj en PNG-fil på högst 250 KB.');const bytes=await file.arrayBuffer();const a=new Uint8Array(bytes);if(a.length<24||[137,80,78,71,13,10,26,10].some((v,i)=>a[i]!==v))throw Error('Bilden är inte en giltig PNG.');let raw='';for(const b of a)raw+=String.fromCharCode(b);const base64=btoa(raw);await api('/api/private/branding','POST',{logo:base64});state.logoDataUri='data:image/png;base64,'+base64;render();toast('Logotypen sparades för SD-mallen.');}catch(e){toast(e.message,true);}});
 $('branding-remove')?.addEventListener('click',async()=>{if(!confirm('Ta bort den gemensamma logotypen?'))return;try{await api('/api/private/branding','POST',{logo:null});state.logoDataUri=null;render();toast('Logotypen togs bort.');}catch(e){toast(e.message,true);}});
 $('pdf-template')?.addEventListener('change',e=>{state.pdfVariant=e.target.value;updatePreview();});
 $('user-form')?.addEventListener('submit',async e=>{e.preventDefault();try{const v=Object.fromEntries(new FormData(e.currentTarget));await api('/api/private/users','POST',v);await loadUsers();render();toast('Användaren godkänd i applikationen. Kontrollera även Cloudflare Access.');}catch(ex){toast(ex.message,true);}});
 document.querySelectorAll('[data-update]').forEach(b=>b.addEventListener('click',async()=>{try{const email=b.dataset.update,row=state.users.find(x=>x.email===email);const role=document.querySelector(`[data-role="${CSS.escape(email)}"]`).value;await api('/api/private/users/'+encodeURIComponent(email),'PATCH',{role,active:!!row.active});await loadUsers();render();toast('Behörigheten uppdaterades.');}catch(e){toast(e.message,true);}}));
 document.querySelectorAll('[data-save-name]').forEach(b=>b.addEventListener('click',async()=>{try{const email=b.dataset.saveName;const f=document.querySelector(`[data-name="${CSS.escape(email)}"]`);const name=f.value.trim().replace(/\s+/g,' ');if(!name||name.length>120){toast('Namn måste vara 1–120 tecken.',true);return;}await api('/api/private/users/'+encodeURIComponent(email),'PATCH',{display_name:name});await loadUsers();if(state.user.email===email){const me=await api('/api/private/me');state.user=me.user;}render();toast('Visningsnamnet har uppdaterats.');}catch(e){toast(e.message,true);}}));
 document.querySelectorAll('[data-active]').forEach(b=>b.addEventListener('click',async()=>{try{const email=b.dataset.active,row=state.users.find(x=>x.email===email);if(!confirm((row.active?'Inaktivera ':'Aktivera ')+email+'?'))return;await api('/api/private/users/'+encodeURIComponent(email),'PATCH',{role:row.role,active:!row.active});await loadUsers();render();toast('Kontostatus uppdaterad.');}catch(e){toast(e.message,true);}}));
}
function render(){const root=$('workroot');root.innerHTML=shell();attach();}
async function init(){try{const data=await api('/api/private/me');state.user=data.user;await loadMotions();await loadShared();await loadDashboard();try{state.logoDataUri=(await api('/api/private/branding')).logo;}catch{}initializeWorkHistory();render();}catch(e){$('workroot').innerHTML=`<div class="container" style="max-width:720px;margin:90px auto"><div class="card"><h1>Åtkomst nekad</h1><p>${h(e.message)}</p><p>Arbetsytan kräver giltig Cloudflare Access-inloggning och ett aktivt användarkonto. Be administratören om behörighet.</p><a class="btn" href="/">Till den publika portalen</a></div></div>`;}}
init();
})();
