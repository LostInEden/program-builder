import Link from "next/link";
import { ChevronRight, PencilRuler } from "lucide-react";
import type { Concept } from "@/lib/store";

export default function SchemeConceptCard({ concept: c, href }: { concept: Concept; href: string }) {
  return <Link href={href} className="overflow-hidden rounded-xl border border-line bg-card transition hover:border-grass focus-visible:outline-2 focus-visible:outline-grass">
    <div className="flex flex-wrap items-center justify-between gap-2 p-4">
      <h2 className="font-extrabold">{c.name}</h2>
      {c.isBase && <span className="rounded-full bg-grass/10 px-2 py-1 text-xs font-bold text-grass">Base {c.kind}</span>}
    </div>
    <div className="flex h-32 flex-col items-center justify-center gap-2 border-y border-line bg-panel text-dim">
      <PencilRuler size={22} strokeWidth={1.5} /><span className="text-xs">No diagram linked</span>
    </div>
    <div className="p-4">
      <p className="min-h-10 line-clamp-2 text-sm text-dim">{c.summary || (c.kind === 'adjustment' && c.trigger ? [c.trigger, c.action, c.result].filter(Boolean).join(' → ') : 'Open for rules and coaching notes.')}</p>
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-dim">
        <span>{!c.confirmed ? 'Needs confirmation' : c.status === 'backPocket' ? 'Back pocket' : 'Active'}</span>
        {(c.category || c.group) && <span>· {c.category || c.group}</span>}
      </div>
      <span className="mt-3 flex items-center gap-1 text-sm font-semibold text-grass">View Details<ChevronRight size={14} /></span>
    </div>
  </Link>;
}
