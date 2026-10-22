from pathlib import Path
from playwright.sync_api import sync_playwright

root=Path(__file__).resolve().parents[1]
html=(root/'dist/index.html').read_text(encoding='utf8')
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
    page=browser.new_page(viewport={'width':1330,'height':900})
    errors=[]
    page.on('pageerror',lambda e: errors.append(str(e)))
    page.set_content(html,wait_until='domcontentloaded')
    assert page.locator('.guide-panel').count()==0
    assert page.locator('.coalition-card').count()==0
    assert page.locator('.pv-workshop-entry').count()==1
    page.locator('#pv-guide-open').click()
    assert page.locator('.guide-panel').is_visible()
    assert page.locator('.guide-steps .current').count()==1
    page.locator('#guide-org').select_option('org07')
    page.locator('#guide-next').click()
    assert page.locator('input[name="guide-mode"]').count()==4
    page.locator('input[name="guide-mode"][value="possible"]').check()
    page.locator('#guide-next').click()
    assert page.locator('.guide-result tbody tr').count()==3
    assert 'Barn- och utbildningsnämnden' in page.locator('.guide-body').inner_text()
    assert '2025 års reglemente' in page.locator('.guide-caution').last.inner_text()
    page.locator('#guide-back').click()
    page.locator('#guide-back').click()
    assert page.locator('#guide-org').input_value()=='org07'
    page.locator('#guide-next').click()
    page.locator('#guide-next').click()
    page.locator('#guide-apply').click()
    assert page.locator('.guide-panel').count()==0
    assert page.locator('.results-table tbody tr').count()==1
    assert 'Barn- och utbildningsnämnden' in page.locator('.results-table').inner_text()
    page.locator('[data-page="registry"]').first.click()
    assert page.locator('.registry-source-summary').is_visible()
    assert page.locator('.registry-row').count()==57
    assert page.locator('.registry-validation').count()==57
    assert not errors, errors
    browser.close()
print('PASS: accessible guided mandate wizard, non-destructive preview, registry source status')
