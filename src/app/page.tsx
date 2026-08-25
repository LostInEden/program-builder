"use client";

import Link from "next/link";
import { motion } from "motion/react";
import {
  Users,
  ShieldCheck,
  ClipboardList,
  Brain,
  ChevronRight,
  Star,
  BarChart2,
} from "lucide-react";
import { opponent as opponentStatic } from "@/lib/data";
import { useStore, useHydrated } from "@/lib/store";

const pillars = [
  {
    href: "/team",
    title: "My Team",
    desc: "Manage your roster, players, and personnel strengths.",
    icon: Users,
    card: "border-grass/40 hover:border-grass bg-gradient-to-b from-grass/10 to-transparent",
    iconColor: "text-grass",
    ring: "border-grass/50 text-grass group-hover:bg-grass group-hover:text-pitch",
    bar: "bg-grass",
  },
  {
    href: "/scheme",
    title: "My Scheme",
    desc: "Build your defense, assign rules, and stress test your scheme.",
    icon: ShieldCheck,
    card: "border-sky/40 hover:border-sky bg-gradient-to-b from-sky/10 to-transparent",
    iconColor: "text-sky",
    ring: "border-sky/50 text-sky group-hover:bg-sky group-hover:text-pitch",
    bar: "bg-sky",
  },
  {
    href: "/week",
    title: "This Week",
    desc: "Scout opponent, find weaknesses, and build your game plan.",
    icon: ClipboardList,
    card: "border-ember/40 hover:border-ember bg-gradient-to-b from-ember/10 to-transparent",
    iconColor: "text-ember",
    ring: "border-ember/50 text-ember group-hover:bg-ember group-hover:text-pitch",
    bar: "bg-ember",
  },
  {
    href: "/ask",
    title: "Ask AI",
    desc: "Ask anything. Get football answers instantly.",
    icon: Brain,
    card: "border-mind/40 hover:border-mind bg-gradient-to-b from-mind/10 to-transparent",
    iconColor: "text-mind",
    ring: "border-mind/50 text-mind group-hover:bg-mind group-hover:text-pitch",
    bar: "bg-mind",
  },
];

export default function HomePage() {
  const hydrated = useHydrated();
  const stored = useStore((s) => s.opponent);
  const opponent = {
    ...opponentStatic,
    name: hydrated ? stored.name : opponentStatic.name,
    kickoff: hydrated ? stored.kickoff : opponentStatic.kickoff,
  };
  return (
    <div className="px-8 py-10 max-w-6xl mx-auto">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center mb-10"
      >
        <div className="display text-5xl font-bold mb-1">
          <span className="text-grass">P</span>
          <span className="text-ink">B</span>
        </div>
        <div className="display text-sm font-semibold tracking-[0.25em] text-ink mb-6">
          Program Builder <span className="text-grass">AI</span>
        </div>
        <h1 className="display text-4xl md:text-5xl font-bold text-ink text-balance">
          Your Team. Your Scheme. Smarter Game Plans.
        </h1>
        <p className="mt-3 text-lg text-dim">
          AI that thinks football, so you can coach.
        </p>
      </motion.div>

      {/* Pillar cards */}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {pillars.map((p, i) => (
          <motion.div
            key={p.href}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.1 + i * 0.08 }}
          >
            <Link
              href={p.href}
              className={`group flex h-full flex-col items-center rounded-2xl border p-8 text-center transition-all duration-300 hover:-translate-y-1 ${p.card}`}
            >
              <p.icon size={56} strokeWidth={1.5} className={`${p.iconColor} mb-6`} />
              <h2 className="display text-2xl font-bold text-ink">{p.title}</h2>
              <span className={`mt-2 mb-4 h-0.5 w-8 rounded ${p.bar}`} />
              <p className="text-sm text-dim leading-relaxed flex-1">{p.desc}</p>
              <span
                className={`mt-6 grid size-10 place-items-center rounded-full border transition-colors ${p.ring}`}
              >
                <ChevronRight size={18} />
              </span>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* This week at a glance */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.5 }}
        className="mt-8 rounded-2xl border border-line bg-card/80 px-6 py-5"
      >
        <div className="display text-xs font-semibold tracking-[0.2em] text-dim mb-4">
          This Week at a Glance
        </div>
        <div className="flex flex-wrap items-center gap-x-10 gap-y-4">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-full bg-red-500/15 text-red-400 display font-bold">
              {opponent.name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
            </span>
            <div className="leading-tight">
              <div className="font-semibold">vs {opponent.name}</div>
              <div className="text-sm text-dim">{opponent.kickoff}</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <svg viewBox="0 0 40 40" className="size-11 -rotate-90">
              <circle cx="20" cy="20" r="16" fill="none" stroke="#232d26" strokeWidth="5" />
              <circle
                cx="20" cy="20" r="16" fill="none" stroke="#4ade80" strokeWidth="5"
                strokeDasharray={`${(opponent.runRate / 100) * 100.5} 100.5`}
                strokeLinecap="round"
              />
            </svg>
            <div className="leading-tight">
              <div className="font-semibold">
                <span className="text-grass">{opponent.runRate}%</span> Opponent Run Rate
              </div>
              <div className="text-sm text-dim">(Last 3 Games)</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <BarChart2 className="text-ember" size={26} />
            <div className="leading-tight">
              <div className="font-semibold">Top Formation</div>
              <div className="text-sm text-dim">17 Personnel (42%)</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Star className="text-mind" size={24} />
            <div className="leading-tight">
              <div className="font-semibold">Key Player</div>
              <div className="text-sm text-dim">
                #{opponent.keyPlayer.jersey} {opponent.keyPlayer.pos} / {opponent.keyPlayer.size}
              </div>
            </div>
          </div>

          <Link
            href="/week"
            className="ml-auto display inline-flex items-center gap-2 rounded-full border border-grass/50 px-5 py-2.5 text-sm font-semibold text-grass transition-colors hover:bg-grass hover:text-pitch"
          >
            Quick Scout <ChevronRight size={16} />
          </Link>
        </div>
      </motion.div>

      <p className="mt-8 text-center text-sm text-dim">
        You call the shots. AI does the homework.
      </p>
    </div>
  );
}
