"""0.9.0 browser regression for private meeting + agenda + notes + explicit share."""
from pathlib import Path
import subprocess
from playwright.sync_api import sync_playwright
base=Path(__file__).resolve().parents[1]
script="import {WORKROOM_HTML} from './worker/workroom-page.mjs';console.log(WORKROOM_HTML.replaceAll('__CSP_NONCE__','test'));"
html=subprocess.run(['node','--input-type=module','-e',script],cwd=base,check=True,capture_output=True,text=True).stdout
mocks=r"""<script nonce="test">
const mid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const aid='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
window.meetings=[];window.agenda=[];window.personal='';
window.fetch=async(path,opts={})=>{
 const method=opts.method||'GET',v=opts.body&&!(opts.body instanceof FormData)?JSON.parse(opts.body):null;
 let result={},status=200;
 if(path==='/api/private/me')result={user:{email:'owner@test.se',name:'Testägare',role:'user'}};
 else if(path==='/api/private/motions')result={motions:[]};
 else if(path.startsWith('/api/private/motions?'))result={motions:[]};
 else if(path==='/api/private/branding')result={logo:null};
 else if(path==='/api/private/cases')result={cases:[{id:'cccccccc-cccc-4ccc-8ccc-cccccccccccc',title:'Delat budgetärende',committee:'Kommunfullmäktige',scope:'team',is_owner:false,labels:[]}]};
 else if(path==='/api/private/meetings'&&method==='GET')result={meetings:window.meetings.map(x=>({...x,agenda_count:window.agenda.length}))};
 else if(path==='/api/private/meetings'&&method==='POST'){
  window.meetings=[{...v,id:mid,owner_email:'owner@test.se',scope:'mine',is_owner:true,revision:1,agenda_count:0}];result={id:mid,revision:1};status=201;
 }
 else if(path==='/api/private/meetings/'+mid&&method==='GET')result={meeting:window.meetings[0],agenda:window.agenda,personal_note:window.personal};
 else if(path==='/api/private/meetings/'+mid&&method==='PUT'){
  window.meetings[0]={...window.meetings[0],...v,revision:window.meetings[0].revision+1};result={ok:true,revision:window.meetings[0].revision};
 }
 else if(path==='/api/private/meetings/'+mid+'/sharing'&&method==='PUT'){
  window.meetings[0].scope=v.scope;window.meetings[0].revision++;result={ok:true,revision:window.meetings[0].revision};
 }
 else if(path==='/api/private/meetings/'+mid+'/notes'&&method==='PUT'){window.personal=v.personal_note;result={ok:true};}
 else if(path==='/api/private/meetings/'+mid+'/items'&&method==='POST'){
  window.agenda.push({...v,id:aid,position:0,case_title:v.case_id?'Delat budgetärende':null});
  result={id:aid};status=201;
 }
 else if(path==='/api/private/meetings/'+mid+'/items/'+aid&&method==='PUT'){
  window.agenda[0]={...window.agenda[0],...v,case_title:v.case_id?'Delat budgetärende':null};result={ok:true};
 }
 else if(path==='/api/private/meetings/'+mid+'/items/'+aid&&method==='DELETE'){window.agenda=[];result={ok:true};}
 else if(path==='/api/private/meetings/'+mid&&method==='DELETE'){window.meetings=[];window.agenda=[];result={ok:true};}
 else{result={error:'Okänd resurs'};status=404;}
 return new Response(JSON.stringify(result),{status,headers:{'content-type':'application/json'}});
};
</script>"""
html=html.replace('<script nonce="test">',mocks+'<script nonce="test">',1)
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':1380,'height':940})
 errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('dialog',lambda d:d.accept())
 page.set_content(html,wait_until='domcontentloaded')
 page.locator('[data-tab="meetings"]').first.click()
 page.locator('#meeting-new').click()
 assert page.locator('#meeting-form').is_visible()
 page.locator('#meeting-form [name="title"]').fill('Förberedelser BUN')
 page.locator('#meeting-form [name="meeting_date"]').fill('2026-11-02')
 page.locator('#meeting-form button[type="submit"]').click()
 page.locator('#meeting-sharing-form').wait_for()
 assert page.evaluate("window.meetings[0].scope")=='mine'
 page.locator('#meeting-add-item').click()
 page.locator('#meeting-item-form [name="title"]').fill('Budgetuppföljning')
 page.locator('#meeting-item-form [name="case_id"]').select_option('cccccccc-cccc-4ccc-8ccc-cccccccccccc')
 page.locator('#meeting-item-form [name="preparation"]').fill('Begär ekonomiskt underlag.')
 page.locator('#meeting-item-form button[type="submit"]').click()
 page.locator('.meeting-agenda-row').wait_for()
 assert 'Budgetuppföljning' in page.locator('.meeting-agenda').inner_text()
 page.locator('#meeting-note-form textarea').fill('Privat mötesfråga.')
 page.locator('#meeting-note-form button[type="submit"]').click()
 page.wait_for_function("window.personal==='Privat mötesfråga.'")
 assert 'Privat mötesfråga.' not in page.locator('#meeting-print').text_content()
 page.locator('#meeting-sharing-form select').select_option('team')
 page.locator('#meeting-sharing-form button[type="submit"]').click()
 page.wait_for_function("window.meetings[0].scope==='team'")
 page.locator('[data-meeting-visibility="mine"]').click()
 assert page.locator('.meeting-list-entry').count()==0
 page.locator('[data-meeting-visibility="team"]').click()
 assert page.locator('.meeting-list-entry').count()==1
 assert not errors,errors
 browser.close()
print('PASS 0.9.0 UI: private meeting, agenda, linked case, notes isolation and share')
