"use client";

import Link from "next/link";
import { Shield } from "lucide-react";
import { useHydrated, useStore } from "@/lib/store";

export default function SelfScoutPage() {
  const hydrated = useHydrated();
  const programName = useStore((s) => s.program.name);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <Link href="/gameplan" className="mb-3 inline-block text-sm text-dim hover:text-ink">← Game Plans</Link>
      <header className="mb-6">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-grass">
          <Shield size={17} /> Defense
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">Self Scout</h1>
        <p className="mt-2 text-dim">
          A look at {hydrated && programName ? `${programName}’s` : "your team’s"} defensive tendencies from your own game snaps.
        </p>
      </header>

      <section aria-labelledby="report-status" className="rounded-xl border border-line bg-card p-6 shadow-sm sm:p-8">
        <span className="inline-block rounded-full border border-line px-3 py-1 text-xs font-semibold text-dim">Report not available yet</span>
        <h2 id="report-status" className="mt-4 text-xl font-bold">Start with what your defense actually calls</h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-dim">
          Self scout will use your defensive game snaps to show how often you call each front, coverage, and pressure in different situations.
          Saving and importing those snaps, and calculating this report, still need to be added.
        </p>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-dim">
          Your saved scheme describes what you can call; it doesn’t show how often you call it in games.
          No tendency percentages are available here yet.
        </p>
        <div className="mt-6 border-t border-line pt-5">
          <h3 className="font-semibold">Defense first. Offense later.</h3>
          <p className="mt-2 text-sm text-dim">When offense is added to CounterScheme, Self scout will cover both sides of your team.</p>
        </div>
      </section>
    </div>
  );
}
