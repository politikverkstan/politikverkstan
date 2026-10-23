// Explicit opt-in, read-only live D1 diagnostic. No schema changes or backups.
import {execFileSync} from 'node:child_process';
const db='mandatportal-analytics';
function read(sql){
 const output=execFileSync('npx',['--no-install','wrangler','d1','execute',db,'--remote','--json','--command',sql],{encoding:'utf8',maxBuffer:3000000});
 const raw=JSON.parse(output),r=Array.isArray(raw)?raw[0]:raw;
 if(!r?.success||!Array.isArray(r.results))throw Error('Remote D1 read failed');
 return r.results;
}
try{
 const names=read('SELECT name FROM d1_migrations ORDER BY id;').map(r=>r.name);
 for(let i=1;i<=13;i++){const part=String(i).padStart(4,'0')+'_';if(names.filter(x=>x.startsWith(part)).length!==1)throw Error('Missing or duplicate migration '+part);}
 if(read('PRAGMA quick_check;')[0]?.quick_check!=='ok')throw Error('Integrity check failed');
 if(read('PRAGMA foreign_key_check;').length)throw Error('Foreign key violations');
 const tables=read("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('work_cases','work_meetings','work_case_events','work_followups','work_case_positions','work_users');");
 if(tables.length!==6)throw Error('Core tables missing');
 if(!read("PRAGMA table_info('work_meetings');").some(c=>c.name==='official_source_url'))throw Error('Migration 0013 column missing');
 console.log('PASS: 13 migrations, tables, foreign keys and integrity (read-only).');
 console.log('NOT VERIFIED: backups, real users, Access policy, published deployment.');
}catch(err){console.error('PRODUCTION CHECK FAILED:',err.message);process.exitCode=1;}
