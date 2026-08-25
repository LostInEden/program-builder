"use client";

import { motion } from "motion/react";
import PageHeader from "@/components/PageHeader";
import { reportCards } from "@/lib/data";
import { FileText, ChevronRight } from "lucide-react";

const accents: Record<string, { border: string; text: string }> = {
  grass: { border: "border-grass/40 hover:border-grass", text: "text-grass" },
  sky: { border: "border-sky/40 hover:border-sky", text: "text-sky" },
  ember: { border: "border-ember/40 hover:border-ember", text: "text-ember" },
  mind: { border: "border-mind/40 hover:border-mind", text: "text-mind" },
};

export default function ReportsPage() {
  return (
    <div className="px-8 py-10 max-w-5xl mx-auto">
      <PageHeader
        eyebrow="Reports"
        title="Reports"
        sub="Every report is computed from your data first, then written up in plain English — with sample sizes shown."
      />

      <div className="grid gap-5 sm:grid-cols-2">
        {reportCards.map((r, i) => {
          const a = accents[r.accent];
          return (
            <motion.button
              key={r.title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className={`group rounded-2xl border bg-card/80 p-6 text-left transition-all hover:-translate-y-0.5 ${a.border}`}
            >
              <div className={`mb-4 inline-flex rounded-lg border border-line bg-black/25 p-2.5 ${a.text}`}>
                <FileText size={20} />
              </div>
              <h2 className="display text-xl font-bold">{r.title}</h2>
              <p className="mt-1.5 text-sm text-dim leading-relaxed">{r.desc}</p>
              <div className="mt-4 flex items-center justify-between">
                <span className={`text-xs font-semibold ${a.text}`}>{r.stat}</span>
                <ChevronRight size={16} className="text-dim transition group-hover:translate-x-0.5 group-hover:text-ink" />
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
