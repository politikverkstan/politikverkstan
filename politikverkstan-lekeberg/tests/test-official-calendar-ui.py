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
  data={meetings:[{source_url:'__SOURCE__',committee_key:'kf',committee:'Kommunfullmäktige',meeting_date:'__DATE__',start_time:'18:00',end_time:'21:00',location:'Träffen',agenda:[{number:1,title:'Val av justerare'},{number:2,title:'Ekonomisk månadsrapport och uppföljning av budget'}],documents:[{title:'Kallelse till kommunfullmäktige',url:'__SOURCE__/agenda/kallelsepdf?downloadMode=open'}]}],
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
 today_cell=page.locator('.official-day.is-today')
 assert today_cell.count()==1
 assert today_cell.locator('[aria-current="date"]').inner_text()==str(now.day)
 assert today_cell.get_by_text('Idag',exact=True).is_visible()
 assert page.locator('.official-event').count()==1
 assert page.locator('.official-source-diagnostics summary').count()==1
 page.locator('.official-source-diagnostics summary').click()
 assert 'Kommunfullmäktige' in page.locator('.official-source-diagnostics').inner_text()
 assert 'Senast inlästa möten' in page.locator('.official-source-diagnostics').inner_text()
 assert page.locator('.official-event').first.get_attribute('href')==source
 assert page.locator('.official-event').first.get_attribute('rel')=='noopener noreferrer'
 assert not page.locator('#official-calendar-sync').count(), 'Non-admin cannot trigger poll'
 assert page.locator('.meeting-list-pane').is_visible(), 'Private meetings must remain available'
 assert page.evaluate('window.officialGets')==2, 'Dashboard and meetings each load the read-only calendar'
 page.locator('#official-calendar-refresh').click()
 page.wait_for_function('window.officialGets===3')
 assert page.locator('.official-event').count()==1
 page.locator('[data-official-month="1"]').click()
 assert page.locator('.official-event').count()==0
 assert page.locator('.official-day.is-today').count()==0
 page.locator('[data-official-month="-1"]').click()
 assert page.locator('.official-event').count()==1
 assert page.locator('.official-day.is-today').count()==1
 assert page.locator('[data-official-prepare]').count()==1
 # Long agendas must render outside the narrow calendar day, with clear mobile navigation.
 page.locator('[data-official-agenda]').click()
 assert page.locator('.official-agenda-view').is_visible()
 assert page.locator('.official-calendar-grid').count()==0
 assert page.locator('.official-agenda-entry').count()==2
 assert page.locator('.official-agenda-list [data-official-point]').count()==2
 assert page.locator('.official-agenda-entry-heading').first.inner_text().count('1.')==1
 assert page.locator('.official-agenda-documents summary').is_visible()
 page.locator('.official-agenda-documents summary').click()
 assert page.get_by_role('link',name='Kallelse till kommunfullmäktige').count()==1
 assert page.evaluate('document.documentElement.scrollWidth')<=392
 page.locator('#official-agenda-back').click()
 page.locator('.official-calendar-grid').wait_for()
 assert page.locator('.official-agenda-view').count()==0
 gets_after_back=page.evaluate('window.officialGets')
 page.locator('[data-official-agenda]').click()
 page.locator('[data-official-index="0"]').click()
 assert page.locator('#meeting-form').is_visible()
 assert page.evaluate('window.officialGets')==gets_after_back
 assert page.evaluate('document.documentElement.scrollWidth')<=392
 page.locator('[data-official-prepare]').click()
 assert page.locator('#meeting-form').is_visible()
 assert page.locator('#meeting-form [name="title"]').input_value()=='Kommunfullmäktige – mötesförberedelser'
 assert page.locator('#meeting-form [name="meeting_date"]').input_value()==meeting_date
 assert page.locator('#meeting-form [name="start_time"]').input_value()=='18:00'
 assert page.locator('.meeting-metadata a[href="'+source+'"]').count()==1
 assert page.evaluate('window.officialGets')==gets_after_back, 'Preparing a draft must not fetch or change external data'
 assert page.evaluate('document.documentElement.scrollWidth')<=390+2
 assert not errors,errors
 browser.close()
print('PASS public calendar, dedicated responsive agenda, browser back, source links and private preparation')
