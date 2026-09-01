"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { Plus, X, Target, CheckCircle2, AlertTriangle, Wrench, ClipboardList, Sparkles, RefreshCw, Printer } from "lucide-react";
import { useStore, useHydrated, type PlanItem, type GamePlan } from "@/lib/store";
import { computeFindings } from "@/lib/analyze";
import { ai, AI_LABEL } from "@/lib/ai";

const card = "rounded-xl border border-line bg-card shadow-sm";
const cardHead = "display uppercase text-xs font-bold tracking-[0.15em] text-ink px-5 py-3.5 border-b border-line flex items-center gap-2.5";
const input = "rounded-md border border-line bg-white px-2.5 py-1.5 text-sm focus:outline-none focus:border-grass";
const uid = () => Math.random().toString(36).slice(2, 9);

function EditableList({ items, placeholder, onChange, numbered }: { items: PlanItem[]; placeholder: string; onChange: (items: PlanItem[]) => void; numbered?: boolean }) {
  return (
    <div className="p-4 flex flex-col gap-2">
      {items.map((it, i) => (
        <div key={it.id} className="flex items-start gap-2">
          {numbered && <span className="mt-1.5 grid size-6 shrink-0 place-items-center rounded-full bg-navy text-white text-[11px] font-extrabold">{i + 1}</span>}
          <div className="flex-1 min-w-0">
            <input value={it.text} placeholder={placeholder} onChange={(e) => onChange(items.map((x) => (x.id === it.id ? { ...x, text: e.target.value } : x)))} className={`${input} w-full font-semibold`} />
            <input value={it.sub ?? ""} placeholder="Why / detail" onChange={(e) => onChange(items.map((x) => (x.id === it.id ? { ...x, sub: e.target.value } : x)))} className="mt-1 w-full rounded-md border border-transparent bg-transparent px-2.5 py-0.5 text-xs text-dim hover:border-line focus:border-grass focus:bg-white focus:outline-none" />
          </div>
          <button onClick={() => onChange(items.filter((x) => x.id !== it.id))} className="mt-2 text-dim hover:text-red-500" aria-label="Remove"><X size={14} /></button>
        </div>
      ))}
      <button onClick={() => onChange([...items, { id: uid(), text: "" }])} className="self-start inline-flex items-center gap-1 rounded-lg border border-dashed border-line px-3 py-1.5 text-xs font-semibold text-dim hover:text-ink hover:border-dim"><Plus size={12} /> Add</button>
    </div>
  );
}

