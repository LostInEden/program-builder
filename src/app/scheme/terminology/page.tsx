"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowLeft } from "lucide-react";
import { useStore, useHydrated, slotLabelOf } from "@/lib/store";
import { structures, CONCEPTS, type Concept } from "@/lib/football";
import {
  DL_TECHNIQUES,
  GAPS,
  STRENGTH_RULES,
  FORMATION_TERMS,
  type StrengthRule,
} from "@/lib/recognize";

const TABS = ["Positions", "Formations", "Strength", "Reference"] as const;
type Tab = (typeof TABS)[number];

export default function TerminologyPage() {
  const hydrated = useHydrated();
  const {
    overrides, setSlotOverride,
    strengthRule, setStrengthRule,
    formationTerms, setFormationTerm,
  } = useStore();
  const [tab, setTab] = useState<Tab>("Positions");
  const [structureId, setStructureId] = useState(structures[0].id);

  if (!hydrated) return <div className="px-8 py-10 display text-dim">Loading…</div>;

  const structure = structures.find((s) => s.id === structureId)!;

  return (
    <div className="px-8 py-10 max-w-3xl mx-auto">
      <Link href="/scheme" className="inline-flex items-center gap-1.5 text-sm text-dim hover:text-ink mb-4">
        <ArrowLeft size={15} /> My Scheme
      </Link>

      <div className="mb-2 flex flex-wrap items-center gap-4">
        <h1 className="display text-4xl font-bold">Terminology</h1>
        <div className="ml-auto flex gap-1 rounded-full border border-line bg-card p-1">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`display rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                tab === t ? "bg-grass text-white" : "text-dim hover:text-ink"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      <p className="text-dim mb-6 max-w-xl">
        What you call things is what appears everywhere. The software recognizes structure from player location
        first, then applies your labels — you never rename anything to fit the software.
      </p>

      {tab === "Positions" && (
        <motion.div key={structureId} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <select
            value={structureId}
            onChange={(e) => setStructureId(e.target.value)}
            className="mb-3 rounded-lg border border-line bg-slate-50 px-3 py-2 display font-bold"
          >
            {structures.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <div className="rounded-xl border border-line bg-card/80 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="display uppercase text-xs tracking-widest text-dim border-b border-line bg-slate-50">
                  <th className="text-left px-5 py-3">Your term</th>
                  <th className="text-left px-5 py-3">Default</th>
                  <th className="text-left px-5 py-3">Level</th>
                  <th className="text-left px-5 py-3">Standard concept (internal)</th>
                </tr>
              </thead>
              <tbody>
                {structure.slots.map((slot, i) => {
                  const ov = overrides[structureId]?.[i];
                  return (
                    <tr key={i} className="border-b border-line/60 last:border-0">
                      <td className="px-5 py-2.5">
                        <input
                          value={slotLabelOf(overrides, structureId, i)}
                          onChange={(e) => setSlotOverride(structureId, i, { label: e.target.value })}
                          className="display w-24 rounded-lg border border-line bg-slate-50 px-3 py-1.5 font-bold text-grass"
                        />
                      </td>
                      <td className="px-5 py-2.5 text-dim">{slot.pos}</td>
                      <td className="px-5 py-2.5 text-dim capitalize">{slot.level}</td>
                      <td className="px-5 py-2.5">
                        <select
                          value={ov?.concept ?? slot.concept}
                          onChange={(e) => setSlotOverride(structureId, i, { concept: e.target.value as Concept })}
                          className="rounded-lg border border-line bg-slate-50 px-3 py-1.5 text-dim"
                        >
                          {CONCEPTS.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {tab === "Formations" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-sm text-dim mb-3 max-w-xl">
            When the Playbook recognizes an offensive look, these are the words it uses. Change any label to your
            own — recognition stays the same underneath.
          </p>
          <div className="rounded-xl border border-line bg-card/80 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="display uppercase text-xs tracking-widest text-dim border-b border-line bg-slate-50">
                  <th className="text-left px-5 py-3">Recognized structure</th>
                  <th className="text-left px-5 py-3">Your term</th>
                </tr>
              </thead>
              <tbody>
                {FORMATION_TERMS.map((name) => (
                  <tr key={name} className="border-b border-line/60 last:border-0">
                    <td className="px-5 py-2.5 text-dim">{name}</td>
                    <td className="px-5 py-2.5">
                      <input
                        value={formationTerms[name] ?? ""}
                        placeholder={name}
                        onChange={(e) => setFormationTerm(name, e.target.value)}
                        className="display w-40 rounded-lg border border-line bg-slate-50 px-3 py-1.5 font-bold text-grass placeholder:text-dim/50 placeholder:font-normal"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {tab === "Strength" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-xl">
          <p className="text-sm text-dim mb-4">
            The strength call tells the defense which side to align to. Pick the landmark your program uses — it
            drives the strength readout on every recognized look.
          </p>
          <div className="flex flex-col gap-2">
            {STRENGTH_RULES.map((r) => (
              <button
                key={r}
                onClick={() => setStrengthRule(r as StrengthRule)}
                className={`rounded-xl border px-5 py-3.5 text-left transition ${
                  strengthRule === r
                    ? "border-grass bg-grass/10"
                    : "border-line bg-card/80 hover:border-grass/40"
                }`}
              >
                <span className={`display font-bold ${strengthRule === r ? "text-grass" : ""}`}>{r}</span>
                <span className="block text-xs text-dim mt-0.5">
                  {r === "Receiver strength" && "Most WRs / passing strength"}
                  {r === "Tight end strength" && "Align to the TE side"}
                  {r === "Field location" && "Field or boundary"}
                  {r === "Personnel" && "Key player / best player"}
                  {r === "Structure" && "Strong side / weak side"}
                </span>
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {tab === "Reference" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid gap-5 sm:grid-cols-2">
          <div className="rounded-xl border border-line bg-card/80 overflow-hidden">
            <div className="display uppercase text-xs font-semibold tracking-[0.2em] text-dim px-5 py-3 bg-slate-50 border-b border-line">
              D-Line Techniques
            </div>
            <table className="w-full text-sm">
              <tbody>
                {DL_TECHNIQUES.map((t) => (
                  <tr key={t.tech} className="border-b border-line/60 last:border-0">
                    <td className="px-5 py-2 display font-bold text-grass w-14">{t.tech}</td>
                    <td className="px-5 py-2 text-dim">{t.alignment}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="rounded-xl border border-line bg-card/80 overflow-hidden self-start">
            <div className="display uppercase text-xs font-semibold tracking-[0.2em] text-dim px-5 py-3 bg-slate-50 border-b border-line">
              Gaps
            </div>
            <table className="w-full text-sm">
              <tbody>
                {GAPS.map((g) => (
                  <tr key={g.gap} className="border-b border-line/60 last:border-0">
                    <td className="px-5 py-2 display font-bold text-grass w-14">{g.gap}</td>
                    <td className="px-5 py-2 text-dim">{g.location}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </div>
  );
}
