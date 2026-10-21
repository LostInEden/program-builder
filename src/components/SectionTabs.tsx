"use client";
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {SECTIONS,inSection} from './SideNav';
import {useStore,useHydrated} from '@/lib/store';
export default function SectionTabs(){
 const pathname=usePathname(),hydrated=useHydrated();
 const program=useStore(s=>s.program),lastOpponentId=useStore(s=>s.lastOpponentId);
 return <nav aria-label="Main navigation" className="flex items-center overflow-x-auto border-t border-line px-4 bg-navy">
  <div className="hidden xl:block w-44 shrink-0 mr-3 pr-4 border-r border-line text-sm truncate">{hydrated?program.name:''}</div>
  {SECTIONS.map(section=><Link key={section.href} href={section.href==='/matchup'&&hydrated&&lastOpponentId?`/matchup?id=${encodeURIComponent(lastOpponentId)}`:section.href} aria-current={inSection(pathname,section)?'page':undefined} className={`flex shrink-0 items-center h-11 px-3 text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-grass ${inSection(pathname,section)?'bg-grass text-on-dark hover:bg-grass-deep':'text-on-dark hover:bg-slate-50 hover:text-ink'}`}>{section.label}</Link>)}
  <Link href="/settings" className="shrink-0 px-3 text-[13px] text-on-dark">Settings</Link>
 </nav>;
}
