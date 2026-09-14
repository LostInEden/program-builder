"use client";

// Game Plan (Q28–Q30, Q33, Q43, Q44, Q47). The OUTPUT half: what we're going to
// do about what they do. Answer first, evidence second, conversation whenever
// the coach wants it. The order is his: best players, the tells that matter
// with an answer inside our defense, where they stress us, the small stuff, and
// what we have to rep. Nothing is padded to a count, and nothing the scouting
// report finds later rewrites a line he kept.

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import {
  Plus, X, Target, AlertTriangle, Wrench, ClipboardList, Sparkles, RefreshCw, Printer,
  ChevronDown, ChevronRight, Users2, MessageSquare, CalendarDays, Binoculars, Bell, Check,
} from "lucide-react";
import { useStore, useHydrated, type PlanItem, type GamePlan, type Play, type PlanChange, type PlanSectionKey } from "@/lib/store";
import { askPrompt, coachItem, SECTION_TITLES } from "@/lib/plan";
import { useGamePlan, updatedLabel, useTick } from "@/lib/useGamePlan";
import { PlayTable } from "@/components/TendencyReport";
import PlanStatus from "@/components/PlanStatus";
import { AI_LABEL } from "@/lib/ai";

const card = "rounded-xl border border-line bg-card shadow-sm print-card";
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
    <div className="mt-1 no-print">
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
  items, placeholder, onChange, byId, onAsk, numbered, initial = 5,
}: {
  items: PlanItem[];
  placeholder: string;
  onChange: (items: PlanItem[]) => void;
  byId: Map<string, Play>;
  onAsk: (item: PlanItem) => void;
  numbered?: boolean;
  initial?: number;
}) {
  const [all, setAll] = useState(false);
  // Touching a generated line makes it the coach's — regenerating leaves it be.
  const edit = (it: PlanItem, patch: Partial<PlanItem>) =>
    onChange(items.map((x) => (x.id === it.id ? { ...x, ...patch, edited: x.source === "generated" ? true : x.edited } : x)));
  const shown = all ? items : items.slice(0, initial);
  const hidden = items.length - shown.length;

  return (
    <div className="p-4 flex flex-col gap-3">
      {shown.map((it, i) => (
        <div key={it.id} className="flex items-start gap-2 print-keep">
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
                <button onClick={() => onAsk(it)} className="no-print mt-1 inline-flex items-center gap-1 text-xs font-bold text-dim hover:text-grass">
                  <MessageSquare size={12} /> Ask about this
                </button>
              )}
              {it.personnel && <span className="mt-1 rounded-full border border-line px-1.5 py-0.5 text-[10px] font-bold text-dim">{it.personnel}</span>}
              {it.source === "coach" && <span className="mt-1 text-[10px] font-bold text-dim">yours</span>}
              {it.edited && <span className="mt-1 text-[10px] font-bold text-dim">edited</span>}
            </div>
          </div>
          <button onClick={() => onChange(items.filter((x) => x.id !== it.id))} className="no-print mt-2 text-dim hover:text-red-500" aria-label="Remove"><X size={14} /></button>
        </div>
      ))}
      <div className="no-print flex flex-wrap items-center gap-3">
        <button onClick={() => onChange([...items, coachItem()])} className="inline-flex items-center gap-1 rounded-lg border border-dashed border-line px-3 py-1.5 text-xs font-semibold text-dim hover:text-ink hover:border-dim">
          <Plus size={12} /> Add
        </button>
        {(hidden > 0 || all) && items.length > initial && (
          <button onClick={() => setAll((v) => !v)} className="text-xs font-bold text-grass hover:underline">
            {all ? `Show the top ${initial}` : `Show ${hidden} more`}
          </button>
        )}
      </div>
    </div>
  );
}

