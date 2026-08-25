"use client";

import { motion } from "motion/react";
import PageHeader from "@/components/PageHeader";
import { practicePlan } from "@/lib/data";
import { Clock, Printer } from "lucide-react";

export default function PracticePage() {
  const total = practicePlan.periods.reduce((s, p) => s + p.min, 0);

  return (
    <div className="px-8 py-10 max-w-5xl mx-auto">
      <PageHeader
        eyebrow="Practice"
        title="Practice Script"
        sub={`${practicePlan.date} · Theme: ${practicePlan.theme}`}
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-2 rounded-full border border-line bg-card px-4 py-2 text-sm text-dim">
          <Clock size={15} className="text-grass" /> {total} minutes · {practicePlan.periods.length} periods
        </span>
        <button className="display ml-auto inline-flex items-center gap-2 rounded-full border border-grass/50 px-5 py-2 text-sm font-semibold text-grass transition hover:bg-grass hover:text-pitch">
          <Printer size={15} /> Print script cards
        </button>
      </div>

      <div className="flex flex-col gap-2.5">
        {practicePlan.periods.map((p, i) => (
          <motion.div
            key={p.n}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="grid grid-cols-[56px_72px_1fr_auto] items-center gap-4 rounded-xl border border-line bg-card/80 px-5 py-4"
          >
            <span className="display text-2xl font-bold text-grass tabular-nums">{p.n}</span>
            <div className="leading-tight">
              <div className="font-semibold tabular-nums text-sm">{p.time}</div>
              <div className="text-xs text-dim">{p.min} min</div>
            </div>
            <div className="leading-snug min-w-0">
              <div className="font-semibold">{p.name}</div>
              <div className="text-sm text-dim truncate">{p.detail}</div>
            </div>
            <span className="rounded-full border border-sky/40 bg-sky/10 px-3 py-1 text-xs text-sky whitespace-nowrap">
              {p.unit}
            </span>
          </motion.div>
        ))}
      </div>

      <p className="mt-5 text-sm text-dim">
        Periods link to your drill library and this week&apos;s opponent scout — scripts stay in sync when the game plan changes.
      </p>
    </div>
  );
}
