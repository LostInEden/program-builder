"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import {
  Upload, Send, Plus, X, ChevronRight, Target, Flag, Users2, HelpCircle, CalendarDays, Check, Pencil, Mic, Binoculars,
} from "lucide-react";
import {
  useStore, useHydrated, initialsOf, DOWNS, DISTANCES, type Opponent, type ScoutFormation, type ScoutConcept, type ScoutKeyPlayer,
} from "@/lib/store";
import { AI_LABEL } from "@/lib/ai";
import TendencyImport from "@/components/TendencyImport";
import { TopTellsCard } from "@/components/TendencyReport";
import UnknownTerms from "@/components/UnknownTerms";
import PlanStatus from "@/components/PlanStatus";
import { headlineFromPlays } from "@/lib/tendencies";
import { useGamePlan } from "@/lib/useGamePlan";
import { useChat, startDictation } from "@/lib/useChat";

const card = "rounded-xl border border-line bg-card shadow-sm";
const cardHead = "display uppercase text-xs font-bold tracking-[0.15em] text-ink px-5 py-3.5 border-b border-line flex items-center gap-3";
const input = "rounded-md border border-line bg-white px-2.5 py-1.5 text-sm focus:outline-none focus:border-grass";
const th = "display uppercase text-[11px] tracking-widest text-dim font-semibold";
const uid = () => Math.random().toString(36).slice(2, 9);

function Stat({ value, label, sub }: { value: number | null; label: string; sub?: string }) {
  return (
    <div className="px-4 py-3 text-center border-r border-line last:border-0">
      <div className="text-3xl font-extrabold tracking-tight tabular-nums">{value != null ? `${value}%` : "—"}</div>
      <div className="text-xs font-semibold text-ink/80 mt-0.5">{label}</div>
      {sub && <div className="text-[11px] text-dim">{sub}</div>}
    </div>
  );
}

function Cell({ v, onChange, readOnly }: { v: number | null; onChange: (n: number | null) => void; readOnly?: boolean }) {
  const run = v != null && v >= 50;
  return (
    <div className={`relative rounded-md border px-1 py-1.5 text-center text-xs font-bold ${
      v == null ? "border-line bg-slate-50 text-dim" : run ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-sky-200 bg-sky-50 text-sky-700"
    }`}>
      {v == null ? "—" : run ? `Run ${v}%` : `Pass ${100 - v}%`}
      {!readOnly && <input
        type="number" min={0} max={100} value={v ?? ""} placeholder="run %"
        onChange={(e) => onChange(e.target.value === "" ? null : Math.max(0, Math.min(100, Number(e.target.value))))}
        className="absolute inset-0 w-full h-full opacity-0 focus:opacity-100 focus:bg-white rounded-md text-center text-xs text-ink"
        aria-label="Run percent"
      />}
    </div>
  );
}

function Editable({ value, onChange, placeholder, className = "" }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`rounded-md border border-transparent bg-transparent px-1.5 py-0.5 hover:border-line focus:border-grass focus:bg-white focus:outline-none ${className}`}
    />
  );
}

