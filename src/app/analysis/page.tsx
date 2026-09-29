"use client";

import { useState } from "react";
import Link from "next/link";
import { Star, AlertTriangle, Wrench, ChevronRight } from "lucide-react";
import { useStore, useHydrated, type ConceptKind } from "@/lib/store";
import { computeFindings, type Finding, type Status } from "@/lib/analyze";
import SchemeTabs from "@/components/SchemeTabs";

const card = "rounded-xl border border-line bg-card shadow-sm";

const buckets: { key: Status; title: string; sub: string; icon: typeof Star; accent: string; head: string }[] = [
  { key: "Sound", title: "Strengths", sub: "What the defense handles well.", icon: Star, accent: "text-emerald-600", head: "bg-emerald-50 border-emerald-200" },
  { key: "Potential Conflict", title: "Concerns", sub: "Where rules conflict or it can be stressed.", icon: AlertTriangle, accent: "text-red-600", head: "bg-red-50 border-red-200" },
  { key: "Needs Review", title: "Recommendations", sub: "Small fixes using what you already carry.", icon: Wrench, accent: "text-grass", head: "bg-grass/5 border-grass/30" },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="display uppercase text-[10px] font-bold tracking-[0.15em] text-dim mb-1">{title}</div>
      {children}
    </div>
  );
}

function FindingDetails({ f, accent }: { f: Finding; accent: string }) {
  return <section id="finding-details" aria-label="Finding details" className={`${card} p-5`}>
    <p className={`mb-2 text-xs font-bold uppercase tracking-wider ${accent}`}>{buckets.find(b => b.key === f.status)?.title}</p>
    <h2 className="text-xl font-extrabold">{f.check.replace(" — scheme & personnel", "")}</h2>
    <p className="mt-2 text-sm leading-relaxed text-dim">{f.detail}</p>
    {!!f.affected?.length && <div className="mt-3 flex flex-wrap gap-2">{[...new Set(f.affected)].map(a => <span key={a} className="rounded-md border border-line bg-panel px-2 py-1 text-xs font-semibold">{a}</span>)}</div>}
    <div className="mt-5 space-y-5 border-t border-line pt-5 text-sm">
      {f.basis && <p className="rounded-lg bg-panel p-3 text-xs leading-relaxed text-dim">{f.basis}</p>}
      <div className="grid items-start gap-4 xl:grid-cols-2">
        {([["Scheme strengths", f.strengths], ["Weaknesses & ways to attack it", f.weaknesses], ["Fit with your personnel", f.personnel], ["What to improve", f.improvements]] as [string, string[] | undefined][]).map(([title, items]) => !!items?.length && <div key={title} className="rounded-xl border border-line bg-panel/30 p-4"><Section title={title}><ul className="max-h-64 space-y-2 overflow-y-auto pr-1">{items.map(item => <li key={item} className="text-sm leading-relaxed">{item}</li>)}</ul></Section></div>)}
      </div>

          {f.why && <Section title="Soundness & evidence"><p className="leading-relaxed">{f.why}</p></Section>}
          {f.examples && f.examples.length > 0 && (
            <Section title="Situational examples">
              <ul className="list-disc pl-4 text-ink/80 leading-relaxed">{f.examples.map((e) => <li key={e}>{e}</li>)}</ul>
            </Section>
          )}
          {f.breakdown && f.breakdown.length > 0 && (
            <Section title="Rule / fit breakdown">
              <ul className="flex flex-col gap-1">{f.breakdown.map((b) => <li key={b} className="rounded-md bg-slate-50 px-2.5 py-1.5 text-[13px]">{b}</li>)}</ul>
            </Section>
          )}
          {f.suggestion && (
            <Section title="Suggested adjustment"><p className={`leading-relaxed font-medium ${accent}`}>{f.suggestion}</p></Section>
          )}
    </div>
    <Link href="/scheme" className="mt-5 inline-block text-sm font-semibold text-grass">Review my scheme →</Link>
  </section>;
}

const categories: { key: ConceptKind | "team"; label: string }[] = [
  { key: "front", label: "Fronts" }, { key: "coverage", label: "Coverages" },
  { key: "pressure", label: "Pressures" }, { key: "adjustment", label: "Adjustments" },
  { key: "team", label: "Overall Defense" },
];

