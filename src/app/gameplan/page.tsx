"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Plus, X, Target, CheckCircle2, AlertTriangle, Wrench, ClipboardList, Sparkles } from "lucide-react";
import { useStore, useHydrated, type PlanItem, type GamePlan } from "@/lib/store";
import { computeFindings } from "@/lib/analyze";

const card = "rounded-xl border border-line bg-card shadow-sm";
const cardHead = "display uppercase text-xs font-bold tracking-[0.15em] text-ink px-5 py-3.5 border-b border-line flex items-center gap-2.5";
const input = "rounded-md border border-line bg-white px-2.5 py-1.5 text-sm focus:outline-none focus:border-grass";
const uid = () => Math.random().toString(36).slice(2, 9);

function EditableList({
  items, placeholder, onChange, accent = "text-ink",
}: {
  items: PlanItem[];
  placeholder: string;
  onChange: (items: PlanItem[]) => void;
  accent?: string;
}) {
  return (
    <div className="p-4 flex flex-col gap-1.5">
      {items.map((it) => (
        <div key={it.id} className="flex items-center gap-2">
          <input
            value={it.text}
            placeholder={placeholder}
            onChange={(e) => onChange(items.map((x) => (x.id === it.id ? { ...x, text: e.target.value } : x)))}
            className={`${input} flex-1 font-medium ${accent}`}
          />
          <button onClick={() => onChange(items.filter((x) => x.id !== it.id))} className="text-dim hover:text-red-500" aria-label="Remove">
            <X size={14} />
          </button>
        </div>
      ))}
      <button
        onClick={() => onChange([...items, { id: uid(), text: "" }])}
        className="self-start inline-flex items-center gap-1 rounded-lg border border-dashed border-line px-3 py-1.5 text-xs font-semibold text-dim hover:text-ink hover:border-dim"
      >
        <Plus size={12} /> Add
      </button>
    </div>
  );
}

