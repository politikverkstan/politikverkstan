import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const base=new URL('../',import.meta.url);
const read=p=>readFileSync(new URL(p,base),'utf8');
const orgs=JSON.parse(read('src/organizations.json'));
const counts=orgs.reduce((out,o)=>(out[o.ruleStatus]=(out[o.ruleStatus]||0)+1,out),{});
assert.equal(orgs.length,57);
assert.deepEqual(counts,{okänd:40,historisk:10,preliminär:6,'förslag 2026':1});
const historic=orgs.filter(o=>o.ruleStatus==='historisk');
for(const o of historic){
 assert.equal(o.sourceYear,2025,'Historical source must identify applicable year');
 assert.equal(o.reviewedOn,'2026-10-21');
 assert.match(o.validationNote,/bekräftar inte ny mandatperiod/);
 assert.ok(o.ruleUrl?.startsWith('https://lekeberg.se/'),'Use public official source link');
}
assert.equal(orgs.filter(o=>o.reviewedOn).length,historic.length,'Do not claim new-term verification for unknown records');
const app=read('src/app.js');
const publicHtml=read('dist/index.html');
const docs=['Underlag:','registry-source-summary','validationNote','function guidePage(){','id="pv-guide-open"','guide-apply','Från 2025 års reglemente'];
for(const token of docs)assert.ok(app.includes(token)||publicHtml.includes(token),'Missing transparency/guide element '+token);
assert.ok(!publicHtml.includes('/api/private/motions'),'Private document API must not be present in public bundle');
console.log('PASS stage 1: 57 records, 10 historically reviewed, 47 not newly confirmed, guided calculator in public bundle');
