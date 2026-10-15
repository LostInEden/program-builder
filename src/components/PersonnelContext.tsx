"use client";
import Link from 'next/link';
import {useStore, baseGroupFor, effectiveSlots} from '@/lib/store';
import {getStructure} from '@/lib/football';

/** Existing roster evidence, not a score or a claim of scheme soundness. */
export default function PersonnelContext(){
 const s=useStore();
 const group=s.groups.find(g=>g.id===s.activeGroupId)??s.groups[0];
 if(!group)return null;
 const slots=effectiveSlots(group,baseGroupFor(s.groups,group.level));
 const roles=getStructure(group.structureId).slots;
 const starters=roles.map((_,i)=>s.players.find(p=>p.id===slots[i]?.[0]));
 const assigned=starters.filter(Boolean).length;
 const rated=starters.filter(p=>p&&Object.values(p.skills??{}).some(v=>v!=null)).length;
 const unavailable=starters.filter(p=>p&&p.status!=='Healthy').length;
 return <section aria-label="Personnel behind this defense" className="no-print mb-4 rounded-xl border border-line bg-card p-4">
  <div className="flex flex-wrap justify-between gap-2"><h2 className="text-sm font-bold">Built around your players</h2><span className="text-xs text-dim">{group.name}</span></div>
  <p className="mt-2 text-sm text-dim">{assigned}/{roles.length} starting roles assigned · {rated}/{assigned} with skill ratings{unavailable?` · ${unavailable} with availability concerns`:''}</p>
  <p className="mt-1 text-xs text-dim">{rated<assigned||assigned<roles.length?'Complete the missing assignments and evaluations to give personnel-fit discussions better evidence.':'Use individual evaluations and saved responsibilities to review the fit. Ratings alone do not establish defensive soundness.'}</p>
  <div className="mt-3 flex flex-wrap gap-4 text-sm font-semibold text-grass"><Link href="/team?view=depth">Review depth chart →</Link><Link href="/team?view=profiles">Evaluate players →</Link><Link href="/analysis">Review scheme fit →</Link></div>
 </section>;
}
