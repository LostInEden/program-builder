"use client";
import {useState} from 'react';
import Link from 'next/link';
import {practiceFromDecision} from '@/lib/coachingWorkflow';
import {useStore,type MeetingDecision} from '@/lib/store';

export default function DecisionPracticeAction({decision,opponentId}:{decision:MeetingDecision;opponentId:string}){
 const [open,setOpen]=useState(false),[play,setPlay]=useState(''),[formation,setFormation]=useState(''),[situation,setSituation]=useState('');
 const selection=useStore(s=>s.practice[opponentId]);
 const existing=selection?.manual?.some(r=>r.decisionId===decision.id);
 const save=()=>{
  const s=useStore.getState(),current=s.practice[opponentId];
  const patch=practiceFromDecision(current,s.gamePlans.find(p=>p.opponentId===opponentId),decision.id,{id:`manual:${crypto.randomUUID()}`,play,formation,situation});
  if(patch)s.updatePractice(opponentId,patch);
  setOpen(false);
 };
 return <div className="no-print mt-3 text-sm">{existing?<Link className="font-semibold text-grass" href={`/practice?id=${encodeURIComponent(opponentId)}`}>Open linked practice look →</Link>:<button className="font-semibold text-grass" onClick={()=>setOpen(!open)} aria-expanded={open}>Add to practice →</button>}
 {open&&!existing&&<form className="mt-2 space-y-2 rounded-lg border border-line p-3" onSubmit={e=>{e.preventDefault();save();}}><p className="text-xs text-dim">Your approved answer and attached diagrams carry forward. Name the offensive look you want to rep.</p>{[['Opponent play / look',play,setPlay],['Formation',formation,setFormation],['Situation',situation,setSituation]].map(([label,value,set])=><label className="block text-xs" key={label as string}>{label as string}<input className="mt-1 w-full rounded border border-line bg-white p-2" value={value as string} onChange={e=>(set as (v:string)=>void)(e.target.value)} required={label==='Opponent play / look'}/></label>)}<button className="rounded bg-grass px-3 py-2 text-white" disabled={!play.trim()}>Save practice look</button></form>}
 </div>;
}
