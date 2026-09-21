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
    return { firstDownRun: counted ? counted.firstDownRun : o.firstDownRun, downDistance: counted?.downDistance ?? o.downDistance, personnel, formation, run, pass, players, priorities: priorities.slice(0, 5), runRate: counted ? counted.runRate : o.runRate, usage: keyPlayerUsage(plays).slice(0, 3) };
  }, [o]);
  const scout = `/scouting?id=${encodeURIComponent(o.id)}`;
  const details = `/matchup?id=${encodeURIComponent(o.id)}&view=details`;
  const rate = (value: number | null | undefined) => value == null ? "Not available" : `${value}% run · ${100 - value}% pass`;
  const rows = (items: [string, string][]) => <dl className="mt-3 divide-y divide-line/60 text-sm">{items.map(([label, value]) => <div key={label} className="grid grid-cols-[minmax(100px,0.8fr)_minmax(0,1.2fr)] gap-3 py-2"><dt className="text-dim">{label}</dt><dd className="font-semibold break-words">{value}</dd></div>)}</dl>;
  const more = "mt-auto pt-3 inline-block text-sm font-semibold text-gold hover:underline";
  return <div className="flex flex-col gap-4">
    <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
      <div><span className="font-bold">{o.name}</span><span className="text-dim"> · Week {o.week ?? "—"} · {o.record || "Record not entered"}</span>{o.isDemo && <span className="ml-2 text-gold text-xs">DEMO DATA</span>}</div>
      <Link href={details} className="text-gold font-semibold hover:underline">Edit Opponent Information</Link>
    </div>
    <section aria-labelledby="priorities-heading" className={`${card} border-t-4 border-t-grass p-5`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2"><h2 id="priorities-heading" className="text-xl font-extrabold">Game Plan Priorities</h2><p className="text-xs text-gold font-semibold">What matters this week?</p></div>
      <ol className={`mt-4 grid gap-3 sm:grid-cols-2 ${summary.priorities.length > 3 ? "xl:grid-cols-5" : "md:grid-cols-3"}`}>
        {summary.priorities.map((p, i) => <li key={`${p.section}-${p.title}`} className="min-w-0 rounded-lg border border-line bg-pitch/40 p-4">
          <div className="flex items-start gap-2"><span className="grid size-6 shrink-0 place-items-center rounded bg-grass text-white text-xs font-bold">{i + 1}</span><h3 className="font-bold break-words">{p.title}</h3></div>
          <p className="text-sm text-dim mt-2">{p.detail}</p>
          <details className="mt-3 text-sm"><summary className="cursor-pointer text-gold font-semibold w-fit">View Evidence</summary><div className="mt-2 rounded-lg bg-panel p-3"><p>{p.evidence}</p><Link className="inline-block mt-2 text-gold hover:underline" href={`${scout}#${p.section}`}>Open scout details →</Link></div></details>
        </li>)}
      </ol>
      {summary.priorities.length < 3 && <p className="text-sm text-dim mt-3">{summary.priorities.length ? "More scouting data is needed to identify additional priorities." : "Upload a report or add scouting details to identify this week’s priorities."} <Link className="text-gold hover:underline" href={details}>Add scouting details →</Link></p>}
    </section>

    <div className="grid md:grid-cols-2 gap-4">
      <section aria-labelledby="identity-heading" className={`${card} p-5 min-w-0`}>
        <h2 id="identity-heading" className={heading}>Offensive Identity</h2>
        {rows([["Run / Pass", rate(summary.runRate)], ["Top Personnel", summary.personnel?.group ?? "Not available"], ["Top Formation", summary.formation?.name ?? "Not available"], ["Offensive Style", o.offensiveStyle || "Not entered"], ["Tempo", o.tempo || "Not entered"]])}
      </section>
      <section aria-labelledby="players-heading" className={`${card} p-5 min-w-0 flex flex-col`}>
        <h2 id="players-heading" className={heading}>Key Players</h2>
        <div className="mt-3 divide-y divide-line/60">
          {summary.players.slice(0, 3).map(p => <Link key={p.id} href={`${scout}#players`} className="block py-3 text-sm font-semibold hover:text-gold">{p.jersey && <span className="text-gold mr-2">#{p.jersey} </span>}{p.name || "Unnamed player"}{p.pos && <span className="text-dim"> — {p.pos}</span>}</Link>)}
          {!summary.players.length && summary.usage.map(p => <Link key={p.player} href={`${scout}#players`} className="block py-3 text-sm font-semibold">{p.player} <span className="text-dim">· {p.touches} tagged touches</span></Link>)}
          {!summary.players.length && !summary.usage.length && <p className="text-sm text-dim py-3">No key players identified yet.</p>}
        </div>
        <Link href={`${scout}#players`} className={more}>View All Players →</Link>
      </section>
      <section aria-labelledby="what-heading" className={`${card} p-5 min-w-0 flex flex-col`}>
        <h2 id="what-heading" className={heading}>What They Do</h2>
        {rows([["Top Run", summary.run?.name ?? "Not available"], ["Top Pass", summary.pass?.name ?? "Not available"], ["Top Formation", summary.formation?.name ?? "Not available"], ["Top Personnel", summary.personnel?.group ?? "Not available"]])}
        <Link href={`${scout}#plays`} className={more}>View Tendencies →</Link>
      </section>
      <section aria-labelledby="when-heading" className={`${card} p-5 min-w-0 flex flex-col`}>
        <h2 id="when-heading" className={heading}>When They Do It</h2>
        {rows([["1st Down", rate(summary.firstDownRun)], ["3rd Down · 7+", rate(summary.downDistance["3rd"]["Long (7+)"])], ["Red Zone", o.redZone.trim() ? (o.redZone.length > 105 ? `${o.redZone.slice(0, 102)}…` : o.redZone) : "Not entered"], ["Short Yardage · 3rd & 1–3", rate(summary.downDistance["3rd"]["Short (1-3)"])]])}
        <Link href={`${scout}&view=situations`} className={more}>View Situations →</Link>
      </section>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3 pt-1 pb-3">
      <p className="text-xs text-dim">{o.plays?.length ? `From ${o.plays.length} uploaded snaps and saved scouting notes.` : "From saved scouting entries."}</p>
      <div className="flex flex-wrap gap-3"><Link href={scout} className={secondary}>View Full Scout</Link><Link href={`/gameplan?id=${encodeURIComponent(o.id)}`} className="rounded-lg bg-grass px-5 py-2 text-sm font-bold text-white hover:bg-grass-deep">Build Game Plan →</Link></div>
    </div>
  </div>;
}