/** The staged redraft (Q47): one line at a time, his call every time. */
function ChangeRow({ c, onAccept, onKeep }: { c: PlanChange; onAccept: () => void; onKeep: () => void }) {
  const label = c.kind === "add" ? "New line" : c.kind === "remove" ? "Would drop" : "Would change";
  return (
    <div className="flex flex-col gap-1.5 border-b border-line/60 py-2.5 last:border-0 sm:flex-row sm:items-start">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-line bg-white px-1.5 py-0.5 text-[10px] font-bold text-dim">{label}</span>
          <span className="text-[11px] font-semibold text-dim">{SECTION_TITLES[c.section]}</span>
        </div>
        {c.prev && (
          <div className={`mt-1 text-sm ${c.kind === "remove" ? "" : "line-through opacity-60"}`}>
            {c.prev.text}
            {c.prev.sub && <span className="block text-xs text-dim">{c.prev.sub}</span>}
          </div>
        )}
        {c.item && (
          <div className="mt-1 text-sm font-semibold">
            {c.item.text}
            {c.item.sub && <span className="block text-xs font-normal text-dim">{c.item.sub}</span>}
          </div>
        )}
      </div>
      <div className="flex shrink-0 gap-2">
        <button onClick={onAccept} className="inline-flex items-center gap-1 rounded-lg bg-grass px-2.5 py-1 text-xs font-bold text-white hover:bg-grass-deep"><Check size={12} /> Accept</button>
        <button onClick={onKeep} className="rounded-lg border border-line bg-white px-2.5 py-1 text-xs font-bold text-dim hover:border-dim hover:text-ink">Keep mine</button>
      </div>
    </div>
  );
}

