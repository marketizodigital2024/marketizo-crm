'use strict';
const fs=require('node:fs'),path=require('node:path');
const xml=s=>String(s??'').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const col=n=>{let s='';for(n++;n;n=Math.floor((n-1)/26))s=String.fromCharCode(65+(n-1)%26)+s;return s;};
function xlsx(sheets,meta){
  const {zipSync,strToU8}=require('fflate'),files={};const put=(p,s)=>files[p]=strToU8(s);
  const all=[...sheets,{name:'Podaci o izveštaju',headers:['Napomene'],rows:meta.map(s=>[s])}];
  put('[Content_Types].xml',`<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${all.map((_,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`);
  put('_rels/.rels','<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');
  put('xl/workbook.xml',`<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${all.map((s,i)=>`<sheet name="${xml(s.name)}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('')}</sheets></workbook>`);
  put('xl/_rels/workbook.xml.rels',`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${all.map((_,i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('')}</Relationships>`);
  all.forEach((s,i)=>put(`xl/worksheets/sheet${i+1}.xml`,`<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${s.headers.map((_,c)=>`<col min="${c+1}" max="${c+1}" width="25" customWidth="1"/>`).join('')}</cols><sheetData>${[s.headers,...s.rows].map((row,r)=>`<row r="${r+1}">${row.map((v,c)=>typeof v==='number'&&Number.isFinite(v)?`<c r="${col(c)}${r+1}"><v>${v}</v></c>`:`<c r="${col(c)}${r+1}" t="inlineStr"><is><t xml:space="preserve">${xml(v)}</t></is></c>`).join('')}</row>`).join('')}</sheetData><autoFilter ref="A1:${col(s.headers.length-1)}${s.rows.length+1}"/></worksheet>`));
  // All text is inlineStr, including values beginning =,+,-,@: never an Excel formula.
  return Buffer.from(zipSync(files));
}
function pdf(sheets,meta){
  // Embedded Liberation Sans preserves Serbian/German names without remote services.
  const font=fs.readFileSync(path.join(__dirname,'../billing-assets/LiberationSans-Regular.ttf'));
  const tables={};for(let i=0;i<font.readUInt16BE(4);i++){const p=12+i*16;tables[font.toString('ascii',p,p+4)]=font.readUInt32BE(p+8);}
  const units=font.readUInt16BE(tables.head+18),numMetrics=font.readUInt16BE(tables.hhea+34);
  const cmap=tables.cmap;let sub;
  for(let i=0;i<font.readUInt16BE(cmap+2);i++){const p=cmap+4+i*8,o=cmap+font.readUInt32BE(p+4);if(font.readUInt16BE(o)===4){sub=o;if(font.readUInt16BE(p)===3)break;}}
  if(sub===undefined)throw Error('Font cmap is unavailable');
  const count=font.readUInt16BE(sub+6)/2,ends=sub+14,starts=ends+count*2+2,deltas=starts+count*2,ranges=deltas+count*2;
  function glyph(code){for(let i=0;i<count;i++){const end=font.readUInt16BE(ends+2*i);if(code>end)continue;if(code<font.readUInt16BE(starts+2*i))return 0;const delta=font.readInt16BE(deltas+2*i),range=font.readUInt16BE(ranges+2*i);if(!range)return(code+delta)&65535;const at=ranges+2*i+range+2*(code-font.readUInt16BE(starts+2*i));const g=font.readUInt16BE(at);return g?(g+delta)&65535:0;}return 0;}
  const objects=[null],add=s=>(objects.push(Buffer.isBuffer(s)?s:Buffer.from(s)),objects.length-1);
  const stream=(bytes,attrs='')=>{bytes=Buffer.isBuffer(bytes)?bytes:Buffer.from(bytes);return Buffer.concat([Buffer.from(`<< /Length ${bytes.length} ${attrs} >>\nstream\n`),bytes,Buffer.from('\nendstream')]);};
  const catalog=add(''),pagesId=add(''),fontData=add(stream(font,'/Length1 '+font.length));
  const descriptor=add(`<< /Type /FontDescriptor /FontName /LiberationSans /Flags 32 /FontBBox [-700 -400 2100 1100] /ItalicAngle 0 /Ascent 905 /Descent -212 /CapHeight 700 /StemV 80 /FontFile2 ${fontData} 0 R >>`);
  const used=new Set([32]),encode=s=>{let out='';for(const ch of String(s)){const code=ch.charCodeAt(0);used.add(code);out+=code.toString(16).padStart(4,'0');}return out;};
  const pages=[];let lines=[];
  const measure=text=>[...text].reduce((n,c)=>n+font.readUInt16BE(tables.hmtx+Math.min(glyph(c.charCodeAt(0)),numMetrics-1)*4)*10/units,0);
  const wrap=text=>{const out=[];for(const raw of String(text).split(/[\r\n]+/)){let line='';for(const word of raw.split(/\s+/)){if(measure(line+(line?' ':'')+word)>515){if(line)out.push(line);line='';}for(const char of word){if(measure(line+char)>515){out.push(line);line='';}line+=char;}line+=' ';}if(line.trim())out.push(line.trim());}return out.length?out:[''];};
  function flush(){if(lines.length){pages.push(lines);lines=[];}}
  const push=s=>{for(const line of wrap(s)){if(lines.length===44)flush();lines.push(line);}};
  for(const sheet of sheets){flush();push(sheet.name);for(const m of meta)push(m);push('');
    // Labeled blocks keep wide reports readable and never clip fields off the page.
    if(!sheet.rows.length)push('Nema zapisa u izabranom periodu.');
    for(const row of sheet.rows){const block=[];row.forEach((value,i)=>{if(value!==''&&value!==undefined&&value!==null)block.push(...wrap(`${sheet.headers[i]}: ${value}`));});
      if(block.length<38&&lines.length+block.length+1>44)flush();for(const l of block)push(l);push('');}
  }flush();
  const cidMap=Buffer.alloc(65536*2);for(let c=0;c<65536;c++)cidMap.writeUInt16BE(glyph(c),c*2);
  const mapId=add(stream(cidMap));
  const fontId=add(''),children=[];
  pages.forEach((page,i)=>{const content=`BT /F1 10 Tf 13 TL 40 800 Td ${page.map((s,j)=>`${j?'T* ':''}<${encode(s)}> Tj`).join('\n')}\nET\nBT /F1 9 Tf 40 25 Td <${encode(`Marketizo Digital | ${i+1}/${pages.length}`)}> Tj ET`;
    const contents=add(stream(content)),p=add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contents} 0 R >>`);children.push(p);});
  const codes=[...used].sort((a,b)=>a-b);let mapping='';for(let i=0;i<codes.length;i+=100){const group=codes.slice(i,i+100);mapping+=`${group.length} beginbfchar\n${group.map(c=>{const h=c.toString(16).padStart(4,'0');return`<${h}> <${h}>`;}).join('\n')}\nendbfchar\n`;}
  const unicode=add(stream(`/CIDInit /ProcSet findresource begin 12 dict begin begincmap /CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def /CMapName /Unicode def /CMapType 2 def 1 begincodespacerange <0000> <ffff> endcodespacerange\n${mapping}endcmap CMapName currentdict /CMap defineresource pop end end`));
  const widths=codes.map(c=>`${c} [${Math.round(font.readUInt16BE(tables.hmtx+Math.min(glyph(c),numMetrics-1)*4)*1000/units)}]`).join(' ');
  const descendant=add(`<< /Type /Font /Subtype /CIDFontType2 /BaseFont /LiberationSans /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> /FontDescriptor ${descriptor} 0 R /CIDToGIDMap ${mapId} 0 R /DW 500 /W [${widths}] >>`);
  objects[fontId]=Buffer.from(`<< /Type /Font /Subtype /Type0 /BaseFont /LiberationSans /Encoding /Identity-H /DescendantFonts [${descendant} 0 R] /ToUnicode ${unicode} 0 R >>`);
  objects[catalog]=Buffer.from(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);objects[pagesId]=Buffer.from(`<< /Type /Pages /Kids [${children.map(p=>p+' 0 R').join(' ')}] /Count ${children.length} >>`);
  const chunks=[Buffer.from('%PDF-1.7\n')],offsets=[0];let size=chunks[0].length;
  for(let i=1;i<objects.length;i++){offsets.push(size);const b=Buffer.concat([Buffer.from(`${i} 0 obj\n`),objects[i],Buffer.from('\nendobj\n')]);chunks.push(b);size+=b.length;}
  chunks.push(Buffer.from(`xref\n0 ${objects.length}\n0000000000 65535 f \n${offsets.slice(1).map(o=>String(o).padStart(10,'0')+' 00000 n \n').join('')}trailer << /Size ${objects.length} /Root ${catalog} 0 R >>\nstartxref\n${size}\n%%EOF\n`));return Buffer.concat(chunks);
}
module.exports={xlsx,pdf};
