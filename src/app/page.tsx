"use client";
import VisualLibrary from "@/components/VisualLibrary";

import Link from "next/link";
import { motion } from "motion/react";
import { Users, Shield, ShieldCheck, Binoculars, ClipboardList, ListChecks, ChevronRight } from "lucide-react";
import { useStore, useHydrated, baseGroupFor, effectiveSlots } from "@/lib/store";
import { computeFindings } from "@/lib/analyze";
import { getStructure } from "@/lib/football";

const card = "rounded-xl border border-line bg-card shadow-sm";

export default function Home() {
  const hydrated = useHydrated();
  const store = useStore();
  const { players, concepts, opponents, gamePlans, seasonSchedule, groups, activeGroupId } = store;

  if (!hydrated) return <div className="px-8 py-10 text-dim">Loading…</div>;

  const group = groups.find((g) => g.id === activeGroupId) ?? groups[0];
  const filled = Object.values(effectiveSlots(group, baseGroupFor(groups, group.level))).filter((ids) => ids.length > 0).length;
  const rated = players.filter((p) => p.skills && Object.values(p.skills).some((v) => v != null)).length;
  const confirmed = concepts.filter((c) => c.confirmed);
  const real = opponents.filter((o) => !o.isDemo);
  const nextWeek = seasonSchedule.find((w) => w.opponent && !w.result);
  const nextOpp = opponents.find(o=>o.id===store.lastOpponentId) ?? real.find((o) => o.week === nextWeek?.week) ?? real[0] ?? opponents[0];
  const plan = nextOpp ? gamePlans.find((g) => g.opponentId === nextOpp.id) : undefined;
  const approved = plan?.meeting?.decisions.length ?? 0;
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
        { label: "Player evaluations available", done: rated > 0 },
      ],
    },
    {
      href: "/scheme", icon: Shield, title: "My Scheme", n: 2,
      stat: `${confirmed.length} concepts saved`,
      steps: [
        { label: "Base front & coverage", done: confirmed.some((c) => c.kind === "front") && confirmed.some((c) => c.kind === "coverage") },
        { label: "Your philosophy saved", done: !!store.scheme.philosophy.trim() },
        { label: "Adjustments taught", done: confirmed.some((c) => c.kind === "adjustment") },
      ],
    },
    {
      href: "/analysis", icon: ShieldCheck, title: "Defensive Analysis", n: 3,
      stat: `${concerns} concern${concerns === 1 ? "" : "s"} · ${recs} check${recs === 1 ? "" : "s"} to review`,
      steps: [
        { label: `${concerns} potential conflicts flagged`, done: false },
        { label: `${recs} checks need coaching review`, done: false },
      ],
    },
    {
      href: nextOpp ? `/matchup?id=${encodeURIComponent(nextOpp.id)}` : "/matchup", icon: Binoculars, title: "Opponent Matchup", n: 4,
      stat: nextOpp ? `${nextOpp.name}${nextOpp.isDemo ? " (demo)" : ""}` : "No opponent yet",
      // Q46: the week is scouting report → game plan → call sheet. Nothing else.
      steps: [
        { label: "Scouting report", done: !!nextOpp && !nextOpp.isDemo && nextOpp.plays.length > 0 },
        { label: `${approved} approved decisions`, done: approved > 0 },
        { label: "Practice looks selected", done: !!(nextOpp && store.practice[nextOpp.id]?.included.length) },
      ],
    },
  ];

  return (
    <div className="px-6 py-10 max-w-6xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight">
            Your Team. Your Scheme.<br /><span className="text-grass">Your Game Plan.</span>
          </h1>
          <p className="text-dim mt-2 max-w-2xl">
            Pick up where your staff left off.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <Link href={nextOpp ? `/scouting?id=${nextOpp.id}` : "/scouting"} className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-1.5 font-semibold hover:border-grass hover:text-grass">
              <Binoculars size={15} /> Scouting report
            </Link>
            <ChevronRight size={14} className="text-dim" />
            <Link href={nextOpp ? `/gameplan?id=${nextOpp.id}` : "/gameplan"} className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-1.5 font-semibold hover:border-grass hover:text-grass">
              <ClipboardList size={15} /> Game plan
            </Link>
            <ChevronRight size={14} className="text-dim" />
            <Link href={nextOpp ? `/practice?id=${nextOpp.id}` : "/practice"} className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-1.5 font-semibold hover:border-grass hover:text-grass">Practice</Link>
            <ChevronRight size={14} className="text-dim" />
            <Link href={nextOpp ? `/callsheet?id=${nextOpp.id}` : "/callsheet"} className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-1.5 font-semibold hover:border-grass hover:text-grass">
              <ListChecks size={15} /> Call sheet
            </Link>
          </div>
        </div>
        {nextOpp && (
          <Link href={nextOpp ? `/matchup?id=${nextOpp.id}` : "/matchup"} className={`${card} px-5 py-3 flex items-center gap-4 hover:border-grass`}>
            <div>
              <div className="display uppercase text-[10px] font-bold tracking-[0.15em] text-dim">Current opponent</div>
              <div className="font-extrabold">{nextOpp.week ? `Wk ${nextOpp.week} · ` : ""}{nextOpp.name}{nextOpp.isDemo ? " (demo)" : ""}</div>
              <div className="text-xs text-dim">{approved ? `${approved} decisions approved` : plan?.meeting ? "Planning in progress" : "Start planning"}</div>
            </div>
            <ChevronRight size={16} className="text-dim" />
          </Link>
        )}
      </motion.div>

      <VisualLibrary title="Your whiteboard" />
      <div className="grid gap-4 sm:grid-cols-2">
        {systems.map(({ href, icon: Icon, title, n, stat, steps }, i) => {
          const done = steps.filter((s) => s.done).length;
          return (
            <motion.div key={href} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 + i * 0.05 }}>
              <Link href={href} className={`group flex h-full flex-col ${card} p-6 transition hover:border-grass hover:-translate-y-0.5`}>
                <div className="flex items-center gap-3 mb-3">
                  <span className="grid size-8 place-items-center rounded-lg bg-navy text-white text-sm font-extrabold">{n}</span>
                  <Icon size={22} className="text-grass" />
                  <span className="ml-auto text-xs font-bold text-dim">{title === "Defensive Analysis" ? "Coach review" : `${done}/${steps.length} on file`}</span>
                </div>
                <h2 className="text-xl font-bold">{title}</h2>
                <p className="mt-1 text-sm">{({"My Team":"Who are our players, and what can they do?","My Scheme":"What do we teach, and why does it fit?","Defensive Analysis":"Where are we strong, vulnerable, or missing information?","Opponent Matchup":"What will challenge us this week?"} as Record<string,string>)[title]}</p><p className="text-sm text-dim mt-2">{stat}</p>

                <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-grass">
                  Open <ChevronRight size={15} className="transition group-hover:translate-x-0.5" />
                </span>
              </Link>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <Link href={nextOpp ? `/gameplan?id=${nextOpp.id}` : "/gameplan"} className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-4 py-2 text-sm font-semibold text-dim hover:text-ink hover:border-dim">
          <ClipboardList size={15} /> {nextOpp ? `Continue planning · ${nextOpp.name}` : "Start a game plan"}
        </Link>
      </div>
    </div>
  );
}
