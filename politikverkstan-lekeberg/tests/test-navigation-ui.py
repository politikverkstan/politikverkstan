"""Browser Back/Forward and in-app Back in both public and protected views."""
from pathlib import Path
import subprocess
from playwright.sync_api import sync_playwright

root=Path(__file__).resolve().parents[1]
public=(root/'dist/index.html').read_text(encoding='utf-8')
private=subprocess.run(
 ['node','--input-type=module','-e',
  "import {WORKROOM_HTML} from './worker/workroom-page.mjs';console.log(WORKROOM_HTML.replaceAll('__CSP_NONCE__','test'));"],
 cwd=root,check=True,capture_output=True,text=True).stdout

stub=r"""<script nonce="test">
const caseId='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const meetingId='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const caseRow={id:caseId,title:'Ekonomi BUN',committee:'Barn- och utbildningsnämnden',
status:'granskning',scope:'team',is_owner:false,can_edit:false,revision:1,
owner_email:'another@test.se',labels:[],meeting_date:'2026-11-01'};
const meetingRow={id:meetingId,title:'BUN sammanträde',committee:'Barn- och utbildningsnämnden',
meeting_date:'2026-11-01',start_time:'09:00',scope:'team',status:'planned',
revision:1,is_owner:false,agenda_count:0,owner_email:'another@test.se'};
window.fetch=async (path,opts={})=>{
 const payload=path==='/api/private/me'?{user:{email:'user@test.se',name:'Användare',role:'user'}}:
 path==='/api/private/motions'?{motions:[]}:
 path.startsWith('/api/private/motions?')?{motions:[]}:
 path==='/api/private/branding'?{logo:null}:
 path==='/api/private/cases'?{cases:[caseRow]}:
 path==='/api/private/meetings'?{meetings:[meetingRow]}:
 path==='/api/private/tasks'?{tasks:[]}:
 path==='/api/private/directory'?{users:[]}:
 path==='/api/private/files?scope=mine'?{files:[],folders:[]}:
 path==='/api/private/meetings/'+meetingId?{meeting:meetingRow,agenda:[],personal_note:''}:
 path==='/api/private/cases/'+caseId+'/comments'?{comments:[]}:
 {error:'Missing mocked API'};
 const ok=!payload.error;
 return new Response(JSON.stringify(payload),{status:ok?200:404,headers:{'content-type':'application/json'}});
};
</script>"""
private=private.replace('<script nonce="test">',stub+'<script nonce="test">',1)

with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 errors=[]

 pub=browser.new_page(viewport={'width':1300,'height':900})
 pub.on('pageerror',lambda e:errors.append('public: '+str(e)))
 pub.set_content(public,wait_until='domcontentloaded')
 pub.locator('#pv-nav-back').wait_for()
 assert pub.locator('#pv-nav-back').is_disabled()
 pub.locator('.sidebar [data-page="matrix"]').click()
 pub.locator('.breadcrumb b').get_by_text('Mandatfördelning').wait_for()
 assert pub.locator('#pv-nav-back').is_enabled()
 pub.locator('.sidebar [data-page="candidates"]').click()
 pub.locator('.breadcrumb b').get_by_text('Kandidatval').wait_for()
 pub.locator('#pv-nav-back').click()
 pub.locator('.breadcrumb b').get_by_text('Mandatfördelning').wait_for()
 pub.evaluate('history.back()')
 pub.locator('.breadcrumb b').get_by_text('Start').wait_for()
 pub.evaluate('history.forward()')
 pub.locator('.breadcrumb b').get_by_text('Mandatfördelning').wait_for()
 pub.locator('.sidebar [data-page="registry"]').click()
 pub.locator('.breadcrumb b').get_by_text('Organisationer').wait_for()
 pub.evaluate('history.back()')
 pub.locator('.breadcrumb b').get_by_text('Mandatfördelning').wait_for()

 work=browser.new_page(viewport={'width':1400,'height':950})
 work.on('pageerror',lambda e:errors.append('workroom: '+str(e)))
 work.set_content(private,wait_until='domcontentloaded')
 work.locator('#work-nav-back').wait_for()
 assert work.locator('#work-nav-back').is_disabled()
 work.locator('.sidebar [data-tab="meetings"]').click()
 work.locator('.meeting-list-entry').wait_for()
 assert work.locator('#work-nav-back').is_enabled()
 work.locator('.meeting-list-entry').first.click()
 work.locator('#meeting-form').wait_for()
 work.locator('#work-nav-back').click()
 work.locator('.meeting-list-entry').wait_for()
 work.wait_for_function("document.querySelector('#meeting-form') === null")
 work.evaluate('history.back()')
 work.locator('.sidebar [data-tab="overview"].active').wait_for()
 work.evaluate('history.forward()')
 work.locator('.sidebar [data-tab="meetings"].active').wait_for()
 work.locator('.sidebar [data-tab="cases"]').click()
 work.locator('[data-case-open]').first.click()
 work.locator('#case-form').wait_for()
 work.locator('#work-nav-back').click()
 work.wait_for_function("document.querySelector('#case-form') === null")
 work.locator('.sidebar [data-tab="cases"].active').wait_for()
 assert not errors,errors
 browser.close()
print('PASS navigation: public Back/Forward, workroom Back, meetings and case details')
