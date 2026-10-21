from pathlib import Path
import json
root=Path(__file__).parent
src=root/'src'
tpl=(src/'index.template.html').read_text(encoding='utf-8')
values={
'/*CSS*/':(src/'style.css').read_text(encoding='utf-8'),
'/*DATA*/':(src/'organizations.json').read_text(encoding='utf-8').replace('</','<\\/'),
'/*ENGINE*/':(src/'engine.js').read_text(encoding='utf-8').replace('</script','<\\/script'),
'/*CANDIDATES*/':(src/'candidate-engine.js').read_text(encoding='utf-8').replace('</script',r'<\/script'),
'/*APP*/':(src/'app.js').read_text(encoding='utf-8').replace('</script','<\\/script'),
}
for a,b in values.items(): tpl=tpl.replace(a,b)
assert '/*' not in tpl or True
out=root/'dist'
out.mkdir(exist_ok=True)
# Keep static assets in the published bundle on every build.
(out/'lekeberg-landskap.svg').write_bytes((root/'lekeberg-landskap.svg').read_bytes())
# Keep the favicon in the published static assets on every build.
(out/'favicon.ico').write_bytes((root/'favicon.ico').read_bytes())
(out/'index.html').write_text(tpl,encoding='utf-8')
(root/'index.html').write_text(tpl,encoding='utf-8')
assert not (out/'Mandatportal-Lekeberg.html').exists()
print('Built:', (out/'index.html').stat().st_size, 'bytes to dist/index.html')

# Bundle protected workroom into worker module. This is never served as a public asset.
work=(src/'workroom.template.html').read_text(encoding='utf-8')
work=work.replace('/*WORKCSS*/',(src/'workroom.css').read_text(encoding='utf-8').replace('</style','<\\/style'))
# Insert meeting-workshop functions inside the existing protected workroom closure.
work_js=(src/'workroom.js').read_text(encoding='utf-8')
addon='\n'.join((src/name).read_text(encoding='utf-8') for name in
                ('meetings-ui.js','meetings-page.js','meetings-actions.js'))
assert work_js.count('function casesPage(){')==1
work_js=work_js.replace('function casesPage(){',addon+'\nfunction casesPage(){',1)
work=work.replace('/*WORKJS*/',((src/'workroom-pdf.js').read_text(encoding='utf-8')+'\n'+work_js).replace('</script',r'<\/script'))
module='export const WORKROOM_HTML = '+json.dumps(work,ensure_ascii=False)+';\n'
(root/'worker'/'workroom-page.mjs').write_text(module,encoding='utf-8')
print('Built protected workroom module:',len(work),'chars')
