// Football skill ratings (Q10, Q23) — position-specific, scheme-specific and
// customizable. Categories are grouped by POSITION TYPE (DL / LB / DB), which
// is derived from the standardized slot concept in football.ts, so a coach's
// own position names never change what a player is graded on.
//
// Nothing here imports the store: the store owns the saved categories and
// re-exports these helpers.

import type { Concept as SlotConcept } from "@/lib/football";

export type PositionType = "DL" | "LB" | "DB";

export const POSITION_TYPES: { key: PositionType; label: string; blurb: string }[] = [
  { key: "DL", label: "Defensive Line", blurb: "Interior and edge — the guys with a gap and a block in front of them." },
  { key: "LB", label: "Linebackers", blurb: "Off-ball backers and overhang / hybrid players." },
  { key: "DB", label: "Defensive Backs", blurb: "Corners, safeties and the nickel." },
];

export type SkillCategory = { id: string; label: string };
export type SkillCategories = Record<PositionType, SkillCategory[]>;

// The coach's 1–5 scale, shown wherever a grade is entered.
export const SKILL_SCALE: { value: number; label: string }[] = [
  { value: 1, label: "Major weakness" },
  { value: 2, label: "Below average" },
  { value: 3, label: "Solid / functional" },
  { value: 4, label: "Good" },
  { value: 5, label: "Difference-maker" },
];

// Defaults straight from the coach's examples. Ids are shared where the skill
// is genuinely the same job (tackling, IQ, block destruction, coverage) so a
// multi-position player is never asked to grade the same thing twice.
export const DEFAULT_SKILL_CATEGORIES: SkillCategories = {
  DL: [
    { id: "getOff", label: "Get-Off" },
    { id: "blockDestruction", label: "Block Destruction" },
    { id: "runFit", label: "Run Fit / Gap Control" },
    { id: "passRush", label: "Pass Rush" },
    { id: "iq", label: "Football IQ" },
  ],
  LB: [
    { id: "runFit", label: "Run Fits" },
    { id: "blockDestruction", label: "Block Destruction" },
    { id: "tackling", label: "Tackling" },
    { id: "coverage", label: "Coverage" },
    { id: "iq", label: "Football IQ" },
  ],
  DB: [
    { id: "coverage", label: "Coverage" },
    { id: "leverage", label: "Leverage / Eyes" },
    { id: "tackling", label: "Tackling" },
    { id: "runSupport", label: "Run Support" },
    { id: "iq", label: "Football IQ" },
  ],
};

export const cloneSkillCategories = (src: SkillCategories = DEFAULT_SKILL_CATEGORIES): SkillCategories => ({
  DL: src.DL.map((c) => ({ ...c })),
  LB: src.LB.map((c) => ({ ...c })),
  DB: src.DB.map((c) => ({ ...c })),
});

// ---- Position type resolution ----------------------------------------------

// Standardized slot concept → position type. This is the definition; the roster
// map below is the best-effort version for free-text roster positions.
export function positionTypeOfConcept(concept: SlotConcept): PositionType {
  switch (concept) {
    case "Interior DL":
    case "Edge rusher":
      return "DL";
    case "Off-ball LB":
    case "Hybrid / Overhang":
      return "LB";
    default:
      return "DB";
  }
}

const ROSTER_POS: Record<string, PositionType> = {
  DL: "DL", DE: "DL", DT: "DL", NT: "DL", NG: "DL", EDGE: "DL", RUSH: "DL", J: "DL", R: "DL", E: "DL", T: "DL", N: "DL",
  LB: "LB", MLB: "LB", ILB: "LB", OLB: "LB", SAM: "LB", MIKE: "LB", WILL: "LB", M: "LB", W: "LB", S: "LB",
  DB: "DB", CB: "DB", C: "DB", NB: "DB", NICKEL: "DB", SS: "DB", FS: "DB", SAF: "DB", STAR: "DB",
};

export function positionTypesOf(positions: string[]): PositionType[] {
  const out: PositionType[] = [];
  for (const raw of positions) {
    const key = raw.trim().toUpperCase();
    const t = ROSTER_POS[key];
    if (t && !out.includes(t)) out.push(t);
  }
  return out;
}

// A player's applicable categories — the union of his position types, in
// DL → LB → DB order. No defensive position on file: show everything rather
// than nothing, so the coach can still grade him.
export function categoriesFor(
  cats: SkillCategories,
  positions: string[],
): { categories: SkillCategory[]; types: PositionType[]; guessed: boolean } {
  const types = positionTypesOf(positions);
  const use = types.length ? types : (["DL", "LB", "DB"] as PositionType[]);
  const seen = new Set<string>();
  const categories: SkillCategory[] = [];
  for (const t of use) {
    for (const c of cats[t] ?? []) {
      if (seen.has(c.id)) continue;
      seen.add(c.id);
      categories.push(c);
    }
  }
  return { categories, types, guessed: types.length === 0 };
}

