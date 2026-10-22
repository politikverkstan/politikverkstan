import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {webcrypto} from 'node:crypto';
import {handleCases} from '../worker/cases.mjs';
import {handleWorkflow} from '../worker/workflow.mjs';
if(!globalThis.crypto)globalThis.crypto=webcrypto;
const db=new DatabaseSync(':memory:');db.exec('PRAGMA foreign_keys=ON');
for(const n of ['0002_workroom.sql','0003_collaboration.sql','0004_lifecycle.sql','0006_files.sql','0007_cases.sql','0008_shared_cases.sql','0009_meetings.sql','0010_dashboard_tasks.sql','0011_traceability.sql']){
 db.exec(readFileSync(new URL('../migrations/'+n,import.meta.url),'utf8'));
}
for(const email of ['owner@test.se','member@test.se','admin@test.se'])
 db.prepare("INSERT INTO work_users(email,display_name,role,active,created_at) VALUES(?,?,'user',1,'2026-10-22')").run(email,email);
const users={owner:{email:'owner@test.se'},member:{email:'member@test.se'},admin:{email:'admin@test.se'}};
const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222';
const privateFile='77777777-7777-4777-8777-777777777777';
db.prepare("INSERT INTO work_files(id,owner_email,scope,name,size_bytes,created_at,updated_at) VALUES(?,'owner@test.se','mine','hemlig-fil.pdf',4,'2026-10-22','2026-10-22')").run(privateFile);
for(const [id,scope] of [[a,'mine'],[b,'team']]){
 db.prepare("INSERT INTO work_cases(id,owner_email,title,scope,content_json,created_at,updated_at) VALUES(?,'owner@test.se',?,?,?,'2026-10-22','2026-10-22')")
 .run(id,scope==='mine'?'Privat granskning':'Delad granskning',scope,JSON.stringify({summary:'Budgetanalys',file_id:privateFile}));
}
const wrap={prepare(sql){let args=[];return {bind(...a){args=a;return this},async first(){return db.prepare(sql).get(...args)||null},async all(){return {results:db.prepare(sql).all(...args)}},async run(){return {meta:{changes:Number(db.prepare(sql).run(...args).changes)}}}}}};
const call=(who,path,method='GET',body)=>handleWorkflow(new Request('https://app.test/api/private/workflow/'+path,{method,headers:body===undefined?{}:{'content-type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)}),{DB:wrap},users[who]);
const caseCall=(who,path,method='GET',body)=>handleCases(new Request('https://app.test/api/private/'+path,{method,headers:body===undefined?{}:{'content-type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)}),{DB:wrap},users[who]);
const data=r=>r.json();
assert.equal((await call('member','cases/'+a+'/history')).status,404);
assert.equal((await data(await call('member','cases/'+b+'/history'))).events.length,0,'creation before sharing never exposed');
let result=await call('owner','cases/'+a+'/history');
assert.equal(result.status,200);
assert.equal((await data(result)).events.length,1);
const snapshot=db.prepare('SELECT changes_json FROM work_case_events WHERE case_id=?').get(a).changes_json;
assert.ok(!snapshot.includes(privateFile),'private file reference must never reach historical snapshots');
const req={title:'Delad granskning uppdaterad',committee:'Annat',status:'granskning',meeting_date:'',labels:[],revision:1,
 summary:'Uppdaterat underlag'};
assert.equal((await caseCall('owner','cases/'+b,'PUT',req)).status,200);
let hist=(await data(await call('member','cases/'+b+'/history'))).events;
assert.equal(hist.length,1,'team sees only changes while shared');
assert.equal(hist[0].actor_email,users.owner.email);
assert.equal(hist[0].changes.after.title,'Delad granskning uppdaterad');
assert.ok(!JSON.stringify(hist).includes(privateFile));
assert.equal((await call('member','cases/'+b+'/position','PUT',{body:'Bör stödjas',status:'endorsed',source:'möte',anchored_on:'2026-10-22'})).status,403);
assert.equal((await call('owner','cases/'+b+'/position','PUT',{body:'Föreslagen inriktning',status:'endorsed',source:'',anchored_on:''})).status,400);
assert.equal((await call('owner','cases/'+b+'/position','PUT',{body:'Föreslagen inriktning',status:'proposed',source:'',anchored_on:''})).status,200);
assert.equal((await data(await call('member','cases/'+b+'/position'))).position.status,'proposed');
assert.equal((await call('owner','cases/'+b+'/position','PUT',{body:'Förankrad inriktning',status:'endorsed',source:'Protokoll § 4',anchored_on:'2026-10-22',revision:1})).status,200);
assert.equal((await data(await call('member','cases/'+b+'/position'))).position.status,'endorsed');
let create={title:'Kontrollera kostnader',details:'Särredovisa driftskostnad',status:'open',due_date:'2026-11-10',assignee_email:users.member.email,meeting_id:null};
assert.equal((await call('member','cases/'+b+'/followups','POST',create)).status,403);
result=await call('owner','cases/'+b+'/followups','POST',create);
assert.equal(result.status,201);
const followId=(await data(result)).id;
assert.equal((await data(await call('member','cases/'+b+'/followups'))).followups.length,1);
assert.equal((await call('member','followups/'+followId,'PUT',{...create,status:'done',revision:1})).status,403);
assert.equal((await call('owner','followups/'+followId,'PUT',{...create,status:'done',revision:2})).status,409);
assert.equal((await call('owner','followups/'+followId,'PUT',{...create,status:'done',revision:1})).status,200);
assert.equal((await data(await call('member','cases/'+b+'/followups'))).followups[0].status,'done');
const searchMember=(await data(await call('member','search?q=granskning'))).results;
assert.ok(searchMember.some(r=>r.id===b));
assert.ok(!searchMember.some(r=>r.id===a));
assert.ok(!searchMember.some(r=>r.title==='hemlig-fil.pdf'));
assert.equal((await call('member','cases/'+a+'/meetings')).status,404);
const count=db.prepare('SELECT count(*) as n FROM work_case_events WHERE case_id=?').get(b).n;
assert.ok(count>=5,'edits, followups and positions are audited');
console.log('PASS v1.0 workflow: history, privacy, position approval, follow-ups, CAS and search permissions');
