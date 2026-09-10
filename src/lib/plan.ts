// Game Plan v2 — the rules behind the plan (Q28–Q30, Q33).
//
// Pure functions only. Three jobs:
//   1. `planInputHash` — a stable fingerprint of everything a generated plan is
//      built from, so the plan can re-run itself when the coach changes
//      something and stay put when he doesn't (Q33).
//   2. `mergeGamePlan` — regenerating replaces ONLY generated, un-edited items.
//      Anything the coach typed or touched stays exactly where he put it.
//   3. The answer engine — every tendency gets a response INSIDE this team's
//      system: his adjustment rules first, then his fronts/coverages/pressures
//      matched by what the opponent's concept actually is. When we have no
//      stored answer, we say so and it becomes a practice priority (Q28/Q30).

import { matchTerm, normalizeTerm, type TermMapping } from "@/lib/knowledge";
import type { Concept, GamePlan, Opponent, PlanEvidence, PlanItem } from "@/lib/store";
import { tag as normTag, type Tell, type TellTag } from "@/lib/tendencies";

// ---- item helpers -----------------------------------------------------------

/** Generated items carry a deterministic id so a regenerate doesn't churn the list. */
export const genItem = (
  key: string,
  text: string,
  sub?: string,
  extra: Partial<PlanItem> = {},
): PlanItem => ({ id: `g-${key}`, text, sub, source: "generated", ...extra });

export const coachItem = (text = "", sub?: string): PlanItem => ({
  id: `c-${Math.random().toString(36).slice(2, 9)}`,
  text,
  sub,
  source: "coach",
});

// ---- input hash (Q33) -------------------------------------------------------

const hash = (s: string) => {
  let x = 5381;
  for (let i = 0; i < s.length; i++) x = ((x * 33) ^ s.charCodeAt(i)) >>> 0;
  return x.toString(36);
};

/**
 * Everything a generated plan reads: the snaps, what the coach has told us
 * about them, and the saved defense. Change any of it and the plan re-runs.
 */
export function planInputHash(o: Opponent, concepts: Concept[], termMap: TermMapping[] = []): string {
  const plays = o.plays
    .map((p) =>
      [p.num, p.personnel, p.backfield, p.down, p.distance, p.hash, p.playType, p.result, p.gain, p.formation, p.play, p.strength, p.direction, p.player, p.motion].join("|"),
    )
    .join(";");
  const knowledge = [
    o.name, o.notes, o.redZone, o.tempo, o.offensiveStyle,
    o.keyPlayers.map((k) => `${k.jersey ?? ""}${k.name}${k.pos ?? ""}${k.notes ?? ""}`).join(","),
    o.matchupNotes.map((m) => `${m.label}=${m.value}`).join(","),
    o.formations.map((f) => `${f.name}${f.snapsPct}${f.runPct}`).join(","),
    o.concepts.map((c) => `${c.name}${c.type}${c.freq}`).join(","),
    o.personnelUsage.map((p) => `${p.group}${p.pct}`).join(","),
    o.runRate, o.firstDownRun, o.rpoRate, o.signatureConcept, o.signatureRate,
  ].join("~");
  const scheme = concepts
    .map((c) => `${c.id}:${c.kind}:${c.name}:${c.status ?? "active"}:${c.confirmed ? 1 : 0}:${c.isBase ? 1 : 0}:${c.trigger ?? ""}>${c.action ?? ""}>${c.result ?? ""}`)
    .join(";");
  const terms = termMap.map((t) => `${t.term}=${t.meaning}`).join(";");
  return hash(`${plays}##${knowledge}##${scheme}##${terms}`);
}

// ---- the merge rule ---------------------------------------------------------

const keepIt = (it: PlanItem) => it.source === "coach" || it.edited === true;

/**
 * Regenerate = redraft the machine's lines, leave the coach's alone. Coach items
 * and edited items hold their place in the list; the fresh draft fills in around
 * them, and an edited item's own regenerated twin is dropped so it isn't listed
 * twice.
 */