// ---- Scheme-driven suggestions (Q10) ---------------------------------------

export type CategorySuggestion = {
  type: PositionType;
  category: SkillCategory;
  reason: string;
};

type SchemeConcept = {
  kind: string;
  name: string;
  summary?: string;
  trigger?: string;
  action?: string;
  result?: string;
  notes?: string;
  responsibilities?: { role: string; job: string }[];
  confirmed?: boolean;
};

const MAN_WORDS = ["cover 1", "cover 0", "cover1", "cover0", "man", "meg", "2-man", "2 man"];

// Words the coach already uses in his own concepts / responsibilities that
// point at a skill worth grading.
const WORD_HITS: { words: string[]; type: PositionType; category: SkillCategory; reason: string }[] = [
  { words: ["press", "jam"], type: "DB", category: { id: "press", label: "Press / Jam" }, reason: "your coverage rules talk about pressing" },
  { words: ["blitz", "pressure", "fire"], type: "LB", category: { id: "blitzTiming", label: "Blitz Timing" }, reason: "you carry pressures your backers run" },
  { words: ["two-gap", "2-gap", "read the block", "squeeze"], type: "DL", category: { id: "twoGap", label: "Two-Gap / Read" }, reason: "your front asks the line to read blocks" },
  { words: ["communicat", "check", "alert"], type: "LB", category: { id: "communication", label: "Communication" }, reason: "your checks are called on the field" },
  { words: ["tackl"], type: "DL", category: { id: "tackling", label: "Tackling" }, reason: "your scheme leans on the front to finish" },
  { words: ["disguise"], type: "DB", category: { id: "disguise", label: "Disguise" }, reason: "you disguise your looks pre-snap" },
];

function schemeText(concepts: SchemeConcept[]) {
  return concepts
    .map((c) =>
      [c.name, c.summary, c.trigger, c.action, c.result, c.notes, ...(c.responsibilities ?? []).map((r) => `${r.role} ${r.job}`)]
        .filter(Boolean)
        .join(" "),
    )
    .join(" ")
    .toLowerCase();
}

/**
 * Adjustments CounterScheme suggests from the saved defense — never applied on
 * its own. If the team doesn't play man, grading man coverage is wasted work
 * (the coach said so directly); if his own words keep naming a skill, offer it.
 */
export function suggestCategories(cats: SkillCategories, concepts: SchemeConcept[]): CategorySuggestion[] {
  const confirmed = concepts.filter((c) => c.confirmed !== false);
  const coverages = confirmed.filter((c) => c.kind === "coverage");
  const manFamily = coverages.filter((c) => MAN_WORDS.some((w) => `${c.name} ${c.summary ?? ""}`.toLowerCase().includes(w)));
  const out: CategorySuggestion[] = [];
  const hasId = (t: PositionType, id: string) => (cats[t] ?? []).some((c) => c.id === id);

  if (coverages.length) {
    if (manFamily.length && !hasId("DB", "manCoverage")) {
      out.push({
        type: "DB",
        category: { id: "manCoverage", label: "Man Coverage" },
        reason: `you carry ${manFamily.map((c) => c.name).join(", ")} — those corners play alone`,
      });
    }
    if (!manFamily.length && !hasId("DB", "zoneDrops")) {
      out.push({
        type: "DB",
        category: { id: "zoneDrops", label: "Zone Drops / Pattern Match" },
        reason: "nothing man-family is saved, so grade the drops and the match rules instead",
      });
    }
  }

  const text = schemeText(confirmed);
  for (const hit of WORD_HITS) {
    if (hasId(hit.type, hit.category.id)) continue;
    if (!hit.words.some((w) => text.includes(w))) continue;
    out.push({ type: hit.type, category: { ...hit.category }, reason: hit.reason });
  }
  return out;
}

// ---- Weekly game grades (Q10) ----------------------------------------------

export type WeeklyGrade = { week: number; grade: number; note: string };
export type Trend = "improving" | "steady" | "struggling";

/**
 * A quiet read on the last three entered weeks. Needs at least two — one bad
 * game never means anything, and this never touches the depth chart.
 */
export function gradeTrend(grades: WeeklyGrade[] | undefined): { trend: Trend; weeks: number[]; avg: number } | null {
  const entered = (grades ?? [])
    .filter((g) => typeof g.grade === "number" && g.grade > 0)
    .sort((a, b) => a.week - b.week)
    .slice(-3);
  if (entered.length < 2) return null;
  const avg = entered.reduce((a, g) => a + g.grade, 0) / entered.length;
  const delta = entered[entered.length - 1].grade - entered[0].grade;
  const trend: Trend = delta >= 1 ? "improving" : delta <= -1 || avg < 2.5 ? "struggling" : "steady";
  return { trend, weeks: entered.map((g) => g.week), avg: Math.round(avg * 10) / 10 };
}

export const TREND_COPY: Record<Trend, string> = {
  improving: "Improving",
  steady: "Steady",
  struggling: "Struggling",
};
