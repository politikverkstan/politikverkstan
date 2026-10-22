from playwright.sync_api import sync_playwright
from pathlib import Path
proj=Path(__file__).resolve().parents[1]
with sync_playwright() as p:
    b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
    c=b.new_context(viewport={'width':1440,'height':900})
    pg=c.new_page();errors=[];pg.on('pageerror',lambda err:errors.append(str(err)))
    pg.set_content(proj.joinpath('dist/index.html').read_text(encoding='utf-8'),wait_until='domcontentloaded')
    pg.locator('.sidebar [data-page="candidates"]').click()
    assert pg.get_by_text('Kandidatval & valsedlar').count()==1
    pg.locator('#cand-example').click()
    assert pg.locator('.ballot-card').count()==3
    pg.locator('#cand-run').click()
    assert pg.locator('.candidate-results').count()==1
    assert pg.locator('.candidate-outcome').count()==3
    assert '33,3' in pg.locator('.candidate-results').text_content()
    assert '13' in pg.locator('.candidate-results').text_content()
    pg.locator('.candidate-outcome').first.locator('summary').click()
    assert 'Fiktiv' in pg.locator('.candidate-trace').first.text_content()
    pg.screenshot(path=str(proj/'preview-candidates.png'),full_page=False)
    pg.locator('[data-cand-input=names]').first.fill('X\nAndra A\nTredje A')
    pg.locator('[data-cand-input=count]').first.fill('12')
    pg.locator('[data-cand-input=names]').nth(1).fill('X\nAndra B\nTredje B')
    pg.locator('[data-cand-input=count]').nth(1).fill('9')
    pg.locator('[data-cand-input=names]').nth(2).fill('Första C\nAndra C\nTredje C')
    pg.locator('[data-cand-input=count]').nth(2).fill('7')
    pg.locator('#cand-seats').fill('3');pg.locator('#cand-seats').blur()
    pg.locator('#cand-present').fill('35');pg.locator('#cand-present').blur()
    pg.locator('#cand-run').click()
    assert pg.locator('.candidate-results').count()==1, pg.locator('body').text_content()[:1500]
    pg.locator('.candidate-outcome').first.locator('summary').click()
    trace=pg.locator('.candidate-trace').first.text_content()
    assert 'Andra A' in trace,trace
    pg.locator('#cand-role').select_option('subs')
    pg.locator('#cand-run').click()
    assert '3 §' in pg.locator('.toast.error').text_content()
    pg.locator('#cand-member-prop').check()
    pg.locator('#cand-run').click()
    assert pg.locator('.candidate-results').count()==1
    pg.locator('.sidebar [data-page=registry]').click()
    it=pg.locator('.registry-row').filter(has_text='Sydnärkes IT-nämnd')
    assert '1 + 1' in it.text_content()
    assert not errors,errors
    b.close()
print('PASS candidate UI, ballot inputs, legal guard, register distinction')
