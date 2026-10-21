"""0.8.0 protected interface: explicit team share and separate personal note."""
from pathlib import Path
import subprocess
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
html=subprocess.run(['node','--input-type=module','-e',
 "import {WORKROOM_HTML} from './worker/workroom-page.mjs';console.log(WORKROOM_HTML.replaceAll('__CSP_NONCE__','test'));"],cwd=root,check=True,capture_output=True,text=True).stdout
stub=r"""<script nonce="test">
window.demoCases=[];window.demoComments=[];
const caseId='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
window.fetch=async (path,opt={})=>{
 const method=opt.method||'GET',data=opt.body&&!(opt.body instanceof FormData)?JSON.parse(opt.body):null;
 let result={},status=200;
 if(path==='/api/private/me')result={user:{email:'owner@test.se',name:'Ägare',role:'user'}};
 else if(path==='/api/private/motions')result={motions:[]};
 else if(path.startsWith('/api/private/motions?'))result={motions:[]};
 else if(path==='/api/private/branding')result={logo:null};
 else if(path==='/api/private/files?scope=mine')result={files:[],folders:[]};
 else if(path==='/api/private/directory')result={users:[{email:'owner@test.se',display_name:'Ägare'},{email:'member@test.se',display_name:'Kollega'}]};
 else if(path==='/api/private/cases'&&method==='GET')result={cases:window.demoCases};
 else if(path==='/api/private/cases'&&method==='POST'){
  window.demoCases=[{...data,id:caseId,scope:'mine',is_owner:true,can_edit:true,owner_email:'owner@test.se',assignee_email:null,meeting_notes:'',revision:1,updated_at:'2026-10-21T17:00:00Z'}];
  result={id:caseId,revision:1};status=201;
 }
 else if(path===('/api/private/cases/'+caseId+'/comments')&&method==='GET')result={comments:window.demoComments};
 else if(path===('/api/private/cases/'+caseId+'/comments')&&method==='POST'){
  window.demoComments.push({id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',body:data.body,created_at:'2026-10-21T17:00:00Z',author_email:'owner@test.se',author_name:'Ägare'});
  result={ok:true};status=201;
 }
 else if(path===('/api/private/cases/'+caseId+'/notes')&&method==='PUT'){window.demoCases[0].meeting_notes=data.meeting_notes;result={ok:true};}
 else if(path===('/api/private/cases/'+caseId+'/sharing')&&method==='PUT'){
  Object.assign(window.demoCases[0],{scope:data.scope,assignee_email:data.assignee_email,revision:window.demoCases[0].revision+1});
  result={ok:true,revision:window.demoCases[0].revision};
 }
 else if(path==='/api/private/cases/'+caseId&&method==='PUT'){
  Object.assign(window.demoCases[0],data,{revision:window.demoCases[0].revision+1});result={id:caseId,revision:window.demoCases[0].revision};
 }
 else if(path==='/api/private/cases/'+caseId&&method==='DELETE'){window.demoCases=[];result={ok:true};}
 else{result={error:'Inte tillgänglig'};status=404;}
 return new Response(JSON.stringify(result),{status,headers:{'content-type':'application/json'}});
};
</script>"""
html=html.replace('<script nonce="test">',stub+'<script nonce="test">',1)
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':1440,'height':950})
 errors=[]
 page.on('pageerror',lambda exc:errors.append(str(exc)))
 page.on('dialog',lambda dlg:dlg.accept())
 page.set_content(html,wait_until='domcontentloaded')
 page.locator('[data-tab="cases"]').first.click()
 page.locator('#case-new').click()
 page.locator('#case-form [name="title"]').fill('Ekonomiska konsekvenser i BUN')
 page.locator('#case-form [name="summary"]').fill('Första granskningen.')
 page.locator('#case-form [type="submit"]').click()
 page.locator('#case-sharing-form').wait_for()
 assert page.evaluate('window.demoCases[0].scope')=='mine'
 page.locator('#case-note-form textarea').fill('Detta är min privata minnesanteckning.')
 page.locator('#case-note-form button[type="submit"]').click()
 page.wait_for_function("window.demoCases[0].meeting_notes==='Detta är min privata minnesanteckning.'")
 page.locator('#case-sharing-form select[name="scope"]').select_option('team')
 page.locator('#case-sharing-form select[name="assignee_email"]').select_option('member@test.se')
 page.locator('#case-sharing-form button[type="submit"]').click()
 page.wait_for_function("window.demoCases[0].scope==='team'")
 assert page.evaluate("window.demoCases[0].assignee_email")=='member@test.se'
 assert page.locator('.case-scope-label').get_by_text('Gemensamt ärende',exact=False).count()==1
 page.locator('#case-comment-form textarea').fill('Fråga till förvaltningen: hur ser prognosen ut?')
 page.locator('#case-comment-form button[type="submit"]').click()
 page.get_by_text('Fråga till förvaltningen: hur ser prognosen ut?').wait_for()
 assert 'Detta är min privata minnesanteckning.' not in page.locator('#case-print').text_content()
 page.locator('[data-case-visibility="mine"]').click()
 assert page.locator('.case-result').count()==0
 page.locator('[data-case-visibility="team"]').click()
 assert page.locator('.case-result').count()==1
 assert not errors,errors
 browser.close()
print('PASS 0.8.0 UI: default private, explicit sharing, assignee, private note, comment, separate views')
