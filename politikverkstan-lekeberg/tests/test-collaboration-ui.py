from pathlib import Path
import subprocess
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
subprocess.run(['node','--input-type=module','-e',"import {WORKROOM_HTML} from './worker/workroom-page.mjs';import fs from 'node:fs';fs.writeFileSync('tests/_collab-preview.html',WORKROOM_HTML.replaceAll('__CSP_NONCE__','test'));"],cwd=root,check=True)
html=(root/'tests/_collab-preview.html').read_text()
mock=r'''<script nonce="test">
window.mockUser={email:'anna@example.se',name:'Anna',role:'user'};
window.docs={}; window.ideas={};window.comments={};window.icomments={};window.shares={};
window.count=0;window.uuid=()=>{window.count++;return 'aaaaaaaa-aaaa-4aaa-8aaa-'+String(window.count).padStart(12,'0');};
window.people=[{email:'anna@example.se',display_name:'Anna'},{email:'bert@example.se',display_name:'Bert'}];
window.fetch=async (path,options={})=>{
const method=options.method||'GET',data=options.body?JSON.parse(options.body):null;
let result={},status=200;
let m=String(path).match(/^\/api\/private\/motions\/([a-f0-9-]{36})(.*)$/),i=String(path).match(/^\/api\/private\/ideas\/([a-f0-9-]{36})(.*)$/);
if(path==='/api/private/me')result={user:window.mockUser};
else if(path==='/api/private/directory')result={users:people};
else if(path==='/api/private/motions?scope=shared')result={motions:Object.values(docs).filter(x=>x.owner_email!==mockUser.email&&x.team_permission!=='none')};
else if(path==='/api/private/motions'&&method==='GET')result={motions:Object.values(docs).filter(x=>x.owner_email===mockUser.email)};
else if(path==='/api/private/motions'&&method==='POST'){const id=uuid();const obj={...data,id,permission:'owner',owner_email:mockUser.email,owner_name:mockUser.name,team_permission:'none',revision:1,updated_at:'2026-10-20T10:00:00Z'};docs[id]=obj;result=obj;status=201;}
else if(m){const [_,id,suffix]=m,doc=docs[id],owner=doc?.owner_email===mockUser.email;
 if(suffix==='/shares'&&method==='GET')result=shares[id]||{team_permission:'none',shares:[]};
 else if(suffix==='/shares'&&method==='PUT'){shares[id]=data;doc.team_permission=data.team_permission;result={ok:true};}
 else if(suffix==='/comments'&&method==='GET')result={comments:comments[id]||[]};
 else if(suffix==='/comments'&&method==='POST'){comments[id]??=[];comments[id].push({id:uuid(),author_name:mockUser.name,author_email:mockUser.email,created_at:'2026-10-20T11:00:00Z',status:'open',body:data.body});result={ok:true};status=201;}
 else if(suffix===''&&method==='GET')result={motion:{...doc,permission:owner?'owner':(doc?.team_permission||'read')}};
 else if(suffix===''&&method==='PUT'){docs[id]={...doc,...data,revision:doc.revision+1};result=docs[id];}
 else if(suffix==='/versions'&&method==='GET')result={versions:[]};
 else {status=404;result={error:'Okänd metod'};}
}
else if(path==='/api/private/ideas'&&method==='GET')result={ideas:Object.values(ideas)};
else if(path==='/api/private/ideas'&&method==='POST'){const id=uuid();ideas[id]={...data,id,status:'ny',owner_email:mockUser.email,owner_name:mockUser.name,comment_count:0};result={id,ok:true};status=201;}
else if(i){const [_,id,suffix]=i;
 if(suffix==='/motions'&&method==='GET')result={motions:Object.values(docs).filter(x=>x.origin_idea_id===id&&x.owner_email===mockUser.email)};
 else if(suffix==='/comments'&&method==='GET')result={comments:icomments[id]||[]};
 else if(suffix==='/comments'&&method==='POST'){icomments[id]??=[];icomments[id].push({id:uuid(),author_email:mockUser.email,author_name:mockUser.name,body:data.body,created_at:'2026-10-20T11:00:00Z'});ideas[id].comment_count++;result={ok:true};status=201;}
 else if(suffix===''&&method==='PATCH'){Object.assign(ideas[id],data);result={ok:true};}
 else{status=404;result={error:'Saknas'};}
}
else if(path==='/api/private/users')result={users:people};
else{status=404;result={error:'Okänt API: '+path};}
return new Response(JSON.stringify(result),{status,headers:{'content-type':'application/json'}});
};
</script>'''
html=html.replace('<script nonce="test">',mock+'<script nonce="test">')
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=b.new_page(viewport={'width':1320,'height':880})
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('dialog',lambda d:d.accept())
 page.set_content(html,wait_until='domcontentloaded')
 page.get_by_role('button',name='Skapa en motion').click()
 page.get_by_text('Dela motion').wait_for()
 page.locator('[data-field="title"]').fill('Motion för samarbete')
 page.locator('#save-motion').click();page.get_by_text('Motionen sparades.').wait_for()
 page.locator('[data-share-email="bert@example.se"]').select_option('comment')
 page.get_by_role('button',name='Spara delning').click()
 page.get_by_text('Delningen uppdaterades.').wait_for()
 assert page.evaluate("Object.values(window.shares)[0].shares[0].email")=='bert@example.se'
 page.locator('#comment-form textarea').fill('Bör belysa ekonomin.')
 page.get_by_role('button',name='Kommentera',exact=True).click()
 page.get_by_text('Bör belysa ekonomin.').wait_for()
 page.get_by_role('button',name='Våra motioner').click()
 page.get_by_text('Våra motioner',exact=True).first.wait_for()
 page.get_by_role('button',name='Våra idéer').click()
 page.get_by_role('heading',name='Registrera en idé').wait_for()
 page.locator('#idea-form [name="title"]').fill('Nya undersökningsbehov')
 page.locator('#idea-form [name="problem"]').fill('Begränsat underlag.')
 page.locator('#idea-form [name="action"]').fill('Sammanställ underlag.')
 page.get_by_role('button',name='Publicera i Våra idéer').click()
 page.get_by_text('Nya undersökningsbehov').wait_for()
 page.get_by_role('button',name='Kommentarer (0)').click()
 page.locator('#idea-comment-form textarea').fill('Kontrollera med förvaltningen.')
 page.get_by_role('button',name='Spara kommentar').click()
 page.get_by_text('Kontrollera med förvaltningen.').wait_for()
 page.get_by_role('button',name='Skapa motion av idé').click()
 page.locator('[data-field="title"]').wait_for()
 assert page.locator('[data-field="title"]').input_value()=='Nya undersökningsbehov'
 assert page.evaluate("Object.values(window.docs).some(x=>x.origin_idea_id && x.team_permission==='none')")
 page.screenshot(path=str(root/'preview-shared-motion.png'),full_page=True)
 # A second user sees an authorized shared motion in read-only mode.
 read_html=html.replace("window.mockUser={email:'anna@example.se',name:'Anna',role:'user'};","window.mockUser={email:'bert@example.se',name:'Bert',role:'user'};")
 read_html=read_html.replace('window.docs={};',"window.docs={'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb':{id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',title:'Delat läsdokument',owner_email:'anna@example.se',owner_name:'Anna',team_permission:'read',revision:1,status:'utkast',category:'Annat',problem:'Befintligt innehåll',motivation:'Text',proposal:'',clauses:['att kontrollera.'],signer:'Anna',party:'SD',date:'2026-10-20',reference:'',notes:'',created_at:'2026-10-20T10:00:00Z',updated_at:'2026-10-20T10:00:00Z'}};")
 read=b.new_page(viewport={'width':1320,'height':880})
 read.on('pageerror',lambda e:errors.append(str(e)))
 read.set_content(read_html,wait_until='domcontentloaded')
 read.get_by_role('button',name='Våra motioner',exact=True).click()
 read.get_by_text('Delat läsdokument').wait_for()
 read.get_by_role('button',name='Öppna').click()
 read.locator('[data-field="title"]').wait_for()
 assert read.locator('[data-field="title"]').is_disabled()
 assert read.locator('#save-motion').count()==0
 assert read.locator('#comment-form').count()==0
 assert read.locator('#export-motion').count()==1
 assert read.locator('#share-form').count()==0
 read.screenshot(path=str(root/'preview-shared-readonly.png'),full_page=True)
 read.close()
 assert not errors,errors
 b.close()
print('PASS collaboration UI: motion save, specific person sharing, comments, ideas by standard user, idea comments, creating private motion from idea')
