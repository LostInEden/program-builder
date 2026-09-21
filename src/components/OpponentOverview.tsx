"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { Opponent } from "@/lib/store";
import { computeTells, headlineFromPlays, playRows, tellSentence, keyPlayerUsage } from "@/lib/tendencies";

const card = "rounded-xl border border-line bg-card";
const heading = "text-xs font-bold uppercase tracking-[0.15em]";
const secondary = "rounded-lg border border-line px-4 py-2 text-sm font-semibold hover:border-gold";

export default function OpponentOverview({ opponent: o }: { opponent: Opponent }) {
  // Read-only presentation of the existing scout calculations and saved entries.
  const summary = useMemo(() => {
    const plays = o.plays ?? [];
    const counted = plays.length ? headlineFromPlays(plays) : null;
    const ranked = <T,>(rows: T[], value: (row: T) => number | null | undefined) =>
      rows.filter(row => value(row) != null && value(row)! > 0).sort((a, b) => (value(b) ?? -1) - (value(a) ?? -1));
    const personnel = ranked((counted?.personnelUsage ?? o.personnelUsage).filter(p => p.group.trim()), p => p.pct)[0];
    const formation = ranked((counted?.formations ?? o.formations).filter(f => f.name.trim()), f => f.snapsPct)[0];
    const concepts = plays.length
      ? playRows(plays).map(c => ({ ...c, freq: c.n, notes: `${c.n} tagged snaps` }))
      : o.concepts.filter(c => c.name.trim());
    const topConcept = (type: string) => ranked(concepts.filter(c => c.type === type), c => c.freq)[0];
    const run = topConcept("Run"), pass = topConcept("Pass");
    const players = o.keyPlayers.filter(p => p.name.trim() || p.jersey?.trim());
    const priorities: { title: string; detail: string; evidence: string; section: string }[] = [];
    if (plays.length) {
      for (const tell of computeTells(plays).actionable.slice(0, 3)) priorities.push({
        title: `${tell.outcome} — ${tell.condition}`, detail: `${Math.round(tell.rate * 100)}% · ${tell.hits} of ${tell.n} tagged snaps`,
        evidence: tellSentence(tell), section: "tells",
      });
    }
    for (const concept of [run, pass]) if (concept && !priorities.some(p => p.title.startsWith(`${concept.name} —`))) priorities.push({
      title: concept.name, detail: `${concept.type} concept${concept.freq != null ? ` · ${concept.freq} recorded snaps` : ""}`,
      evidence: concept.notes || "From the opponent’s saved scouting concepts.", section: "plays",
    });
    if (players[0]) priorities.push({ title: `${players[0].jersey ? `#${players[0].jersey} ` : ""}${players[0].name}`,
      detail: `${players[0].pos || "Player"} · Coach-identified key player`, evidence: players[0].notes || "Listed among the opponent’s key players.", section: "players" });
    if (priorities.length < 3 && formation) priorities.push({ title: formation.name, detail: `Top formation${formation.snapsPct != null ? ` · ${formation.snapsPct}% of snaps` : ""}`, evidence: formation.notes || "From the opponent’s formation breakdown.", section: "formations" });
    return { personnel, formation, run, pass, players, priorities: priorities.slice(0, 5), runRate: counted ? counted.runRate : o.runRate, usage: keyPlayerUsage(plays).slice(0, 3) };
  }, [o]);
  const scout = `/scouting?id=${encodeURIComponent(o.id)}`;
  const details = `/matchup?id=${encodeURIComponent(o.id)}&view=details`;
  return <div className="flex flex-col gap-5 max-w-6xl mx-auto">
    <section aria-labelledby="opponent-heading" className={`${card} p-5`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><p className={`${heading} text-gold`}>This week&apos;s opponent {o.isDemo && "· Demo data"}</p><h2 id="opponent-heading" className="mt-1 text-2xl font-extrabold">{o.name}</h2></div>
        <Link href={details} className={secondary}>Edit Opponent Information</Link>
      </div>
      <dl className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
        {[["Week", o.week ?? "Not set"], ["Record", o.record || "Not entered"], ["Offensive style", o.offensiveStyle || "Not entered"], ["Tempo", o.tempo || "Not entered"]].map(([label, value]) => <div key={label}><dt className="text-dim text-xs">{label}</dt><dd className="mt-1 font-semibold">{value}</dd></div>)}
      </dl>
    </section>

    <section aria-labelledby="priorities-heading" className={`${card} border-t-4 border-t-grass p-5 sm:p-6`}>
      <p className={`${heading} text-gold`}>What matters this week?</p>
      <h2 id="priorities-heading" className="mt-1 text-2xl font-extrabold">Game Plan Priorities</h2>
      <p className="mt-1 text-sm text-dim">Prepare for these tendencies, concepts, and threats.</p>
      <ol className="mt-4 divide-y divide-line">
        {summary.priorities.map((p, i) => <li key={`${p.section}-${p.title}`} className="flex gap-4 py-4">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-grass text-white font-bold">{i + 1}</span>
          <div className="min-w-0 flex-1"><h3 className="font-bold text-lg break-words">{p.title}</h3><p className="text-sm text-dim mt-0.5">{p.detail}</p>
            <details className="mt-2 text-sm"><summary className="cursor-pointer text-gold font-semibold w-fit">View Evidence</summary><div className="mt-2 rounded-lg bg-panel p-3"><p>{p.evidence}</p><Link className="inline-block mt-2 text-gold hover:underline" href={`${scout}#${p.section}`}>Open scout details →</Link></div></details>
          </div>
        </li>)}
      </ol>
      {summary.priorities.length < 3 && <p className="text-sm text-dim py-4">{summary.priorities.length ? "More scouting data is needed to identify additional priorities." : "Upload a report or add scouting details to identify this week’s priorities."} <Link className="text-gold hover:underline" href={details}>Add scouting details →</Link></p>}
    </section>

    <section aria-labelledby="quick-heading" className={`${card} p-5`}>
      <div className="flex justify-between gap-3 items-center"><h2 id="quick-heading" className={heading}>Quick Tendencies</h2><Link href={scout} className="text-sm font-semibold text-gold hover:underline">View Full Scout →</Link></div>
      <dl className="mt-4 grid grid-cols-2 lg:grid-cols-5 gap-5 text-sm">
        {[["Run / Pass", summary.runRate != null ? `${summary.runRate}% / ${100 - summary.runRate}%` : "Not available"], ["Top personnel", summary.personnel?.group ?? "Not available"], ["Top formation", summary.formation?.name ?? "Not available"], ["Top run concept", summary.run?.name ?? "Not available"], ["Top pass concept", summary.pass?.name ?? "Not available"]].map(([label, value]) => <div key={label}><dt className="text-xs text-dim">{label}</dt><dd className="font-bold mt-1">{value}</dd></div>)}
      </dl>
      <p className="mt-4 text-xs text-dim">{o.plays?.length ? `From ${o.plays.length} uploaded snaps; untagged information is not inferred.` : "From saved scouting entries."}</p>
    </section>

    <section aria-labelledby="players-heading" className={`${card} p-5`}>
      <h2 id="players-heading" className={heading}>Key Players</h2>
      <div className="mt-3 flex flex-wrap gap-3">
        {summary.players.slice(0, 3).map(p => <Link key={p.id} href={`${scout}#players`} className="rounded-lg bg-panel px-4 py-3 text-sm font-semibold hover:outline hover:outline-gold">{p.jersey && <span className="text-gold mr-2">#{p.jersey}</span>}{p.name || "Unnamed player"}{p.pos && <span className="text-dim"> — {p.pos}</span>}</Link>)}
        {!summary.players.length && summary.usage.map(p => <Link key={p.player} href={`${scout}#players`} className="rounded-lg bg-panel px-4 py-3 text-sm font-semibold">{p.player} <span className="text-dim">· {p.touches} tagged touches</span></Link>)}
        {!summary.players.length && !summary.usage.length && <p className="text-sm text-dim">No key players identified yet.</p>}
      </div>
    </section>
    <div className="flex flex-wrap justify-end gap-3 pt-1 pb-3"><Link href={scout} className={secondary}>View Full Scout</Link><Link href={`/gameplan?id=${encodeURIComponent(o.id)}`} className="rounded-lg bg-grass px-5 py-2 text-sm font-bold text-white hover:bg-grass-deep">Build Game Plan →</Link></div>
  </div>;
}
