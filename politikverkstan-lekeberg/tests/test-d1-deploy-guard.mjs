import assert from 'node:assert/strict';
import {validateMigrationHistory} from '../ops/deploy-with-d1-check.mjs';

const files=Array.from({length:11},(_,i)=>String(i+1).padStart(4,'0')+'_legacy.sql');
files[0]='0001_analytics.sql';files[10]='0011_traceability.sql';
assert.deepEqual(validateMigrationHistory(files,files),[]);
assert.deepEqual(validateMigrationHistory(files,[...files,'0012_future.sql']),['0012_future.sql']);
assert.throws(()=>validateMigrationHistory([],files),/Ingen registrerad migrationshistorik/);
assert.throws(()=>validateMigrationHistory(files.slice(0,10),files),/Baslinjen är inte klar/);
assert.throws(()=>validateMigrationHistory([...files,files[0]],files),/Dubblerade poster/);
assert.throws(()=>validateMigrationHistory([...files,'9999_unknown.sql'],files),/okända migrationsnamn/);
assert.throws(()=>validateMigrationHistory(files.slice().reverse(),files.slice(1)),/Migrationsfiler saknas/);
console.log('PASS D1 deployment guard: baseline required, duplicates and unknown migrations refused');
