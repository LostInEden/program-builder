import type { Call, Concept, ConceptKind } from './store';
export const responsibilityLabels = { alignment:'Alignment', runFit:'Run fit', coverage:'Pass coverage', pressure:'Pressure', checks:'Checks' } as const;
export type Duties = Partial<Record<keyof typeof responsibilityLabels,string>>;
export type FullDefense = {
 structureId:string;
 duties:Record<number,Duties>;
 legacyAssignments?:Record<number,string>;
 components:Partial<Record<ConceptKind,Concept>>;
 review?:{revision:string;text:string};
 approvedRevision?:string;
};
export function defenseRevision(call:Call):string {
 const copy=structuredClone(call);
 if(copy.fullDefense){delete copy.schemeConceptId;delete copy.fullDefense.review;delete copy.fullDefense.approvedRevision;}
 return JSON.stringify(copy);
}
export const approvedDefense=(call:Call)=>!!call.fullDefense?.approvedRevision&&call.fullDefense.approvedRevision===defenseRevision(call);
export const availableDefense=(call:Call)=>!call.fullDefense||approvedDefense(call);
export const matchingComponent=(concepts:Concept[],kind:ConceptKind,name:string)=>concepts.filter(c=>c.kind===kind&&c.name.trim().toLowerCase()===name.trim().toLowerCase());
export function responsibilityText(d:Duties){return Object.entries(responsibilityLabels).filter(([k])=>d[k as keyof Duties]?.trim()).map(([k,label])=>`${label}: ${d[k as keyof Duties]}`).join('\n');}
export function changedComponents(call:Call,concepts:Concept[]){return Object.values(call.fullDefense?.components??{}).filter(c=>JSON.stringify(c)!==JSON.stringify(concepts.find(x=>x.id===c.id)));}

/** Keep imported free-form assignments intact while adding categorized responsibilities. */
export function setDuty(call:Call,slot:number,key:keyof Duties,value:string):Partial<Call>{
 const fd=call.fullDefense!;
 const legacyAssignments={...fd.legacyAssignments};
 if(!fd.duties[slot]&&call.assignments[slot])legacyAssignments[slot]=call.assignments[slot];
 const duties={...fd.duties,[slot]:{...fd.duties[slot],[key]:value}};
 return {fullDefense:{...fd,duties,legacyAssignments},assignments:{...call.assignments,[slot]:[legacyAssignments[slot],responsibilityText(duties[slot])].filter(Boolean).join('\n')}};
}

/** Explicit coach action only: merge rules where the saved role has one exact match. */
export function applyComponentRules(call:Call,concept:Concept,labels:string[]):Partial<Call>{
 const fd=call.fullDefense!,legacyAssignments={...fd.legacyAssignments},assignments={...call.assignments};
 for(const rule of concept.responsibilities){
  const slots=labels.map((label,i)=>({label,i})).filter(x=>x.label.trim().toLowerCase()===rule.role.trim().toLowerCase());
  if(slots.length!==1||!rule.job.trim())continue;
  const i=slots[0].i,entry=`${concept.name}: ${rule.job}`;
  const original=legacyAssignments[i]??(!fd.duties[i]?assignments[i]:'')??'';
  legacyAssignments[i]=original.includes(entry)?original:[original,entry].filter(Boolean).join('\n');
  assignments[i]=[legacyAssignments[i],responsibilityText(fd.duties[i]??{})].filter(Boolean).join('\n');
 }
 return {assignments,fullDefense:{...fd,legacyAssignments}};
}
