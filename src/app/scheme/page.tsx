"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { BookOpen, ShieldCheck, Layers, SpellCheck, Pencil, Check, ChevronRight, Plus, X, ArrowRight } from "lucide-react";
import { useStore, useHydrated } from "@/lib/store";

const card = "rounded-xl border border-line bg-card shadow-sm";
const cardHead = "display uppercase text-xs font-bold tracking-[0.15em] text-ink px-5 py-3.5 border-b border-line flex items-center gap-3";

export default function SchemePage() {
  const hydrated = useHydrated();
  const { scheme, setScheme, schemeRules, addSchemeRule, updateSchemeRule, removeSchemeRule } = useStore();
  const [editing, setEditing] = useState(false);

  if (!hydrated) return <div className="px-8 py-10 text-dim">Loading…</div>;

  return (
    <div className="px-6 py-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight">My Scheme</h1>
        <p className="text-dim mt-0.5">
          Teach the software how your defense works — structure, rules, calls, and terminology.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_1fr] items-start mb-5">
        {/* Identity */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className={card}>
          <div className={cardHead}>
            Defensive Identity
            <button
              onClick={() => setEditing((e) => !e)}
              className={`ml-auto normal-case tracking-normal inline-flex items-center gap-1.5 rounded-lg border px-3 py-1 text-xs font-semibold transition ${
                editing ? "border-grass bg-grass/10 text-grass" : "border-line text-dim hover:text-ink"
              }`}
            >
              {editing ? <Check size={13} /> : <Pencil size={13} />}
              {editing ? "Save" : "Edit"}
            </button>
          </div>
          <div className="p-5">
            <div className="display uppercase text-[11px] font-semibold tracking-widest text-dim mb-1.5">
              Base Structure
            </div>
            {editing ? (
              <input
                value={scheme.structureName}
                onChange={(e) => setScheme({ structureName: e.target.value })}
                placeholder="3-4, 4-2-5, or your own name"
                className="w-full max-w-xs rounded-lg border border-line bg-white px-4 py-2 text-3xl font-extrabold text-grass"
              />
            ) : (
              <div className="text-5xl font-extrabold text-grass tracking-tight">{scheme.structureName}</div>
            )}

            <div className="display uppercase text-[11px] font-semibold tracking-widest text-dim mt-6 mb-1.5">
              Philosophy
            </div>
            {editing ? (
              <textarea
                rows={5}
                value={scheme.philosophy}
                onChange={(e) => setScheme({ philosophy: e.target.value })}
                placeholder="How you want to play, what you prioritize, the core identity of your defense."
                className="w-full rounded-lg border border-line bg-white px-4 py-3 leading-relaxed resize-y"
              />
            ) : (
              <p className="leading-relaxed">{scheme.philosophy}</p>
            )}
          </div>
        </motion.div>

        {/* Rules & adjustments — structured Trigger → Action → Result */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }} className={card}>
          <div className={cardHead}>
            Rules &amp; Adjustments
            <button
              onClick={addSchemeRule}
              className="ml-auto normal-case tracking-normal inline-flex items-center gap-1 rounded-lg bg-grass px-3 py-1 text-xs font-semibold text-white hover:bg-grass-deep"
            >
              <Plus size={13} /> Add rule
            </button>
          </div>
          <div className="p-4">
            <p className="text-xs text-dim mb-3">
              Structured, not conversational: <span className="font-semibold text-ink">Trigger → Action → Result</span>.
              Example: &ldquo;TE + 2 strong&rdquo; → Change front → Over.
            </p>
            <div className="flex flex-col gap-2">
              {schemeRules.map((r) => (
                <div key={r.id} className="flex items-center gap-1.5 rounded-lg border border-line bg-slate-50 p-2">
                  <input
                    value={r.trigger}
                    placeholder="Trigger (what you see)"
                    onChange={(e) => updateSchemeRule(r.id, { trigger: e.target.value })}
                    className="min-w-0 flex-1 rounded-md border border-line bg-white px-2.5 py-1.5 text-sm font-semibold"
                  />
                  <ArrowRight size={13} className="shrink-0 text-dim" />
                  <input
                    value={r.action}
                    placeholder="Action (what you do)"
                    onChange={(e) => updateSchemeRule(r.id, { action: e.target.value })}
                    className="min-w-0 flex-1 rounded-md border border-line bg-white px-2.5 py-1.5 text-sm"
                  />
                  <ArrowRight size={13} className="shrink-0 text-dim" />
                  <input
                    value={r.result}
                    placeholder="Result (the call)"
                    onChange={(e) => updateSchemeRule(r.id, { result: e.target.value })}
                    className="min-w-0 w-24 rounded-md border border-line bg-white px-2.5 py-1.5 text-sm font-semibold text-grass"
                  />
                  <button onClick={() => removeSchemeRule(r.id)} className="shrink-0 text-dim hover:text-red-500" aria-label="Remove rule">
                    <X size={14} />
                  </button>
                </div>
              ))}
              {schemeRules.length === 0 && (
                <div className="rounded-lg border border-dashed border-line px-4 py-6 text-center text-sm text-dim">
                  No rules yet. Add your first front adjustment or check.
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {[
          {
            href: "/scheme/playbook", icon: BookOpen, title: "Playbook",
            sub: "Fronts, coverages, pressures, checks & adjustments — with diagrams, offensive looks, and per-position assignments.",
            cta: "Open Playbook",
          },
          {
            href: "/scheme/coverages", icon: Layers, title: "Coverage Library",
            sub: "30 match coverages — Cover 0 through Cut/Cross — with every defender's alignment, help, leverage, keys, and match rules.",
            cta: "Open Coverage Library",
          },
          {
            href: "/scheme/terminology", icon: SpellCheck, title: "Terminology",
            sub: "Your words appear everywhere. Map coach terms to system concepts — nothing is renamed to fit the software.",
            cta: "Review terminology",
          },
          {
            href: "/analysis", icon: ShieldCheck, title: "Defensive Analysis",
            sub: "Is the stored defense structurally sound? Strengths, concerns, and small recommendations — considerations, not corrections.",
            cta: "Run analysis",
          },
        ].map(({ href, icon: Icon, title, sub, cta }, i) => (
          <motion.div key={href} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 + i * 0.05 }}>
            <Link
              href={href}
              className={`group flex h-full flex-col ${card} p-5 transition hover:border-grass hover:-translate-y-0.5`}
            >
              <Icon size={26} className="text-grass mb-3" />
              <h2 className="text-lg font-bold">{title}</h2>
              <p className="mt-1 text-sm text-dim flex-1">{sub}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-grass">
                {cta} <ChevronRight size={15} className="transition group-hover:translate-x-0.5" />
              </span>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