export function mergeSection(prev: PlanItem[] = [], generated: PlanItem[] = []): PlanItem[] {
  const preserved = prev.map((it, i) => ({ it, i })).filter(({ it }) => keepIt(it));
  const held = new Set(preserved.map(({ it }) => it.id));
  const out = generated.filter((g) => !held.has(g.id));
  for (const { it, i } of preserved) out.splice(Math.min(i, out.length), 0, it);
  return out;
}

export type PlanSections = Omit<GamePlan, "opponentId" | "generatedAt" | "inputHash">;
const SECTION_KEYS: (keyof PlanSections)[] = ["priorities", "bestPlayers", "threats", "concerns", "adjustments", "emphasis"];

export function mergeGamePlan(prev: GamePlan | undefined, fresh: PlanSections, inputHash: string): Omit<GamePlan, "opponentId"> {
  const out = {} as PlanSections;
  for (const key of SECTION_KEYS) out[key] = mergeSection(prev?.[key], fresh[key]);
  return { ...out, generatedAt: Date.now(), inputHash };
}

/** Did the coach put his own hand on this plan yet? (Plan Status step 4.) */
export const planHasCoachInput = (plan?: GamePlan) =>
  !!plan && SECTION_KEYS.some((k) => (plan[k] ?? []).some((it) => it.source === "coach" ? !!it.text.trim() : it.edited));

// ---- the coach's toolbox ----------------------------------------------------

export type PlanKit = {
  all: Concept[];
  fronts: Concept[];
  coverages: Concept[];
  pressures: Concept[];
  adjustments: Concept[];
  baseFront?: Concept;
  baseCoverage?: Concept;
};

/**
 * In-season we only ever call what this team carries: active calls plus the
 * ones they have practiced and kept in the back pocket (Q30).
 */
export function makeKit(concepts: Concept[]): PlanKit {
  // Both statuses are callable in-season; anything outside this list is never
  // presented as a call, only ever labelled as football we don't carry.
  const all = concepts.filter((c) => c.confirmed && ["active", "backPocket"].includes(c.status ?? "active"));
  const of = (kind: Concept["kind"]) => all.filter((c) => c.kind === kind);
  const fronts = of("front");
  const coverages = of("coverage");
  return {
    all,
    fronts,
    coverages,
    pressures: of("pressure"),
    adjustments: of("adjustment"),
    baseFront: fronts.find((f) => f.isBase) ?? fronts[0],
    baseCoverage: coverages.find((c) => c.isBase) ?? coverages[0],
  };
}

/** "Tite" / "Cover 1 Robber (back pocket)" — never hide that it's a held call. */
export const callName = (c: Concept) => `${c.name}${(c.status ?? "active") === "backPocket" ? " (back pocket)" : ""}`;

const pick = (list: Concept[], re: RegExp) => list.find((c) => re.test(c.name)) ?? null;

// ---- matching a tendency to a saved rule ------------------------------------

// Words that would match everything and mean nothing.
const NOISE = new Set([
  "PERSONNEL", "BACKFIELD", "MOTION", "DOWN", "STRENGTH", "HASH", "THE", "AND", "SIDE",
  "FORMATION", "PLAY", "SNAP", "SNAPS", "LEFT", "RIGHT", "MIDDLE", "NORMAL",
]);
const words = (s: string) => normalizeTerm(s).split(" ").filter((w) => w.length > 1 && !NOISE.has(w));

/**
 * Does the coach already have a rule for this look? Scored on shared football
 * words between the tell's condition and the rule's trigger, so "Trips Right"
 * finds his "Trips = Special" check and "3rd/4th & 7-10" finds his 3rd-down rule.
 */
