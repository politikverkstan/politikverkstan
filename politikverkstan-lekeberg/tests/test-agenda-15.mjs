import assert from 'node:assert/strict';
import {parseOfficialAgenda} from '../worker/official-agenda.mjs';
import {normalizeCachedCalendar} from '../worker/official-meetings.mjs';
const date=new Date(Date.now()+30*86400000).toISOString().slice(0,10);
const url='https://meetings.lekeberg.se/committees/kommunstyrelsen/mote-'+date;
const html='<h3>1. Godkännande av dagordning</h3><h3>2. Ekonomisk uppföljning</h3><h3>2. Ekonomisk uppföljning</h3>'+
 '<h3>Rubrik utan nummer</h3><a href="/welcome-sv/namnder-styrelser/kommunstyrelsen/mote-'+date+'/agenda/ekonomi-pdf?downloadMode=download">Ekonomiskt underlag</a>'+
 '<a href="https://evil.example/welcome-sv/namnder-styrelser/kommunstyrelsen/mote-'+date+'/agenda/secret">Avvisas</a>';
const d=parseOfficialAgenda(html,url);
assert.deepEqual(d.agenda.map(x=>x.title),['Godkännande av dagordning','Ekonomisk uppföljning']);
assert.equal(d.documents.length,1);
assert.equal(d.agenda_status,'identified');
const realHtml='<div class="agenda-list"><ol class="box-list">'+
 '<li class="meeting-item-row " role="treeitem"><div class="meeting-item-header">'+
 '<span class="list-item-number">1</span><div class="list-item-name"><p class="item-title">Val av justerare</p></div></div></li>'+
 '<li class="meeting-item-row" role="treeitem"><span class="list-item-number">2</span>'+
 '<p class="item-title">Ekonomisk månadsrapport</p></li>'+
 '<li class="meeting-item-row"><p class="item-title">Inte numrerad</p></li></ol></div>';
const meetingPlus=parseOfficialAgenda(realHtml,url);
assert.deepEqual(meetingPlus.agenda.map(x=>[x.number,x.title]),
 [[1,'Val av justerare'],[2,'Ekonomisk månadsrapport']]);
assert.equal(meetingPlus.agenda_status,'identified');

assert.equal(parseOfficialAgenda('<p>Ingen dagordning</p>',url).agenda_status,'not_identified');
assert.throws(()=>parseOfficialAgenda(html,'https://evil.example/committees/kommunstyrelsen/mote-'+date));
const meet={source_url:url,committee_key:'ks',committee:'Kommunstyrelsen',meeting_date:date,start_time:'',end_time:'',location:'',...d,agenda_changed_at:'2026-10-23T10:00:00Z'};
const snapshot={version:2,sources:[{committee_key:'ks',meetings:[meet]}]};
let x=normalizeCachedCalendar(snapshot);
assert.equal(x.meetings[0].agenda.length,2);
assert.equal(x.meetings[0].documents.length,1);
assert(!JSON.stringify(x).includes('evil.example'));
x=normalizeCachedCalendar({version:2,sources:[{committee_key:'ks',meetings:[{...meet,documents:[{title:'Fake',url:'https://evil.example/file'}]}]}]});
assert.equal(x.meetings[0].documents.length,0);
console.log('PASS 1.5 official agenda and document source guard');
