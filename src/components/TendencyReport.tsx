"use client";

// The Scouting Report body — everything CounterScheme found in the opponent's
// snaps. Answer first, evidence second (Q29): each tell reads as one football
// sentence, and the Evidence toggle opens the actual plays behind it.
//
// Q43 split these pieces out: the long report now lives on /scouting under the
// coach's five headings, and Opponent Matchup keeps only the compact top-tells
// card that links here.

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, Search, Users2, Layers, ListOrdered, Flame, UserSquare2 } from "lucide-react";
import { useStore, type Play } from "@/lib/store";
import {
  bestPlays, computeTells, formationCombos, formationsByPersonnel, keyPlayerUsage, makeResolver,
  sideOf, situationTable, summarize, tag, tellSentence, type Tell, type TagResolver,
} from "@/lib/tendencies";
import { lockable } from "@/lib/plan";
import { shortMeaning, type TermKind } from "@/lib/knowledge";

const card = "rounded-xl border border-line bg-card shadow-sm print-card";
const cardHead = "display uppercase text-xs font-bold tracking-[0.15em] text-ink px-5 py-3.5 border-b border-line flex items-center gap-3";
const th = "display uppercase text-[11px] tracking-widest text-dim font-semibold";

const pc = (v: number | null | undefined) => (v == null ? "—" : `${Math.round(v * 100)}%`);
const one = (v: number | null | undefined) => (v == null ? "—" : v.toFixed(1));

/** Raw tag stays primary; what it means rides alongside it (Q27) — on one
 *  line, clipped, with the full meaning on hover so tables never balloon. */
function Term({ raw, kind, resolve, max = 44 }: { raw: string; kind?: TermKind; resolve: TagResolver; max?: number }) {
  const full = shortMeaning(resolve(raw, kind), 200);
  const meaning = shortMeaning(resolve(raw, kind), max);
  return (
    <span className="inline-flex max-w-full items-baseline gap-1 whitespace-nowrap" title={full || undefined}>
      <span>{raw}</span>
      {meaning && <span className="truncate font-normal text-dim">({meaning})</span>}
    </span>
  );
}

function useResolver() {
  const termMap = useStore((s) => s.termMap);
  return useMemo(() => makeResolver(termMap), [termMap]);
}

