"""1.8 integration: public meeting -> private preparation -> editable progress, return later."""
from pathlib import Path
from datetime import datetime,timedelta,timezone
import subprocess
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
src="import {WORKROOM_HTML} from './worker/workroom-page.mjs';console.log(WORKROOM_HTML.replaceAll('__CSP_NONCE__','test'));"
html=subprocess.run(['node','--input-type=module','-e',src],cwd=root,text=True,capture_output=True,check=True).stdout
date=(datetime.now(timezone.utc)+timedelta(days=22)).date().isoformat()
source='https://meetings.lekeberg.se/committees/kommunfullmaktige/mote-'+date
mock=r"""<script nonce="test">
const MID='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const AID='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const SOURCE='__SOURCE__',MEETING_DATE='__DATE__';
window.savedMeetings=[];window.savedItems=[];window.requests=[];
const official={source_url:SOURCE,committee_key:'kf',committee:'Kommunfullmäktige',meeting_date:MEETING_DATE,
 start_time:'18:00',end_time:'21:00',location:'Träffen',agenda_status:'identified',
 agenda:[{number:1,title:'Ekonomisk uppföljning'},{number:2,title:'Skolfrågor och lokaler'}],
 documents:[{title:'Kallelse',url:SOURCE+'/agenda/kallelsepdf?downloadMode=open'}]};
window.fetch=async(path,opts={})=>{
 const method=opts.method||'GET',value=opts.body&&!(opts.body instanceof FormData)?JSON.parse(opts.body):null;
 window.requests.push(method+' '+path);
 let response={},status=200;
 if(path==='/api/private/me')response={user:{email:'owner@test.se',name:'Ledamot',role:'user'}};
 else if(path==='/api/private/motions')response={motions:[]};
 else if(path.startsWith('/api/private/motions?'))response={motions:[]};
 else if(path==='/api/private/branding')response={logo:null};
 else if(path==='/api/private/cases')response={cases:[]};
 else if(path==='/api/private/meetings'&&method==='GET')response={meetings:window.savedMeetings.map(m=>({...m,agenda_count:window.savedItems.length}))};
 else if(path==='/api/private/official-meetings')response={meetings:[official],sources:[{committee_key:'kf',last_success_at:new Date().toISOString(),last_count:1,last_error:''}],committees:[],can_sync:false};
 else if(path==='/api/private/tasks')response={tasks:[]};
 else if(path==='/api/private/workflow/dashboard')response={followups:[],total_open:0};
 else if(path==='/api/private/meetings'&&method==='POST'){
  window.savedMeetings.push({...value,id:MID,is_owner:true,scope:'mine',revision:1,status:'planned',agenda_count:0});
  response={id:MID,revision:1};status=201;
 }
 else if(path==='/api/private/meetings/'+MID&&method==='GET'){
  response={meeting:window.savedMeetings[0],agenda:window.savedItems,personal_note:''};
 }
 else if(path==='/api/private/meetings/'+MID+'/items'&&method==='POST'){
  window.savedItems.push({...value,id:AID,position:window.savedItems.length});
  response={id:AID};status=201;
 }
 else if(path==='/api/private/meetings/'+MID+'/items/'+AID&&method==='PUT'){
  window.savedItems[0]={...window.savedItems[0],...value};response={ok:true};
 }
 else{status=404;response={error:'Not mocked: '+method+' '+path};}
 return new Response(JSON.stringify(response),{status,headers:{'content-type':'application/json'}});
};
</script>""".replace('__SOURCE__',source).replace('__DATE__',date)
html=html.replace('<script nonce="test">',mock+'<script nonce="test">',1)
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':390,'height':850})
 errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('dialog',lambda d:d.accept())
 page.set_content(html,wait_until='domcontentloaded')
 page.locator('.prep-next-card').wait_for()
 assert 'Kommunfullmäktige' in page.locator('.prep-next-card').inner_text()
 page.locator('.prep-next-card button').click()
 page.locator('.prep-root').wait_for()
 assert page.locator('.prep-item').count()==2
 assert '0 av 2' in page.locator('.prep-progress-head').inner_text()
 assert page.locator('.prep-docs').count()==0
 page.locator('.prep-side summary').click()
 assert page.locator('.prep-docs a').count()==1
 assert page.evaluate('document.documentElement.scrollWidth')<=400
 page.locator('#prep-create-private').click()
 page.wait_for_function('window.savedMeetings.length===1')
 assert page.evaluate('window.savedMeetings[0].scope')=='mine'
 assert page.evaluate('window.savedItems.length')==0
 page.locator('[data-prep-add="0"]').click()
 page.wait_for_function('window.savedItems.length===1')
 page.locator('[data-prep-edit]').click()
 page.locator('#prep-edit-form [name=preparation]').fill('Begär underlag för kostnadsprognosen och fråga förvaltningen.')
 page.locator('#prep-edit-form [name=follow_up]').fill('Återkom till prognosen efter mötet.')
 page.locator('#prep-edit-form button[type=submit]').click()
 page.wait_for_function("window.savedItems[0].preparation.includes('Begär underlag')")
 assert '1 av 2' in page.locator('.prep-progress-head').inner_text()
 assert 'Uppföljning' in page.locator('.prep-item').first.inner_text() or 'Återkom' in page.locator('.prep-item').first.inner_text()
 page.locator('#prep-open-private').click()
 page.locator('#meeting-form').wait_for()
 page.locator('[data-tab="overview"]').first.click()
 page.locator('.prep-next-card').wait_for()
 page.locator('.prep-next-card button').click()
 page.locator('.prep-root').wait_for()
 assert '1 av 2' in page.locator('.prep-progress-head').inner_text()
 assert page.evaluate('window.savedMeetings.length')==1
 assert not errors,errors
 browser.close()
print('PASS 1.8: responsive next meeting, explicit private creation, saved progress and resume')
