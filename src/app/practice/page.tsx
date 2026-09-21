"use client";

// Practice Emphasis + Scout Cards (Q5, Q40 steps 5–6).
//
// The coach's own process, in three moves: CounterScheme builds a bigger
// candidate pool than he'll ever practice and says why each rep matters, he
// eliminates down to the essentials, and the week writes itself — Monday walk
// it, Tuesday jog it, Wednesday full speed, Thursday clean it up (Q1).

import { Suspense, useState } from "react";
import Link from "next/link";
import PlanNavigation from "@/components/PlanNavigation";
import ApprovedDecisionReference from "@/components/ApprovedDecisionReference";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft, ArrowDown, ArrowUp, ChevronDown, ChevronRight, ClipboardList, Printer,
  AlertTriangle, Check, X, Users2, Shuffle, Info,
} from "lucide-react";
import { useStore, useHydrated, type Opponent, type Play } from "@/lib/store";
import { PRACTICE_DAYS, type PracticeDay, type PracticeRep } from "@/lib/practice";
import { principle } from "@/lib/principles";
import { usePractice, type PracticeWeek } from "@/lib/usePractice";
import { PlayTable } from "@/components/TendencyReport";
import { AI_LABEL } from "@/lib/ai";

const card = "rounded-xl border border-line bg-card shadow-sm";
const cardHead = "display uppercase text-xs font-bold tracking-[0.15em] text-ink px-5 py-3.5 border-b border-line flex items-center gap-3";
const th = "display uppercase text-[11px] tracking-widest text-dim font-semibold";
const input = "rounded-md border border-line bg-white px-2.5 py-1.5 text-sm focus:outline-none focus:border-grass";

const one = (v: number | null | undefined) => (v == null ? "—" : v.toFixed(1));
const pc = (v: number | null | undefined) => (v == null ? "—" : `${Math.round(v * 100)}%`);

const KIND_CHIP: Record<PracticeRep["kind"], { label: string; cls: string }> = {
  look: { label: "Look", cls: "border-line text-dim" },
  operation: { label: "Personnel operation", cls: "border-navy/30 bg-navy/5 text-navy" },
  counter: { label: "Counter — our guess", cls: "border-amber-500/40 bg-amber-50 text-amber-700" },
};

function Chip({ label, value, meaning }: { label: string; value: string; meaning?: string }) {
  if (!value) return null;
  return (
    <span className="inline-flex items-baseline gap-1.5 rounded-md border border-line bg-white px-2 py-0.5 text-xs">
      <span className={th}>{label}</span>
      <span className="font-semibold">{value}</span>
      {meaning && <span className="text-dim">({meaning})</span>}
    </span>
  );
}

/** Everything the scout team needs off the breakdown (Q5). */
function RepDetails({ rep, byId }: { rep: PracticeRep; byId: Map<string, Play> }) {
  const [open, setOpen] = useState(false);
  const rows = rep.playIds.map((id) => byId.get(id)).filter((p): p is Play => !!p);
  return (
    <>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        <Chip label="Pers" value={rep.personnel} />
        <Chip label="Form" value={rep.formation} meaning={rep.formationMeaning} />
        <Chip label="Backfield" value={rep.backfield} />
        <Chip label="Motion" value={rep.motion} />
        <Chip label="Play" value={rep.play} meaning={rep.playMeaning} />
        <Chip label="Dir" value={rep.direction} />
        <Chip label="Hash" value={rep.hash} />
        <Chip label="Situation" value={rep.situation} />
        <Chip label="D & D" value={rep.downDistance} />
      </div>
      {rep.stats.n > 0 && (
        <div className="mt-1.5 text-xs text-dim">
          {rep.stats.n} snap{rep.stats.n === 1 ? "" : "s"} · {pc(rep.stats.runRate)} run · {one(rep.stats.avgGain)} yds a snap ·{" "}
          {pc(rep.stats.successRate)} success{rep.stats.explosive ? ` · ${rep.stats.explosive} explosive` : ""}
          {rep.stats.tds ? ` · ${rep.stats.tds} TD` : ""}
        </div>
      )}
      {rep.answer && (
        <div className="mt-1.5 text-xs">
          <span className={th}>{rep.hasAnswer ? "Our call" : "No stored answer"}</span>{" "}
          <span className={rep.hasAnswer ? "text-ink" : "text-amber-700"}>{rep.answer}</span>
        </div>
      )}
      {rows.length > 0 && (
        <div className="mt-1">
          <button onClick={() => setOpen((v) => !v)} className="inline-flex items-center gap-1 text-xs font-bold text-grass hover:underline">
            {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />} The snaps
          </button>
          {open && (
            <div className="mt-1.5 rounded-lg border border-line bg-slate-50/60 px-3 py-2">
              <PlayTable plays={rows} />
            </div>
          )}
        </div>
      )}
    </>
  );
}

