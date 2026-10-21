import type {Call} from './store';
import {defenseRevision,responsibilityLabels,setDuty,type Duties} from './fullDefense';
export type CoachingRule={id:string;text:string;scope:'general'|'call';callId?:string;role?:string;duties?:Duties};
export type AssignmentSuggestion={slot:number;duties:Duties;why:string;ruleIds:string[]};
export type InstallProposal={assignments:AssignmentSuggestion[];unknowns:string[]};
export function applicableRules(rules:CoachingRule[],callId:string){return rules.filter(r=>r.scope==='general'||r.callId===callId);}
export function parseInstallProposal(raw:unknown,labels:string[],rules:CoachingRule[]):InstallProposal{
 const r=raw as InstallProposal;
 if(!r||!Array.isArray(r.assignments)||!Array.isArray(r.unknowns))throw Error('Assignment suggestions were incomplete.');
 const allowed=new Set(rules.map(r=>r.id));
 const assignments=r.assignments.map(a=>{
  if(!a||!Number.isInteger(a.slot)||!labels[a.slot]||typeof a.why!=='string'||!Array.isArray(a.ruleIds)||!a.ruleIds.length||a.ruleIds.some(id=>!allowed.has(id)))throw Error('A suggestion could not be traced to your confirmed rules.');
  const duties:Duties={};
  for(const [key,value]of Object.entries(a.duties??{})){
   if(!(key in responsibilityLabels)||typeof value!=='string'||value.length>3000)throw Error('Invalid responsibility suggestion.');
   if(value.trim())duties[key as keyof Duties]=value;
  }
  return {...a,duties};
 });
 if(new Set(assignments.map(a=>a.slot)).size!==assignments.length)throw Error('Duplicate player suggestions need another review.');
 return {assignments:assignments.filter(a=>Object.keys(a.duties).length),unknowns:r.unknowns.filter(s=>typeof s==='string')};
}
export function exactRuleSuggestions(rules:CoachingRule[],call:Call,labels:string[]):InstallProposal{
 const assignments:AssignmentSuggestion[]=[];
 for(let slot=0;slot<labels.length;slot++){
  if(call.defAppearance?.[slot]?.hidden)continue;
  const matches=applicableRules(rules,call.id).filter(r=>r.role===labels[slot]&&r.duties&&labels.filter(l=>l===r.role).length===1);
  const duties:Duties={};const conflicts=new Set<string>();
  for(const r of matches)for(const [k,v]of Object.entries(r.duties!)){if(duties[k as keyof Duties]&&duties[k as keyof Duties]!==v)conflicts.add(k);else duties[k as keyof Duties]=v;}
  for(const k of conflicts)delete duties[k as keyof Duties];
  if(Object.keys(duties).length)assignments.push({slot,duties,why:'Exact saved player rule. Confirm it fits this look; the drawing has not been interpreted offline.',ruleIds:matches.map(r=>r.id)});
 }
 return {assignments,unknowns:['Connected drawing interpretation is unavailable. Only exact, unambiguous saved player rules are offered; conflicting rules are left for the coach.']};
}
export function acceptSuggestion(call:Call,revision:string,suggestion:AssignmentSuggestion):Call{
 if(defenseRevision(call)!==revision)throw Error('The drawing or assignments changed. Request fresh suggestions before applying.');
 let next=structuredClone(call);
 for(const [k,v]of Object.entries(suggestion.duties))next={...next,...setDuty(next,suggestion.slot,k as keyof Duties,v)};
 return next;
}
export function addConfirmedRule(rules:CoachingRule[],rule:CoachingRule){
 return rules.some(r=>r.text.trim().toLowerCase()===rule.text.trim().toLowerCase()&&r.scope===rule.scope&&r.callId===rule.callId&&r.role===rule.role&&JSON.stringify(r.duties)===JSON.stringify(rule.duties))?rules:[...rules,rule];
}
