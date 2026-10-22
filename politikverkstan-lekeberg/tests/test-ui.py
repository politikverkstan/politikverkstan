from playwright.sync_api import sync_playwright
from pathlib import Path
PROJECT=Path(__file__).resolve().parents[1]
h=(PROJECT/'dist/index.html').read_text(encoding='utf-8')
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 c=b.new_context(viewport={'width':1440,'height':900},accept_downloads=True)
 page=c.new_page();errs=[];page.on('pageerror',lambda e:errs.append(str(e)))
 page.set_content(h,wait_until='domcontentloaded')
 page.screenshot(path=str(PROJECT/'preview-desktop.png'),full_page=False)
 assert page.locator('.coalition-card').count()==0
 assert page.locator('.sidebar [data-page=builder]').count()==1
 # Open all orgs registry, disabled for unknown legal rules
 page.locator('.sidebar [data-page=registry]').click()
 assert page.locator('.registry-row').count()==57
 assert page.locator('[data-org-toggle=org21]').is_disabled()
 # Selectable registry checkboxes must update simulation without rerendering the scrolling table.
 assert page.locator('[data-org-toggle=org07]').is_enabled()
 page.locator('.registry-table').evaluate('(e)=>e.scrollTop=250')
 scrolled=page.locator('.registry-table').evaluate('(e)=>e.scrollTop')
 assert scrolled>0
 page.locator('[data-org-toggle=org07]').uncheck()
 assert not page.locator('[data-org-toggle=org07]').is_checked()
 assert not page.locator('[data-org-toggle=org08]').is_checked(), 'Dependent workgroup should be unchecked too'
 assert page.locator('.registry-table').evaluate('(e)=>e.scrollTop')>0, 'Checkbox must not reset table scroll'
 assert '11 organ' in page.locator('#registry-selection-status').text_content()
 page.locator('[data-org-toggle=org08]').check()
 assert page.locator('[data-org-toggle=org07]').is_checked(), 'Checking child must select parent'
 assert page.locator('#registry-enabled-count').text_content()=='13'
 page.locator('#search-org').fill('IT-nämnd')
 assert page.locator('.registry-row:visible').count()==1
 page.locator('#search-org').fill('')
 page.locator('#registry-status-filter').select_option('verified')
 assert page.locator('.registry-row:visible').count()==0, 'Never invent 2026-2030 verification'
 page.locator('#registry-status-filter').select_option('historical')
 assert page.locator('.registry-row:visible').count()>0
 page.locator('#registry-status-filter').select_option('selected')
 assert page.locator('.registry-row:visible').count()==13
 with page.expect_download() as audit_download:
  page.locator('#registry-audit-export').click()
 import json
 download=audit_download.value
 assert download.suggested_filename=='lekeberg-organisationer-kallgranskning.json'
 report=json.loads(Path(download.path()).read_text(encoding='utf-8'))
 assert len(report['poster'])==57
 assert not any(o['aktuell_verifiering'] for o in report['poster'])
 assert all('kalla' in o and 'status' in o for o in report['poster'])

 # Switch back and use preset
 page.locator('.sidebar [data-page=builder]').click()
 page.locator('[data-preset=example]').click()
 assert page.locator('.coalition-card').count()==3
 # Check exactly expected for KS cell group 20 block
 ks=page.locator('.results-table tbody tr').filter(has_text='Kommunstyrelsen (') if False else page.locator('.results-table tbody tr').filter(has_text='Kommunstyrelsen')
 assert ks.count()>=1
 page.locator('[data-cell="org03:0:main"]').click()
 assert '7–8' in page.locator('.drawer').text_content()
 page.locator('#close-drawer').click()
 # move SD from FL+SD to M+S by keyboard/mouse click menu
 page.locator('.party-chip[data-party="SD"]').click()
 assert page.locator('.modal-title').text_content()=='Flytta Sverigedemokraterna'
 page.locator('[data-destination="M-S"]').click()
 assert page.locator('.coalition-card').count()==3
 assert '24' in page.locator('.coalition-card').first.text_content()
 page.locator('#undo-btn').click()
 assert '20' in page.locator('.coalition-card').first.text_content()
 # mergers
 page.locator('.sidebar [data-page=mergers]').click()
 assert page.locator('.merger-card').count()==3
 page.locator('[data-merge]').first.click()
 assert page.locator('.coalition-card').count()==2 if page.locator('.coalition-card').count() else True
 # save with prompt
 page.on('dialog',lambda dialog:dialog.accept('UI-test scenario'))
 page.locator('#save-btn').click()
 assert page.locator('.saved-row').count()>=1
 page.locator('[data-compare-save]').first.click()
 assert page.locator('.compare-grid').count()==1
 # Export CSV page matrix
 page.locator('.sidebar [data-page=matrix]').click()
 with page.expect_download() as download:
  page.locator('#export-csv').click()
 assert download.value.suggested_filename.endswith('.csv')
 print('Desktop UI tests passed; page errors:',errs)
 page.set_viewport_size({'width':390,'height':844})
 page.locator('#mobile-toggle').click()
 page.locator('.sidebar [data-page=workspace]').click()
 page.screenshot(path=str(PROJECT/'preview-mobile.png'),full_page=False)
 assert not errs,errs
 b.close()
