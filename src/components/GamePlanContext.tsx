"use client";
import Link from 'next/link';
import {useStore,baseGroupFor,effectiveSlots,type Opponent} from '@/lib/store';
import {getStructure} from '@/lib/football';
import {opponentOverview} from '@/lib/opponentOverview';

export default function GamePlanContext({opponent}:{opponent:Opponent}){
 const s=useStore(),group=s.groups.find(g=>g.id===s.activeGroupId)??s.groups[0];
 const slots=effectiveSlots(group,baseGroupFor(s.groups,group.level));
 const starters=getStructure(group.structureId).slots.map((_,i)=>s.players.find(p=>p.id===slots[i]?.[0]));
 const assigned=starters.filter(Boolean).length,rated=starters.filter(p=>p&&Object.values(p.skills??{}).some(v=>v!=null)).length;
 const base=s.concepts.filter(c=>c.confirmed&&c.isBase&&c.status!=='backPocket').map(c=>c.name);
 const opponentView=opponentOverview(opponent);
 return <div className="no-print mb-4 grid gap-4 md:grid-cols-2">
  <section className="rounded-xl border border-line bg-card p-4"><p className="text-xs font-bold uppercase tracking-wider text-grass">Our foundation</p><h2 className="mt-1 text-lg font-bold">Our personnel &amp; system</h2><p className="mt-2 text-sm font-semibold">{s.scheme.structureName || 'Defense not set'} · {group.name}</p><p className="text-sm text-dim">{assigned}/{starters.length} starting roles assigned · {rated} with skill ratings</p><p className="mt-2 text-sm truncate" title={base.join(' · ')}>{base.length?base.join(' · '):'No base calls designated'}</p><div className="mt-3 flex gap-4 text-xs font-semibold text-grass"><Link href="/team?view=depth">Personnel →</Link><Link href="/scheme">Installed system →</Link><Link href="/analysis">Strengths &amp; concerns →</Link></div></section>
  <section className="rounded-xl border border-line bg-card p-4"><p className="text-xs font-bold uppercase tracking-wider text-grass">Their challenge{opponent.isDemo?' · Demo data':''}</p><h2 className="mt-1 text-lg font-bold">Opponent threats</h2><p className="mt-2 text-sm text-dim">{[opponent.offensiveStyle,opponent.tempo,opponentView.runRate==null?'':`${opponentView.runRate}% run`].filter(Boolean).join(' · ')||'Add scouting evidence to identify threats.'}</p><ul className="mt-2 flex flex-wrap gap-2">{opponentView.priorities.slice(0,3).map(p=><li className="rounded border border-line bg-panel px-2 py-1 text-sm font-semibold" key={`${p.section}:${p.title}`}>{p.title}</li>)}</ul><Link className="mt-3 inline-block text-xs font-semibold text-grass" href={`/scouting?id=${encodeURIComponent(opponent.id)}`}>Review full opponent evidence →</Link></section>
 </div>;
}
