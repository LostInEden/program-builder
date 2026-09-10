"use client";

// Tendency Report — everything CounterScheme found in the opponent's snaps.
// Answer first, evidence second (Q29): each tell reads as one football
// sentence, and the Evidence toggle opens the actual plays behind it.

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Search, Users2, Layers, ListOrdered, Flame } from "lucide-react";
import { useStore, type Play } from "@/lib/store";
import { tendencyReport, tellSentence, sideOf, makeResolver, type Tell, type TagResolver } from "@/lib/tendencies";
import { shortMeaning, type TermKind } from "@/lib/knowledge";

const card = "rounded-xl border border-line bg-card shadow-sm";
const cardHead = "display uppercase text-xs font-bold tracking-[0.15em] text-ink px-5 py-3.5 border-b border-line flex items-center gap-3";
const th = "display uppercase text-[11px] tracking-widest text-dim font-semibold";

const pc = (v: number | null | undefined) => (v == null ? "—" : `${Math.round(v * 100)}%`);

/** Raw tag stays primary; what it means rides alongside it (Q27). */
function Term({ raw, kind, resolve }: { raw: string; kind?: TermKind; resolve: TagResolver }) {
  const meaning = shortMeaning(resolve(raw, kind), 44);
  return (
    <>
      {raw}
      {meaning && <span className="ml-1 font-normal text-dim" title={meaning}>({meaning})</span>}
    </>
  );
}
const one = (v: number | null | undefined) => (v == null ? "—" : v.toFixed(1));

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
  return (
    <div className="border-b border-line/60 last:border-0">
      <div className="flex items-start gap-3 px-5 py-3">
        <span className={`grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-extrabold ${tell.actionable ? "bg-navy text-white" : "border border-line text-dim"}`}>{rank}</span>
        <div className="min-w-0 flex-1">
          <div className="font-bold leading-snug">{tellSentence(tell, resolve)}</div>
          <div className="mt-0.5 text-xs text-dim">
            {tell.hits} of {tell.n} snaps · {Math.round(tell.lift * 100)} points above their normal
            {tell.actionable ? " · worth an answer" : " · keep an eye on it"}
          </div>
          <button onClick={() => setOpen((v) => !v)} className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-grass hover:underline">
            {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />} Evidence
          </button>
        </div>
      </div>
      {open && (
        <div className="border-t border-line bg-slate-50/60 px-5 py-3">
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

export default function TendencyReport({ plays }: { plays: Play[] }) {
  const r = useMemo(() => tendencyReport(plays), [plays]);
  const termMap = useStore((s) => s.termMap);
  const resolve = useMemo(() => makeResolver(termMap), [termMap]);
  const byId = useMemo(() => new Map(plays.map((p) => [p.id, p])), [plays]);
  const [showMore, setShowMore] = useState(false);
  const [personnelOpen, setPersonnelOpen] = useState<string | null>(r.personnel[0]?.personnel ?? null);

  if (!plays.length) return null;
  const shown = showMore ? r.tells.slice(0, 24) : r.actionable.slice(0, 8);
  const fallback = !shown.length ? r.tells.slice(0, 8) : shown;

  return (
    <div id="tendency-report" className="flex flex-col gap-4">
      <div className={card}>
        <div className={cardHead}>
          <Search size={14} className="text-grass" /> Tendency Report
          <span className="ml-auto normal-case tracking-normal text-xs font-normal text-dim">
            {r.total} snaps · {r.summary.runs} run / {r.summary.passes} pass · {one(r.summary.avgGain)} yds a play · {r.summary.explosive} explosive
          </span>
        </div>
        <div className="px-5 py-3 border-b border-line text-sm text-dim">
          {r.actionable.length
            ? <>Where we make our money: {r.actionable.length} tendenc{r.actionable.length === 1 ? "y is" : "ies are"} strong enough to build an answer for. Everything below is counted off their own film — nothing is claimed on fewer than 5 snaps.</>
            : <>Nothing here clears the bar for a call-it-before-the-snap tell yet. The strongest leans are listed anyway — treat them as leans, not rules.</>}
        </div>
        {fallback.map((t, i) => <TellCard key={t.id} tell={t} byId={byId} rank={i + 1} resolve={resolve} />)}
        {r.tells.length > fallback.length && (
          <div className="border-t border-line px-5 py-2.5 text-center">
            <button onClick={() => setShowMore((v) => !v)} className="text-sm font-bold text-grass hover:underline">
              {showMore ? "Show only the ones worth an answer" : `Show the other ${r.tells.length - fallback.length} leans`}
            </button>
          </div>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2 items-stretch">
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
                {r.situations.map((s) => (
                  <tr key={s.situation.key} className="border-b border-line/60 last:border-0">
                    <td className="px-4 py-1.5 whitespace-nowrap"><span className="font-semibold">{s.situation.group} &amp; {s.situation.range}</span> <span className="text-dim">{s.situation.label}</span></td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{s.n}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums font-bold">{s.runRate == null ? "—" : `${Math.round(s.runRate * 100)}% run`}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{one(s.avgGain)}</td>
                    <td className="px-3 py-1.5 text-dim truncate">{s.topFormation ? <><Term raw={s.topFormation.name} kind="formation" resolve={resolve} /> <span className="tabular-nums">×{s.topFormation.n}</span></> : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="border-t border-line px-4 py-2 text-[11px] text-dim">Your buckets. Exact down and distance is kept on every snap underneath.</p>
        </div>

        <div className={`${card} flex flex-col`}>
          <div className={cardHead}><Layers size={14} className="text-dim" /> Formations by Personnel</div>
          <div className="flex-1">
            {r.personnel.map((g) => {
              const open = personnelOpen === g.personnel;
              return (
                <div key={g.personnel} className="border-b border-line/60 last:border-0">
                  <button onClick={() => setPersonnelOpen(open ? null : g.personnel)} className="flex w-full items-center gap-2 px-4 py-2 text-sm hover:bg-slate-50">
                    {open ? <ChevronDown size={14} className="text-dim" /> : <ChevronRight size={14} className="text-dim" />}
                    <span className="font-bold">{g.personnel}</span>
                    <span className="ml-auto text-xs text-dim tabular-nums">{g.n} snaps · {Math.round(g.pct * 100)}%</span>
                  </button>
                  {open && (
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
                        {g.formations.map((f) => (
                          <tr key={f.name} className="border-b border-line/60 last:border-0">
                            <td className="px-4 py-1 font-semibold">{<Term raw={f.name} kind="formation" resolve={resolve} />}</td>
                            <td className="px-2 py-1 text-right tabular-nums">{f.n}</td>
                            <td className="px-2 py-1 text-right tabular-nums">{pc(f.runRate)}</td>
                            <td className="px-3 py-1 text-dim truncate">{f.topPlay ? <><Term raw={f.topPlay.name} kind="concept" resolve={resolve} /> <span className="tabular-nums">×{f.topPlay.n}</span></> : "—"}</td>
                          </tr>
                        ))}
                        {!g.formations.length && <tr><td colSpan={4} className="px-4 py-3 text-center text-xs text-dim">No formations tagged on these snaps.</td></tr>}
                      </tbody>
                    </table>
                  )}
                </div>
              );
            })}
          </div>
          <p className="border-t border-line px-4 py-2 text-[11px] text-dim">
            {r.personnel.length === 1 && r.personnel[0].personnel === "Personnel not tagged"
              ? "Personnel is blank on this export — tag it in Hudl and this splits by 10 / 11 / 12 personnel."
              : "Grouped the way you asked: what they line up in out of each grouping."}
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 items-stretch">
        <div className={`${card} flex flex-col`}>
          <div className={cardHead}><Flame size={14} className="text-dim" /> Best Plays</div>
          <div className="grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-line flex-1">
            <div className="p-4">
              <div className={`${th} mb-2`}>Most called</div>
              {r.best.byFrequency.slice(0, 8).map((p) => (
                <div key={p.name} className="flex items-baseline gap-2 border-b border-line/60 py-1.5 last:border-0 text-sm">
                  <span className="font-semibold truncate"><Term raw={p.name} kind="concept" resolve={resolve} /></span>
                  <span className="ml-auto shrink-0 tabular-nums text-dim">{p.n}× · {one(p.avgGain)} yds</span>
                </div>
              ))}
              {!r.best.byFrequency.length && <div className="py-2 text-xs text-dim">No play names tagged on this export.</div>}
            </div>
            <div className="p-4">
              <div className={`${th} mb-2`}>Most dangerous (3+ snaps)</div>
              {r.best.bySuccess.slice(0, 8).map((p) => (
                <div key={p.name} className="flex items-baseline gap-2 border-b border-line/60 py-1.5 last:border-0 text-sm">
                  <span className="font-semibold truncate"><Term raw={p.name} kind="concept" resolve={resolve} /></span>
                  <span className="ml-auto shrink-0 tabular-nums text-dim">{one(p.avgGain)} yds · {p.explosive} exp</span>
                </div>
              ))}
              {!r.best.bySuccess.length && <div className="py-2 text-xs text-dim">Not enough repeats of any one play yet.</div>}
            </div>
          </div>
        </div>

        <div className={`${card} flex flex-col`}>
          <div className={cardHead}><Users2 size={14} className="text-dim" /> Key Player Usage</div>
          {r.players.length ? (
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
                  {r.players.slice(0, 10).map((p) => (
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
          ) : (
            <div className="flex-1 px-5 py-6 text-sm text-dim">
              Nobody is tagged with the ball on this export. Tag the ball carrier or target by jersey number in Hudl and CounterScheme will show who they feed, when, and how it goes. Until then, add what you know by hand in Key Players above.
            </div>
          )}
          {r.combos.length > 0 && (
            <div className="border-t border-line p-4">
              <div className={`${th} mb-2`}>Formation + backfield + situation</div>
              {r.combos.slice(0, 5).map((c) => (
                <div key={`${c.formation}|${c.backfield}|${c.situation}`} className="flex items-baseline gap-2 border-b border-line/60 py-1 last:border-0 text-xs">
                  <span className="truncate"><span className="font-semibold"><Term raw={c.formation} kind="formation" resolve={resolve} /></span>{c.backfield !== "—" ? <> · <Term raw={c.backfield} kind="backfield" resolve={resolve} /></> : ""} · {c.situation}</span>
                  <span className="ml-auto shrink-0 tabular-nums text-dim">{c.n}× · {pc(c.runRate)} run</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
