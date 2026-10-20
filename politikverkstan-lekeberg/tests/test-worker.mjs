import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import worker,{normalizeGroups,authorize} from '../worker/index.mjs';
if(!globalThis.crypto)globalThis.crypto=webcrypto;
function request(path,{method='GET',body=null,headers={}}={}){return new Request('https://mandatportal.example'+path,{method,headers,body:body?JSON.stringify(body):undefined});}
function mockDb(){let queries=[];let counter=0;return {queries,prepare(sql){let params=[];return {bind(...p){params=p;return this;},async run(){queries.push({sql,params});counter++;return {success:true};},async first(){return {total:counter,distinct_count:counter?1:0};},async all(){if(sql.includes('FROM coalition_counts'))return {results:counter?[{signature:params[0]||'C|FL|KD|L|M|MP|S|SD|V',count:counter}]:[]};return {results:[]};}}}};}
const groupArray=[['M','S'],['C','KD','V','MP','L'],['SD','FL']];
assert.equal(normalizeGroups(groupArray),normalizeGroups([['FL','SD'],['S','M'],['L','MP','V','KD','C']]));
assert.throws(()=>normalizeGroups([['M','S'],['C','KD']]));
assert.throws(()=>normalizeGroups([...groupArray,['M']]));
const off={TELEMETRY_ENABLED:'false',SECURITY_LOG_ENABLED:'false'};
assert.equal((await worker.fetch(request('/api/telemetry',{method:'POST'}),off)).status,503);
assert.equal((await worker.fetch(request('/admin'),off)).status,403);
assert.equal((await worker.fetch(request('/api/admin/summary'),off)).status,403);
assert.equal((await worker.fetch(request('/unlisted'),off)).status,503);
assert.equal((await worker.fetch(request('/Mandatportal-Lekeberg'),off)).status,301);
let db=mockDb();let env={...off,TELEMETRY_ENABLED:'true',DB:db};
const post=(body,extra={})=>worker.fetch(request('/api/telemetry',{method:'POST',headers:{'content-type':'application/json',...extra},body}),env);
assert.equal((await post({event:'coalition_analyzed',consent:false,groups:groupArray})).status,400);
assert.equal((await post({event:'coalition_analyzed',consent:true,groups:[['M']]})).status,400);
assert.equal((await post({event:'coalition_analyzed',consent:true,groups:groupArray},{Origin:'https://attacker.example'})).status,403);
assert.equal(db.queries.length,0);
assert.equal((await post({event:'coalition_analyzed',consent:true,groups:groupArray})).status,200);
assert.equal(db.queries.length,1);
assert.deepEqual(db.queries[0].params.slice(1),[normalizeGroups(groupArray)]);
assert.equal(JSON.stringify(db.queries).includes('127.0.0.1'),false);
// Verify signed JWT, audience, email allow-list and fail-closed behavior.
const {privateKey,publicKey}=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
const pub=await crypto.subtle.exportKey('jwk',publicKey);pub.kid='test-kid';pub.alg='RS256';
const b64=o=>Buffer.from(JSON.stringify(o)).toString('base64url');
const makeJwt=async email=>{const head=b64({alg:'RS256',kid:'test-kid'});const body=b64({iss:'https://example.cloudflareaccess.com',aud:['correct-aud'],email,exp:Math.floor(Date.now()/1000)+300});const input=`${head}.${body}`;const signed=await crypto.subtle.sign('RSASSA-PKCS1-v1_5',privateKey,new TextEncoder().encode(input));return `${input}.${Buffer.from(signed).toString('base64url')}`;};
const originalFetch=globalThis.fetch;
globalThis.fetch=async url=>String(url).endsWith('/cdn-cgi/access/certs')?new Response(JSON.stringify({keys:[pub]}),{status:200}):new Response('not found',{status:404});
const authenv={...env,ACCESS_TEAM_DOMAIN:'example.cloudflareaccess.com',ACCESS_AUD:'correct-aud',ADMIN_EMAILS:'admin@example.se'};
let good=request('/api/admin/summary',{headers:{'Cf-Access-Jwt-Assertion':await makeJwt('admin@example.se')}});
let bad=request('/api/admin/summary',{headers:{'Cf-Access-Jwt-Assertion':await makeJwt('outsider@example.se')}});
assert.ok(await authorize(good,authenv));assert.equal(await authorize(bad,authenv),null);
assert.equal((await worker.fetch(good,authenv)).status,200);
assert.equal((await worker.fetch(bad,authenv)).status,403);
// The admin page and its summary must use the same Access-protected URL path.
const adminSummaryUrl='/admin?summary=1';
assert.equal((await worker.fetch(request(adminSummaryUrl),authenv)).status,403);
assert.equal((await worker.fetch(request(adminSummaryUrl,{headers:{'Cf-Access-Jwt-Assertion':await makeJwt('admin@example.se')}}),authenv)).status,200);
assert.equal((await worker.fetch(request(adminSummaryUrl,{headers:{'Cf-Access-Jwt-Assertion':await makeJwt('outsider@example.se')}}),authenv)).status,403);

assert.equal((await worker.fetch(request('/admin',{headers:{'Cf-Access-Jwt-Assertion':await makeJwt('admin@example.se')}}),authenv)).status,200);
// Mandatory protections: CSP nonces; no public access to admin page, no JWT secret in static HTML.
const adminPage=await worker.fetch(request('/admin',{headers:{'Cf-Access-Jwt-Assertion':await makeJwt('admin@example.se')}}),authenv);
assert.ok(adminPage.headers.get('content-security-policy').includes('nonce-'));
assert.ok((await adminPage.text()).includes('Politikverkstan · Administration'));
globalThis.fetch=originalFetch;
console.log('PASS Worker: normalized statistics, explicit opt-in, origin checks, protected admin JWT signature/audience/email and fail-closed behavior');
