// Snap-level tendency engine. Pure functions over `Play[]` — no React, no
// store writes, no randomness beyond the ids the importer hands us. Everything
// the Tendency Report shows is computed here so the AI layer only ever has to
// reason over numbers it did not invent.
//
// Coach's rules that are encoded here (Q34–Q38):
//  - situations: his exact down/distance table (Q36)
//  - formations grouped by personnel, plus formation × backfield × situation (Q37)
//  - tells: single tags AND pairs, n >= 5, ranked by lift over the opponent's
//    own baseline, split into "actionable" and "interesting" (Q35)
//  - key players from the tagged ball carrier / target (Q38)

import { DOWNS, DISTANCES, emptyGrid, type DownDistanceGrid, type Opponent, type Play } from "@/lib/store";
import { resolveTag, shortMeaning, type ResolvedTerm, type TermKind, type TermMapping } from "@/lib/knowledge";

// ---- column mapping (shared by the importer and the verification script) ----

export type PlayField =
  | "num" | "odk" | "personnel" | "backfield" | "down" | "distance" | "hash" | "yardLine"
  | "playType" | "result" | "gain" | "formation" | "play" | "strength" | "direction"
  | "player" | "quarter" | "motion";

export type PlayMapping = Partial<Record<PlayField, string | null>>;

// Aliases are matched against a lowercased, punctuation-flattened header.
export const PLAY_FIELDS: { key: PlayField; label: string; aliases: string[] }[] = [
  { key: "num", label: "Play #", aliases: ["play #", "play number", "play no", "#", "clip", "id"] },
  { key: "odk", label: "ODK (O/D/K)", aliases: ["odk", "o/d/k", "unit", "phase"] },
  { key: "personnel", label: "Personnel", aliases: ["personnel", "off personnel", "pers", "grouping"] },
  { key: "backfield", label: "Backfield", aliases: ["backfield", "back field", "bf", "rb align", "back alignment"] },
  { key: "down", label: "Down", aliases: ["dn", "down"] },
  { key: "distance", label: "Distance", aliases: ["dist", "distance", "to go", "togo", "yds to go"] },
  { key: "hash", label: "Hash", aliases: ["hash", "hash mark", "ball on"] },
  { key: "yardLine", label: "Yard Line", aliases: ["yard ln", "yard line", "yardline", "yd ln", "yrd ln", "field pos"] },
  { key: "playType", label: "Play Type (Run/Pass)", aliases: ["play type", "playtype", "type", "run/pass", "run pass", "r/p"] },
  { key: "result", label: "Result", aliases: ["result", "outcome"] },
  { key: "gain", label: "Gain / Loss", aliases: ["gn/ls", "gn ls", "gain", "gain/loss", "yards", "yds", "gn"] },
  { key: "formation", label: "Offensive Formation", aliases: ["off form", "offensive formation", "formation", "form", "set"] },
  { key: "play", label: "Offensive Play", aliases: ["off play", "offensive play", "play name", "concept", "play call"] },
  { key: "strength", label: "Offensive Strength", aliases: ["off str", "offensive strength", "strength", "str"] },
  { key: "direction", label: "Play Direction", aliases: ["play dir", "play direction", "direction", "dir"] },
  { key: "player", label: "Player (ball carrier / target)", aliases: ["player", "ball carrier", "carrier", "jersey", "target", "#ball"] },
  { key: "quarter", label: "Quarter", aliases: ["qtr", "quarter", "qt", "period"] },
  { key: "motion", label: "Motion", aliases: ["motion", "mo", "shift/motion", "motion type"] },
];

const flat = (h: string) => h.toLowerCase().replace(/[_\-.]/g, " ").replace(/\s+/g, " ").trim();

/** Best-effort header guess for a Hudl-style export. Exact alias beats substring. */
export function guessMapping(headers: string[]): PlayMapping {
  const map: PlayMapping = {};
  const taken = new Set<string>();
  for (const f of PLAY_FIELDS) {
    const exact = headers.find((h) => !taken.has(h) && f.aliases.includes(flat(h)));
    const loose = exact ?? headers.find((h) => !taken.has(h) && f.aliases.some((a) => a.length > 2 && flat(h).includes(a)));
    if (loose) {
      map[f.key] = loose;
      taken.add(loose);
    }
  }
  return map;
}

