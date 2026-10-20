/* Mandatportal Lekeberg — fristående simuleringsmotor, version 0.2.0.
   Förenklad gruppbaserad modell enligt huvudregeln i lag (2022:629), 17–18 §§.
   Innehåller INTE kandidatbaserade undantag enligt 18–20 §§. */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.MandatEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const VERSION = '0.2.0';
  function gcd(a,b){ a=a<0n?-a:a; b=b<0n?-b:b; while(b){let t=a%b;a=b;b=t;}return a||1n; }
  function frac(n,d=1n){ n=BigInt(n);d=BigInt(d);if(d===0n)throw Error('Nämnare får inte vara 0');if(d<0n){n=-n;d=-d;}let g=gcd(n,d);return {n:n/g,d:d/g}; }
  function plus(a,b){return frac(a.n*b.d+b.n*a.d,a.d*b.d);}
  function minus(a,b){return frac(a.n*b.d-b.n*a.d,a.d*b.d);}
  function times(a,b){return frac(a.n*b.n,a.d*b.d);}
  function over(a,b){return frac(a.n*b.d,a.d*b.n);}
  function cmp(a,b){let x=a.n*b.d-b.n*a.d;return x<0n?-1:x>0n?1:0;}
  function decimal(a,digits=2){return (Number(a.n)/Number(a.d)).toLocaleString('sv-SE',{minimumFractionDigits:digits,maximumFractionDigits:digits});}
  function simple(a){return a.d===1n?String(a.n):`${a.n}/${a.d}`;}
  function zero(){return frac(0n);}
  function one(){return frac(1n);}
  function threshold(present,places){if(!Number.isInteger(present)||present<1||!Number.isInteger(places)||places<1)throw Error('Ogiltiga tröskeldata');return Math.ceil(present/(places+1));}
  function validate(groups,seats){
    if(!Array.isArray(groups)||groups.length<1)throw Error('Minst en kartell måste finnas');
    if(!Number.isInteger(seats)||seats<1||seats>40)throw Error('Antalet platser måste ligga mellan 1 och 40');
    const ids=new Set();
    for(const g of groups){if(!g.id||ids.has(g.id))throw Error('Kartell-ID måste vara unika');ids.add(g.id);if(!Number.isSafeInteger(g.votes)||g.votes<0)throw Error('Röstetal måste vara icke-negativa heltal');}
    if(!groups.some(g=>g.votes>0))throw Error('Minst en giltig röst krävs');
  }
  function allocate(groups, seats, maxStates=45000){
    validate(groups,seats);
    const n=groups.length, votes=groups.map(g=>BigInt(g.votes));
    let states=new Map([['0'.repeat(n).split('').join(','),one()]]);
    const stepStats=[];
    for(let step=0;step<seats;step++){
      const next=new Map(); const ties=new Set();
      for(const [key,weight] of states){
        const allocation=key.split(',').map(Number);let best=null;let winners=[];
        for(let i=0;i<n;i++){
          if(votes[i]===0n)continue;
          const score=frac(votes[i],BigInt(allocation[i]+1));
          if(best===null||cmp(score,best)>0){best=score;winners=[i];}
          else if(cmp(score,best)===0)winners.push(i);
        }
        if(!winners.length)throw Error('Inga röstberättigade grupper');
        if(winners.length>1)ties.add(winners.map(i=>groups[i].id).sort().join('+'));
        const share=over(weight,frac(winners.length));
        for(const i of winners){
          const a=allocation.slice();a[i]++;const k=a.join(',');next.set(k,plus(next.get(k)||zero(),share));
        }
      }
      if(next.size>maxStates)throw Error(`För många möjliga lottningsutfall (${next.size}). Begränsa scenariot.`);
      states=next;stepStats.push({seat:step+1,ties:[...ties].sort(),possibilities:states.size});
    }
    let distributions=Array.from({length:n},()=>new Map());
    let expected=Array.from({length:n},zero);
    let min=Array(n).fill(seats),max=Array(n).fill(0);
    let sum=zero();
    const outcomes=[];
    for(const [key,p] of states){
      const a=key.split(',').map(Number);sum=plus(sum,p);
      outcomes.push({allocation:a,prob:p});
      for(let i=0;i<n;i++){
        min[i]=Math.min(min[i],a[i]);max[i]=Math.max(max[i],a[i]);
        expected[i]=plus(expected[i],times(frac(a[i]),p));
        distributions[i].set(a[i],plus(distributions[i].get(a[i])||zero(),p));
      }
    }
    if(cmp(sum,one())!==0)throw Error('Sannolikheterna summerar inte till ett');
    const expSum=expected.reduce((a,b)=>plus(a,b),zero());
    if(cmp(expSum,frac(seats))!==0)throw Error('Förväntade platser summerar inte rätt');
    return {groups:groups.map(g=>({...g})),seats,distributions:distributions.map(m=>[...m].sort((a,b)=>a[0]-b[0]).map(([places,prob])=>({places,prob}))),expected,min,max,outcomes,stepStats,ties:stepStats.some(s=>s.ties.length),variantCount:states.size};
  }
  function nested(parent,groups,childSeats){
    if(parent.groups.length!==groups.length)throw Error('Fel antal karteller i beroende val');
    const combined=new Map();
    for(const state of parent.outcomes){
      const voters=groups.map((g,i)=>({id:g.id,votes:state.allocation[i]}));
      const child=allocate(voters,childSeats);
      for(const final of child.outcomes){
        const key=final.allocation.join(',');
        combined.set(key,plus(combined.get(key)||zero(),times(state.prob,final.prob)));
      }
    }
    return resultFromOutcomes(groups,childSeats,combined,{parentSeats:parent.seats,parentVariants:parent.variantCount});
  }
  function resultFromOutcomes(groups,seats,combined,meta={}){
    const n=groups.length, distributions=Array.from({length:n},()=>new Map());
    const expected=Array.from({length:n},zero),min=Array(n).fill(seats),max=Array(n).fill(0);
    let check=zero();const outcomes=[];
    for(const [key,prob] of combined){
      const allocation=key.split(',').map(Number);check=plus(check,prob);outcomes.push({allocation,prob});
      for(let i=0;i<n;i++){
        let x=allocation[i];min[i]=Math.min(min[i],x);max[i]=Math.max(max[i],x);
        expected[i]=plus(expected[i],times(frac(x),prob));
        distributions[i].set(x,plus(distributions[i].get(x)||zero(),prob));
      }
    }
    if(cmp(check,one())!==0)throw Error('Fel sannolikhet i beroende val');
    if(cmp(expected.reduce(plus,zero()),frac(seats))!==0)throw Error('Fel platssumma i beroende val');
    return {groups:groups.map(g=>({...g})),seats,distributions:distributions.map(m=>[...m].sort((a,b)=>a[0]-b[0]).map(([places,prob])=>({places,prob}))),expected,min,max,outcomes,ties:outcomes.length>1,variantCount:outcomes.length,stepStats:[],meta};
  }
  function summarize(result,i){
    const dist=result.distributions[i];const guaranteed=result.min[i],maximum=result.max[i];
    return {guaranteed,maximum,expected:result.expected[i],dist,extraProbability:dist.reduce((acc,v)=>v.places>guaranteed?plus(acc,v.prob):acc,zero())};
  }
  function majorityProbability(result,subsetIndices){const threshold=Math.floor(result.seats/2)+1;
    return result.outcomes.reduce((acc,state)=>subsetIndices.reduce((s,i)=>s+state.allocation[i],0)>=threshold?plus(acc,state.prob):acc,zero());}
  function mergeGroupSets(groups,i,j){const a=groups[i],b=groups[j];
    const updated=groups.filter((_,idx)=>idx!==i&&idx!==j);
    updated.push({id:[...a.parties,...b.parties].sort().join('-'),parties:[...a.parties,...b.parties].sort(),votes:a.votes+b.votes});
    return updated.sort((x,y)=>y.votes-x.votes||x.id.localeCompare(y.id));
  }
  function partitionGroups(parties,layout){
    const used=new Set();return layout.filter(a=>a&&a.length).map(arr=>{
      for(const p of arr){if(used.has(p))throw Error('Parti förekommer i flera karteller');used.add(p);}
      return {id:[...arr].sort().join('-'),parties:[...arr].sort(),votes:arr.reduce((s,p)=>s+(parties[p]?.seats||0),0)};
    }).sort((a,b)=>b.votes-a.votes||a.id.localeCompare(b.id));
  }
  return {VERSION,frac,plus,minus,times,over,cmp,decimal,simple,zero,one,threshold,allocate,nested,summarize,majorityProbability,mergeGroupSets,partitionGroups};
});
