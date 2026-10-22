"""UI regression: public pages never fetch or render protected documents."""
from pathlib import Path
import subprocess
from playwright.sync_api import sync_playwright

root=Path(__file__).resolve().parents[1]
public=(root/'dist/index.html').read_text(encoding='utf-8')
assert '/api/private/motions' not in public
assert 'Senaste förslag' not in public
assert 'class="pv-hero"' in public
assert '/lekeberg-landskap.svg' in public

node="import {WORKROOM_HTML} from './worker/workroom-page.mjs'; console.log(WORKROOM_HTML.replaceAll('__CSP_NONCE__','test'));"
private=subprocess.run(['node','--input-type=module','-e',node],cwd=root,check=True,capture_output=True,text=True).stdout
mock=r"""<script nonce="test">
const myMotion={id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',title:'Privat testmotion',owner_email:'test@example.se',status:'utkast',category:'Annat',updated_at:'2026-10-20T14:00:00Z',team_permission:'none'};
const sharedMotion={id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',title:'Delad testmotion',owner_email:'other@example.se',owner_name:'Medarbetare',status:'utkast',category:'Skola och utbildning',updated_at:'2026-10-21T11:00:00Z',permission:'read'};
window.fetch=async(path,options={})=>{
 const url=String(path);
 let result={};
 if(url==='/api/private/me')result={user:{email:'test@example.se',name:'Testare',role:'user'}};
 else if(url==='/api/private/motions')result={motions:[myMotion]};
 else if(url==='/api/private/motions?scope=shared')result={motions:[myMotion,sharedMotion]};
 else if(url.startsWith('/api/private/motions?'))result={motions:[]};
 else if(url==='/api/private/branding')result={logo:null};
 else result={error:'Inte tillgänglig'};
 return new Response(JSON.stringify(result),{status:result.error?404:200,headers:{'content-type':'application/json'}});
};
</script>"""
private=private.replace('<script nonce="test">',mock+'<script nonce="test">',1)

with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':1440,'height':900})
 errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content(public,wait_until='domcontentloaded')
 assert page.locator('.pv-hero').is_visible()
 assert page.locator('.pv-protected').count()==1
 assert page.locator('.pv-scenario-panel').count()==1
 assert page.locator('.pv-home-analyses .pv-feature').count()==4
 assert page.locator('.pv-home-extra .pv-feature[data-page="candidates"]').count()==1
 assert 'Alla partier separat' in page.locator('.pv-scenario-panel').inner_text()
 assert page.locator('.aw-motion-card').count()==0
 assert page.locator('.coalition-card').count()==0
 page.locator('.pv-feature[data-page="builder"]').click()
 assert page.locator('.coalition-card').count()==9
 page.locator('.sidebar [data-page="matrix"]').click()
 assert page.get_by_text('Fullständig fördelningsmatris').is_visible()
 page.locator('[data-page="workspace"]').first.click()
 assert page.locator('.pv-hero').is_visible()
 page.set_content(private,wait_until='domcontentloaded')
 page.locator('.aw-hero').wait_for()
 assert page.locator('.aw-motion-card').count()==2
 assert page.get_by_text('Privat testmotion').count()==1
 assert page.get_by_text('Delad testmotion').count()==1
 assert page.locator('.aw-no-docs').count()==0
 assert page.get_by_role('button',name='Skapa en motion').count()==1
 assert not errors,errors
 browser.close()
print('PASS 0.5.6 public/private landing separation and existing analytics')
