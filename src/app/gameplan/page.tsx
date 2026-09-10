"use client";

// Game Plan v2 (Q28–Q30, Q33). Answer first, evidence second, conversation
// whenever the coach wants it. The order is his: best players, the tells that
// matter with an answer inside our defense, where they stress us, the small
// stuff, and what we have to rep.

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import {
  Plus, X, Target, AlertTriangle, Wrench, ClipboardList, Sparkles, RefreshCw, Printer,
  ChevronDown, ChevronRight, Users2, MessageSquare, CalendarDays,
} from "lucide-react";
import { useStore, useHydrated, type PlanItem, type GamePlan, type Play } from "@/lib/store";
import { askPrompt, coachItem } from "@/lib/plan";
import { useGamePlan, updatedLabel, useTick } from "@/lib/useGamePlan";
import { PlayTable } from "@/components/TendencyReport";
import PlanStatus from "@/components/PlanStatus";
import { AI_LABEL } from "@/lib/ai";

const card = "rounded-xl border border-line bg-card shadow-sm";
const cardHead = "display uppercase text-xs font-bold tracking-[0.15em] text-ink px-5 py-3.5 border-b border-line flex items-center gap-2.5";
const input = "rounded-md border border-line bg-white px-2.5 py-1.5 text-sm focus:outline-none focus:border-grass";
const th = "display uppercase text-[11px] tracking-widest text-dim font-semibold";

const pc = (v: number | null | undefined) => (v == null ? "—" : `${Math.round(v * 100)}%`);

function Evidence({ item, byId }: { item: PlanItem; byId: Map<string, Play> }) {
  const [open, setOpen] = useState(false);
  const ev = item.evidence;
  if (!ev) return null;
  const rows = ev.playIds.map((id) => byId.get(id)).filter((p): p is Play => !!p);
  return (
    <div className="mt-1">
      <button onClick={() => setOpen((v) => !v)} className="inline-flex items-center gap-1 text-xs font-bold text-grass hover:underline">
        {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />} Evidence
      </button>
      {open && (
        <div className="mt-1.5 rounded-lg border border-line bg-slate-50/60 px-4 py-3">
          <div className="mb-2 grid gap-2 sm:grid-cols-3 text-xs">
            <div><span className={th}>Sample</span><div className="font-bold">{ev.n} snap{ev.n === 1 ? "" : "s"}</div></div>
            <div><span className={th}>Rate</span><div className="font-bold">{pc(ev.rate)}</div></div>
            <div><span className={th}>Their baseline</span><div className="font-bold">{ev.baseline == null ? "—" : pc(ev.baseline)}</div></div>
          </div>
          <div className="mb-1.5 text-xs text-dim">{ev.summary}</div>
          {rows.length ? <PlayTable plays={rows} /> : <div className="text-xs text-dim">Those snaps are no longer in the import.</div>}
        </div>
      )}
    </div>
  );
}

function PlanList({
  items, placeholder, onChange, byId, onAsk, numbered,
}: {
  items: PlanItem[];
  placeholder: string;
  onChange: (items: PlanItem[]) => void;
  byId: Map<string, Play>;
  onAsk: (item: PlanItem) => void;
  numbered?: boolean;
}) {
  // Touching a generated line makes it the coach's — regenerating leaves it be.
  const edit = (it: PlanItem, patch: Partial<PlanItem>) =>
    onChange(items.map((x) => (x.id === it.id ? { ...x, ...patch, edited: x.source === "generated" ? true : x.edited } : x)));

  return (
    <div className="p-4 flex flex-col gap-3">
      {items.map((it, i) => (
        <div key={it.id} className="flex items-start gap-2">
          {numbered && <span className="mt-1.5 grid size-6 shrink-0 place-items-center rounded-full bg-navy text-white text-[11px] font-extrabold">{i + 1}</span>}
          <div className="flex-1 min-w-0">
            <input
              value={it.text}
              placeholder={placeholder}
              onChange={(e) => edit(it, { text: e.target.value })}
              className={`${input} w-full font-semibold`}
            />
            <input
              value={it.sub ?? ""}
              placeholder="The answer — what we do about it"
              onChange={(e) => edit(it, { sub: e.target.value })}
              className="mt-1 w-full rounded-md border border-transparent bg-transparent px-2.5 py-0.5 text-xs text-dim hover:border-line focus:border-grass focus:bg-white focus:outline-none"
            />
            <div className="flex flex-wrap items-center gap-3 pl-2.5">
              <Evidence item={it} byId={byId} />
              {it.text.trim() && (
                <button onClick={() => onAsk(it)} className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-dim hover:text-grass">
                  <MessageSquare size={12} /> Ask about this
                </button>
              )}
              {it.personnel && <span className="mt-1 rounded-full border border-line px-1.5 py-0.5 text-[10px] font-bold text-dim">{it.personnel}</span>}
              {it.source === "coach" && <span className="mt-1 text-[10px] font-bold text-dim">yours</span>}
              {it.edited && <span className="mt-1 text-[10px] font-bold text-dim">edited</span>}
            </div>
          </div>
          <button onClick={() => onChange(items.filter((x) => x.id !== it.id))} className="mt-2 text-dim hover:text-red-500" aria-label="Remove"><X size={14} /></button>
        </div>
      ))}
      <button onClick={() => onChange([...items, coachItem()])} className="self-start inline-flex items-center gap-1 rounded-lg border border-dashed border-line px-3 py-1.5 text-xs font-semibold text-dim hover:text-ink hover:border-dim">
        <Plus size={12} /> Add
      </button>
    </div>
  );
}

