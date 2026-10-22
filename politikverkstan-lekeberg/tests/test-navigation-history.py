"""Regression: native browser mouse Back/Forward and in-app Back in both portals."""
from pathlib import Path
import subprocess
from playwright.sync_api import sync_playwright

root=Path(__file__).resolve().parents[1]
public=(root/"dist/index.html").read_text(encoding="utf8")
script="import {WORKROOM_HTML} from './worker/workroom-page.mjs';console.log(WORKROOM_HTML.replaceAll('__CSP_NONCE__','test'));"
private=subprocess.run(["node","--input-type=module","-e",script],cwd=root,check=True,capture_output=True,text=True).stdout
mock=r"""<script nonce="test">
const cid='11111111-1111-4111-8111-111111111111',mid='22222222-2222-4222-8222-222222222222';
const sampleCase={id:cid,title:'Testärende BUN',committee:'Barn- och utbildningsnämnden',status:'granskning',meeting_date:'2026-11-02',labels:[],owner_email:'member@test.se',assignee_email:'member@test.se',scope:'team',is_owner:true,can_edit:true,revision:1};
const sampleMeeting={id:mid,title:'Nämndsammanträde',committee:'Barn- och utbildningsnämnden',meeting_date:'2026-11-02',start_time:'09:00',location:'Fjugesta',status:'planned',scope:'team',is_owner:true,revision:1,agenda_count:0};
window.fetch=async(path,opts={})=>{
 let result={},status=200;
 if(path==='/api/private/me')result={user:{email:'member@test.se',name:'Medlem',role:'user'}};
 else if(path==='/api/private/motions')result={motions:[]};
 else if(path.startsWith('/api/private/motions?'))result={motions:[]};
 else if(path==='/api/private/branding')result={logo:null};
 else if(path==='/api/private/tasks')result={tasks:[]};
 else if(path==='/api/private/cases')result={cases:[sampleCase]};
 else if(path==='/api/private/meetings')result={meetings:[sampleMeeting]};
 else if(path==='/api/private/directory')result={users:[]};
 else if(path==='/api/private/files?scope=mine')result={files:[],folders:[]};
 else if(path==='/api/private/cases/'+cid+'/comments')result={comments:[]};
 else if(path==='/api/private/meetings/'+mid)result={meeting:sampleMeeting,agenda:[],personal_note:''};
 else{result={error:'No mock: '+path};status=404;}
 return new Response(JSON.stringify(result),{status,headers:{'content-type':'application/json'}});
};
</script>"""
private=private.replace('<script nonce="test">',mock+'<script nonce="test">',1)

with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path="/usr/bin/chromium",args=["--no-sandbox"])
 context=browser.new_context(viewport={"width":1380,"height":950})
 page=context.new_page()
 errors=[]
 page.on("pageerror",lambda e:errors.append(str(e)))
 page.route("https://portal.test/",lambda route:route.fulfill(status=200,content_type="text/html",body=public))
 page.goto("https://portal.test/")
 assert page.locator(".sidebar [data-page=workspace]").first.get_attribute("class").find("active")>=0
 assert page.locator("#pv-nav-back").is_disabled()
 page.locator(".sidebar [data-page=matrix]").click()
 assert page.locator(".sidebar [data-page=matrix]").get_attribute("class").find("active")>=0
 page.locator(".sidebar [data-page=registry]").click()
 assert "Organisationer" in page.locator(".breadcrumb").inner_text()
 page.locator("#pv-nav-back").click()
 page.wait_for_function("document.querySelector('.sidebar [data-page=matrix]')?.classList.contains('active')")
 page.go_back()
 page.wait_for_function("document.querySelector('.sidebar [data-page=workspace]')?.classList.contains('active')")
 page.go_forward()
 page.wait_for_function("document.querySelector('.sidebar [data-page=matrix]')?.classList.contains('active')")
 assert page.locator("#pv-nav-back").is_enabled()
 assert not errors,errors
 page.close()

 work=context.new_page()
 work_errors=[]
 work.on("pageerror",lambda e:work_errors.append(str(e)))
 work.route("https://portal.test/arbetsrum",lambda route:route.fulfill(status=200,content_type="text/html",body=private))
 work.goto("https://portal.test/arbetsrum")
 work.get_by_role("heading",name="Min arbetsöversikt").wait_for()
 assert work.locator("#work-nav-back").is_disabled()
 work.locator('[data-tab="cases"]').first.click()
 work.locator("[data-case-open]").first.wait_for()
 work.locator("[data-case-open]").first.click()
 work.locator("#case-form").wait_for()
 assert work.evaluate("history.state.politikverkstanWorkroom.depth")==2
 work.locator("#work-nav-back").click()
 work.wait_for_function("document.querySelector('#case-form')===null && document.querySelector('[data-case-open]')!==null")
 work.go_back()
 work.get_by_role("heading",name="Min arbetsöversikt").wait_for()
 work.go_forward()
 work.locator("[data-case-open]").first.wait_for()
 assert work.locator("#case-form").count()==0
 work.locator('[data-tab="overview"]').first.click()
 work.get_by_role("heading",name="Min arbetsöversikt").wait_for()
 work.locator("[data-dashboard-meeting]").first.click()
 work.locator("#meeting-form").wait_for()
 work.locator("#work-nav-back").click()
 work.wait_for_function("document.querySelector('#meeting-form')===null && document.querySelector('[data-meeting-open]')!==null")
 assert not work_errors,work_errors
 browser.close()
print("PASS: public and workroom mouse Back/Forward, matching back buttons, case and meeting detail restoration")
