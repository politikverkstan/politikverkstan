from pathlib import Path
import json, subprocess, tempfile
import fitz
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
html_path=root/'tests'/'_workroom-preview.html'
subprocess.run(['node','--input-type=module','-e',"import {WORKROOM_HTML} from './worker/workroom-page.mjs';import fs from 'node:fs';fs.writeFileSync('tests/_workroom-preview.html',WORKROOM_HTML.replaceAll('__CSP_NONCE__','test'));"],cwd=root,check=True)
html=html_path.read_text(encoding='utf8');docid='f4b3c46c-e879-4667-881c-f79d36dd4e61'
docs={};now='2026-10-20T11:00:00Z'
mock = r"""
window.testDocs={};window.testFiles=[];window.testId='f4b3c46c-e879-4667-881c-f79d36dd4e61';
window.fetch=async (path,options={})=>{
 let method=options.method||'GET',data=options.body instanceof FormData?options.body:(options.body?JSON.parse(options.body):null),docs=window.testDocs;
 let result={},status=200;
 if(path==='/api/private/me') result={user:{email:'editor@example.se',name:'Testredaktör',role:'admin'}};
 else if(path==='/api/private/motions?scope=shared') result={motions:Object.values(docs)};
 else if(path==='/api/private/motions?scope=shared&lifecycle=archived')result={motions:[]};
 else if(path==='/api/private/motions?scope=mine&lifecycle=archived')result={motions:[]};
 else if(path==='/api/private/motions?scope=mine&lifecycle=trash')result={motions:[]};
 else if(path==='/api/private/files?scope=mine') result={files:window.testFiles,folders:[]};
 else if(path==='/api/private/files?scope=team') result={files:[],folders:[]};
 else if(path==='/api/private/files'&&method==='POST'){
  const file=data.get('file');const saved={id:'11111111-1111-1111-1111-'+String(window.testFiles.length+1).padStart(12,'0'),name:file.name,scope:'mine',folder_id:null,owner_email:'editor@example.se',size_bytes:file.size,created_at:'2026-10-20T11:00:00Z'};window.testFiles.push(saved);result=saved;status=201;
 }
 else if(path==='/api/private/directory') result={users:[{email:'editor@example.se',display_name:'Testredaktör'},{email:'other@example.se',display_name:'Kollega'}]};
 else if(path==='/api/private/motions/'+window.testId+'/shares') result={team_permission:'none',shares:[]};
 else if(path==='/api/private/motions/'+window.testId+'/comments') result={comments:[]};
 else if(path==='/api/private/motions'&&method==='GET') result={motions:Object.values(docs)};
 else if(path==='/api/private/motions'&&method==='POST'){
  result={...data,permission:'owner',owner_email:'editor@example.se',team_permission:'none',id:window.testId,revision:1,created_at:'2026-10-20T11:00:00Z',updated_at:'2026-10-20T11:00:00Z'};docs[window.testId]=result;status=201;
 }else if(path==='/api/private/motions/'+window.testId&&method==='PUT'){
  result={...data,id:window.testId,revision:data.revision+1,updated_at:'2026-10-20T11:00:00Z'};docs[window.testId]=result;
 }else if(path==='/api/private/motions/'+window.testId)result={motion:docs[window.testId]};
 else if(path==='/api/private/ideas')result={ideas:[]};
 else if(path==='/api/private/users')result={users:[]};
 else {status=404;result={error:'Saknas'};}
 return new Response(JSON.stringify(result),{status,headers:{'content-type':'application/json'}});
};
"""
html=html.replace('<script nonce="test">','<script nonce="test">'+mock+'</script><script nonce="test">')
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1450,'height':990},accept_downloads=True)
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.set_content(html,wait_until='domcontentloaded')
    assert page.locator('.aw-hero h1').get_by_text('Politikverkstan').is_visible()
    page.get_by_role('button',name='Skapa en motion').click()
    page.get_by_text('Redigera motion').wait_for(timeout=8000)
    page.locator('[data-field="title"]').fill('Tryggare skolvägar i Fjugesta')
    page.locator('[data-field="problem"]').fill('Flera skolvägar upplevs som otrygga för barn och vårdnadshavare.')
    page.locator('[data-field="motivation"]').fill('Kommunen bör klarlägga riskerna innan åtgärder prioriteras. Åtgärdens kostnad behöver belysas.')
    page.locator('[data-clause="0"]').fill('att kommunstyrelsen får i uppdrag att kartlägga särskilt riskfyllda skolvägar och återrapportera förslag till åtgärder.')
    page.locator('[data-field="signer"]').fill('Exempelperson')
    page.locator('#save-motion').click()
    page.get_by_text('Motionen sparades.').wait_for()
    assert page.evaluate('window.testDocs[window.testId].title')=='Tryggare skolvägar i Fjugesta'
    page.screenshot(path=str(root/'preview-workroom.png'),full_page=True)
    with page.expect_download() as dl:page.locator('#export-motion').click()
    filename=root/'tests'/'_sample_motion.pdf';dl.value.save_as(str(filename))
    document=fitz.open(filename);pdftext=' '.join(pg.get_text() for pg in document)
    assert 'Tryggare skolvägar i Fjugesta' in pdftext,pdftext
    assert 'skolvägar' in pdftext,pdftext
    assert 'kommunstyrelsen' in pdftext,pdftext
    assert 'Exempelperson' in pdftext,pdftext
    assert len(document)>=1
    assert page.evaluate('window.testFiles.length')==1, 'First PDF must also be archived'
    assert page.evaluate('window.testFiles[0].name.endsWith(".pdf")')
    document[0].get_pixmap(matrix=fitz.Matrix(1.2,1.2)).save(str(root/'preview-pdf-motion.png'))
    document.close()
    page.locator('#pdf-template').select_option('neutral')
    with page.expect_download() as neutral_dl:page.locator('#export-motion').click()
    neutral_path=root/'tests'/'_sample_motion_neutral.pdf';neutral_dl.value.save_as(str(neutral_path))
    neutral_doc=fitz.open(neutral_path)
    assert 'Tryggare skolvägar i Fjugesta' in neutral_doc[0].get_text()
    assert len(neutral_doc)>=1
    neutral_doc.close()
    assert page.evaluate('window.testFiles.length')==2, 'Both PDF templates must archive privately'
    page.locator('[data-tab="files"]').first.click()
    page.get_by_role('heading',name='Dokumentarkiv').wait_for(timeout=8000)
    assert page.locator('.file-row').count()==2
    assert not errors, errors
    mobile=browser.new_page(viewport={'width':390,'height':820},is_mobile=True)
    mobile.set_content(html)
    mobile.locator('#mobile-menu').click()
    assert mobile.get_by_role('button',name='Mina motioner',exact=True).is_visible()
    mobile.screenshot(path=str(root/'preview-workroom-mobile.png'),full_page=True)
    browser.close()
html_path.unlink(missing_ok=True)
print('PASS private workroom: mocked authenticated API, create/edit/save, searchable Swedish A4 PDF, responsive menu')
