"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, Shield, Layers, Zap, SlidersHorizontal } from "lucide-react";
import { useStore, useHydrated, type ConceptKind } from "@/lib/store";
import SchemeTeachingPanel from "@/components/SchemeTeachingPanel";
import SchemeTabs from "@/components/SchemeTabs";

const card = "rounded-xl border border-line bg-card p-5 sm:p-6";
const input = "mt-1 w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm text-ink";
const categories = [
  { kind: "front", title: "Fronts", icon: Shield },
  { kind: "coverage", title: "Coverages", icon: Layers },
  { kind: "pressure", title: "Pressures", icon: Zap },
  { kind: "adjustment", title: "Adjustments", icon: SlidersHorizontal },
] as const;

export default function SchemePage() {
  const hydrated = useHydrated();
  const { scheme, setScheme, concepts } = useStore();
  const [teaching, setTeaching] = useState(false);
  const [editing, setEditing] = useState(false);
  if (!hydrated) return <div className="px-8 py-10 text-dim">Loading…</div>;
  const confirmed = concepts.filter((c) => c.confirmed);
  const baseNames = (kind: ConceptKind) => confirmed.filter((c) => c.kind === kind && c.isBase).map((c) => c.name).join(" · ");
  const pending = concepts.filter((c) => !c.confirmed).length;

  return <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
    <header className="mb-5">
      <h1 className="text-3xl font-extrabold tracking-tight">My Scheme</h1>
      <p className="mt-1 text-sm text-dim">Your defensive identity, what you carry, and the rules you coach.</p>
      <button onClick={() => setTeaching(!teaching)} aria-expanded={teaching} className="mt-3 rounded-lg border border-line px-3 py-2 text-sm font-semibold text-gold">{teaching ? "Close Teaching" : "Teach CounterScheme"}{pending ? ` · ${pending} to review` : ""}</button>
    </header>
    <SchemeTabs />
    {teaching && <div className="mb-5"><SchemeTeachingPanel /></div>}
    <details className="mb-5 rounded-lg border border-line bg-card">
      <summary className="cursor-pointer px-4 py-3 text-sm font-semibold">Scheme tools & review{pending > 0 ? ` · ${pending} to confirm` : ""}</summary>
      <div className="border-t border-line p-3 sm:p-4">
        <div className="mb-4 flex flex-wrap gap-2 text-sm font-semibold text-grass">
          {[['/scheme/terminology', 'Terminology'], ['/scheme/coverages', 'Coverage Reference'], ['/analysis', 'Defensive Analysis'], ['/scheme/playbook', 'Play Art']].map(([href, label]) => <Link key={href} href={href} className="rounded-lg border border-line px-3 py-2 hover:border-grass">{label}</Link>)}
        </div>
        <button onClick={() => setTeaching(true)} className="text-sm font-semibold text-gold">Open teaching & pending review</button>
      </div>
    </details>

    <section aria-labelledby="identity-title" className={`${card} mb-5`}>
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 id="identity-title" className="text-lg font-extrabold">Defensive Identity</h2>
        <button onClick={() => setEditing(!editing)} aria-expanded={editing} className="rounded-lg border border-line px-3 py-2 text-sm font-semibold text-grass hover:border-grass">{editing ? 'Done' : 'Edit Identity'}</button>
      </div>
      <dl className="grid gap-4 sm:grid-cols-3">
        <div><dt className="text-xs uppercase tracking-wider text-dim">Base Defense</dt><dd className="mt-1 text-xl font-bold">{scheme.structureName || 'Not set'}</dd></div>
        <div><dt className="text-xs uppercase tracking-wider text-dim">Base Front</dt><dd className="mt-1 font-bold">{baseNames('front') || 'Not designated'}</dd></div>
        <div><dt className="text-xs uppercase tracking-wider text-dim">Base Coverage</dt><dd className="mt-1 font-bold">{baseNames('coverage') || 'Not designated'}</dd></div>
      </dl>
      <div className="mt-5 border-t border-line pt-4">
        <p className="text-xs uppercase tracking-wider text-dim">Philosophy</p>
        <p className="mt-1 font-semibold">{scheme.philosophyTitle || 'No philosophy title saved'}</p>
        {scheme.philosophy && <details className="mt-2 text-sm"><summary className="cursor-pointer text-grass">View Full Philosophy</summary><p className="mt-2 whitespace-pre-wrap leading-relaxed text-dim">{scheme.philosophy}</p></details>}
      </div>
      {editing && <div className="mt-5 grid gap-3 border-t border-line pt-4">
        <label className="text-sm text-dim">Base defense<input value={scheme.structureName} onChange={(e) => setScheme({ structureName: e.target.value })} className={input} /></label>
        <label className="text-sm text-dim">Philosophy title<input value={scheme.philosophyTitle} onChange={(e) => setScheme({ philosophyTitle: e.target.value })} className={input} /></label>
        <label className="text-sm text-dim">Full philosophy<textarea rows={4} value={scheme.philosophy} onChange={(e) => setScheme({ philosophy: e.target.value })} className={input} /></label>
        <p className="text-xs text-dim">Changes save automatically. Designate base fronts and coverages in their individual details.</p>
        <div className="flex gap-4 text-sm font-semibold text-grass"><Link href="/scheme/concepts?kind=front">Edit Fronts →</Link><Link href="/scheme/concepts?kind=coverage">Edit Coverages →</Link></div>
      </div>}
    </section>

    <section aria-labelledby="defense-title" className="mb-5">
      <h2 id="defense-title" className="mb-3 text-lg font-extrabold">Your Defense</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {categories.map(({kind, title, icon: Icon}) => {
          const list = confirmed.filter((c) => c.kind === kind);
          const active = list.filter((c) => c.status !== 'backPocket').length;
          const held = list.length - active;
          return <Link key={kind} href={`/scheme/concepts?kind=${kind}`} className={`${card} group transition hover:border-grass focus-visible:outline-2 focus-visible:outline-grass`}>
            <div className="flex items-center gap-2"><Icon size={18} className="text-grass" /><h3 className="font-bold">{title}</h3></div>
            <p className="mt-3 text-2xl font-extrabold">{active} <span className="text-sm font-medium text-dim">active</span></p>
            {held > 0 && <p className="mt-1 text-xs text-dim">{held} in back pocket</p>}
            {baseNames(kind) && <p className="mt-2 text-sm text-dim">Base: <span className="text-ink">{baseNames(kind)}</span></p>}
            <span className="mt-4 flex items-center gap-1 text-sm font-semibold text-grass">View {title}<ChevronRight size={15} /></span>
          </Link>;
        })}
      </div>
    </section>

    <section aria-labelledby="rules-title" className={card}>
      <h2 id="rules-title" className="text-lg font-extrabold">Core Rules</h2>
      <p className="mt-2 text-sm text-dim">System-wide rules have not been designated separately. Your saved checks and responsibilities remain in their scheme details.</p>
      <div className="mt-4 flex flex-wrap gap-3 text-sm font-semibold text-grass">
        <Link href="/scheme/concepts?kind=adjustment" className="rounded-lg border border-line px-3 py-2 hover:border-grass">View / Edit Checks</Link>
        <Link href="/scheme/terminology" className="rounded-lg border border-line px-3 py-2 hover:border-grass">View / Edit Terminology</Link>
      </div>
    </section>
  </div>;
}