const num = (v: string): number | null => {
  const n = parseFloat(String(v ?? "").replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : null;
};

const RUN_WORDS = /zone|power|counter|trap|iso|sweep|toss|dive|draw|option|jet|duo|lead|belly|wham|qb keep|sneak/i;
const PASS_WORDS = /pass|screen|mesh|verts|smash|snag|sail|flood|post|cross|hitch|bubble|waggle|drive|slant|fade|comeback|out|corner|wheel|hot/i;

const playTypeOf = (rawType: string, play: string, result: string): Play["playType"] => {
  const t = (rawType || "").trim().toLowerCase();
  if (/^r|^rush|run/.test(t)) return "Run";
  if (/^p|pass|throw/.test(t)) return "Pass";
  const r = (result || "").toLowerCase();
  if (/^rush/.test(r)) return "Run";
  if (/complete|incomplete|interception|sack/.test(r)) return "Pass";
  const c = play || "";
  if (RUN_WORDS.test(c) && !/rpo pass|screen/i.test(c)) return "Run";
  if (PASS_WORDS.test(c)) return "Pass";
  return "";
};

const uid = () => Math.random().toString(36).slice(2, 9);

/** Turn mapped CSV rows into plays. Only ODK "O" rows survive when ODK is mapped. */
export function rowsToPlays(rows: Record<string, string>[], map: PlayMapping): Play[] {
  const get = (r: Record<string, string>, f: PlayField) => {
    const col = map[f];
    return col ? String(r[col] ?? "").trim() : "";
  };
  const mapped = new Set(Object.values(map).filter(Boolean) as string[]);
  const out: Play[] = [];
  for (const r of rows) {
    if (!Object.values(r).some((v) => v && String(v).trim())) continue;
    const odk = get(r, "odk");
    if (map.odk && odk && !/^o/i.test(odk)) continue; // offense only
    const play = get(r, "play");
    const result = get(r, "result");
    const extra: Record<string, string> = {};
    for (const [k, v] of Object.entries(r)) {
      if (!mapped.has(k) && v && String(v).trim()) extra[k] = String(v).trim();
    }
    out.push({
      id: uid(),
      num: get(r, "num"),
      odk,
      personnel: get(r, "personnel"),
      backfield: get(r, "backfield"),
      down: num(get(r, "down")),
      distance: num(get(r, "distance")),
      hash: get(r, "hash"),
      yardLine: get(r, "yardLine"),
      playType: playTypeOf(get(r, "playType"), play, result),
      result,
      gain: num(get(r, "gain")),
      formation: get(r, "formation"),
      play,
      strength: get(r, "strength"),
      direction: get(r, "direction"),
      player: get(r, "player"),
      quarter: get(r, "quarter"),
      motion: get(r, "motion"),
      extra,
    });
  }
  return out;
}

// ---- normalization ----------------------------------------------------------

/** Tags come off film boards in mixed case ("Twins Open SLOT" / "TWINS OPEN SLOT"). */
export const tag = (v: string) => (v || "").trim().replace(/\s+/g, " ").toUpperCase();

export const sideOf = (v: string): "Left" | "Right" | "Balanced" | "" => {
  const t = tag(v);
  if (!t) return "";
  if (/^L$|^LEFT$|^LT$/.test(t)) return "Left";
  if (/^R$|^RIGHT$|^RT$/.test(t)) return "Right";
  if (/^B$|^BAL/.test(t)) return "Balanced";
  return "";
};

export const hashOf = (v: string) => {
  const t = tag(v);
  if (/^L/.test(t)) return "Left hash";
  if (/^R/.test(t)) return "Right hash";
  if (/^M|^C/.test(t)) return "Middle";
  return "";
};

// ---- situations (Q36, exact) ------------------------------------------------

export type SituationGroup = "1st" | "2nd" | "3rd/4th";
export type Situation = { key: string; group: SituationGroup; label: string; range: string };

export const SITUATIONS: Situation[] = [
  { key: "1st-normal", group: "1st", label: "Normal", range: "10" },
  { key: "1st-behind", group: "1st", label: "Behind Sticks", range: "10+" },
  { key: "2nd-short", group: "2nd", label: "Short", range: "1-3" },
  { key: "2nd-manageable", group: "2nd", label: "Manageable", range: "4-6" },
  { key: "2nd-medium", group: "2nd", label: "Medium", range: "7-9" },
  { key: "2nd-long", group: "2nd", label: "Long", range: "10+" },
  { key: "34-short", group: "3rd/4th", label: "Short Yardage", range: "1-2" },
  { key: "34-manageable", group: "3rd/4th", label: "Manageable", range: "3-6" },
  { key: "34-medium", group: "3rd/4th", label: "Medium", range: "7-10" },
  { key: "34-long", group: "3rd/4th", label: "Long", range: "11+" },
];

const SIT_BY_KEY = new Map(SITUATIONS.map((s) => [s.key, s]));

/** The coach's table. 1st & under 10 (after a penalty on us / short field) rides with Normal. */
export function situationOf(p: Play): Situation | null {
  const d = p.down;
  const dist = p.distance;
  if (!d || dist == null) return null;
  if (d === 1) return SIT_BY_KEY.get(dist > 10 ? "1st-behind" : "1st-normal") ?? null;
  if (d === 2) {
    const key = dist <= 3 ? "2nd-short" : dist <= 6 ? "2nd-manageable" : dist <= 9 ? "2nd-medium" : "2nd-long";
    return SIT_BY_KEY.get(key) ?? null;
  }
  if (d === 3 || d === 4) {
    const key = dist <= 2 ? "34-short" : dist <= 6 ? "34-manageable" : dist <= 10 ? "34-medium" : "34-long";
    return SIT_BY_KEY.get(key) ?? null;
  }
  return null;
}

export const situationLabel = (s: Situation) => `${s.group} & ${s.range} — ${s.label}`;

// ---- success metrics --------------------------------------------------------

export type PlayOutcome = {
  counted: boolean; // a real run/pass snap (not a timeout / dead-ball penalty)
  td: boolean;
  turnover: boolean;
  sack: boolean;
  penalty: boolean;
  firstDown: boolean;
  explosive: boolean;
  negative: boolean;
  success: boolean; // classic success rate: 40% / 60% / 100% of the distance
};

export function outcomeOf(p: Play): PlayOutcome {
  const r = (p.result || "").toLowerCase();
  const td = /\btd\b|touchdown/.test(r);
  const turnover = /interception|intercepted|fumble lost|\bfumble\b/.test(r);
  const sack = /sack/.test(r);
  const penalty = /penalty/.test(r);
  const counted = p.playType === "Run" || p.playType === "Pass";
  const g = p.gain;
  const dist = p.distance;
  const firstDown = td || (g != null && dist != null && g >= dist);
  const explosive = g != null && (p.playType === "Run" ? g >= 12 : p.playType === "Pass" ? g >= 16 : false);
  const negative = sack || (g != null && g < 0);
  let success = false;
  if (g != null && dist != null && p.down) {
    const need = p.down === 1 ? 0.4 : p.down === 2 ? 0.6 : 1;
    success = g >= dist * need;
  }
  return { counted, td, turnover, sack, penalty, firstDown, explosive, negative, success: success || td };
}

export type SuccessSummary = {
  n: number; plays: number; runs: number; passes: number;
  avgGain: number | null; explosive: number; negative: number; turnovers: number; tds: number;
  successRate: number | null; explosiveRate: number | null;
};

export function summarize(plays: Play[]): SuccessSummary {
  const counted = plays.filter((p) => outcomeOf(p).counted);
  const gains = counted.map((p) => p.gain).filter((g): g is number => g != null);
  const outs = counted.map(outcomeOf);
  return {
    n: plays.length,
    plays: counted.length,
    runs: counted.filter((p) => p.playType === "Run").length,
    passes: counted.filter((p) => p.playType === "Pass").length,
    avgGain: gains.length ? gains.reduce((a, b) => a + b, 0) / gains.length : null,
    explosive: outs.filter((o) => o.explosive).length,
    negative: outs.filter((o) => o.negative).length,
    turnovers: outs.filter((o) => o.turnover).length,
    tds: outs.filter((o) => o.td).length,
    successRate: counted.length ? outs.filter((o) => o.success).length / counted.length : null,
    explosiveRate: counted.length ? outs.filter((o) => o.explosive).length / counted.length : null,
  };
}

// ---- situations table -------------------------------------------------------

export type SituationRow = {
  situation: Situation;
  n: number; run: number; pass: number;
  runRate: number | null;
  avgGain: number | null;
  successRate: number | null;
  topFormation: { name: string; n: number } | null;
  topPlay: { name: string; n: number } | null;
};

const topOf = (plays: Play[], pick: (p: Play) => string) => {
  const m = new Map<string, number>();
  for (const p of plays) {
    const v = tag(pick(p));
    if (!v) continue;
    m.set(v, (m.get(v) ?? 0) + 1);
  }
  const best = [...m.entries()].sort((a, b) => b[1] - a[1])[0];
  return best ? { name: best[0], n: best[1] } : null;
};

export function situationTable(plays: Play[]): SituationRow[] {
  return SITUATIONS.map((s) => {
    const rows = plays.filter((p) => situationOf(p)?.key === s.key);
    const counted = rows.filter((p) => outcomeOf(p).counted);
    const sum = summarize(rows);
    return {
      situation: s,
      n: rows.length,
      run: sum.runs,
      pass: sum.passes,
      runRate: counted.length ? sum.runs / counted.length : null,
      avgGain: sum.avgGain,
      successRate: sum.successRate,
      topFormation: topOf(rows, (p) => p.formation),
      topPlay: topOf(rows, (p) => p.play),
    };
  }).filter((r) => r.n > 0);
}

// ---- formations grouped by personnel (Q37) ---------------------------------

export type FormationRow = {
  name: string; n: number; pct: number;
  runRate: number | null; avgGain: number | null; explosiveRate: number | null;
  topPlay: { name: string; n: number } | null;
  strength: { name: string; n: number } | null;
  playIds: string[];
};
export type PersonnelGrouping = { personnel: string; n: number; pct: number; formations: FormationRow[] };

const formationRows = (plays: Play[], total: number): FormationRow[] => {
  const m = new Map<string, Play[]>();
  for (const p of plays) {
    const f = tag(p.formation);
    if (!f) continue;
    m.set(f, [...(m.get(f) ?? []), p]);
  }
  return [...m.entries()]
    .map(([name, rows]) => {
      const s = summarize(rows);
      return {
        name,
        n: rows.length,
        pct: total ? rows.length / total : 0,
        runRate: s.plays ? s.runs / s.plays : null,
        avgGain: s.avgGain,
        explosiveRate: s.explosiveRate,
        topPlay: topOf(rows, (p) => p.play),
        strength: topOf(rows, (p) => sideOf(p.strength) || ""),
        playIds: rows.map((p) => p.id),
      };
    })
    .sort((a, b) => b.n - a.n);
};

export function formationsByPersonnel(plays: Play[]): PersonnelGrouping[] {
  const m = new Map<string, Play[]>();
  for (const p of plays) {
    const key = tag(p.personnel) || "Personnel not tagged";
    m.set(key, [...(m.get(key) ?? []), p]);
  }
  const total = plays.length;
  return [...m.entries()]
    .map(([personnel, rows]) => ({
      personnel,
      n: rows.length,
      pct: total ? rows.length / total : 0,
      formations: formationRows(rows, rows.length),
    }))
    .sort((a, b) => b.n - a.n);
}

export type ComboRow = { formation: string; backfield: string; situation: string; n: number; runRate: number | null; topPlay: string | null };

/** Formation × backfield × situation — the combinations the coach asked for (Q35/Q37). */
export function formationCombos(plays: Play[], minN = 3): ComboRow[] {
  const m = new Map<string, Play[]>();
  for (const p of plays) {
    const f = tag(p.formation);
    const b = tag(p.backfield);
    const s = situationOf(p);
    if (!f || (!b && !s)) continue;
    const key = `${f}|${b || "—"}|${s ? situationLabel(s) : "—"}`;
    m.set(key, [...(m.get(key) ?? []), p]);
  }
  return [...m.entries()]
    .map(([key, rows]) => {
      const [formation, backfield, situation] = key.split("|");
      const s = summarize(rows);
      return { formation, backfield, situation, n: rows.length, runRate: s.plays ? s.runs / s.plays : null, topPlay: topOf(rows, (p) => p.play)?.name ?? null };
    })
    .filter((r) => r.n >= minN)
    .sort((a, b) => b.n - a.n);
}

// ---- the tells engine (Q35) -------------------------------------------------

export type TellField = "formation" | "backfield" | "personnel" | "hash" | "strength" | "situation" | "down" | "motion";
export type TellTag = { field: TellField; value: string; label: string };
export type OutcomeKind = "runpass" | "direction" | "play";

export type Tell = {
  id: string;
  tags: TellTag[];
  condition: string;
  outcomeKind: OutcomeKind;
  outcome: string;
  n: number; // condition matches that have this outcome type tagged
  hits: number;
  rate: number;
  baseline: number;
  lift: number;
  score: number;
  actionable: boolean;
  playIds: string[]; // the hits — the evidence rows
  matchIds: string[]; // every play matching the condition
};

const TAGGERS: { field: TellField; of: (p: Play) => string; label: (v: string) => string }[] = [
  { field: "formation", of: (p) => tag(p.formation), label: (v) => v },
  { field: "backfield", of: (p) => tag(p.backfield), label: (v) => `${v} backfield` },
  { field: "personnel", of: (p) => tag(p.personnel), label: (v) => `${v} personnel` },
  { field: "hash", of: (p) => hashOf(p.hash), label: (v) => v },
  { field: "strength", of: (p) => { const s = sideOf(p.strength); return s ? `Strength ${s}` : ""; }, label: (v) => v },
  { field: "situation", of: (p) => { const s = situationOf(p); return s ? situationLabel(s) : ""; }, label: (v) => v },
  { field: "down", of: (p) => (p.down ? `${p.down}` : ""), label: (v) => `${v}${v === "1" ? "st" : v === "2" ? "nd" : v === "3" ? "rd" : "th"} down` },
  { field: "motion", of: (p) => tag(p.motion), label: (v) => `${v} motion` },
];

const OUTCOMES: { kind: OutcomeKind; of: (p: Play) => string; noun: string }[] = [
  { kind: "runpass", of: (p) => p.playType, noun: "run/pass" },
  { kind: "direction", of: (p) => sideOf(p.direction), noun: "direction" },
  { kind: "play", of: (p) => tag(p.play), noun: "play" },
];

export type TellOptions = { minN?: number; minPairN?: number; pairGain?: number };

/**
 * Every single tag and every pair of tags becomes a candidate condition. For
 * each we look at how the outcome splits inside the condition versus the
 * opponent's own baseline, and keep the ones that actually move the number.
 * Nothing is reported below `minN` snaps — a tell on four plays is a coin flip.
 */
export function computeTells(plays: Play[], opts: TellOptions = {}) {
  const minN = opts.minN ?? 5;
  const minPairN = opts.minPairN ?? Math.max(5, minN);
  const pairGain = opts.pairGain ?? 0.08;

  // baselines over the whole sample, per outcome kind
  const baselines = new Map<string, number>();
  const universe = new Map<OutcomeKind, Play[]>();
  for (const o of OUTCOMES) {
    const rows = plays.filter((p) => o.of(p));
    universe.set(o.kind, rows);
    const counts = new Map<string, number>();
    for (const p of rows) counts.set(o.of(p), (counts.get(o.of(p)) ?? 0) + 1);
    for (const [value, n] of counts) baselines.set(`${o.kind}|${value}`, rows.length ? n / rows.length : 0);
  }

  // index every play's tags once
  const tagsOf = new Map<string, TellTag[]>();
  for (const p of plays) {
    const t: TellTag[] = [];
    for (const tg of TAGGERS) {
      const v = tg.of(p);
      if (v) t.push({ field: tg.field, value: v, label: tg.label(v) });
    }
    tagsOf.set(p.id, t);
  }

  // condition key -> matching plays
  const conditions = new Map<string, { tags: TellTag[]; plays: Play[] }>();
  const add = (tags: TellTag[], p: Play) => {
    const key = tags.map((t) => `${t.field}=${t.value}`).join(" + ");
    const e = conditions.get(key) ?? { tags, plays: [] };
    e.plays.push(p);
    conditions.set(key, e);
  };
  for (const p of plays) {
    const t = tagsOf.get(p.id) ?? [];
    for (let i = 0; i < t.length; i++) {
      add([t[i]], p);
      for (let j = i + 1; j < t.length; j++) add([t[i], t[j]], p);
    }
  }

  const tells: Tell[] = [];
  for (const [key, { tags, plays: rows }] of conditions) {
    const pair = tags.length > 1;
    if (rows.length < (pair ? minPairN : minN)) continue;
    for (const o of OUTCOMES) {
      const withOutcome = rows.filter((p) => o.of(p));
      if (withOutcome.length < (pair ? minPairN : minN)) continue;
      const counts = new Map<string, Play[]>();
      for (const p of withOutcome) counts.set(o.of(p), [...(counts.get(o.of(p)) ?? []), p]);
      for (const [value, hitRows] of counts) {
        const rate = hitRows.length / withOutcome.length;
        const baseline = baselines.get(`${o.kind}|${value}`) ?? 0;
        const lift = rate - baseline;
        if (lift <= 0.05) continue;
        if (o.kind === "play" && hitRows.length < 3) continue;
        const support = Math.sqrt(withOutcome.length);
        tells.push({
          id: `${key}|${o.kind}|${value}`,
          tags,
          condition: tags.map((t) => t.label).join(" + "),
          outcomeKind: o.kind,
          outcome: value,
          n: withOutcome.length,
          hits: hitRows.length,
          rate,
          baseline,
          lift,
          score: lift * support,
          actionable:
            withOutcome.length >= 8 && lift >= 0.15 && rate >= (o.kind === "play" ? 0.35 : 0.65),
          playIds: hitRows.map((p) => p.id),
          matchIds: rows.map((p) => p.id),
        });
      }
    }
  }

  // A pair only earns its place if it beats BOTH of its own single tags.
  const singleLift = new Map<string, number>();
  for (const t of tells) {
    if (t.tags.length === 1) {
      singleLift.set(`${t.tags[0].field}=${t.tags[0].value}|${t.outcomeKind}|${t.outcome}`, t.lift);
    }
  }
  const kept = tells.filter((t) => {
    if (t.tags.length === 1) return true;
    const parents = t.tags.map((tg) => singleLift.get(`${tg.field}=${tg.value}|${t.outcomeKind}|${t.outcome}`) ?? 0);
    return t.lift >= Math.max(...parents) + pairGain;
  });

  kept.sort((a, b) => b.score - a.score);
  return {
    all: kept,
    actionable: kept.filter((t) => t.actionable),
    interesting: kept.filter((t) => !t.actionable),
    universe,
  };
}

export function tellSentence(t: Tell, resolve?: TagResolver): string {
  const pct = Math.round(t.rate * 100);
  const base = Math.round(t.baseline * 100);
  // Only the tags that are really opponent WORDS get a meaning next to them.
  // "Right hash" and "3rd & 7-10" are already plain English.
  const condition = resolve
    ? t.tags
        .map((tag) => {
          const kind = kindOfField(tag.field);
          return kind ? decorate(tag.label, resolve(tag.value, kind)) : tag.label;
        })
        .join(" + ")
    : t.condition;
  const outcome = resolve && t.outcomeKind === "play" ? decorate(t.outcome, resolve(t.outcome, "concept")) : t.outcome;
  if (t.outcomeKind === "runpass") return `${condition} → ${t.outcome} ${pct}% (they ${t.outcome === "Run" ? "run" : "throw"} ${base}% overall)`;
  if (t.outcomeKind === "direction") return `${condition} → ball goes ${t.outcome} ${pct}% (${base}% overall)`;
  return `${condition} → ${outcome} ${pct}% of the time (${base}% overall)`;
}

// ---- terminology (Q27) ------------------------------------------------------

/** Look up one raw opponent tag. Coach's dictionary first, then football. */
export type TagResolver = (value: string, kind?: TermKind) => ResolvedTerm | null;

const FIELD_KIND: Partial<Record<TellField, TermKind>> = {
  formation: "formation",
  backfield: "backfield",
  motion: "concept",
};
const kindOfField = (f: TellField): TermKind | undefined => FIELD_KIND[f];

/** "UTAH (Trips, TE attached)" — raw tag stays primary, meaning rides along. */
export function decorate(raw: string, r: ResolvedTerm | null): string {
  const m = r && r.source !== "unknown" ? shortMeaning(r, 48) : null;
  return m ? `${raw} (${m})` : raw;
}

export function makeResolver(termMap: TermMapping[]): TagResolver {
  const cache = new Map<string, ResolvedTerm | null>();
  return (value, kind) => {
    const key = `${kind ?? ""}|${tag(value)}`;
    if (!cache.has(key)) {
      const r = resolveTag(value, termMap, kind);
      cache.set(key, r.source === "unknown" ? null : r);
    }
    return cache.get(key) ?? null;
  };
}

/** One word CounterScheme can't account for, and where it showed up. */
export type UnknownTerm = {
  term: string; // the word (or the whole tag, when none of it read)
  kind: TermKind;
  count: number; // snaps affected
  tags: string[]; // the raw tags it appeared in
  field: "formation" | "play" | "backfield" | "motion";
};

const UNKNOWN_FIELDS: { field: UnknownTerm["field"]; kind: TermKind; of: (p: Play) => string }[] = [
  { field: "formation", kind: "formation", of: (p) => p.formation },
  { field: "play", kind: "concept", of: (p) => p.play },
  { field: "backfield", kind: "backfield", of: (p) => p.backfield },
  { field: "motion", kind: "concept", of: (p) => p.motion },
];

/**
 * The words we'd have to ask about. Only what's actually on this opponent's
 * film, ranked by how often it shows up — the coach answers one at a time and
 * only when it matters (Q27).
 */
export function unknownTerms(plays: Play[], termMap: TermMapping[] = []): UnknownTerm[] {
  const out = new Map<string, UnknownTerm>();
  for (const f of UNKNOWN_FIELDS) {
    const counts = new Map<string, number>();
    for (const p of plays) {
      const raw = tag(f.of(p));
      if (!raw) continue;
      counts.set(raw, (counts.get(raw) ?? 0) + 1);
    }
    for (const [raw, n] of counts) {
      const r = resolveTag(raw, termMap, f.kind);
      for (const word of r.unknownWords) {
        const key = `${f.field}|${word}`;
        const e = out.get(key) ?? { term: word, kind: f.kind, count: 0, tags: [], field: f.field };
        e.count += n;
        if (!e.tags.includes(raw)) e.tags.push(raw);
        out.set(key, e);
      }
    }
  }
  return [...out.values()].sort((a, b) => b.count - a.count || a.term.localeCompare(b.term));
}

// ---- key players (Q38) ------------------------------------------------------

export type PlayerUsage = {
  player: string;
  touches: number;
  share: number;
  runs: number;
  passes: number;
  avgGain: number | null;
  explosive: number;
  tds: number;
  successRate: number | null;
  topSituation: { name: string; n: number } | null;
  topFormation: { name: string; n: number } | null;
  playIds: string[];
};

export function keyPlayerUsage(plays: Play[]): PlayerUsage[] {
  const tagged = plays.filter((p) => (p.player || "").trim());
  if (!tagged.length) return [];
  const m = new Map<string, Play[]>();
  for (const p of tagged) {
    const k = tag(p.player);
    m.set(k, [...(m.get(k) ?? []), p]);
  }
  return [...m.entries()]
    .map(([player, rows]) => {
      const s = summarize(rows);
      return {
        player,
        touches: rows.length,
        share: tagged.length ? rows.length / tagged.length : 0,
        runs: s.runs,
        passes: s.passes,
        avgGain: s.avgGain,
        explosive: s.explosive,
        tds: s.tds,
        successRate: s.successRate,
        topSituation: topOf(rows, (p) => { const st = situationOf(p); return st ? situationLabel(st) : ""; }),
        topFormation: topOf(rows, (p) => p.formation),
        playIds: rows.map((p) => p.id),
      };
    })
    .sort((a, b) => b.touches - a.touches);
}

// ---- best plays -------------------------------------------------------------

export type PlayRow = {
  name: string; n: number; type: "Run" | "Pass" | "Mixed";
  avgGain: number | null; explosive: number; explosiveRate: number | null;
  successRate: number | null; tds: number; topDirection: string | null;
  playIds: string[];
};

export function playRows(plays: Play[]): PlayRow[] {
  const m = new Map<string, Play[]>();
  for (const p of plays) {
    const name = tag(p.play);
    if (!name) continue;
    m.set(name, [...(m.get(name) ?? []), p]);
  }
  return [...m.entries()].map(([name, rows]) => {
    const s = summarize(rows);
    const type: PlayRow["type"] = s.runs && s.passes ? "Mixed" : s.passes ? "Pass" : "Run";
    return {
      name,
      n: rows.length,
      type,
      avgGain: s.avgGain,
      explosive: s.explosive,
      explosiveRate: s.explosiveRate,
      successRate: s.successRate,
      tds: s.tds,
      topDirection: topOf(rows, (p) => sideOf(p.direction) || "")?.name ?? null,
      playIds: rows.map((p) => p.id),
    };
  });
}

/** Two lists, because "most called" and "most dangerous" are rarely the same play. */
export function bestPlays(plays: Play[], minN = 3) {
  const rows = playRows(plays);
  const byFrequency = [...rows].sort((a, b) => b.n - a.n);
  const bySuccess = rows
    .filter((r) => r.n >= minN)
    .sort((a, b) => (b.explosiveRate ?? 0) - (a.explosiveRate ?? 0) || (b.avgGain ?? -99) - (a.avgGain ?? -99));
  return { byFrequency, bySuccess };
}

// ---- headline numbers (the tiles on Opponent Matchup) -----------------------

export function downDistanceFromPlays(plays: Play[], minCell = 3): DownDistanceGrid {
  const grid = emptyGrid();
  const tally: Record<string, { run: number; n: number }> = {};
  for (const p of plays) {
    if (!p.down || p.distance == null || !p.playType) continue;
    const dist = p.distance;
    const bucket = dist <= 3 ? DISTANCES[0] : dist <= 6 ? DISTANCES[1] : DISTANCES[2];
    const key = `${p.down}|${bucket}`;
    tally[key] ??= { run: 0, n: 0 };
    tally[key].n++;
    if (p.playType === "Run") tally[key].run++;
  }
  for (const down of DOWNS) {
    for (const dist of DISTANCES) {
      const t = tally[`${down.replace(/\D/g, "")}|${dist}`];
      grid[down][dist] = t && t.n >= minCell ? Math.round((t.run / t.n) * 100) : null;
    }
  }
  return grid;
}

const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : null);

