"use client";

import { useState } from "react";
import { motion } from "motion/react";
import PageHeader from "@/components/PageHeader";
import { Upload, Users, Shield, Bell, SlidersHorizontal } from "lucide-react";
import { useStore, useHydrated, TEAM_LEVELS } from "@/lib/store";
import SkillCategoriesPanel from "@/components/SkillCategoriesPanel";

// Honest placeholders — these arrive with accounts (Q3). Nothing here is live.
const sections = [
  {
    icon: Users,
    title: "Staff access",
    rows: [
      { label: "Head Coach / Admin", value: "Everything, plus staff and billing" },
      { label: "Coordinator", value: "His side of the ball and its game plan" },
      { label: "Assistant Coach", value: "His position group, chat, and what he's allowed to edit" },
    ],
    note: "Roles are decided; sign-in and multi-coach access come with the accounts build. Today this browser is the only user.",
  },
  {
    icon: Upload,
    title: "Data & imports",
    rows: [
      { label: "Hudl play-by-play", value: "Opponent Matchup → Upload Report" },
      { label: "Roster", value: "My Team → Import Roster (CSV or PDF)" },
      { label: "Weight room / testing", value: "My Team → Weight Room → Upload" },
    ],
    note: "Everything is saved in this browser. Cross-device sync comes with accounts.",
  },
  {
    icon: Bell,
    title: "Notifications",
    rows: [],
    note: "Not built yet — nothing here sends anything.",
  },
];

const input =
  "w-full rounded-md border border-line bg-white px-2.5 py-1.5 text-sm focus:outline-none focus:border-grass";

export default function SettingsPage() {
  const hydrated = useHydrated();
  const program = useStore((s) => s.program);
  const setProgram = useStore((s) => s.setProgram);
  const [catsOpen, setCatsOpen] = useState(false);

  return (
    <div className="px-8 py-10 max-w-4xl mx-auto">
      <PageHeader eyebrow="Settings" title="Settings" sub="Program details, staff access, and data connections." />

      {/* Program setup (Q6) — short on purpose */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-line bg-card/80 p-5 mb-5"
      >
        <div className="mb-4 flex items-center gap-2.5">
          <Shield size={17} className="text-grass" />
          <h2 className="display text-lg font-bold">Program</h2>
          <span className="ml-auto text-xs text-dim">Mascot and coach name are optional.</span>
        </div>
        {!hydrated ? (
          <div className="text-sm text-dim">Loading…</div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-xs text-dim mb-1">Team / school name</label>
              <input value={program.name} onChange={(e) => setProgram({ name: e.target.value })} className={input} />
            </div>
            <div>
              <label className="block text-xs text-dim mb-1">Level</label>
              <select value={program.level} onChange={(e) => setProgram({ level: e.target.value })} className={input}>
                {TEAM_LEVELS.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-dim mb-1">State</label>
              <input
                value={program.state}
                onChange={(e) => setProgram({ state: e.target.value.toUpperCase().slice(0, 2) })}
                placeholder="TN"
                className={input}
              />
            </div>
            <div>
              <label className="block text-xs text-dim mb-1">Classification</label>
              <input
                value={program.classification}
                onChange={(e) => setProgram({ classification: e.target.value })}
                placeholder="4A"
                className={input}
              />
            </div>
            <div>
              <label className="block text-xs text-dim mb-1">Mascot</label>
              <input
                value={program.mascot ?? ""}
                onChange={(e) => setProgram({ mascot: e.target.value })}
                placeholder="Wildcats"
                className={input}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-dim mb-1">Head coach</label>
              <input
                value={program.coachName ?? ""}
                onChange={(e) => setProgram({ coachName: e.target.value })}
                placeholder="Coach Linville"
                className={input}
              />
            </div>
          </div>
        )}
      </motion.div>

      {/* Skill categories (Q10) */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="rounded-xl border border-line bg-card/80 p-5 mb-5 flex flex-wrap items-center gap-3"
      >
        <SlidersHorizontal size={17} className="text-grass" />
        <div>
          <h2 className="display text-lg font-bold">Skill Categories</h2>
          <p className="text-sm text-dim">What each position gets graded on, 1–5. Adjust them to your defense.</p>
        </div>
        <button
          onClick={() => setCatsOpen(true)}
          className="ml-auto rounded-lg border border-grass/50 px-4 py-2 text-sm font-semibold text-grass transition hover:bg-grass hover:text-white"
        >
          Edit categories
        </button>
      </motion.div>

      <div className="grid gap-5 sm:grid-cols-2">
        {sections.map((s, i) => (
          <motion.div
            key={s.title}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.06 }}
            className="rounded-xl border border-line bg-card/80 p-5"
          >
            <div className="mb-4 flex items-center gap-2.5">
              <s.icon size={17} className="text-grass" />
              <h2 className="display text-lg font-bold">{s.title}</h2>
            </div>
            <div className="flex flex-col divide-y divide-line/60">
              {s.rows.map((r) => (
                <div key={r.label} className="flex items-start justify-between gap-3 py-2.5 text-sm">
                  <span className="text-dim shrink-0">{r.label}</span>
                  <span className="font-semibold text-right">{r.value}</span>
                </div>
              ))}
            </div>
            {s.note && <p className="mt-3 text-xs text-dim">{s.note}</p>}
          </motion.div>
        ))}
      </div>

      {catsOpen && <SkillCategoriesPanel onClose={() => setCatsOpen(false)} />}
    </div>
  );
}
