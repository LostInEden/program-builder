import Link from "next/link";
import type { ConceptKind } from "@/lib/store";

export default function SchemeTabs({ active }: { active?: ConceptKind }) {
  return <nav aria-label="My Scheme categories" className="mb-5 flex flex-wrap gap-1 rounded-xl border border-line bg-card p-1">
    {[{href:'/scheme', label:'Overview', kind:undefined}, ...(['front', 'coverage', 'pressure', 'adjustment'] as const).map(kind => ({href:`/scheme/concepts?kind=${kind}`, label:{front:'Fronts', coverage:'Coverages', pressure:'Pressures', adjustment:'Adjustments'}[kind], kind}))].map(item =>
      <Link key={item.href} href={item.href} aria-current={active === item.kind ? 'page' : undefined} className={`rounded-lg px-3 py-2 text-sm font-semibold ${active === item.kind ? 'bg-grass text-white' : 'text-dim hover:text-ink'}`}>{item.label}</Link>
    )}
  </nav>;
}
