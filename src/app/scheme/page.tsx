"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { BookOpen, ShieldCheck, Layers, Pencil, Check, ChevronRight } from "lucide-react";
import { useStore, useHydrated } from "@/lib/store";
import PageHeader from "@/components/PageHeader";

export default function SchemePage() {
  const hydrated = useHydrated();
  const { scheme, setScheme } = useStore();
  const [editing, setEditing] = useState(false);

  if (!hydrated) return <div className="px-8 py-10 display text-dim">Loading…</div>;

  return (
    <div className="px-8 py-10 max-w-3xl mx-auto">
      <PageHeader
        eyebrow="My Scheme"
        title="Defensive Identity"
        sub="A snapshot of who you are on defense. Diagrams and detailed calls live in the Playbook."
      />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-line bg-card/80 p-8 mb-5"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="display text-xs font-semibold tracking-[0.2em] text-dim mb-2">
              Defensive Structure
            </div>
            {editing ? (
              <input
                value={scheme.structureName}
                onChange={(e) => setScheme({ structureName: e.target.value })}
                placeholder="3-4, 4-2-5, or your own name"
                className="display w-full max-w-xs rounded-lg border border-line bg-black/25 px-4 py-2 text-4xl font-bold text-grass"
              />
            ) : (
              <div className="display text-6xl font-bold text-grass">{scheme.structureName}</div>
            )}
          </div>
          <button
            onClick={() => setEditing((e) => !e)}
            className={`display inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-xs font-semibold transition ${
              editing ? "border-grass bg-grass/15 text-grass" : "border-line text-dim hover:text-ink"
            }`}
          >
            {editing ? <Check size={13} /> : <Pencil size={13} />}
            {editing ? "Save" : "Edit"}
          </button>
        </div>

        <div className="mt-8">
          <div className="display text-xs font-semibold tracking-[0.2em] text-dim mb-2">
            Defensive Philosophy
          </div>
          {editing ? (
            <textarea
              rows={5}
              value={scheme.philosophy}
              onChange={(e) => setScheme({ philosophy: e.target.value })}
              placeholder="How you want to play, what you prioritize, the core identity of your defense."
              className="w-full rounded-lg border border-line bg-black/25 px-4 py-3 text-lg leading-relaxed resize-y"
            />
          ) : (
            <p className="text-lg leading-relaxed">{scheme.philosophy}</p>
          )}
        </div>
      </motion.div>

      <div className="grid gap-4 sm:grid-cols-2">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
          <Link
            href="/scheme/playbook"
            className="group flex h-full flex-col rounded-2xl border border-sky/40 bg-gradient-to-b from-sky/10 to-transparent p-6 transition hover:border-sky hover:-translate-y-0.5"
          >
            <BookOpen size={30} className="text-sky mb-4" />
            <h2 className="display text-2xl font-bold">Playbook</h2>
            <p className="mt-1 text-sm text-dim flex-1">
              Fronts, coverages, pressures, checks &amp; adjustments — with diagrams, offensive looks, and per-position assignments.
            </p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-sky">
              Open Playbook <ChevronRight size={15} className="transition group-hover:translate-x-0.5" />
            </span>
          </Link>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}>
          <Link
            href="/scheme/soundcheck"
            className="group flex h-full flex-col rounded-2xl border border-grass/40 bg-gradient-to-b from-grass/10 to-transparent p-6 transition hover:border-grass hover:-translate-y-0.5"
          >
            <ShieldCheck size={30} className="text-grass mb-4" />
            <h2 className="display text-2xl font-bold">Sound Check</h2>
            <p className="mt-1 text-sm text-dim flex-1">
              Is the stored defense structurally sound? Gaps, numbers, coverage responsibilities, and conflicts — considerations, not corrections.
            </p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-grass">
              Review scheme soundness <ChevronRight size={15} className="transition group-hover:translate-x-0.5" />
            </span>
          </Link>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="sm:col-span-2"
        >
          <Link
            href="/scheme/coverages"
            className="group flex items-start gap-5 rounded-2xl border border-ember/40 bg-gradient-to-b from-ember/10 to-transparent p-6 transition hover:border-ember hover:-translate-y-0.5"
          >
            <Layers size={30} className="text-ember shrink-0 mt-1" />
            <div className="flex-1">
              <h2 className="display text-2xl font-bold">Coverage Library</h2>
              <p className="mt-1 text-sm text-dim">
                30 match coverages — Cover 0 through Cut/Cross — with every defender&apos;s alignment, help,
                leverage, keys, and match rules. Includes the Master Software Rule every assignment is written
                against.
              </p>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-ember">
                Open Coverage Library <ChevronRight size={15} className="transition group-hover:translate-x-0.5" />
              </span>
            </div>
          </Link>
        </motion.div>
      </div>

      <p className="mt-6 text-sm text-dim">
        Your terminology is what appears everywhere — structures and calls are never renamed to fit the software.{" "}
        <Link href="/scheme/terminology" className="text-grass hover:underline">
          Review position terminology →
        </Link>
      </p>
    </div>
  );
}
