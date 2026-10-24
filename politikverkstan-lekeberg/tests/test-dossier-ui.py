"""Browser regression: structured source/findings and manual decision provenance."""
from pathlib import Path
import subprocess
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
html=subprocess.run(['node','--input-type=module','-e',
 "import {WORKROOM_HTML} from './worker/workroom-page.mjs';console.log(WORKROOM_HTML.replaceAll('__CSP_NONCE__','test'));"],
 cwd=root,capture_output=True,text=True,check=True).stdout
mock=r"""<script nonce="test">
const ID='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
window.caseData={id:ID,title:'Budgetärende',committee:'Kommunfullmäktige',status:'granskning',
 meeting_date:'2026-10-19',scope:'mine',is_owner:true,can_edit:true,labels:[],revision:1,
 source_refs:[],findings:[],official_decision:{text:'',date:'',reference:'',url:'',verification:'not_checked'}};
window.saveCount=0;
window.fetch=async(path,opts={})=>{
 let result={},status=200,method=opts.method||'GET',v=opts.body?JSON.parse(opts.body):null;
 if(path==='/api/private/me')result={user:{email:'owner@test.se',role:'user'}};
 else if(path==='/api/private/motions'||path.startsWith('/api/private/motions?'))result={motions:[]};
 else if(path==='/api/private/branding')result={logo:null};
 else if(path==='/api/private/cases'&&method==='GET')result={cases:[window.caseData]};
 else if(path==='/api/private/cases/'+ID+'/comments')result={comments:[]};
 else if(path==='/api/private/cases/'+ID&&method==='PUT'){
  window.caseData={...window.caseData,...v,revision:window.caseData.revision+1};window.saveCount++;
  result={id:ID,revision:window.caseData.revision};
 }
 else if(path==='/api/private/files?scope=mine')result={files:[],folders:[]};
 else if(path==='/api/private/directory')result={users:[]};
 else if(path==='/api/private/meetings')result={meetings:[]};
 else if(path==='/api/private/tasks')result={tasks:[]};
 else if(path==='/api/private/official-meetings')result={meetings:[],sources:[],committees:[]};
 else if(path==='/api/private/workflow/dashboard')result={followups:[],total_open:0};
 else if(path.endsWith('/history'))result={events:[],next_offset:null};
 else if(path.endsWith('/meetings'))result={meetings:[]};
 else if(path.endsWith('/followups'))result={followups:[]};
 else if(path.endsWith('/position'))result={position:null};
 else{status=404;result={error:'Mock saknas'};}
 return new Response(JSON.stringify(result),{status,headers:{'content-type':'application/json'}});
};
</script>"""
html=html.replace('<script nonce="test">',mock+'<script nonce="test">',1)
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':390,'height':850})
 errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('dialog',lambda d:d.accept())
 page.set_content(html,wait_until='domcontentloaded')
 page.locator('[data-tab="cases"]').first.click()
 page.locator('[data-case-open]').first.click()
 page.locator('#case-dossier').wait_for()
 page.locator('#dossier-add-source').click()
 page.locator('#dossier-source-form [name=title]').fill('Budgetunderlag')
 page.locator('#dossier-source-form [name=url]').fill('https://meetings.lekeberg.se/underlag')
 page.locator('#dossier-source-form button[type=submit]').click()
 page.wait_for_function('window.caseData.source_refs.length===1')
 page.locator('#dossier-add-finding').click()
 page.locator('#dossier-finding-form [name=title]').fill('Underlagsbrist i kalkylen')
 page.locator('#dossier-finding-form [name=severity]').select_option('kritisk')
 page.locator('#dossier-finding-form button[type=submit]').click()
 page.wait_for_function('window.caseData.findings.length===1')
 page.locator('#dossier-decision-form [name=text]').fill('Fullmäktige beslutade om åtgärd.')
 page.locator('#dossier-decision-form [name=date]').fill('2026-10-19')
 page.locator('#dossier-decision-form [name=reference]').fill('KF § 28')
 page.locator('#dossier-decision-form [name=url]').fill('https://meetings.lekeberg.se/protokoll')
 page.locator('#dossier-decision-form [name=verification]').select_option('source_checked')
 page.locator('#dossier-decision-form button[type=submit]').click()
 page.wait_for_function("window.caseData.official_decision.verification==='source_checked'")
 page.get_by_text('Källan har markerats',exact=False).wait_for()
 assert page.evaluate('window.saveCount')==3
 assert page.evaluate('document.documentElement.scrollWidth')<=400
 assert not errors,errors
 browser.close()
print('PASS 1.9–2.0 dossier UI: sources, findings, manually checked protocol')