export function matchAdjustment(condition: string, adjustments: Concept[]): Concept | null {
  const want = words(condition);
  if (!want.length) return null;
  let best: { c: Concept; score: number } | null = null;
  for (const a of adjustments) {
    // The trigger is what he sees on the field — that's the only half of the
    // rule worth matching against. Rule names carry stray football words.
    const hay = new Set(words(a.trigger?.trim() || a.name));
    const score = want.filter((w) => hay.has(w)).length;
    if (score > 0 && (!best || score > best.score)) best = { c: a, score };
  }
  return best?.c ?? null;
}

const ruleSentence = (a: Concept) => {
  const held = (a.status ?? "active") === "backPocket" ? " (back pocket)" : "";
  return `Your rule: ${a.trigger || a.name} → ${a.action || "check"} → ${a.result || a.name}${held}`.replace(/\s+/g, " ");
};

// ---- what the opponent's concept actually is --------------------------------

export type ConceptRead = { family: string | null; type: string | null; label: string | null };

/** Read an opponent play tag through the coach's dictionary, then football. */
export function readConcept(raw: string, termMap: TermMapping[] = []): ConceptRead {
  const t = normTag(raw);
  if (!t) return { family: null, type: null, label: null };
  const taught = termMap.find((m) => normalizeTerm(m.term) === normalizeTerm(t));
  const text = taught?.meaning ? `${t} ${taught.meaning}` : t;
  const m = matchTerm(text, "concept") ?? matchTerm(t, "concept");
  const base = m?.entries.find((e) => e.role === "base" && e.kind === "concept") ?? m?.entries[0] ?? null;
  return { family: base?.family ?? null, type: base?.type ?? null, label: base?.label ?? null };
}

// ---- the answer -------------------------------------------------------------

export type PlanAnswer = {
  /** The call, in his words. */
  text: string;
  conceptIds: string[];
  /** True when the best idea is not something this team carries (Q30/Q32). */
  educational?: boolean;
  /**
   * True when all we had was the base call — it covers the look, but there is
   * no check on file for it. Worth saying out loud and worth practice time.
   */
  generic?: boolean;
  /** Set when there is no answer on file — this becomes a practice priority. */
  practice?: string;
};

const answer = (text: string, cs: (Concept | null | undefined)[], extra: Partial<PlanAnswer> = {}): PlanAnswer => ({
  text,
  conceptIds: cs.filter((c): c is Concept => !!c).map((c) => c.id),
  ...extra,
});

export type AnswerInput = {
  /** The whole condition sentence, for rule matching. */
  condition: string;
  /** What they do out of it — a play name, "Run"/"Pass", or a direction. */
  outcome: string;
  outcomeKind: "runpass" | "direction" | "play";
  tags?: TellTag[];
  termMap?: TermMapping[];
};

const isThirdDownSituation = (tags: TellTag[] = []) =>
  tags.some((t) => (t.field === "situation" && /^3rd\/4th/i.test(t.value)) || (t.field === "down" && /^[34]$/.test(t.value)));
const isLong = (tags: TellTag[] = []) => tags.some((t) => t.field === "situation" && /Long|Medium/i.test(t.value));

/**
 * One tendency in, one call out. Order matters: a rule the coach already wrote
 * always beats anything we'd reason our way to, and we never invent a call he
 * doesn't carry — if the toolbox is empty we say that plainly and send it to
 * practice instead (Q30).
 */
