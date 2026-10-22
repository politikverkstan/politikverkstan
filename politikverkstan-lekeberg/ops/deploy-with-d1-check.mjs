// Safe Cloudflare Builds deployment gate for the existing production D1.
// Never initializes or alters d1_migrations: legacy baselining is a one-time,
// separately approved operation after auditing the live database schema.
import {execFileSync} from 'node:child_process';
import {readdirSync,readFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';

const project=dirname(dirname(fileURLToPath(import.meta.url)));
const database='mandatportal-analytics';
const requiredCount=11;

export function validateMigrationHistory(applied,files){
 if(!Array.isArray(applied)||!Array.isArray(files))throw Error('Ogiltiga migrationsuppgifter');
 if(files.length<requiredCount)throw Error('Migrationsfiler saknas i repositoryt');
 const baseline=files.slice(0,requiredCount);
 if(!baseline[0].startsWith('0001_')||!baseline.at(-1).startsWith('0011_'))throw Error('Migrationsordningen har ändrats');
 if(applied.length===0)throw Error('Ingen registrerad migrationshistorik. Granska och etablera baslinjen 0001–0011 innan driftsättning.');
 if(new Set(applied).size!==applied.length)throw Error('Dubblerade poster i migrationshistoriken');
 const missing=baseline.filter(name=>!applied.includes(name));
 if(missing.length)throw Error('Baslinjen är inte klar i D1: '+missing.join(', '));
 const unknown=applied.filter(name=>!files.includes(name));
 if(unknown.length)throw Error('D1 innehåller okända migrationsnamn: '+unknown.join(', '));
 return files.filter(name=>!applied.includes(name));
}

function wrangler(...args){
 return execFileSync('npx',['--no-install','wrangler',...args],{
  cwd:project,encoding:'utf8',stdio:['ignore','pipe','inherit'],maxBuffer:5*1024*1024
 }).trim();
}
function readHistory(){
 let raw;
 try{
  raw=wrangler('d1','execute',database,'--remote','--json','--command','SELECT name FROM d1_migrations ORDER BY id;');
 }catch{
  throw Error('Kan inte läsa d1_migrations i produktionsdatabasen. Ingen migrering eller publicering genomfördes.');
 }
 let parsed;
 try{parsed=JSON.parse(raw);}catch{throw Error('Wrangler gav inget tolkningsbart JSON-svar för migrationshistoriken. Avbryter.');}
 const result=Array.isArray(parsed)?parsed[0]:parsed;
 if(!result||result.success!==true||!Array.isArray(result.results))throw Error('Migrationshistoriken kunde inte verifieras.');
 return result.results.map(row=>row.name);
}
function main(){
 const config=readFileSync(join(project,'wrangler.jsonc'),'utf8');
 if(!/"database_name"\s*:\s*"mandatportal-analytics"/.test(config))throw Error('D1-databasnamnet har ändrats i wrangler.jsonc.');
 const filenames=readdirSync(join(project,'migrations')).filter(n=>/^\d{4}_[\w-]+\.sql$/.test(n)).sort();
 const applied=readHistory();
 const pending=validateMigrationHistory(applied,filenames);
 console.log('D1-baslinjen är verifierad ('+applied.length+' registrerade migreringar).');
 if(pending.length){
  console.log('Nya migreringar: '+pending.join(', '));
  // Wrangler creates a D1 snapshot before applying and tracks filenames.
  wrangler('d1','migrations','apply',database,'--remote');
  // Confirm the remote migration ledger now contains every local migration.
  const after=readHistory();
  const remaining=validateMigrationHistory(after,filenames);
  if(remaining.length)throw Error('Migreringarna blev inte fullständigt registrerade: '+remaining.join(', '));
 }else console.log('Inga nya D1-migreringar.');
 console.log('Databassteget klart. Publicerar Worker.');
 wrangler('deploy');
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===join(process.cwd(),process.argv[1])){
 try{main();}catch(err){console.error('Avbruten Cloudflare-publicering:',err.message);process.exitCode=1;}
}
