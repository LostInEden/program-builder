import type {Call} from './store';
import {setDuty, type Duties} from './fullDefense';
export type Evidence={source:string;quote:string};
export type Correction={callId:string;slot:number;field:keyof Duties;before:string;after:string};
export type Concern={severity:'critical'|'potential';issue:string;why:string;fix:string;source:string;evidence:Evidence[];diagram:boolean;correction:Correction|null};
export type ExceptionResult={concerns:Concern[];limits:string[];evaluated:string[]};
export type Facts=Record<string,string>;
/** Reject unsupported citations and edits. Model output never writes storage. */
export function parseExceptions(raw:unknown,facts:Facts):ExceptionResult{
 const r=raw as ExceptionResult;
 if(!r||!Array.isArray(r.concerns)||!Array.isArray(r.limits)||!Array.isArray(r.evaluated))throw Error('Invalid review response.');
 const concerns=r.concerns.filter(c=>c&&['critical','potential'].includes(c.severity)&&[c.issue,c.why,c.fix].every(s=>typeof s==='string'&&s.trim())&&facts[c.source]&&Array.isArray(c.evidence)&&c.evidence.some(e=>e.source===c.source)&&c.evidence.every(e=>typeof e.quote==='string'&&e.quote.trim().length>=8&&facts[e.source]?.includes(e.quote)));
 for(const c of concerns){
  const patch=c.correction;
  if(patch&&(!c.evidence.some(e=>e.source===`call:${patch.callId}`&&typeof patch.before==='string'&&e.quote.includes(patch.before))||!patch.before?.trim()))c.correction=null;
 }
 return {concerns:concerns.sort((a,b)=>Number(b.severity==='critical')-Number(a.severity==='critical')),limits:[...r.limits.filter(s=>typeof s==='string'),...(concerns.length<r.concerns.length?['Some returned findings lacked matching saved evidence and were excluded.']:[])],evaluated:r.evaluated.filter(s=>typeof s==='string')};
}
export function correctionPatch(call:Call,change:Correction):Partial<Call>{
 if(call.id!==change.callId||!call.fullDefense||!Number.isInteger(change.slot)||change.slot<0||change.slot>10||!['alignment','runFit','coverage','pressure','checks'].includes(change.field)||typeof change.after!=='string'||!change.after.trim()||change.after.length>3000||call.fullDefense.duties[change.slot]?.[change.field]!==change.before)throw Error('This assignment changed or cannot be safely edited here. Reevaluate or open the saved defense.');
 return setDuty(call,change.slot,change.field,change.after);
}
export function concernKey(c:Concern){return JSON.stringify([c.source,c.severity,c.evidence]);}

/** Small independent requests preserve complete plays; never truncate assignments. */
export function reviewBatches(facts:Facts,max=65000):{batches:Facts[];limits:string[]}{
 const context:Facts={};
 for(const key of ['philosophy','personnel','structures'])if(facts[key])context[key]=facts[key];
 const batches:Facts[]=[],limits:string[]=[];
 let batch={...context};
 for(const [key,value] of Object.entries(facts).filter(([k])=>!Object.hasOwn(context,k))){
  if(JSON.stringify({...context,[key]:value}).length>max){limits.push(`${key}: saved information exceeds the review size limit; this item was not evaluated.`);continue;}
  if(JSON.stringify({...batch,[key]:value}).length>max){batches.push(batch);batch={...context};}
  batch[key]=value;
 }
 if(Object.keys(batch).length>Object.keys(context).length)batches.push(batch);
 return {batches,limits};
}
