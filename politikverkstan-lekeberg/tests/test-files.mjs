import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {handleFiles} from '../worker/files.mjs';

const db=new DatabaseSync(':memory:');db.exec('PRAGMA foreign_keys=ON');
for(const migration of ['0002_workroom.sql','0006_files.sql'])db.exec(readFileSync(new URL('../migrations/'+migration,import.meta.url),'utf8'));
db.prepare("INSERT INTO work_users(email,display_name,role,active,created_at) VALUES (?,?,?,1,?)").run('a@example.se','A','admin','2026-01-01');
db.prepare("INSERT INTO work_users(email,display_name,role,active,created_at) VALUES (?,?,?,1,?)").run('b@example.se','B','user','2026-01-01');
const DB={
 prepare(sql){let args=[];return {
  bind(...values){args=values;return this;},
  async first(){return db.prepare(sql).get(...args)||null;},
  async all(){return {results:db.prepare(sql).all(...args)};},
  async run(){const result=db.prepare(sql).run(...args);return {meta:{changes:Number(result.changes)}};}
 };},
 async batch(stmts){db.exec('BEGIN');try{const result=[];for(const s of stmts)result.push(await s.run());db.exec('COMMIT');return result;}catch(e){db.exec('ROLLBACK');throw e;}}
};
const a={email:'a@example.se',role:'admin'},b={email:'b@example.se',role:'user'};
async function call(user,path,method='GET',body){
 const url='https://workroom.example/api/private/'+path;
 let opts={method};
 if(body!==undefined){if(body instanceof FormData){opts.body=body;}else{opts.headers={'content-type':'application/json'};opts.body=JSON.stringify(body);}}
 return handleFiles(new Request(url,opts),{DB},user);
}
async function json(r){return r.json();}
const root=await json(await call(a,'folders','POST',{name:'Skola',scope:'mine'}));
assert.ok(root.id);
const child=await json(await call(a,'folders','POST',{name:'Budget',scope:'mine',parent_id:root.id}));
assert.ok(child.id);
assert.equal((await call(b,'folders','POST',{name:'Otillåten',scope:'mine',parent_id:root.id})).status,400);
assert.equal((await call(a,'folders','POST',{name:'../unsafe',scope:'mine'})).status,400);
const team=await json(await call(a,'folders','POST',{name:'Möten',scope:'team'}));
const filesFor=(name,scope,folder,contents)=>{
 const fd=new FormData();fd.append('file',new File([contents],name,{type:'application/pdf'}));fd.append('scope',scope);if(folder)fd.append('folder_id',folder);return fd;
};
const personal=await json(await call(a,'files','POST',filesFor('Protokoll.pdf','mine',child.id,'%PDF-1.4\nHejsan')));
assert.ok(personal.id);
assert.equal((await call(b,'files/'+personal.id+'/download')).status,404,'Another user cannot download private files');
assert.equal((await call(b,'files/'+personal.id,'DELETE')).status,404,'Another user cannot delete private files');
const personalList=await json(await call(a,'files?scope=mine'));
assert.equal(personalList.folders.length,2);
assert.equal(personalList.files.length,1);
assert.equal((await json(await call(b,'files?scope=mine'))).files.length,0);
assert.equal((await call(a,'folders/'+root.id,'DELETE')).status,409,'Nonempty parent cannot be removed');
assert.equal((await call(a,'folders/'+child.id,'DELETE')).status,409,'Folder with files cannot be removed');
assert.equal((await call(a,'files/'+personal.id,'PATCH',{folder_id:team.id})).status,400,'Private file cannot sit in team folder');
assert.equal((await call(a,'files/'+personal.id,'PATCH',{scope:'team',folder_id:team.id})).status,200);
const shared=await json(await call(b,'files?scope=team'));
assert.equal(shared.files[0].id,personal.id,'Explicitly shared file is visible to another active account');
const download=await call(b,'files/'+personal.id+'/download');
assert.equal(download.status,200);
assert.equal(download.headers.get('content-type'),'application/octet-stream');
assert.ok(download.headers.get('content-disposition').startsWith('attachment'));
assert.equal(await download.text(),'%PDF-1.4\nHejsan');
assert.equal((await call(b,'files/'+personal.id,'PATCH',{name:'x.pdf'})).status,404,'No team user can alter another owner file');
assert.equal((await call(b,'folders/'+team.id,'DELETE')).status,404,'Only owner may delete team folder');
assert.equal((await call(a,'files/'+personal.id,'PATCH',{scope:'mine',folder_id:null})).status,200);
assert.equal((await call(b,'files/'+personal.id+'/download')).status,404,'Revoking share immediately revokes access');
assert.equal((await call(a,'files/'+personal.id,'PATCH',{name:'<report>.pdf'})).status,200);
assert.equal((await call(a,'files/'+personal.id,'DELETE')).status,200);
assert.equal((await call(a,'folders/'+child.id,'DELETE')).status,200);
assert.equal((await call(a,'folders/'+root.id,'DELETE')).status,200);
assert.equal((await call(a,'folders/'+team.id,'DELETE')).status,200);
const empty=await json(await call(a,'files','POST',filesFor('tom.txt','mine',null,'')));
assert.ok(empty.id);
assert.equal((await (await call(a,'files/'+empty.id+'/download')).arrayBuffer()).byteLength,0);
const tooBig=new File([new Uint8Array(5*1024*1024+1)],'stor.pdf',{type:'application/pdf'});
assert.equal((await call(a,'files','POST',filesFor(tooBig.name,'mine',null,tooBig))).status,413);
console.log('PASS files: nested folders, upload/download, owner ACL, team sharing, revocation, moves, limits, deletes');
