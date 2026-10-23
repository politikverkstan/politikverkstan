import assert from 'node:assert/strict';
import {normalizeMotion} from '../worker/private.mjs';
const all=['motion','interpellation','fraga','andring','reservation','sarskilt','namndinitiativ'];
for(const doc_type of all){
 const result=normalizeMotion({doc_type,title:'Utkast',recipient:'Nämndsordförande',forum:'Barn- och utbildningsnämnden'});
 assert.equal(result.doc_type,doc_type);
 assert.equal(result.recipient,'Nämndsordförande');
 assert.equal(result.forum,'Barn- och utbildningsnämnden');
}
assert.equal(normalizeMotion({title:'Äldre motion'}).doc_type,'motion');
assert.equal(normalizeMotion({doc_type:'invalid'}).doc_type,'motion');
const collab=await import('../worker/collaboration.mjs');
assert.equal(typeof collab.handleCollaboration,'function');
console.log('PASS 1.7: seven validated formal document types, recipient/committee and legacy default');