export default function GamePlanPage() {
  const hydrated = useHydrated();
  const store = useStore();
  const { opponents, gamePlans, updateGamePlan } = store;
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (!hydrated) return <div className="px-8 py-10 text-dim">Loading…</div>;

  const opponent = opponents.find((o) => o.id === selectedId) ?? opponents[0] ?? null;
  const plan: GamePlan = (opponent && gamePlans.find((g) => g.opponentId === opponent.id)) ?? {
    opponentId: opponent?.id ?? "",
    bestAnswers: [],
    adjustments: [],
    emphasis: [],
  };
  const setPlan = (patch: Partial<GamePlan>) => opponent && updateGamePlan(opponent.id, patch);

  // Top threats — straight from what the coach entered in Scout, ranked by frequency.
  const threats = opponent
    ? [
        ...[...opponent.formations]
          .filter((f) => f.name.trim())
          .sort((a, b) => (b.snapsPct ?? 0) - (a.snapsPct ?? 0))
          .slice(0, 3)
          .map((f) => ({
            id: f.id,
            title: f.name,
            sub: [f.snapsPct != null ? `${f.snapsPct}% of snaps` : null, f.runPct != null ? `${f.runPct}% run` : null, f.notes]
              .filter(Boolean)
              .join(" · "),
          })),
        ...[...opponent.concepts]
          .filter((c) => c.name.trim())
          .sort((a, b) => (b.freq ?? 0) - (a.freq ?? 0))
          .slice(0, 3)
          .map((c) => ({
            id: c.id,
            title: `${c.name} (${c.type})`,
            sub: [c.freq != null ? `seen ${c.freq}×` : null, c.notes].filter(Boolean).join(" · "),
          })),
        ...opponent.keyPlayers
          .filter((k) => k.name.trim())
          .slice(0, 2)
          .map((k) => ({
            id: k.id,
            title: `${k.jersey ? `#${k.jersey} ` : ""}${k.name}${k.pos ? ` (${k.pos})` : ""}`,
            sub: k.notes ?? "",
          })),
      ]
    : [];

  // Concerns — pulled live from Defensive Analysis so the plan sees the same defense.
  const { findings } = computeFindings(store);
  const concerns = findings.filter((f) => f.status !== "Sound");

  return (
    <div className="px-6 py-8 max-w-6xl mx-auto">
      <div className="mb-6 flex flex-wrap items-center gap-3 justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Game Plans</h1>
          <p className="text-dim mt-0.5">
            Your team + your scheme + their tendencies → a clear weekly plan. 3–5 answers, not a novel.
          </p>
        </div>
        {opponents.length > 0 && (
          <select
            value={opponent?.id ?? ""}
            onChange={(e) => setSelectedId(e.target.value)}
            className="rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold"
          >
            {opponents.map((o) => (
              <option key={o.id} value={o.id}>{o.name}{o.week ? ` (Wk ${o.week})` : ""}</option>
            ))}
          </select>
        )}
      </div>

      {!opponent ? (
        <div className={`${card} px-6 py-14 text-center`}>
          <ClipboardList size={34} className="mx-auto text-dim mb-3" />
          <div className="text-lg font-bold mb-1">No opponent to plan against yet</div>
          <p className="text-sm text-dim max-w-md mx-auto mb-4">
            Game plans build on scouting. Add an opponent in Opponent Scout first — their formations and
            tendencies become the threats this page answers.
          </p>
          <Link href="/scout" className="inline-flex items-center gap-2 rounded-lg bg-grass px-4 py-2 text-sm font-semibold text-white hover:bg-grass-deep">
            Go to Opponent Scout
          </Link>
        </div>
      ) : (
        <motion.div key={opponent.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid gap-5 lg:grid-cols-2 items-start">
          {/* Top threats — auto from scout */}
          <div className={card}>
            <div className={cardHead}>
              <Target size={15} className="text-red-600" /> Top Threats
              <span className="ml-auto normal-case tracking-normal text-xs font-normal text-dim">from Opponent Scout</span>
            </div>
            <div className="px-5 py-2 text-sm">
              {threats.length === 0 && (
                <div className="py-4 text-dim">
                  Nothing entered for {opponent.name} yet —{" "}
                  <Link href="/scout" className="text-grass font-semibold hover:underline">add their tendencies</Link>{" "}
                  and the threats fill in here.
                </div>
              )}
              {threats.map((t) => (
                <div key={t.id} className="py-2.5 border-b border-line/60 last:border-0">
                  <div className="font-bold">{t.title}</div>
                  {t.sub && <div className="text-xs text-dim mt-0.5">{t.sub}</div>}
                </div>
              ))}
            </div>
          </div>

          {/* Concerns — auto from analysis */}
          <div className={card}>
            <div className={cardHead}>
              <AlertTriangle size={15} className="text-amber-600" /> Where We're Vulnerable
              <span className="ml-auto normal-case tracking-normal text-xs font-normal text-dim">from Defensive Analysis</span>
            </div>
            <div className="px-5 py-2 text-sm">
              {concerns.length === 0 && <div className="py-4 text-dim">Nothing flagged — the saved defense checks out.</div>}
              {concerns.map((f) => (
                <div key={f.check} className="py-2.5 border-b border-line/60 last:border-0">
                  <div className="font-bold">{f.check}</div>
                  <div className="text-xs text-dim mt-0.5">{f.detail}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Best answers — coach-authored */}
          <div className={card}>
            <div className={cardHead}>
              <CheckCircle2 size={15} className="text-emerald-600" /> Best Answers We Already Have
            </div>
            <EditableList
              items={plan.bestAnswers}
              placeholder='e.g. "Vs Trips Right: check Special, poach #3"'
              onChange={(bestAnswers) => setPlan({ bestAnswers })}
            />
          </div>

          {/* Small adjustments */}
          <div className={card}>
            <div className={cardHead}>
              <Wrench size={15} className="text-grass" /> Small Adjustments
            </div>
            <EditableList
              items={plan.adjustments}
              placeholder='e.g. "Bump W over vs 12 personnel"'
              onChange={(adjustments) => setPlan({ adjustments })}
            />
          </div>

          {/* Practice / call emphasis */}
          <div className={`${card} lg:col-span-2`}>
            <div className={cardHead}>
              <ClipboardList size={15} className="text-navy" /> Practice / Call Emphasis
              <span className="ml-auto normal-case tracking-normal text-xs font-normal text-dim">what to focus on this week</span>
            </div>
            <EditableList
              items={plan.emphasis}
              placeholder='e.g. "Rep Cover 3 Match vs their play-action shots — Tue/Wed"'
              onChange={(emphasis) => setPlan({ emphasis })}
            />
          </div>

          <p className="lg:col-span-2 text-xs text-dim inline-flex items-center gap-1.5">
            <Sparkles size={13} />
            AI game-plan analysis — where the software drafts these answers from your scheme and their tendencies —
            is the next build. Everything you enter here is saved per opponent.
          </p>
        </motion.div>
      )}
    </div>
  );
}
