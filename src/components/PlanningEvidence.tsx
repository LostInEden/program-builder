import Link from 'next/link';
import {productLanguage} from '@/lib/productLanguage';

export default function PlanningEvidence({text,opponentId,section}:{text:string;opponentId:string;section:string}){
 const context=['answers','packages','practice'].includes(section);
 const compact=['identity','situations'].includes(section);
 const rows=productLanguage(text).split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
 return <section aria-label={context?'Planning context':'Scouting evidence'} className="mt-4 overflow-hidden rounded-lg border border-line">
  <div className="flex items-center justify-between gap-2 border-b border-line bg-panel px-3 py-2"><h3 className="text-xs font-bold uppercase tracking-wide text-dim">{context?'Planning context':'Scouting evidence'}</h3><Link href={`/scouting?id=${encodeURIComponent(opponentId)}`} className="text-xs font-semibold text-grass">Full scout →</Link></div>
  <ul className={compact?"grid gap-2 bg-white p-2 sm:grid-cols-2 xl:grid-cols-3":"divide-y divide-line bg-white"}>{rows.map((row,i)=>{
   const middle=row.indexOf(' · '),colon=row.indexOf(': '),split=middle>=0?middle:colon;
   if(split<0)return <li key={i} className={`${compact?"px-3 py-2 bg-panel rounded-md":"px-3 py-3"} text-sm leading-snug whitespace-pre-wrap break-words`}>{row}</li>;
   const label=row.slice(0,split),body=row.slice(split+(middle>=0?3:2));
   return <li key={i} className={compact?"px-3 py-2 bg-panel rounded-md":"px-3 py-3"}><p className="text-sm font-semibold">{label}</p><p className="mt-1 text-sm leading-snug text-dim whitespace-pre-wrap break-words">{body}</p></li>;
  })}</ul>
 </section>;
}
