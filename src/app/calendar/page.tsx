"use client";

import { motion } from "motion/react";
import PageHeader from "@/components/PageHeader";
import { schedule } from "@/lib/data";

const kindStyle: Record<string, string> = {
  practice: "border-grass/40 bg-grass/10 text-grass",
  film: "border-sky/40 bg-sky/10 text-sky",
  meeting: "border-mind/40 bg-mind/10 text-mind",
  team: "border-line bg-white/5 text-dim",
  game: "border-ember/50 bg-ember/15 text-ember",
};

export default function CalendarPage() {
  return (
    <div className="px-8 py-10 max-w-6xl mx-auto">
      <PageHeader
        eyebrow="Calendar"
        title="Game Week — Red Valley"
        sub="Sep 14–20 · Practices, film sessions, and game day in one place."
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7 xl:gap-2">
        {schedule.map((d, i) => (
          <motion.div
            key={d.day}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`rounded-xl border p-4 min-h-44 ${
              d.day === "Sat" ? "border-ember/50 bg-ember/5" : "border-line bg-card/80"
            }`}
          >
            <div className="flex items-baseline justify-between mb-3">
              <span className="display text-lg font-bold">{d.day}</span>
              <span className="text-xs text-dim">{d.date}</span>
            </div>
            <div className="flex flex-col gap-2">
              {d.items.map((it) => (
                <div key={it.title} className={`rounded-lg border px-2.5 py-2 text-xs leading-snug ${kindStyle[it.kind]}`}>
                  <div className="font-semibold tabular-nums">{it.time}</div>
                  <div className="mt-0.5">{it.title}</div>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
