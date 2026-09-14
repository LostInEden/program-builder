// Call Sheet (Q45) — the game-day sheet for the whole defense.
//
// Three of its four default sections are computed live and never stored: the
// full menu of calls off My Scheme, the lines the coach kept on the Game Plan,
// and the tells worth remembering. The coach owns the layout (titles, order,
// what's hidden, his own sections) and that is all that gets saved — so
// regenerating the game plan can never touch a word he wrote here.
//
// Nothing on this sheet tells him what to call. It is a menu and a set of
// reminders; the call is his.

import type { CallSheet, CallSheetSection, Concept, GamePlan, Play, PlanItem } from "@/lib/store";
import { lockable } from "@/lib/plan";
import { computeTells, makeResolver, tellSentence } from "@/lib/tendencies";
import type { TermMapping } from "@/lib/knowledge";

// ---- what a rendered section looks like -------------------------------------

export type SheetLine = {
  text: string;
  /** The second half — the answer, the trigger's result, the evidence. */
  note?: string;
  /** A short tag printed at the end of the line: "BP", "18 snaps", "LOCK". */
  tag?: string;
  strong?: boolean;
};
export type SheetBlock = { heading?: string; lines: SheetLine[] };

export const uidLine = () => Math.random().toString(36).slice(2, 9);

// ---- the default layout -----------------------------------------------------

export const CALL_SHEET_TITLES: Record<CallSheetSection["key"], string> = {
  menu: "Full Menu — Everything We Carry",
  plan: "Game-Plan Calls & Emphasis",
  tells: "Tendencies & Tells to Remember",
  notes: "Situational Notes & Reminders",
  custom: "New Section",
};

/** Generated sections recompute their content; the coach owns the rest. */
export const isGenerated = (key: CallSheetSection["key"]) => key === "menu" || key === "plan" || key === "tells";

export function defaultCallSheet(): CallSheet {
  const keys: CallSheetSection["key"][] = ["menu", "plan", "tells", "notes"];
  return {
    columns: 2,
    sections: keys.map((key, order) => ({
      id: key,
      key,
      title: CALL_SHEET_TITLES[key],
      lines: [],
      enabled: true,
      order,
    })),
  };
}

/**
 * What the coach saved, healed against the defaults: a section he never had
 * (a new release adds one) shows up at the end, and his titles/order/hidden
 * flags always win.
 */
export function withDefaults(saved: CallSheet | undefined): CallSheet {
  const base = defaultCallSheet();
  if (!saved?.sections?.length) return base;
  const have = new Set(saved.sections.map((s) => s.id));
  const missing = base.sections.filter((s) => !have.has(s.id));
  const sections = [...saved.sections, ...missing.map((s, i) => ({ ...s, order: saved.sections.length + i }))]
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((s, i) => ({ ...s, order: i }));
  return { columns: saved.columns === 3 ? 3 : 2, sections };
}

/** Renumber after a move so `order` is always 0..n-1 in list order. */
export const renumber = (sections: CallSheetSection[]): CallSheetSection[] =>
  sections.map((s, i) => ({ ...s, order: i }));

export function moveSection(sections: CallSheetSection[], id: string, dir: -1 | 1): CallSheetSection[] {
  const rows = [...sections].sort((a, b) => a.order - b.order);
  const i = rows.findIndex((s) => s.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= rows.length) return rows;
  [rows[i], rows[j]] = [rows[j], rows[i]];
  return renumber(rows);
}

export const customSection = (order: number): CallSheetSection => ({
  id: `cs-${uidLine()}`,
  key: "custom",
  title: "New Section",
  lines: [],
  enabled: true,
  order,
});

// ---- (1) the full menu ------------------------------------------------------

const held = (c: Concept) => (c.status ?? "active") === "backPocket";
const callable = (c: Concept) => c.confirmed && ["active", "backPocket"].includes(c.status ?? "active");

const byName = (a: Concept, b: Concept) =>
  Number(!!b.isBase) - Number(!!a.isBase) || Number(held(a)) - Number(held(b)) || a.name.localeCompare(b.name);

/**
 * Every call available this week, grouped the way a sheet is read: fronts,
 * coverages, pressures, then the checks as one-line Trigger → Result. Back
 * pocket is marked, never hidden — if it's practiced it's on the menu.
 */
