"use client";

import { motion } from "motion/react";
import PageHeader from "@/components/PageHeader";
import { opponent } from "@/lib/data";
import { AlertTriangle, Target, Star } from "lucide-react";

export default function WeekPage() {
  return (
    <div className="px-8 py-10 max-w-6xl mx-auto">
      <PageHeader
        eyebrow="This Week"
        title={`vs ${opponent.name}`}
        sub={`${opponent.kickoff} · ${opponent.record} · ${opponent.scheme}`}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Tendencies */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-line bg-card/80 p-6"
        >
          <div className="display uppercase text-xs font-semibold tracking-[0.2em] text-dim mb-5 flex items-center gap-2">
            <Target size={14} className="text-ember" /> Offensive Tendencies
            <span className="ml-auto normal-case tracking-normal font-normal">n = 184 plays</span>
          </div>
          <div className="flex flex-col gap-4">
            {opponent.tendencies.map((t, i) => (
              <div key={t.label}>
                <div className="flex items-baseline justify-between text-sm mb-1">
                  <span>{t.label}</span>
                  <span className="font-semibold tabular-nums text-ember">{t.value}%</span>
                </div>
                <div className="h-2 rounded bg-line overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${t.value}%` }}
                    transition={{ duration: 0.6, delay: 0.1 + i * 0.08 }}
                    className="h-full bg-ember rounded"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-center gap-3 rounded-lg border border-mind/30 bg-mind/10 px-4 py-3">
            <Star size={18} className="text-mind shrink-0" />
            <div className="text-sm">
              <span className="font-semibold">
                Key player: #{opponent.keyPlayer.jersey} {opponent.keyPlayer.pos} ({opponent.keyPlayer.size})
              </span>
              <span className="text-dim"> — {opponent.keyPlayer.note}</span>
            </div>
          </div>
        </motion.div>

        {/* Weaknesses */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="rounded-xl border border-line bg-card/80 p-6"
        >
          <div className="display uppercase text-xs font-semibold tracking-[0.2em] text-dim mb-5 flex items-center gap-2">
            <AlertTriangle size={14} className="text-grass" /> Exploitable Weaknesses
          </div>
          <div className="flex flex-col gap-3">
            {opponent.weaknesses.map((w, i) => (
              <div key={i} className="flex gap-3 rounded-lg border border-line bg-slate-50 px-4 py-3.5 text-sm">
                <span className="display font-bold text-grass">{String(i + 1).padStart(2, "0")}</span>
                <span>{w}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-dim">
            Sourced from 3 games of breakdown data. Every claim links back to the plays behind it.
          </p>
        </motion.div>
      </div>

      {/* Game plan calls */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.16 }}
        className="mt-6 rounded-xl border border-line bg-card/80 p-6"
      >
        <div className="display uppercase text-xs font-semibold tracking-[0.2em] text-dim mb-5">
          Recommended Game Plan — by situation
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-150">
            <thead>
              <tr className="display uppercase text-xs tracking-widest text-dim border-b border-line">
                <th className="text-left py-2 pr-6">Situation</th>
                <th className="text-left py-2 pr-6">Call</th>
                <th className="text-left py-2">Why</th>
              </tr>
            </thead>
            <tbody>
              {opponent.planCalls.map((c) => (
                <tr key={c.situation} className="border-b border-line/60 last:border-0">
                  <td className="py-3.5 pr-6 display font-bold text-ember whitespace-nowrap">{c.situation}</td>
                  <td className="py-3.5 pr-6 font-semibold whitespace-nowrap">{c.call}</td>
                  <td className="py-3.5 text-dim">{c.why}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <button className="display rounded-full bg-grass px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-110">
            Export Call Sheet (PDF)
          </button>
          <button className="display rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-dim transition hover:text-ink hover:border-dim">
            Print Scout Cards
          </button>
        </div>
      </motion.div>
    </div>
  );
}
