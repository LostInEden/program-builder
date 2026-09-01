"use client";

import Link from "next/link";
import { BarChart3, ClipboardList, ShieldCheck } from "lucide-react";
import { useStore, useHydrated } from "@/lib/store";

const card = "rounded-xl border border-line bg-card shadow-sm";

export default function ReportsPage() {
  const hydrated = useHydrated();
  const { gamePlans, opponents, concepts, seasonSchedule } = useStore();
  if (!hydrated) return <div className="px-8 py-10 text-dim">Loading…</div>;

  const played = seasonSchedule.filter((w) => w.opponent && w.result);
  const wins = played.filter((w) => /^W/i.test(w.result ?? "")).length;

  return (
    <div className="px-6 py-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight">Reports</h1>
        <p className="text-dim mt-0.5">Season-level rollups. Numbers are computed from your data first, then written up — with sample sizes shown.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3 mb-5">
        {[
          { label: "Record", value: `${wins}-${played.length - wins}`, sub: `${played.length} games played` },
          { label: "Game plans", value: gamePlans.filter((g) => g.generatedAt).length, sub: `${opponents.filter((o) => !o.isDemo).length} opponents scouted` },
          { label: "Scheme size", value: concepts.filter((c) => c.confirmed).length, sub: "confirmed concepts" },
        ].map((s) => (
          <div key={s.label} className={`${card} p-5`}>
            <div className="display uppercase text-[10px] font-bold tracking-[0.15em] text-dim">{s.label}</div>
            <div className="text-3xl font-extrabold tabular-nums mt-1">{s.value}</div>
            <div className="text-xs text-dim">{s.sub}</div>
          </div>
        ))}
      </div>
      <div className={`${card} p-6`}>
        <div className="flex items-start gap-3">
          <BarChart3 size={22} className="text-grass shrink-0" />
          <div>
            <div className="font-bold">Season reports arrive as game plans accumulate.</div>
            <p className="text-sm text-dim mt-1 max-w-2xl">
              Planned here: week-over-week analysis results, which stored rules got used, opponent tendency comparisons, and a printable season summary. Nothing on this page is faked — it fills in as the season does.
            </p>
            <div className="mt-3 flex gap-2">
              <Link href="/gameplan" className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs font-semibold hover:border-dim"><ClipboardList size={13} /> Game Plans</Link>
              <Link href="/analysis" className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs font-semibold hover:border-dim"><ShieldCheck size={13} /> Defensive Analysis</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
