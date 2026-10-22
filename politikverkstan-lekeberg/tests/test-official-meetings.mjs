import assert from 'node:assert/strict';
import {OFFICIAL_SOURCES,parseOfficialMeetings,normalizeCachedCalendar,handleOfficialMeetings} from '../worker/official-meetings.mjs';

const future=new Date(Date.now()+44*86400000).toISOString().slice(0,10);
function meetingHtml(s,at='18:00',place='Träffen'){
 return '<html><body><table><tr><td><a href="/committees/'+s.slug+'/mote-'+future+'">'+future+' '+at+' - 21:00</a></td><td>'+place+'</td></tr></table></body></html>';
}
// The live MeetingPlus listing uses a nested accessible div row,
// aria-label for time, and a location-text cell after the closing anchor.
const pageFixture='<div class="accessible-table-row meeting-list-item" role="row">'+
 '<div class="cell date list-item-date" role="cell"><span>'+
 '<a class="accessible-table-cell" href="/committees/kommunfullmaktige/mote-'+future+'" '+
 'aria-label="Möte '+future+' 18:00 - 21:00"><span class="no-wrap">'+future+
 '</span><span class="no-wrap">18:00 - 21:00</span></a></span></div>'+
 '<div class="accessible-table-cell cell location list-item-location" role="cell">'+
 '<span class="location-text">Tr&#228;ffen</span></div></div>';
const liveParsed=parseOfficialMeetings(pageFixture,OFFICIAL_SOURCES[0]);
assert.equal(liveParsed.length,1);
assert.equal(liveParsed[0].start_time,'18:00');
assert.equal(liveParsed[0].end_time,'21:00');
assert.equal(liveParsed[0].location,'Träffen');

const entries=[];
for(const s of OFFICIAL_SOURCES){
 const data=parseOfficialMeetings(meetingHtml(s),s);
 assert.equal(data.length,1);
 assert.equal(data[0].meeting_date,future);
 assert.equal(data[0].start_time,'18:00');
 assert.equal(data[0].end_time,'21:00');
 assert.equal(data[0].location,'Träffen');
 assert.equal(data[0].source_url,'https://meetings.lekeberg.se/committees/'+s.slug+'/mote-'+future);
 entries.push({committee_key:s.key,meetings:data,last_attempt_at:'2026-10-22T18:00:00Z',last_success_at:'2026-10-22T18:00:00Z',last_error:'',last_count:1});
}
assert.deepEqual(parseOfficialMeetings('<a href="https://example.net/committees/kommunfullmaktige/mote-'+future+'">'+future+'</a>',OFFICIAL_SOURCES[0]),[]);
assert.deepEqual(parseOfficialMeetings(meetingHtml(OFFICIAL_SOURCES[0]).replaceAll(future,'2010-02-01'),OFFICIAL_SOURCES[0]),[]);
assert.throws(()=>parseOfficialMeetings('',{key:'bogus',slug:'bogus'}));
const snapshot={version:1,generated_at:'2026-10-22T18:00:00Z',sources:entries};
let normalized=normalizeCachedCalendar(snapshot);
assert.equal(normalized.meetings.length,4);
assert.equal(normalized.sources.length,4);
assert.equal(normalized.sources.filter(x=>!!x.last_success_at).length,4);
assert.equal(normalized.can_sync,false);
assert.equal(normalized.source,'github');
const malicious={...entries[0].meetings[0],source_url:'https://evil.example/committees/kommunfullmaktige/mote-'+future};
const privateInfo={...entries[0].meetings[0],source_url:entries[0].meetings[0].source_url+'#fragment',owner_email:'private@example.se',personal_note:'SECRET'};
normalized=normalizeCachedCalendar({...snapshot,sources:[{...entries[0],meetings:[malicious,privateInfo,...entries[0].meetings]},...entries.slice(1)]});
assert.equal(normalized.meetings.length,4,'Foreign URL rejected; duplicates removed');
assert.ok(!JSON.stringify(normalized).includes('SECRET'),'No private metadata exposed');
assert.ok(normalized.meetings.every(x=>!Object.hasOwn(x,'owner_email')));
const down=normalizeCachedCalendar({...snapshot,sources:[{...entries[0],last_error:'HTTP 503'},...entries.slice(1)]});
assert.equal(down.sources[0].last_error,'HTTP 503');
assert.equal(down.meetings.length,4,'Previously fetched meetings survive source outages');
const req=(path,method='GET')=>new Request('https://work.test/api/private/'+path,{method});
const user={email:'member@test.example',role:'user'},admin={email:'admin@test.example',role:'admin'};
let res=await handleOfficialMeetings(req('official-meetings'),{},user);
assert.equal(res.status,200);
let data=await res.json();
assert.equal(data.source,'github');
assert.equal(data.sources.length,4);
assert.equal(data.can_sync,false);
assert.equal((await handleOfficialMeetings(req('official-meetings/sync','POST'),{},admin)).status,405);
assert.equal((await handleOfficialMeetings(req('official-meetings','POST'),{},user)).status,405);
console.log('PASS official calendar: parser, bundled source cache, allowlisted URLs, private-data isolation and no outbound network');
