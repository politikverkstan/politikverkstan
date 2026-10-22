import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {webcrypto} from 'node:crypto';
import {handleMeetings,normalizeMeeting,normalizeAgenda} from '../worker/meetings.mjs';
if(!globalThis.crypto)globalThis.crypto=webcrypto;
const db=new DatabaseSync(':memory:');db.exec('PRAGMA foreign_keys=ON');
for(const name of ['0002_workroom.sql','0003_collaboration.sql','0004_lifecycle.sql','0006_files.sql','0007_cases.sql','0008_shared_cases.sql','0009_meetings.sql','0013_official_meeting_source.sql']){
 db.exec(readFileSync(new URL('../migrations/'+name,import.meta.url),'utf8'));
}
for(const [email,role] of [['owner@lekeberg.test','user'],['member@lekeberg.test','user'],['admin@lekeberg.test','admin']]){
 db.prepare("INSERT INTO work_users(email,display_name,role,active,created_at) VALUES(?,?,?,1,'2026-10-01')").run(email,email,role);
}
const privateId='11111111-1111-4111-8111-111111111111',teamId='22222222-2222-4222-8222-222222222222';
for(const [id,scope] of [[privateId,'mine'],[teamId,'team']]){
 db.prepare("INSERT INTO work_cases(id,owner_email,title,committee,status,meeting_date,labels_json,content_json,scope,revision,created_at,updated_at) VALUES(?,?,?,'Kommunfullmäktige','nytt','','[]','{}',?,1,'2026-10-01','2026-10-01')").run(id,'owner@lekeberg.test',scope==='team'?'Gemensamt ärende':'Privat ärende',scope);
}
const DB={prepare(sql){let params=[];return {bind(...v){params=v;return this},async first(){return db.prepare(sql).get(...params)||null},async all(){return {results:db.prepare(sql).all(...params)}},async run(){return {meta:{changes:Number(db.prepare(sql).run(...params).changes)}}}}}};
const accounts={owner:{email:'owner@lekeberg.test',role:'user'},member:{email:'member@lekeberg.test',role:'user'},admin:{email:'admin@lekeberg.test',role:'admin'}};
const request=(who,path,method='GET',value)=>handleMeetings(new Request('https://portal.test/api/private/'+path,{
 method,headers:value===undefined?{}:{'content-type':'application/json'},body:value===undefined?undefined:JSON.stringify(value)
}),{DB},accounts[who]);
const data=r=>r.json();
const meeting={title:'Sammanträde i barn- och utbildningsnämnden',committee:'Barn- och utbildningsnämnden',meeting_date:'2026-11-02',start_time:'09:00',location:'Fjugesta',status:'planned'};
assert.equal(normalizeMeeting(meeting).title,meeting.title);
assert.equal(normalizeAgenda({title:'Punkt 1',preparation:'',outcome:'',follow_up:''}).title,'Punkt 1');
assert.throws(()=>normalizeMeeting({...meeting,meeting_date:'2026-02-30'}));
assert.throws(()=>normalizeAgenda({title:'',preparation:'',outcome:'',follow_up:''}));
let r=await request('owner','meetings','POST',{...meeting,scope:'team'});assert.equal(r.status,201);
const meetingId=(await data(r)).id;
let ownerView=(await data(await request('owner','meetings/'+meetingId))).meeting;
assert.equal(ownerView.scope,'mine','Creation must always be private regardless of request scope');
assert.equal((await data(await request('member','meetings'))).meetings.length,0);
assert.equal((await request('admin','meetings/'+meetingId)).status,404,'Admin cannot read private meetings');
assert.equal((await request('member','meetings/'+meetingId+'/notes','PUT',{personal_note:'no'})).status,404);
const agendaBase={title:'Ekonomi',preparation:'Behov av kostnadsunderlag',outcome:'',follow_up:''};
r=await request('owner','meetings/'+meetingId+'/items','POST',{...agendaBase,case_id:privateId});
assert.equal(r.status,201);const privateItem=(await data(r)).id;
assert.equal((await request('owner','meetings/'+meetingId+'/sharing','PUT',{scope:'team',revision:1})).status,409,'Cannot accidentally share private linked case');
assert.equal((await request('owner','meetings/'+meetingId+'/items/'+privateItem,'PUT',{...agendaBase,case_id:teamId})).status,200);
r=await request('owner','meetings/'+meetingId+'/sharing','PUT',{scope:'team',revision:1});
assert.equal(r.status,200);
assert.equal((await request('owner','meetings/'+meetingId+'/sharing','PUT',{scope:'team',revision:1})).status,409);
assert.equal((await request('member','meetings/'+meetingId)).status,200);
assert.equal((await request('admin','meetings/'+meetingId)).status,200,'Shared meetings visible to approved admin');
assert.equal((await request('member','meetings/'+meetingId,'PUT',{...meeting,revision:2})).status,403);
assert.equal((await request('member','meetings/'+meetingId+'/items','POST',{...agendaBase,title:'Otillåtet'})).status,403);
assert.equal((await request('member','meetings/'+meetingId+'/items/'+privateItem)).status,403,'Raw agenda row is owner only');
assert.equal((await request('owner','meetings/'+meetingId+'/items','POST',{...agendaBase,title:'Ogiltig länk',case_id:privateId})).status,403);
r=await request('owner','meetings/'+meetingId+'/items','POST',{...agendaBase,title:'Uppföljning',case_id:teamId});
assert.equal(r.status,201);const secondItem=(await data(r)).id;
let view=await data(await request('member','meetings/'+meetingId));
assert.equal(view.agenda.length,2);
assert.equal(view.agenda[0].case_title,'Gemensamt ärende');
assert.equal((await request('owner','meetings/'+meetingId+'/items/'+secondItem+'/move','POST',{direction:-1})).status,200);
view=await data(await request('member','meetings/'+meetingId));
assert.equal(view.agenda[0].title,'Uppföljning','Ordering can be moved');
assert.equal((await request('member','meetings/'+meetingId+'/notes','PUT',{personal_note:'Medlemmens privata minnesanteckningar'})).status,200);
assert.equal((await request('owner','meetings/'+meetingId+'/notes','PUT',{personal_note:'Ägarens egna anteckningar'})).status,200);
assert.equal((await data(await request('owner','meetings/'+meetingId))).personal_note,'Ägarens egna anteckningar');
assert.equal((await data(await request('member','meetings/'+meetingId))).personal_note,'Medlemmens privata minnesanteckningar');
assert.equal((await data(await request('admin','meetings/'+meetingId))).personal_note,'');
assert.equal((await request('owner','meetings/'+meetingId+'/items/'+secondItem,'PUT',{...agendaBase,title:'Beslut',outcome:'Uppföljning efter mötet',case_id:teamId})).status,200);
view=await data(await request('member','meetings/'+meetingId));
assert.equal(view.agenda[0].outcome,'Uppföljning efter mötet');
assert.equal((await request('member','meetings/'+meetingId,'DELETE')).status,403);
assert.equal((await request('owner','meetings/'+meetingId+'/sharing','PUT',{scope:'mine',revision:2})).status,200);
assert.equal((await request('member','meetings/'+meetingId)).status,404,'Revoking meeting share removes access');
assert.equal((await request('admin','meetings/'+meetingId+'/items')).status,404);
assert.equal((await request('owner','meetings/'+meetingId,'DELETE')).status,200);
assert.equal(db.prepare('SELECT COUNT(*) AS n FROM work_meeting_notes').get().n,0,'Meeting deletion removes notes');
assert.equal(db.prepare('SELECT COUNT(*) AS n FROM work_meeting_items').get().n,0,'Meeting deletion removes agenda');
assert.equal(db.prepare('SELECT COUNT(*) AS n FROM work_cases').get().n,2,'Deleting meeting does not delete linked cases');
const sourceUrl='https://meetings.lekeberg.se/committees/barn-och-utbildningsnamnden/mote-2026-11-02';
assert.equal(normalizeMeeting({...meeting,official_source_url:sourceUrl}).official_source_url,sourceUrl);
for(const bad of [
 'https://evil.example/committees/barn-och-utbildningsnamnden/mote-2026-11-02',
 'https://meetings.lekeberg.se/committees/kommunstyrelsen/mote-2026-11-02',
 'https://meetings.lekeberg.se/committees/barn-och-utbildningsnamnden/mote-2026-11-03',
 sourceUrl+'?admin=true'
]) assert.throws(()=>normalizeMeeting({...meeting,official_source_url:bad}),/Ogiltig officiell/);
assert.equal((await request('owner','meetings','POST',{...meeting,official_source_url:sourceUrl})).status,201);
const officialList=(await data(await request('owner','meetings'))).meetings;
const prepared=officialList.find(x=>x.official_source_url===sourceUrl);
assert.ok(prepared,'Official reference persisted');
assert.equal(prepared.scope,'mine','Official template must be private by default');
assert.equal((await data(await request('member','meetings'))).meetings.length,0);
assert.equal((await request('admin','meetings/'+prepared.id)).status,404,'Admin cannot see private official prep');
assert.equal((await request('owner','meetings/'+prepared.id,'PUT',{
 ...meeting,official_source_url:sourceUrl,revision:prepared.revision,location:'Uppdaterad lokal'
})).status,200);
assert.equal((await data(await request('owner','meetings/'+prepared.id))).meeting.official_source_url,sourceUrl);
assert.equal(db.prepare("SELECT COUNT(*) AS n FROM work_meeting_notes WHERE meeting_id=?").get(prepared.id).n,0,'Official sync must not invent notes');
assert.equal((await request('owner','meetings/'+prepared.id,'DELETE')).status,200);
console.log('PASS 0.9.0: private by default, shared meetings, inaccessible linked cases, agenda ordering, notes isolation, revocation');
console.log('PASS 1.3 official source binding: explicit private draft, allowlist validation, owner ACL and no copied notes');
