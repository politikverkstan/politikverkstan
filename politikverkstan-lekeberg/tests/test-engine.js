'use strict';
const assert=require('node:assert/strict');const E=require('../src/engine.js');
const q=(n,d=1)=>E.frac(BigInt(n),BigInt(d));
const eq=(a,b)=>E.cmp(a,b)===0;
function cases(){const g=[{id:'A',votes:20},{id:'B',votes:10},{id:'C',votes:5}];
 for(const [seats,mins,maxs,exps] of [[5,[3,1,0],[4,2,1],['10/3','4/3','1/3']],[9,[5,2,1],[6,3,1],['11/2','5/2','1']],[13,[7,3,1],[8,4,2],['23/3','11/3','5/3']]]){
  const r=E.allocate(g,seats);assert.deepEqual(r.min,mins);assert.deepEqual(r.max,maxs);assert.deepEqual(r.expected.map(E.simple),exps);assert(r.ties);
 }
 assert.equal(E.threshold(35,13),3);assert.equal(E.threshold(35,9),4);assert.equal(E.threshold(35,6),5);assert.equal(E.threshold(35,5),6);assert.equal(E.threshold(35,3),9);assert.equal(E.threshold(35,1),18);assert.equal(E.threshold(13,5),3);
 const nested=E.nested(E.allocate(g,13),g,5);assert.deepEqual(nested.expected.map(E.simple),['10/3','4/3','1/3']);
 const  tie=E.allocate([{id:'X',votes:1},{id:'Y',votes:1}],1);assert.deepEqual(tie.expected.map(E.simple),['1/2','1/2']);assert.equal(tie.variantCount,2);
 assert.throws(()=>E.allocate([{id:'A',votes:-1}],3));assert.throws(()=>E.allocate([{id:'A',votes:0}],3));
 assert.throws(()=>E.allocate([{id:'A',votes:1},{id:'A',votes:2}],3));
 assert.deepEqual(E.allocate([{id:'A',votes:35}],6).expected.map(E.simple),['6']);
}
// Independently implemented exact enumeration of all possible tie-break sequences
// with integer cross-products, using path-frequency counts (not production fractions).
function brute(groups,seats){const end=new Map();let paths=0;
 function explore(a,pNumer,pDen){if(a.reduce((x,y)=>x+y,0)===seats){let key=a.join(',');let prev=end.get(key)||[0n,1n];let x=pNumer*prev[1]+prev[0]*pDen,y=pDen*prev[1];let z=gcd(x,y);end.set(key,[x/z,y/z]);paths++;return;}
 let cand=[],w=null,den=null;
 groups.forEach((g,i)=>{if(g===0)return;let n=BigInt(g),d=BigInt(a[i]+1);
 if(w===null||n*den>w*d){w=n;den=d;cand=[i];}else if(n*den===w*d)cand.push(i);});
 for(let i of cand){let next=a.slice();next[i]++;explore(next,pNumer,pDen*BigInt(cand.length));}
 }
 explore(Array(groups.length).fill(0),1n,1n);return end;
}
function gcd(a,b){while(b){let t=a%b;a=b;b=t;}return a||1n;}
let seed=0x2431ad72;function rand(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;}
function randomized(total=1500){for(let k=0;k<total;k++){
 let n=2+(rand()%4),seats=1+(rand()%7),arr=Array.from({length:n},()=>1+rand()%21);
 const groups=arr.map((votes,i)=>({id:'G'+i,votes})); const result=E.allocate(groups,seats); const ref=brute(arr,seats);
 assert.equal(result.outcomes.length,ref.size,`case ${k}`);
 const resMap=new Map(result.outcomes.map(o=>[o.allocation.join(','),o.prob]));
 for(const [allocation,[num,den]] of ref){let got=resMap.get(allocation);assert(got,`missing outcome ${allocation} case ${k}`);assert(eq(got,E.frac(num,den)),`prob mismatch case ${k}: ${allocation}`);}
 assert(eq(result.expected.reduce(E.plus,E.zero()),q(seats)));
 const swapped=groups.slice().reverse();let mirror=E.allocate(swapped,seats);
 assert.deepEqual(mirror.expected.map(E.simple).reverse(),result.expected.map(E.simple));
 const double=groups.map(g=>({...g,votes:g.votes*3}));const scaled=E.allocate(double,seats);assert.deepEqual(scaled.expected.map(E.simple),result.expected.map(E.simple));
 }
 console.log(`PASS ${total} random exhaustive comparisons against independent reference implementation`);
}
cases();randomized(1500);console.log('PASS legal thresholds, core reference cases, exact ties, dependent selection, input validation.');
