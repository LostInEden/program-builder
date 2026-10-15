"use client";
import { useState } from 'react';
import { useStore, type DiagramAttachment } from '@/lib/store';
import PlayCardSVG from './PlayCardSVG';
import ChatReferenceDiagram from './ChatReferenceDiagram';

export function DiagramPreviews({diagrams=[]}:{diagrams?:DiagramAttachment[]}) {
  const overrides=useStore(s=>s.overrides);
  return <div className="grid sm:grid-cols-2 gap-2">{diagrams.map(d=><figure key={d.id} className="rounded border border-line bg-white p-2 break-inside-avoid"><figcaption className="text-xs font-semibold">{d.call.name}</figcaption><div className="h-44"><PlayCardSVG call={d.call} structureId={d.structureId} overrides={overrides} defStyle="letters" preview /></div></figure>)}</div>;
}
export default function WorkflowDiagrams({diagrams=[],onChange,opponentId,context,available=[]}:{diagrams?:DiagramAttachment[];onChange:(d:DiagramAttachment[])=>void;opponentId?:string;context:string;available?:DiagramAttachment[]}) {
  const state=useStore();
  const [prompt,setPrompt]=useState('');
  const [request,setRequest]=useState('');
  const [selected,setSelected]=useState('');
  const structureId=state.groups.find(g=>g.id===state.activeGroupId)?.structureId??state.groups[0].structureId;
  const attach=(diagram:DiagramAttachment)=>onChange([...diagrams.filter(d=>d.id!==diagram.id),diagram]);
  const message={id:'workspace-diagram',role:'counterscheme' as const,text:context,ts:0,context:{opponentId}};
  return <details className="mt-3 text-sm"><summary className="cursor-pointer font-semibold text-grass">Diagrams ({diagrams.length})</summary>
    <DiagramPreviews diagrams={diagrams}/>
    {diagrams.map(d=><div key={d.id} className="no-print flex items-center gap-2 my-1"><span className="text-xs">{d.call.name}</span><ChatReferenceDiagram message={message} question={d.call.name} initialDiagram={d} onAttach={attach} compact/><button className="text-xs text-dim" onClick={()=>onChange(diagrams.filter(x=>x.id!==d.id))}>Detach</button></div>)}
    <div className="no-print mt-2 flex flex-wrap gap-2"><select aria-label="Existing diagram" value={selected} onChange={e=>setSelected(e.target.value)} className="rounded border border-line bg-white p-2 text-xs"><option value="">Choose saved diagram…</option>{state.calls.map(c=><option key={c.id} value={`call:${c.id}`}>{c.name} · {c.section}</option>)}{available.map(d=><option key={d.id} value={`attachment:${d.id}`}>{d.call.name} · opponent</option>)}</select><button className="rounded border border-line px-2 text-xs" disabled={!selected} onClick={()=>{const c=state.calls.find(c=>`call:${c.id}`===selected); const a=available.find(a=>`attachment:${a.id}`===selected); if(c||a)attach({id:crypto.randomUUID(),call:structuredClone(c??a!.call),structureId:a?.structureId??structureId});setSelected('');}}>Attach copy</button></div>
    <form className="no-print flex gap-2 mt-2" onSubmit={e=>{e.preventDefault();setRequest(prompt.trim());}}><input aria-label="Describe diagram" className="min-w-0 flex-1 rounded border border-line bg-white p-2 text-xs" value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder="Describe the concept, formation, front or coverage"/><button disabled={!prompt.trim()} className="rounded border border-line px-2 text-xs">Prepare diagram</button></form>
    {request&&<div className="no-print"><ChatReferenceDiagram key={request} message={message} question={request} onAttach={attach} contextText={context}/></div>}
    <p className="mt-1 text-xs text-dim no-print">Attachments are independent copies. Editing them does not change your saved scheme.</p>
  </details>;
}
