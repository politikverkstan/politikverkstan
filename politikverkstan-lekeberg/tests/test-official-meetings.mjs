import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {OFFICIAL_SOURCES,parseOfficialMeetings,syncOfficialMeetings,handleOfficialMeetings} from '../worker/official-meetings.mjs';

const db=new DatabaseSync(':memory:');
db.exec(readFileSync(new URL('../migrations/0012_official_meetings.sql',import.meta.url),'utf8'));
const DB={prepare(sql){let args=[];return {bind(...v){args=v;return this;},async all(){return {results:db.prepare(sql).all(...args)};},async first(){return db.prepare(sql).get(...args)||null;},async run(){return {meta:{changes:Number(db.prepare(sql).run(...args).changes)}};}};}};
const day=new Date(Date.now()+45*86400000).toISOString().slice(0,10);
function meetingHtml(s,at='18:00',place='Träffen'){
 return `<html><body><table><tr><td><a href="/committees/${s.slug}/mote-${day}">${day} ${at} - 21:00</a></td><td>${place}</td></tr></table></body></html>`;
}
for(const s of OFFICIAL_SOURCES){
 const data=parseOfficialMeetings(meetingHtml(s),s,new Date().toISOString().slice(0,10));
 assert.equal(data.length,1);
 assert.equal(data[0].meeting_date,day);
 assert.equal(data[0].start_time,'18:00');
 assert.equal(data[0].end_time,'21:00');
 assert.equal(data[0].location,'Träffen');
 assert.equal(data[0].source_url,`https://meetings.lekeberg.se/committees/${s.slug}/mote-${day}`);
}
assert.deepEqual(parseOfficialMeetings('<html><a href="https://evil.test/committees/kommunfullmaktige/mote-2026-11-30">2026-11-30</a></html>',OFFICIAL_SOURCES[0],'2026-10-22'),[]);
assert.deepEqual(parseOfficialMeetings(meetingHtml(OFFICIAL_SOURCES[0]).replaceAll(day,'2020-11-30'),OFFICIAL_SOURCES[0],'2026-10-22'),[]);
assert.throws(()=>parseOfficialMeetings('',{key:'evil',slug:'evil'}));

const fetcher=async url=>{const s=OFFICIAL_SOURCES.find(x=>url.endsWith(x.slug));return new Response(meetingHtml(s),{headers:{'content-type':'text/html; charset=utf-8'}});};
let result=await syncOfficialMeetings({DB},{fetcher,now:'2026-10-22T11:00:00Z'});
assert.equal(result.status.filter(x=>x.ok).length,4);
assert.equal(db.prepare('SELECT COUNT(*) AS n FROM official_meetings').get().n,4);
assert.equal(db.prepare('SELECT COUNT(*) AS n FROM official_meeting_sources').get().n,4);
result=await syncOfficialMeetings({DB},{fetcher,now:'2026-10-23T11:00:00Z'});
assert.equal(db.prepare('SELECT COUNT(*) AS n FROM official_meetings').get().n,4,'Stable source IDs make sync idempotent');
const changed=async url=>new Response(meetingHtml(OFFICIAL_SOURCES.find(x=>url.endsWith(x.slug)),'17:30','Ny sal'),{headers:{'content-type':'text/html'}});
await syncOfficialMeetings({DB},{fetcher:changed,now:'2026-10-24T11:00:00Z'});
assert.equal(db.prepare('SELECT start_time FROM official_meetings WHERE committee_key=?').get('kf').start_time,'17:30');
assert.equal(db.prepare('SELECT location FROM official_meetings WHERE committee_key=?').get('kf').location,'Ny sal');
const failed=async url=>url.endsWith('socialnamnden')?new Response('No',{status:500,headers:{'content-type':'text/plain'}}):changed(url);
await syncOfficialMeetings({DB},{fetcher:failed,now:'2026-10-25T11:00:00Z'});
assert.equal(db.prepare('SELECT COUNT(*) AS n FROM official_meetings').get().n,4,'Unavailable source must not erase previous entries');
assert.equal(db.prepare("SELECT last_error FROM official_meeting_sources WHERE committee_key='sn'").get().last_error,'Källan kunde inte läsas');

const req=(path,method='GET')=>new Request('https://app.test/api/private/'+path,{method});
const user={email:'member@example.se',role:'user'},admin={email:'admin@example.se',role:'admin'};
let response=await handleOfficialMeetings(req('official-meetings'),{DB},user);
assert.equal(response.status,200);
let body=await response.json();
assert.equal(body.meetings.length,4);
assert.equal(body.can_sync,false);
assert.ok(body.meetings.every(x=>!Object.hasOwn(x,'owner_email')&&!Object.hasOwn(x,'personal_note')));
assert.equal((await handleOfficialMeetings(req('official-meetings/sync','POST'),{DB},user)).status,403);
assert.equal((await handleOfficialMeetings(req('official-meetings','POST'),{DB},user)).status,405);
db.prepare('UPDATE official_meeting_sources SET last_attempt_at=?').run(new Date().toISOString());
assert.equal((await handleOfficialMeetings(req('official-meetings/sync','POST'),{DB},admin)).status,429,'Rapid admin re-poll blocked');
console.log('PASS public MeetingPlus import: four fixed sources, safe parsing, dedup, updates, errors, role restrictions');