function GamePlanInner() {
  const hydrated = useHydrated();
  const router = useRouter();
  const sp = useSearchParams();
  const store = useStore();
  const { opponents, gamePlans, updateGamePlan } = store;
  const [busy, setBusy] = useState(false);

  if (!hydrated) return <div className="px-8 py-10 text-dim">Loading…</div>;

  const opponent = opponents.find((o) => o.id === sp.get("id")) ?? opponents.find((o) => !o.isDemo) ?? opponents[0] ?? null;
  const plan: GamePlan | undefined = opponent ? gamePlans.find((g) => g.opponentId === opponent.id) : undefined;
  const setPlan = (patch: Partial<GamePlan>) => opponent && updateGamePlan(opponent.id, patch);

  const generate = async () => {
    if (!opponent || busy) return;
    setBusy(true);
    try {
      const ctx = { scheme: store.scheme, concepts: store.concepts, players: store.players, groups: store.groups, activeGroupId: store.activeGroupId, overrides: store.overrides };
      const gp = await ai.gamePlan(opponent, ctx, computeFindings(ctx).findings);
      updateGamePlan(opponent.id, gp);
    } finally {
      setBusy(false);
    }
  };

  const sections: { key: keyof Omit<GamePlan, "opponentId" | "generatedAt">; title: string; sub: string; icon: typeof Target; color: string; placeholder: string }[] = [
    { key: "threats", title: "Top Threats", sub: "What can hurt us.", icon: Target, color: "text-red-600", placeholder: "Their best formation / concept / player" },
    { key: "bestAnswers", title: "Best Answers We Already Have", sub: "What matches up.", icon: CheckCircle2, color: "text-emerald-600", placeholder: "A saved rule or coverage that fits" },
    { key: "concerns", title: "Concerns", sub: "Where we are vulnerable.", icon: AlertTriangle, color: "text-amber-600", placeholder: "Something they show that we don't have an answer for" },
    { key: "adjustments", title: "Small Adjustments", sub: "Easy fixes.", icon: Wrench, color: "text-grass", placeholder: "One-line tweak using what we carry" },
    { key: "emphasis", title: "Practice / Call Emphasis", sub: "What to focus on this week.", icon: ClipboardList, color: "text-navy", placeholder: "Period / drill / call to rep" },
  ];

  return (
    <div className="px-6 py-8 max-w-6xl mx-auto">
      <div className="mb-5 flex flex-wrap items-center gap-3 justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Game Plans</h1>
          <p className="text-dim mt-0.5">Your team + your scheme + their tendencies → 3–5 clear answers for the week. Edit anything; it&apos;s your plan.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {opponents.length > 0 && (
            <select value={opponent?.id ?? ""} onChange={(e) => router.push(`/gameplan?id=${e.target.value}`)} className="rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold">
              {opponents.map((o) => <option key={o.id} value={o.id}>{o.name}{o.week ? ` (Wk ${o.week})` : ""}</option>)}
            </select>
          )}
          {opponent && (
            <>
              <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-3.5 py-2 text-sm font-semibold hover:border-dim"><Printer size={15} /> Print</button>
              <button onClick={generate} disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-grass px-4 py-2 text-sm font-bold text-white hover:bg-grass-deep disabled:opacity-50">
                <RefreshCw size={15} className={busy ? "animate-spin" : ""} /> {plan?.generatedAt ? "Regenerate" : "Generate Plan"}
              </button>
            </>
          )}
        </div>
      </div>

      {!opponent ? (
        <div className={`${card} px-6 py-14 text-center`}>
          <ClipboardList size={34} className="mx-auto text-dim mb-3" />
          <div className="text-lg font-bold mb-1">No opponent to plan against yet</div>
          <p className="text-sm text-dim max-w-md mx-auto mb-4">Add one in Opponent Matchup — their tendencies become the threats this plan answers.</p>
          <Link href="/matchup" className="inline-flex items-center gap-2 rounded-lg bg-grass px-4 py-2 text-sm font-semibold text-white hover:bg-grass-deep">Go to Opponent Matchup</Link>
        </div>
      ) : !plan?.generatedAt && !plan?.priorities?.length ? (
        <div className={`${card} px-6 py-14 text-center`}>
          <Sparkles size={34} className="mx-auto text-grass mb-3" />
          <div className="text-lg font-bold mb-1">No plan for {opponent.name} yet</div>
          <p className="text-sm text-dim max-w-lg mx-auto mb-4">
            Generate one and the engine drafts priorities, threats, answers you already carry, concerns, adjustments, and practice emphasis from the scouting data and your saved scheme. You edit from there.
          </p>
          <button onClick={generate} disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-grass px-4 py-2 text-sm font-bold text-white hover:bg-grass-deep disabled:opacity-50"><Sparkles size={15} /> Generate Plan</button>
          <div className="mt-3 text-xs text-dim">or <Link href={`/matchup?id=${opponent.id}`} className="font-semibold text-grass hover:underline">add more scouting data first</Link></div>
        </div>
      ) : (
        <motion.div key={opponent.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4">
          <div className={card}>
            <div className={cardHead}>
              <Target size={14} className="text-grass" /> Top 3 Priorities — vs {opponent.name}
              {plan?.generatedAt && <span className="ml-auto normal-case tracking-normal text-xs font-normal text-dim">generated {new Date(plan.generatedAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>}
            </div>
            <EditableList items={plan?.priorities ?? []} placeholder="Priority" onChange={(priorities) => setPlan({ priorities })} numbered />
          </div>
          <div className="grid gap-4 lg:grid-cols-2 items-start">
            {sections.map(({ key, title, sub, icon: Icon, color, placeholder }) => (
              <div key={key} className={`${card} ${key === "emphasis" ? "lg:col-span-2" : ""}`}>
                <div className={cardHead}>
                  <Icon size={14} className={color} /> {title}
                  <span className="ml-auto normal-case tracking-normal text-xs font-normal text-dim">{sub}</span>
                </div>
                <EditableList items={(plan?.[key] as PlanItem[]) ?? []} placeholder={placeholder} onChange={(items) => setPlan({ [key]: items } as Partial<GamePlan>)} />
              </div>
            ))}
          </div>
          <p className="text-xs text-dim inline-flex items-center gap-1.5"><Sparkles size={13} /> Drafted by {AI_LABEL} from Opponent Matchup + My Scheme + Defensive Analysis. Regenerate replaces the draft; your edits are saved per opponent.</p>
        </motion.div>
      )}
    </div>
  );
}

export default function GamePlanPage() {
  return (
    <Suspense fallback={<div className="px-8 py-10 text-dim">Loading…</div>}>
      <GamePlanInner />
    </Suspense>
  );
}
