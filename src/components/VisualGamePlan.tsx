"use client";
import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {useStore,slotLabelOf,type DiagramAttachment,type Opponent} from '@/lib/store';
import {getStructure,offensivePresets} from '@/lib/football';
import {applyDefense,diagramChecks,diagramRevision,formationDraft,scoutLooks} from '@/lib/visualGamePlan';
import {opponentOverview} from '@/lib/opponentOverview';
import {ai,AI_IS_MODEL} from '@/lib/ai';
import {approvedPlan} from '@/lib/meeting';
import {productLanguage} from '@/lib/productLanguage';
import StudioCanvas,{type Selection} from './StudioCanvas';
import PlayCardSVG from './PlayCardSVG';

const control='rounded border border-line bg-panel px-2 py-1 text-xs';
export default function VisualGamePlan({opponent,diagrams,onChange}:{opponent:Opponent;diagrams:DiagramAttachment[];onChange:(d:DiagramAttachment[])=>void}) {
 const state=useStore();
 const group=state.groups.find(g=>g.id===state.activeGroupId)??state.groups[0];
 const [active,setActive]=useState<DiagramAttachment|null>(null);
 const [selection,setSelection]=useState<Selection>(null);
 const [name,setName]=useState('');
 const [preset,setPreset]=useState(Object.keys(offensivePresets)[0]);
 const [installed,setInstalled]=useState('');
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [phase,setPhase]=useState<'look'|'answer'>('look');
 const dialog=useRef<HTMLDivElement>(null);
 const open=!!active;
 useEffect(()=>{
  if(!open)return;
  const focus=document.activeElement as HTMLElement,overflow=document.body.style.overflow;
  document.body.style.overflow='hidden';dialog.current?.focus();
  return()=>{document.body.style.overflow=overflow;focus?.focus();};
 },[open]);
 function begin(d:DiagramAttachment){setActive(structuredClone(d));setPhase(d.visual?'answer':'look');setSelection(null);setInstalled('');setError('');}
 function start(label:string,source:string,diagram?:DiagramAttachment){
  if(diagram){begin({...structuredClone(diagram),id:crypto.randomUUID(),visual:{opponentLook:structuredClone(diagram.call),source,confirmed:false}});return;}
  const matched=Object.keys(offensivePresets).find(p=>p.replace(/\s*\([^)]*\)/g,'').toLowerCase()===label.toLowerCase());
  const chosen=matched??preset;
  const call=formationDraft(label,chosen,group.structureId);
  begin({id:crypto.randomUUID(),call,structureId:group.structureId});setPhase('look');setError(`${source}. Starting from ${chosen}, a conventional template—not verified opponent geometry. Adjust the look before drawing the answer.`);
 }
 function patch(p:Partial<DiagramAttachment['call']>){setActive(d=>d?{...d,call:{...d.call,...p},visual:d.visual?{...d.visual,confirmed:false,review:undefined}:undefined}:null);}
 async function check(){
  if(!active?.visual)return;
  const snapshot=structuredClone(active),revision=diagramRevision(snapshot.call);
  const local=diagramChecks(snapshot.call,snapshot.structureId).join('\n');
  setBusy(true);setError('');
  let text=local,kind:'limited'|'counterscheme'='limited';
  try {
   if(AI_IS_MODEL){
    const s=useStore.getState();
    const r=await ai.chat(`Review this defensive drawing against the opponent look. Treat every assignment as unvalidated. Briefly list alignment concerns, run-fit/coverage unknowns, personnel fit and improvements using only the saved scheme. Do not infer responsibilities from position alone or certify soundness. State missing evidence. Drawing coordinates use offense attacking down-screen.\n${JSON.stringify({drawing:snapshot.call,opponentLook:snapshot.visual!.opponentLook,structure:getStructure(snapshot.structureId),checks:local})}`,{...s,opponent,plan:approvedPlan(s.gamePlans.find(p=>p.opponentId===opponent.id)),page:'/gameplan'});
    text=`${local}\n\nCounterScheme suggestions (coach review required):\n${productLanguage(r.reply.text)}${r.reply.deeper?'\n'+productLanguage(r.reply.deeper):''}`;kind='counterscheme';
   }
   setActive(d=>d&&d.id===snapshot.id&&diagramRevision(d.call)===revision?{...d,visual:{...d.visual!,confirmed:false,review:{revision,text,kind}}}:d);
  }catch{setError('CounterScheme review is unavailable. Limited drawing checks are shown; review with your staff.');setActive(d=>d&&d.id===snapshot.id&&diagramRevision(d.call)===revision?{...d,visual:{...d.visual!,confirmed:false,review:{revision,text:local,kind:'limited'}}}:d);}
  finally{setBusy(false);}
 }
 function attach(){if(!active?.visual)return;onChange([...diagrams.filter(d=>d.id!==active.id),structuredClone(active)]);setActive(null);}
 const looks=scoutLooks(opponent),overview=opponentOverview(opponent);
 return <section className="mt-3 rounded-lg border border-line p-3">
  <h3 className="font-bold">Draw our defensive answer</h3>
  <p className="text-xs text-dim mt-1">Opponent look → draw → check → coach approval. {overview.personnel?`Top personnel: ${overview.personnel.group} (${overview.personnel.pct}%).`:''}</p>
  <div className="mt-2 flex flex-wrap gap-2"><select aria-label="Starting formation template" className={control} value={preset} onChange={e=>setPreset(e.target.value)}>{Object.keys(offensivePresets).map(p=><option key={p}>{p}</option>)}</select><span className="text-xs text-dim">Template only; confirm against your scout.</span></div>
  <div className="mt-2 grid sm:grid-cols-2 gap-2">{looks.map(l=><div key={l.key} className="rounded border border-line p-2"><p className="font-semibold text-sm">{l.name}</p><p className="text-xs text-dim">{l.evidence}</p>{l.diagram?<div className="h-32"><PlayCardSVG call={l.diagram.call} structureId={l.diagram.structureId} overrides={state.overrides} defStyle="letters" preview/></div>:<p className="my-2 text-xs text-dim">No verified drawing attached. Set the opponent alignment and play before adding defense.</p>}<button className={`${control} mt-1 text-grass`} onClick={()=>start(l.name,l.evidence,l.diagram)}>{l.diagram?'Draw our answer':'Set up opponent look'}</button></div>)}</div>
  <form className="flex gap-2 mt-2" onSubmit={e=>{e.preventDefault();if(name.trim())start(name.trim(),'Coach-added look');}}><input aria-label="Manual opponent look" placeholder="Add a formation or play" className={`${control} min-w-0 flex-1`} value={name} onChange={e=>setName(e.target.value)}/><button className={control} disabled={!name.trim()}>Add look</button></form>
  {diagrams.filter(d=>d.visual).map(d=><div key={d.id} className="mt-2 border-t border-line pt-2"><p className="text-sm font-semibold">{d.call.name}</p><div className="h-36"><PlayCardSVG call={d.call} structureId={d.structureId} overrides={state.overrides} defStyle="letters" preview/></div><p className="text-xs text-dim">{d.visual?.confirmed?'Reviewed by coach · pending plan approval':'Draft · review required'}</p><button className={`${control} mt-1`} onClick={()=>begin(d)}>Edit / check answer</button></div>)}
  {active&&createPortal(<div ref={dialog} role="dialog" aria-modal="true" aria-label="Visual defensive answer" tabIndex={-1} className="fixed inset-0 z-[90] flex flex-col bg-pitch p-2 outline-none" onKeyDown={e=>{
   if(e.key==='Escape'&&!busy){e.stopPropagation();setActive(null);}
   if(e.key==='Tab'){const els=[...e.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled),input,textarea,select,[tabindex="0"]')].filter(x=>x.getClientRects().length),first=els[0],last=els.at(-1);if(e.shiftKey&&(document.activeElement===first||document.activeElement===dialog.current)){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}
  }}>
   <div className="flex flex-wrap items-center gap-2 rounded border border-line bg-card p-2"><strong className="mr-auto text-sm">{active.call.name} · {phase==='look'?'Confirm opponent look':'Defensive answer'}</strong><button className={control} disabled={busy} onClick={()=>setActive(null)}>Cancel edits</button>{phase==='look'?<button className={`${control} bg-grass`} onClick={()=>{setActive(d=>d?{...d,visual:{opponentLook:structuredClone(d.call),source:'Coach-reviewed opponent look; verify against film',confirmed:false}}:d);setPhase('answer');setError('');}}>Use this opponent look</button>:<><button className={control} disabled={busy} onClick={()=>void check()}>{busy?'Checking…':'Check defense'}</button><button className={`${control} bg-grass`} disabled={busy} onClick={attach}>Save to plan draft</button></>}</div>
   {phase==='answer'&&<div className="flex flex-wrap items-center gap-2 py-2"><select aria-label="Installed defensive call" className={control} value={installed} onChange={e=>setInstalled(e.target.value)}><option value="">Choose saved defensive call…</option>{state.calls.map(c=><option key={c.id} value={c.id}>{c.name} · {c.section}</option>)}</select><button className={control} disabled={!installed||busy||active.structureId!==group.structureId} onClick={()=>{const c=state.calls.find(c=>c.id===installed);if(c){patch(applyDefense(active.call,c));setError('Copied saved defensive alignment and anchored assignments. Confirm this call uses the same defensive structure. Unanchored lines and offensive paths are not imported.');}}}>Apply defense</button><button className={control} disabled={busy} onClick={()=>patch({defAppearance:{}})}>Show base defenders</button><input aria-label="Defensive coverage" placeholder="Coverage" className={control} value={active.call.defCoverage??''} onChange={e=>patch({defCoverage:e.target.value})}/><input aria-label="Coaching note" placeholder="Coaching note" className={`${control} flex-1`} value={active.call.notes} onChange={e=>patch({notes:e.target.value})}/></div>}
   {phase==='answer'&&selection?.kind==='def'&&<label className="flex items-center gap-2 text-xs pb-1">Responsibility for {slotLabelOf(state.overrides,active.structureId,selection.slot)}<input className={`${control} flex-1`} value={active.call.assignments[selection.slot]??''} onChange={e=>{if(selection?.kind==='def')patch({assignments:{...active.call.assignments,[selection.slot]:e.target.value}});}} placeholder="Run fit / coverage responsibility"/></label>}
   {error&&<p role="status" className="text-xs text-dim py-1">{error}</p>}
   {active.visual?.review&&<details open className="rounded border border-line bg-card p-2 text-xs shrink-0"><summary className="font-semibold">{active.visual.review.kind==='limited'?'Limited drawing checks · football review still needed':'CounterScheme review · suggestions only'}</summary><p className="max-h-24 overflow-auto whitespace-pre-wrap mt-1">{active.visual.review.text}</p><label className="flex gap-2 mt-2"><input type="checkbox" checked={active.visual.confirmed} onChange={e=>setActive(d=>d?{...d,visual:{...d.visual!,confirmed:e.target.checked}}:d)}/>I reviewed the opponent look, assignments, personnel fit and concerns with our staff.</label></details>}
   <div className={`flex flex-1 min-h-0 ${busy?'pointer-events-none opacity-60':''}`}><StudioCanvas key={active.id} call={active.call} structureId={active.structureId} groupSlots={{}} players={state.players} labelFor={i=>slotLabelOf(state.overrides,active.structureId,i)} selection={selection} onSelect={setSelection} onUpdate={(_,p)=>patch(p)}/></div>
  </div>,document.body)}
 </section>;
}
