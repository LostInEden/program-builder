export type ExportSection={title:string;lines:string[];images?:{data:string;label:string}[]};
/** Capture existing rendered football diagrams; no generated/reinterpreted geometry. */
export async function diagramImages(root:HTMLElement|null){
 if(!root)return [];
 const images:{data:string;label:string}[]=[];
 for(const svg of Array.from(root.querySelectorAll<SVGSVGElement>('button[aria-label^="Expand "] svg')).filter(s=>s.querySelectorAll('path,line,circle,text').length>15)){
  const copy=svg.cloneNode(true) as SVGSVGElement;
  const nodes=[svg,...Array.from(svg.querySelectorAll('*'))],copies=[copy,...Array.from(copy.querySelectorAll('*'))];
  nodes.forEach((el,i)=>{const style=getComputedStyle(el);for(const prop of ['fill','stroke','color','font-family','font-size','font-weight','opacity']) (copies[i] as SVGElement).style.setProperty(prop,style.getPropertyValue(prop));});
  const box=svg.viewBox.baseVal,w=box.width||svg.clientWidth,h=box.height||svg.clientHeight;
  copy.setAttribute('width',String(w));copy.setAttribute('height',String(h));copy.setAttribute('xmlns','http://www.w3.org/2000/svg');
  const url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(copy)],{type:'image/svg+xml'}));
  try{const img=new Image();img.src=url;await img.decode();const canvas=document.createElement('canvas');canvas.width=1000;canvas.height=Math.round(1000*h/w);const ctx=canvas.getContext('2d');if(!ctx)continue;ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);images.push({data:canvas.toDataURL('image/png'),label:svg.closest('figure')?.querySelector('figcaption')?.textContent??'Saved football diagram'});}finally{URL.revokeObjectURL(url);}
 }
 return images;
}
export async function exportScout(format:'pdf'|'docx',title:string,sections:ExportSection[],quick=false){
 if(format==='pdf'){
  const {jsPDF}=await import('jspdf');const doc=new jsPDF({unit:'pt',format:'letter'});let y=42;
  const line=(text:string,size=10,bold=false)=>{doc.setFont('helvetica',bold?'bold':'normal');doc.setFontSize(size);const rows=doc.splitTextToSize(text,528);for(const row of rows){if(y>748){doc.addPage();y=42;}doc.text(row,42,y);y+=size+4;}};
  line(title,16,true);line(`CounterScheme · ${new Date().toLocaleDateString()}`,9);y+=8;
  for(const [index,section] of sections.entries()){
   if(quick&&index===3){doc.addPage();y=42;}
   if(y>690){doc.addPage();y=42;}line(section.title,12,true);
   for(const text of section.lines)line(text);y+=8;
   for(const image of section.images??[]){if(y>510){doc.addPage();y=42;}line(image.label,10,true);const props=doc.getImageProperties(image.data);const height=Math.min(190,480*props.height/props.width);doc.addImage(image.data,'PNG',42,y,height*props.width/props.height,height);y+=height+14;}
  }
  return doc.output('blob');
 }else{
  const {Document,Packer,Paragraph,TextRun,ImageRun,HeadingLevel}=await import('docx');
  const children=[new Paragraph({text:title,heading:HeadingLevel.TITLE}),new Paragraph(`CounterScheme · ${new Date().toLocaleDateString()}`)];
  for(const [index,section] of sections.entries()){
   children.push(new Paragraph({text:section.title,heading:HeadingLevel.HEADING_1,pageBreakBefore:quick&&index===3}));
   for(const text of section.lines)children.push(new Paragraph({children:[new TextRun(text)],spacing:{after:100}}));
   for(const image of section.images??[]){const img=new Image();img.src=image.data;await img.decode();const height=Math.min(180,600*img.height/img.width);children.push(new Paragraph(image.label),new Paragraph({children:[new ImageRun({type:'png',data:Uint8Array.from(atob(image.data.split(',')[1]),c=>c.charCodeAt(0)),transformation:{width:height*img.width/img.height,height}})]}));}
  }
  const doc=new Document({sections:[{properties:{page:{margin:{top:600,bottom:600,left:600,right:600}}},children}]});return Packer.toBlob(doc);
 }
}
