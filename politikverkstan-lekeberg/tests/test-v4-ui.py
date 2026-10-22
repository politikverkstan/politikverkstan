from pathlib import Path
from playwright.sync_api import sync_playwright
url=Path(__file__).resolve().parents[1].joinpath('dist','index.html').as_uri()
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1440,'height':950})
    errors=[]
    page.on('pageerror',lambda exc: errors.append(str(exc)))
    page.set_content(Path(__file__).resolve().parents[1].joinpath('dist','index.html').read_text(encoding='utf8'),wait_until='domcontentloaded')
    assert 'Politikverkstan' in page.title()
    page.get_by_role('button',name='Inflytande',exact=True).click()
    assert page.get_by_text('Inflytande & handlingsutrymme').is_visible()
    assert page.get_by_text('Majoritet och möjlighet att begära proportionellt val').is_visible()
    assert page.locator('.influence-table tbody tr').count()>=4
    page.screenshot(path=str(Path(__file__).resolve().parents[1]/'preview-influence.png'),full_page=True)
    page.get_by_role('button',name='Förhandling',exact=True).click()
    assert page.get_by_text('Fördela platser inom karteller').is_visible()
    assert page.locator('[data-neg-party]').count() == 9
    first = page.locator('[data-neg-party]').first
    first.fill('1');first.blur()
    assert page.locator('[data-neg-party]').first.input_value()=='1'
    page.get_by_role('button',name='Integritet').click()
    assert page.get_by_role('button',name='Dela nuvarande kartellindelning som statistik').is_disabled()
    page.locator('#telemetry-consent').check()
    assert page.get_by_role('button',name='Dela nuvarande kartellindelning som statistik').is_enabled()
    page.locator('.sidebar [data-page="builder"]').click()
    assert page.get_by_text('Valtekniska karteller').is_visible()
    page.locator('.sidebar [data-page="candidates"]').click()
    assert page.get_by_text('Kandidatval & valsedlar').is_visible()
    assert not errors, errors
    mobile=browser.new_page(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
    mobile.set_content(Path(__file__).resolve().parents[1].joinpath('dist','index.html').read_text(encoding='utf8'),wait_until='domcontentloaded')
    mobile.locator('#mobile-toggle').click()
    mobile.locator('.sidebar [data-page="influence"]').click()
    assert mobile.get_by_text('Inflytande & handlingsutrymme').is_visible()
    mobile.screenshot(path=str(Path(__file__).resolve().parents[1]/'preview-mobile-v4.png'),full_page=True)
    browser.close()
print('PASS v4 browser: influence table, opt-in-only telemetry UI, previous functionality, mobile navigation')
