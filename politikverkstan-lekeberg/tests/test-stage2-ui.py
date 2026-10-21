"""Stage 2 UI: owner-private case register, labels, editing, search and print layout."""
from pathlib import Path
import subprocess
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
node="import {WORKROOM_HTML} from './worker/workroom-page.mjs'; console.log(WORKROOM_HTML.replaceAll('__CSP_NONCE__','test'))"
html=subprocess.run(['node','--input-type=module','-e',node],cwd=root,check=True,capture_output=True,text=True).stdout
mock=r"""<script nonce="test">
window.testCases=[];
const uid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
window.fetch=async (path,opts={})=>{
 const method=opts.method||'GET', data=opts.body&&!(opts.body instanceof FormData)?JSON.parse(opts.body):null;
 let result={},status=200;
 if(path==='/api/private/me')result={user:{email:'a@test.se',name:'Test',role:'user'}};
 else if(path==='/api/private/motions')result={motions:[]};
 else if(path==='/api/private/motions?scope=shared')result={motions:[]};
 else if(path.startsWith('/api/private/motions?'))result={motions:[]};
 else if(path==='/api/private/branding')result={logo:null};
 else if(path==='/api/private/files?scope=mine')result={files:[],folders:[]};
 else if(path==='/api/private/cases'&&method==='GET')result={cases:window.testCases};
 else if(path==='/api/private/cases'&&method==='POST'){
   let item={...data,id:uid,revision:1,updated_at:'2026-10-21T15:00:00Z'};
   window.testCases.push(item);result={id:uid,revision:1,updated_at:item.updated_at};status=201;
 }
 else if(path==='/api/private/cases/'+uid&&method==='PUT'){
   let item={...window.testCases[0],...data,revision:window.testCases[0].revision+1};
   window.testCases[0]=item;result={id:uid,revision:item.revision,updated_at:'2026-10-21T16:00:00Z'};
 }
 else if(path==='/api/private/cases/'+uid&&method==='DELETE'){window.testCases=[];result={ok:true};}
 else{result={error:'Hittades inte'};status=404;}
 return new Response(JSON.stringify(result),{status,headers:{'content-type':'application/json'}});
};
</script>"""
html=html.replace('<script nonce="test">',mock+'<script nonce="test">',1)
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=b.new_page(viewport={'width':1440,'height':960}); errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('dialog',lambda d:d.accept())
 page.set_content(html,wait_until='domcontentloaded')
 page.locator('[data-tab="cases"]').first.click()
 page.locator('#case-new').click()
 assert page.locator('#case-form').is_visible()
 page.locator('#case-form [name="title"]').fill('Budgetuppföljning BUN')
 page.locator('#case-form [name="labels"]').fill('budget, ekonomi')
 page.locator('#case-form [name="summary"]').fill('Behov av verifierade uppgifter.')
 page.locator('#case-form [name="questions"]').fill('Vilka kostnader har uppstått?')
 page.locator('#case-form [name="meeting_date"]').fill('2026-11-02')
 page.locator('#case-form button[type="submit"]').click()
 page.locator('.case-result').wait_for()
 assert page.locator('.case-result').count()==1
 assert page.locator('#case-print').count()==1
 assert page.evaluate("window.testCases[0].labels.join(',')")=='budget,ekonomi'
 assert page.evaluate("window.testCases[0].title")=='Budgetuppföljning BUN'
 page.locator('#case-search').fill('icke förekommande')
 assert page.locator('.case-result').count()==0
 page.locator('#case-search').fill('budget')
 assert page.locator('.case-result').count()==1
 page.locator('[name="case-not-there"]').count()==0
 page.locator('#case-form [name="risks"]').fill('Potentiell risk för ökade driftkostnader.')
 page.locator('#case-form button[type="submit"]').click()
 assert page.evaluate("window.testCases[0].revision")==2
 assert 'Potentiell risk' in page.locator('#case-print').inner_text()
 page.locator('#case-delete').click()
 assert page.locator('.case-result').count()==0
 assert not errors,errors
 b.close()
print('PASS stage 2: case creation, field preservation, labels, search, revision update, decision brief, deletion')
