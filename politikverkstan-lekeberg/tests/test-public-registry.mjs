import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const base=new URL('../',import.meta.url);
const read=(path)=>readFileSync(new URL(path,base),'utf8');
const organisations=JSON.parse(read('src/organizations.json'));
const publicHtml=read('dist/index.html');
const source='Preliminär uppdragsförteckning 2026–2030 (arbetsunderlag; ej verifierat mot beslut)';
assert.equal(organisations.length,57,'The existing register must retain its 57 public entries');
assert.equal(organisations.filter(x=>x.ruleSource===source).length,42,'Unverified entries must keep a visible source caveat');
assert.equal(organisations.filter(x=>x.ruleStatus==='delvis verifierad').length,1,'Partially verified data must remain explicitly scoped');
for(const entry of organisations){
 assert.ok(entry.id&&entry.name,'Every entry requires an organization/office name and ID');
 assert.ok(entry.ruleStatus,'Source validation status must remain visible');
 for(const forbidden of ['personnummer','partyAffiliation','memberEmail','personalAddress','personName','privateNotes']){
  assert.equal(Object.hasOwn(entry,forbidden),false,'No individual-sensitive fields may be copied into public JSON');
 }
}
assert.ok(publicHtml.includes('Uppgivet platstal'),'Public table must describe provisional numbers correctly');
assert.ok(publicHtml.includes(source),'Public file must preserve a provisional-source label');
assert.ok(!publicHtml.includes('Excel-underlaget')&&!publicHtml.includes('Excel; ej juridiskt verifierad'),'Do not mention internal spreadsheet format in public UI');
assert.ok(!publicHtml.includes('/api/private/motions'),'No protected document API in public bundle');
console.log('PASS public organizations: provisional source, no individual-sensitive fields, public/private split');
