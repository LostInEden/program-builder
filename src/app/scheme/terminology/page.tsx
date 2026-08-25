"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowLeft } from "lucide-react";
import { useStore, useHydrated, slotLabelOf } from "@/lib/store";
import { structures, CONCEPTS, type Concept } from "@/lib/football";

export default function TerminologyPage() {
  const hydrated = useHydrated();
  const { overrides, setSlotOverride } = useStore();
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
        <select
          value={structureId}
          onChange={(e) => setStructureId(e.target.value)}
          className="rounded-lg border border-line bg-black/25 px-3 py-2 display font-bold"
        >
          {structures.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>
      <p className="text-dim mb-6 max-w-xl">
        What you call each position is what appears everywhere in Program Builder. The standard concept on the
        right is only used internally so the AI understands relationships — you never have to rename anything to
        fit the software.
      </p>

      <motion.div
        key={structureId}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-line bg-card/80 overflow-hidden"
      >
        <table className="w-full text-sm">
          <thead>
            <tr className="display text-xs tracking-widest text-dim border-b border-line bg-black/30">
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
                      className="display w-24 rounded-lg border border-line bg-black/25 px-3 py-1.5 font-bold text-grass"
                    />
                  </td>
                  <td className="px-5 py-2.5 text-dim">{slot.pos}</td>
                  <td className="px-5 py-2.5 text-dim capitalize">{slot.level}</td>
                  <td className="px-5 py-2.5">
                    <select
                      value={ov?.concept ?? slot.concept}
                      onChange={(e) => setSlotOverride(structureId, i, { concept: e.target.value as Concept })}
                      className="rounded-lg border border-line bg-black/25 px-3 py-1.5 text-dim"
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
      </motion.div>
    </div>
  );
}