function PoolRow({
  rep, week, byId, index, last,
}: { rep: PracticeRep; week: PracticeWeek; byId: Map<string, Play>; index: number; last: boolean }) {
  const on = week.isIn(rep);
  const kind = KIND_CHIP[rep.kind];
  return (
    <div className={`flex items-start gap-3 px-5 py-3 ${on ? "" : "opacity-55"} ${last ? "" : "border-b border-line/60"}`}>
      <button
        onClick={() => week.toggle(rep, !on)}
        aria-label={on ? "Take this rep out" : "Put this rep in"}
        className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-md border text-white ${
          on ? "border-grass bg-grass" : "border-line bg-white text-transparent hover:border-dim"
        }`}
      >
        <Check size={14} />
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-bold text-ink">
            {rep.play || rep.formation || `${rep.personnel} personnel`}
            {rep.play && rep.formation ? <span className="font-normal text-dim"> from {rep.formation}</span> : null}
          </span>
          <span className={`rounded-full border px-1.5 py-0.5 text-[10px] font-bold ${kind.cls}`}>{kind.label}</span>
          {rep.flags.map((f) => (
            <span key={f} className="rounded-full border border-line px-1.5 py-0.5 text-[10px] font-bold text-dim">{f}</span>
          ))}
        </div>
        <div className="mt-0.5 text-sm text-dim">{rep.why}</div>
        <RepDetails rep={rep} byId={byId} />
      </div>
      <div className="flex shrink-0 flex-col gap-1">
        <button onClick={() => week.move(rep.id, -1)} disabled={index === 0} className="rounded border border-line p-1 text-dim hover:text-ink disabled:opacity-30" aria-label="Move up"><ArrowUp size={13} /></button>
        <button onClick={() => week.move(rep.id, 1)} disabled={last} className="rounded border border-line p-1 text-dim hover:text-ink disabled:opacity-30" aria-label="Move down"><ArrowDown size={13} /></button>
      </div>
    </div>
  );
}

function DayCard({ week, day, index }: { week: PracticeWeek; day: PracticeDay; index: number }) {
  const meta = PRACTICE_DAYS[index];
  const script = week.script.find((d) => d.day === day);
  const byId = new Map(week.pool?.reps.map((r) => [r.id, r]) ?? []);
  const reps = (script?.repIds ?? []).map((id) => byId.get(id)).filter((r): r is PracticeRep => !!r);
  return (
    <div className={card}>
      <div className={cardHead}>
        {meta.label}
        <span className="rounded-full bg-navy px-2 py-0.5 text-[10px] font-extrabold tracking-wider text-white">{meta.tempo}</span>
        <span className="ml-auto normal-case tracking-normal text-xs font-normal text-dim">{reps.length} rep{reps.length === 1 ? "" : "s"}</span>
      </div>
      <div className="px-5 py-3 text-xs text-dim border-b border-line/60">
        <div className="font-semibold text-ink">{meta.purpose}</div>
        <div className="mt-0.5">{script?.presentation}</div>
      </div>
      {reps.length === 0 ? (
        <div className="px-5 py-6 text-center text-sm text-dim">Nothing on this day yet.</div>
      ) : (
        <ol className="flex flex-col">
          {reps.map((rep, i) => (
            <li key={rep.id} className="flex items-start gap-2.5 px-5 py-2.5 border-b border-line/60 last:border-0">
              <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-slate-100 text-[10px] font-extrabold text-dim">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold truncate">
                  {rep.play || rep.formation || `${rep.personnel} personnel`}
                  {rep.kind !== "look" && <span className="ml-1.5 text-[10px] font-bold text-dim uppercase">{KIND_CHIP[rep.kind].label}</span>}
                </div>
                <div className="text-[11px] text-dim">
                  {[rep.personnel, rep.formation, rep.backfield, rep.motion, rep.direction, rep.hash, day === "Tue" || day === "Wed" ? rep.situation : ""].filter(Boolean).join(" · ") || rep.why}
                </div>
              </div>
              <select
                value=""
                onChange={(e) => {
                  const v = e.target.value;
                  week.moveToDay(rep.id, v === "off" ? null : (v as PracticeDay), day);
                }}
                className="shrink-0 rounded border border-line bg-white px-1.5 py-1 text-[11px] text-dim"
                aria-label="Move this rep"
              >
                <option value="">Move…</option>
                {PRACTICE_DAYS.filter((d) => d.day !== day).map((d) => (
                  <option key={d.day} value={d.day}>To {d.label}</option>
                ))}
                <option value="off">Drop from {meta.label}</option>
              </select>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function ScoutCards({ week, opponent }: { week: PracticeWeek; opponent: Opponent }) {
  return (
    <div id="scout-cards" className="grid gap-3 sm:grid-cols-2">
      {week.cards.map(({ number, rep, days }) => (
        <div key={rep.id} className="scout-card rounded-lg border border-line bg-white px-4 py-3">
          <div className="flex items-baseline gap-2 border-b border-line pb-1.5">
            <span className="display text-xs font-extrabold uppercase tracking-[0.15em]">{opponent.name}</span>
            <span className="ml-auto text-xs font-bold text-dim">Card {number}</span>
          </div>
          <div className="mt-2 flex flex-wrap items-baseline gap-2">
            <span className="text-lg font-extrabold leading-tight">{rep.play || rep.formation || `${rep.personnel} personnel`}</span>
            {rep.kind !== "look" && <span className="text-[10px] font-bold uppercase tracking-wider text-dim">{KIND_CHIP[rep.kind].label}</span>}
          </div>
          <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            {([
              ["Personnel", rep.personnel],
              ["Formation", rep.formation + (rep.formationMeaning ? ` (${rep.formationMeaning})` : "")],
              ["Backfield", rep.backfield],
              ["Motion", rep.motion],
              ["Play / concept", rep.play + (rep.playMeaning ? ` (${rep.playMeaning})` : "")],
              ["Direction", rep.direction],
              ["Hash", rep.hash],
              ["Situation", rep.situation],
              ["Down & distance", rep.downDistance],
            ] as [string, string][])
              .filter(([, v]) => v && v.trim())
              .map(([k, v]) => (
                <div key={k} className="flex gap-1.5">
                  <dt className={`${th} shrink-0`}>{k}</dt>
                  <dd className="font-semibold">{v}</dd>
                </div>
              ))}
          </dl>
          <div className="mt-2 border-t border-line pt-1.5 text-xs">
            <span className={th}>Scout team</span> <span>{rep.note}</span>
          </div>
          {rep.answer && (
            <div className="mt-1 text-xs">
              <span className={th}>{rep.hasAnswer ? "Our call" : "No call on file"}</span> <span>{rep.answer}</span>
            </div>
          )}
          <div className="mt-1.5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-dim">
            {days.length ? days.join(" · ") : "Not on the script"}
          </div>
        </div>
      ))}
    </div>
  );
}

function PracticeInner() {
  const hydrated = useHydrated();
  const router = useRouter();
  const sp = useSearchParams();
  const opponents = useStore((s) => s.opponents);

  const opponent = opponents.find((o) => o.id === sp.get("id")) ?? opponents.find((o) => !o.isDemo) ?? opponents[0] ?? null;
  const week = usePractice(opponent);

  if (!hydrated) return <div className="px-8 py-10 text-dim">Loading…</div>;

  const byId = new Map((opponent?.plays ?? []).map((p) => [p.id, p]));
  const s = week.summary;
  const over = !!s && s.chosen > (week.pool?.cap.high ?? 16);

  return (
    <div className="px-6 py-8 max-w-6xl mx-auto print-root">
      {opponent && <PlanNavigation id={opponent.id} active="Practice Script" />}
      {opponent && <ApprovedDecisionReference id={opponent.id} />}
      <style>{`
        @media print {
          header, aside, .no-print { display: none !important; }
          body { background: #fff !important; }
          .print-root { max-width: none !important; padding: 0 !important; }
          #scout-cards { display: grid !important; grid-template-columns: 1fr 1fr !important; gap: 6mm !important; }
          .scout-card { break-inside: avoid; border: 1px solid #888 !important; box-shadow: none !important; }
          @page { size: letter; margin: 12mm; }
        }
      `}</style>

      <div className="no-print">
        <Link href={opponent ? `/gameplan?id=${opponent.id}` : "/gameplan"} className="inline-flex items-center gap-1.5 text-sm text-dim hover:text-ink mb-3">
          <ArrowLeft size={15} /> Game Plan
        </Link>
        <div className="mb-5 flex flex-wrap items-center gap-3 justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">
              Practice Script <span className="align-middle ml-1 rounded-full border border-line bg-pitch px-2 py-0.5 text-[11px] font-bold uppercase tracking-widest text-dim">Optional</span>
            </h1>
            <p className="text-dim mt-0.5 max-w-2xl">
              The scouting report and the game plan come first. Practice plans, periods and drills come later —
              this is just the scout-team look list when you want it: ranked reps, narrowed by you, printed as cards.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {opponents.length > 0 && (
              <select value={opponent?.id ?? ""} onChange={(e) => router.push(`/practice?id=${e.target.value}`)} className="rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold">
                {opponents.map((o) => <option key={o.id} value={o.id}>{o.name}{o.week ? ` (Wk ${o.week})` : ""}</option>)}
              </select>
            )}
            {!!week.cards.length && (
              <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg bg-grass px-4 py-2 text-sm font-bold text-white hover:bg-grass-deep">
                <Printer size={15} /> Print scout cards
              </button>
            )}
          </div>
        </div>
      </div>

      {!opponent ? (
        <div className={`${card} px-6 py-14 text-center no-print`}>
          <ClipboardList size={34} className="mx-auto text-dim mb-3" />
          <div className="text-lg font-bold mb-1">No opponent yet</div>
          <p className="text-sm text-dim max-w-md mx-auto mb-4">Add one in Opponent Matchup and upload their play-by-play — the reps come straight off the snaps.</p>
          <Link href="/matchup" className="inline-flex items-center gap-2 rounded-lg bg-grass px-4 py-2 text-sm font-semibold text-white hover:bg-grass-deep">Go to Opponent Matchup</Link>
        </div>
      ) : !week.pool?.reps.length ? (
        <div className={`${card} px-6 py-14 text-center no-print`}>
          <ClipboardList size={34} className="mx-auto text-dim mb-3" />
          <div className="text-lg font-bold mb-1">Nothing to rep for {opponent.name} yet</div>
          <p className="text-sm text-dim max-w-lg mx-auto mb-4">
            {week.pool?.warning ?? "Upload the Hudl play-by-play on Opponent Matchup. CounterScheme reads the snaps and builds the candidate reps itself."}
          </p>
          <Link href={`/matchup?id=${opponent.id}`} className="inline-flex items-center gap-2 rounded-lg bg-grass px-4 py-2 text-sm font-semibold text-white hover:bg-grass-deep">Open Opponent Matchup</Link>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* -- how many reps, and the honest warning when it's too many (Q5) */}
          <div className={`${card} no-print px-5 py-4 flex flex-wrap items-center gap-x-8 gap-y-3`}>
            <div>
              <div className={th}>On the script</div>
              <div className="text-2xl font-extrabold leading-tight">
                {s?.chosen}
                <span className="text-base font-semibold text-dim"> of {s?.total} candidates</span>
              </div>
            </div>
            <div>
              <div className={th}>Suggested</div>
              <div className="text-sm font-semibold">{week.pool.cap.low}–{week.pool.cap.high} reps</div>
            </div>
            <div>
              <div className={th}>With a call on file</div>
              <div className="text-sm font-semibold">{s?.covered} <span className="font-normal text-dim">· {s?.gaps} still need one</span></div>
            </div>
            <div>
              <div className={th}>Snaps covered</div>
              <div className="text-sm font-semibold">{s?.snapsCovered} of {week.pool.snaps}</div>
            </div>
            {over && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 max-w-md">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                <span>More reps than the kids can master. {principle("quality")} Take out the ones you can live without.</span>
              </div>
            )}
          </div>

          {week.pool.warning && (
            <div className="no-print flex items-start gap-2 rounded-lg border border-line bg-white px-4 py-3 text-xs text-dim">
              <Info size={14} className="mt-0.5 shrink-0" /> {week.pool.warning}
            </div>
          )}

          {/* -- the pool: start big, eliminate down (Q5) */}
          <div className={`${card} no-print`}>
            <div className={cardHead}>
              <ClipboardList size={14} className="text-grass" /> Candidate Reps
              <span className="ml-auto normal-case tracking-normal text-xs font-normal text-dim">
                Ranked by how often they run it × how well it works × how much it stresses our rules
              </span>
            </div>
            <div className="flex flex-col">
              {week.ordered.map((rep, i) => (
                <PoolRow key={rep.id} rep={rep} week={week} byId={byId} index={i} last={i === week.ordered.length - 1} />
              ))}
            </div>
          </div>

          {/* -- the week (Q1) */}
          <div className="no-print">
            <div className="mb-2 flex items-center gap-2">
              <Shuffle size={15} className="text-grass" />
              <h2 className="text-lg font-extrabold">The Week</h2>
              <span className="text-xs text-dim">
                The important reps repeat — the presentation and the purpose progress.
              </span>
            </div>
            <div className="grid gap-4 lg:grid-cols-2 items-start">
              {PRACTICE_DAYS.map((d, i) => (
                <DayCard key={d.day} week={week} day={d.day} index={i} />
              ))}
            </div>
          </div>

          {/* -- notes the coach keeps with the script */}
          <div className={`${card} no-print`}>
            <div className={cardHead}><Users2 size={14} className="text-dim" /> Notes for the staff</div>
            <div className="p-4">
              <textarea
                value={week.selection.notes}
                onChange={(e) => week.setSelection({ notes: e.target.value })}
                placeholder="Anything the scout team or the position coaches need to know this week."
                rows={3}
                className={`${input} w-full resize-y`}
              />
            </div>
          </div>

          {/* -- scout cards */}
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2 no-print">
              <Printer size={15} className="text-grass" />
              <h2 className="text-lg font-extrabold">Scout Cards</h2>
              <span className="text-xs text-dim">
                One card per rep, {week.cards.length} total. No field diagram in V1 — the words are what the scout team reads.
              </span>
              {!!week.cards.length && (
                <button onClick={() => window.print()} className="ml-auto inline-flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-bold hover:border-dim">
                  <Printer size={13} /> Print
                </button>
              )}
            </div>
            {week.cards.length ? (
              <ScoutCards week={week} opponent={opponent} />
            ) : (
              <div className={`${card} px-5 py-8 text-center text-sm text-dim no-print`}>
                <X size={20} className="mx-auto mb-2 text-dim" />
                Nothing is on the script yet — put a rep back in above and the cards print themselves.
              </div>
            )}
          </div>

          <p className="no-print text-xs text-dim">
            Ranked by {AI_LABEL} from the opponent&apos;s snaps, your saved defense and this week&apos;s game plan. Your include /
            exclude choices and your order stay put when the numbers change.
          </p>
        </div>
      )}
    </div>
  );
}

export default function PracticePage() {
  return (
    <Suspense fallback={<div className="px-8 py-10 text-dim">Loading…</div>}>
      <PracticeInner />
    </Suspense>
  );
}
