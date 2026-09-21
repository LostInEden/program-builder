"use client";

// Scouting Report (Q43) — the INPUT half. Five headings, in the coach's order:
// Personnel, Top Formations, Top Plays, Best Players, Key Tendencies / Tells.
// Everything here is what THEY do; nothing on this page is a call. The answer
// to it all lives on the Game Plan.

import { Suspense, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { Binoculars, ChevronRight, ClipboardList, Printer, Upload, Users2 } from "lucide-react";
import { useStore, useHydrated } from "@/lib/store";
import {
  BestPlaysCard, CombosCard, FormationsByPersonnelCard, PersonnelCard, PlayerUsageCard,
  SituationsCard, TellsCard, TopFormationsCard,
} from "@/components/TendencyReport";

const card = "rounded-xl border border-line bg-card shadow-sm print-card";
const cardHead = "display uppercase text-xs font-bold tracking-[0.15em] text-ink px-5 py-3.5 border-b border-line flex items-center gap-3";

/** One of the five headings. Renders nothing when it has nothing real (Q44). */
function Section({ n, title, note, children }: { n: number; title: string; note?: string; children: React.ReactNode }) {
  return (
    <section id={({ Personnel: "personnel", "Top Formations": "formations", "Top Plays": "plays", "Best Players": "players", "Key Tendencies / Tells": "tells" } as Record<string, string>)[title]} className="print-section scroll-mt-24 flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-navy text-white text-[11px] font-extrabold">{n}</span>
        <h2 className="text-xl font-extrabold tracking-tight">{title}</h2>
        {note && <span className="text-xs text-dim">{note}</span>}
      </div>
      {children}
    </section>
  );
}

function ScoutingInner() {
  const hydrated = useHydrated();
  const router = useRouter();
  const sp = useSearchParams();
  const { opponents } = useStore();
  const setLastOpponent = useStore((s) => s.setLastOpponent);

  const o = opponents.find((x) => x.id === sp.get("id")) ?? opponents.find((x) => !x.isDemo) ?? opponents[0] ?? null;
  useEffect(() => {
    if (o) setLastOpponent(o.id);
  }, [o, setLastOpponent]);

  if (!hydrated) return <div className="px-8 py-10 text-dim">Loading…</div>;

  const plays = o?.plays ?? [];
  const keyPlayers = (o?.keyPlayers ?? []).filter((k) => k.name.trim() || (k.jersey ?? "").trim());
  const notes = (o?.matchupNotes ?? []).filter((m) => m.label.trim() || m.value.trim());
  // Which of the five headings have something real behind them.
  const hasPersonnel = plays.length > 0 || (o?.personnelUsage ?? []).some((p) => p.group.trim());
  const hasFormations = plays.some((p) => p.formation.trim()) || (o?.formations ?? []).some((f) => f.name.trim());
  const hasPlays = plays.some((p) => p.play.trim()) || (o?.concepts ?? []).some((c) => c.name.trim());
  const hasPlayers = plays.some((p) => p.player.trim()) || keyPlayers.length > 0;
  const hasTells = plays.length > 0;
  let heading = 0;
  const next = () => ++heading;

  return (
    <div className="px-4 sm:px-6 py-6 sm:py-8 max-w-[1400px] mx-auto print-root">
      <div className="mb-5 flex flex-wrap items-center gap-3 justify-between no-print">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Scouting Report{o ? ` — ${o.name}` : ""}</h1>
          <p className="text-dim mt-0.5">Scouting Report = What they do. Game Plan = What we&apos;re going to do about it.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {opponents.length > 0 && (
            <select value={o?.id ?? ""} onChange={(e) => router.push(`/scouting?id=${e.target.value}`)} className="rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold">
              {opponents.map((x) => <option key={x.id} value={x.id}>{x.name}{x.week ? ` (Wk ${x.week})` : ""}{x.isDemo ? " · demo" : ""}</option>)}
            </select>
          )}
          {o && <Link href={`/matchup?id=${o.id}&view=details#situations`} className="text-sm font-semibold text-gold hover:underline">Full Down &amp; Distance / Situations</Link>}
          {o && <><Link href={`/matchup?id=${o.id}`} className="text-sm font-semibold text-gold hover:underline">Overview</Link><Link href={`/matchup?id=${o.id}&view=details`} className="rounded-lg border border-line px-3 py-2 text-sm font-semibold hover:border-gold">Opponent Details / Edit Scout</Link></>}
          {o && (
            <>
              <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-3.5 py-2 text-sm font-semibold hover:border-dim">
                <Printer size={15} /> Print / Save as PDF
              </button>
              <Link href={`/gameplan?id=${o.id}`} className="inline-flex items-center gap-2 rounded-lg bg-grass px-4 py-2 text-sm font-bold text-white hover:bg-grass-deep">
                <ClipboardList size={15} /> Game Plan
              </Link>
            </>
          )}
        </div>
      </div>

      {/* The paper version says who and what it is. */}
      <div className="hidden print:block mb-4">
        <h1 className="text-2xl font-extrabold">Scouting Report — {o?.name ?? ""}</h1>
        <p className="text-sm text-dim">Scouting Report = What they do. Game Plan = What we&apos;re going to do about it.</p>
      </div>

      {!o ? (
        <div className={`${card} px-6 py-14 text-center`}>
          <Binoculars size={34} className="mx-auto text-dim mb-3" />
          <div className="text-lg font-bold mb-1">No opponent yet</div>
          <p className="text-sm text-dim max-w-md mx-auto mb-4">Add one on Opponent Matchup and upload their play-by-play — the report reads itself off the snaps.</p>
          <Link href="/matchup" className="inline-flex items-center gap-2 rounded-lg bg-grass px-4 py-2 text-sm font-semibold text-white hover:bg-grass-deep">Go to Opponent Matchup</Link>
        </div>
      ) : (
        <motion.div key={o.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-7">
          {hasPersonnel && (
            <Section n={next()} title="Personnel" note={plays.length ? `off ${plays.length} snaps` : "from what you entered by hand"}>
              {plays.length ? (
                <PersonnelCard plays={plays} />
              ) : (
                <div className={card}>
                  <div className={cardHead}>Personnel Usage</div>
                  <div className="p-4 flex flex-col gap-2 text-sm">
                    {o.personnelUsage.filter((p) => p.group.trim()).map((p) => (
                      <div key={p.id} className="flex items-baseline gap-2 border-b border-line/60 py-1 last:border-0">
                        <span className="font-semibold">{p.group}</span>
                        <span className="ml-auto tabular-nums text-dim">{p.pct == null ? "—" : `${p.pct}%`}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Section>
          )}

          {hasFormations && (
            <Section n={next()} title="Top Formations" note="what they line up in, most first">
              {plays.length ? (
                <>
                  <TopFormationsCard plays={plays} />
                  <FormationsByPersonnelCard plays={plays} />
                </>
              ) : (
                <div className={card}>
                  <div className={cardHead}>Formations / Sets</div>
                  <div className="p-4 flex flex-col gap-2 text-sm">
                    {o.formations.filter((f) => f.name.trim()).map((f) => (
                      <div key={f.id} className="flex items-baseline gap-2 border-b border-line/60 py-1 last:border-0">
                        <span className="font-semibold">{f.name}</span>
                        {f.notes && <span className="text-dim truncate">{f.notes}</span>}
                        <span className="ml-auto shrink-0 tabular-nums text-dim">{f.snapsPct == null ? "" : `${f.snapsPct}% of snaps`}{f.runPct == null ? "" : ` · ${f.runPct}% run`}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Section>
          )}

          {hasPlays && (
            <Section n={next()} title="Top Plays" note="most called and most dangerous">
              {plays.length ? (
                <BestPlaysCard plays={plays} />
              ) : (
                <div className={card}>
                  <div className={cardHead}>Run / Pass Concepts</div>
                  <div className="p-4 flex flex-col gap-2 text-sm">
                    {o.concepts.filter((c) => c.name.trim()).map((c) => (
                      <div key={c.id} className="flex items-baseline gap-2 border-b border-line/60 py-1 last:border-0">
                        <span className="font-semibold">{c.name}</span>
                        <span className="text-dim">{c.type}</span>
                        {c.notes && <span className="text-dim truncate">· {c.notes}</span>}
                        <span className="ml-auto shrink-0 tabular-nums text-dim">{c.freq == null ? "" : `${c.freq}×`}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Section>
          )}

          {hasPlayers && (
            <Section n={next()} title="Best Players" note="who has to be accounted for">
              <div className="grid gap-4 lg:grid-cols-2 items-start">
                {plays.some((p) => p.player.trim()) && <PlayerUsageCard plays={plays} />}
                {keyPlayers.length > 0 && (
                  <div className={card}>
                    <div className={cardHead}><Users2 size={14} className="text-grass" /> What you know</div>
                    <table className="w-full text-sm">
                      <tbody>
                        {keyPlayers.map((k) => (
                          <tr key={k.id} className="border-b border-line/60 last:border-0">
                            <td className="pl-4 py-1.5 w-12 tabular-nums text-dim">{k.jersey ? `#${k.jersey}` : "—"}</td>
                            <td className="py-1.5 font-semibold">{k.name}</td>
                            <td className="py-1.5 w-12 text-dim">{k.pos ?? ""}</td>
                            <td className="py-1.5 pr-4 text-dim">{[k.height, k.weight, k.cls].filter(Boolean).join(" · ")}{k.notes ? ` — ${k.notes}` : ""}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </Section>
          )}

          {hasTells && (
            <Section n={next()} title="Key Tendencies / Tells" note="what gives them away">
              <TellsCard plays={plays} />
              <div className="grid gap-4 lg:grid-cols-2 items-start">
                <SituationsCard plays={plays} />
                <CombosCard plays={plays} />
              </div>
            </Section>
          )}

          {(notes.length > 0 || o.redZone.trim() || o.notes.trim()) && (
            <section className="print-section flex flex-col gap-3">
              <h2 className="text-xl font-extrabold tracking-tight">Coach&apos;s Notes</h2>
              <div className={card}>
                <div className="p-4 flex flex-col gap-2 text-sm">
                  {notes.map((n) => (
                    <div key={n.id} className="border-b border-line/60 py-1 last:border-0">
                      <span className="font-semibold">{n.label}</span>{n.value ? <span className="text-dim"> — {n.value}</span> : null}
                    </div>
                  ))}
                  {o.redZone.trim() && <div className="border-b border-line/60 py-1 last:border-0"><span className="font-semibold">Red zone</span> <span className="text-dim">— {o.redZone}</span></div>}
                  {o.notes.trim() && <div className="py-1 text-dim">{o.notes}</div>}
                </div>
              </div>
            </section>
          )}

          {!hasPersonnel && !hasFormations && !hasPlays && !hasPlayers && !hasTells && (
            <div className={`${card} px-6 py-14 text-center`}>
              <Upload size={34} className="mx-auto text-dim mb-3" />
              <div className="text-lg font-bold mb-1">Nothing scouted on {o.name} yet</div>
              <p className="text-sm text-dim max-w-xl mx-auto mb-4">
                Upload the Hudl play-by-play — one row per snap — and this report writes itself: their personnel, what they line up in,
                their best plays, who touches it, and the tells worth building an answer for.
              </p>
              <Link href={`/matchup?id=${o.id}`} className="inline-flex items-center gap-2 rounded-lg bg-grass px-4 py-2 text-sm font-bold text-white hover:bg-grass-deep">
                <Upload size={15} /> Upload on Opponent Matchup
              </Link>
            </div>
          )}

          <div className="no-print flex flex-wrap items-center gap-3 text-sm">
            <Link href={`/gameplan?id=${o.id}`} className="inline-flex items-center gap-1 font-bold text-grass hover:underline">
              Now the answer — open the Game Plan <ChevronRight size={14} />
            </Link>
            <Link href={`/matchup?id=${o.id}`} className="text-dim hover:text-ink">Back to Opponent Matchup</Link>
          </div>
        </motion.div>
      )}
    </div>
  );
}

export default function ScoutingPage() {
  return (
    <Suspense fallback={<div className="px-8 py-10 text-dim">Loading…</div>}>
      <ScoutingInner />
    </Suspense>
  );
}