function GamePlanInner() {
  const hydrated = useHydrated();
  const router = useRouter();
  const sp = useSearchParams();
  const { opponents, gamePlans, updateGamePlan } = useStore();
  useTick();

  const opponent = opponents.find((o) => o.id === sp.get("id")) ?? opponents.find((o) => !o.isDemo) ?? opponents[0] ?? null;
  const { plan, regenerate, busy, stale } = useGamePlan(opponent);
  const storedPlan: GamePlan | undefined = opponent ? gamePlans.find((g) => g.opponentId === opponent.id) : undefined;

  if (!hydrated) return <div className="px-8 py-10 text-dim">Loading…</div>;

  const byId = new Map((opponent?.plays ?? []).map((p) => [p.id, p]));
  const setPlan = (patch: Partial<GamePlan>) => opponent && updateGamePlan(opponent.id, patch);
  const ask = (it: PlanItem) => opponent && router.push(`/matchup?id=${opponent.id}&ask=${encodeURIComponent(askPrompt(it))}`);

  const sections: { key: keyof Omit<GamePlan, "opponentId" | "generatedAt" | "inputHash">; title: string; sub: string; icon: typeof Target; color: string; placeholder: string; wide?: boolean }[] = [
    { key: "bestPlayers", title: "Their Best Players", sub: "Who has to be accounted for.", icon: Users2, color: "text-red-600", placeholder: "Player — how they use him" },
    { key: "threats", title: "Top Threats & Tells", sub: "What they give away, and our answer.", icon: Target, color: "text-red-600", placeholder: "When they show X, they do Y" },
    { key: "concerns", title: "Concerns", sub: "Where they stress our rules.", icon: AlertTriangle, color: "text-amber-600", placeholder: "Something we don't have an answer for" },
    { key: "adjustments", title: "Small Adjustments", sub: "Easy fixes inside what we carry.", icon: Wrench, color: "text-grass", placeholder: "One-line tweak using what we carry" },
    { key: "emphasis", title: "Practice Emphasis", sub: "What the kids need to see.", icon: ClipboardList, color: "text-navy", placeholder: "Period / drill / call to rep", wide: true },
  ];

  return (
    <div className="px-6 py-8 max-w-6xl mx-auto">
      <div className="mb-5 flex flex-wrap items-center gap-3 justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Game Plans</h1>
          <p className="text-dim mt-0.5">Your team + your scheme + their tendencies → a few clear answers for the week. Edit anything; it&apos;s your plan.</p>
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
              <button onClick={regenerate} disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-grass px-4 py-2 text-sm font-bold text-white hover:bg-grass-deep disabled:opacity-50">
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
            Generate one and CounterScheme drafts their best players, the tendencies worth a call with an answer inside your defense,
            where they stress your rules, and what to rep. After that it keeps itself current as you add film and notes — you edit from there.
          </p>
          <button onClick={regenerate} disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-grass px-4 py-2 text-sm font-bold text-white hover:bg-grass-deep disabled:opacity-50"><Sparkles size={15} /> Generate Plan</button>
          <div className="mt-3 text-xs text-dim">or <Link href={`/matchup?id=${opponent.id}`} className="font-semibold text-grass hover:underline">add more scouting data first</Link></div>
        </div>
      ) : (
        <motion.div key={opponent.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4">
          <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr] items-start">
            <div className={card}>
              <div className={cardHead}>
                <Target size={14} className="text-grass" /> Top 3 Priorities — vs {opponent.name}
                <span className="ml-auto normal-case tracking-normal text-xs font-normal text-dim inline-flex items-center gap-1.5">
                  {busy && <RefreshCw size={12} className="animate-spin" />}
                  {busy ? "Updating…" : stale ? "Updating from your latest changes…" : updatedLabel(plan?.generatedAt)}
                </span>
              </div>
              <PlanList items={plan?.priorities ?? []} placeholder="Priority" onChange={(priorities) => setPlan({ priorities })} byId={byId} onAsk={ask} numbered />
            </div>
            <div className={card}>
              <div className={cardHead}><CalendarDays size={14} className="text-dim" /> Where You Are</div>
              <div className="px-5 py-4"><PlanStatus opponent={opponent} plan={storedPlan} /></div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2 items-start">
            {sections.map(({ key, title, sub, icon: Icon, color, placeholder, wide }) => (
              <div key={key} className={`${card} ${wide ? "lg:col-span-2" : ""}`}>
                <div className={cardHead}>
                  <Icon size={14} className={color} /> {title}
                  <span className="ml-auto normal-case tracking-normal text-xs font-normal text-dim">
                    {key === "emphasis" ? (
                      <Link href={`/practice?id=${opponent.id}`} className="font-semibold text-grass hover:underline">
                        Build the practice script →
                      </Link>
                    ) : (
                      sub
                    )}
                  </span>
                </div>
                <PlanList items={(plan?.[key] as PlanItem[]) ?? []} placeholder={placeholder} onChange={(items) => setPlan({ [key]: items } as Partial<GamePlan>)} byId={byId} onAsk={ask} />
              </div>
            ))}
          </div>
          <p className="text-xs text-dim inline-flex items-center gap-1.5">
            <Sparkles size={13} /> Drafted by {AI_LABEL} from Opponent Matchup + My Scheme + Defensive Analysis, and kept current as they change.
            Regenerating only redraws the lines CounterScheme wrote — anything you typed or edited stays put.
          </p>
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
