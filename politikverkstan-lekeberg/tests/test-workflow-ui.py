"""Version 1.0: a failed workflow endpoint must not hide three healthy sections."""
from pathlib import Path
import subprocess
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
html=subprocess.run(['node','--input-type=module','-e',
 "import {WORKROOM_HTML} from './worker/workroom-page.mjs'; console.log(WORKROOM_HTML.replaceAll('__CSP_NONCE__','test'));"
],cwd=root,check=True,capture_output=True,text=True).stdout
stub=r"""<script nonce="test">
const cid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
window.meetingFailed=true;
const demoCase={id:cid,title:'Budgetuppföljning',committee:'Kommunfullmäktige',
 status:'granskning',meeting_date:'',scope:'team',labels:[],summary:'Kontroll av ekonomi',
 owner_email:'a@test.se',is_owner:true,can_edit:true,revision:2,assignee_email:null};
window.fetch=async (path,opts={})=>{
 let result={},status=200;
 const url=String(path);
 if(url==='/api/private/me')result={user:{email:'a@test.se',name:'Test',role:'user'}};
 else if(url==='/api/private/motions'||url.startsWith('/api/private/motions?'))result={motions:[]};
 else if(url==='/api/private/branding')result={logo:null};
 else if(url==='/api/private/cases')result={cases:[demoCase]};
 else if(url==='/api/private/directory')result={users:[{email:'a@test.se',display_name:'Test'}]};
 else if(url==='/api/private/files?scope=mine')result={files:[],folders:[]};
 else if(url==='/api/private/cases/'+cid+'/comments')result={comments:[]};
 else if(url.endsWith('/history'))result={events:[{
  id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',actor_email:'a@test.se',
  kind:'edited',case_revision:2,created_at:'2026-10-22T12:00:00Z',
  changes:{before:{title:'Tidigare titel'},after:{title:'Budgetuppföljning'}}
 }],next_offset:null};
 else if(url.endsWith('/meetings')){
  if(window.meetingFailed){result={error:'Kunde inte läsa sammanträdeskopplingarna. Kontrollera Cloudflare Worker-loggen.'};status=503;}
  else result={meetings:[{id:'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
   title:'Fullmäktiges sammanträde',agenda_title:'Ekonomisk uppföljning',
   committee:'Kommunfullmäktige',meeting_date:'2026-11-12',outcome:'',follow_up:''}]};
 }
 else if(url.endsWith('/followups'))result={followups:[]};
 else if(url.endsWith('/position'))result={position:null};
 else if(url==='/api/private/tasks')result={tasks:[]};
 else if(url==='/api/private/meetings')result={meetings:[]};
 else result={};
 return new Response(JSON.stringify(result),{status,headers:{'content-type':'application/json'}});
};
</script>"""
html=html.replace('<script nonce="test">',stub+'<script nonce="test">',1)
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':1440,'height':960})
 errors=[];page.on('pageerror',lambda e: errors.append(str(e)))
 page.set_content(html,wait_until='domcontentloaded')
 page.locator('[data-tab="cases"]').first.click()
 page.locator('[data-case-open]').first.click()
 page.locator('[data-wf-retry="meetings"]').wait_for()
 assert page.locator('.wf-section-error').count()==1
 assert page.get_by_role('heading',name='Ändringshistorik',exact=True).is_visible()
 assert page.get_by_text('Budgetuppföljning',exact=False).count()>0
 assert page.get_by_text('Uppföljningar',exact=True).is_visible()
 assert page.get_by_text('Ställningstagande och förankring',exact=True).is_visible()
 assert page.locator('#wf-position-form').is_visible()
 assert page.get_by_text('Tidigare titel').count()>0
 assert page.locator('.wf-panel').count()==4
 assert page.locator('.case-stage-overview').count()==1
 assert page.locator('[data-case-jump]').count()==5
 assert 'Okänt' in page.locator('.case-stage-overview').inner_text(), 'Unreachable meeting endpoint must not appear as zero'
 assert 'Laddar' not in page.locator('.case-stage-overview').inner_text()
 page.locator('[data-case-jump="wf-case-history"]').click()
 assert page.locator('#wf-case-history').is_visible()
 assert page.locator('#wf-case-followups').is_visible()
 page.evaluate('window.meetingFailed=false')
 page.locator('[data-wf-retry="meetings"]').click()
 page.get_by_text('Fullmäktiges sammanträde').wait_for()
 assert page.locator('.wf-section-error').count()==0
 assert not errors,errors
 browser.close()
print('PASS 1.0 workflow UI: independent panels, specific error, retry recovery')