export function answerFor(input: AnswerInput, kit: PlanKit): PlanAnswer {
  const { condition, outcome, outcomeKind, tags = [], termMap = [] } = input;

  // 1. His own Trigger → Action → Result rule for this look.
  const rule = matchAdjustment(condition, kit.adjustments);
  if (rule) {
    return answer(
      `${ruleSentence(rule)}. It already covers this look — make sure the call gets out before they snap it.`,
      [rule],
    );
  }

  const read = outcomeKind === "play" ? readConcept(outcome, termMap) : { family: null, type: null, label: null };
  const family = read.family;
  const runIsh = outcomeKind === "runpass" ? outcome === "Run" : read.type === "run";
  const passIsh = outcomeKind === "runpass" ? outcome === "Pass" : read.type === "pass" || read.type === "screen";

  const F = kit.fronts;
  const C = kit.coverages;
  const P = kit.pressures;

  // 2. Match the family of what they run to the part of the defense that answers it.
  if (family === "Zone") {
    const tite = pick(F, /tite|mint/i) ?? pick(F, /okie|odd|bear/i) ?? kit.baseFront;
    if (tite) return answer(`Front: ${callName(tite)}. Zone lives in the B gap and on the cutback — 4i alignment takes the B gap away, the backside end can't get reached, backers scrape over the top.`, [tite]);
    return answer("No front on file that closes the B gap.", [], { educational: true, practice: "Tite/Mint (4i–0–4i) is the standard answer to a zone team — educational, not in your system. Rep your base fits instead." });
  }
  if (family === "Gap") {
    const front = pick(F, /over|under|bear|eagle/i) ?? kit.baseFront;
    if (front) return answer(`Front: ${callName(front)} to the pull side. Wrong-arm the kick-out and spill it to the alley; the backside backer has to run over the top, not around it.`, [front]);
  }
  if (family === "Perimeter" || family === "Option") {
    const cloud = pick(C, /cloud|sky|2|quarters/i) ?? kit.baseCoverage;
    if (cloud) return answer(`Coverage: ${callName(cloud)}. Somebody has to be the force player every snap — corner forces to the field, safety fits the alley. Nobody chases from the inside out.`, [cloud]);
  }
  if (family === "Crossing") {
    const cov = pick(C, /robber|cover 1|match|rip|liz|tampa/i) ?? kit.baseCoverage;
    if (cov) return answer(`Coverage: ${callName(cov)}. Post safety overlaps the deep cross, underneath defenders pass crossers off with a CUT call instead of running with them.`, [cov]);
  }
  if (family === "Vertical") {
    const cov = pick(C, /quarters|2|tampa|match/i) ?? kit.baseCoverage;
    if (cov) return answer(`Coverage: ${callName(cov)}. Two-high keeps a hat over the vertical; carry #2 to the safety and re-route #1 so the throw is late.`, [cov]);
  }
  if (family === "Screen") {
    const cloud = pick(C, /cloud/i) ?? kit.baseCoverage;
    if (cloud) return answer(`Coverage: ${callName(cloud)}. The corner squats on the screen and the safety rotates over #1 — screens only hurt you when the corner is turned and running.`, [cloud]);
  }
  if (family === "RPO" || /rpo/i.test(outcome)) {
    const cov = pick(C, /match|quarters|robber|cover 1/i) ?? kit.baseCoverage;
    return answer(
      `Conflict defender plays his rule, not the ball${cov ? ` — ${callName(cov)} behind it` : ""}. The overhang fits the run and the safety takes the glance. Give them the throw, don't give them both.`,
      [cov],
    );
  }
  if (family === "High-Low" || family === "Quick" || family === "Horizontal" || family === "Flood") {
    const cov = pick(C, /match|quarters|cover 3|cloud|tampa/i) ?? kit.baseCoverage;
    if (cov) return answer(`Coverage: ${callName(cov)}. Re-route the inside receiver and squeeze the underneath window — they want the flat defender to widen so the throw inside him is free.`, [cov]);
  }

  // 3. Situational: 3rd down and they're throwing = money down.
  if (passIsh && isThirdDownSituation(tags) && isLong(tags)) {
    const prs = P.find((p) => p.group === "3rd Down Calls") ?? pick(P, /zone|fire|robber/i);
    const cov = pick(C, /robber|tampa|quarters/i) ?? kit.baseCoverage;
    if (prs || cov) {
      return answer(
        `${prs ? `Pressure: ${callName(prs)}` : "Best pressure"}${cov ? ` with ${callName(cov)} behind it` : ""}. This is the down they have to throw — make the protection find the fifth rusher.`,
        [prs, cov],
      );
    }
  }

  // 4. Nothing specific on file. Base covers it — say so, and say it plainly.
  if (outcomeKind === "direction" && kit.baseFront) {
    return answer(
      `Declare the strength ${outcome.toLowerCase()} out of ${callName(kit.baseFront)} and put the extra hat where the ball is going. Nothing on file for this look specifically — base handles it.`,
      [kit.baseFront],
      { generic: true },
    );
  }
  if (runIsh && kit.baseFront) {
    return answer(`Front: ${callName(kit.baseFront)} with the strength set to it. Out-number the side they're going to and make them run it back into the unblocked defender. No check on file for this look — base covers it.`, [kit.baseFront], { generic: true });
  }
  if (passIsh && kit.baseCoverage) {
    return answer(`Coverage: ${callName(kit.baseCoverage)}. Play your leverage rules and make them throw underneath — no free vertical off this look. No specific check on file for it.`, [kit.baseCoverage], { generic: true });
  }

  return answer("No stored answer for this yet.", [], {
    practice: `Nothing in your saved defense is filed against ${condition}. Build the rule on My Scheme or make it a practice priority this week.`,
  });
}