export default function AnalysisPage() {
  const hydrated = useHydrated();
  const { groups, activeGroupId, players, scheme, overrides, concepts } = useStore();
  const [category, setCategory] = useState<ConceptKind | "team">("front");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  if (!hydrated) return <div className="px-8 py-10 text-dim">Loading…</div>;
  const { findings, groupName, structureName } = computeFindings({ groups, activeGroupId, players, scheme, overrides, concepts });
  const active = concepts.filter(c => c.confirmed && c.status !== "backPocket");
  const visible = category === "team" ? findings.filter(f => !f.id.startsWith("scheme-")) : active.filter(c => c.kind === category).flatMap(c => {
    const f = findings.find(f => f.id === `scheme-${c.id}`);
    return f ? [f] : [];
  });
  const selected = visible.find(f => f.id === selectedId) ?? visible[0];
  const selectedConcept = active.find(c => selected?.id === `scheme-${c.id}`);
  const categoryLabel = categories.find(c => c.key === category)!.label;
  const choose = (id: string) => {
    setSelectedId(id);
    if (window.matchMedia("(max-width: 1023px)").matches) requestAnimationFrame(() => document.getElementById("finding-details")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };
  return <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div><h1 className="text-3xl font-extrabold tracking-tight">Defense Analysis</h1><p className="mt-1 text-sm text-dim">Choose a scheme. See how it works, where it is vulnerable, and how your players fit.</p></div>
      <p className="text-xs text-dim">{groupName} · {structureName}</p>
    </div>
    <SchemeTabs active="analysis" />
    <nav aria-label="Analysis categories" className="mb-4 flex flex-wrap gap-2">{categories.map(c => <button key={c.key} onClick={() => { setCategory(c.key); setSelectedId(null); }} aria-pressed={category === c.key} className={`rounded-lg border px-3 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-grass ${category === c.key ? "border-grass bg-grass text-white" : "border-line bg-card text-dim hover:border-grass"}`}>{c.label}</button>)}</nav>
    <div className="grid items-start gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside className={`${card} overflow-hidden`} aria-label="Choose a scheme">
        <div className="flex items-center justify-between border-b border-line p-4"><h2 className="font-bold">{categoryLabel}</h2><span className="text-xs text-dim">{visible.length}</span></div>
        <div className="max-h-64 overflow-y-auto lg:max-h-[65dvh]">{visible.map(f => {
          const bucket = buckets.find(b => b.key === f.status)!;
          const Icon = bucket.icon;
          const concept = active.find(c => f.id === `scheme-${c.id}`);
          return <button key={f.id} aria-pressed={selected?.id === f.id} aria-controls="finding-details" onClick={() => choose(f.id)} className={`flex w-full items-center gap-2 border-b border-line p-3 text-left last:border-0 focus-visible:outline-2 focus-visible:outline-grass ${selected?.id === f.id ? "border-l-4 border-l-grass bg-grass/5" : "hover:bg-panel"}`}>
            <div className="min-w-0 flex-1"><h3 className="text-sm font-bold">{concept?.name ?? f.check}</h3><span className={`mt-1 flex items-center gap-1 text-[11px] ${bucket.accent}`}><Icon size={12} />{f.status === "Potential Conflict" ? "Potential concern" : f.status === "Needs Review" ? "Needs review" : "Check passed"}{concept?.isBase ? " · Base" : ""}</span></div><ChevronRight size={14} className="shrink-0 text-dim" />
          </button>;
        })}{!visible.length && <p className="p-4 text-sm text-dim">No confirmed active {categoryLabel.toLowerCase()} to analyze. Confirm a scheme item in Scheme Library to include it here.</p>}</div>
      </aside>
      <div className="min-w-0">
        {selectedConcept && <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><p className="text-xs text-dim">{selectedConcept.isBase ? "Base scheme" : "Active scheme"} · {categoryLabel}</p><Link href={`/scheme/concepts?kind=${selectedConcept.kind}&id=${encodeURIComponent(selectedConcept.id)}`} className="text-sm font-semibold text-grass">Open in Scheme Library →</Link></div>}
        {selected ? <FindingDetails key={selected.id} f={selected} accent={buckets.find(b => b.key === selected.status)!.accent} /> : <section id="finding-details" className={`${card} p-6 text-sm text-dim`}>Choose another category or add a confirmed scheme in Scheme Library.</section>}
      </div>
    </div>
    <p className="mt-4 text-xs text-dim">Based on your saved scheme and personnel. Overall Defense keeps your package, situation and roster checks together.</p>
  </div>;
}
