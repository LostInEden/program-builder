"use client";

import {useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {useStore,useHydrated} from '@/lib/store';
import {getStructure} from '@/lib/football';
import {parseExceptions,reviewBatches,correctionPatch,concernKey,type Facts,type ExceptionResult,type Concern} from '@/lib/schemeExceptions';
import ExpandableDiagram from '@/components/ExpandableDiagram';
import {localSchemeAnalysis} from '@/lib/localSchemeAnalysis';
import SchemeTabs from '@/components/SchemeTabs';

const dismissalStorage='counterscheme-analysis-dismissals-v1';
function fingerprint(text:string){let hash=BigInt('14695981039346656037');for(let i=0;i<text.length;i++)hash=BigInt.asUintN(64,(hash^BigInt(text.charCodeAt(i)))*BigInt('1099511628211'));return hash.toString(16);}
const card='rounded-xl border border-line bg-card p-4 shadow-sm';
export default function AnalysisPage(){
 const hydrated=useHydrated();
 const {scheme,concepts,calls,players,groups,activeGroupId,overrides,updateCall}=useStore();
 const [retry,setRetry]=useState(0);
 const [review,setReview]=useState<{revision:string;result?:ExceptionResult;error?:string}|null>(null);
 const [dismissed,setDismissed]=useState<string[]>(()=>{try{const saved=JSON.parse(localStorage.getItem(dismissalStorage)??'[]');return Array.isArray(saved)?saved.filter((s:unknown)=>typeof s==='string'):[];}catch{return [];}});
 const [selected,setSelected]=useState<string|null>(null);
 const [notice,setNotice]=useState('');
 const facts=useMemo(()=>{
  const out:Facts={philosophy:JSON.stringify(scheme),personnel:JSON.stringify({players:players.map(({id,name,positions,skills,eval:grades,heightIn,weightLb,forty,vertical})=>({id,name,positions,skills,grades,heightIn,weightLb,forty,vertical})),groups,activeGroupId,overrides})};
  const stripConcept=(c:typeof concepts[number])=>({...c,diagram:undefined});
  for(const c of concepts.filter(c=>c.confirmed&&c.status!=='backPocket'))out[`concept:${c.id}`]=JSON.stringify(stripConcept(c));
  for(const c of calls){
   const fd=c.fullDefense;
   out[`call:${c.id}`]=JSON.stringify({...c,fullDefense:fd?{...fd,review:undefined,approvedRevision:undefined,warnings:undefined,components:Object.fromEntries(Object.entries(fd.components).map(([k,v])=>[k,v?stripConcept(v):v])),additionalAdjustments:fd.additionalAdjustments?.map(stripConcept)}:undefined});
  }
  out.structures=JSON.stringify([...new Set(groups.map(g=>g.structureId).concat(calls.flatMap(c=>c.fullDefense?.structureId||c.structureId||[])))].map(id=>getStructure(id)));
  return out;
 },[scheme,concepts,calls,players,groups,activeGroupId,overrides]);
 const revision=JSON.stringify(facts);
 const localResult=useMemo(()=>localSchemeAnalysis(calls),[calls]);
 useEffect(()=>{
  if(!hydrated)return;
  const controller=new AbortController();
  const timer=setTimeout(async()=>{
   try{
    const {batches,limits}=reviewBatches(facts);
    const combined:ExceptionResult={concerns:[],limits:[...limits],evaluated:[]};
    if(!batches.length)combined.limits.push('No saved defensive calls or confirmed components were available to evaluate.');
    for(const batch of batches){
     const body=JSON.stringify({job:'scheme-exceptions',input:{facts:batch}});
     const response=await fetch('/api/ai',{method:'POST',headers:{'Content-Type':'application/json'},body,signal:AbortSignal.any([controller.signal,AbortSignal.timeout(60000)])});
     if(!response.ok)throw Error('CounterScheme review is unavailable. No new conclusions have been made. Your saved scheme is unchanged.');
     const data=await response.json();
     const part=parseExceptions(data.result,batch);
     combined.concerns.push(...part.concerns);combined.limits.push(...part.limits);combined.evaluated.push(...part.evaluated);
    }
    combined.concerns.sort((a,b)=>Number(b.severity==='critical')-Number(a.severity==='critical'));
    if(!controller.signal.aborted)setReview({revision,result:combined});
   }catch(e){if(!controller.signal.aborted)setReview({revision,error:e instanceof Error?e.message:'Review failed. Try again.'});}
  },900);
  return ()=>{clearTimeout(timer);controller.abort();};
 },[hydrated,facts,revision,retry]);
 const current=review?.revision===revision?review:null;
 const result=current?.result??localResult;
 // A dismissal only applies to exactly the evidence reviewed. Changes trigger a fresh review.
 const snapshotId=useMemo(()=>fingerprint(revision),[revision]);
 const key=(c:Concern)=>snapshotId+':'+fingerprint(concernKey(c));
 function saveDismissals(next:string[]){setDismissed(next);try{localStorage.setItem(dismissalStorage,JSON.stringify(next.slice(-1000)));}catch{setNotice('Dismissed for this visit. This browser could not save the dismissal.');}}
 const visible=result?.concerns.filter(c=>!dismissed.includes(key(c)))??[];
 const dismissedCount=(result?.concerns.length??0)-visible.length;
 function apply(c:Concern){
  try{
   if(!c.correction||!result)throw Error('Reevaluate this saved defense first.');
   const live=useStore.getState().calls.find(x=>x.id===c.correction!.callId);
   if(!live)throw Error('The saved defense is no longer available.');
   updateCall(live.id,correctionPatch(live,c.correction));
   setSelected(null);setNotice('Assignment updated. Review and approve the revised defense in Full Defense.');
  }catch(e){setNotice(e instanceof Error?e.message:'Unable to apply correction.');}
 }
 if(!hydrated)return <div className="p-8 text-dim">Loading…</div>;
 return <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
  <h1 className="text-3xl font-extrabold tracking-tight">Defense Analysis</h1>
  <p className="mb-5 mt-1 text-sm text-dim">Football concerns that need your attention. Your rules. Your decisions.</p>
  <SchemeTabs active="analysis"/>
  <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm">
   <p aria-live="polite">{`${visible.filter(c=>c.severity==='critical').length} critical · ${visible.filter(c=>c.severity==='potential').length} potential`}{!current&&' · Checking saved football rules…'}</p>
   <button className="text-grass font-semibold" onClick={()=>{setReview(null);setRetry(x=>x+1);}}>Reevaluate</button>
  </div>
  {notice&&<p role="status" className="mb-3 text-sm">{notice}</p>}
  {!current?.result&&<p role="status" className="mb-4 text-sm text-dim">Local alignment checks only.{current?.error?' Full football review is not connected or could not finish. Your scheme has not been changed.':' Full football review is pending.'}</p>}
  {result&&!result.concerns.length&&<div className={card}><p>{result.evaluated.length?'No issues identified in the areas evaluated.':'No saved defensive alignments available to evaluate.'}</p>{!current?.result&&<p className="mt-2 text-sm text-dim">{result.evaluated.length?'Checked visible defender spacing and field boundaries only. Assignments and football soundness remain unverified.':'Open a saved Full Defense to draw or review its alignment. Missing information is not counted as a concern.'}</p>}<Link className="mt-3 inline-block text-sm font-semibold text-grass" href="/scheme/concepts?view=full-calls">Open Full Defense →</Link></div>}
  {result&&result.concerns.length>0&&!visible.length&&<p className={card}>All identified concerns have been dismissed for this version.</p>}
  <div className="space-y-3">{visible.map(c=>{
   const id=concernKey(c),call=c.source.startsWith('call:')?calls.find(x=>`call:${x.id}`===c.source):undefined;
   const concept=c.source.startsWith('concept:')?concepts.find(x=>`concept:${x.id}`===c.source):undefined;
   const href=call?`/scheme/concepts?view=full-calls&play=${encodeURIComponent(call.id)}`:concept?`/scheme/concepts?kind=${concept.kind}&id=${encodeURIComponent(concept.id)}`:'/scheme';
   let canApply=false;
   if(c.correction){const target=calls.find(x=>x.id===c.correction!.callId);try{if(target){correctionPatch(target,c.correction);canApply=true;}}catch{/* Invalid or stale proposals remain suggestions only. */}}
   return <section key={id} className={card}>
    <p className="mb-1 text-xs font-semibold text-dim">{c.severity==='critical'?'Critical issue':'Potential concern'} · {call?.name??concept?.name??'Defense'}</p>
    <h2 className="font-bold">{c.issue}</h2>
    <p className="mt-2 text-sm"><strong>Why:</strong> {c.why}</p>
    <p className="mt-1 text-sm"><strong>Fix:</strong> {c.fix}</p>
    <div className="mt-3 flex gap-4 text-sm font-semibold">
     <button className="text-grass" aria-expanded={selected===id} onClick={()=>setSelected(selected===id?null:id)}>Review</button>
     <Link className="text-grass" href={href}>Edit saved scheme</Link>
     <button className="text-dim" onClick={()=>saveDismissals([...dismissed,key(c)])}>Dismiss</button>
    </div>
    {selected===id&&<div className="mt-3 border-t border-line pt-3 text-sm">
     <h3 className="font-semibold">Saved evidence</h3>
     {c.evidence.map((e,i)=><blockquote key={i} className="my-2 text-dim">“{e.quote}”</blockquote>)}
     {c.diagram&&call&&<ExpandableDiagram call={call} structureId={call.fullDefense?.structureId??call.structureId??groups.find(g=>g.id===activeGroupId)?.structureId??'3-4'}/>}
     {canApply&&c.correction&&<div className="mt-3 rounded-lg bg-panel p-3"><p className="font-semibold">Proposed assignment change</p><p className="mt-1">Before: {c.correction.before}</p><p className="mt-1">After: {c.correction.after}</p><button className="mt-3 rounded-lg bg-grass px-3 py-2 text-white font-semibold" onClick={()=>apply(c)}>Apply this correction</button><p className="mt-2 text-xs text-dim">Changes only this saved play. Shared components and approved copies stay unchanged.</p></div>}
    </div>}
   </section>;
  })}</div>
  {!!dismissedCount&&<button className="mt-4 text-sm text-grass" onClick={()=>saveDismissals([])}>Restore dismissed concerns ({dismissedCount})</button>}
  {result&&<details className="mt-5 text-sm text-dim"><summary className="cursor-pointer">Evaluation coverage & limitations</summary><div className="mt-2 space-y-2">{result.evaluated.map((s,i)=><p key={`e${i}`}>Evaluated: {s}</p>)}{result.limits.map((s,i)=><p key={`l${i}`}>Not verified: {s}</p>)}</div></details>}
  <p className="mt-4 text-xs text-dim">Reevaluates when saved scheme or personnel changes. Missing information is not a concern. Unevaluated responsibilities are not verified as sound. Staff makes the final decision.</p>
 </div>;
}
