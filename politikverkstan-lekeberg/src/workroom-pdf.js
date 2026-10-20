/* Politics workroom PDF exporter. A4, selectable WinAnsi text, optional user-authorized PNG branding.
 * Classic PDF fonts are used without claiming they are the party's official typeface.
 * Unsupported non-WinAnsi characters are replaced only in the exported PDF; source data is unchanged. */
window.MotionPDF=(function(){
'use strict';
const W=595.28,H=841.89,L=64,R=64,WIDTH=W-L-R;
const CP={'€':128,'‚':130,'ƒ':131,'„':132,'…':133,'†':134,'‡':135,'ˆ':136,'‰':137,'Š':138,'‹':139,'Œ':140,'Ž':142,'‘':145,'’':146,'“':147,'”':148,'•':149,'–':150,'—':151,'˜':152,'™':153,'š':154,'›':155,'œ':156,'ž':158,'Ÿ':159};
const tenc=new TextEncoder();
function ascii(s){return tenc.encode(s);}
function join(...parts){const list=parts.filter(Boolean).map(x=>typeof x==='string'?ascii(x):x);const n=list.reduce((a,b)=>a+b.length,0);const bytes=new Uint8Array(n);let i=0;for(const b of list){bytes.set(b,i);i+=b.length;}return bytes;}
function escapeText(s){let out='';for(const ch of String(s||'')){let n=ch.codePointAt(0);if(n>255)n=CP[ch]??63;if(n===40||n===41||n===92){out+='\\'+String.fromCharCode(n);continue;}if(n<32||n>126)out+='\\'+n.toString(8).padStart(3,'0');else out+=String.fromCharCode(n);}return '('+out+')';}
function measure(s,size,bold=false,serif=false){const c=measure.c||(measure.c=document.createElement('canvas'));const ctx=c.getContext('2d');ctx.font=(bold?'bold ':'')+size+'px '+(serif?'"Times New Roman"':'Helvetica');return ctx.measureText(String(s)).width;}
function lines(s,w,size,bold=false,serif=true){const result=[];for(const para of String(s||'').replace(/\r/g,'').split('\n')){if(!para.trim()){result.push('');continue;}let line='';for(let word of para.split(/\s+/)){if(!word)continue;if(!line){line=word;continue;}if(measure(line+' '+word,size,bold,serif)>w){result.push(line);line=word;}else line+=' '+word;}if(line)result.push(line);}return result;}
async function jpegFromDataUrl(url){if(!url||!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(url)||url.length>520000)return null;return new Promise(resolve=>{const im=new Image();im.onload=()=>{try{const max=640,ratio=Math.min(1,max/Math.max(im.naturalWidth,im.naturalHeight));const c=document.createElement('canvas');c.width=Math.max(1,Math.round(im.naturalWidth*ratio));c.height=Math.max(1,Math.round(im.naturalHeight*ratio));const ctx=c.getContext('2d');ctx.fillStyle='#ffffff';ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(im,0,0,c.width,c.height);const jpg=c.toDataURL('image/jpeg',0.88).split(',')[1];const bin=atob(jpg);const bytes=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);resolve({data:bytes,width:c.width,height:c.height});}catch{resolve(null)}};im.onerror=()=>resolve(null);im.src=url;});}
async function createPdf(doc,variant='sd',logoDataUrl=''){
 const sd=variant==='sd',logo=sd?await jpegFromDataUrl(logoDataUrl):null;
 const navy=sd?'0.09 0.15 0.39':'0.24 0.28 0.34',gold='0.93 0.74 0.19',dark='0.17 0.21 0.27',muted='0.39 0.43 0.51';
 const pages=[];let cmds=[],y=0;let pageNumber=0;
 const draw=(s,x,yy,size=11,font='F1',color=dark)=>{if(!s)return;cmds.push(`BT ${color} rg /${font} ${size} Tf 1 0 0 1 ${x.toFixed(2)} ${yy.toFixed(2)} Tm ${escapeText(s)} Tj ET`);};
 const line=(x1,y1,x2,y2,color=navy,weight=0.8)=>cmds.push(`${color} RG ${weight} w ${x1} ${y1} m ${x2} ${y2} l S`);
 function start(){pageNumber++;cmds=[];
   if(sd){if(logo){const ratio=logo.width/logo.height,w=Math.min(42,42*ratio),h=Math.min(42,42/ratio);cmds.push(`q ${w.toFixed(2)} 0 0 ${h.toFixed(2)} ${L} ${(H-89).toFixed(2)} cm /Logo Do Q`);}draw('Sverigedemokraterna',L+(logo?55:0),H-62,16,'F3',navy);draw('LEKEBERG',L+(logo?55:0),H-78,9,'F3',navy);line(L,H-105,W-R,H-105);cmds.push(`${gold} RG 3 w ${L} ${H-105} m ${L+43} ${H-105} l S`);}else{draw('MOTION TILL LEKEBERGS KOMMUNFULLMÄKTIGE',L,H-73,9,'F3',navy);line(L,H-94,W-R,H-94,'0.75 0.77 0.80',0.7);}
   if(sd)draw('MOTION TILL LEKEBERGS KOMMUNFULLMÄKTIGE',L,H-127,8,'F3',muted);
   y=H-(sd?157:123);
 }
 function finish(){line(L,61,W-R,61,'0.78 0.81 0.85',0.6);if(sd)draw('SVERIGEDEMOKRATERNA LEKEBERG',L,45,7.4,'F3',muted);draw('Sida '+pageNumber,W-R-40,45,8,'F2',muted);pages.push(cmds.join('\n')+'\n');}
 function ensure(height){if(y-height<87){finish();start();}}
 function paragraph(s,size=11.4,leading=17.2,extra=10,font='F1',col=dark,indent=0){for(const row of lines(s,WIDTH-indent,size,font==='F4',font==='F1'||font==='F4')){ensure(leading);if(row)draw(row,L+indent,y,size,font,col);y-=leading;}y-=extra;}
 function section(name){ensure(46);y-=9;draw(name,L,y,11,'F3',navy);y-=19;}
 start();let title=String(doc?.title||'Motion utan rubrik');for(const row of lines(title,WIDTH,20,true,false)){ensure(27);draw(row,L,y,20,'F3',navy);y-=26;}y-=13;
 // Formal municipal motions benefit from continuous prose; never generate empty section headings.
 if(doc?.problem)paragraph(doc.problem);
 if(doc?.motivation)paragraph(doc.motivation);
 if(doc?.proposal)paragraph(doc.proposal);
 section('Förslag till beslut');
 const clauses=Array.isArray(doc?.clauses)?doc.clauses.map(x=>String(x).trim()).filter(Boolean):[];
 for(const [i,c] of (clauses.length?clauses:['[Beslutsförslag saknas]']).entries()){
  const body=/^att\s/i.test(c)?c:'att '+c;const rows=lines(body,WIDTH-34,11.5,false,true);const block=rows.length*17.5+10;ensure(Math.min(block,150));draw((i+1)+'.',L,y,10.5,'F3',navy);
  for(const row of rows){ensure(17.5);draw(row,L+27,y,11.5,'F1');y-=17.5;}y-=10;
 }
 y-=18;ensure(85);let date=String(doc?.date||'').trim();if(/^\d{4}-\d{2}-\d{2}$/.test(date)){const [a,b,c]=date.split('-');date=`${c}/${b} ${a}`;}if(date){draw('Lekeberg, '+date,L,y,10.5,'F1',muted);y-=30;}
 const signers=String(doc?.signer||'').split('\n').map(x=>x.trim()).filter(Boolean);for(const s of signers){ensure(19);draw(s,L,y,11.2,'F4',dark);y-=18;}
 if(doc?.party){ensure(17);draw(String(doc.party),L,y,10,'F1',muted);}finish();
 // All PDF offsets must be counted in bytes, not JS string length (e.g. metadata and JPEG).
 const objs=[null],add=x=>(objs.push(x),objs.length-1);
 const f1=add(ascii('<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman /Encoding /WinAnsiEncoding >>'));
 const f2=add(ascii('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'));
 const f3=add(ascii('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>'));
 const f4=add(ascii('<< /Type /Font /Subtype /Type1 /BaseFont /Times-Bold /Encoding /WinAnsiEncoding >>'));
 let logoId=0;if(logo)logoId=add(join(`<< /Type /XObject /Subtype /Image /Width ${logo.width} /Height ${logo.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${logo.data.length} >>\nstream\n`,logo.data,'\nendstream'));
 const kids=[];for(const content of pages){const bytes=ascii(content);const cid=add(join(`<< /Length ${bytes.length} >>\nstream\n`,bytes,'endstream'));
   kids.push(add(ascii(`<< /Type /Page /Parent PARENTPAGES /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R /F3 ${f3} 0 R /F4 ${f4} 0 R >> ${logoId?`/XObject << /Logo ${logoId} 0 R >>`:''} >> /Contents ${cid} 0 R >>`)));}
 const p=add(ascii(`<< /Type /Pages /Kids [${kids.map(n=>n+' 0 R').join(' ')}] /Count ${kids.length} >>`));for(const id of kids)objs[id]=ascii(new TextDecoder().decode(objs[id]).replace('PARENTPAGES',p+' 0 R'));
 const root=add(ascii(`<< /Type /Catalog /Pages ${p} 0 R >>`));const parts=[ascii('%PDF-1.4\n%\xA5\xA5\xA5\xA5\n')],offsets=[0];let length=parts[0].length;
 for(let id=1;id<objs.length;id++){offsets[id]=length;const block=join(`${id} 0 obj\n`,objs[id],'\nendobj\n');parts.push(block);length+=block.length;}
 const xref=length;parts.push(ascii(`xref\n0 ${objs.length}\n0000000000 65535 f \n${offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')}trailer\n<< /Size ${objs.length} /Root ${root} 0 R >>\nstartxref\n${xref}\n%%EOF`));
 return new Blob(parts,{type:'application/pdf'});
}
return {createPdf};
})();
