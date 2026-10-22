'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {useStore,type Opponent} from '@/lib/store';
import {cumulativeScout,type ScoutItem} from '@/lib/livingScout';
import {decisionText} from '@/lib/meeting';
import {DiagramPreviews} from './WorkflowDiagrams';
import {BestPlaysCard,CombosCard,FormationsByPersonnelCard,PersonnelCard,PlayerUsageCard,SituationsCard,TellsCard,TopFormationsCard} from './TendencyReport';
import ScoutIntake from './ScoutIntake';
import ScoutFormations from './ScoutFormations';
import {diagramImages,exportScout,type ExportSection} from '@/lib/scoutExport';

export default function CumulativeScout({opponent:o}:{opponent:Opponent}){
 const state=useStore();
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
 const formationImages=useRef<HTMLDivElement>(null);
 const scoutImages=useRef<HTMLDivElement>(null),planImages=useRef<HTMLDivElement>(null);
 const decisions=state.gamePlans.find(p=>p.opponentId===o.id)?.meeting?.decisions??[];
 const exportReport=async(format:'pdf'|'docx')=>{
  setBusy(true);setError('');try{
   let report:ExportSection[]=scope==='plan'?[]:sections.map(s=>({title:s.title,lines:(quick?s.items.slice(0,2):s.items).map(i=>{const text=[i.title,i.detail,i.source&&`Source: ${i.source}`].filter(Boolean).join(' — ');return quick&&text.length>230?text.slice(0,227)+'…':text;} )}));
   if(report.length){report=report.map(s=>({...s,lines:s.lines.length?s.lines:['No information recorded.']}));const images=await diagramImages(scoutImages.current);if(images.length)report[3].images=quick?images.slice(0,1):images;}
   if(report.length&&!quick)report[2].images=await diagramImages(formationImages.current);
   if(scope!=='scout'){report.push({title:'Approved Defensive Game Plan',lines:decisions.length?decisions.map(d=>`${d.title} — ${decisionText(d)}`):['No coach-approved decisions yet.'],images:await diagramImages(planImages.current)});}
   const blob=await exportScout(format,`${o.name} — ${scope==='plan'?'Game Plan':quick?'Quick Scout':'Full Scout'}${scope==='combined'?' & Game Plan':''}`,report,quick&&scope==='scout');
   const name=`${o.name.replace(/[^a-z0-9 -]/gi,'')} ${scope==='plan'?'Game Plan':quick?'Quick Scout':'Full Scout'}${scope==='combined'?' and Game Plan':''}.${format}`;
   const url=URL.createObjectURL(blob);setDownload({url,name});
   const link=document.createElement('a');link.href=url;link.download=name;link.click();
  }catch(e){setError(e instanceof Error?e.message:'Could not export. Try printing instead.');}finally{setBusy(false);}
 };
 return <div ref={reportRoot} className="space-y-5 scout-report">
  <ScoutIntake key={o.id} opponent={o}/>
  <div className="no-print flex flex-wrap gap-3 items-center rounded-lg border border-line bg-card p-3"><select aria-label="Download contents" value={scope} onChange={e=>setScope(e.target.value)} className="bg-panel rounded border border-line p-2 text-sm"><option value="scout">Scouting report</option><option value="plan">Approved game plan</option><option value="combined">Scout + game plan</option></select><select aria-label="Report length" value={quick?'quick':'full'} onChange={e=>setQuick(e.target.value==='quick')} disabled={scope==='plan'} className="bg-panel rounded border border-line p-2 text-sm"><option value="full">Full Scout</option><option value="quick">Quick Scout · 1–2 pages</option></select><button disabled={busy} onClick={()=>void exportReport('pdf')} className="rounded bg-grass text-white font-semibold px-3 py-2 text-sm">{busy?'Preparing…':'Download PDF'}</button><button disabled={busy} onClick={()=>void exportReport('docx')} className="rounded border border-line px-3 py-2 text-sm">Editable Word</button><button onClick={()=>window.print()} className="text-sm underline">Print</button><span className="text-xs text-dim">{quick?'Quick Scout contains selected highlights; full evidence remains saved. Combined exports add game-plan pages.':''}</span></div>
  {download&&<p className="no-print text-sm" role="status">Report ready. <a className="text-grass underline" href={download.url} download={download.name}>Download {download.name}</a></p>}
  {error&&<p role="alert" className="text-sm">{error}</p>}
  <article aria-label="Opponent scouting report" className="bg-card px-5 py-6 sm:px-8 sm:py-8">
  <p className="text-xs text-dim">{o.plays?.length??0} snaps · {o.scoutSources?.length??0} source reports. Observations are source claims, not verified conclusions. Missing tags are excluded from relevant rates.</p>
  {<div className="mt-6">{sections.map((s,index)=>{
   const visible=quick?s.items.slice(0,2):s.items;
   const item=(i:ScoutItem)=><li key={i.id} className="py-2.5 break-inside-avoid"><p className="font-semibold text-sm leading-relaxed whitespace-pre-wrap">{i.title}</p>{i.detail&&<p className="text-sm text-dim mt-1 leading-relaxed whitespace-pre-wrap">{i.detail}</p>}{i.source&&<p className="text-xs text-dim mt-1">Source: {i.source}</p>}{i.playIds.length>0&&<details className="no-print mt-2 text-xs text-dim"><summary className="cursor-pointer">Supporting snaps ({i.playIds.length})</summary><div className="max-h-40 overflow-auto">{(o.plays??[]).filter(p=>i.playIds.includes(p.id)).map(p=><p className="py-1" key={p.id}>{o.scoutSources?.find(s=>s.id===p.scoutSourceId)?.game||o.scoutSources?.find(s=>s.id===p.scoutSourceId)?.name||'Earlier imported film'} · #{p.num||'—'} · {p.formation} · {p.play||p.playType} · {p.gain==null?'gain unknown':`${p.gain} yd`}</p>)}</div></details>}</li>;
   return <section key={s.title} className="border-t border-line py-6 first:border-0 first:pt-0"><h2 className="font-extrabold text-lg mb-2 break-after-avoid">{index+1}. {s.title}</h2>{s.title==='Formations & Personnel'&&<div ref={formationImages}><ScoutFormations opponent={o}/></div>}{!s.items.length?<p className="text-sm text-dim mt-2">No information recorded.</p>:<ul>{visible.map(item)}</ul>}</section>;
  })}</div>}
  {!!o.plays?.length&&<details className="no-print border-t border-line py-6"><summary className="font-semibold cursor-pointer">Full statistical evidence</summary><div className="grid lg:grid-cols-2 gap-4 mt-4"><PersonnelCard plays={o.plays}/><TopFormationsCard plays={o.plays}/><FormationsByPersonnelCard plays={o.plays}/><BestPlaysCard plays={o.plays}/><PlayerUsageCard plays={o.plays}/><SituationsCard plays={o.plays}/><TellsCard plays={o.plays}/><CombosCard plays={o.plays}/></div></details>}
  {<div ref={scoutImages}>{!!o.diagrams?.length&&<><h2 className="font-bold mb-3">Saved opponent diagrams</h2><DiagramPreviews diagrams={quick?o.diagrams.slice(0,1):o.diagrams}/></>}</div>}
  </article>
  {/* Approved decisions remain available for optional downloads; coaching stays in Game Plan. */}
  <div ref={planImages} className="hidden"><h2 className="font-bold text-xl mb-3">Approved Defensive Game Plan</h2>{!decisions.length&&<p className="text-sm text-dim">No coach-approved decisions yet.</p>}{decisions.map(d=><section key={d.id} className="rounded-xl border border-line bg-card p-4 mb-3 print-card"><h3 className="font-bold">{d.title}</h3><p className="text-sm whitespace-pre-wrap my-2">{decisionText(d)}</p><DiagramPreviews diagrams={d.diagrams}/></section>)}</div>
 </div>;
}
