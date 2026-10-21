import {responsibilityLabels,type Duties} from './fullDefense';
export type OrganizedAssignment={duties:Duties;unclassified:string};
export function parseOrganizedAssignment(value:unknown):OrganizedAssignment{
 if(!value||typeof value!=='object')throw new Error('No assignment proposal returned.');
 const data=value as Record<string,unknown>,duties:Duties={};
 for(const key of Object.keys(responsibilityLabels) as (keyof Duties)[]){if(typeof data[key]!=='string'||data[key].length>3000)throw new Error('Invalid assignment proposal.');if(data[key].trim())duties[key]=data[key];}
 if(typeof data.unclassified!=='string')throw new Error('Invalid unclassified assignment text.');
 return {duties,unclassified:data.unclassified};
}
export async function defenseRequest(job:'organize-assignment'|'review-defense'|'suggest-install'|'organize-coaching-rule',input:Record<string,unknown>){
 const response=await fetch('/api/ai',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({job,input}),signal:AbortSignal.timeout(60000)});
 if(!response.ok)throw new Error('CounterScheme review is unavailable. Your drawing and assignments are unchanged; try again or edit the categories directly.');
 const body=await response.json();return body.result;
}
