"use client";

// Call Sheet (Q45) — the one sheet that goes in the coach's hand on Friday.
//
// It never tells him what to call. It's the full menu of everything the defense
// carries, the calls and emphasis he already decided on during the week, the
// tells worth remembering, and his own reminders. Every coach organizes a call
// sheet differently, so the layout is his: reorder it, rename it, hide what he
// doesn't want, add his own sections. Prints dense and landscape — one page for
// a normal week.

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import {
  ArrowDown, ArrowUp, Binoculars, ClipboardList, Eye, EyeOff, LayoutList, Plus, Printer,
  RotateCcw, Sliders, Trash2, X,
} from "lucide-react";
import { useStore, useHydrated, type CallSheetSection } from "@/lib/store";
import {
  customSection, defaultCallSheet, isGenerated, moveSection, renderCallSheet, renumber,
  sectionLineCount, withDefaults, type RenderedSection, type SheetLine,
} from "@/lib/callsheet";

const card = "rounded-xl border border-line bg-card shadow-sm";
const input = "rounded-md border border-line bg-white px-2.5 py-1.5 text-sm focus:outline-none focus:border-grass";

/** What a generated section says when it has nothing real behind it yet. */
const EMPTY_NOTE: Record<string, { text: string; href: (id: string) => string; cta: string }> = {
  menu: { text: "No confirmed calls in My Scheme yet — the menu is everything you carry.", href: () => "/scheme", cta: "Open My Scheme" },
  plan: { text: "Nothing kept on the Game Plan yet.", href: (id) => `/gameplan?id=${id}`, cta: "Open the Game Plan" },
  tells: { text: "No tells yet — they come off the snaps you upload.", href: (id) => `/scouting?id=${id}`, cta: "Open the Scouting Report" },
};

function Line({ l }: { l: SheetLine }) {
  return (
    <div className="sheet-line flex items-baseline gap-1.5 border-b border-line/40 py-[3px] last:border-0">
      <span className={l.strong ? "font-semibold" : ""}>{l.text}</span>
      {l.note && <span className="text-dim">— {l.note}</span>}
      {l.tag && (
        <span className="ml-auto shrink-0 rounded border border-line px-1 text-[10px] font-bold uppercase tabular-nums text-dim">
          {l.tag}
        </span>
      )}
    </div>
  );
}

