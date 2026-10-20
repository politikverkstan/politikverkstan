/* Kandidatbaserad, spårbar VALSIMULERING enligt SFS 2022:629 §§ 9–10, 14–22.
   Ej ett myndighetsbeslut. Oklara/okända valbarhetsförhållanden blockerar beräkning.
   18 §: om person valts från k grupper räknas varje sådan tilldelning som 1/k plats,
   även retroaktivt för jämförelsetalet för respektive grupp.
   Likformig sannolikhet vid lottning är uttryckligt MODELLANTAGANDE, inte en regel om sannolikheter i lagen.
 */
(function(root,factory){const api=factory(root.MandatEngine||(typeof require==='function'?require('./engine.js'):null));if(typeof module!=='undefined'&&module.exports)module.exports=api;root.MandatCandidates=api;})(typeof globalThis!=='undefined'?globalThis:this,function(E){
'use strict';
const VERSION='0.2.0';
function safeInt(v,label,allowZero=true){if(!Number.isSafeInteger(v)||v<(allowZero?0:1))throw Error(label+' måste vara ett giltigt heltal');return v;}
function nonblank(s,label){if(typeof s!=='string'||!s.trim())throw Error(label+' saknas');return s.trim();}
function prepare(ballots,opts={}){
 if(!Array.isArray(ballots)||!ballots.length)throw Error('Lägg in minst en valsedel');
 const seats=safeInt(opts.seats,'Antal platser',false);if(seats>50)throw Error('Högst 50 platser per simulering');
 const people=new Map(),groups=new Map(),warnings=[];let cast=0,valid=0,ignored=0;
 for(const [index,b] of ballots.entries()){
  if(!b||typeof b!=='object')throw Error(`Valsedel ${index+1} är ogiltigt formaterad`);
  const count=safeInt(b.count,`Antal valsedlar, rad ${index+1}`);cast+=count;
  if(b.sealed===false||b.formatValid===false||typeof b.label!=='string'||!b.label.trim()){
   ignored+=count;warnings.push(`Valsedel ${index+1}: ${count} ogiltig(a) valsedel/valsedlar enligt registrerad bedömning (9 §).`);continue;
  }
  valid+=count; const label=b.label.trim();
  if(!Array.isArray(b.names))throw Error(`Valsedel ${index+1}: namnlistan måste vara en lista`);
  const names=[];const ids=new Set();
  for(const [pos,entry] of b.names.entries()){
   const o=typeof entry==='string'?{name:entry}:entry;
   if(!o||typeof o!=='object')throw Error(`Valsedel ${index+1}, namn ${pos+1}: felaktigt format`);
   if(o.struck||o.identifiable===false||o.orderClear===false||o.eligible===false)continue;
   const raw=nonblank(o.name,`Namn ${pos+1}`); const candidateId=String(o.id||raw).trim();
   if(o.eligible===null||o.eligible==='unknown')throw Error(`Valbarhet måste kontrolleras för ${raw}. Resultatet kan inte verifieras.`);
   if(ids.has(candidateId))throw Error(`Samma person (${raw}) finns två gånger på en valsedel.`);
   ids.add(candidateId);if(names.length>=seats)continue;
   const previous=people.get(candidateId);if(previous&&previous.name!==raw)throw Error(`Kandidat-ID ${candidateId} används för olika personer`);
   people.set(candidateId,{id:candidateId,name:raw});names.push(candidateId);
  }
  if(!names.length)warnings.push(`Valsedel ${index+1}: inga beaktade namn finns kvar (10 §).`);
  const key=JSON.stringify([label,names]);if(groups.has(key))groups.get(key).votes+=count;
  else groups.set(key,{id:`G${groups.size+1}`,label,names,votes:count,ballotRows:[index+1]});
 }
 if(!valid)throw Error('Inga giltiga röster finns');
 if(opts.present!==undefined){safeInt(opts.present,'Närvarande väljande',false);if(cast>opts.present)throw Error(`Antal avgivna valsedlar (${cast}) överstiger närvarande väljande (${opts.present})`);}
 const result=[...groups.values()];
 // Tvinga inte samman två valsedelsgrupper endast för att de har samma gruppbeteckning.
 if(result.some(g=>g.votes===0))warnings.push('Valsedelsgrupper utan röster påverkar inte resultatet.');
 return {seats,groups:result,people:Object.fromEntries(people),cast,valid,invalid:ignored,warnings,threshold:opts.present?E.threshold(opts.present,seats):null};
}
function countedShares(state,groups){
 const frequencies=new Map();for(let i=0;i<groups.length;i++)for(const name of groups[i].names.slice(0,state.counts[i]))frequencies.set(name,(frequencies.get(name)||0)+1);
 return groups.map((g,i)=>g.names.slice(0,state.counts[i]).reduce((a,name)=>E.plus(a,E.frac(1n,BigInt(frequencies.get(name)))),E.zero()));
}
function rank(state,groups){
 const effective=countedShares(state,groups),quotients=[];let best=null,winning=[];
 for(let i=0;i<groups.length;i++){
  const g=groups[i];if(!g.votes||state.counts[i]>=g.names.length){quotients.push(null);continue;}
  const divisor=E.plus(effective[i],E.one());const q=E.over(E.frac(BigInt(g.votes)),divisor);quotients.push(q);
  if(best===null||E.cmp(q,best)>0){best=q;winning=[i];}else if(E.cmp(q,best)===0)winning.push(i);
 }
 return {winning,quotients,effective};
}
function keyOf(s){return s.counts.join(',')+'|'+Object.keys(s.firstByPerson).sort().map(k=>JSON.stringify([k,s.firstByPerson[k]])).join(';');}
function compute(ballots,options){
 const {maxStates=30000}=options||{};
 const prep=prepare(ballots,options);
 const {groups,seats}=prep;let states=new Map();
 const initial={counts:groups.map(()=>0),firstByPerson:{},prob:E.one(),trace:[]};
 // Vid val av en enda plats anger 16 § att högsta röstetal avgör. Om en sådan
 // grupp saknar beaktade namn kan vi inte säkert besätta platsen med nästa grupp.
 const highest=Math.max(...groups.map(g=>g.votes));
 if(seats===1&&groups.some(g=>g.votes===highest&&!g.names.length)){initial.incomplete=true;initial.trace=[{seat:1,error:'Högst röstetal förekommer på en valsedelsgrupp utan beaktade namn. Kräver prövning; ingen vinnare antas.'}];}
 states.set(keyOf(initial),initial);
 const steps=[];let truncated=false;
 for(let seat=0;seat<seats;seat++){
  const next=new Map();const ties=new Set();let ended=0;
  for(const s of states.values()){
   if(s.incomplete){const k=keyOf(s);const old=next.get(k);if(old)old.prob=E.plus(old.prob,s.prob);else next.set(k,s);continue;}
   const {winning,quotients,effective}=rank(s,groups);
   if(!winning.length){ended++;const endedState={...s,incomplete:true,trace:[...s.trace,{seat:seat+1,error:'Ingen valsedelsgrupp med återstående namn kunde få fler platser'}]};const k=keyOf(endedState),old=next.get(k);if(old)old.prob=E.plus(old.prob,s.prob);else next.set(k,endedState);continue;}
   if(winning.length>1)ties.add(winning.map(i=>groups[i].id).join('+'));
   const part=E.over(s.prob,E.frac(winning.length));
   for(const i of winning){
    const counts=s.counts.slice();const name=groups[i].names[counts[i]];counts[i]++;
    const firstByPerson={...s.firstByPerson};if(!firstByPerson[name])firstByPerson[name]=groups[i].id;
    const ns={counts,firstByPerson,prob:part,trace:[...s.trace,{seat:seat+1,groupId:groups[i].id,groupLabel:groups[i].label,personId:name,personName:prep.people[name].name,tie:winning.length>1,drawAgainst:winning.map(j=>groups[j].id),comparison:E.simple(quotients[i]),effectiveSeats:E.simple(effective[i])}]};
    const key=keyOf(ns),old=next.get(key);if(old)old.prob=E.plus(old.prob,part);else next.set(key,ns);
   }
  }
  if(next.size>maxStates)throw Error(`Exakt beräkning kräver mer än ${maxStates} tillstånd. Minska antalet listor eller platser.`);
  states=next;steps.push({seat:seat+1,ties:[...ties],states:states.size,unfinished:ended});
  if([...states.values()].every(s=>s.incomplete)){truncated=true;break;}
 }
 const outcomes=[...states.values()].map(s=>({counts:s.counts,firstByPerson:s.firstByPerson,prob:s.prob,trace:s.trace,incomplete:!!s.incomplete}));
 const checksum=outcomes.reduce((sum,o)=>E.plus(sum,o.prob),E.zero());if(E.cmp(checksum,E.one())!==0)throw Error('Sannolikhetskontroll misslyckades');
 const distributions=groups.map((g,i)=>{const map=new Map();for(const o of outcomes)map.set(o.counts[i],E.plus(map.get(o.counts[i])||E.zero(),o.prob));return [...map].sort((a,b)=>a[0]-b[0]).map(([places,prob])=>({places,prob}));});
 const elected=outcomes.map(o=>({prob:o.prob,people:Object.keys(o.firstByPerson).map(id=>({id,name:prep.people[id].name,firstGroup:o.firstByPerson[id]}))}));
 return {...prep,groups,distributions,outcomes,elected,steps,exact:true,complete:!truncated&&!outcomes.some(o=>o.incomplete),incompleteWarning:outcomes.some(o=>o.incomplete)?'Vissa platser kunde inte besättas med tillgängliga namnlistor. Resultatet är inte fullständigt.':null,assumption:'Likformiga lottningsutfall är ett redovisat simuleringsantagande, inte en juridiskt garanterad sannolikhet.',modelVersion:VERSION};
}
function alternativeOrder(member,memberGroup,substituteResult,unavailable=[]){
 // 22 § avser proportionalvalda ersättare. Angivna valsedelsgrupper + först tilldelande grupp krävs.
 if(!substituteResult||!substituteResult.groups||!substituteResult.outcomes)throw Error('Ersättarval måste vara beräknat');
 const blocked=new Set([...unavailable,String(member)]);
 const out=[];
 for(const state of substituteResult.outcomes){
  const groups=substituteResult.groups;
  const assigned=groups.map((g,i)=>({group:g,candidates:g.names.slice(0,state.counts[i]).map((person,index)=>({id:person,position:index,first:state.firstByPerson[person]})).filter(p=>p.first===g.id&&!blocked.has(p.id))}));
  const same=assigned.filter(x=>x.group.label===memberGroup);
  const other=assigned.filter(x=>x.group.label!==memberGroup).sort((a,b)=>b.group.votes-a.group.votes);
  // Under 22 § är ordningen mellan ersättargrupper med samma röstetal en ytterligare lottningsfråga.
  const ties=other.some((g,i)=>i&&other[i-1].group.votes===g.group.votes);
  const candidates=[...same,...other].flatMap(x=>x.candidates.map(p=>({name:substituteResult.people[p.id]?.name||p.id,id:p.id,groupLabel:x.group.label,groupVotes:x.group.votes})));
  out.push({prob:state.prob,candidates,tieOnPriority:ties});
 }
 return out;
}
return {VERSION,prepare,compute,countedShares,rank,alternativeOrder};
});