function MatchupInner() {
  const hydrated = useHydrated();
  const router = useRouter();
  const sp = useSearchParams();
  const store = useStore();
  const { opponents, addOpponent, updateOpponent, removeOpponent, seasonSchedule } = store;
  const setLastOpponent = useStore((s) => s.setLastOpponent);
  const [importOpen, setImportOpen] = useState(false);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [lastReply, setLastReply] = useState<{ q: string; a: string; actions?: { label: string; href: string }[] } | null>(null);
  const [listening, setListening] = useState(false);
  // The Ask box keeps its place on the page but posts into the ONE
  // CounterScheme conversation (Q26) — same thread as the drawer and /chat.
  const chat = useChat("/matchup");

  const o = opponents.find((x) => x.id === sp.get("id")) ?? opponents.find((x) => !x.isDemo) ?? opponents[0] ?? null;
  const { plan, regenerate } = useGamePlan(o);

  // "Ask about this" on a game plan item lands here with the question ready to
  // send — answer first, evidence second, conversation whenever he wants it (Q29).
  const askParam = sp.get("ask");
  // The chat talks about whoever he looked at last.
  useEffect(() => {
    if (o) setLastOpponent(o.id);
  }, [o, setLastOpponent]);
  const filled = useRef<string | null>(null);
  useEffect(() => {
    if (askParam && filled.current !== askParam) {
      filled.current = askParam;
      setQ(askParam);
      document.getElementById("ask-counterscheme")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [askParam]);

  if (!hydrated) return <div className="px-8 py-10 text-dim">Loading…</div>;
  const set = (patch: Partial<Opponent>) => o && updateOpponent(o.id, patch);
  // With snaps on file the tiles are counted, not typed. Without them the
  // coach's hand entry is the only truth we have, so it stays editable.
  const plays = o?.plays ?? [];
  const d = plays.length ? headlineFromPlays(plays) : null;
  // Play names are usually tagged on only some snaps; rates built on them say so.
  const taggedPlays = plays.filter((p) => p.play.trim()).length;
  // Scalars + the heatmap come off the snaps; the editable tables keep the
  // stored rows (the import already wrote the computed ones into them).
  const view = o && d
    ? { ...o, runRate: d.runRate ?? null, firstDownRun: d.firstDownRun ?? null, rpoRate: d.rpoRate ?? null,
        signatureConcept: d.signatureConcept ?? "", signatureRate: d.signatureRate ?? null,
        downDistance: d.downDistance ?? o.downDistance }
    : o;
  const go = (id: string) => router.push(`/matchup?id=${id}`);
  const week = o?.week ? seasonSchedule.find((w) => w.week === o.week) : undefined;
  const nextWeek = seasonSchedule.find((w) => w.opponent && !w.result);

  const askIt = async () => {
    const text = q.trim();
    if (!o || !text || busy) return;
    setBusy(true);
    try {
      const msg = await chat.send(text, "/matchup");
      if (msg) setLastReply({ q: text, a: msg.text, actions: msg.actions });
      setQ("");
    } finally {
      setBusy(false);
    }
  };

  const dictate = () => {
    if (listening) return;
    const h = startDictation((t) => setQ((prev) => (prev ? `${prev} ${t}` : t)), () => setListening(false));
    if (h) setListening(true);
  };

  const createPlan = async () => {
    if (!o) return;
    await regenerate();
    router.push(`/gameplan?id=${o.id}`);
  };

  const addOpp = () => {
    const name = window.prompt("Opponent name:");
    if (name?.trim()) go(addOpponent(name));
  };

  return (
    <div className="px-4 sm:px-6 py-6 sm:py-8 max-w-[1600px] mx-auto">
      <div className="mb-5 flex flex-wrap items-center gap-3 justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Opponent Matchup</h1>
          <p className="text-dim mt-0.5">Scouting Report = What they do. Game Plan = What we&apos;re going to do about it.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {opponents.length > 0 && (
            <select value={o?.id ?? ""} onChange={(e) => go(e.target.value)} className="rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold">
              {opponents.map((x) => <option key={x.id} value={x.id}>{x.name}{x.week ? ` (Wk ${x.week})` : ""}{x.isDemo ? " · demo" : ""}</option>)}
            </select>
          )}
          <button onClick={addOpp} className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-3.5 py-2 text-sm font-semibold hover:border-dim">
            <Plus size={15} /> Add Opponent
          </button>
          {o && (
            <>
              <button onClick={() => setImportOpen(true)} className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-3.5 py-2 text-sm font-semibold hover:border-dim">
                <Upload size={15} /> Upload Report
              </button>
              <button onClick={createPlan} className="inline-flex items-center gap-2 rounded-lg bg-grass px-4 py-2 text-sm font-bold text-white hover:bg-grass-deep">
                <Send size={15} /> {plan ? "Regenerate Game Plan" : "Create Game Plan"}
              </button>
            </>
          )}
        </div>
      </div>

      {!o ? (
        <div className={`${card} px-6 py-14 text-center`}>
          <div className="text-lg font-bold mb-1">No opponents yet</div>
          <p className="text-sm text-dim max-w-md mx-auto mb-4">Add the opponent, then upload a play-by-play report or fill in what you know from film.</p>
          <button onClick={addOpp} className="inline-flex items-center gap-2 rounded-lg bg-grass px-4 py-2 text-sm font-semibold text-white hover:bg-grass-deep"><Plus size={15} /> Add Opponent</button>
        </div>
      ) : (
        <motion.div key={o.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4">
          {o.isDemo && (
            <div className="rounded-lg border border-ember/40 bg-ember/5 px-4 py-2.5 text-sm flex items-center gap-3">
              <span><span className="font-semibold text-ember">Demo opponent</span> from the design mock — every number here is made up. Add a real opponent or overwrite this one.</span>
              <button onClick={() => { removeOpponent(o.id); router.push("/matchup"); }} className="ml-auto text-xs font-semibold text-dim hover:text-red-500">Remove demo</button>
            </div>
          )}

          {/* Row 1: overview · tendencies · key players */}
          <div className="grid gap-4 lg:grid-cols-[1fr_1.3fr_1.1fr] lg:grid-rows-[auto_1fr] items-stretch">
            <div className={`${card} lg:col-start-1 lg:row-span-2 flex flex-col`}>
              <div className={cardHead}>
                Opponent Overview
                <button onClick={() => setEditing((e) => !e)} className={`ml-auto normal-case tracking-normal inline-flex items-center gap-1 text-xs font-semibold ${editing ? "text-grass" : "text-dim hover:text-ink"}`}>
                  {editing ? <><Check size={12} /> Done</> : <><Pencil size={12} /> Edit</>}
                </button>
              </div>
              <div className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <span className="grid size-12 shrink-0 place-items-center rounded-full bg-red-600 text-white text-xl font-extrabold">{o.name.slice(0, 1)}</span>
                  <div className="min-w-0">
                    <Editable value={o.name} onChange={(v) => set({ name: v })} className="text-lg font-extrabold w-full" />
                    <Editable value={o.record} onChange={(v) => set({ record: v })} placeholder="6-2 Overall · 3-1 District" className="text-sm text-dim w-full" />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 text-sm">
                  {([
                    ["Offensive Coordinator", "offensiveCoordinator"],
                    ["Head Coach", "headCoach"],
                    ["Offensive Style", "offensiveStyle"],
                    ["Tempo", "tempo"],
                    ["Last Game", "lastGame"],
                  ] as [string, keyof Opponent][]).map(([label, key]) => (
                    <div key={key} className="grid grid-cols-[128px_1fr] items-center gap-2">
                      <span className="font-semibold text-ink/80">{label}</span>
                      <Editable value={(o[key] as string) ?? ""} onChange={(v) => set({ [key]: v } as Partial<Opponent>)} placeholder="—" className="text-grass font-semibold w-full" />
                    </div>
                  ))}
                  <div className="grid grid-cols-[128px_1fr] items-center gap-2">
                    <span className="font-semibold text-ink/80">Week</span>
                    <select value={o.week ?? ""} onChange={(e) => set({ week: e.target.value === "" ? null : Number(e.target.value) })} className={`${input} py-0.5`}>
                      <option value="">—</option>
                      {seasonSchedule.filter((w) => w.opponent).map((w) => <option key={w.week} value={w.week}>Wk {w.week} · {w.opponent}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="contents">
              <div className={`${card} lg:col-start-2 lg:row-start-1 flex flex-col`}>
                <div className={cardHead}>Offensive Tendencies (Season) {o.playsImported > 0 && <span className="ml-auto normal-case tracking-normal text-xs font-normal text-dim">{o.playsImported} plays imported</span>}</div>
                <div className="grid grid-cols-2 sm:grid-cols-4">
                  <Stat value={view?.runRate ?? null} label="Run Rate" sub={view?.runRate != null ? `(${100 - view.runRate}% Pass)` : undefined} />
                  <Stat value={view?.firstDownRun ?? null} label="1st Down Run" />
                  <Stat value={view?.rpoRate ?? null} label="RPO Rate" sub={taggedPlays ? `of ${taggedPlays} plays with a name` : undefined} />
                  <Stat
                    value={view?.signatureRate ?? null}
                    label={view?.signatureConcept ? `Top play: ${view.signatureConcept}` : "Top Play"}
                    sub={taggedPlays ? `of ${taggedPlays} plays with a name` : undefined}
                  />
                </div>
                {editing && !d && (
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 border-t border-line p-3 text-xs">
                    {([["runRate", "Run %"], ["firstDownRun", "1st down run %"], ["rpoRate", "RPO %"], ["signatureRate", "Top concept %"]] as [keyof Opponent, string][]).map(([k, label]) => (
                      <label key={k} className="text-dim">{label}<input type="number" value={(o[k] as number | null) ?? ""} onChange={(e) => set({ [k]: e.target.value === "" ? null : Number(e.target.value) } as Partial<Opponent>)} className={`${input} mt-1 w-full`} /></label>
                    ))}
                    <label className="text-dim">Top concept<input value={o.signatureConcept} onChange={(e) => set({ signatureConcept: e.target.value })} className={`${input} mt-1 w-full`} /></label>
                  </div>
                )}
                {d && <div className="border-t border-line px-5 py-1.5 text-center text-[11px] text-dim">Counted from the {plays.length} snaps you uploaded.</div>}
                <div className="border-t border-line px-5 py-2.5 text-center">
                  {d ? (
                    <Link href={`/scouting?id=${o.id}`} className="inline-flex items-center gap-1 text-sm font-bold text-grass hover:underline">Open the full Scouting Report <ChevronRight size={14} /></Link>
                  ) : (
                    <button onClick={() => document.getElementById("full-tendencies")?.scrollIntoView({ behavior: "smooth" })} className="inline-flex items-center gap-1 text-sm font-bold text-grass hover:underline">View Full Tendencies <ChevronRight size={14} /></button>
                  )}
                </div>
              </div>

              <div className={`${card} lg:col-start-2 lg:row-start-2 flex flex-col`}>
                <div className={cardHead}>
                  Formation Usage (Season)
                  <button onClick={() => set({ personnelUsage: [...o.personnelUsage, { id: uid(), group: "", pct: null }] })} className="ml-auto normal-case tracking-normal text-xs font-semibold text-dim hover:text-ink inline-flex items-center gap-1"><Plus size={12} /> Add</button>
                </div>
                <div className="p-4 flex flex-col gap-2 flex-1 justify-center">
                  {o.personnelUsage.map((p) => (
                    <div key={p.id} className="grid grid-cols-[minmax(0,1fr)_96px_40px_16px] items-center gap-2 text-sm">
                      <Editable value={p.group} onChange={(v) => set({ personnelUsage: o.personnelUsage.map((x) => (x.id === p.id ? { ...x, group: v } : x)) })} placeholder="11 Personnel (1 RB, 1 TE, 3 WR)" className="font-semibold w-full" />
                      <div className="h-2 rounded-full bg-slate-100 overflow-hidden"><div className="h-full rounded-full bg-grass" style={{ width: `${p.pct ?? 0}%` }} /></div>
                      <input type="number" value={p.pct ?? ""} onChange={(e) => set({ personnelUsage: o.personnelUsage.map((x) => (x.id === p.id ? { ...x, pct: e.target.value === "" ? null : Number(e.target.value) } : x)) })} className="w-11 rounded border border-transparent bg-transparent text-right text-sm font-bold tabular-nums hover:border-line focus:border-grass focus:outline-none" />
                      <button onClick={() => set({ personnelUsage: o.personnelUsage.filter((x) => x.id !== p.id) })} className="text-dim hover:text-red-500" aria-label="Remove"><X size={12} /></button>
                    </div>
                  ))}
                  {o.personnelUsage.length === 0 && <div className="py-3 text-center text-xs text-dim">Upload a report or add personnel groupings by hand.</div>}
                </div>
              </div>
            </div>

            <div className="contents">
              <div className={`${card} lg:col-start-3 lg:row-start-1 flex flex-col`}>
                <div className={cardHead}>
                  Key Players
                  <button onClick={() => set({ keyPlayers: [...o.keyPlayers, { id: uid(), name: "" }] })} className="ml-auto normal-case tracking-normal text-xs font-semibold text-dim hover:text-ink inline-flex items-center gap-1"><Plus size={12} /> Add</button>
                </div>
                <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[420px]">
                  <tbody>
                    {o.keyPlayers.map((k) => {
                      const up = (patch: Partial<ScoutKeyPlayer>) => set({ keyPlayers: o.keyPlayers.map((x) => (x.id === k.id ? { ...x, ...patch } : x)) });
                      return (
                        <tr key={k.id} className="border-b border-line/60 last:border-0">
                          <td className="pl-4 py-1.5 w-12"><Editable value={k.jersey ?? ""} onChange={(v) => up({ jersey: v })} placeholder="#" className="w-10 tabular-nums text-dim" /></td>
                          <td className="py-1.5 min-w-[110px]"><Editable value={k.name} onChange={(v) => up({ name: v })} placeholder="Name" className="w-full min-w-[100px] font-semibold text-grass" /></td>
                          <td className="py-1.5 w-12"><Editable value={k.pos ?? ""} onChange={(v) => up({ pos: v })} placeholder="Pos" className="w-11" /></td>
                          <td className="py-1.5 w-14"><Editable value={k.height ?? ""} onChange={(v) => up({ height: v })} placeholder={"6'0\""} className="w-12 text-dim" /></td>
                          <td className="py-1.5 w-12"><Editable value={k.weight ?? ""} onChange={(v) => up({ weight: v })} placeholder="lb" className="w-10 text-dim tabular-nums" /></td>
                          <td className="py-1.5 w-10"><Editable value={k.cls ?? ""} onChange={(v) => up({ cls: v })} placeholder="Jr" className="w-8 text-dim" /></td>
                          <td className="pr-2 py-1.5 w-6"><button onClick={() => set({ keyPlayers: o.keyPlayers.filter((x) => x.id !== k.id) })} className="text-dim hover:text-red-500" aria-label="Remove"><X size={12} /></button></td>
                        </tr>
                      );
                    })}
                    {o.keyPlayers.length === 0 && <tr><td className="px-4 py-4 text-center text-xs text-dim">Who wins games for them?</td></tr>}
                  </tbody>
                </table>
                </div>
              </div>

              <div className={`${card} lg:col-start-3 lg:row-start-2 flex flex-col`}>
                <div className={cardHead}>Down &amp; Distance Profile</div>
                <div className="p-3 flex-1 flex flex-col justify-center">
                  <div className="grid grid-cols-[76px_repeat(4,1fr)] gap-1.5 text-center">
                    <div />
                    {DOWNS.map((dn) => <div key={dn} className={`${th} py-1 whitespace-nowrap`}>{dn} Down</div>)}
                    {DISTANCES.map((dist) => (
                      <div key={dist} className="contents">
                        <div className="text-[11px] font-bold text-ink/80 self-center text-left pl-1">{dist}</div>
                        {DOWNS.map((down) => (
                          <Cell key={`${down}-${dist}`} v={(view ?? o).downDistance[down][dist]} readOnly={!!d} onChange={(n) => set({ downDistance: { ...o.downDistance, [down]: { ...o.downDistance[down], [dist]: n } } })} />
                        ))}
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-[10px] text-dim">{d ? "Counted from the uploaded snaps (3+ per cell). Green = run, blue = pass." : "Click a cell to enter run %. Green = run, blue = pass."}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: game plan summary · matchup notes · up next */}
          <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr] lg:grid-rows-[auto_1fr] items-stretch">
            <div className={`${card} flex flex-col lg:col-start-1 lg:row-start-1`}>
              <div className={cardHead}><Target size={14} className="text-grass" /> Game Plan Summary</div>
              <div className="p-5">
                <div className={`${th} mb-3`}>Top 3 Priorities</div>
                {plan?.priorities?.length ? (
                  <ol className="flex flex-col gap-3">
                    {plan.priorities.slice(0, 3).map((p, i) => (
                      <li key={p.id} className="flex gap-3">
                        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-navy text-white text-xs font-extrabold">{i + 1}</span>
                        <div>
                          <div className="font-bold">{p.text}</div>
                          {p.sub && <div className="text-sm text-dim">{p.sub}</div>}
                        </div>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <div className="text-sm text-dim">No plan yet — <button onClick={createPlan} className="font-semibold text-grass hover:underline">create one</button> from the tendencies above.</div>
                )}
                <Link href={`/gameplan?id=${o.id}`} className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-grass hover:underline">View Full Game Plan <ChevronRight size={14} /></Link>
              </div>
            </div>

            <div className={`${card} flex flex-col lg:col-start-1 lg:row-start-2`}>
              <div className={cardHead}>
                Matchup Notes
                <button onClick={() => set({ matchupNotes: [...o.matchupNotes, { id: uid(), label: "", value: "" }] })} className="ml-auto normal-case tracking-normal text-xs font-semibold text-dim hover:text-ink inline-flex items-center gap-1"><Plus size={12} /> Add</button>
              </div>
              <div className="p-4 flex flex-col gap-3">
                {o.matchupNotes.map((n) => (
                  <div key={n.id} className="flex items-start gap-3">
                    <span className="grid size-8 shrink-0 place-items-center rounded-full border border-line text-grass"><Flag size={13} /></span>
                    <div className="min-w-0 flex-1">
                      <Editable value={n.label} onChange={(v) => set({ matchupNotes: o.matchupNotes.map((x) => (x.id === n.id ? { ...x, label: v } : x)) })} placeholder="Favorite Concept" className="w-full text-sm font-bold" />
                      <Editable value={n.value} onChange={(v) => set({ matchupNotes: o.matchupNotes.map((x) => (x.id === n.id ? { ...x, value: v } : x)) })} placeholder="Inside Zone / RPO Alert" className="w-full text-sm text-dim" />
                    </div>
                    <button onClick={() => set({ matchupNotes: o.matchupNotes.filter((x) => x.id !== n.id) })} className="text-dim hover:text-red-500" aria-label="Remove"><X size={12} /></button>
                  </div>
                ))}
                <div>
                  <div className={`${th} mb-1`}>Red Zone</div>
                  <textarea rows={2} value={o.redZone} onChange={(e) => set({ redZone: e.target.value })} placeholder="What they do inside the 20" className={`${input} w-full resize-y`} />
                </div>
              </div>
            </div>

            <div className={`${card} flex flex-col lg:col-start-2 lg:row-span-2`}>
              <div className={cardHead}><CalendarDays size={14} className="text-dim" /> Up Next</div>
              <div className="p-5 text-center">
                <div className="flex items-center justify-center gap-3 mb-2">
                  <span className="grid size-11 place-items-center rounded-full bg-red-600 text-white font-extrabold">{o.name.slice(0, 1)}</span>
                  <span className="rounded-full border border-line px-2 py-0.5 text-[10px] font-bold text-dim">VS</span>
                  <span className="grid size-11 place-items-center rounded-full bg-navy text-white font-extrabold">{initialsOf(store.program.name)}</span>
                </div>
                <div className="font-extrabold">vs. {o.name}</div>
                <div className="text-sm text-dim">
                  {week ? `${new Date(week.date + "T12:00:00").toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })} · ${week.homeAway === "home" ? "Home" : "Away"}` : nextWeek ? `Next on the schedule: Wk ${nextWeek.week} vs ${nextWeek.opponent}` : "Set the week above"}
                </div>
                <div className="mt-4 text-left">
                  <PlanStatus opponent={o} plan={plan} />
                </div>
                <div className="mt-3 flex flex-wrap justify-center gap-2 text-xs font-semibold">
                  <Link href={`/gameplan?id=${o.id}`} className="rounded-lg border border-line px-3 py-1.5 hover:border-dim">Game Plan</Link>
                  <Link href={`/practice?id=${o.id}`} className="rounded-lg border border-line px-3 py-1.5 hover:border-dim">Practice Script</Link>
                </div>
              </div>
            </div>
          </div>

          {/* Row 3: the top tells only — the long report lives on /scouting (Q43) */}
          {plays.length > 0 ? (
            <>
              <UnknownTerms plays={plays} />
              <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr] items-start">
                <TopTellsCard plays={plays} href={`/scouting?id=${o.id}`} />
                <div className={`${card} flex flex-col`}>
                  <div className={cardHead}><Binoculars size={14} className="text-grass" /> Scouting Report</div>
                  <div className="flex-1 px-5 py-4 text-sm text-dim">
                    Personnel, top formations, top plays, best players and every tell — read off the {plays.length} snaps you uploaded — live on the Scouting Report. It prints clean for the staff.
                  </div>
                  <div className="border-t border-line px-5 py-2.5">
                    <Link href={`/scouting?id=${o.id}`} className="inline-flex items-center gap-1 text-sm font-bold text-grass hover:underline">Open the Scouting Report <ChevronRight size={14} /></Link>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className={`${card} px-5 py-6 text-center`}>
              <div className="font-bold mb-1">No Tendency Report yet</div>
              <p className="text-sm text-dim max-w-xl mx-auto">
                Upload the full Hudl play-by-play — one row per snap — and CounterScheme reads the snaps itself: their situations, what they line up in out of each personnel group, their best plays, and the tells worth building an answer for. Everything you type below still works in the meantime.
              </p>
              <button onClick={() => setImportOpen(true)} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-grass px-4 py-2 text-sm font-bold text-white hover:bg-grass-deep"><Upload size={15} /> Upload Report</button>
            </div>
          )}

          {/* Row 4: full tendencies (formations + concepts) */}
          <div id="full-tendencies" className="grid gap-4 lg:grid-cols-2 items-stretch">
            <div className={`${card} flex flex-col`}>
              <div className={cardHead}>
                Formations / Sets
                <button onClick={() => set({ formations: [...o.formations, { id: uid(), name: "" }] })} className="ml-auto normal-case tracking-normal text-xs font-semibold text-dim hover:text-ink inline-flex items-center gap-1"><Plus size={12} /> Add</button>
              </div>
              <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[520px]">
                <thead><tr className="border-b border-line bg-slate-50"><th className={`${th} text-left px-4 py-2`}>Formation</th><th className={`${th} text-right px-2 py-2 w-20`}>Snaps</th><th className={`${th} text-right px-2 py-2 w-16`}>Run</th><th className={`${th} text-left px-3 py-2`}>Notes</th><th className="w-8" /></tr></thead>
                <tbody>
                  {o.formations.map((f) => {
                    const up = (p: Partial<ScoutFormation>) => set({ formations: o.formations.map((x) => (x.id === f.id ? { ...x, ...p } : x)) });
                    return (
                      <tr key={f.id} className="border-b border-line/60 last:border-0">
                        <td className="px-3 py-1"><Editable value={f.name} onChange={(v) => up({ name: v })} placeholder="Trips Right" className="w-full font-semibold" /></td>
                        <td className="px-2 py-1"><input type="number" value={f.snapsPct ?? ""} onChange={(e) => up({ snapsPct: e.target.value === "" ? null : Number(e.target.value) })} placeholder="%" className={`${input} w-full text-right tabular-nums py-0.5`} /></td>
                        <td className="px-2 py-1"><input type="number" value={f.runPct ?? ""} onChange={(e) => up({ runPct: e.target.value === "" ? null : Number(e.target.value) })} placeholder="%" className={`${input} w-full text-right tabular-nums py-0.5`} /></td>
                        <td className="px-3 py-1"><Editable value={f.notes ?? ""} onChange={(v) => up({ notes: v })} placeholder="Motion? Personnel?" className="w-full text-dim" /></td>
                        <td className="px-2 py-1"><button onClick={() => set({ formations: o.formations.filter((x) => x.id !== f.id) })} className="text-dim hover:text-red-500" aria-label="Remove"><X size={12} /></button></td>
                      </tr>
                    );
                  })}
                  {o.formations.length === 0 && <tr><td colSpan={5} className="px-4 py-4 text-center text-xs text-dim">What do they line up in most?</td></tr>}
                </tbody>
              </table>
              </div>
            </div>
            <div className={`${card} flex flex-col`}>
              <div className={cardHead}>
                Run / Pass Concepts
                <button onClick={() => set({ concepts: [...o.concepts, { id: uid(), name: "", type: "Run" }] })} className="ml-auto normal-case tracking-normal text-xs font-semibold text-dim hover:text-ink inline-flex items-center gap-1"><Plus size={12} /> Add</button>
              </div>
              <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[520px]">
                <thead><tr className="border-b border-line bg-slate-50"><th className={`${th} text-left px-4 py-2`}>Concept</th><th className={`${th} text-left px-2 py-2 w-20`}>Type</th><th className={`${th} text-right px-2 py-2 w-16`}>Seen</th><th className={`${th} text-left px-3 py-2`}>Notes</th><th className="w-8" /></tr></thead>
                <tbody>
                  {o.concepts.map((c) => {
                    const up = (p: Partial<ScoutConcept>) => set({ concepts: o.concepts.map((x) => (x.id === c.id ? { ...x, ...p } : x)) });
                    return (
                      <tr key={c.id} className="border-b border-line/60 last:border-0">
                        <td className="px-3 py-1"><Editable value={c.name} onChange={(v) => up({ name: v })} placeholder="Inside Zone" className="w-full font-semibold" /></td>
                        <td className="px-2 py-1"><select value={c.type} onChange={(e) => up({ type: e.target.value as ScoutConcept["type"] })} className={`${input} w-full py-0.5`}><option>Run</option><option>Pass</option></select></td>
                        <td className="px-2 py-1"><input type="number" value={c.freq ?? ""} onChange={(e) => up({ freq: e.target.value === "" ? null : Number(e.target.value) })} placeholder="#" className={`${input} w-full text-right tabular-nums py-0.5`} /></td>
                        <td className="px-3 py-1"><Editable value={c.notes ?? ""} onChange={(v) => up({ notes: v })} placeholder="When do they run it?" className="w-full text-dim" /></td>
                        <td className="px-2 py-1"><button onClick={() => set({ concepts: o.concepts.filter((x) => x.id !== c.id) })} className="text-dim hover:text-red-500" aria-label="Remove"><X size={12} /></button></td>
                      </tr>
                    );
                  })}
                  {o.concepts.length === 0 && <tr><td colSpan={5} className="px-4 py-4 text-center text-xs text-dim">Their bread-and-butter plays.</td></tr>}
                </tbody>
              </table>
              </div>
            </div>
          </div>

          {/* Row 4: Ask CounterScheme */}
          <div id="ask-counterscheme" className={`${card} grid lg:grid-cols-[1.5fr_1fr] divide-y lg:divide-y-0 lg:divide-x divide-line`}>
            <div className="p-5">
              <div className="flex items-start gap-3 mb-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-navy text-white font-extrabold text-xs">CS</span>
                <div>
                  <div className="font-extrabold">Ask CounterScheme</div>
                  <p className="text-sm text-dim">Ask a question about this opponent…</p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-line bg-white p-2">
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && askIt()}
                  placeholder="Example: What are their weaknesses on 3rd down? — or teach me a word: “Utah is Trips with the TE on”"
                  className="flex-1 bg-transparent px-2 text-sm focus:outline-none"
                />
                <button onClick={dictate} aria-label="Dictate" className={`grid size-8 place-items-center rounded-lg ${listening ? "text-red-500" : "text-dim hover:text-ink"}`}><Mic size={16} /></button>
                <button onClick={askIt} disabled={!q.trim() || busy} className="inline-flex items-center gap-1.5 rounded-lg bg-grass px-4 py-2 text-sm font-bold text-white hover:bg-grass-deep disabled:opacity-50"><Send size={14} /> Ask</button>
              </div>
              {(lastReply ?? (o.questions[0] ? { q: o.questions[0].q, a: o.questions[0].a, actions: undefined } : null)) && (
                <div className="mt-3 rounded-lg border border-line bg-slate-50 px-4 py-3 text-sm">
                  <div className="text-xs font-semibold text-dim mb-1">Q: {(lastReply ?? o.questions[0]).q}</div>
                  <div className="leading-relaxed">{(lastReply ?? o.questions[0]).a}</div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(lastReply?.actions ?? []).map((a) => (
                      <Link key={a.label + a.href} href={a.href} className="rounded-lg border border-line bg-white px-2.5 py-1 text-[12px] font-semibold text-grass hover:border-grass">{a.label}</Link>
                    ))}
                    <Link href="/chat" className="rounded-lg border border-line bg-white px-2.5 py-1 text-[12px] font-semibold text-dim hover:border-grass hover:text-grass">Open the conversation</Link>
                  </div>
                </div>
              )}
              <p className="mt-2 text-[11px] text-dim">This is the same CounterScheme conversation as the chat — answers come from the scouting data on this page. Engine: {AI_LABEL}.</p>
            </div>
            <div className="p-5">
              <div className={`${th} mb-2 flex items-center gap-1.5`}><HelpCircle size={12} /> Recent Questions</div>
              {o.questions.slice(0, 4).map((x) => (
                <button key={x.id} onClick={() => setQ(x.q)} className="block w-full text-left py-1.5 text-sm border-b border-line/60 last:border-0 hover:text-grass truncate">{x.q}</button>
              ))}
              {o.questions.length === 0 && <div className="text-sm text-dim">Nothing asked yet.</div>}
            </div>
          </div>

          <div className={card}>
            <div className={cardHead}><Users2 size={14} className="text-dim" /> Scouting Notes</div>
            <div className="p-4"><textarea rows={3} value={o.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Coaching tendencies, tempo, trick plays they carry…" className={`${input} w-full resize-y`} /></div>
          </div>
        </motion.div>
      )}

      {importOpen && o && <TendencyImport onClose={() => setImportOpen(false)} onApply={(patch) => set(patch)} />}
    </div>
  );
}

export default function MatchupPage() {
  return (
    <Suspense fallback={<div className="px-8 py-10 text-dim">Loading…</div>}>
      <MatchupInner />
    </Suspense>
  );
}
