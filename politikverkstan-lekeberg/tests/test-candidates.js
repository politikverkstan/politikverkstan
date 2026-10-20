'use strict';
const assert=require('node:assert/strict'),E=require('../src/engine.js'),C=require('../src/candidate-engine.js');
const B=(label,count,names,extra={})=>({label,count,names,...extra});
function eq(a,b){return E.cmp(a,b)===0;}
function cases(){
 const plain=[B('A',20,Array.from({length:13},(_,i)=>`A${i}`)),B('B',10,Array.from({length:13},(_,i)=>`B${i}`)),B('C',5,Array.from({length:13},(_,i)=>`C${i}`))];
 for(const [seats,expected] of [[5,['10/3','4/3','1/3']],[9,['11/2','5/2','1']],[13,['23/3','11/3','5/3']]]){
  const c=C.compute(plain,{seats,present:35});const means=c.distributions.map(d=>E.simple(d.reduce((acc,r)=>E.plus(acc,E.times(E.frac(r.places),r.prob)),E.zero())));
  assert.deepEqual(means,expected);assert(c.complete);assert(eq(c.outcomes.reduce((acc,o)=>E.plus(acc,o.prob),E.zero()),E.one()));
 }
 const multiple=C.compute([B('A',12,['X','A2','A3']),B('B',9,['X','B2','B3']),B('C',7,['C1','C2','C3'])],{seats:3});
 assert.deepEqual(multiple.outcomes[0].trace.map(t=>t.personId),['X','X','A2']);
 const votes=C.compute([B('A',2,['A','B']),B('B',1,['C','D'])],{seats:2});assert.equal(votes.outcomes.length,2);assert.deepEqual(votes.outcomes.map(o=>o.counts).sort(),[[1,1],[2,0]].sort());
 const grouped=C.prepare([B('A',2,['X','Y']),B('A',3,['X','Y']),B('A',4,['Y','X'])],{seats:2});
 assert.equal(grouped.groups.length,2);assert.deepEqual(grouped.groups.map(g=>g.votes),[5,4]);
 assert.equal(C.compute([B('A',3,[{name:'X',struck:true},'Y','Z']),B('B',2,['U','V'])],{seats:1}).outcomes[0].trace[0].personId,'Y');
 const skip=C.prepare([B('A',2,['a'],{sealed:false}),B('B',3,['b'])],{seats:1});assert.equal(skip.invalid,2);assert.equal(skip.valid,3);
 assert.throws(()=>C.compute([B('A',1,[{name:'a',eligible:'unknown'}])],{seats:1}),/Valbarhet/);
 assert.throws(()=>C.compute([B('A',3,['a'])],{seats:1,present:2}),/överstiger/);
 assert.equal(C.compute([B('A',1,[])],{seats:1}).complete,false);
 const blockedSingle=C.compute([B('A',10,[]),B('B',5,['X'])],{seats:1});assert(!blockedSingle.complete);assert.deepEqual(blockedSingle.outcomes[0].counts,[0,0]);
 const exhausted=C.compute([B('A',10,['X'])],{seats:3});assert(!exhausted.complete);assert.deepEqual(exhausted.outcomes[0].counts,[1]);
 const t=C.compute([B('A',1,['a','b']),B('B',1,['c','d'])],{seats:1});assert.equal(t.outcomes.length,2);assert(eq(t.outcomes[0].prob,E.frac(1,2)));
 const subs=C.compute([B('X',3,['E1','E2']),B('Y',1,['E3','E4'])],{seats:2});let list=C.alternativeOrder('Ledamot','X',subs);assert.equal(list.length,1);assert.equal(list[0].candidates[0].name,'E1');
}
// Independently compare the group result to the pre-existing exact allocation for basic cases
let seed=0x9a07c9ef;function rng(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;}
function randomized(total=5000){for(let k=0;k<total;k++){
 const n=2+(rng()%4),seats=1+rng()%7,votes=Array.from({length:n},()=>1+rng()%20);
 const ballots=votes.map((count,i)=>B('G'+i,count,Array.from({length:seats},(_,j)=>`P${i}-${j}`)));
 const c=C.compute(ballots,{seats}),e=E.allocate(votes.map((votes,i)=>({id:'G'+i,votes})),seats);
 for(let i=0;i<n;i++){
  assert.equal(c.distributions[i].length,e.distributions[i].length,`distribution length ${k} group ${i}`);
  for(let j=0;j<c.distributions[i].length;j++){
   assert.equal(c.distributions[i][j].places,e.distributions[i][j].places);
   assert(eq(c.distributions[i][j].prob,e.distributions[i][j].prob),`prob ${k}:${i}:${j}`);
  }
 }
 assert(eq(c.outcomes.reduce((a,o)=>E.plus(a,o.prob),E.zero()),E.one()));
 }
 console.log(`PASS ${total} generated group-vs-candidate comparisons`);
}
cases();randomized();console.log('PASS candidate validation, special 18 §, groups, ties, ballot exclusions, incomplete elections');
