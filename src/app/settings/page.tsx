"use client";

import { motion } from "motion/react";
import PageHeader from "@/components/PageHeader";
import { Upload, Users, Shield, Bell } from "lucide-react";

const sections = [
  {
    icon: Shield,
    title: "Program",
    rows: [
      { label: "Team name", value: "Wildcats Football" },
      { label: "Head coach", value: "Coach Carver" },
      { label: "Season", value: "2026 · TSSAA 3A" },
    ],
  },
  {
    icon: Users,
    title: "Staff access",
    rows: [
      { label: "Coach Carver", value: "Owner" },
      { label: "T. Reyes (DC)", value: "Assistant" },
      { label: "M. Osei (OC)", value: "Assistant" },
    ],
  },
  {
    icon: Upload,
    title: "Data & imports",
    rows: [
      { label: "Hudl breakdown", value: "Last import Sep 13" },
      { label: "Roster (MaxPreps)", value: "Synced" },
      { label: "Testing sheet", value: "Upload CSV" },
    ],
  },
  {
    icon: Bell,
    title: "Notifications",
    rows: [
      { label: "Scout report ready", value: "On" },
      { label: "Practice reminders", value: "On" },
      { label: "Weekly grade summary", value: "Off" },
    ],
  },
];

export default function SettingsPage() {
  return (
    <div className="px-8 py-10 max-w-4xl mx-auto">
      <PageHeader eyebrow="Settings" title="Settings" sub="Program details, staff access, and data connections." />

      <div className="grid gap-5 sm:grid-cols-2">
        {sections.map((s, i) => (
          <motion.div
            key={s.title}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="rounded-xl border border-line bg-card/80 p-5"
          >
            <div className="mb-4 flex items-center gap-2.5">
              <s.icon size={17} className="text-grass" />
              <h2 className="display text-lg font-bold">{s.title}</h2>
            </div>
            <div className="flex flex-col divide-y divide-line/60">
              {s.rows.map((r) => (
                <div key={r.label} className="flex items-center justify-between py-2.5 text-sm">
                  <span className="text-dim">{r.label}</span>
                  <span className="font-semibold">{r.value}</span>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
