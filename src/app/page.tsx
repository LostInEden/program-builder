"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Users, Shield, ShieldCheck, Binoculars, ChevronRight, CalendarDays, Dumbbell, BarChart3 } from "lucide-react";
import { useStore, useHydrated } from "@/lib/store";

const card = "rounded-xl border border-line bg-card shadow-sm";

const MODULES = [
  {
    n: 1, href: "/team", icon: Users, title: "My Team",
    sub: "Manage players and depth chart — roster, measurables, ratings, injuries, watch list.",
  },
  {
    n: 2, href: "/scheme", icon: Shield, title: "My Scheme",
    sub: "Teach the software how your defense works — structure, rules & adjustments, playbook, terminology.",
  },
  {
    n: 3, href: "/analysis", icon: ShieldCheck, title: "Defensive Analysis",
    sub: "Your saved defense, checked — strengths, concerns, and small recommendations.",
  },
  {
    n: 4, href: "/scout", icon: Binoculars, title: "Opponent Scout + Game Plan",
    sub: "Scouting + your data combine into a clear weekly plan with 3–5 key answers.",
  },
];

export default function Home() {
  const hydrated = useHydrated();
  const { players, opponent, seasonSchedule } = useStore();
  const nextGame = seasonSchedule.find((w) => w.opponent && !w.result);

  return (
    <div className="px-6 py-10 max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-4xl font-extrabold tracking-tight">
          You call the shots. <span className="text-grass">AI does the homework.</span>
        </h1>
        <p className="text-dim mt-2 max-w-2xl">
          Enter your team, teach the system your defense, enter an opponent — and get clear, team-specific
          defensive answers. Four systems, one flow.
        </p>
        {hydrated && (
          <p className="text-sm text-dim mt-3">
            {players.length} players on the roster
            {nextGame ? ` · next game: Wk ${nextGame.week} vs ${nextGame.opponent}` : ` · this week: vs ${opponent.name}`}
          </p>
        )}
      </motion.div>

      <div className="grid gap-4 sm:grid-cols-2">
        {MODULES.map(({ n, href, icon: Icon, title, sub }, i) => (
          <motion.div key={href} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 + i * 0.05 }}>
            <Link href={href} className={`group flex h-full flex-col ${card} p-6 transition hover:border-grass hover:-translate-y-0.5`}>
              <div className="flex items-center gap-3 mb-3">
                <span className="grid size-8 place-items-center rounded-lg bg-navy text-white text-sm font-extrabold">{n}</span>
                <Icon size={22} className="text-grass" />
              </div>
              <h2 className="text-xl font-bold">{title}</h2>
              <p className="mt-1 text-sm text-dim flex-1">{sub}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-grass">
                Open <ChevronRight size={15} className="transition group-hover:translate-x-0.5" />
              </span>
            </Link>
          </motion.div>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        {[
          { href: "/calendar", icon: CalendarDays, label: "Calendar" },
          { href: "/practice", icon: Dumbbell, label: "Practice" },
          { href: "/reports", icon: BarChart3, label: "Reports" },
        ].map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-4 py-2 text-sm font-semibold text-dim transition hover:text-ink hover:border-dim"
          >
            <Icon size={15} /> {label}
          </Link>
        ))}
      </div>
    </div>
  );
}