/** The evidence rows. Shared with the Game Plan so evidence looks the same everywhere. */
export function PlayTable({ plays }: { plays: Play[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-line bg-slate-50">
            {["#", "Qtr", "D & D", "Hash", "Formation", "Backfield", "Play", "Dir", "Result", "Gain"].map((h) => (
              <th key={h} className={`${th} text-left px-2 py-1.5 whitespace-nowrap`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {plays.map((p) => (
            <tr key={p.id} className="border-b border-line/60 last:border-0">
              <td className="px-2 py-1 tabular-nums text-dim">{p.num || "—"}</td>
              <td className="px-2 py-1 tabular-nums text-dim">{p.quarter || "—"}</td>
              <td className="px-2 py-1 tabular-nums whitespace-nowrap">{p.down ? `${p.down} & ${p.distance ?? "?"}` : "—"}</td>
              <td className="px-2 py-1">{p.hash || "—"}</td>
              <td className="px-2 py-1 font-semibold whitespace-nowrap">{p.formation || "—"}</td>
              <td className="px-2 py-1">{p.backfield || "—"}</td>
              <td className="px-2 py-1 whitespace-nowrap">{p.play || p.playType || "—"}</td>
              <td className="px-2 py-1">{sideOf(p.direction) || p.direction || "—"}</td>
              <td className="px-2 py-1 text-dim whitespace-nowrap">{p.result || "—"}</td>
              <td className="px-2 py-1 tabular-nums font-semibold">{p.gain == null ? "—" : p.gain}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TellCard({ tell, byId, rank, resolve }: { tell: Tell; byId: Map<string, Play>; rank: number; resolve: TagResolver }) {
  const [open, setOpen] = useState(false);
  const evidence = tell.playIds.map((id) => byId.get(id)).filter((p): p is Play => !!p);
  const missed = tell.matchIds.length - tell.playIds.length;
  const lock = lockable(tell.n, tell.lift);
  return (
    <div className="border-b border-line/60 last:border-0 print-keep">
      <div className="flex items-start gap-3 px-5 py-3">
        <span className={`grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-extrabold ${tell.actionable ? "bg-navy text-white" : "border border-line text-dim"}`}>{rank}</span>
        <div className="min-w-0 flex-1">
          <div className="font-bold leading-snug">{tellSentence(tell, resolve)}</div>
          <div className="mt-0.5 text-xs text-dim">
            {tell.hits} of {tell.n} snaps · {Math.round(tell.lift * 100)} points above their normal
            {lock ? " · strong enough to lock in" : tell.actionable ? " · an option with evidence" : " · keep an eye on it"}
          </div>
          <button onClick={() => setOpen((v) => !v)} className="no-print mt-1 inline-flex items-center gap-1 text-xs font-bold text-grass hover:underline">
            {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />} Evidence
          </button>
        </div>
      </div>
      {open && (
        <div className="no-print border-t border-line bg-slate-50/60 px-5 py-3">
          <div className="mb-2 grid gap-2 sm:grid-cols-3 text-xs">
            <div><span className={th}>Sample</span><div className="font-bold">{tell.n} snaps match</div></div>
            <div><span className={th}>Rate</span><div className="font-bold">{pc(tell.rate)} {tell.outcome}</div></div>
            <div><span className={th}>Their baseline</span><div className="font-bold">{pc(tell.baseline)}</div></div>
          </div>
          <PlayTable plays={evidence} />
          {missed > 0 && <p className="mt-1.5 text-[11px] text-dim">{missed} other snap{missed === 1 ? "" : "s"} from this look did something else.</p>}
        </div>
      )}
    </div>
  );
}

// ---- the five headings (Q43) ------------------------------------------------

/** 1. Personnel — what they play out of, and how differently. */
export function PersonnelCard({ plays }: { plays: Play[] }) {
  const groups = useMemo(() => formationsByPersonnel(plays), [plays]);
  const rows = useMemo(
    () =>
      groups.map((g) => {
        const s = summarize(plays.filter((p) => (tag(p.personnel) || "Personnel not tagged") === g.personnel));
        return { ...g, runRate: s.plays ? s.runs / s.plays : null, avgGain: s.avgGain, top: g.formations[0] ?? null };
      }),
    [groups, plays],
  );
  if (!rows.length) return null;
  const untagged = rows.length === 1 && rows[0].personnel === "Personnel not tagged";
  return (
    <div className={card}>
      <div className={cardHead}><UserSquare2 size={14} className="text-grass" /> Personnel</div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line bg-slate-50">
            <th className={`${th} text-left px-4 py-2`}>Grouping</th>
            <th className={`${th} text-right px-2 py-2 w-16`}>Snaps</th>
            <th className={`${th} text-right px-2 py-2 w-16`}>Share</th>
            <th className={`${th} text-right px-2 py-2 w-16`}>Run</th>
            <th className={`${th} text-right px-2 py-2 w-16`}>Yds</th>
            <th className={`${th} text-left px-3 py-2`}>Top formation</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((g) => (
            <tr key={g.personnel} className="border-b border-line/60 last:border-0">
              <td className="px-4 py-1.5 font-bold">{g.personnel}</td>
              <td className="px-2 py-1.5 text-right tabular-nums">{g.n}</td>
              <td className="px-2 py-1.5 text-right tabular-nums">{Math.round(g.pct * 100)}%</td>
              <td className="px-2 py-1.5 text-right tabular-nums font-semibold">{pc(g.runRate)}</td>
              <td className="px-2 py-1.5 text-right tabular-nums">{one(g.avgGain)}</td>
              <td className="px-3 py-1.5 text-dim max-w-[260px] truncate">{g.top ? `${g.top.name} ×${g.top.n}` : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {untagged && (
        <p className="border-t border-line px-4 py-2 text-[11px] text-dim">
          Personnel is blank on this export — tag it in Hudl and this splits by 10 / 11 / 12 personnel.
        </p>
      )}
    </div>
  );
}

/** 2. Top Formations — across the whole film, strongest first. */
export function TopFormationsCard({ plays }: { plays: Play[] }) {
  const resolve = useResolver();
  const [all, setAll] = useState(false);
  const rows = useMemo(() => {
    const m = new Map<string, Play[]>();
    for (const p of plays) {
      const f = tag(p.formation);
      if (!f) continue;
      m.set(f, [...(m.get(f) ?? []), p]);
    }
    return [...m.entries()]
      .map(([name, rowsOf]) => {
        const s = summarize(rowsOf);
        const counts = new Map<string, number>();
        for (const p of rowsOf) {
          const n = tag(p.play);
          if (n) counts.set(n, (counts.get(n) ?? 0) + 1);
        }
        const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
        return {
          name,
          n: rowsOf.length,
          runRate: s.plays ? s.runs / s.plays : null,
          avgGain: s.avgGain,
          top: top ? { name: top[0], n: top[1] } : null,
        };
      })
      .sort((a, b) => b.n - a.n);
  }, [plays]);
  if (!rows.length) return null;
  const shown = all ? rows : rows.slice(0, 12);
  return (
    <div className={card}>
      <div className={cardHead}><Layers size={14} className="text-grass" /> Top Formations</div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line bg-slate-50">
            <th className={`${th} text-left px-4 py-2`}>Formation</th>
            <th className={`${th} text-right px-2 py-2 w-16`}>Snaps</th>
            <th className={`${th} text-right px-2 py-2 w-16`}>Run</th>
            <th className={`${th} text-right px-2 py-2 w-16`}>Yds</th>
            <th className={`${th} text-left px-3 py-2`}>Top play</th>
          </tr>
        </thead>
        <tbody>
          {shown.map((f) => (
            <tr key={f.name} className="border-b border-line/60 last:border-0">
              <td className="px-4 py-1.5 font-semibold max-w-[300px]"><div className="overflow-hidden"><Term raw={f.name} kind="formation" resolve={resolve} max={34} /></div></td>
              <td className="px-2 py-1.5 text-right tabular-nums">{f.n}</td>
              <td className="px-2 py-1.5 text-right tabular-nums">{pc(f.runRate)}</td>
              <td className="px-2 py-1.5 text-right tabular-nums">{one(f.avgGain)}</td>
              <td className="px-3 py-1.5 text-dim max-w-[220px]"><div className="flex items-baseline gap-1 overflow-hidden">{f.top ? <><Term raw={f.top.name} kind="concept" resolve={resolve} max={22} /> <span className="shrink-0 tabular-nums">×{f.top.n}</span></> : "—"}</div></td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > 12 && (
        <div className="no-print border-t border-line px-4 py-2 text-center">
          <button onClick={() => setAll((v) => !v)} className="text-xs font-bold text-grass hover:underline">
            {all ? "Show the top 12" : `Show ${rows.length - 12} more formations`}
          </button>
        </div>
      )}
    </div>
  );
}

/** Formations grouped the way he asked for them (Q37). */
export function FormationsByPersonnelCard({ plays }: { plays: Play[] }) {
  const resolve = useResolver();
  const groups = useMemo(() => formationsByPersonnel(plays), [plays]);
  const [allForms, setAllForms] = useState(false);
  const [open, setOpen] = useState<string | null>(groups[0]?.personnel ?? null);
  if (groups.length < 2) return null;
  return (
    <div className={`${card} flex flex-col`}>
      <div className={cardHead}><Layers size={14} className="text-dim" /> Formations by Personnel</div>
      <div className="flex-1 max-h-[520px] overflow-y-auto">
        {groups.map((g) => {
          const isOpen = open === g.personnel;
          const rows = allForms ? g.formations : g.formations.slice(0, 12);
          return (
            <div key={g.personnel} className="border-b border-line/60 last:border-0">
              <button onClick={() => setOpen(isOpen ? null : g.personnel)} className="flex w-full items-center gap-2 px-4 py-2 text-sm hover:bg-slate-50">
                {isOpen ? <ChevronDown size={14} className="text-dim" /> : <ChevronRight size={14} className="text-dim" />}
                <span className="font-bold">{g.personnel}</span>
                <span className="ml-auto text-xs text-dim tabular-nums">{g.n} snaps · {Math.round(g.pct * 100)}%</span>
              </button>
              {isOpen && g.formations.length > 0 && (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-y border-line bg-slate-50">
                      <th className={`${th} text-left px-4 py-1.5`}>Formation</th>
                      <th className={`${th} text-right px-2 py-1.5 w-14`}>Snaps</th>
                      <th className={`${th} text-right px-2 py-1.5 w-16`}>Run</th>
                      <th className={`${th} text-left px-3 py-1.5`}>Top play</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((f) => (
                      <tr key={f.name} className="border-b border-line/60 last:border-0">
                        <td className="px-4 py-1 font-semibold max-w-[260px]"><div className="overflow-hidden"><Term raw={f.name} kind="formation" resolve={resolve} max={30} /></div></td>
                        <td className="px-2 py-1 text-right tabular-nums">{f.n}</td>
                        <td className="px-2 py-1 text-right tabular-nums">{pc(f.runRate)}</td>
                        <td className="px-3 py-1 text-dim max-w-[200px]"><div className="flex items-baseline gap-1 overflow-hidden">{f.topPlay ? <><Term raw={f.topPlay.name} kind="concept" resolve={resolve} max={20} /> <span className="shrink-0 tabular-nums">×{f.topPlay.n}</span></> : "—"}</div></td>
                      </tr>
                    ))}
                    {g.formations.length > 12 && (
                      <tr><td colSpan={4} className="no-print px-4 py-2 text-center">
                        <button onClick={() => setAllForms((v) => !v)} className="text-xs font-bold text-grass hover:underline">
                          {allForms ? "Show the top 12" : `Show ${g.formations.length - 12} more formations`}
                        </button>
                      </td></tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** 3. Top Plays — most called and most dangerous are rarely the same play. */
export function BestPlaysCard({ plays }: { plays: Play[] }) {
  const resolve = useResolver();
  const best = useMemo(() => bestPlays(plays), [plays]);
  const [all, setAll] = useState(false);
  if (!best.byFrequency.length && !best.bySuccess.length) return null;
  const freq = all ? best.byFrequency : best.byFrequency.slice(0, 8);
  const succ = all ? best.bySuccess : best.bySuccess.slice(0, 8);
  const more = Math.max(best.byFrequency.length - 8, best.bySuccess.length - 8);
  return (
    <div className={`${card} flex flex-col`}>
      <div className={cardHead}><Flame size={14} className="text-grass" /> Top Plays</div>
      <div className="grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-line flex-1">
        <div className="p-4">
          <div className={`${th} mb-2`}>Most called</div>
          {freq.map((p) => (
            <div key={p.name} className="flex items-baseline gap-2 border-b border-line/60 py-1.5 last:border-0 text-sm">
              <span className="font-semibold truncate"><Term raw={p.name} kind="concept" resolve={resolve} /></span>
              <span className="ml-auto shrink-0 tabular-nums text-dim">{p.n}× · {one(p.avgGain)} yds</span>
            </div>
          ))}
          {!freq.length && <div className="py-2 text-xs text-dim">No play names tagged on this export.</div>}
        </div>
        <div className="p-4">
          <div className={`${th} mb-2`}>Most dangerous (3+ snaps)</div>
          {succ.map((p) => (
            <div key={p.name} className="flex items-baseline gap-2 border-b border-line/60 py-1.5 last:border-0 text-sm">
              <span className="font-semibold truncate"><Term raw={p.name} kind="concept" resolve={resolve} /></span>
              <span className="ml-auto shrink-0 tabular-nums text-dim">{one(p.avgGain)} yds · {p.explosive} exp</span>
            </div>
          ))}
          {!succ.length && <div className="py-2 text-xs text-dim">Not enough repeats of any one play yet.</div>}
        </div>
      </div>
      {more > 0 && (
        <div className="no-print border-t border-line px-4 py-2 text-center">
          <button onClick={() => setAll((v) => !v)} className="text-xs font-bold text-grass hover:underline">
            {all ? "Show the top 8" : `Show ${more} more`}
          </button>
        </div>
      )}
    </div>
  );
}

/** 4. Best Players — who touches it, when, and how it goes (Q38). */
export function PlayerUsageCard({ plays }: { plays: Play[] }) {
  const rows = useMemo(() => keyPlayerUsage(plays), [plays]);
  const [all, setAll] = useState(false);
  if (!rows.length) return null;
  const shown = all ? rows : rows.slice(0, 10);
  return (
    <div className={`${card} flex flex-col`}>
      <div className={cardHead}><Users2 size={14} className="text-grass" /> Best Players — from the film</div>
      <div className="overflow-x-auto flex-1">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-slate-50">
              <th className={`${th} text-left px-4 py-2`}>Player</th>
              <th className={`${th} text-right px-2 py-2 w-16`}>Touches</th>
              <th className={`${th} text-right px-2 py-2 w-14`}>Share</th>
              <th className={`${th} text-right px-2 py-2 w-14`}>Yds</th>
              <th className={`${th} text-left px-3 py-2`}>Used most on</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((p) => (
              <tr key={p.player} className="border-b border-line/60 last:border-0">
                <td className="px-4 py-1.5 font-semibold">{p.player}</td>
                <td className="px-2 py-1.5 text-right tabular-nums">{p.touches}</td>
                <td className="px-2 py-1.5 text-right tabular-nums">{Math.round(p.share * 100)}%</td>
                <td className="px-2 py-1.5 text-right tabular-nums">{one(p.avgGain)}</td>
                <td className="px-3 py-1.5 text-dim truncate">{p.topSituation ? p.topSituation.name : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > 10 && (
        <div className="no-print border-t border-line px-4 py-2 text-center">
          <button onClick={() => setAll((v) => !v)} className="text-xs font-bold text-grass hover:underline">
            {all ? "Show the top 10" : `Show ${rows.length - 10} more`}
          </button>
        </div>
      )}
    </div>
  );
}

/** Situations — the coach's own buckets (Q36). */
export function SituationsCard({ plays }: { plays: Play[] }) {
  const resolve = useResolver();
  const rows = useMemo(() => situationTable(plays), [plays]);
  if (!rows.length) return null;
  return (
    <div className={`${card} flex flex-col`}>
      <div className={cardHead}><ListOrdered size={14} className="text-dim" /> Situations</div>
      <div className="overflow-x-auto flex-1">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-slate-50">
              <th className={`${th} text-left px-4 py-2`}>Situation</th>
              <th className={`${th} text-right px-2 py-2 w-14`}>Snaps</th>
              <th className={`${th} text-right px-2 py-2 w-20`}>Run</th>
              <th className={`${th} text-right px-2 py-2 w-16`}>Yds</th>
              <th className={`${th} text-left px-3 py-2`}>Top look</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.situation.key} className="border-b border-line/60 last:border-0">
                <td className="px-4 py-1.5 whitespace-nowrap"><span className="font-semibold">{s.situation.group} &amp; {s.situation.range}</span> <span className="text-dim">{s.situation.label}</span></td>
                <td className="px-2 py-1.5 text-right tabular-nums">{s.n}</td>
                <td className="px-2 py-1.5 text-right tabular-nums font-bold">{s.runRate == null ? "—" : `${Math.round(s.runRate * 100)}% run`}</td>
                <td className="px-2 py-1.5 text-right tabular-nums">{one(s.avgGain)}</td>
                <td className="px-3 py-1.5 text-dim max-w-[240px]"><div className="flex items-baseline gap-1 overflow-hidden">{s.topFormation ? <><Term raw={s.topFormation.name} kind="formation" resolve={resolve} max={28} /> <span className="shrink-0 tabular-nums">×{s.topFormation.n}</span></> : "—"}</div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="border-t border-line px-4 py-2 text-[11px] text-dim">Your buckets. Exact down and distance is kept on every snap underneath.</p>
    </div>
  );
}

/** Formation × backfield × situation, the combinations he asked about (Q35). */
export function CombosCard({ plays }: { plays: Play[] }) {
  const resolve = useResolver();
  const rows = useMemo(() => formationCombos(plays), [plays]);
  const [all, setAll] = useState(false);
  if (!rows.length) return null;
  const shown = all ? rows : rows.slice(0, 6);
  return (
    <div className={card}>
      <div className={cardHead}><Layers size={14} className="text-dim" /> Formation + Backfield + Situation</div>
      <div className="p-4">
        {shown.map((c) => (
          <div key={`${c.formation}|${c.backfield}|${c.situation}`} className="flex items-baseline gap-2 border-b border-line/60 py-1.5 last:border-0 text-xs">
            <span className="truncate">
              <span className="font-semibold"><Term raw={c.formation} kind="formation" resolve={resolve} /></span>
              {c.backfield !== "—" ? <> · <Term raw={c.backfield} kind="backfield" resolve={resolve} /></> : ""} · {c.situation}
            </span>
            <span className="ml-auto shrink-0 tabular-nums text-dim">{c.n}× · {pc(c.runRate)} run</span>
          </div>
        ))}
      </div>
      {rows.length > 6 && (
        <div className="no-print border-t border-line px-4 py-2 text-center">
          <button onClick={() => setAll((v) => !v)} className="text-xs font-bold text-grass hover:underline">
            {all ? "Show the top 6" : `Show ${rows.length - 6} more`}
          </button>
        </div>
      )}
    </div>
  );
}

/** 5. Key Tendencies / Tells — the whole list, with the evidence behind each. */
export function TellsCard({ plays }: { plays: Play[] }) {
  const resolve = useResolver();
  const tells = useMemo(() => computeTells(plays), [plays]);
  const totals = useMemo(() => summarize(plays), [plays]);
  const byId = useMemo(() => new Map(plays.map((p) => [p.id, p])), [plays]);
  const [showMore, setShowMore] = useState(false);
  if (!plays.length) return null;
  const strongest = tells.actionable.length ? tells.actionable.slice(0, 8) : tells.all.slice(0, 8);
  const shown = showMore ? tells.all.slice(0, 24) : strongest;
  return (
    <div className={card}>
      <div className={cardHead}>
        <Search size={14} className="text-grass" /> Key Tendencies / Tells
        <span className="ml-auto normal-case tracking-normal text-xs font-normal text-dim">
          {plays.length} snaps · {totals.runs} run / {totals.passes} pass · {one(totals.avgGain)} yds a play · {totals.explosive} explosive
        </span>
      </div>
      <div className="px-5 py-3 border-b border-line text-sm text-dim">
        {tells.actionable.length
          ? <>Where we make our money: {tells.actionable.length} tendenc{tells.actionable.length === 1 ? "y is" : "ies are"} strong enough to build an answer for. Everything below is counted off their own film — nothing is claimed on fewer than 5 snaps, and only a tell with 10+ snaps and 30 points of lift is called strong enough to lock in.</>
          : <>Nothing here clears the bar for a call-it-before-the-snap tell yet. The strongest leans are listed anyway — treat them as leans, not rules.</>}
      </div>
      {shown.map((t, i) => <TellCard key={t.id} tell={t} byId={byId} rank={i + 1} resolve={resolve} />)}
      {tells.all.length > shown.length && (
        <div className="no-print border-t border-line px-5 py-2.5 text-center">
          <button onClick={() => setShowMore((v) => !v)} className="text-sm font-bold text-grass hover:underline">
            {showMore ? "Show only the ones worth an answer" : `Show ${tells.all.length - shown.length} more leans`}
          </button>
        </div>
      )}
    </div>
  );
}

/** Opponent Matchup keeps this much: five lines and a way to the full report. */
export function TopTellsCard({ plays, href }: { plays: Play[]; href: string }) {
  const resolve = useResolver();
  const tells = useMemo(() => computeTells(plays), [plays]);
  if (!plays.length) return null;
  const shown = (tells.actionable.length ? tells.actionable : tells.all).slice(0, 5);
  return (
    <div className={`${card} flex flex-col`}>
      <div className={cardHead}>
        <Search size={14} className="text-grass" /> Top Tells
        <span className="ml-auto normal-case tracking-normal text-xs font-normal text-dim">{plays.length} snaps read</span>
      </div>
      <div className="flex-1 px-5 py-3">
        {shown.map((t, i) => (
          <div key={t.id} className="flex items-baseline gap-2 border-b border-line/60 py-1.5 last:border-0 text-sm">
            <span className="shrink-0 font-extrabold text-dim tabular-nums">{i + 1}.</span>
            <span className="min-w-0">
              <span className="font-semibold">{tellSentence(t, resolve)}</span>
              <span className="block text-[11px] text-dim">
                {t.hits} of {t.n} snaps{lockable(t.n, t.lift) ? " · strong enough to lock in" : " · an option with evidence"}
              </span>
            </span>
          </div>
        ))}
        {!shown.length && <div className="py-2 text-sm text-dim">Nothing on this film clears five snaps yet.</div>}
      </div>
      <div className="border-t border-line px-5 py-2.5 text-center">
        <Link href={href} className="inline-flex items-center gap-1 text-sm font-bold text-grass hover:underline">
          Open the full Scouting Report <ChevronRight size={14} />
        </Link>
      </div>
    </div>
  );
}
