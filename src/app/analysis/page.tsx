"use client";

import { useState } from "react";
import Link from "next/link";
import { Star, AlertTriangle, Wrench, ChevronRight } from "lucide-react";
import { useStore, useHydrated } from "@/lib/store";
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
  return <section id="finding-details" aria-label="Finding details" className={`${card} p-5 lg:max-h-[65dvh] lg:overflow-y-auto`}>
    <p className={`mb-2 text-xs font-bold uppercase tracking-wider ${accent}`}>{buckets.find(b => b.key === f.status)?.title}</p>
    <h2 className="text-xl font-extrabold">{f.check}</h2>
    <p className="mt-2 text-sm leading-relaxed text-dim">{f.detail}</p>
    {!!f.affected?.length && <div className="mt-3 flex flex-wrap gap-2">{[...new Set(f.affected)].map(a => <span key={a} className="rounded-md border border-line bg-panel px-2 py-1 text-xs font-semibold">{a}</span>)}</div>}
    <div className="mt-5 space-y-5 border-t border-line pt-5 text-sm">
      {f.basis && <p className="rounded-lg bg-panel p-3 text-xs leading-relaxed text-dim">{f.basis}</p>}
      {([["Scheme strengths", f.strengths], ["Weaknesses & ways to attack it", f.weaknesses], ["Fit with your personnel", f.personnel], ["What to improve", f.improvements]] as [string, string[] | undefined][]).map(([title, items]) => !!items?.length && <Section key={title} title={title}><ul className="space-y-2">{items.map(item => <li key={item} className="rounded-lg border border-line p-3 leading-relaxed">{item}</li>)}</ul></Section>)}

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

export default function AnalysisPage() {
  const hydrated = useHydrated();
  const { groups, activeGroupId, players, scheme, overrides, concepts } = useStore();
  const [filter, setFilter] = useState<Status | "All">("All");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  if (!hydrated) return <div className="px-8 py-10 text-dim">Loading…</div>;

  const { findings, groupName, structureName } = computeFindings({ groups, activeGroupId, players, scheme, overrides, concepts });
  const confirmed = concepts.filter((c) => c.confirmed).length;

  const ordered = (["Potential Conflict", "Needs Review", "Sound"] as Status[]).flatMap(status => findings.filter(f => f.status === status));
  const visible = filter === "All" ? ordered : ordered.filter(f => f.status === filter);
  const selected = visible.find(f => f.id === selectedId) ?? visible[0];
  const concerns = ordered.filter(f => f.status === "Potential Conflict").slice(0, 3);
  const choose = (id: string) => {
    setSelectedId(id);
    if (window.matchMedia("(max-width: 1023px)").matches) requestAnimationFrame(() => document.getElementById("finding-details")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };
  return <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div><h1 className="text-3xl font-extrabold tracking-tight">Defense Analysis</h1><p className="mt-1 text-sm text-dim">How your defense fits together. What to review next.</p></div>
      <p className="text-xs text-dim">{groupName} · {structureName} · {confirmed} confirmed concepts</p>
    </div>
    <SchemeTabs active="analysis" />
    <section aria-label="Concerns to review" className="mb-5">
      <div className="mb-2 flex items-center justify-between gap-3"><h2 className="text-sm font-bold">Start here</h2><span className="text-xs text-dim">Concerns from your saved defense</span></div>
      {concerns.length ? <div className="grid gap-3 md:grid-cols-3">{concerns.map(f => <button key={f.id} onClick={() => { setFilter("All"); choose(f.id); }} className={`${card} border-l-4 border-l-grass p-4 text-left hover:border-grass focus-visible:outline-2 focus-visible:outline-grass`}>
        <h3 className="text-sm font-bold">{f.check} <span className="text-grass">↗</span></h3><p className="mt-1 line-clamp-2 text-xs leading-relaxed text-dim">{f.detail}</p>
      </button>)}</div> : <div className={`${card} p-4 text-sm text-dim`}>No concerns flagged by the current checks. Review recommendations and strengths below.</div>}
    </section>
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <section className={`${card} overflow-hidden`} aria-label="Analysis findings">
        <div className="border-b border-line p-4">
          <div className="mb-3 flex items-center justify-between"><h2 className="font-bold">Your defense</h2><button onClick={() => setFilter("All")} aria-pressed={filter === "All"} className={`rounded-md px-2 py-1 text-xs font-semibold ${filter === "All" ? "bg-grass/10 text-grass" : "text-dim"}`}>All {findings.length}</button></div>
          <div className="grid grid-cols-3 gap-2">{[buckets[1], buckets[2], buckets[0]].map(({ key, title, icon: Icon, accent }) => <button key={key} onClick={() => setFilter(key)} aria-pressed={filter === key} className={`min-w-0 rounded-lg border p-2 text-left focus-visible:outline-2 focus-visible:outline-grass ${filter === key ? "border-grass bg-grass/5" : "border-line hover:bg-panel"}`}>
            <div className={`mb-1 flex items-center justify-between ${accent}`}><Icon size={15} /><span className="text-lg font-extrabold">{findings.filter(f => f.status === key).length}</span></div><span className="block break-words text-[11px] font-semibold">{title}</span>
          </button>)}</div>
        </div>
        <div className="max-h-80 overflow-y-auto lg:max-h-[45dvh]">{visible.map(f => {
          const bucket = buckets.find(b => b.key === f.status)!;
          const Icon = bucket.icon;
          return <button key={f.id} aria-pressed={selected?.id === f.id} aria-controls="finding-details" onClick={() => choose(f.id)} className={`flex w-full items-start gap-3 border-b border-line p-4 text-left last:border-0 focus-visible:outline-2 focus-visible:outline-grass ${selected?.id === f.id ? "bg-grass/5 border-l-4 border-l-grass" : "hover:bg-panel"}`}>
            <Icon size={16} className={`mt-0.5 shrink-0 ${bucket.accent}`} /><div className="min-w-0 flex-1"><h3 className="text-sm font-bold">{f.check}</h3><p className="mt-1 line-clamp-1 text-xs text-dim">{f.detail}</p></div><ChevronRight size={15} className="mt-1 shrink-0 text-dim" />
          </button>;
        })}{!visible.length && <p className="p-6 text-sm text-dim">No findings in this category.</p>}</div>
      </section>
      {selected ? <FindingDetails f={selected} accent={buckets.find(b => b.key === selected.status)!.accent} /> : <section id="finding-details" className={`${card} p-6 text-sm text-dim`}>Choose another category to explore your defense.</section>}
    </div>
    <p className="mt-4 text-xs text-dim">Based on your saved scheme and personnel. Review these considerations with your coaching staff.</p>
  </div>;
}
