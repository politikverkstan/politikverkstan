/* Tiny offline-capable PDF exporter. A4, true selectable text, standard Helvetica WinAnsi.
   Unsupported glyphs are transliterated only for PDF output, not stored data. */
window.MotionPDF=(function(){
const CP={'€':128,'‚':130,'ƒ':131,'„':132,'…':133,'†':134,'‡':135,'ˆ':136,'‰':137,'Š':138,'‹':139,'Œ':140,'Ž':142,'‘':145,'’':146,'“':147,'”':148,'•':149,'–':150,'—':151,'˜':152,'™':153,'š':154,'›':155,'œ':156,'ž':158,'Ÿ':159};
function encode(s){let v='';for(let c of String(s)){let n=c.codePointAt(0);if(c==='\n'||c==='\r')continue;if(n===92||n===40||n===41){v+='\\'+c;continue;}if(n>255)n=CP[c]??63;if(n>=128||n<32)v+='\\'+n.toString(8).padStart(3,'0');else v+=String.fromCharCode(n);}return '('+v+')';}
function width(text,size,bold){const canvas=width.canvas||(width.canvas=document.createElement('canvas'));const ctx=canvas.getContext('2d');ctx.font=(bold?'bold ':'')+size+'px Arial';return ctx.measureText(String(text)).width;}
function wrap(text,maxWidth,size,bold=false){let rows=[];const paras=String(text||'').replace(/\r/g,'').split('\n');for(const para of paras){if(!para.trim()){rows.push('');continue;}let line='';for(const word of para.split(/\s+/)){if(!word)continue;const next=(line?line+' ':'')+word;if(line&&width(next,size,bold)>maxWidth){rows.push(line);line=word;}else line=next;}rows.push(line);}return rows;}
const esc=encode;
function createPdf(doc,variant='sd'){
 const W=595.28,H=841.89,left=59,right=59,max=W-left-right;const pages=[];let cmds=[],y=H-64;const navy=variant==='sd'?'0.08 0.12 0.31':'0.15 0.20 0.29';const dark='0.13 0.18 0.27';
 function draw(txt,size=11,bold=false,x=left,yy=y,color=dark){if(!txt)return;cmds.push(`BT ${color} rg /${bold?'F2':'F1'} ${size} Tf 1 0 0 1 ${x.toFixed(2)} ${yy.toFixed(2)} Tm ${esc(txt)} Tj ET`);}
 function fresh(){cmds=[];y=H-68;cmds.push(variant==='sd'?`${navy} rg 0 ${H-12} ${W} 12 re f`:'0.70 0.73 0.77 rg 0 '+(H-3)+' '+W+' 3 re f');draw('MOTION TILL LEKEBERGS KOMMUNFULLMÄKTIGE',9,true,left,H-52,navy);}
 function finish(){cmds.push(`0.55 0.61 0.69 rg 0.5 w ${left} 46 m ${W-right} 46 l S`);draw('Politikverkstan Lekeberg · Dokumentutkast',8,false,left,31,'0.47 0.51 0.58');pages.push(cmds.join('\n'));}
 function ensure(n=19){if(y-n<75){finish();fresh();}}
 function textBlock(txt,size=11,lineHeight=17,color=dark){const lines=wrap(txt,max,size);for(const line of lines){ensure(lineHeight);if(line)draw(line,size,false,left,y,color);y-=lineHeight;}return lines.length;}
 function section(title){ensure(42);y-=14;draw(title,11,true,left,y,navy);y-=19;}
 fresh();y-=13;let title=String(doc.title||'Motion utan rubrik');for(const line of wrap(title,max,19,true)){ensure(27);draw(line,19,true,left,y,navy);y-=26;}y-=11;
 if(doc.problem){section('Bakgrund');textBlock(doc.problem);}
 if(doc.motivation){section('Motivering');textBlock(doc.motivation);}
 if(doc.proposal){section('Förslag');textBlock(doc.proposal);}
 section('Förslag till beslut');
 let clauses=Array.isArray(doc.clauses)?doc.clauses.filter(Boolean):[];
 if(!clauses.length)clauses=['[Beslutsförslag behöver formuleras]'];
 for(const [i,clause] of clauses.entries()){
   const sentence=String(clause).trim().replace(/^att\s+/i,'');const lines=wrap('att '+sentence,max-25,11);const height=lines.length*17+8;
   if(y-height<75){finish();fresh();} draw(String(i+1)+'.',11,true,left,y,navy);
   for(const line of lines){draw(line,11,false,left+24,y);y-=17;}y-=8;
 }
 y-=25;ensure(95);draw(String(doc.date||''),10,false,left,y);y-=27;for(const signer of String(doc.signer||'Motionärens namn').split('\n')){ensure(19);draw(signer,11,true,left,y);y-=17;}draw(String(doc.party||'Sverigedemokraterna'),10,false,left,y);finish();
 const objects=[null];const add=(obj)=>{objects.push(obj);return objects.length-1;};
 const f1=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');const f2=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
 const kids=[];for(const pageContent of pages){const str=pageContent+'\n';const content=add(`<< /Length ${str.length} >>\nstream\n${str}endstream`);const page=add(`<< /Type /Page /Parent PARENTPAGES /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R >> >> /Contents ${content} 0 R >>`);kids.push(page);}
 const pagesId=add(`<< /Type /Pages /Kids [${kids.map(x=>x+' 0 R').join(' ')}] /Count ${kids.length} >>`);for(const id of kids)objects[id]=objects[id].replace('PARENTPAGES',pagesId+' 0 R');
 const catalog=add(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
 let pdf='%PDF-1.4\n%PDFBUILD\n';const offsets=[0];for(let id=1;id<objects.length;id++){offsets.push(pdf.length);pdf+=`${id} 0 obj\n${objects[id]}\nendobj\n`;}
 const xref=pdf.length;pdf+=`xref\n0 ${objects.length}\n0000000000 65535 f \n`;for(let id=1;id<objects.length;id++)pdf+=String(offsets[id]).padStart(10,'0')+' 00000 n \n';pdf+=`trailer\n<< /Size ${objects.length} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF`;
 return new Blob([new TextEncoder().encode(pdf)],{type:'application/pdf'});
 }
 return {createPdf};
})();
