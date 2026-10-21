import type {Call,Concept,ConceptKind} from './store';
import {getStructure} from './football';
import {defenseRevision,matchingComponent,responsibilityText,setDuty,type Duties} from './fullDefense';
import {diagramSection} from './schemeDiagrams';
export const componentKinds:ConceptKind[]=['front','coverage','pressure','adjustment'];
export const componentFields:Record<ConceptKind,(keyof Duties)[]>={front:['alignment','runFit'],coverage:['coverage'],pressure:['pressure'],adjustment:['checks']};
export type ComponentDrawing={sourceCallId?:string;structureId:string;call:Call;duties:Record<number,Duties>;slots:number[]};
export type ReviewFinding={area:string;concern:string;evidence:string;correction:string};
export function objectCategory(call:Call,type:'line'|'zone'|'text',id:string):ConceptKind|undefined{
 const declared=call.fullDefense?.objectCategories?.[`${type}:${id}`];
 if(declared)return declared;
 if(type==='zone')return call.zones.find(z=>z.id===id)?.side==='def'?'coverage':undefined;
 if(type==='line'){
  const l=call.lines.find(l=>l.id===id);if(!l?.anchor.startsWith('def:'))return;
  const duties=call.fullDefense?.duties[Number(l.anchor.slice(4))];
  const candidates=componentKinds.filter(k=>componentFields[k].some(f=>f!=='alignment'&&duties?.[f]?.trim()));
  if(candidates.length===1)return candidates[0];
 }
}
export function extractComponent(call:Call,kind:ConceptKind):ComponentDrawing{
 const fd=call.fullDefense!;
 const duties:Record<number,Duties>=Object.fromEntries(Object.entries(fd.duties).map(([i,d])=>[i,Object.fromEntries(componentFields[kind].filter(k=>d[k]?.trim()).map(k=>[k,d[k]]))]).filter(([,d])=>Object.keys(d as object).length));
 const slots=Object.keys(duties).map(Number);
 const lines=call.lines.filter(l=>objectCategory(call,'line',l.id)===kind);
 for(const l of lines){if(l.anchor.startsWith('def:')){const i=Number(l.anchor.slice(4));if(!slots.includes(i))slots.push(i);}}
 const copy=structuredClone(call);delete copy.fullDefense;delete copy.schemeConceptId;
 copy.section=diagramSection[kind];copy.lines=structuredClone(lines);copy.zones=structuredClone(call.zones.filter(z=>objectCategory(call,'zone',z.id)===kind));copy.texts=structuredClone((call.texts??[]).filter(t=>objectCategory(call,'text',t.id)===kind));
 copy.assignments=Object.fromEntries(Object.entries(duties).map(([i,d])=>[i,responsibilityText(d)]));copy.notes='';
 copy.defAppearance=Object.fromEntries(getStructure(fd.structureId).slots.map((_,i)=>[i,{...copy.defAppearance?.[i],hidden:!slots.includes(i)}]));
 return {sourceCallId:call.id,structureId:fd.structureId,call:copy,duties:structuredClone(duties),slots};
}
/** Pure, atomic save preparation: no existing concept or approved snapshot is mutated. */
export function organizeDefense(call:Call,concepts:Concept[],labels:string[],id:()=>string){
 const next=structuredClone(call),library=structuredClone(concepts),fd=next.fullDefense!;
 next.defFront=fd.componentNames?.front??fd.components.front?.name??next.defFront;next.defCoverage=fd.componentNames?.coverage??fd.components.coverage?.name??next.defCoverage;
 for(const kind of componentKinds){
  const name=(fd.componentNames?.[kind]??fd.components[kind]?.name??(kind==='front'?next.defFront:kind==='coverage'?next.defCoverage:''))?.trim();
  if(!name){delete fd.components[kind];continue;}
  const snapshot=fd.components[kind];
  const original=library.find(c=>c.id===snapshot?.id);
  if(snapshot?.name===name){
   if(original?.diagram?.sourceCallId===call.id&&JSON.stringify(original)===JSON.stringify(snapshot)){
    const diagram=extractComponent(next,kind);diagram.call.name=name;
    const updated={...original,diagram,responsibilities:Object.entries(diagram.duties).map(([i,d])=>({id:`${original.id}:${i}`,role:labels[Number(i)]??i,job:responsibilityText(d)}))};
    library[library.findIndex(c=>c.id===original.id)]=updated;fd.components[kind]=structuredClone(updated);
   }
   continue;
  } // Other plays and externally changed components retain their reviewed snapshots.
  const matches=matchingComponent(library,kind,name);
  if(matches.length>1)throw new Error(`Choose the specific saved ${kind} named ${name}; more than one matches.`);
  let c=matches[0];
  if(!c){const diagram=extractComponent(next,kind);const cid=id();diagram.call.name=name;c={id:cid,name,kind,summary:'',notes:'',source:'coach',confirmed:true,createdAt:Date.now(),status:'active',diagram,responsibilities:Object.entries(diagram.duties).map(([i,d])=>({id:`${cid}:${i}`,role:labels[Number(i)]??i,job:responsibilityText(d)}))};library.push(c);}
  fd.components[kind]=structuredClone(c);
 }
 next.defFront=fd.components.front?.name??'';next.defCoverage=fd.components.coverage?.name??'';
 return {call:next,concepts:library};
}
/** Preview first; choosing a component does not apply this merge until the coach accepts. */
export function composeComponent(call:Call,concept:Concept,labels:string[],additional=false){
 let next=structuredClone(call);const fd=next.fullDefense!;const conflicts:string[]=[];
 if(concept.diagram&&concept.diagram.structureId!==fd.structureId)throw new Error('This component uses another defensive structure. It cannot be mapped by slot number.');
 const previous=fd.components[concept.kind];
 if(!additional&&previous&&previous.id!==concept.id){
  const oldPrefix=`component:${previous.id}:`;
  const removed=next.lines.filter(x=>x.id.startsWith(oldPrefix)).length+next.zones.filter(x=>x.id.startsWith(oldPrefix)).length;
  if(removed)conflicts.push(`Replace ${removed} imported drawing objects from ${previous.name}. Coach-drawn objects remain.`);
  next.lines=next.lines.filter(x=>!x.id.startsWith(oldPrefix));next.zones=next.zones.filter(x=>!x.id.startsWith(oldPrefix));next.texts=next.texts?.filter(x=>!x.id.startsWith(oldPrefix));
 }
 const data=concept.diagram;
 if(data){
  for(const slot of data.slots){
   const pos=data.call.defOffsets[slot]??[0,0];
   if(JSON.stringify(next.defOffsets[slot]??[0,0])!==JSON.stringify(pos))conflicts.push(`${labels[slot]} alignment changes`);
   next.defOffsets[slot]=structuredClone(pos);next.defAppearance={...next.defAppearance,[slot]:{...data.call.defAppearance?.[slot],hidden:false}};
  }
  for(const [index,text] of Object.entries(data.call.assignments)){
   const slot=Number(index);if(data.duties[slot]||!text.trim())continue;
   const legacy=next.fullDefense!.legacyAssignments??={};const entry=`${concept.name}: ${text}`;
   const old=legacy[slot]??(!next.fullDefense!.duties[slot]?next.assignments[slot]:'')??'';
   legacy[slot]=old.includes(entry)?old:[old,entry].filter(Boolean).join('\n');
   next.assignments[slot]=[legacy[slot],responsibilityText(next.fullDefense!.duties[slot]??{})].filter(Boolean).join('\n');
  }
  for(const [index,d] of Object.entries(data.duties))for(const [key,value] of Object.entries(d)){
   const slot=Number(index),old=next.fullDefense!.duties[slot]?.[key as keyof Duties];
   if(old&&old!==value)conflicts.push(`${labels[slot]} ${key}: ${old} → ${value}`);
   next={...next,...setDuty(next,slot,key as keyof Duties,value)};
  }
  for(const rule of concept.responsibilities){
   const matches=labels.map((label,i)=>({label,i})).filter(x=>x.label.toLowerCase()===rule.role.toLowerCase());
   if(matches.length!==1)continue;
   const i=matches[0].i,drawn=data.call.assignments[i]??'';
   if(rule.job.trim()&&drawn.trim()!==rule.job.trim()){
    conflicts.push(`${rule.role}: current component rules differ from its saved diagram; reconcile before approval.`);
    const legacy=next.fullDefense!.legacyAssignments??={};const entry=`${concept.name} updated rule: ${rule.job}`;
    if(!legacy[i]?.includes(entry))legacy[i]=[legacy[i],entry].filter(Boolean).join('\n');
    next.assignments[i]=[legacy[i],responsibilityText(next.fullDefense!.duties[i]??{})].filter(Boolean).join('\n');
   }
  }
  const prefix=`component:${concept.id}:`;
  next.lines=[...next.lines.filter(x=>!x.id.startsWith(prefix)),...data.call.lines.map(x=>({...structuredClone(x),id:prefix+x.id}))];
  next.zones=[...next.zones.filter(x=>!x.id.startsWith(prefix)),...data.call.zones.map(x=>({...structuredClone(x),id:prefix+x.id}))];
  next.texts=[...(next.texts??[]).filter(x=>!x.id.startsWith(prefix)),...(data.call.texts??[]).map(x=>({...structuredClone(x),id:prefix+x.id}))];
  next.fullDefense!.objectCategories={...next.fullDefense!.objectCategories,...Object.fromEntries([...data.call.lines.map(x=>`line:${prefix+x.id}`),...data.call.zones.map(x=>`zone:${prefix+x.id}`),...(data.call.texts??[]).map(x=>`text:${prefix+x.id}`)].map(k=>[k,concept.kind]))};
 }else{
  // Legacy role text remains verbatim; never guess which of two corners it belongs to.
  for(const r of concept.responsibilities){const slots=labels.map((label,i)=>({label,i})).filter(x=>x.label.toLowerCase()===r.role.toLowerCase());if(slots.length!==1){conflicts.push(`Place ${r.role} rules manually: no unique position match`);continue;}const i=slots[0].i;const legacy=next.fullDefense!.legacyAssignments??={};const entry=`${concept.name}: ${r.job}`;legacy[i]=[legacy[i]??(!next.fullDefense!.duties[i]?next.assignments[i]:''),entry].filter(Boolean).join('\n');next.assignments[i]=[legacy[i],responsibilityText(next.fullDefense!.duties[i]??{})].filter(Boolean).join('\n');}
 }
 next.fullDefense!.components[concept.kind]=structuredClone(concept);next.fullDefense!.componentNames={...next.fullDefense!.componentNames,[concept.kind]:concept.name};
 if(concept.kind==='front')next.defFront=concept.name;if(concept.kind==='coverage')next.defCoverage=concept.name;
 return {call:next,conflicts};
}
export function changeWarnings(before:Call,after:Call):string[]{
 const messages:string[]=[];
 if(JSON.stringify([before.defOffsets,before.lines,before.zones,before.defAppearance])!==JSON.stringify([after.defOffsets,after.lines,after.zones,after.defAppearance]))messages.push('Drawing changed. Confirm the affected alignment, fits and coverage still match the responsibilities.');
 if(JSON.stringify(before.assignments)!==JSON.stringify(after.assignments))messages.push('Responsibilities changed. Confirm the drawing shows the intended assignment.');
 return messages;
}
export function approvalBlockers(call:Call){
 const fd=call.fullDefense;if(!fd)return ['Not a full defense'];const issues:string[]=[];
 if(!call.name.trim())issues.push('Name this defense');
 if(!fd.components.front||!fd.components.coverage)issues.push('Save a front and coverage');
 const visible=getStructure(fd.structureId).slots.map((_,i)=>i).filter(i=>!call.defAppearance?.[i]?.hidden);
 if(visible.length!==11)issues.push('Show all 11 defenders');
 if(visible.some(i=>!call.assignments[i]?.trim()))issues.push('Assign responsibilities to each defender');
 if(fd.review?.revision!==defenseRevision(call))issues.push('Check the current defense');
 return issues;
}
