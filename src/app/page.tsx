"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Users, Shield, ShieldCheck, Binoculars, ClipboardList, ChevronRight, Check, Circle } from "lucide-react";
import { useStore, useHydrated } from "@/lib/store";
import { computeFindings } from "@/lib/analyze";
import { getStructure } from "@/lib/football";

const card = "rounded-xl border border-line bg-card shadow-sm";

export default function Home() {
  const hydrated = useHydrated();
  const store = useStore();
  const { players, concepts, opponents, gamePlans, seasonSchedule, groups, activeGroupId } = store;

  if (!hydrated) return <div className="px-8 py-10 text-dim">Loading…</div>;

  const group = groups.find((g) => g.id === activeGroupId) ?? groups[0];
  const filled = Object.values(group.slots).filter((ids) => ids.length > 0).length;
  const rated = players.filter((p) => p.skills && Object.values(p.skills).some((v) => v != null)).length;
  const confirmed = concepts.filter((c) => c.confirmed);
  const real = opponents.filter((o) => !o.isDemo);
  const nextWeek = seasonSchedule.find((w) => w.opponent && !w.result);
  const nextOpp = real.find((o) => o.week === nextWeek?.week) ?? real[0] ?? opponents[0];
  const plan = nextOpp ? gamePlans.find((g) => g.opponentId === nextOpp.id) : undefined;
  const { findings } = computeFindings(store);
  const concerns = findings.filter((f) => f.status === "Potential Conflict").length;
  const recs = findings.filter((f) => f.status === "Needs Review").length;

  const systems = [
    {
      href: "/team", icon: Users, title: "My Team", n: 1,
      stat: `${players.length} players · ${filled}/${getStructure(group.structureId).slots.length} starters set · ${rated} graded`,
      steps: [
        { label: "Roster entered", done: players.length >= 11 },
        { label: "Depth chart filled", done: filled >= 11 },
        { label: "Starters graded (skills)", done: rated >= 11 },
      ],
    },
    {
      href: "/scheme", icon: Shield, title: "My Scheme", n: 2,
      stat: `${confirmed.length} concepts saved`,
      steps: [
        { label: "Base front & coverage", done: confirmed.some((c) => c.kind === "front") && confirmed.some((c) => c.kind === "coverage") },
        { label: "Pressures saved", done: confirmed.some((c) => c.kind === "pressure") },
        { label: "Adjustments taught", done: confirmed.filter((c) => c.kind === "adjustment").length >= 3 },
      ],
    },
    {
      href: "/analysis", icon: ShieldCheck, title: "Defensive Analysis", n: 3,
      stat: `${concerns} concern${concerns === 1 ? "" : "s"} · ${recs} recommendation${recs === 1 ? "" : "s"}`,
      steps: [
        { label: "No open conflicts", done: concerns === 0 },
        { label: "Recommendations reviewed", done: recs <= 2 },
      ],
    },
    {
      href: "/matchup", icon: Binoculars, title: "Opponent Matchup", n: 4,
      stat: nextOpp ? `${nextOpp.name}${nextOpp.isDemo ? " (demo)" : ""}` : "No opponent yet",
      steps: [
        { label: "Opponent scouted", done: real.length > 0 },
        { label: "Tendencies entered", done: !!nextOpp && nextOpp.runRate != null && !nextOpp.isDemo },
        { label: "Game plan generated", done: !!plan?.generatedAt },
      ],
    },
  ];

  return (
    <div className="px-6 py-10 max-w-6xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight">
            You call the shots. <span className="text-grass">AI does the homework.</span>
          </h1>
          <p className="text-dim mt-2 max-w-2xl">
            Four systems that feed each other: who we are, how we play, who they are, what we should do. Work in any of them — the others update.
          </p>
        </div>
        {nextWeek && (
          <Link href={nextOpp ? `/matchup?id=${nextOpp.id}` : "/matchup"} className={`${card} px-5 py-3 flex items-center gap-4 hover:border-grass`}>
            <div>
              <div className="display uppercase text-[10px] font-bold tracking-[0.15em] text-dim">This week</div>
              <div className="font-extrabold">Wk {nextWeek.week} vs {nextWeek.opponent}</div>
              <div className="text-xs text-dim">{plan?.generatedAt ? "Game plan ready" : "No game plan yet"}</div>
            </div>
            <ChevronRight size={16} className="text-dim" />
          </Link>
        )}
      </motion.div>

      <div className="grid gap-4 sm:grid-cols-2">
        {systems.map(({ href, icon: Icon, title, n, stat, steps }, i) => {
          const done = steps.filter((s) => s.done).length;
          return (
            <motion.div key={href} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 + i * 0.05 }}>
              <Link href={href} className={`group flex h-full flex-col ${card} p-6 transition hover:border-grass hover:-translate-y-0.5`}>
                <div className="flex items-center gap-3 mb-3">
                  <span className="grid size-8 place-items-center rounded-lg bg-navy text-white text-sm font-extrabold">{n}</span>
                  <Icon size={22} className="text-grass" />
                  <span className="ml-auto text-xs font-bold text-dim">{done}/{steps.length}</span>
                </div>
                <h2 className="text-xl font-bold">{title}</h2>
                <p className="text-sm text-dim mt-0.5">{stat}</p>
                <ul className="mt-3 flex flex-col gap-1 text-sm">
                  {steps.map((s) => (
                    <li key={s.label} className="flex items-center gap-2">
                      {s.done ? <Check size={14} className="text-emerald-600" /> : <Circle size={12} className="text-slate-300" />}
                      <span className={s.done ? "text-ink/80" : "text-dim"}>{s.label}</span>
                    </li>
                  ))}
                </ul>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-grass">
                  Open <ChevronRight size={15} className="transition group-hover:translate-x-0.5" />
                </span>
              </Link>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <Link href="/gameplan" className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-4 py-2 text-sm font-semibold text-dim hover:text-ink hover:border-dim">
          <ClipboardList size={15} /> Game Plans
        </Link>
      </div>
    </div>
  );
}
