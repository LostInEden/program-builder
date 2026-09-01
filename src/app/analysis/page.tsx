"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Star, AlertTriangle, Wrench, ChevronDown } from "lucide-react";
import { useStore, useHydrated } from "@/lib/store";
import { computeFindings, type Finding, type Status } from "@/lib/analyze";
import { AI_LABEL } from "@/lib/ai";

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

function FindingCard({ f, accent }: { f: Finding; accent: string }) {
  const [open, setOpen] = useState(false);
  return (
    <button onClick={() => setOpen((o) => !o)} className={`${card} w-full p-4 text-left transition hover:border-dim`}>
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="font-bold text-[15px]">{f.check}</div>
          <p className="text-sm text-dim leading-relaxed mt-0.5">{f.detail}</p>
        </div>
        <ChevronDown size={15} className={`shrink-0 mt-1 text-dim transition-transform ${open ? "rotate-180" : ""}`} />
      </div>
      {f.affected && f.affected.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {[...new Set(f.affected)].map((a) => (
            <span key={a} className="rounded-full border border-line bg-slate-50 px-2 py-0.5 text-[11px] font-bold">{a}</span>
          ))}
        </div>
      )}
      {open && (
        <div className="mt-3 border-t border-line pt-3 flex flex-col gap-3 text-sm">
          {f.why && <Section title="See why"><p className="leading-relaxed">{f.why}</p></Section>}
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
      )}
    </button>
  );
}

export default function AnalysisPage() {
  const hydrated = useHydrated();
  const { groups, activeGroupId, players, scheme, overrides, concepts } = useStore();
  if (!hydrated) return <div className="px-8 py-10 text-dim">Loading…</div>;

  const { findings, groupName, structureName } = computeFindings({ groups, activeGroupId, players, scheme, overrides, concepts });
  const confirmed = concepts.filter((c) => c.confirmed).length;

  return (
    <div className="px-6 py-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight">Defensive Analysis</h1>
        <p className="text-dim mt-0.5">
          Your saved defense — {confirmed} concepts, {groupName} ({structureName}) — checked against personnel, formations,
          motions, run and pass concepts, coverage responsibilities, numbers, and situational football. Considerations, not corrections.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-3 items-start">
        {buckets.map(({ key, title, sub, icon: Icon, accent, head }, bi) => {
          const list = findings.filter((f) => f.status === key);
          return (
            <motion.div key={key} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: bi * 0.06 }} className="flex flex-col gap-3">
              <div className={`rounded-xl border px-4 py-3 flex items-center gap-3 ${head}`}>
                <Icon size={18} className={accent} />
                <div>
                  <div className={`font-extrabold ${accent}`}>{title}</div>
                  <div className="text-xs text-dim">{sub}</div>
                </div>
                <span className={`ml-auto text-xl font-extrabold tabular-nums ${accent}`}>{list.length}</span>
              </div>
              {list.map((f) => <FindingCard key={f.id} f={f} accent={accent} />)}
              {list.length === 0 && (
                <div className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-dim">Nothing here right now.</div>
              )}
            </motion.div>
          );
        })}
      </div>

      <p className="mt-6 text-sm text-dim">
        Click a card for why, situational examples, the rule/fit breakdown, and a suggested adjustment. Engine: {AI_LABEL}.{" "}
        <Link href="/scheme" className="text-grass font-semibold hover:underline">Adjust the scheme →</Link>
      </p>
    </div>
  );
}
