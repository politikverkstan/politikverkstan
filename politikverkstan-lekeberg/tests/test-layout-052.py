from pathlib import Path
from playwright.sync_api import sync_playwright
import subprocess
root=Path(__file__).resolve().parents[1]
subprocess.run(['node','--input-type=module','-e',"import {WORKROOM_HTML} from './worker/workroom-page.mjs';import fs from 'node:fs';fs.writeFileSync('tests/_052-preview.html',WORKROOM_HTML.replaceAll('__CSP_NONCE__','test'));"],cwd=root,check=True)
html=(root/'tests/_052-preview.html').read_text()
mock=r'''<script nonce="test">
window.fetch=async (p,o={})=>{let result={},rows=window.docs||[],method=o.method||'GET',data=o.body?JSON.parse(o.body):null;
if(p==='/api/private/me')result={user:{email:'a@example.se',name:'A',role:'user'}};
else if(p==='/api/private/motions')result={motions:rows.filter(x=>!x.archived_at&&!x.trashed_at)};
else if(p==='/api/private/motions?scope=mine&lifecycle=archived')result={motions:rows.filter(x=>x.archived_at&&!x.trashed_at)};
else if(p==='/api/private/motions?scope=mine&lifecycle=trash')result={motions:rows.filter(x=>x.trashed_at)};
else if(p==='/api/private/motions?scope=shared')result={motions:rows.filter(x=>!x.archived_at&&!x.trashed_at)};
else if(p==='/api/private/motions?scope=shared&lifecycle=archived')result={motions:rows.filter(x=>x.archived_at&&!x.trashed_at)};
else if(p==='/api/private/ideas')result={ideas:window.ideas||[]};
else if(p.match(/\/api\/private\/motions\/[a-f0-9-]+\/lifecycle$/)&&method==='POST'){let d=rows.find(x=>p.includes(x.id));if(data.action==='archive')d.archived_at=new Date().toISOString();if(data.action==='unarchive')d.archived_at=null;if(data.action==='trash')d.trashed_at=new Date().toISOString();if(data.action==='restore')d.trashed_at=null;result={ok:true};}
else if(p.match(/\/api\/private\/ideas\/[a-f0-9-]+$/)&&method==='PATCH'){Object.assign(window.ideas.find(x=>p.includes(x.id)),data);result={ok:true};}
else if(p.match(/\/api\/private\/ideas\/[a-f0-9-]+\/history$/))result={history:[]};
else result={ok:true,motions:[],comments:[],shares:[],history:[]};
return new Response(JSON.stringify(result),{status:200,headers:{'content-type':'application/json'}})};
window.docs=[{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',owner_email:'a@example.se',title:'Gemensam skolmotion',status:'utkast',category:'Annat',team_permission:'comment',revision:1,share_count:0,created_at:'2026-10-20T13:00:00Z',updated_at:'2026-10-20T13:00:00Z'}];
window.ideas=[{id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',title:'Lokal idé',status:'ny',owner_email:'a@example.se',category:'Annat',problem:'Idétext',action:'Undersök',comment_count:0}];
</script>'''
html=html.replace('<script nonce="test">',mock+'<script nonce="test">')
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=b.new_page(viewport={'width':1370,'height':920});errors=[];page.on('pageerror',lambda ex:errors.append(str(ex)));page.on('dialog',lambda d:d.accept())
 page.set_content(html,wait_until='domcontentloaded');page.locator('.aw-hero').wait_for()
 assert page.locator('.aw-shortcut').count()==2
 assert page.locator('.aw-motion-card').count()==1
 assert page.locator('.aw-workbox').is_visible()
 assert page.locator('.aw-motion-card').first.get_by_text('Gemensam skolmotion').is_visible()
 assert page.locator('.aw-workbox').bounding_box()['y']>=page.locator('.aw-shortcuts').bounding_box()['y']
 page.screenshot(path=str(root/'forhandsbild-052-arbetsrum.png'),full_page=True)
 page.get_by_role('button',name='Våra motioner',exact=True).click()
 assert page.get_by_text('Gemensam skolmotion').is_visible(),'Owner team motion must be shown'
 page.get_by_role('button',name='Mina motioner',exact=True).click()
 assert page.get_by_text('Gemensam skolmotion').is_visible()
 page.locator('details.actions-menu summary').click();page.get_by_role('button',name='Arkivera motion').click()
 page.get_by_role('button',name='Arkiverade').click();assert page.get_by_text('Gemensam skolmotion').is_visible()
 page.get_by_role('button',name='Aktiva',exact=True).click();assert page.get_by_text('Gemensam skolmotion').count()==0
 page.get_by_role('button',name='Arkiverade').click();page.locator('details.actions-menu summary').click();page.get_by_role('button',name='Återaktivera').click()
 page.get_by_role('button',name='Våra idéer',exact=True).click();page.get_by_text('Lokal idé').wait_for(timeout=3000)
 page.locator('[data-idea-status]').select_option('avslutad')
 page.get_by_text('Lokal idé').wait_for(state='detached',timeout=3000)
 page.get_by_role('button',name='Avslutade idéer (1)').click();page.get_by_text('Lokal idé').wait_for(timeout=3000)
 assert not errors,errors
 pub=b.new_page(viewport={'width':1400,'height':900});pub.set_content((root/'dist/index.html').read_text(),wait_until='domcontentloaded');pub.get_by_role('button',name='Integritet').click()
 assert pub.locator('.privacy-panels .main-card').count()==3
 pad=pub.locator('.privacy-panels .main-card').first.evaluate('(e)=>parseFloat(getComputedStyle(e).paddingLeft)');assert pad>=24,pad
 pub.screenshot(path=str(root/'forhandsbild-052-integritet.png'),full_page=True)
 mobile=b.new_page(viewport={'width':390,'height':844},is_mobile=True,has_touch=True);mobile.set_content(html,wait_until='domcontentloaded');mobile.locator('.aw-shortcut').first.wait_for()
 assert mobile.locator('.aw-shortcuts').evaluate('(e)=>getComputedStyle(e).gridTemplateColumns.split(" ").length')==1
 mobile.screenshot(path=str(root/'forhandsbild-052-mobil.png'),full_page=True)
 b.close()
print('PASS 0.5.2 UI: 2-column balanced layout, owner sees shared motion, archive/restore, idea status filters, privacy padding, mobile')
