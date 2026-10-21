'use client';
import {useState} from 'react';
import {useStore,type Opponent} from '@/lib/store';
import {activeObservations,validateOrganization,type ScoutObservation} from '@/lib/livingScout';
import TalkTypeInput from './TalkTypeInput';
import ScoutTagTable from './ScoutTagTable';
import TendencyImport from './TendencyImport';
import WorkspaceSaveStatus from './WorkspaceSaveStatus';

const timestamp=()=>Date.now();

export default function ScoutIntake({opponent}:{opponent:Opponent}) {
 const [open,setOpen]=useState(false),[text,setText]=useState(''),[source,setSource]=useState('Film observation'),[replaces,setReplaces]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[csv,setCsv]=useState(false);
 const save=async()=>{
  if(!text.trim()||busy)return;setBusy(true);setMessage('');
  const entry:ScoutObservation={id:crypto.randomUUID(),text:text.trim(),source:source.trim()||'Coach observation',createdAt:timestamp(),...(replaces?{replaces}:{})};
  // Persist original words first. A model failure never loses the observation.
  const state=useStore.getState(),current=state.opponents.find(o=>o.id===opponent.id);
  if(!current){setBusy(false);return;}
  state.updateOpponent(current.id,{scoutObservations:[...(current.scoutObservations??[]),entry]});
  setText('');setReplaces('');
  await organize(entry);
  setBusy(false);
 };
 const organize=async(entry:ScoutObservation)=>{
  try{
   const response=await fetch('/api/ai',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({job:'organize-scout',input:{sourceText:entry.text}}),signal:AbortSignal.timeout(60000)});
   if(!response.ok)throw new Error('unavailable');
   const result=validateOrganization((await response.json()).result,entry.text);
   const state=useStore.getState(),current=state.opponents.find(o=>o.id===opponent.id);
   if(current)state.updateOpponent(current.id,{scoutObservations:(current.scoutObservations??[]).map(e=>e.id===entry.id?{...e,organized:result}:e)});
   setMessage('Added to the cumulative scout. Original words retained.');
  }catch{setMessage('Observation retained. Automatic organization is unavailable; it appears in Key Takeaways. Retry organization when the service is connected.');}
 };
 const upload=async(file?:File)=>{
  if(!file)return;setBusy(true);setMessage('');
  try{
   if(file.size>10*1024*1024)throw new Error('Use a document under 10 MB.');
   let content='';
   if(/\.pdf$/i.test(file.name)){content=(await (await import('@/lib/pdfRoster')).pdfLines(file)).join('\n');}
   else if(/\.docx$/i.test(file.name)){const mammoth=await import('mammoth');content=(await mammoth.extractRawText({arrayBuffer:await file.arrayBuffer()})).value;}
   else if(/\.(txt|md)$/i.test(file.name))content=await file.text();
   else throw new Error('Choose PDF, Word (.docx), or text. Use Import Snaps for CSV.');
   if(!content.trim())throw new Error('No readable text found. For scanned documents, paste the observations or use a text-based report.');
   if(content.length>45000)throw new Error('This document is too long. Split it into smaller reports (45,000 characters each).');
   setText(content);setSource(file.name);setReplaces('');setMessage('Document text ready. Review, then add it to the scout.');
  }catch(e){setMessage(e instanceof Error?e.message:'Could not read document.');}finally{setBusy(false);}
 };
 return <section className="no-print mb-5 rounded-xl border border-line bg-card p-4">
  <div className="flex flex-wrap items-center gap-3"><button className="font-bold text-grass" onClick={()=>setOpen(!open)} aria-expanded={open}>Add Scout Info {open?'−':'+'}</button><button className="text-sm underline" onClick={()=>setCsv(true)}>Upload Hudl Sheet</button><span className="text-xs text-dim">One cumulative scout · observations and previous games stay saved</span></div>
  {open&&<div className="mt-4 space-y-3"><TalkTypeInput value={text} onChange={setText} label={replaces?'Correct this observation':'What did you see on film?'} disabled={busy}/><div className="flex flex-wrap gap-3 items-center"><input aria-label="Scouting source" value={source} onChange={e=>setSource(e.target.value)} placeholder="Game / source (optional)" className="rounded border border-line bg-panel px-3 py-2 text-sm"/><label className="text-sm underline cursor-pointer">Upload document<input className="sr-only" type="file" accept=".txt,.md,.pdf,.docx" disabled={busy} onChange={e=>{void upload(e.target.files?.[0]);e.target.value='';}}/></label><button disabled={busy||!text.trim()||text.length>45000} className="rounded-lg bg-grass text-white font-bold px-4 py-2 disabled:opacity-50" onClick={()=>void save()}>{busy?'Organizing…':replaces?'Save correction':'Add to Scout'}</button>{replaces&&<button onClick={()=>{setReplaces('');setText('');}}>Cancel correction</button>}</div></div>}
  {message&&<p role="status" className="text-sm mt-3">{message}</p>}
  <WorkspaceSaveStatus/>
  {!!opponent.scoutObservations?.length&&<details className="mt-2 text-xs"><summary className="cursor-pointer text-dim">Observations & source history ({opponent.scoutObservations.length})</summary>{opponent.scoutObservations.map(e=>{const active=activeObservations(opponent).some(a=>a.id===e.id);return <div key={e.id} className="border-t border-line mt-2 py-2"><p className="font-semibold">{e.source} · {new Date(e.createdAt).toLocaleDateString()}{!active?' · replaced by a correction':''}</p><p className="whitespace-pre-wrap max-h-40 overflow-auto my-1">{e.text}</p>{active&&<button disabled={busy} className="text-grass underline mr-3" onClick={()=>{setOpen(true);setText(e.text);setSource(e.source);setReplaces(e.id);}}>Correct</button>}{active&&!e.organized&&<button disabled={busy} className="underline" onClick={async()=>{setBusy(true);await organize(e);setBusy(false);}}>Retry organization</button>}</div>;})}</details>}
  {!!opponent.scoutSources?.length&&<details className="mt-2 text-xs"><summary className="cursor-pointer text-dim">Imported sheets & all tags ({opponent.scoutSources.length})</summary>{opponent.scoutSources.map(s=><details key={s.id} className="border-t border-line mt-2 pt-2"><summary className="cursor-pointer font-semibold">{s.name}{s.game?` · ${s.game}`:''}{s.sheet?` · ${s.sheet.name} · ${s.sheet.rows.length} rows`:''}</summary>{s.sheet?<ScoutTagTable sheet={s.sheet}/>:<p className="text-dim mt-2">Earlier import. Its offensive snaps and extra tags remain in the saved scouting data.</p>}</details>)}</details>}
  {csv&&<TendencyImport opponent={opponent} onClose={()=>setCsv(false)} onApply={patch=>useStore.getState().updateOpponent(opponent.id,patch)}/>}
 </section>;
}