function GamePlanInner() {
  const hydrated = useHydrated();
  const router = useRouter();
  const sp = useSearchParams();
  const { opponents, gamePlans, updateGamePlan } = useStore();
  const setLastOpponent = useStore((s) => s.setLastOpponent);
  const [reviewOpen, setReviewOpen] = useState(false);
  useTick();

  const opponent = opponents.find((o) => o.id === sp.get("id")) ?? opponents.find((o) => !o.isDemo) ?? opponents[0] ?? null;
  const { plan, regenerate, busy, stale, pending, acceptChange, keepChange, acceptAllChanges, keepAllMine } = useGamePlan(opponent);
  const storedPlan: GamePlan | undefined = opponent ? gamePlans.find((g) => g.opponentId === opponent.id) : undefined;
  // The chat talks about whoever he looked at last (Q2).
  useEffect(() => {
    if (opponent) setLastOpponent(opponent.id);
  }, [opponent, setLastOpponent]);

  if (!hydrated) return <div className="px-8 py-10 text-dim">Loading…</div>;

  const byId = new Map((opponent?.plays ?? []).map((p) => [p.id, p]));
  const setPlan = (patch: Partial<GamePlan>) => opponent && updateGamePlan(opponent.id, patch);
  const ask = (it: PlanItem) => opponent && router.push(`/matchup?id=${opponent.id}&ask=${encodeURIComponent(askPrompt(it))}`);

  const sections: { key: PlanSectionKey; title: string; sub: string; icon: typeof Target; color: string; placeholder: string; wide?: boolean }[] = [
    { key: "bestPlayers", title: SECTION_TITLES.bestPlayers, sub: "Who has to be accounted for.", icon: Users2, color: "text-red-600", placeholder: "Player — how they use him" },
    { key: "threats", title: SECTION_TITLES.threats, sub: "What they give away, and our answer.", icon: Target, color: "text-red-600", placeholder: "When they show X, they do Y" },
    { key: "concerns", title: SECTION_TITLES.concerns, sub: "Where they stress our rules.", icon: AlertTriangle, color: "text-amber-600", placeholder: "Something we don't have an answer for" },
    { key: "adjustments", title: SECTION_TITLES.adjustments, sub: "Easy fixes inside what we carry.", icon: Wrench, color: "text-grass", placeholder: "One-line tweak using what we carry" },
    { key: "emphasis", title: SECTION_TITLES.emphasis, sub: "What the kids need to see.", icon: ClipboardList, color: "text-navy", placeholder: "Period / drill / call to rep", wide: true },
  ];
  // A section with nothing real in it doesn't get printed, shown, or padded
  // (Q44) — it's offered as something he can start instead.
  const filled = sections.filter((s) => ((plan?.[s.key] as PlanItem[]) ?? []).length > 0);
  const empty = sections.filter((s) => !((plan?.[s.key] as PlanItem[]) ?? []).length);

  return (
    <div className="px-4 sm:px-6 py-6 sm:py-8 max-w-6xl mx-auto print-root">
      <div className="mb-5 flex flex-wrap items-center gap-3 justify-between no-print">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Game Plan{opponent ? ` — ${opponent.name}` : ""}</h1>
          <p className="text-dim mt-0.5">Scouting Report = What they do. Game Plan = What we&apos;re going to do about it.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {opponents.length > 0 && (
            <select value={opponent?.id ?? ""} onChange={(e) => router.push(`/gameplan?id=${e.target.value}`)} className="rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold">
              {opponents.map((o) => <option key={o.id} value={o.id}>{o.name}{o.week ? ` (Wk ${o.week})` : ""}</option>)}
            </select>
          )}
          {opponent && (
            <>
              <Link href={`/scouting?id=${opponent.id}`} className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-3.5 py-2 text-sm font-semibold hover:border-dim"><Binoculars size={15} /> Scouting Report</Link>
              <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-3.5 py-2 text-sm font-semibold hover:border-dim"><Printer size={15} /> Print / Save as PDF</button>
              <button onClick={regenerate} disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-grass px-4 py-2 text-sm font-bold text-white hover:bg-grass-deep disabled:opacity-50">
                <RefreshCw size={15} className={busy ? "animate-spin" : ""} /> {plan?.generatedAt ? "Regenerate" : "Generate Plan"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* The paper version says who and what it is. */}
      <div className="hidden print:block mb-4">
        <h1 className="text-2xl font-extrabold">Game Plan — {opponent?.name ?? ""}</h1>
        <p className="text-sm text-dim">Scouting Report = What they do. Game Plan = What we&apos;re going to do about it.</p>
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
            where they stress your rules, and what to rep. After that it keeps itself current as you add film and notes — and anything big
            comes to you for review before it changes a line.
          </p>
          <button onClick={regenerate} disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-grass px-4 py-2 text-sm font-bold text-white hover:bg-grass-deep disabled:opacity-50"><Sparkles size={15} /> Generate Plan</button>
          <div className="mt-3 text-xs text-dim">or <Link href={`/scouting?id=${opponent.id}`} className="font-semibold text-grass hover:underline">read the Scouting Report first</Link></div>
        </div>
      ) : (
        <motion.div key={opponent.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4">
          {pending && (
            <div className="no-print rounded-xl border border-ember/40 bg-ember/5">
              <div className="flex flex-wrap items-center gap-3 px-5 py-3">
                <Bell size={16} className="text-ember" />
                <div className="min-w-0 flex-1">
                  <div className="font-bold">
                    The scouting report changed — {pending.changes.length} line{pending.changes.length === 1 ? "" : "s"} would change. Review
                  </div>
                  <div className="text-xs text-dim">{pending.reason} Nothing you typed or edited is in this list.</div>
                </div>
                <button onClick={() => setReviewOpen((v) => !v)} className="rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-bold hover:border-dim">
                  {reviewOpen ? "Hide" : "Review"}
                </button>
                <button onClick={acceptAllChanges} className="rounded-lg bg-grass px-3 py-1.5 text-xs font-bold text-white hover:bg-grass-deep">Accept all</button>
                <button onClick={keepAllMine} className="rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-bold text-dim hover:text-ink hover:border-dim">Keep mine</button>
              </div>
              {reviewOpen && (
                <div className="border-t border-ember/30 px-5 py-2">
                  {pending.changes.map((c) => (
                    <ChangeRow key={`${c.section}-${c.id}`} c={c} onAccept={() => acceptChange(c)} onKeep={() => keepChange(c)} />
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr] items-start">
            <div className={card}>
              <div className={cardHead}>
                <Target size={14} className="text-grass" /> Priorities — vs {opponent.name}
                <span className="ml-auto normal-case tracking-normal text-xs font-normal text-dim inline-flex items-center gap-1.5">
                  {busy && <RefreshCw size={12} className="animate-spin" />}
                  {busy ? "Updating…" : pending ? "Waiting on your review" : stale ? "Updating from your latest changes…" : updatedLabel(plan?.generatedAt)}
                </span>
              </div>
              {(plan?.priorities ?? []).length ? (
                <PlanList items={plan?.priorities ?? []} placeholder="Priority" onChange={(priorities) => setPlan({ priorities })} byId={byId} onAsk={ask} numbered initial={6} />
              ) : (
                <div className="px-5 py-5 text-sm text-dim">
                  Nothing on their film is strong enough to call a priority yet — no filler here on purpose.{" "}
                  <Link href={`/matchup?id=${opponent.id}`} className="font-semibold text-grass hover:underline">Tag more snaps</Link> or add your own line.
                  <div className="mt-2 no-print">
                    <button onClick={() => setPlan({ priorities: [coachItem()] })} className="inline-flex items-center gap-1 rounded-lg border border-dashed border-line px-3 py-1.5 text-xs font-semibold text-dim hover:text-ink hover:border-dim"><Plus size={12} /> Add a priority</button>
                  </div>
                </div>
              )}
            </div>
            <div className={`${card} no-print`}>
              <div className={cardHead}><CalendarDays size={14} className="text-dim" /> Where You Are</div>
              <div className="px-5 py-4"><PlanStatus opponent={opponent} plan={storedPlan} /></div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2 items-start">
            {filled.map(({ key, title, sub, icon: Icon, color, placeholder, wide }) => (
              <div key={key} className={`${card} print-section ${wide ? "lg:col-span-2" : ""}`}>
                <div className={cardHead}>
                  <Icon size={14} className={color} /> {title}
                  <span className="ml-auto normal-case tracking-normal text-xs font-normal text-dim">
                    {key === "emphasis" ? (
                      <Link href={`/practice?id=${opponent.id}`} className="no-print font-semibold text-grass hover:underline">
                        Build the practice script →
                      </Link>
                    ) : (
                      sub
                    )}
                  </span>
                </div>
                <PlanList
                  items={(plan?.[key] as PlanItem[]) ?? []}
                  placeholder={placeholder}
                  onChange={(items) => setPlan({ [key]: items } as Partial<GamePlan>)}
                  byId={byId}
                  onAsk={ask}
                  initial={key === "threats" || key === "emphasis" ? 5 : 4}
                />
              </div>
            ))}
          </div>

          {empty.length > 0 && (
            <div className="no-print flex flex-wrap items-center gap-2 text-xs text-dim">
              <span>Nothing to say here this week:</span>
              {empty.map(({ key, title }) => (
                <button
                  key={key}
                  onClick={() => setPlan({ [key]: [coachItem()] } as Partial<GamePlan>)}
                  className="inline-flex items-center gap-1 rounded-lg border border-dashed border-line px-2.5 py-1 font-semibold hover:text-ink hover:border-dim"
                >
                  <Plus size={11} /> {title}
                </button>
              ))}
            </div>
          )}

          <p className="no-print text-xs text-dim inline-flex items-start gap-1.5">
            <Sparkles size={13} className="mt-0.5 shrink-0" />
            <span>
              Drafted by {AI_LABEL} from the Scouting Report + My Scheme + Defensive Analysis, and kept current as they change.
              Small changes update the generated lines on their own; re-imported film or a new base call comes to you first.
              Anything you typed or edited stays put either way.
            </span>
          </p>
          <p className="no-print text-xs text-dim">
            Compare to your own plan: you&apos;re sending a real game plan of yours as the reference — when it lands we&apos;ll use it to calibrate this layout.
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
