"""Responsive spacing regression for the public homepage and protected dashboard."""
from pathlib import Path
import subprocess
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
public = (root/'dist/index.html').read_text(encoding='utf8')
node = "import {WORKROOM_HTML} from './worker/workroom-page.mjs';console.log(WORKROOM_HTML.replaceAll('__CSP_NONCE__','test'));"
protected = subprocess.run(
    ['node','--input-type=module','-e',node],cwd=root,
    capture_output=True,text=True,check=True
).stdout
stub = r"""<script nonce="test">
window.fetch=async (path,options={})=>{
 const p=String(path);
 const result=p==='/api/private/me'?{user:{email:'tester@example.se',name:'Testare',role:'user'}}:
 p==='/api/private/branding'?{logo:null}:
 p==='/api/private/motions'||p.startsWith('/api/private/motions?')?{motions:[]}:
 p==='/api/private/cases'?{cases:[]}:
 p==='/api/private/meetings'?{meetings:[]}:
 p==='/api/private/tasks'?{tasks:[]}:{ok:true};
 return new Response(JSON.stringify(result),{status:200,headers:{'content-type':'application/json'}});
};
</script>"""
protected=protected.replace('<script nonce="test">',stub+'<script nonce="test">',1)

def geometry(page, selector, inset):
    return page.locator(selector).first.evaluate("""(el) => {
      const a=el.getBoundingClientRect(), s=getComputedStyle(el);
      return {
        left:a.left,right:a.right,width:a.width,
        padLeft:parseFloat(s.paddingLeft),padRight:parseFloat(s.paddingRight),
        scrollWidth:el.scrollWidth,clientWidth:el.clientWidth
      };
    }""")

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    for width in [320,375,390,530,768,1024,1440]:
        mobile=width<=530
        page=browser.new_page(viewport={'width':width,'height':900},is_mobile=mobile,has_touch=mobile)
        errors=[]
        page.on('pageerror',lambda error: errors.append(str(error)))
        page.set_content(public,wait_until='domcontentloaded')
        box=page.locator('.pv-workshop-entry')
        box.wait_for()
        assert box.is_visible()
        outer=geometry(page,'.pv-workshop-entry',16)
        expected=18 if width<=530 else 24 if width<=780 else 28
        assert outer['padLeft']>=expected-1,(width,'workshop left',outer)
        assert outer['padRight']>=expected-1,(width,'workshop right',outer)
        card=box.bounding_box()
        for selector in ['.pv-workshop-entry>div','.pv-workshop-entry>.primary-button']:
            element=page.locator(selector).bounding_box()
            assert element['x']>=card['x']+outer['padLeft']-2,(width,selector,'left')
            assert element['x']+element['width']<=card['x']+card['width']-outer['padRight']+2,(width,selector,'right')
        for selector in ['.pv-feature','.pv-protected','.pv-hero-copy']:
            ui=geometry(page,selector,0)
            assert ui['padLeft']>=14,(width,selector,ui)
            assert ui['padRight']>=14,(width,selector,ui)
        assert page.evaluate('document.documentElement.scrollWidth')<=width+2,(width,'public horizontal overflow')
        assert not errors,(width,errors)
        page.close()

    for width in [320,375,390,768,1280]:
        mobile=width<=390
        page=browser.new_page(viewport={'width':width,'height':900},is_mobile=mobile,has_touch=mobile)
        errors=[]
        page.on('pageerror',lambda error: errors.append(str(error)))
        page.set_content(protected,wait_until='domcontentloaded')
        page.locator('.aw-workbox').wait_for()
        for selector in ['.aw-workbox','.db-panel','.db-task-form','.aw-shortcut']:
            ui=geometry(page,selector,0)
            assert ui['padLeft']>=14,(width,selector,ui)
            assert ui['padRight']>=14,(width,selector,ui)
        assert page.evaluate('document.documentElement.scrollWidth')<=width+2,(width,'workroom horizontal overflow')
        assert not errors,(width,errors)
        page.close()
    browser.close()
print('PASS responsive spacing: 320–1440 px, public and protected home cards')