export function menuBlocks(concepts: Concept[]): SheetBlock[] {
  const all = concepts.filter(callable);
  const of = (kind: Concept["kind"]) => all.filter((c) => c.kind === kind).sort(byName);

  const plain = (c: Concept): SheetLine => ({
    text: c.name,
    note: c.isBase ? "base" : undefined,
    tag: held(c) ? "BP" : undefined,
    strong: !!c.isBase,
  });

  const blocks: SheetBlock[] = [];
  const fronts = of("front");
  const coverages = of("coverage");
  const pressures = of("pressure");
  const adjustments = of("adjustment");

  if (fronts.length) blocks.push({ heading: "Fronts", lines: fronts.map(plain) });
  if (coverages.length) blocks.push({ heading: "Coverages", lines: coverages.map(plain) });
  if (pressures.length) {
    // Pressures read better under the coach's own groups when he uses them.
    const groups = [...new Set(pressures.map((p) => p.group ?? ""))];
    if (groups.length > 1 || groups[0]) {
      for (const g of groups) {
        const rows = pressures.filter((p) => (p.group ?? "") === g);
        blocks.push({ heading: g ? `Pressures — ${g}` : "Pressures", lines: rows.map(plain) });
      }
    } else {
      blocks.push({ heading: "Pressures", lines: pressures.map(plain) });
    }
  }
  if (adjustments.length) {
    blocks.push({
      heading: "Adjustments — Trigger → Result",
      lines: adjustments.map((c) => ({
        text: `${(c.trigger || c.name).trim()} → ${(c.result || c.action || c.name).trim()}`,
        tag: held(c) ? "BP" : undefined,
      })),
    });
  }
  return blocks;
}

// ---- (2) the game plan he kept ----------------------------------------------

const kept = (it: PlanItem) => !!it.text.trim();

/**
 * A call sheet is read at a dead sprint, so every line gets cut to its first
 * sentence and capped. The full reasoning and the evidence stay on the Game
 * Plan where there's room for them.
 */
export function tighten(raw: string, max = 120): string {
  const s = raw.replace(/\s+/g, " ").trim();
  if (!s) return "";
  const stop = s.search(/[.!?](\s|$)/);
  let out = stop > 24 ? s.slice(0, stop) : s;
  if (out.length > max) {
    const cut = out.lastIndexOf(" ", max);
    out = `${out.slice(0, cut > 40 ? cut : max)}…`;
  }
  return out;
}

/**
 * The plan, compressed to one line each. Everything on the plan is there
 * because he generated it and left it there — his own lines, the ones he
 * edited, and the generated ones he accepted. A line that shows up in two
 * sections is printed once; there's no room to say it twice.
 */
export function planBlocks(plan: GamePlan | undefined): SheetBlock[] {
  if (!plan) return [];
  const seen = new Set<string>();
  const rows = (items: PlanItem[] = [], heading: string): SheetBlock | null => {
    const lines: SheetLine[] = [];
    for (const it of items.filter(kept)) {
      const text = tighten(it.text, 130);
      const key = text.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      lines.push({ text, note: tighten(it.sub ?? "", 110) || undefined, tag: it.personnel || undefined, strong: true });
    }
    return lines.length ? { heading, lines } : null;
  };
  return [
    rows(plan.priorities, "Priorities"),
    rows(plan.threats, "Their tells → our answer"),
    rows(plan.adjustments, "Small adjustments"),
    rows(plan.emphasis, "Emphasis"),
  ].filter((b): b is SheetBlock => !!b);
}

// ---- (3) tells worth remembering --------------------------------------------

/**
 * The tells that are actually actionable, one line each with the sample size.
 * "LOCK IT IN" only ever appears at the coach's bar: ten snaps and thirty
 * points above their normal (Q45).
 */
export function tellBlocks(plays: Play[], termMap: TermMapping[] = [], limit = 12): SheetBlock[] {
  if (!plays.length) return [];
  const resolve = makeResolver(termMap);
  const { actionable, all } = computeTells(plays);
  const rows = (actionable.length ? actionable : all).slice(0, limit);
  if (!rows.length) return [];
  return [
    {
      lines: rows.map((t) => ({
        text: tellSentence(t, resolve),
        tag: lockable(t.n, t.lift) ? `n=${t.n} · LOCK` : `n=${t.n}`,
      })),
    },
  ];
}

// ---- the whole sheet, ready to print ----------------------------------------

export type RenderedSection = CallSheetSection & { blocks: SheetBlock[] };

export type CallSheetInput = {
  sheet: CallSheet;
  concepts: Concept[];
  plan?: GamePlan;
  plays: Play[];
  termMap?: TermMapping[];
};

/** Generated sections get live content; his sections get his lines. */
export function renderCallSheet({ sheet, concepts, plan, plays, termMap = [] }: CallSheetInput): RenderedSection[] {
  return [...sheet.sections]
    .sort((a, b) => a.order - b.order)
    .map((s) => {
      let blocks: SheetBlock[] = [];
      if (s.key === "menu") blocks = menuBlocks(concepts);
      else if (s.key === "plan") blocks = planBlocks(plan);
      else if (s.key === "tells") blocks = tellBlocks(plays, termMap);
      else {
        const lines = s.lines.map((l) => l.trim()).filter(Boolean);
        blocks = lines.length ? [{ lines: lines.map((text) => ({ text })) }] : [];
      }
      return { ...s, blocks };
    });
}

export const sectionLineCount = (s: RenderedSection) => s.blocks.reduce((n, b) => n + b.lines.length, 0);
