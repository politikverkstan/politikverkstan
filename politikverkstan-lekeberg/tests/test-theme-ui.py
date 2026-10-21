"""Browser checks for neutral branding and a shared, persistent light/dark mode."""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright

root=Path(__file__).resolve().parents[1]
public=(root/'dist/index.html').read_text(encoding='utf-8')
assert 'SD Arbetsrum' not in public
assert 'class="pv-protected"' in public and 'Logga in ↗' in public
# Resolve the Worker export without reading a live account or Cloudflare secrets.
import subprocess
private=json.loads(subprocess.run([
    'node','--input-type=module','-e',
    "import {WORKROOM_HTML} from './worker/workroom-page.mjs';console.log(JSON.stringify(WORKROOM_HTML.replaceAll('__CSP_NONCE__','test')));"
],cwd=root,capture_output=True,text=True,check=True).stdout)

mock=r"""
window.fetch=async (url)=>{
 const p=String(url),r={};
 if(p==='/api/private/me')r.user={email:'tester@example.se',name:'Testare',role:'user'};
 else if(p.startsWith('/api/private/motions'))r.motions=[];
 else if(p==='/api/private/branding')r.logo=null;
 else if(p==='/api/private/ideas')r.ideas=[];
 else r.error='Saknas';
 return new Response(JSON.stringify(r),{status:r.error?404:200,headers:{'content-type':'application/json'}});
};
"""
private=private.replace('<script nonce="test">','<script nonce="test">'+mock+'</script><script nonce="test">',1)

with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 context=browser.new_context(viewport={'width':1360,'height':920},color_scheme='light')
 context.route('https://portal.example.test/',lambda r:r.fulfill(status=200,content_type='text/html',body=public))
 context.route('https://portal.example.test/arbetsrum',lambda r:r.fulfill(status=200,content_type='text/html',body=private))
 page=context.new_page()
 errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto('https://portal.example.test/')
 assert page.get_by_role('link',name='Arbetsyta').count()>=1
 assert page.locator('[data-theme]').get_attribute('data-theme')=='light'
 before=page.locator('.topbar').evaluate('(el)=>getComputedStyle(el).backgroundColor')
 page.locator('#theme-toggle').click()
 assert page.locator('html').get_attribute('data-theme')=='dark'
 after=page.locator('.topbar').evaluate('(el)=>getComputedStyle(el).backgroundColor')
 assert before!=after, (before,after)
 assert page.evaluate("localStorage.getItem('politikverkstan-theme')")=='dark'
 page.screenshot(path=str(root/'preview-dark-public.png'))
 page.goto('https://portal.example.test/arbetsrum')
 page.locator('.aw-hero h1').get_by_text('Politikverkstan').wait_for()
 assert page.title().startswith('Arbetsyta |')
 assert page.locator('html').get_attribute('data-theme')=='dark'
 assert page.locator('#theme-toggle').is_visible()
 page.screenshot(path=str(root/'preview-dark-workroom.png'))
 page.locator('#theme-toggle').click()
 assert page.locator('html').get_attribute('data-theme')=='light'
 page.goto('https://portal.example.test/')
 assert page.locator('html').get_attribute('data-theme')=='light'
 assert page.evaluate("localStorage.getItem('politikverkstan-theme')")=='light'
 assert not errors,errors
 context.close()
 browser.close()
print('PASS UI: neutral branding, responsive theme switch, shared preference, reload, protected page')
