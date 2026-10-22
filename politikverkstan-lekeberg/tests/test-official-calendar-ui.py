"""Public municipal calendar in authenticated workroom, independent of private meetings."""
from datetime import datetime
from zoneinfo import ZoneInfo
from pathlib import Path
import subprocess
from playwright.sync_api import sync_playwright

root=Path(__file__).resolve().parents[1]
node="import {WORKROOM_HTML} from './worker/workroom-page.mjs';console.log(WORKROOM_HTML.replaceAll('__CSP_NONCE__','test'));"
html=subprocess.run(['node','--input-type=module','-e',node],cwd=root,check=True,capture_output=True,text=True).stdout
now=datetime.now(ZoneInfo('Europe/Stockholm'))
month=now.strftime('%Y-%m')
meeting_date=month+'-15'
source='https://meetings.lekeberg.se/committees/kommunfullmaktige/mote-'+meeting_date
mock=r"""<script nonce="test">
window.officialGets=0;
window.fetch=async(path,options={})=>{
 let status=200,data={},method=options.method||'GET';
 if(path==='/api/private/me')data={user:{email:'member@example.se',name:'Testledamot',role:'user'}};
 else if(path==='/api/private/motions')data={motions:[]};
 else if(path.startsWith('/api/private/motions?'))data={motions:[]};
 else if(path==='/api/private/branding')data={logo:null};
 else if(path==='/api/private/meetings')data={meetings:[]};
 else if(path==='/api/private/cases')data={cases:[]};
 else if(path==='/api/private/tasks')data={tasks:[]};
 else if(path==='/api/private/workflow/dashboard')data={followups:[],total_open:0};
 else if(path==='/api/private/official-meetings'){
  window.officialGets++;
  data={meetings:[{source_url:'__SOURCE__',committee_key:'kf',committee:'Kommunfullmäktige',meeting_date:'__DATE__',start_time:'18:00',end_time:'21:00',location:'Träffen'}],
   sources:[{committee_key:'kf',last_attempt_at:'2026-10-22T10:00:00Z',last_success_at:'2026-10-22T10:00:00Z',last_error:''}],
   committees:[{key:'kf',name:'Kommunfullmäktige',url:'https://meetings.lekeberg.se/committees/kommunfullmaktige'}],can_sync:false};
 }
 else{status=404;data={error:'Not mocked'};}
 return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json'}});
};
</script>""".replace('__SOURCE__',source).replace('__DATE__',meeting_date)
html=html.replace('<script nonce="test">',mock+'<script nonce="test">',1)

with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':390,'height':820})
 errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content(html,wait_until='domcontentloaded')
 page.locator('#mobile-menu').click()
 page.locator('[data-tab="meetings"]').first.click()
 page.locator('.official-calendar').wait_for()
 assert page.locator('.official-calendar-grid .official-day').count()>=28
 assert page.locator('.official-event').count()==1
 assert page.locator('.official-source-diagnostics summary').count()==1
 page.locator('.official-source-diagnostics summary').click()
 assert 'Kommunfullmäktige' in page.locator('.official-source-diagnostics').inner_text()
 assert 'Senast inlästa möten' in page.locator('.official-source-diagnostics').inner_text()
 assert page.locator('.official-event').first.get_attribute('href')==source
 assert page.locator('.official-event').first.get_attribute('rel')=='noopener noreferrer'
 assert not page.locator('#official-calendar-sync').count(), 'Non-admin cannot trigger poll'
 assert page.locator('.meeting-list-pane').is_visible(), 'Private meetings must remain available'
 assert page.evaluate('window.officialGets')==1
 page.locator('#official-calendar-refresh').click()
 page.wait_for_function('window.officialGets===2')
 assert page.locator('.official-event').count()==1
 page.locator('[data-official-month="1"]').click()
 assert page.locator('.official-event').count()==0
 page.locator('[data-official-month="-1"]').click()
 assert page.locator('.official-event').count()==1
 assert page.evaluate('document.documentElement.scrollWidth')<=390+2
 assert not errors,errors
 browser.close()
print('PASS read-only public meeting calendar, month navigation, private meeting isolation and responsive layout')