/**
 * Everything the headline tiles show, recomputed from the snaps. Called on
 * import (so the stored opponent matches the plays) and on render (so the page
 * is honest even if someone hand-edited a number afterwards).
 */
export function headlineFromPlays(plays: Play[]): Partial<Opponent> {
  const counted = plays.filter((p) => p.playType);
  const runs = counted.filter((p) => p.playType === "Run").length;
  const first = counted.filter((p) => p.down === 1);
  const firstRuns = first.filter((p) => p.playType === "Run").length;
  const rpo = plays.filter((p) => /rpo/i.test(p.play)).length;
  const rows = playRows(plays).sort((a, b) => b.n - a.n);
  const top = rows[0];
  const personnel = formationsByPersonnel(plays).filter((g) => g.personnel !== "Personnel not tagged");
  const forms = formationRows(plays, plays.length);

  return {
    plays,
    playsImported: plays.length,
    runRate: counted.length ? pct(runs, counted.length) : null,
    firstDownRun: first.length >= 5 ? pct(firstRuns, first.length) : null,
    rpoRate: rpo ? pct(rpo, plays.length) : null,
    signatureConcept: top ? top.name : "",
    signatureRate: top ? pct(top.n, plays.length) : null,
    personnelUsage: personnel.slice(0, 6).map((g) => ({ id: uid(), group: g.personnel, pct: pct(g.n, plays.length) })),
    downDistance: downDistanceFromPlays(plays),
    formations: forms.slice(0, 10).map((f) => ({
      id: uid(),
      name: f.name,
      snapsPct: pct(f.n, plays.length),
      runPct: f.runRate == null ? null : Math.round(f.runRate * 100),
      notes: f.topPlay ? `Top play: ${f.topPlay.name}` : "",
    })),
    concepts: rows.slice(0, 12).map((r) => ({
      id: uid(),
      name: r.name,
      type: r.type === "Pass" ? ("Pass" as const) : ("Run" as const),
      freq: r.n,
      notes: r.avgGain != null ? `${r.avgGain.toFixed(1)} yds/play` : "",
    })),
  };
}

/** One object with everything the Tendency Report renders. */
export function tendencyReport(plays: Play[], opts?: TellOptions) {
  const tells = computeTells(plays, opts);
  return {
    total: plays.length,
    summary: summarize(plays),
    tells: tells.all,
    actionable: tells.actionable,
    interesting: tells.interesting,
    situations: situationTable(plays),
    personnel: formationsByPersonnel(plays),
    combos: formationCombos(plays),
    players: keyPlayerUsage(plays),
    best: bestPlays(plays),
  };
}
