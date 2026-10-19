"use client";
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useStore,type ConceptKind,type Opponent} from '@/lib/store';
import {diagramConcept,diagramSection} from '@/lib/schemeDiagrams';
import PlayCardSVG from './PlayCardSVG';

/** Only saved artwork is shown. Missing drawings never become invented examples. */
export default function VisualLibrary({title='Saved drawings',kind,conceptId,opponent,limit=3}:{title?:string;kind?:ConceptKind;conceptId?:string;opponent?:Opponent;limit?:number}) {
 const s=useStore(),router=useRouter();
 const structureId=s.groups.find(g=>g.id===s.activeGroupId)?.structureId??'3-4';
 const opponentDrawings=opponent?[...(opponent.diagrams??[]),...(s.gamePlans.find(p=>p.opponentId===opponent.id)?.meeting?.decisions??[]).flatMap(d=>(d.diagrams??[]).filter(a=>a.visual?.confirmed).map(a=>({...a,call:a.visual!.opponentLook})))]:[];
 const calls=opponent?opponentDrawings.filter((d,i,all)=>all.findIndex(a=>a.id===d.id)===i).map(d=>({id:d.id,call:d.call,structureId:d.structureId})):s.calls.filter(c=>conceptId?diagramConcept(c,s.concepts)?.id===conceptId:!kind||c.section===diagramSection[kind]).slice(0,limit).map(call=>({id:call.id,call,structureId}));
 return <section className="rounded-xl border border-line bg-card p-4 mb-4"><div className="flex items-center justify-between gap-3 mb-3"><h2 className="font-bold">{title}</h2><Link className="text-xs font-semibold text-grass" href={opponent?`/gameplan?id=${opponent.id}&step=answers`:'/scheme/playbook'}>{opponent?'Draw our answer →':'Open Play Art →'}</Link></div>
 {calls.length?<div className={`grid gap-3 ${conceptId?'':'sm:grid-cols-2 xl:grid-cols-3'}`}>{calls.slice(0,limit).map(d=><button key={d.id} className="min-w-0 rounded-lg border border-line overflow-hidden text-left hover:border-grass" onClick={()=>{if(opponent)router.push(`/gameplan?id=${opponent.id}&step=answers`);else{s.setActiveCall(d.id);router.push('/scheme/playbook');}}}><div className={`${conceptId?'h-64':'h-40'} bg-[var(--art-field)] p-2`}><PlayCardSVG call={d.call} structureId={d.structureId} overrides={s.overrides} defStyle="letters" preview/></div><p className="px-3 py-2 text-sm font-semibold">{d.call.name}</p></button>)}</div>:<div className="rounded-lg border border-dashed border-line bg-panel p-5 text-sm text-dim">No saved drawing{conceptId?' linked to this scheme':''}. <Link className="font-semibold text-grass" href={opponent?`/gameplan?id=${opponent.id}&step=answers`:conceptId?`/scheme/concepts?kind=${kind??'front'}&id=${encodeURIComponent(conceptId)}`:'/scheme/playbook'}>{opponent?'Set up an opponent look':'Add or link a drawing'} →</Link></div>}
 </section>;
}
