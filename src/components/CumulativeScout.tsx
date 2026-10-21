'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import {useStore,type Opponent} from '@/lib/store';
import {cumulativeScout,scoutTopic,type ScoutItem} from '@/lib/livingScout';
import {initializeMeeting} from '@/lib/coachingWorkflow';
import {decisionText} from '@/lib/meeting';
import {DiagramPreviews} from './WorkflowDiagrams';
import {BestPlaysCard,CombosCard,FormationsByPersonnelCard,PersonnelCard,PlayerUsageCard,SituationsCard,TellsCard,TopFormationsCard} from './TendencyReport';
import ScoutIntake from './ScoutIntake';
import {diagramImages,exportScout,type ExportSection} from '@/lib/scoutExport';

export default function CumulativeScout({opponent:o}:{opponent:Opponent}){
 const router=useRouter(),state=useStore();
 const sections=useMemo(()=>cumulativeScout(o),[o]);
 const [scope,setScope]=useState('scout'),[quick,setQuick]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [download,setDownload]=useState<{url:string;name:string}|null>(null);
 useEffect(()=>()=>{if(download)URL.revokeObjectURL(download.url);},[download]);
 const reportRoot=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  let expanded:HTMLDetailsElement[]=[];
  const before=()=>{expanded=Array.from(reportRoot.current?.querySelectorAll('details:not([open])')??[]).filter(d=>!d.closest('.no-print')) as HTMLDetailsElement[];expanded.forEach(d=>d.open=true);};
  const after=()=>{expanded.forEach(d=>d.open=false);expanded=[];};
  window.addEventListener('beforeprint',before);window.addEventListener('afterprint',after);
  return ()=>{after();window.removeEventListener('beforeprint',before);window.removeEventListener('afterprint',after);};
 },[]);
 const scoutImages=useRef<HTMLDivElement>(null),planImages=useRef<HTMLDivElement>(null);
 const decisions=state.gamePlans.find(p=>p.opponentId===o.id)?.meeting?.decisions??[];
 const develop=(item:ScoutItem)=>{const s=useStore.getState(),existing=s.gamePlans.find(p=>p.opponentId===o.id)?.meeting; s.updateGamePlan(o.id,{meeting:scoutTopic(initializeMeeting(o,existing),item)});router.push(`/gameplan?id=${encodeURIComponent(o.id)}&topic=${encodeURIComponent(`scout:${item.id}`)}`);};
 const exportReport=async(format:'pdf'|'docx')=>{
  setBusy(true);setError('');try{
   let report:ExportSection[]=scope==='plan'?[]:sections.map(s=>({title:s.title,lines:(quick?s.items.slice(0,2):s.items).map(i=>{const text=[i.title,i.detail,i.source&&`Source: ${i.source}`].filter(Boolean).join(' — ');return quick&&text.length>230?text.slice(0,227)+'…':text;} )}));
   if(report.length){report=report.map(s=>({...s,lines:s.lines.length?s.lines:['No information recorded.']}));const images=await diagramImages(scoutImages.current);if(images.length)report[3].images=quick?images.slice(0,1):images;}
   if(scope!=='scout'){report.push({title:'Approved Defensive Game Plan',lines:decisions.length?decisions.map(d=>`${d.title} — ${decisionText(d)}`):['No coach-approved decisions yet.'],images:await diagramImages(planImages.current)});}
   const blob=await exportScout(format,`${o.name} — ${scope==='plan'?'Game Plan':quick?'Quick Scout':'Full Scout'}${scope==='combined'?' & Game Plan':''}`,report,quick&&scope==='scout');
   const name=`${o.name.replace(/[^a-z0-9 -]/gi,'')} ${scope==='plan'?'Game Plan':quick?'Quick Scout':'Full Scout'}${scope==='combined'?' and Game Plan':''}.${format}`;
   const url=URL.createObjectURL(blob);setDownload({url,name});
   const link=document.createElement('a');link.href=url;link.download=name;link.click();
  }catch(e){setError(e instanceof Error?e.message:'Could not export. Try printing instead.');}finally{setBusy(false);}
 };
 return <div ref={reportRoot} className="space-y-5 scout-report">
  <ScoutIntake key={o.id} opponent={o}/>
  <div className="no-print flex flex-wrap gap-3 items-center rounded-lg border border-line bg-card p-3"><select aria-label="Report contents" value={scope} onChange={e=>setScope(e.target.value)} className="bg-panel rounded border border-line p-2 text-sm"><option value="scout">Scouting report</option><option value="plan">Approved game plan</option><option value="combined">Scout + game plan</option></select><select aria-label="Report length" value={quick?'quick':'full'} onChange={e=>setQuick(e.target.value==='quick')} disabled={scope==='plan'} className="bg-panel rounded border border-line p-2 text-sm"><option value="full">Full Scout</option><option value="quick">Quick Scout · 1–2 pages</option></select><button disabled={busy} onClick={()=>void exportReport('pdf')} className="rounded bg-grass text-white font-semibold px-3 py-2 text-sm">{busy?'Preparing…':'Download PDF'}</button><button disabled={busy} onClick={()=>void exportReport('docx')} className="rounded border border-line px-3 py-2 text-sm">Editable Word</button><button onClick={()=>window.print()} className="text-sm underline">Print</button><span className="text-xs text-dim">{quick?'Quick Scout contains selected highlights; full evidence remains saved. Combined exports add game-plan pages.':''}</span></div>
  {download&&<p className="no-print text-sm" role="status">Report ready. <a className="text-grass underline" href={download.url} download={download.name}>Download {download.name}</a></p>}
  {error&&<p role="alert" className="text-sm">{error}</p>}
  <p className="text-xs text-dim">{o.plays?.length??0} snaps · {o.scoutSources?.length??0} source reports. Observations are source claims, not verified conclusions. Missing tags are excluded from relevant rates.</p>
  {scope!=='plan'&&<div className="grid lg:grid-cols-2 gap-5">{sections.map((s,index)=>{
   const visible=quick?s.items.slice(0,2):s.items.slice(0,4),rest=quick?[]:s.items.slice(4);
   const item=(i:ScoutItem)=><li key={i.id} className="border-t border-line py-3 first:border-0"><p className="font-semibold text-sm whitespace-pre-wrap">{i.title.length>180?i.title.slice(0,177)+'…':i.title}</p>{i.detail&&<p className="text-xs text-dim mt-1 whitespace-pre-wrap">{i.detail.length>230?i.detail.slice(0,227)+'…':i.detail}</p>}{(i.title.length>180||i.detail.length>230)&&<details className="mt-1 text-xs"><summary className="cursor-pointer text-grass">Read full observation</summary><p className="whitespace-pre-wrap mt-2">{i.title}</p><p className="whitespace-pre-wrap">{i.detail}</p></details>}{i.source&&<p className="text-xs text-dim mt-1">Source: {i.source}</p>}<button className="no-print mt-2 text-xs font-semibold text-grass hover:underline" onClick={()=>develop(i)}>Develop defensive answer →</button>{i.playIds.length>0&&<details className="no-print mt-2 text-xs text-dim"><summary className="cursor-pointer">Supporting snaps ({i.playIds.length})</summary><div className="max-h-40 overflow-auto">{(o.plays??[]).filter(p=>i.playIds.includes(p.id)).map(p=><p className="py-1" key={p.id}>{o.scoutSources?.find(s=>s.id===p.scoutSourceId)?.game||o.scoutSources?.find(s=>s.id===p.scoutSourceId)?.name||'Earlier imported film'} · #{p.num||'—'} · {p.formation} · {p.play||p.playType} · {p.gain==null?'gain unknown':`${p.gain} yd`}</p>)}</div></details>}</li>;
   return <section key={s.title} className="rounded-xl border border-line bg-card p-5 print-card break-inside-avoid"><h2 className="font-extrabold text-lg">{index+1}. {s.title}</h2>{!s.items.length?<p className="text-sm text-dim mt-2">No information recorded.</p>:<ul>{visible.map(item)}</ul>}{rest.length>0&&<details className="mt-2"><summary className="text-xs font-semibold text-grass cursor-pointer">More evidence ({rest.length})</summary><ul>{rest.map(item)}</ul></details>}</section>;
  })}</div>}
  {scope!=='plan'&&!!o.plays?.length&&<details className="no-print rounded-xl border border-line bg-card p-4"><summary className="font-semibold cursor-pointer">Full statistical evidence</summary><div className="grid lg:grid-cols-2 gap-4 mt-4"><PersonnelCard plays={o.plays}/><TopFormationsCard plays={o.plays}/><FormationsByPersonnelCard plays={o.plays}/><BestPlaysCard plays={o.plays}/><PlayerUsageCard plays={o.plays}/><SituationsCard plays={o.plays}/><TellsCard plays={o.plays}/><CombosCard plays={o.plays}/></div></details>}
  {scope!=='plan'&&<div ref={scoutImages}>{!!o.diagrams?.length&&<><h2 className="font-bold mb-3">Saved opponent diagrams</h2><DiagramPreviews diagrams={quick?o.diagrams.slice(0,1):o.diagrams}/></>}</div>}
  {/* Always render saved diagrams for export; hide only the unused report portion. */}
  <div ref={planImages} className={scope==='scout'?'hidden':''}><h2 className="font-bold text-xl mb-3">Approved Defensive Game Plan</h2>{!decisions.length&&<p className="text-sm text-dim">No coach-approved decisions yet.</p>}{decisions.map(d=><section key={d.id} className="rounded-xl border border-line bg-card p-4 mb-3 print-card"><h3 className="font-bold">{d.title}</h3><p className="text-sm whitespace-pre-wrap my-2">{decisionText(d)}</p><DiagramPreviews diagrams={d.diagrams}/></section>)}</div>
 </div>;
}
