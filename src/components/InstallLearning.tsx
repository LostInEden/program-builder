"use client";
import {useState} from 'react';
import {useStore,type Call} from '@/lib/store';
import {defenseRevision,responsibilityLabels,responsibilityText,type Duties} from '@/lib/fullDefense';
import {getStructure,defenseCanvasY,LOS_Y,FIELD_H} from '@/lib/football';
import {defenseRequest} from '@/lib/defenseAssistant';
import {applicableRules,parseInstallProposal,exactRuleSuggestions,acceptSuggestion,addConfirmedRule,type InstallProposal} from '@/lib/installLearning';
import TalkTypeInput from './TalkTypeInput';
const button='rounded-lg border border-line px-3 py-2 text-sm font-semibold disabled:opacity-50';

export function TeachBaseRules({call,role,duties}:{call?:Call;role?:string;duties?:Duties}){
 const {scheme,setScheme}=useStore();
 const [text,setText]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const [proposal,setProposal]=useState<{text:string;scope:'general'|'call';why:string;duties?:Duties}|null>(null);
 const words=text.trim()||(role&&duties?`${role}: ${responsibilityText(duties)}`:'');
 async function organize(){
  setBusy(true);setMessage('');
  const captured=!text.trim()&&duties?structuredClone(duties):undefined;
  try{
   const r=await defenseRequest('organize-coaching-rule',{coachWords:words,call:call?{id:call.id,name:call.name}:null,correction:role?{role,duties:captured}:null});
   if(!r||typeof r.text!=='string'||!r.text.trim()||!['general','call'].includes(r.scope)||typeof r.why!=='string')throw Error('Invalid rule proposal.');
   setProposal({...r,scope:call?r.scope:'general',duties:captured});
  }catch{setProposal({text:words,scope:call?'call':'general',why:'Connected organization unavailable. These are your exact words; choose their scope before confirming.',duties:captured});}
  finally{setBusy(false);}
 }
 return <details className="rounded-lg border border-line bg-card p-3"><summary className="cursor-pointer font-semibold text-sm">{role?'Remember this correction':'Teach base philosophy'}</summary>
  <p className="mt-2 text-xs text-dim">Short rules for run fits, alignments, coverage, pressures and checks. Confirmed rules inform future suggestions; they never rewrite saved installs.</p>
  <TalkTypeInput label={role?`${role}: correction or rule`:'Tell CounterScheme your defensive rule'} value={text} disabled={busy} onChange={v=>{setText(v);setProposal(null);}}/>
  <button className={`${button} mt-2`} disabled={busy||!words} onClick={()=>void organize()}>{busy?'Organizing…':'Review rule'}</button>
  {proposal&&<div className="mt-3 space-y-2 text-sm"><label className="block">Proposed rule<textarea className="mt-1 w-full rounded border border-line bg-panel p-2" value={proposal.text} onChange={e=>setProposal({...proposal,text:e.target.value,duties:undefined})}/></label><p className="text-xs text-dim">{proposal.why}</p><label className="block">Use this rule for<select aria-label="Rule scope" className="ml-2 rounded border border-line bg-panel p-2" value={proposal.scope} onChange={e=>setProposal({...proposal,scope:e.target.value as 'general'|'call'})}><option value="general">Future installs — base philosophy</option>{call&&<option value="call">Only this install</option>}</select></label>
   <button className={`${button} bg-grass text-white`} disabled={!proposal.text.trim()} onClick={()=>{
    const live=useStore.getState().scheme;
    const rule={id:crypto.randomUUID(),text:proposal.text,scope:proposal.scope,callId:proposal.scope==='call'?call?.id:undefined,role,duties:proposal.duties};
    setScheme({coachingRules:addConfirmedRule(live.coachingRules??[],rule)});setProposal(null);setText('');setMessage('Rule confirmed. Existing installs are unchanged.');
   }}>Confirm rule & scope</button></div>}
  {message&&<p role="status" className="mt-2 text-xs">{message}</p>}
  <details className="mt-3 text-xs"><summary>Confirmed rules ({(scheme.coachingRules??[]).length})</summary>{(scheme.coachingRules??[]).map(r=><p key={r.id} className="mt-2"><strong>{r.scope==='general'?'Base rule':'Install exception'}:</strong> {r.text}</p>)}</details>
 </details>;
}

