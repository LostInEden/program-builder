'use client';
import {useState} from 'react';
import {createPortal} from 'react-dom';
import {useStore,slotLabelOf,type Opponent,type DiagramAttachment} from '@/lib/store';
import {offensivePresets} from '@/lib/football';
import {formationDraft} from '@/lib/visualGamePlan';
import ExpandableDiagram from './ExpandableDiagram';
import StudioCanvas,{type Selection} from './StudioCanvas';

const key=(s:string)=>s.trim().toLowerCase().replace(/\s+/g,' ');
const presetKey=(s:string)=>key(s.replace(/\s*\([^)]*\)/g,''));
const percent=(n:number|null|undefined)=>n==null?'Not recorded':`${Math.round(n)}%`;
export default function ScoutFormations({opponent:o}:{opponent:Opponent}) {
 const state=useStore();
 const structureId=(state.groups.find(g=>g.id===state.activeGroupId)??state.groups[0]).structureId;
 const [editing,setEditing]=useState<DiagramAttachment|null>(null);
 const [selection,setSelection]=useState<Selection>(null);
 const plays=o.plays??[];
 const counted=(field:'formation'|'personnel')=>{
  const groups=new Map<string,{name:string;n:number}>();
  for(const p of plays){const name=p[field].trim();if(!name)continue;const old=groups.get(key(name));groups.set(key(name),{name:old?.name??name,n:(old?.n??0)+1});}
  const total=[...groups.values()].reduce((sum,g)=>sum+g.n,0);
  return {total,rows:[...groups.values()].sort((a,b)=>b.n-a.n).map(g=>({...g,pct:100*g.n/total}))};
 };
 const forms=counted('formation'),personnel=counted('personnel');
 const rows=forms.total?forms.rows:o.formations.map(f=>({name:f.name,pct:f.snapsPct,n:null})).sort((a,b)=>(b.pct??-1)-(a.pct??-1));
 const groups=personnel.total?personnel.rows:o.personnelUsage.map(p=>({name:p.group,pct:p.pct,n:null}));
 const [all,setAll]=useState(false);
 const shown=all?rows:rows.slice(0,3);
 const begin=(d:DiagramAttachment)=>{setSelection(null);setEditing(structuredClone(d));};
 const save=()=>{
  if(!editing)return;
  const current=useStore.getState().opponents.find(p=>p.id===o.id);
  if(!current)return;
  state.updateOpponent(o.id,{diagrams:[...(current.diagrams??[]).filter(d=>d.id!==editing.id),editing]});
  setEditing(null);
 };
 return <div className="my-4">
  <h3 className="font-semibold text-sm">Personnel usage</h3>
  {groups.length?<ul className="flex flex-wrap gap-x-6 gap-y-2 my-2 text-sm">{groups.map(g=><li key={g.name}><strong>{g.name}</strong> · {percent(g.pct)}{g.n!=null&&<span className="text-dim"> · {g.n} snaps</span>}</li>)}</ul>:<p className="text-sm text-dim my-2">Personnel percentages not recorded.</p>}
  <p className="text-xs text-dim mb-4">{personnel.total?`Personnel shares use ${personnel.total} tagged snaps; ${plays.length-personnel.total} untagged excluded.`:'Personnel percentages use recorded scouting information.'} {forms.total?`Formation shares use ${forms.total} tagged snaps; ${plays.length-forms.total} untagged excluded.`:'Formation percentages use recorded scouting information.'}</p>
  <div className="grid md:grid-cols-3 gap-4">{shown.map(f=>{
   const saved=o.diagrams?.find(d=>key(d.call.offForm)===key(f.name)||key(d.call.name)===key(f.name));
   const template=Object.keys(state.formationTemplates).find(n=>key(n)===key(f.name));
   const preset=Object.keys(offensivePresets).find(n=>presetKey(n)===presetKey(f.name));
   const call=saved?.call??(template||preset?{...formationDraft(f.name,preset??'',structureId),offForm:f.name,...(template?{offLook:state.formationTemplates[template]}:{})}:null);
   const sid=saved?.structureId??structureId;
   const formationSnaps=plays.filter(p=>key(p.formation)===key(f.name));
   const taggedPersonnel=formationSnaps.filter(p=>p.personnel.trim());
   const breakdown=new Map<string,{name:string;n:number}>();
   for(const p of taggedPersonnel){const k=key(p.personnel),g=breakdown.get(k);breakdown.set(k,{name:g?.name??p.personnel,n:(g?.n??0)+1});}
   const draft=(chosen:string):DiagramAttachment=>({id:crypto.randomUUID(),structureId,call:{...formationDraft(f.name,chosen,structureId),offForm:f.name}});
   return <figure key={f.name} className="min-w-0 break-inside-avoid">
    <figcaption className="mb-2 text-sm"><strong>{f.name}</strong> · {percent(f.pct)}{f.n!=null&&<span className="text-dim"> · {f.n} snaps</span>}<span className="block text-xs text-dim">{saved?'Saved opponent drawing':template?'Saved formation template':preset?'Standard reference · verify against film':''}</span></figcaption>
    {taggedPersonnel.length>0&&<p className="text-xs text-dim mb-2">Personnel: {[...breakdown.values()].sort((a,b)=>b.n-a.n).map(g=>`${g.name} · ${percent(100*g.n/taggedPersonnel.length)}`).join(' / ')} ({taggedPersonnel.length} personnel-tagged snaps in this formation)</p>}
    {call?<><ExpandableDiagram call={call} structureId={sid}/><p className="text-xs text-dim mt-1">{saved?'Saved opponent drawing':template?'Saved formation template':'Standard reference · verify against film'}</p><button className="no-print text-xs text-grass underline mt-1" onClick={()=>begin(saved??{id:crypto.randomUUID(),structureId:sid,call})}>Edit opponent alignment</button></>:<div className="py-4 text-sm text-dim"><p>No matched drawing yet.</p><select aria-label={`Starting drawing for ${f.name}`} className="no-print mt-2 max-w-full rounded border border-line bg-panel p-2 text-xs" value="" onChange={e=>{if(e.target.value)begin(draft(e.target.value));}}><option value="">Choose a starting formation…</option>{Object.keys(offensivePresets).map(p=><option key={p}>{p}</option>)}</select></div>}
   </figure>;
  })}</div>
  {!rows.length&&<p className="text-sm text-dim">Formation information not recorded.</p>}
  {rows.length>3&&<button className="no-print text-xs text-grass underline mt-3" onClick={()=>setAll(!all)}>{all?'Show top three formations':`Show all ${rows.length} formations`}</button>}
  {editing&&createPortal(<div role="dialog" aria-modal="true" aria-label="Edit opponent formation" className="fixed inset-0 z-[100] bg-panel text-ink flex flex-col p-3">
   <div className="flex flex-wrap gap-3 items-center pb-3"><strong className="mr-auto">{editing.call.name}</strong><button className="rounded border border-line px-3 py-2 text-sm" onClick={()=>setEditing(null)}>Cancel</button><button className="rounded bg-grass text-white px-3 py-2 text-sm" onClick={save}>Save opponent drawing</button></div>
   <div className="flex flex-1 min-h-0"><StudioCanvas key={editing.id} call={editing.call} structureId={editing.structureId} groupSlots={{}} players={state.players} labelFor={i=>slotLabelOf(state.overrides,editing.structureId,i)} selection={selection} onSelect={setSelection} onUpdate={(_,patch)=>setEditing(d=>d?{...d,call:{...d.call,...patch}}:d)}/></div>
  </div>,document.body)}
 </div>;
}
