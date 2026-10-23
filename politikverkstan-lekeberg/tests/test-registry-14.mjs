import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const data=JSON.parse(readFileSync(new URL('src/organizations.json',root),'utf8'));
assert.equal(data.length,57);
assert.equal(new Set(data.map(d=>d.id)).size,57);
const statuses=new Set(['verifierad','delvis verifierad','historisk','preliminär','förslag 2026','okänd']);
for(const d of data){
 assert(statuses.has(d.ruleStatus),d.id+' invalid status');
 if(['verifierad','delvis verifierad'].includes(d.ruleStatus)){
  assert(d.ruleUrl?.startsWith('https://'),d.id+' source missing');
  assert(/^2026-\d{2}-\d{2}$/.test(d.reviewedOn||''),d.id+' review missing');
  assert(Array.isArray(d.verifiedFacts)&&d.verifiedFacts.length,d.id+' scope missing');
 }
 if(d.ruleStatus==='verifierad')assert(d.verifiedFacts.includes('seats')&&d.verifiedFacts.includes('subs'));
 if(d.ruleStatus==='förslag 2026')assert(!d.verifiedFacts?.length,d.id+' proposal accidentally verified');
}
assert.equal(data.find(x=>x.id==='org01').ruleStatus,'delvis verifierad');
assert.equal(data.find(x=>x.id==='org01').lekebergSeats,35);
assert.equal(data.find(x=>x.id==='org01').lekebergSubs,null);
assert.equal(data.find(x=>x.id==='org09').ruleStatus,'förslag 2026');
assert.equal(data.find(x=>x.id==='org09').effectiveFrom,'2027-01-01');
const js=readFileSync(new URL('src/app.js',root),'utf8');
assert(js.includes("filter==='partial'"));
assert(js.includes('ej verifierat för nya mandatperioden'));
console.log('PASS scoped provenance and 57 distinct organizations');
