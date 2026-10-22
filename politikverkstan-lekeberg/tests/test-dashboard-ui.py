"""0.9.2 protected dashboard: scoped overview, personal task workflow, shortcuts."""
from pathlib import Path
import subprocess
from playwright.sync_api import sync_playwright

root=Path(__file__).resolve().parents[1]
script="import {WORKROOM_HTML} from './worker/workroom-page.mjs';console.log(WORKROOM_HTML.replaceAll('__CSP_NONCE__','test'));"
html=subprocess.run(['node','--input-type=module','-e',script],cwd=root,capture_output=True,text=True,check=True).stdout
mock=r"""<script nonce="test">
const taskId='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const caseId='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const meetingId='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
window.dbTasks=[];
window.failFollowups=false;
window.mockFollowups=[{id:'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',case_id:caseId,title:'Kontrollera beslutad besparing',case_title:'Budgetuppföljning BUN',due_date:'2026-11-03',assignee_email:'user@test.se'}];
window.mockCases=[{id:caseId,title:'Budgetuppföljning BUN',committee:'Barn- och utbildningsnämnden',status:'granskning',meeting_date:'2026-11-02',labels:[],owner_email:'teammate@test.se',assignee_email:'user@test.se',scope:'team',is_owner:false,can_edit:true,revision:1}];
window.mockMeetings=[{id:meetingId,title:'Nästa nämndmöte',committee:'Barn- och utbildningsnämnden',meeting_date:'2026-11-02',start_time:'09:00',status:'planned',scope:'team',agenda_count:2}];
window.fetch=async(path,options={})=>{
 const method=options.method||'GET';
 const value=options.body&&!(options.body instanceof FormData)?JSON.parse(options.body):null;
 let response={},status=200;
 if(path==='/api/private/me') response={user:{email:'user@test.se',name:'Testanvändare',role:'user'}};
 else if(path==='/api/private/motions') response={motions:[{id:'dddddddd-dddd-4ddd-8ddd-dddddddddddd',title:'Motion om skolmiljö',owner_email:'user@test.se',status:'utkast',category:'Skola och utbildning'}]};
 else if(path.startsWith('/api/private/motions?')) response={motions:[]};
 else if(path==='/api/private/branding') response={logo:null};
 else if(path==='/api/private/cases') response={cases:window.mockCases};
 else if(path==='/api/private/meetings') response={meetings:window.mockMeetings};
 else if(path==='/api/private/tasks'&&method==='GET') response={tasks:window.dbTasks};
 else if(path==='/api/private/workflow/dashboard'){
  if(window.failFollowups){status=503;response={error:'Uppföljningarna går inte att läsa'};}
  else response={followups:window.mockFollowups,total_open:window.mockFollowups.length};
 }
 else if(path==='/api/private/tasks'&&method==='POST'){
  window.dbTasks.push({...value,id:taskId,revision:1,done:false,created_at:'2026-10-22',updated_at:'2026-10-22'});
  response={id:taskId,revision:1};status=201;
 }
 else if(path==='/api/private/tasks/'+taskId&&method==='PATCH'){
  const t=window.dbTasks[0];
  window.dbTasks[0]={...t,...value,revision:t.revision+1};
  response={ok:true,revision:window.dbTasks[0].revision};
 }
 else if(path==='/api/private/tasks/'+taskId&&method==='DELETE'){
  window.dbTasks=[];response={ok:true};
 }
 else if(path==='/api/private/files?scope=mine')response={files:[],folders:[]};
 else if(path==='/api/private/directory')response={users:[]};
 else if(path==='/api/private/cases/'+caseId+'/comments')response={comments:[]};
 else if(path==='/api/private/meetings/'+meetingId)response={meeting:window.mockMeetings[0],agenda:[],personal_note:''};
 else{status=404;response={error:'Not mocked'};}
 return new Response(JSON.stringify(response),{status,headers:{'content-type':'application/json'}});
};
</script>"""
html=html.replace('<script nonce="test">',mock+'<script nonce="test">',1)
with sync_playwright() as playwright:
 browser=playwright.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':1420,'height':1000})
 errors=[]
 page.on('pageerror',lambda err: errors.append(str(err)))
 page.on('dialog',lambda dialog:dialog.accept())
 page.set_content(html,wait_until='domcontentloaded')
 page.get_by_role('heading',name='Min arbetsöversikt').wait_for()
 assert 'Nästa nämndmöte' in page.locator('.db-root').inner_text()
 assert 'Budgetuppföljning BUN' in page.locator('.db-root').inner_text()
 assert page.locator('.db-kpi').count()==4
 assert 'Motionsutkast' in page.locator('.db-kpis').inner_text()
 assert 'Kontrollera beslutad besparing' in page.locator('#db-followups').inner_text()
 assert '1 ärendeuppföljningar' in page.locator('.db-kpis').inner_text()
 assert page.locator('.db-kpi').nth(2).locator('strong').inner_text()=='1'
 page.locator('[data-db-followups-jump]').click()
 assert page.locator('#db-followups').is_visible()
 page.locator('#db-task-form [name=title]').fill('Kontrollera prognosen')
 page.locator('#db-task-form [name=due_date]').fill('2026-11-01')
 page.locator('#db-task-form [name=priority]').select_option('high')
 page.locator('#db-task-form [name=case_id]').select_option('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')
 page.locator('#db-task-form button[type=submit]').click()
 page.locator('.db-task-row').first.get_by_text('Kontrollera prognosen').wait_for()
 assert page.evaluate('window.dbTasks[0].case_id')=='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
 assert 'Hög' in page.locator('.db-task-row').first.inner_text()
 assert page.locator('.db-kpi').nth(2).locator('strong').inner_text()=='2'
 page.evaluate('window.failFollowups=true')
 page.locator('#db-refresh').click()
 page.get_by_text('Ärendeuppföljningarna kunde inte hämtas.',exact=False).wait_for()
 assert page.locator('.db-kpi').nth(2).locator('strong').inner_text()=='–'
 assert page.locator('.db-task-row').count()==1, 'Personal tasks remain available when followups fail'
 page.evaluate('window.failFollowups=false')
 page.locator('#db-refresh').click()
 page.get_by_text('Kontrollera beslutad besparing').wait_for()
 assert page.locator('.db-kpi').nth(2).locator('strong').inner_text()=='2'
 page.locator('[data-db-task-toggle]').first.check()
 page.wait_for_function('window.dbTasks[0].done===true')
 page.locator('.db-completed').wait_for()
 page.locator('.db-completed summary').click()
 page.locator('[data-db-task-edit]').first.click()
 page.locator('#db-task-form [name=title]').fill('Uppdaterad prognos')
 page.locator('#db-task-form button[type=submit]').click()
 page.wait_for_function("document.querySelector('.db-completed')?.textContent.includes('Uppdaterad prognos')")
 page.locator('.db-completed summary').click()
 page.locator('[data-db-task-delete]').first.click()
 page.locator('.db-completed').wait_for(state='detached')
 page.locator('[data-dashboard-meeting]').first.click()
 page.locator('#meeting-form').wait_for()
 page.locator('[data-tab="overview"]').first.click()
 page.get_by_role('heading',name='Min arbetsöversikt').wait_for()
 page.locator('[data-dashboard-case]').first.click()
 page.locator('#case-form').wait_for()
 assert not errors,errors
 browser.close()
print('PASS 1.0.1 UI: scoped followups, counts, partial failure recovery, tasks and deep navigation')