function SectionCard({
  s, opponentId, editing, first, last, onMove, onToggle, onRename, onLines, onRemove,
}: {
  s: RenderedSection;
  opponentId: string;
  editing: boolean;
  first: boolean;
  last: boolean;
  onMove: (dir: -1 | 1) => void;
  onToggle: () => void;
  onRename: (title: string) => void;
  onLines: (lines: string[]) => void;
  onRemove: () => void;
}) {
  const generated = isGenerated(s.key);
  const count = sectionLineCount(s);
  const empty = count === 0;
  const note = EMPTY_NOTE[s.key];
  // An empty section stays off the paper — no filler on a game-day sheet (Q44).
  const hideOnPaper = empty && !editing;

  return (
    <div className={`sheet-section ${card} mb-3 break-inside-avoid ${hideOnPaper ? "no-print" : ""}`}>
      <div className="sheet-section-head flex items-center gap-2 border-b border-line px-3 py-1.5">
        {editing && !generated ? (
          <input value={s.title} onChange={(e) => onRename(e.target.value)} className={`${input} h-7 flex-1 py-0.5 text-xs font-bold`} />
        ) : (
          <span className="display flex-1 text-[11px] font-bold uppercase tracking-[0.12em] text-ink">{s.title}</span>
        )}
        {!editing && count > 0 && <span className="sheet-head-note shrink-0 text-[10px] tabular-nums text-dim">{count}</span>}
        {editing && (
          <span className="no-print flex shrink-0 items-center gap-1">
            <button onClick={() => onMove(-1)} disabled={first} className="rounded border border-line p-1 text-dim hover:text-ink disabled:opacity-30" aria-label="Move up"><ArrowUp size={12} /></button>
            <button onClick={() => onMove(1)} disabled={last} className="rounded border border-line p-1 text-dim hover:text-ink disabled:opacity-30" aria-label="Move down"><ArrowDown size={12} /></button>
            <button onClick={onToggle} className="rounded border border-line p-1 text-dim hover:text-ink" aria-label="Hide"><EyeOff size={12} /></button>
            {s.key === "custom" && (
              <button onClick={onRemove} className="rounded border border-line p-1 text-dim hover:text-red-500" aria-label="Delete section"><Trash2 size={12} /></button>
            )}
          </span>
        )}
      </div>

      <div className="sheet-body px-3 py-2 text-[13px]">
        {!generated && editing ? (
          <textarea
            value={s.lines.join("\n")}
            onChange={(e) => onLines(e.target.value.split("\n"))}
            rows={Math.max(4, s.lines.length + 1)}
            placeholder={"One reminder per line.\nFirst series: check the tight end.\nAfter a first down, reset the strength call."}
            className={`${input} w-full resize-y text-[13px] leading-snug`}
          />
        ) : empty ? (
          <div className="text-xs text-dim">
            {note ? (
              <>
                {note.text}{" "}
                <Link href={note.href(opponentId)} className="no-print font-semibold text-grass hover:underline">{note.cta}</Link>
              </>
            ) : (
              <span className="no-print">Nothing here yet — turn on Edit layout and type your reminders.</span>
            )}
          </div>
        ) : (
          s.blocks.map((b, i) => (
            <div key={i} className={i ? "mt-2" : ""}>
              {b.heading && (
                <div className="display text-[10px] font-bold uppercase tracking-[0.12em] text-dim">{b.heading}</div>
              )}
              {b.lines.map((l, j) => <Line key={j} l={l} />)}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function CallSheetInner() {
  const hydrated = useHydrated();
  const router = useRouter();
  const sp = useSearchParams();
  const { opponents, gamePlans, concepts, termMap, callSheet, updateCallSheet, resetCallSheet } = useStore();
  const setLastOpponent = useStore((s) => s.setLastOpponent);
  const [editing, setEditing] = useState(false);

  const o = opponents.find((x) => x.id === sp.get("id")) ?? opponents.find((x) => !x.isDemo) ?? opponents[0] ?? null;
  useEffect(() => {
    if (o) setLastOpponent(o.id);
  }, [o, setLastOpponent]);

  if (!hydrated) return <div className="px-8 py-10 text-dim">Loading…</div>;

  if (!o) {
    return (
      <div className="px-4 sm:px-6 py-6 sm:py-8 max-w-3xl mx-auto">
        <h1 className="text-3xl font-extrabold tracking-tight mb-4">Call Sheet</h1>
        <div className={`${card} px-6 py-14 text-center`}>
          <LayoutList size={34} className="mx-auto text-dim mb-3" />
          <div className="text-lg font-bold mb-1">No opponent yet</div>
          <p className="text-sm text-dim max-w-md mx-auto mb-4">Add one on Opponent Matchup — the call sheet is built off your defense and the plan you make for them.</p>
          <Link href="/matchup" className="inline-flex items-center gap-2 rounded-lg bg-grass px-4 py-2 text-sm font-semibold text-white hover:bg-grass-deep">Go to Opponent Matchup</Link>
        </div>
      </div>
    );
  }

  const sheet = withDefaults(callSheet[o.id]);
  const plan = gamePlans.find((g) => g.opponentId === o.id);
  const sections = renderCallSheet({ sheet, concepts, plan, plays: o.plays, termMap });
  const shown = sections.filter((s) => s.enabled);
  const hidden = sections.filter((s) => !s.enabled);
  const cols = sheet.columns;

  const save = (rows: CallSheetSection[]) => updateCallSheet(o.id, { sections: renumber(rows) });
  const patchSection = (id: string, patch: Partial<CallSheetSection>) =>
    save(sheet.sections.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  return (
    <div className="px-4 sm:px-6 py-6 sm:py-8 max-w-[1500px] mx-auto print-root sheet-root">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 no-print">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Call Sheet — {o.name}</h1>
          <p className="text-dim mt-0.5">The whole menu, the plan, and the reminders — on one page. What to call is still your call.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {opponents.length > 0 && (
            <select value={o.id} onChange={(e) => router.push(`/callsheet?id=${e.target.value}`)} className="rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold">
              {opponents.map((x) => <option key={x.id} value={x.id}>{x.name}{x.week ? ` (Wk ${x.week})` : ""}{x.isDemo ? " · demo" : ""}</option>)}
            </select>
          )}
          <div className="inline-flex items-center rounded-lg border border-line bg-white p-0.5 text-xs font-bold">
            {([2, 3] as const).map((c) => (
              <button
                key={c}
                onClick={() => updateCallSheet(o.id, { columns: c })}
                className={`rounded-md px-2.5 py-1.5 ${cols === c ? "bg-grass text-white" : "text-dim hover:text-ink"}`}
              >
                {c} col
              </button>
            ))}
          </div>
          <button
            onClick={() => setEditing((v) => !v)}
            className={`inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-semibold ${editing ? "border-grass bg-grass/10 text-grass" : "border-line bg-white hover:border-dim"}`}
          >
            {editing ? <X size={15} /> : <Sliders size={15} />} {editing ? "Done" : "Edit layout"}
          </button>
          <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-3.5 py-2 text-sm font-semibold hover:border-dim">
            <Printer size={15} /> Print / Save as PDF
          </button>
          <Link href={`/gameplan?id=${o.id}`} className="inline-flex items-center gap-2 rounded-lg bg-grass px-4 py-2 text-sm font-bold text-white hover:bg-grass-deep">
            <ClipboardList size={15} /> Game Plan
          </Link>
        </div>
      </div>

      {/* Paper header — the sheet has to say who it's for. */}
      <div className="hidden print:block mb-2">
        <div className="flex items-baseline gap-3">
          <h1 className="text-base font-extrabold">Call Sheet — {o.name}</h1>
          <span className="text-[8pt] text-dim">{o.week ? `Week ${o.week} · ` : ""}A menu and reminders. The call is yours.</span>
        </div>
      </div>

      {editing && (
        <div className="no-print mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-grass/40 bg-grass/5 px-4 py-3 text-sm">
          <Sliders size={15} className="text-grass" />
          <span className="text-dim">
            Move sections, rename your own, hide what you don&apos;t want on the sheet, and add sections of your own.
            The menu, the plan and the tells fill themselves in — your titles and order stay put.
          </span>
          <button
            onClick={() => save([...sheet.sections, customSection(sheet.sections.length)])}
            className="ml-auto inline-flex items-center gap-1 rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-bold hover:border-dim"
          >
            <Plus size={12} /> Add section
          </button>
          <button
            onClick={() => resetCallSheet(o.id)}
            className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-bold text-dim hover:text-ink hover:border-dim"
          >
            <RotateCcw size={12} /> Reset layout
          </button>
        </div>
      )}

      <motion.div
        key={o.id}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="sheet-cols max-sm:[column-count:1]"
        style={{ columnCount: cols, columnGap: "1rem", ["--sheet-cols" as string]: String(cols) } as React.CSSProperties}
      >
        {shown.map((s, i) => (
          <SectionCard
            key={s.id}
            s={s}
            opponentId={o.id}
            editing={editing}
            first={i === 0}
            last={i === shown.length - 1}
            onMove={(dir) => save(moveSection(sheet.sections, s.id, dir))}
            onToggle={() => patchSection(s.id, { enabled: false })}
            onRename={(title) => patchSection(s.id, { title })}
            onLines={(lines) => patchSection(s.id, { lines })}
            onRemove={() => save(sheet.sections.filter((x) => x.id !== s.id))}
          />
        ))}
      </motion.div>

      {hidden.length > 0 && (
        <div className="no-print mt-2 flex flex-wrap items-center gap-2 text-xs text-dim">
          <EyeOff size={13} />
          <span>Off the sheet:</span>
          {hidden.map((s) => (
            <button
              key={s.id}
              onClick={() => patchSection(s.id, { enabled: true })}
              className="inline-flex items-center gap-1 rounded-lg border border-dashed border-line px-2.5 py-1 font-semibold hover:border-dim hover:text-ink"
            >
              <Eye size={11} /> {s.title}
            </button>
          ))}
        </div>
      )}

      <div className="no-print mt-5 flex flex-wrap items-center gap-3 text-xs text-dim">
        <Link href={`/scouting?id=${o.id}`} className="inline-flex items-center gap-1 font-semibold text-grass hover:underline">
          <Binoculars size={13} /> Scouting Report
        </Link>
        <Link href={`/gameplan?id=${o.id}`} className="font-semibold text-grass hover:underline">Game Plan</Link>
        <span>
          {defaultCallSheet().sections.length} sections to start with; everything on the sheet except your own lines is read live off
          My Scheme, the Game Plan and the snaps — so it&apos;s current every time you print it.
        </span>
      </div>
    </div>
  );
}

export default function CallSheetPage() {
  return (
    <Suspense fallback={<div className="px-8 py-10 text-dim">Loading…</div>}>
      <CallSheetInner />
    </Suspense>
  );
}
