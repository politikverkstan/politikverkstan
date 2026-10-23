/* MeetingPlus public detail parser. Never fetches or stores document contents. */
const ORIGIN='https://meetings.lekeberg.se';
const decode=s=>String(s||'').replace(/&(?:amp|quot|lt|gt|nbsp|#39|#x([0-9a-f]+)|#(\d+));/gi,(m,h,n)=>{
 if(h||n){const p=parseInt(h||n,h?16:10);return p>31&&p<=0x10ffff?String.fromCodePoint(p):' ';}
 return {'&amp;':'&','&quot;':'"','&lt;':'<','&gt;':'>','&nbsp;':' ','&#39;':"'" }[m.toLowerCase()]||' ';
});
const plain=s=>decode(String(s||'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ')).trim();
function attachmentUrl(raw,meetingUrl){
 let url;try{url=new URL(decode(raw),ORIGIN);}catch{return '';}
 if(url.origin!==ORIGIN||url.username||url.password)return '';
 const date=new URL(meetingUrl).pathname.match(/\/mote-(\d{4}-\d{2}-\d{2})$/)?.[1];
 if(!date||!url.pathname.includes('/mote-'+date+'/')||!/\/(?:agenda|protocol|protokoll)\//i.test(url.pathname))return '';
 if(url.hash||(url.search&&!/^\?downloadMode=(?:open|download)$/.test(url.search)))return '';
 return url.href;
}
export function parseOfficialAgenda(html,meetingUrl){
 if(typeof html!=='string'||html.length>1_600_000)throw Error('Felaktig mötessida');
 const target=new URL(meetingUrl);
 if(target.origin!==ORIGIN||!/^\/committees\/[a-z-]+\/mote-\d{4}-\d{2}-\d{2}$/.test(target.pathname))throw Error('Ej tillåtet möte');
 const agenda=[],seen=new Set();
 // Numbered headings are required. A failed match must NOT be presented as a verified agenda.
 for(const heading of html.matchAll(/<h([2-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi)){
  const match=plain(heading[2]).match(/^(?:punkt\s*)?(\d{1,3})\s*(?:[.:\-–§]\s*|\s+)(.{4,160})$/i);
  if(!match)continue;
  const number=Number(match[1]),title=match[2].trim();
  if(!number||number>250||/^(?:protokoll|bilagor|sida|beslutsunderlag)/i.test(title))continue;
  const key=number+'|'+title.toLocaleLowerCase('sv-SE');if(seen.has(key))continue;seen.add(key);
  agenda.push({number,title,source_url:meetingUrl});if(agenda.length>=70)break;
 }
 // Real MeetingPlus structure: <li class="meeting-item-row"> containing
 // a numbered <span> followed by <p class="item-title">. Do not extract
 // arbitrary text in the page or infer items from attachment filenames.
 for(const row of html.matchAll(/<li\b[^>]*class\s*=\s*(["'])[^"']*\bmeeting-item-row\b[^"']*\1[^>]*>([\s\S]*?)<\/li>/gi)){
  if(row[2].length>50000)continue;
  const titleTag=row[2].match(/<p\b[^>]*class\s*=\s*(["'])[^"']*\bitem-title\b[^"']*\1[^>]*>([\s\S]*?)<\/p>/i);
  if(!titleTag)continue;
  const title=plain(titleTag[2]).slice(0,160);
  if(title.length<4)continue;
  const before=row[2].slice(0,titleTag.index);
  const numeric=[...before.matchAll(/<span\b[^>]*>\s*(?:§\s*)?(\d{1,3})\s*<\/span>/gi)];
  const number=Number(numeric.at(-1)?.[1]||0);
  if(number<1||number>250)continue;
  const key=number+'|'+title.toLocaleLowerCase('sv-SE');
  if(seen.has(key))continue;
  seen.add(key);agenda.push({number,title,source_url:meetingUrl});
  if(agenda.length>=70)break;
 }
 agenda.sort((a,b)=>a.number-b.number);
 const documents=[],known=new Set();
 for(const a of html.matchAll(/<a\b[^>]*\bhref\s*=\s*(["'])([^"']+)\1[^>]*>([\s\S]*?)<\/a>/gi)){
  const url=attachmentUrl(a[2],meetingUrl);if(!url||known.has(new URL(url).pathname))continue;
  const title=plain(a[3]).slice(0,175)||decodeURIComponent(new URL(url).pathname.split('/').pop()).replace(/pdf$/i,'.pdf').slice(0,175);
  if(!title)continue;known.add(new URL(url).pathname);documents.push({title,url});if(documents.length>=80)break;
 }
 return {agenda,documents,agenda_status:agenda.length?'identified':'not_identified'};
}
