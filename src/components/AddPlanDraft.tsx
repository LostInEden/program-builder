"use client";
import {useState} from 'react';
import Link from 'next/link';
import {useStore,type ChatMessage} from '@/lib/store';
import {blankAnswer} from '@/lib/meeting';
import {initializeMeeting} from '@/lib/coachingWorkflow';
export default function AddPlanDraft({message}:{message:ChatMessage}){
 const [added,setAdded]=useState(false);
 const state=useStore();
 const opponent=state.opponents.find(o=>o.id===message.context?.opponentId);
 if(!opponent)return null;
 const existing=state.gamePlans.find(p=>p.opponentId===opponent.id)?.meeting?.topics?.some(t=>t.id===`chat:${message.id}`);
 return added||existing?<Link className="inline-block mt-2 text-xs text-grass" href={`/gameplan?id=${opponent.id}`}>Open plan draft →</Link>:<button className="mt-2 ml-2 rounded border border-line px-2 py-1 text-xs text-grass" onClick={()=>{
   const s=useStore.getState(),plan=s.gamePlans.find(p=>p.opponentId===opponent.id),m=initializeMeeting(opponent,plan?.meeting),id=`chat:${message.id}`;
   s.updateGamePlan(opponent.id,{meeting:{...m,topics:[...(m.topics??[]).filter(t=>t.id!==id),{id,title:'Discussion to review',detail:'Added from chat',evidence:'CounterScheme suggestion; requires coach approval.',section:'notes'}],drafts:{...m.drafts,[id]:{...blankAnswer(),point:message.text}},conversations:{...m.conversations,[id]:[{role:'counterscheme',text:message.text}]}}});setAdded(true);
 }}>Add to plan draft</button>;
}