export function InstallSuggestions({call,labels,onApply,onSelect}:{call:Call;labels:string[];onApply:(c:Call)=>void;onSelect:(slot:number)=>void}){
 const state=useStore();
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const [proposal,setProposal]=useState<{revision:string;rulesRevision:string;result:InstallProposal}|null>(null);
 const rules=applicableRules(state.scheme.coachingRules??[],call.id),rulesRevision=JSON.stringify(rules);
 const revision=defenseRevision(call);
 const stale=!!proposal&&(proposal.revision!==revision||proposal.rulesRevision!==rulesRevision);
 async function suggest(){
  setBusy(true);setMessage('');const snapshot=structuredClone(call);
  let result:InstallProposal;
  try{
   const structure=getStructure(call.fullDefense!.structureId);
   const play={...snapshot,fullDefense:{...snapshot.fullDefense,review:undefined,approvedRevision:undefined,components:Object.fromEntries(Object.entries(snapshot.fullDefense!.components).map(([k,c])=>[k,{...c,diagram:undefined}])),additionalAdjustments:snapshot.fullDefense!.additionalAdjustments?.map(c=>({...c,diagram:undefined}))}};
   const input={play,coachingRules:rules,philosophy:state.scheme,terminology:state.termMap,labels,coordinateSystem:{width:100,height:FIELD_H,lineOfScrimmage:LOS_Y,offenseAttacks:'increasing y',widthYards:53.33},defenders:structure.slots.map((s,slot)=>({slot,label:labels[slot],x:s.x+(call.defOffsets[slot]?.[0]??0),y:defenseCanvasY(s.y)+(call.defOffsets[slot]?.[1]??0),hidden:!!call.defAppearance?.[slot]?.hidden}))};
   result=parseInstallProposal(await defenseRequest('suggest-install',input),labels,rules);
   result.assignments=result.assignments.filter(a=>!call.defAppearance?.[a.slot]?.hidden);
  }catch{result=exactRuleSuggestions(rules,snapshot,labels);}
  setProposal({revision:defenseRevision(snapshot),rulesRevision,result});setBusy(false);
 }
 return <details className="rounded-lg border border-line p-3" open><summary className="font-semibold text-sm cursor-pointer">Suggest responsibilities</summary>
  <p className="mt-2 text-xs text-dim">Uses confirmed rules and this drawing. Review each player before applying.</p>
  <button className={`${button} mt-2`} disabled={busy||!rules.length} onClick={()=>void suggest()}>{busy?'Reading drawing…':'Suggest from my rules'}</button>
  {!rules.length&&<p className="mt-2 text-xs text-dim">Confirm a base rule first using Teach base philosophy.</p>}
  {stale&&<p className="mt-2 text-xs">Drawing, assignments or rules changed. Request fresh suggestions.</p>}
  {proposal&&!stale&&<div className="space-y-3 mt-3">{!proposal.result.assignments.length&&<p className="text-xs">No responsibilities could be confidently suggested from the available rules.</p>}{proposal.result.assignments.map(a=><div key={a.slot} className="border-t border-line pt-2 text-xs"><button className="font-bold text-grass" onClick={()=>onSelect(a.slot)}>{labels[a.slot]} · select player</button><p className="mt-1">{a.why}</p>{Object.entries(a.duties).map(([k,v])=><p className="mt-1" key={k}><strong>{responsibilityLabels[k as keyof Duties]}:</strong> {v}{call.fullDefense?.duties[a.slot]?.[k as keyof Duties]&&<span className="block text-dim">Current: {call.fullDefense.duties[a.slot][k as keyof Duties]}</span>}</p>)}<p className="mt-1 text-dim">Based on: {a.ruleIds.map(id=>rules.find(r=>r.id===id)?.text).join(' · ')}</p><button className={`${button} mt-2`} onClick={()=>{
    try{const next=acceptSuggestion(call,proposal.revision,a);onApply(next);setProposal({...proposal,revision:defenseRevision(next),result:{...proposal.result,assignments:proposal.result.assignments.filter(x=>x.slot!==a.slot)}});setMessage('Applied to this draft only. Review and save the install.');}catch(e){setMessage(e instanceof Error?e.message:'Please review again.');}
   }}>Accept for {labels[a.slot]}</button></div>)}{!!proposal.result.unknowns.length&&<details className="text-xs"><summary>Not determined — not concerns</summary>{proposal.result.unknowns.map((u,i)=><p className="mt-1" key={i}>{u}</p>)}</details>}</div>}
  {message&&<p role="status" className="mt-2 text-xs">{message}</p>}
 </details>;
}