// ---- evidence ---------------------------------------------------------------

export const tellEvidence = (t: Tell): PlanEvidence => ({
  summary: `${t.condition} → ${t.outcome}`,
  n: t.n,
  rate: t.rate,
  baseline: t.baseline,
  playIds: t.playIds,
});

// ---- Plan Status: the coach's seven steps (Q40) -----------------------------

export type PlanStep = { n: number; label: string; done: boolean; detail: string; href?: string };

/**
 * Where he is in the week, read off the data — never a stored checklist. Step 7
 * is never "done" on purpose: the plan keeps moving until kickoff.
 */
export function planSteps(o: Opponent, plan: GamePlan | undefined, termCount: number, tellCount: number): PlanStep[] {
  const dataReady = o.plays.length > 0 || o.formations.length > 0 || o.concepts.length > 0;
  const knowledge =
    o.keyPlayers.some((k) => k.name.trim()) || !!o.notes.trim() || o.matchupNotes.length > 0 || !!o.redZone.trim() || termCount > 0;
  const planStarted = !!plan?.generatedAt;
  const collaborated = planStarted && planHasCoachInput(plan);
  return [
    {
      n: 1,
      label: "Prepare Opponent Data",
      done: dataReady,
      detail: o.plays.length ? `${o.plays.length} snaps imported` : dataReady ? "Formations / concepts entered" : "Upload the Hudl play-by-play, or type what you have",
      href: `/matchup?id=${o.id}`,
    },
    {
      n: 2,
      label: "Add Coach Knowledge",
      done: knowledge,
      detail: knowledge ? "Key players, notes and terms on file" : "Tell CounterScheme what the film doesn't say",
      href: `/matchup?id=${o.id}`,
    },
    {
      n: 3,
      label: "Generate Tendency Report",
      done: tellCount > 0,
      detail: tellCount > 0 ? `${tellCount} tendenc${tellCount === 1 ? "y" : "ies"} worth an answer` : "Needs tagged snaps to find tells",
      href: `/matchup?id=${o.id}`,
    },
    {
      n: 4,
      label: "Collaborate on Game Plan",
      done: collaborated,
      detail: collaborated ? "You've worked the plan" : planStarted ? "Drafted — add or edit a line to make it yours" : "Not generated yet",
      href: `/gameplan?id=${o.id}`,
    },
    { n: 5, label: "Generate Practice Emphasis", done: false, detail: "Being built next", href: "/practice" },
    { n: 6, label: "Generate Scout Cards", done: false, detail: "Being built next", href: "/practice" },
    { n: 7, label: "Ongoing Until Game Time", done: false, detail: "Keep adding — the plan updates itself", href: `/gameplan?id=${o.id}` },
  ];
}

/** The question the "Ask about this" button carries into the Ask box (Q29). */
export const askPrompt = (item: PlanItem) =>
  `${item.text}${item.sub ? ` — ${item.sub}` : ""}. Why is that the answer, and what else could we do inside our defense?`;
