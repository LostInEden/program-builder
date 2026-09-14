// Local engine — heuristics and templates over the coach's saved data.
// No API key, runs in the browser. It is deliberately conservative: when a
// sentence can't be filed with confidence it asks instead of guessing.

import { COVERAGES } from "@/lib/coverages";
import { computeFindings, SITUATIONS, type Finding } from "@/lib/analyze";
import { DOWNS, DISTANCES, type Concept, type Opponent, type GamePlan, type PlanItem, type Play } from "@/lib/store";
import { matchTerm, parseTermAnswer, resolveTag, normalizeTerm, type TermKind } from "@/lib/knowledge";
import {
  bestCombo, tagFamilyPower, tendencyReport, tellSentence, makeResolver, summarize, tag as normTag,
  type PlayerUsage, type Tell,
} from "@/lib/tendencies";
import { addAdvice, callLoad, masteryNote, principle, PRINCIPLES } from "@/lib/principles";
import {
  answerFor, callName, genItem, lockable, makeKit, readConcept, tellEvidence,
  type PlanAnswer, type PlanKit, type PlanSections,
} from "@/lib/plan";
import {
  buildPracticePool, buildScript, emptySelection, poolSummary, pruneSelection, selectedReps,
  type PracticePool, type PracticeRep,
} from "@/lib/practice";
import type {
  AiProvider, SchemeContext, TeachResult, MatchupAnswer, TermResolution, ChatContext, ChatReply,
} from "./types";

const uid = () => Math.random().toString(36).slice(2, 9);
// Generated items keep a stable id across regenerates so the merge rule can
// tell "the same line, redrafted" from "a new line".
const stableId = (s: string) => {
  let x = 5381;
  for (let i = 0; i < s.length; i++) x = ((x * 33) ^ s.charCodeAt(i)) >>> 0;
  return x.toString(36);
};
const item = (text: string, sub?: string): PlanItem => ({ id: `g-${stableId(text)}`, text, sub, source: "generated" });
const lc = (s: string) => s.toLowerCase();
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// ---- vocabulary -------------------------------------------------------------
const FRONT_NAMES = ["okie", "over", "under", "tite", "mint", "bear", "eagle", "double eagle", "46", "wide", "stack", "odd", "even", "5-man front", "five-man front", "5 man front", "3-4", "4-3", "4-2-5", "3-3-5", "3-2-6", "nickel", "dime"];
const PRESSURE_WORDS = ["blitz", "pressure", "fire zone", "firezone", "smoke", "dog", "bring", "heat", "double a", "a gap", "sim pressure", "creeper"];
const COVERAGE_ALIASES: [string, string | undefined][] = COVERAGES.map((c) => [lc(c.name), c.id] as [string, string]).concat([
  ["cover 3", "cover-3-match"], ["cover three", "cover-3-match"], ["cover 1", "cover-1"], ["man free", "cover-1"],
  ["cover 0", "cover-0"], ["cover zero", "cover-0"], ["cover 2", "cover-2-match"], ["cover two", "cover-2-match"],
  ["quarters", "quarters-match"], ["cover 4", "quarters-match"], ["palms", "palms-2-read"], ["2-read", "palms-2-read"],
  ["tampa 2", "tampa-2-match"], ["tampa", "tampa-2-match"], ["cover 6", "cover-6"], ["robber", "cover-1-robber"],
  ["cloud", "cover-3-cloud"], ["sky", "cover-3-sky"], ["buzz", "cover-3-buzz"], ["rip/liz", "rip-liz-match"], ["rip liz", "rip-liz-match"],
  ["meg", "meg"], ["mod", "mod"], ["2-man", "2-man"], ["two man", "2-man"], ["cone", "cone"], ["poach", "poach"], ["solo", "special-solo"], ["special", "special-solo"],
]);

const findCoverage = (text: string): { name: string; libraryId?: string } | null => {
  const t = lc(text);
  // longest alias first so "cover 3 cloud" beats "cover 3"
  const hit = [...COVERAGE_ALIASES].sort((a, b) => b[0].length - a[0].length).find(([alias]) => t.includes(alias));
  if (!hit) return null;
  const lib = COVERAGES.find((c) => c.id === hit[1]);
  // keep the coach's own phrasing when it is a library name; otherwise title-case the alias
  const m = text.match(new RegExp(hit[0].replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
  const raw = m ? m[0] : hit[0];
  const name = lib && lc(lib.name).startsWith(lc(raw)) ? lib.name : raw.split(" ").map(cap).join(" ");
  return { name, libraryId: lib?.id };
};
const findFront = (text: string): string | null => {
  const t = lc(text);
  const hit = [...FRONT_NAMES].sort((a, b) => b.length - a.length).find((f) => new RegExp(`\\b${f.replace(/[-]/g, "\\-")}\\b`).test(t));
  return hit ? hit.split(" ").map(cap).join(" ") : null;
};
const isPressure = (text: string) => PRESSURE_WORDS.some((w) => lc(text).includes(w));

// trigger classification
const TRIGGERS: { category: Concept["category"]; words: string[] }[] = [
  { category: "vs Motions", words: ["motion", "jet", "orbit", "across", "shift"] },
  { category: "Special Situations", words: ["red zone", "redzone", "goal line", "goalline", "inside the", "two minute", "2 minute", "two-minute", "2-minute", "hurry", "4th down", "fourth down", "backed up", "2-point", "two point"] },
  { category: "Situational Rules", words: ["3rd", "third", "2nd and", "2nd &", "second and", "1st and", "first and", "long yardage", "short yardage", "and long", "& long", "and short", "& short", "and medium"] },
  { category: "vs Personnel", words: ["personnel", "12", "13", "21", "22", "11 ", "10 ", "te +", "te+", "two te", "2 te", "tight end", "heavy", "jumbo", "big"] },
  { category: "vs Formations", words: ["trips", "3x1", "2x2", "empty", "bunch", "stack", "twins", "wing", "unbalanced", "pro", "i-form", "spread", "doubles", "quads", "nasty", "flex"] },
];
const classify = (trigger: string): Concept["category"] => {
  const hit = TRIGGERS.find((t) => t.words.some((w) => lc(trigger).includes(w)));
  if (hit) return hit.category;
  // The trigger is usually an OPPONENT word ("vs Trey", "against Deuce Stack").
  // The knowledge base knows most of them, so file the rule properly (Q27).
  const m = matchTerm(trigger.replace(/^(?:against|vs\.?|versus|when|on|in)\s+/i, ""));
  if (m?.kind === "formation") return "vs Formations";
  if (m?.kind === "backfield") return "vs Formations";
  if (m?.entries.some((e) => /jet|orbit|motion/i.test(e.label))) return "vs Motions";
  return "vs Formations";
};

/** What the knowledge base knows about an opponent word in a Teach trigger. */
const triggerNote = (trigger: string): string => {
  const m = matchTerm(trigger.replace(/^(?:against|vs\.?|versus|when|on|in)\s+/i, ""));
  return m && m.exact ? `${m.label}: ${m.meaning}.` : "";
};

const VERB = "(?:we|our defense|the defense|i|defense)?\\s*(?:will|always|usually|like to|want to|gonna|going to)?\\s*(check|play|go|bump|roll|run|call|switch|get into|line up in|kick|slide|rotate|bring|blitz|drop|lock|base|stay in|shift)\\s*(?:to|into|in|up|over|the|our|a)?\\s*";
const COND = /^(?:against|vs\.?|versus|when|whenever|if|on|in|anytime|any time)\s+(.+)$/i;

type Parsed = { concepts: TeachResult["concepts"]; question?: string; noted: string[] };

function parseSentence(raw: string, existing: Concept[]): Parsed {
  const s = raw.trim().replace(/\s+/g, " ");
  const out: Parsed = { concepts: [], noted: [] };
  if (!s) return out;
  const known = (kind: Concept["kind"], name: string) =>
    existing.some((c) => c.kind === kind && lc(c.name) === lc(name)) ||
    out.concepts.some((c) => c.kind === kind && lc(c.name) === lc(name));
  const ensure = (kind: Concept["kind"], name: string, extra: Partial<Concept> = {}) => {
    if (!known(kind, name)) out.concepts.push({ kind, name, summary: "Added from Teach — add a summary.", ...extra });
  };
  const classifyResult = (res: string): { kind: Concept["kind"] | null; name: string; libraryId?: string } => {
    const cov = findCoverage(res);
    if (cov) return { kind: "coverage", name: cov.name, libraryId: cov.libraryId };
    if (isPressure(res)) return { kind: "pressure", name: res.replace(/^(a|the|our)\s+/i, "").replace(/[.!]$/, "") };
    const front = findFront(res);
    if (front) return { kind: "front", name: front };
    return { kind: null, name: res.replace(/[.!]$/, "") };
  };

  // --- conditional rule: "<cond> <trigger>, we <verb> (to) <result>"
  const parts = s.split(/,|\s(?:then|we|our defense|i)\s/i);
  const condMatch = s.match(COND);
  const verbRe = new RegExp(`\\b${VERB}(.+?)[.!]?$`, "i");
  if (condMatch) {
    // trigger = text between the conditional word and the first verb clause
    const verbMatch = condMatch[1].match(verbRe);
    if (verbMatch) {
      const trigger = condMatch[1].slice(0, condMatch[1].toLowerCase().indexOf(verbMatch[0].toLowerCase())).replace(/[,\s]+$/, "").replace(/\s+(we|our defense|i)$/i, "");
      const verb = verbMatch[1];
      const result = verbMatch[2].trim();
      const r = classifyResult(result);
      const action = r.kind === "front" ? "Change front" : r.kind === "coverage" ? "Check coverage" : r.kind === "pressure" ? "Bring pressure" : cap(verb);
      if (trigger && result) {
        out.concepts.push({
          kind: "adjustment",
          name: `${cap(trigger)} = ${r.name}`,
          category: classify(trigger),
          trigger: cap(trigger),
          action,
          result: r.name,
          summary: triggerNote(trigger),
        });
        if (r.kind) ensure(r.kind, r.name, r.libraryId ? { libraryId: r.libraryId } : {});
        return out;
      }
    }
  }
  // "<result> against/vs/on <trigger>" (inverted)
  const inv = s.match(new RegExp(`^${VERB}(.+?)\\s+(?:against|vs\\.?|versus|when|on|in)\\s+(.+?)[.!]?$`, "i"));
  if (inv) {
    const r = classifyResult(inv[2].trim());
    const trigger = inv[3].trim();
    out.concepts.push({
      kind: "adjustment",
      name: `${cap(trigger)} = ${r.name}`,
      category: classify(trigger),
      trigger: cap(trigger),
      action: r.kind === "front" ? "Change front" : r.kind === "coverage" ? "Check coverage" : r.kind === "pressure" ? "Bring pressure" : cap(inv[1]),
      result: r.name,
      summary: triggerNote(trigger),
    });
    if (r.kind) ensure(r.kind, r.name, r.libraryId ? { libraryId: r.libraryId } : {});
    return out;
  }

  // --- plain statements: "our base is X", "we run X", "X is our base coverage"
  const isBase = /\bbase\b/i.test(s);
  const cov = findCoverage(s);
  const front = findFront(s);
  const pressure = isPressure(s);
  if (cov && !(front && !isBase && s.toLowerCase().indexOf(lc(front)) < s.toLowerCase().indexOf(lc(cov.name)))) {
    ensure("coverage", cov.name, { libraryId: cov.libraryId, isBase, summary: s });
    return out;
  }
  if (pressure) {
    const name = s.match(/(?:call|run|bring|blitz|pressure)\s+(?:it\s+)?["“]?([A-Z][\w\s-]{1,24}?)["”]?(?:\s|$|[.,])/)?.[1]?.trim();
    ensure("pressure", name ?? cap(s.replace(/[.!]$/, "").slice(0, 40)), { summary: s, group: /3rd|third/i.test(s) ? "3rd Down Calls" : /edge|smoke|outside/i.test(s) ? "Edge Blitzes" : /zone|fire/i.test(s) ? "Zone Blitzes" : /man|cover 0|cover 1/i.test(s) ? "Man Blitzes" : "Pressure Packages" });
    return out;
  }
  if (front) {
    ensure("front", front, { isBase, summary: s });
    return out;
  }
  out.noted.push(s);
  return out;
}

async function teach(input: string, ctx: SchemeContext): Promise<TeachResult> {
  const sentences = input
    .split(/(?<=[.!?])\s+|\n+|;\s*/)
    .map((x) => x.trim())
    .filter(Boolean);
  const all: TeachResult["concepts"] = [];
  const noted: string[] = [];
  for (const sen of sentences) {
    const p = parseSentence(sen, [...ctx.concepts, ...(all as Concept[])]);
    all.push(...p.concepts);
    noted.push(...p.noted);
  }
  const adj = all.filter((c) => c.kind === "adjustment").length;
  const named = all.filter((c) => c.kind !== "adjustment");
  const bits: string[] = [];
  if (adj) bits.push(`${adj} rule${adj === 1 ? "" : "s"}`);
  if (named.length) bits.push(`${named.length} new ${named.length === 1 ? "concept" : "concepts"} (${named.map((c) => c.name).join(", ")})`);
  const summary = bits.length
    ? `Filed ${bits.join(" and ")}. Confirm them in Recently Added.`
    : "I couldn't file that yet.";
  const question =
    noted.length > 0
      ? `I wasn't sure how to file “${noted[0].slice(0, 80)}”. Is it a front, a coverage, a pressure, or a rule (when ___, we ___)? Try “Against 12 personnel we check to Over.”`
      : undefined;
  return { concepts: all, question, summary };
}

// ---- analysis --------------------------------------------------------------
async function analyze(ctx: SchemeContext): Promise<Finding[]> {
  return computeFindings(ctx).findings;
}

// ---- game plan (Q28–Q30) ----------------------------------------------------
function pct(n: number | null | undefined) {
  return n == null ? null : `${Math.round(n)}%`;
}
const one = (n: number | null | undefined) => (n == null ? "—" : n.toFixed(1));
const pctOf = (n: number) => `${Math.round(n * 100)}%`;

/** A bracket/cone answer only if he carries one. Otherwise say so honestly. */
function bracketLine(kit: PlanKit): string {
  const cov = kit.coverages.find((c) => /cone|bracket|meg|mod|robber|match/i.test(c.name));
  return cov
    ? `On the money down, ${callName(cov)} and put two on him — everybody else plays their normal rule.`
    : "You don't carry a bracket call — the answer is leverage and a safety who knows where he is.";
}

/** Their best players first, and a practical way to limit them (Q28, Q38). */
function bestPlayerItems(o: Opponent, usage: PlayerUsage[], kit: PlanKit, termMap: SchemeContext["termMap"]): PlanItem[] {
  const out: PlanItem[] = [];
  for (const p of usage.slice(0, 4)) {
    if (p.touches < 3) continue;
    const named = o.keyPlayers.find((k) => k.jersey && normTag(k.jersey) === normTag(p.player));
    const who = named ? `#${named.jersey} ${named.name}${named.pos ? ` (${named.pos})` : ""}` : `#${p.player}`;
    const runHeavy = p.runs >= p.passes;
    const ans = answerFor(
      { condition: `${p.topFormation?.name ?? ""} ${p.topSituation?.name ?? ""}`, outcome: runHeavy ? "Run" : "Pass", outcomeKind: "runpass", termMap: termMap ?? [] },
      kit,
    );
    const where = `He gets it most out of ${p.topFormation?.name ?? "their base look"}${p.topSituation ? ` and on ${p.topSituation.name}` : ""}.`;
    const how = runHeavy
      ? `${ans.text} ${where} Make somebody else carry it — extra hat to his side and tackle him for three.`
      : `${ans.text} ${where} ${bracketLine(kit)}`;
    out.push(
      genItem(`bp-${p.player}`, `${who} — ${p.touches} touches, ${pctOf(p.share)} of the ball, ${one(p.avgGain)} yds a touch${p.explosive ? `, ${p.explosive} explosive` : ""}${p.tds ? `, ${p.tds} TD` : ""}`, how, {
        evidence: { summary: `${who} with the ball`, n: p.touches, rate: p.share, playIds: p.playIds },
        conceptIds: ans.conceptIds,
      }),
    );
  }
  // Whatever the coach knows that the tagging doesn't (Q38) — never duplicated.
  const covered = new Set(out.map((i) => normTag(i.text.split(" ")[0].replace("#", ""))));
  for (const k of o.keyPlayers.filter((k) => k.name.trim()).slice(0, 4)) {
    if (k.jersey && covered.has(normTag(k.jersey))) continue;
    if (out.length >= 5) break;
    const isSkill = /wr|te|slot|x|z|y/i.test(k.pos ?? "");
    const isQb = /qb|quarterback/i.test(k.pos ?? "");
    const how = isSkill
      ? bracketLine(kit)
      : isQb
        ? `Make him a thrower or a runner, not both — the edge player has him every snap and the fits stay honest behind it.`
        : `Make somebody else beat you: extra hat to his side, get him on the ground for three, and don't let the backside end get reached.`;
    out.push(
      genItem(`bpn-${k.id}`, `${k.jersey ? `#${k.jersey} ` : ""}${k.name}${k.pos ? ` (${k.pos})` : ""}`, `${k.notes ? `${k.notes}. ` : ""}${how}`, {
        conceptIds: kit.baseFront && !isSkill ? [kit.baseFront.id] : [],
      }),
    );
  }
  return out;
}

/**
 * How hard we're allowed to talk about a tell (Q45). Ten snaps and thirty
 * points above normal is the only bar that earns "lock it in"; everything under
 * it is an option with the count attached.
 */
function confidenceClause(t: Tell): string {
  const pts = Math.round(t.lift * 100);
  return lockable(t.n, t.lift)
    ? `${t.hits} of ${t.n} snaps, ${pts} points above their normal — strong enough to lock in.`
    : `${t.hits} of ${t.n} snaps, ${pts} points above their normal — an option with evidence, not strong enough to lock in.`;
}

/** Every tell gets an answer inside his defense — or it becomes practice work. */
function threatItems(tells: Tell[], kit: PlanKit, termMap: SchemeContext["termMap"], resolve: ReturnType<typeof makeResolver>) {
  const items: PlanItem[] = [];
  const gaps: { tell: Tell; answer: PlanAnswer }[] = [];
  const soft: { tell: Tell; answer: PlanAnswer }[] = [];
  for (const t of tells) {
    const ans = answerFor(
      { condition: t.condition, outcome: t.outcome, outcomeKind: t.outcomeKind, tags: t.tags, termMap: termMap ?? [] },
      kit,
    );
    items.push(
      genItem(`t-${t.id}`, tellSentence(t, resolve), `${ans.text}${ans.educational ? " Educational — not in your system, so don't call it Friday." : ""} ${confidenceClause(t)}`, {
        evidence: tellEvidence(t),
        conceptIds: ans.conceptIds,
        personnel: t.tags.find((x) => x.field === "personnel")?.value,
      }),
    );
    if (ans.practice) gaps.push({ tell: t, answer: ans });
    else if (ans.generic) soft.push({ tell: t, answer: ans });
  }
  return { items, gaps, soft };
}

/** Break the answers out by grouping when the opponent actually changes personnel (Q28/Q37). */
function personnelItems(plays: Play[], kit: PlanKit, termMap: SchemeContext["termMap"]): PlanItem[] {
  const groups = new Map<string, Play[]>();
  for (const p of plays) {
    const key = normTag(p.personnel);
    if (!key) continue;
    groups.set(key, [...(groups.get(key) ?? []), p]);
  }
  if (groups.size < 2) return [];
  const overall = summarize(plays);
  const baseRun = overall.plays ? overall.runs / overall.plays : null;
  const out: PlanItem[] = [];
  for (const [group, rows] of [...groups.entries()].sort((a, b) => b[1].length - a[1].length)) {
    if (rows.length < 8) continue;
    const s = summarize(rows);
    if (!s.plays) continue;
    const run = s.runs / s.plays;
    if (baseRun != null && Math.abs(run - baseRun) < 0.12) continue;
    const runHeavy = baseRun == null || run > baseRun;
    const ans = answerFor({ condition: `${group} personnel`, outcome: runHeavy ? "Run" : "Pass", outcomeKind: "runpass", termMap: termMap ?? [] }, kit);
    out.push(
      genItem(`per-${group}`, `${group} personnel → ${runHeavy ? "run" : "pass"} ${pctOf(run)}`, `${ans.text} That's ${Math.round(Math.abs(run - (baseRun ?? 0)) * 100)} points off how they play the rest of the game — get the personnel call out and match it before they're set.`, {
        evidence: { summary: `${group} personnel`, n: rows.length, rate: run, baseline: baseRun ?? undefined, playIds: rows.map((p) => p.id) },
        conceptIds: ans.conceptIds,
        personnel: group,
      }),
    );
  }
  return out.slice(0, 4);
}

/**
 * The plan CounterScheme drafts from the snaps: best players, the tells that
 * are worth a call, where they stress us, the small stuff, and what we have to
 * rep. Everything here is counted — the engine never invents a number.
 */
function playsPlan(o: Opponent, ctx: SchemeContext, findings: Finding[]): PlanSections {
  const termMap = ctx.termMap ?? [];
  const kit = makeKit(ctx.concepts);
  const resolve = makeResolver(termMap);
  const r = tendencyReport(o.plays);
  // Don't hand him six versions of the same tell. Which play they run is worth
  // more than which way it goes, so the mix is capped per kind (Q35).
  const CAP: Record<string, number> = { play: 4, runpass: 3, direction: 2 };
  const used: Record<string, number> = {};
  const tells: Tell[] = [];
  for (const t of r.actionable.length ? r.actionable : r.tells) {
    if ((used[t.outcomeKind] ?? 0) >= (CAP[t.outcomeKind] ?? 2)) continue;
    used[t.outcomeKind] = (used[t.outcomeKind] ?? 0) + 1;
    tells.push(t);
    if (tells.length >= 7) break;
  }

  const bestPlayers = bestPlayerItems(o, r.players, kit, termMap);
  const { items: threats, gaps, soft } = threatItems(tells, kit, termMap, resolve);
  const adjustments = personnelItems(o.plays, kit, termMap);

  // -- concerns: where they stress us and we have nothing filed
  const concerns: PlanItem[] = [];
  for (const g of gaps.slice(0, 3)) {
    concerns.push(
      genItem(`gap-${g.tell.id}`, `No stored answer: ${g.tell.condition} → ${g.tell.outcome}`, g.answer.practice, {
        evidence: tellEvidence(g.tell),
      }),
    );
  }
  // Base covers it, but there is no check on file — that's worth saying (Q31).
  for (const s of soft.slice(0, 2)) {
    concerns.push(
      genItem(`soft-${s.tell.id}`, `No check on file for ${s.tell.condition}`, `They do it on ${s.tell.hits} of ${s.tell.n} snaps from that look. Base alignment covers it, but there is no rule that tells the kids what changes — write one or decide you're happy playing it straight.`, {
        evidence: tellEvidence(s.tell),
      }),
    );
  }
  for (const p of r.best.bySuccess.slice(0, 2)) {
    if (p.explosive < 1 || p.n < 3) continue;
    const read = readConcept(p.name, termMap);
    concerns.push(
      genItem(`danger-${p.name}`, `${p.name} is their best play, not their most-called`, `${p.n} snaps, ${one(p.avgGain)} yds a pop, ${p.explosive} explosive${read.family ? ` — ${read.family.toLowerCase()} concept` : ""}. It only takes one to change the game, so it gets practice time whether they run it ten times or four.`, {
        evidence: { summary: p.name, n: p.n, rate: p.explosiveRate ?? 0, playIds: p.playIds },
      }),
    );
  }
  findings.filter((f) => f.status === "Potential Conflict").slice(0, 2).forEach((f) => concerns.push(genItem(`fnd-${f.id}`, f.check, f.detail)));

  // -- small adjustments that use what he already carries
  if (o.tempo && /fast|tempo|hurry|no huddle/i.test(o.tempo))
    adjustments.push(genItem("adj-tempo", "One-word calls vs their tempo", `${o.tempo} tempo — base alignment is the check when the call is late. Get lined up first and adjust second.`));
  const screens = r.best.byFrequency.find((p) => /screen|bubble|tunnel|smoke/i.test(p.name) && p.n >= 3);
  const cloud = kit.coverages.find((c) => /cloud/i.test(c.name));
  if (screens && cloud)
    adjustments.push(genItem("adj-screen", `${callName(cloud)} to the field vs their screen game`, `${screens.name} ${screens.n}× for ${one(screens.avgGain)} a throw. Corner squats, safety rotates over #1 — a turned corner is what makes a screen a big play.`, { conceptIds: [cloud.id], evidence: { summary: screens.name, n: screens.n, rate: 1, playIds: screens.playIds } }));
  const topFormation = r.personnel.flatMap((g) => g.formations).sort((a, b) => b.n - a.n)[0];
  if (topFormation && kit.baseFront)
    adjustments.push(genItem("adj-form", `Set the front to ${topFormation.name} before they get set`, `${topFormation.n} snaps out of it, ${pctOf(topFormation.runRate ?? 0)} run. Live in ${callName(kit.baseFront)} against it instead of checking late.`, { conceptIds: [kit.baseFront.id] }));

  // -- practice emphasis: what has to be repped this week (Q5, Q28)
  const emphasis: PlanItem[] = [];
  for (const g of [...gaps, ...soft].slice(0, 3))
    emphasis.push(genItem(`emp-${g.tell.id}`, `Rep an answer for ${g.tell.condition}`, `${g.tell.outcome} on ${g.tell.hits} of ${g.tell.n} snaps from that look and there's no rule on file against it. Decide the call Monday, teach it, then make it game-like Wednesday.`, { evidence: tellEvidence(g.tell) }));
  const dangerous = new Set(r.best.bySuccess.slice(0, 2).map((p) => p.name));
  const mostCalled = r.best.byFrequency.find((p) => p.n >= 4 && !dangerous.has(p.name));
  if (mostCalled)
    emphasis.push(genItem(`emp-top-${mostCalled.name}`, `Fit ${mostCalled.name} until it's boring`, `Their most-called play — ${mostCalled.n} snaps for ${one(mostCalled.avgGain)} a snap. Every front, both hashes, base fits with no thinking.`, { evidence: { summary: mostCalled.name, n: mostCalled.n, rate: mostCalled.successRate ?? 0, playIds: mostCalled.playIds } }));
  for (const p of r.best.bySuccess.slice(0, 2)) {
    if (p.n < 3) continue;
    emphasis.push(genItem(`emp-play-${p.name}`, `Fit ${p.name} from every front`, `${one(p.avgGain)} yds a snap with ${p.explosive} explosive. Both hashes, ${p.topDirection ? `${p.topDirection.toLowerCase()} first — that's where it goes` : "both directions"}.`, { evidence: { summary: p.name, n: p.n, rate: p.successRate ?? 0, playIds: p.playIds } }));
  }
  const groups = new Set(o.plays.map((p) => normTag(p.personnel)).filter(Boolean));
  if (groups.size >= 2)
    emphasis.push(genItem("emp-pers", "Personnel-change operation reps", `They play out of ${groups.size} groupings (${[...groups].slice(0, 4).join(", ")}). Rehearse the whole sequence: recognize it, communicate it, sub, take the call, align.`));
  const thirdDown = r.situations.filter((s) => s.situation.group === "3rd/4th" && s.n >= 5);
  const thirdPass = thirdDown.find((s) => s.runRate != null && s.runRate < 0.4);
  if (thirdPass) {
    const prs = kit.pressures.find((p) => p.group === "3rd Down Calls") ?? kit.pressures[0];
    emphasis.push(genItem("emp-third", "3rd & long period", `${thirdPass.situation.group} & ${thirdPass.situation.range}: ${pctOf(1 - (thirdPass.runRate ?? 0))} pass on ${thirdPass.n} snaps. ${prs ? `${callName(prs)} with your best match coverage behind it.` : "Pick the pressure you want on the money down and rep it."}`, { conceptIds: prs ? [prs.id] : [] }));
  }
  if (o.redZone.trim()) emphasis.push(genItem("emp-rz", "Red zone Thursday", `${o.redZone.trim().slice(0, 120)} Short field, tight throws — rep the fits and the fade leverage.`));

  // -- priorities: however many actually matter (Q44). No filler, no fixed
  // three — a priority earns its place by being one of the strongest tells on
  // their film, or by being the player who has to be accounted for.
  const priorities: PlanItem[] = [];
  if (bestPlayers[0]) priorities.push(genItem("pri-player", `Take away ${bestPlayers[0].text.split(" — ")[0]}`, bestPlayers[0].sub));
  const strong = tells.filter((t) => t.actionable);
  for (const t of threats) {
    const tell = strong.find((x) => `g-t-${x.id}` === t.id);
    if (!tell) continue;
    priorities.push(genItem(`pri-${tell.id}`, t.text, t.sub, { evidence: t.evidence, conceptIds: t.conceptIds }));
    if (priorities.length >= 6) break;
  }

  return {
    priorities,
    bestPlayers,
    threats,
    concerns,
    adjustments,
    emphasis,
  };
}

async function gamePlan(o: Opponent, ctx: SchemeContext, findings: Finding[]): Promise<Omit<GamePlan, "opponentId">> {
  // With snaps on file the plan is built from the snaps. Without them we still
  // draft something from whatever the coach typed in by hand.
  if ((o.plays?.length ?? 0) >= 5) return { ...playsPlan(o, ctx, findings), generatedAt: Date.now() };
  return { ...(await handEnteredPlan(o, ctx, findings)), generatedAt: Date.now() };
}

async function handEnteredPlan(o: Opponent, ctx: SchemeContext, findings: Finding[]): Promise<PlanSections> {
  const concepts = ctx.concepts.filter((c) => c.confirmed);
  const adjustments = concepts.filter((c) => c.kind === "adjustment");
  const coverages = concepts.filter((c) => c.kind === "coverage");
  const fronts = concepts.filter((c) => c.kind === "front");
  const pressures = concepts.filter((c) => c.kind === "pressure");
  const topPersonnel = [...o.personnelUsage].sort((a, b) => (b.pct ?? 0) - (a.pct ?? 0))[0];
  const topForms = [...o.formations].filter((f) => f.name).sort((a, b) => (b.snapsPct ?? 0) - (a.snapsPct ?? 0));
  const runs = [...o.concepts].filter((c) => c.type === "Run" && c.name).sort((a, b) => (b.freq ?? 0) - (a.freq ?? 0));
  const passes = [...o.concepts].filter((c) => c.type === "Pass" && c.name).sort((a, b) => (b.freq ?? 0) - (a.freq ?? 0));
  const third = o.downDistance["3rd"];
  const thirdLongPass = third["Long (7+)"] != null ? 100 - third["Long (7+)"]! : null;
  const hasAnswer = (words: string[]) => adjustments.find((a) => words.some((w) => lc(`${a.trigger} ${a.name}`).includes(w)));

  // -- threats
  const threats: PlanItem[] = [];
  if (topPersonnel?.pct != null) threats.push(item(`${topPersonnel.group}`, `${pct(topPersonnel.pct)} of snaps`));
  topForms.slice(0, 2).forEach((f) => threats.push(item(f.name, [f.snapsPct != null ? `${pct(f.snapsPct)} of snaps` : null, f.runPct != null ? `${pct(f.runPct)} run` : null, f.notes].filter(Boolean).join(" · "))));
  runs.slice(0, 2).forEach((c) => threats.push(item(`${c.name} (run)`, [c.freq != null ? `${c.freq} snaps` : null, c.notes].filter(Boolean).join(" · "))));
  passes.slice(0, 2).forEach((c) => threats.push(item(`${c.name} (pass)`, [c.freq != null ? `${c.freq} snaps` : null, c.notes].filter(Boolean).join(" · "))));
  o.keyPlayers.filter((k) => k.name).slice(0, 2).forEach((k) => threats.push(item(`${k.jersey ? `#${k.jersey} ` : ""}${k.name}${k.pos ? ` (${k.pos})` : ""}`, k.notes)));
  if (o.signatureConcept && o.signatureRate != null) threats.unshift(item(`${o.signatureConcept}`, `${pct(o.signatureRate)} of plays`));

  // -- priorities (top 3)
  const cands: { score: number; it: PlanItem }[] = [];
  if (o.firstDownRun != null && o.firstDownRun >= 55)
    cands.push({ score: o.firstDownRun, it: item("Stop the run on early downs", `They run ${pct(o.firstDownRun)} on 1st down. Force 2nd & long.`) });
  if (thirdLongPass != null && thirdLongPass >= 60)
    cands.push({ score: thirdLongPass - 10, it: item("Win 3rd & long", `${pct(thirdLongPass)} pass on 3rd & 7+. Get off the field.`) });
  if (o.rpoRate != null && o.rpoRate >= 40)
    cands.push({ score: o.rpoRate, it: item("Discipline vs the RPO", `${pct(o.rpoRate)} RPO rate — conflict defenders play their rule, not the ball.`) });
  if (passes.some((p) => /deep|cross|post|wheel|vert|shot|go/i.test(p.name)))
    cands.push({ score: 45, it: item("Limit chunk plays", `Shot plays off play-action: ${passes.filter((p) => /deep|cross|post|wheel|vert|shot|go/i.test(p.name)).map((p) => p.name).join(", ")}.`) });
  if (/\d\d%/.test(o.redZone) || /run/i.test(o.redZone))
    cands.push({ score: 40, it: item("Red zone run fits", o.redZone.slice(0, 90)) });
  if (o.runRate != null && o.runRate >= 60 && !cands.some((c) => c.it.text.includes("early downs")))
    cands.push({ score: o.runRate - 5, it: item("Out-number the run", `${pct(o.runRate)} run rate overall.`) });
  // However many matter, in order (Q44) — an empty list is honest, not a hole
  // to fill with a placeholder.
  const priorities = cands.sort((a, b) => b.score - a.score).map((c) => c.it);

  // -- best answers we already have
  const best: PlanItem[] = [];
  const match = (words: string[], label: string) => {
    const a = hasAnswer(words);
    if (a) best.push(item(`${label}: ${a.result || a.name}`, `${a.trigger} → ${a.action} → ${a.result}`));
    return !!a;
  };
  if (topPersonnel && /12|13|2 te|22/i.test(topPersonnel.group)) match(["12", "te", "heavy", "tight"], "vs 12 personnel");
  if (topForms.some((f) => /trips|3x1|bunch/i.test(f.name))) match(["trips", "3x1", "bunch"], "vs Trips");
  if (topForms.some((f) => /empty/i.test(f.name))) match(["empty"], "vs Empty");
  if (thirdLongPass != null && thirdLongPass >= 55) match(["3rd", "third", "long"], "3rd & long");
  if (o.redZone) match(["red zone", "inside", "goal"], "Red zone");
  const baseCov = coverages.find((c) => c.isBase) ?? coverages[0];
  if (baseCov && passes.some((p) => /cross|over|dig/i.test(p.name)))
    best.push(item(`${baseCov.name} vs their crossers`, "Post safety overlaps digs and deep overs; underneath defenders pass crossers with a CUT call."));
  if (runs.some((r) => /zone/i.test(r.name))) {
    const tite = fronts.find((f) => /tite|mint/i.test(f.name));
    if (tite) best.push(item(`${tite.name} front vs ${runs.find((r) => /zone/i.test(r.name))!.name}`, "4i–0–4i closes the B gaps zone wants; edges set the fence."));
  }
  if (pressures.some((p) => p.group === "3rd Down Calls") && thirdLongPass != null)
    best.push(item(`${pressures.find((p) => p.group === "3rd Down Calls")!.name} on 3rd & long`, "Your saved 3rd-down pressure — protection has to account for the 5th rusher."));

  // -- concerns
  const concerns: PlanItem[] = [];
  if (o.rpoRate != null && o.rpoRate >= 40 && !hasAnswer(["rpo", "read", "conflict"]))
    concerns.push(item("No RPO rule saved", `${pct(o.rpoRate)} RPO rate and nothing tells the conflict defender (overhang / Mike) what he owns.`));
  for (const s of SITUATIONS) {
    const relevant =
      (s.key === "12" && topPersonnel && /12|13|2 te/i.test(topPersonnel.group)) ||
      (s.key === "trips" && topForms.some((f) => /trips|3x1|bunch/i.test(f.name))) ||
      (s.key === "empty" && topForms.some((f) => /empty/i.test(f.name))) ||
      (s.key === "3rdlong" && thirdLongPass != null) ||
      (s.key === "redzone" && !!o.redZone) ||
      (s.key === "motion" && o.concepts.some((c) => /motion|jet/i.test(`${c.name} ${c.notes ?? ""}`)));
    if (relevant && !hasAnswer(s.words)) concerns.push(item(`No stored answer: ${s.label}`, `They show it — ${s.fallback}`));
  }
  findings.filter((f) => f.status === "Potential Conflict").forEach((f) => concerns.push(item(f.check, f.detail)));

  // -- small adjustments
  const adj: PlanItem[] = [];
  if (topPersonnel && /12|13/i.test(topPersonnel.group) && fronts.some((f) => /over/i.test(f.name)))
    adj.push(item("Live in Over vs 12 personnel", "Put the 3-tech to the TE side before the snap instead of checking late."));
  if (passes.some((p) => /screen|bubble|tunnel/i.test(p.name)) && coverages.some((c) => /cloud/i.test(c.name)))
    adj.push(item("Cloud to the field vs screens", "Corner sits on the bubble/tunnel; safety rotates over #1."));
  if (o.tempo && /fast|tempo|hurry/i.test(o.tempo))
    adj.push(item("One-word calls vs tempo", `${o.tempo} tempo — base alignment is the check when the call is late.`));
  if (o.keyPlayers.some((k) => /wr|te/i.test(k.pos ?? "")) && coverages.some((c) => /cone|bracket|meg/i.test(c.name)))
    adj.push(item(`Bracket #${o.keyPlayers.find((k) => /wr|te/i.test(k.pos ?? ""))!.jersey ?? ""} on 3rd down`, "Cone him on the money down; MEG elsewhere."));
  if (o.signatureConcept && /zone/i.test(o.signatureConcept))
    adj.push(item("Ends squeeze, backers scrape", `${o.signatureConcept} lives on the cutback — the backside end can't get reached.`));

  // -- practice / call emphasis
  const emphasis: PlanItem[] = [];
  if (runs[0]) emphasis.push(item(`Fit ${runs[0].name} from every front`, "Tuesday: inside run, all fronts, both hashes."));
  if (thirdLongPass != null && thirdLongPass >= 55) emphasis.push(item("3rd & long period", `${pressures.find((p) => p.group === "3rd Down Calls")?.name ?? "Best pressure"} + ${coverages.find((c) => /robber|tampa|quarters/i.test(c.name))?.name ?? "match coverage"} behind it.`));
  if (o.rpoRate != null && o.rpoRate >= 40) emphasis.push(item("RPO conflict drill", "Overhang and Mike: run key first, then re-route #2."));
  if (passes.some((p) => /cross|post|wheel/i.test(p.name))) emphasis.push(item("Match rules vs crossers and wheels", "Overhang expands with the wheel; CUT call on crossers (Coverage Library)."));
  if (o.redZone) emphasis.push(item("Red zone Thursday", o.redZone.slice(0, 80)));

  // Answers we already carry belong with the rest of the small stuff now —
  // the plan reads best players → threats → concerns → adjustments → practice.
  return {
    priorities,
    bestPlayers: o.keyPlayers
      .filter((k) => k.name.trim())
      .map((k) => item(`${k.jersey ? `#${k.jersey} ` : ""}${k.name}${k.pos ? ` (${k.pos})` : ""}`, k.notes || undefined)),
    threats,
    concerns,
    adjustments: [...best, ...adj],
    emphasis,
  };
}

// ---- terminology (Q27) -----------------------------------------------------

/**
 * The coach tells us what one of their words means. We match the football in
 * his answer against the knowledge base so the term is filed correctly, but the
 * meaning we keep is always his own sentence.
 */
async function resolveTerm(term: string, answer: string, kind?: TermKind): Promise<TermResolution> {
  const parsed = parseTermAnswer(term, answer, kind);
  const matched = parsed.match ? { label: parsed.match.label, meaning: parsed.match.meaning } : null;
  const reply = matched
    ? `Got it — ${parsed.term} is ${matched.label} (${matched.meaning}). I'll read it that way on every ${parsed.term} snap.`
    : `Got it — ${parsed.term}: ${parsed.meaning}. I don't have that in standard football language, so I'll use your words for it.`;
  return {
    term: parsed.term,
    meaning: parsed.meaning,
    kind: (kind ?? parsed.kind) as TermKind,
    knowledgeId: parsed.knowledgeId,
    matched,
    reply,
  };
}

// "Dallas is Snag", "Utah means trips with the TE on", "Deuce = 2x2 with a TE"
const TEACH_TERM = /^\s*["“]?([A-Za-z][\w'-]*(?:\s+[A-Za-z][\w'-]*)?)["”]?\s*(?:is|means|=|stands for)\s+(.{2,140}?)\s*[.!]?\s*$/i;
// Words that make "X is Y" a normal sentence, not a definition.
const NOT_A_TERM = /^(?:the|their|they|he|she|it|we|our|this|that|there|what|who|when|where|why|how|my|his|her|a|an)\b/i;
// "What does Utah mean?" / "what is deuce stack" — at most two words, and it
// has to read like a definition question so real football questions fall through.
const ASK_TERM = /^\s*what(?:'s| is| does|'re| are)?\s+(?:the\s+)?(?:term\s+)?["“]?([A-Za-z][\w'-]*(?:\s+[A-Za-z][\w'-]*)?)["”]?\s+(?:mean|means|stands? for)\s*\??\s*$/i;


// ---- the coach's ten questions (Q41) ---------------------------------------
//
// Ten things a coordinator actually asks on a Tuesday. Each one is answered off
// counted snaps, his saved defense and the plan on file — direct, the why in one
// clause, and a "go deeper" body underneath when he wants the numbers. Where the
// local engine genuinely can't know something (what THEY know about US), it says
// so in one line and answers the part it can.

export const COACH_QUESTIONS: string[] = [
  "What do they do well, and how can we take that away?",
  "What tendencies are they giving away, and how do we take advantage?",
  "What will their game plan be against our defense?",
  "Which version of our defense gives us the best matchup?",
  "What are their best plays, and what formations do they run them from?",
  "What gives us the best indication of what play is coming?",
  "What drives their play-calling the most?",
  "Where are we most vulnerable, and which of our calls answer it?",
  "Who are their most important players, and how do we limit them?",
  "What would you emphasize this week, and why?",
];

type Deep = { answer: string; deeper?: string };

/** The commonest tag among a set of snaps. */
const commonest = (rows: Play[], pick: (p: Play) => string): { name: string; n: number } | null => {
  const m = new Map<string, number>();
  for (const p of rows) {
    const v = normTag(pick(p));
    if (v) m.set(v, (m.get(v) ?? 0) + 1);
  }
  const best = [...m.entries()].sort((a, b) => b[1] - a[1])[0];
  return best ? { name: best[0], n: best[1] } : null;
};

const evidenceLine = (t: Tell) =>
  `${t.condition} → ${t.outcome}: ${t.hits} of ${t.n}, ${pctOf(t.rate)} vs ${pctOf(t.baseline)} normal (${Math.round(t.lift * 100)} pts).`;

const ROUTES: { id: string; re: RegExp }[] = [
  { id: "plays", re: /\bbest plays?\b|\btop plays?\b|favorite plays?|go-?to plays?/ },
  { id: "indicator", re: /best indication|indicat(?:e|es|or|ion)|what (?:tips|gives) (?:it|them)|tip (?:us )?off|predict|pre-?snap key/ },
  { id: "drivers", re: /drives? (?:their|the) play.?call|play.?call(?:ing)?\b|what drives them/ },
  { id: "theirplan", re: /(?:their|they) (?:game ?plan|plan)\b|plan (?:will be )?(?:against|vs\.?) (?:us|our)|wrinkle/ },
  { id: "ourdefense", re: /which version|best matchup|version of our defense|compare our|our (?:coverages?|fronts?|pressures?)/ },
  { id: "vulnerable", re: /vulnerab|where (?:are|do) we (?:weak|hurt|struggle)|hurt us|attack us|stress(?:es)? us/ },
  { id: "players", re: /(?:most )?important players?|key players?|best players?|who (?:are|is) their|limit (?:him|them)|playmaker/ },
  { id: "emphasis", re: /emphasi[sz]e|focus on this week|priorit(?:y|ies) this week|building the (?:defensive )?game plan with me/ },
  { id: "welldo", re: /(?:do|does) (?:they|them) (?:do )?(?:well|good)|what are they good at|their strength|take (?:that|it|them) away|what do they do best/ },
  { id: "giveaway", re: /giv(?:e|es|ing) (?:us )?away|giveaways?|tendenc(?:y|ies).{0,20}(?:giv|advantage)|\btells?\b|take advantage/ },
];

const routeOf = (q: string): string | null => ROUTES.find((r) => r.re.test(q))?.id ?? null;

/**
 * One question in, one coach's answer out. Returns null when the question isn't
 * one of these — the older keyword routes still own those.
 */
async function coachAsk(question: string, o: Opponent, ctx: ChatContext | SchemeContext): Promise<Deep | null> {
  const id = routeOf(lc(question));
  if (!id) return null;
  const plays = o.plays ?? [];
  const thin = plays.length < 5;
  const termMap = ctx.termMap ?? [];
  const kit = makeKit(ctx.concepts);
  const r = tendencyReport(plays);
  const resolve = makeResolver(termMap);
  const s = r.summary;
  const runRate = s.plays ? s.runs / s.plays : null;
  const noSnaps = `${o.name} has ${plays.length} tagged snap${plays.length === 1 ? "" : "s"} on file — upload the Hudl play-by-play on Opponent Matchup and I'll answer this off the film.`;
  const tells = r.actionable.length ? r.actionable : r.tells;
  const answerText = (t: Tell) =>
    answerFor({ condition: t.condition, outcome: t.outcome, outcomeKind: t.outcomeKind, tags: t.tags, termMap }, kit).text;
  const savedPlan = (ctx as ChatContext).plan;

  // 1. What do they do well, and how do we take it away?
  if (id === "welldo") {
    if (thin) return { answer: noSnaps };
    const best = r.best.bySuccess.filter((p) => p.n >= 3).slice(0, 2);
    const forms = r.personnel.flatMap((g) => g.formations).sort((a, b) => b.n - a.n);
    const topForm = forms[0];
    const bits: string[] = [];
    if (runRate != null)
      bits.push(`They're a ${pctOf(runRate)} run team${runRate >= 0.55 ? " and they want to stay that way" : runRate <= 0.45 ? " — they throw to stay ahead of the sticks" : ""}.`);
    if (best.length) {
      const p = best[0];
      const ans = answerFor({ condition: topForm?.name ?? "", outcome: p.name, outcomeKind: "play", termMap }, kit);
      bits.push(`What actually works is ${p.name}: ${p.n} snaps, ${one(p.avgGain)} a pop${p.explosive ? `, ${p.explosive} explosive` : ""}. ${ans.text}`);
    } else if (topForm) {
      bits.push(`No play tags to rank, so the read is the look: ${topForm.name} on ${topForm.n} snaps, ${pctOf(topForm.runRate ?? 0)} run.`);
    }
    if (topForm) bits.push(`It comes out of ${topForm.name} more than anything else — set the front to it before they're set instead of checking late.`);
    return {
      answer: bits.join(" "),
      deeper: [
        `Whole sample: ${s.plays} counted snaps, ${s.runs} run / ${s.passes} pass, ${one(s.avgGain)} yds a snap, ${s.explosive} explosive, ${pctOf(s.successRate ?? 0)} success.`,
        ...best.map((p) => `${p.name} — ${p.n} snaps, ${one(p.avgGain)} avg, ${p.explosive} explosive, ${pctOf(p.successRate ?? 0)} success${p.topDirection ? `, mostly ${p.topDirection.toLowerCase()}` : ""}.`),
        ...forms.slice(0, 4).map((f) => `${f.name} — ${f.n} snaps, ${pctOf(f.runRate ?? 0)} run${f.topPlay ? `, top play ${f.topPlay.name}` : ""}.`),
      ].join("\n"),
    };
  }

  // 2. What are they giving away, and how do we use it?
  if (id === "giveaway") {
    if (thin) return { answer: noSnaps };
    const top = tells.slice(0, 3);
    if (!top.length)
      return { answer: `Nothing on this film clears the bar — no look repeats often enough with a big enough swing to key on. ${plays.length} snaps is a thin sample for tells; more film or more tagging fixes that, not a guess.` };
    const lines = top.map(
      (t) => `${tellSentence(t, resolve)} — ${answerText(t)} ${lockable(t.n, t.lift) ? "Strong enough to lock in." : "An option with evidence, not strong enough to lock in."}`,
    );
    const combo = bestCombo(r.tells);
    return {
      answer: `${top.length} worth using. ${lines.join(" ")}`,
      deeper: [...top.map(evidenceLine), combo ? `Best combination — ${evidenceLine(combo)}` : ""].filter(Boolean).join("\n"),
    };
  }

  // 3. What will their plan against us be? — an inference, said out loud.
  if (id === "theirplan") {
    const findings = computeFindings(ctx).findings;
    const soft = findings.filter((f) => f.status === "Potential Conflict" || f.status === "Needs Review").slice(0, 3);
    const lead = r.best.byFrequency.filter((p) => p.n >= 3).slice(0, 2);
    const bits = ["This is an inference, not counted data — I can read their film, I can't read what they know about us."];
    if (thin) bits.push(noSnaps);
    else {
      if (runRate != null)
        bits.push(`They'll try to establish what they always establish: ${runRate >= 0.5 ? "the run" : "the quick game"} at ${pctOf(runRate)}${lead[0] ? `, starting with ${lead[0].name} (${lead[0].n} snaps)` : ""}.`);
      if (tells[0]) bits.push(`They attack where they've made money — ${tellSentence(tells[0], resolve)}.`);
    }
    if (soft.length) bits.push(`What they'd find on us: ${soft.map((f) => f.check).join("; ")} — that's where a coordinator aims.`);
    bits.push("New wrinkles I can't predict; nobody can off old film.");
    return {
      answer: `${bits.join(" ")} What have you put on tape that a coordinator would copy?`,
      deeper: [
        ...lead.map((p) => `${p.name} — ${p.n} snaps, ${one(p.avgGain)} avg.`),
        ...tells.slice(0, 3).map(evidenceLine),
        ...soft.map((f) => `${f.check}: ${f.detail}`),
      ].join("\n"),
    };
  }

  // 4. Which version of our defense fits this offense?
  if (id === "ourdefense") {
    if (!kit.all.length)
      return { answer: "Nothing is saved and confirmed in My Scheme yet, so there's no version of our defense to compare. Teach me the base front and coverage and this answer writes itself." };
    const families = new Map<string, number>();
    for (const p of plays) {
      const read = readConcept(p.play, termMap);
      if (read.family) families.set(read.family, (families.get(read.family) ?? 0) + 1);
    }
    const ranked = [...families.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
    const bits: string[] = [];
    if (runRate != null)
      bits.push(`${pctOf(runRate)} run / ${pctOf(1 - runRate)} pass, so the version that fits starts with ${runRate >= 0.55 ? "the front" : "the coverage"}.`);
    for (const [family, n] of ranked) {
      const sample = plays.find((p) => readConcept(p.play, termMap).family === family);
      const ans = answerFor({ condition: family, outcome: normTag(sample?.play ?? family), outcomeKind: "play", termMap }, kit);
      bits.push(`vs their ${family.toLowerCase()} game (${n} snaps): ${ans.text}${ans.educational ? " Not in your system — educational only." : ""}`);
    }
    if (!ranked.length && kit.baseFront)
      bits.push(`Play tags are too thin to split their concepts, so the honest answer is your base: ${callName(kit.baseFront)}${kit.baseCoverage ? ` with ${callName(kit.baseCoverage)}` : ""} — align right and tackle.`);
    const prs = kit.pressures.find((p) => p.group === "3rd Down Calls") ?? kit.pressures[0];
    const thirdPass = r.situations.find((x) => x.situation.group === "3rd/4th" && x.n >= 5 && (x.runRate ?? 1) < 0.4);
    if (prs && thirdPass)
      bits.push(`On the money down (${thirdPass.situation.group} & ${thirdPass.situation.range}, ${pctOf(1 - (thirdPass.runRate ?? 0))} pass) ${callName(prs)} is the pressure that fits — the protection has to find the fifth rusher.`);
    return {
      answer: `${bits.join(" ")} Which of those can your eleven execute at full speed Friday?`,
      deeper: [
        `Your menu: ${kit.fronts.length} fronts, ${kit.coverages.length} coverages, ${kit.pressures.length} pressures, ${kit.adjustments.length} checks.`,
        ...ranked.map(([f, n]) => `${f}: ${n} snaps.`),
        ...r.situations.filter((x) => x.n >= 5).map((x) => `${x.situation.group} & ${x.situation.range}: ${x.n} snaps, ${pctOf(x.runRate ?? 0)} run.`),
      ].join("\n"),
    };
  }

  // 5. Best plays + where they come from.
  if (id === "plays") {
    if (thin) return { answer: noSnaps };
    const rows = r.best.byFrequency.filter((p) => p.n >= 2).slice(0, 4);
    const forms = r.personnel.flatMap((g) => g.formations).sort((a, b) => b.n - a.n);
    if (!rows.length)
      return {
        answer: `Offensive Play is tagged on ${plays.filter((p) => p.play.trim()).length} of ${plays.length} snaps, so I can't rank their plays honestly. Tag Offensive Play in Hudl and this gets sharp. What I can say: they live in ${forms.slice(0, 3).map((f) => `${f.name} (${f.n})`).join(", ")}.`,
      };
    const lines = rows.map((p) => {
      const rowsFor = plays.filter((x) => p.playIds.includes(x.id));
      const form = commonest(rowsFor, (x) => x.formation);
      const pers = commonest(rowsFor, (x) => x.personnel);
      const back = commonest(rowsFor, (x) => x.backfield);
      const where = [pers ? `${pers.name} personnel` : null, form ? `${form.name} (${form.n} of ${p.n})` : null, back ? `${back.name} backfield` : null]
        .filter(Boolean)
        .join(", ");
      return `${p.name} — ${p.n} snaps, ${one(p.avgGain)} a pop${p.explosive ? `, ${p.explosive} explosive` : ""}${where ? `, out of ${where}` : ", nothing tagged on where it comes from"}.`;
    });
    const dangerous = r.best.bySuccess[0];
    return {
      answer: `${lines.join(" ")}${dangerous && dangerous.name !== rows[0].name ? ` Their most dangerous isn't their most-called: ${dangerous.name}, ${one(dangerous.avgGain)} a snap on ${dangerous.n}.` : ""}`,
      deeper: r.best.byFrequency
        .slice(0, 8)
        .map((p) => `${p.name} (${p.type}) — ${p.n} snaps, ${one(p.avgGain)} avg, ${p.explosive} explosive, ${pctOf(p.successRate ?? 0)} success${p.topDirection ? `, ${p.topDirection.toLowerCase()}` : ""}.`)
        .join("\n"),
    };
  }

  // 6 + 7. What indicates the play / what drives their calls — rank the families.
  if (id === "indicator" || id === "drivers") {
    if (thin) return { answer: noSnaps };
    const power = tagFamilyPower(plays, r.tells);
    const untagged = power.filter((f) => f.tagged === 0);
    const useful = power.filter((f) => f.tagged > 0 && f.best);
    const combo = bestCombo(r.tells);
    if (!useful.length)
      return {
        answer: `Nothing separates itself — no single tag moves their run/pass or their play call far enough off normal to key on.${untagged.length ? ` ${untagged.map((f) => f.label).join(", ")} aren't tagged at all.` : ""} Tag more film and ask me again.`,
        deeper: power.map((f) => `${f.label}: ${f.tagged} snaps tagged, best lift ${f.best ? `${Math.round(f.best.lift * 100)} pts` : "none"}.`).join("\n"),
      };
    const ranked = useful.slice(0, 3).map((f, i) => {
      const t = f.best!;
      const why = id === "drivers"
        ? `drives ${t.outcomeKind === "runpass" ? "run or pass" : t.outcomeKind === "direction" ? "which way it goes" : "which play"}`
        : `points at ${t.outcome}`;
      return `${i + 1}. ${f.label} (${f.tagged} snaps tagged) — ${why}: ${tellSentence(t, resolve)}.`;
    });
    const head = id === "drivers"
      ? `${useful[0].label} drives it more than anything else.`
      : `${useful[0].label} is your best pre-snap key.`;
    const parentLift = combo
      ? Math.max(...combo.tags.map((tg) => power.find((f) => f.field === tg.field)?.best?.lift ?? 0))
      : 0;
    const comboLine = combo
      ? `Combinations beat single tags: ${tellSentence(combo, resolve)} — ${Math.round((combo.lift - parentLift) * 100)} points better than the best tag in it on its own.`
      : "No two-tag combination beat its own single tags here, so keep the key simple.";
    const missing = untagged.length
      ? ` ${untagged.map((f) => f.label).join(" and ")} ${untagged.length === 1 ? "isn't" : "aren't"} tagged on this export, so ${untagged.length === 1 ? "it's" : "they're"} not in the ranking.`
      : "";
    return {
      answer: `${head} ${ranked.join(" ")} ${comboLine}${missing}`,
      deeper: [
        ...power.map((f) => `${f.label}: ${f.tagged} snaps tagged${f.best ? `, best ${evidenceLine(f.best)}` : ", no tell clears the bar"}`),
        combo ? `Best combination — ${evidenceLine(combo)}` : "",
      ].filter(Boolean).join("\n"),
    };
  }

  // 8. Where are we vulnerable, and what answers it?
  if (id === "vulnerable") {
    const findings = computeFindings(ctx).findings;
    const plan = savedPlan?.generatedAt ? savedPlan : { ...(await gamePlan(o, ctx, findings)), opponentId: o.id };
    const concerns = (plan.concerns ?? []).slice(0, 3);
    const conflicts = findings.filter((f) => f.status === "Potential Conflict").slice(0, 2);
    const bits: string[] = [];
    if (concerns.length) bits.push(concerns.map((c) => `${c.text}${c.sub ? ` — ${c.sub}` : ""}`).join(" "));
    if (conflicts.length) bits.push(`In our own defense: ${conflicts.map((f) => `${f.check} — ${f.detail}`).join(" ")}`);
    if (!bits.length)
      bits.push(`Nothing in their film beats a rule you've already written and the analysis has no open conflicts${thin ? `, though ${plays.length} snaps is a thin file to say that off` : ""}.`);
    const covered = tells
      .filter((t) => !answerFor({ condition: t.condition, outcome: t.outcome, outcomeKind: t.outcomeKind, tags: t.tags, termMap }, kit).practice)
      .slice(0, 2);
    if (covered.length) bits.push(`What we already answer: ${covered.map((t) => `${t.condition} → ${answerText(t)}`).join(" ")}`);
    return {
      answer: bits.join(" "),
      deeper: [
        ...concerns.map((c) => `${c.text}${c.evidence ? ` (${c.evidence.n} snaps at ${pctOf(c.evidence.rate)})` : ""}`),
        ...findings.filter((f) => f.status !== "Sound").map((f) => `${f.check}: ${f.detail}`),
      ].join("\n"),
    };
  }

  // 9. Their most important players.
  if (id === "players") {
    const usage = r.players;
    const named = o.keyPlayers.filter((k) => k.name.trim());
    if (!usage.length && !named.length)
      return {
        answer: `Nobody is tagged by jersey on these ${plays.length} snaps and there are no key players on file, so I can't name them — tag the ball carrier in Hudl, or just tell me here ("#22 Johnson is their back, one-cut zone runner"). What I can say is where the ball goes: ${r.best.byFrequency.slice(0, 2).map((p) => `${p.name} (${p.n} snaps)`).join(", ") || "no play tags either, so nothing"}.`,
      };
    const lines: string[] = [];
    for (const p of usage.slice(0, 3)) {
      const match = named.find((k) => k.jersey && normTag(k.jersey) === normTag(p.player));
      const who = match ? `#${match.jersey} ${match.name}${match.pos ? ` (${match.pos})` : ""}` : `#${p.player}`;
      const ans = answerFor({ condition: p.topFormation?.name ?? "", outcome: p.runs >= p.passes ? "Run" : "Pass", outcomeKind: "runpass", termMap }, kit);
      lines.push(
        `${who} — ${p.touches} touches, ${pctOf(p.share)} of the ball, ${one(p.avgGain)} a touch${p.tds ? `, ${p.tds} TD` : ""}; most of it from ${p.topFormation?.name ?? "their base look"}${p.topSituation ? ` on ${p.topSituation.name}` : ""}. ${ans.text}`,
      );
    }
    for (const k of named.slice(0, 3)) {
      if (usage.some((u) => k.jersey && normTag(k.jersey) === normTag(u.player))) continue;
      lines.push(`${k.jersey ? `#${k.jersey} ` : ""}${k.name}${k.pos ? ` (${k.pos})` : ""} — ${k.notes?.trim() || "your note, no snap tags behind it"}. ${bracketLine(kit)}`);
    }
    if (!usage.length)
      lines.push(`That's your film, not the tagging — nobody is tagged by jersey on these ${plays.length} snaps, so I can't say how many touches he actually gets. Tag the ball carrier in Hudl and I'll count it.`);
    return {
      answer: lines.join(" "),
      deeper: usage
        .slice(0, 5)
        .map((p) => `#${p.player}: ${p.touches} touches, ${p.runs} run / ${p.passes} pass, ${one(p.avgGain)} avg, ${p.explosive} explosive, ${pctOf(p.successRate ?? 0)} success.`)
        .join("\n"),
    };
  }

  // 10. What to emphasize this week.
  if (id === "emphasis") {
    const findings = computeFindings(ctx).findings;
    const plan = savedPlan?.generatedAt ? savedPlan : { ...(await gamePlan(o, ctx, findings)), opponentId: o.id };
    const pri = (plan.priorities ?? []).slice(0, 3);
    const emp = (plan.emphasis ?? []).slice(0, 3);
    const load = callLoad(ctx.concepts);
    const bits: string[] = [];
    if (pri.length) bits.push(`Priorities: ${pri.map((p) => p.text).join("; ")}.`);
    if (emp.length) bits.push(`On the grass: ${emp.map((e) => e.text).join("; ")}.`);
    if (!bits.length) bits.push(thin ? noSnaps : "Nothing counted is worth prioritizing yet — generate the game plan and I'll have something to stand on.");
    if (load.over) bits.push(masteryNote(load));
    return {
      answer: `${bits.join(" ")} Which of those can your kids not do right now?`,
      deeper: [
        ...(plan.priorities ?? []).map((p) => `${p.text}${p.sub ? ` — ${p.sub}` : ""}`),
        ...(plan.emphasis ?? []).map((e) => `${e.text}${e.sub ? ` — ${e.sub}` : ""}`),
      ].join("\n"),
    };
  }

  return null;
}

// ---- Ask CounterScheme -----------------------------------------------------
async function ask(question: string, o: Opponent, ctx: SchemeContext): Promise<MatchupAnswer> {
  const q = lc(question);
  const termMap = ctx.termMap ?? [];

  // "What does Utah mean?" — answer from the coach's dictionary, then football.
  const asked = question.match(ASK_TERM);
  if (asked && !NOT_A_TERM.test(asked[1])) {
    const raw = asked[1];
    const seen = o.plays.filter((p) => [p.formation, p.play, p.backfield, p.motion].some((v) => normalizeTerm(v).split(" ").includes(normalizeTerm(raw)) || normalizeTerm(v) === normalizeTerm(raw))).length;
    const r = resolveTag(raw, termMap);
    const where = seen ? ` It's on ${seen} of their snaps.` : "";
    if (r.source !== "unknown") {
      return { answer: `${r.term} — ${r.meaning}${r.source === "coach" ? " (your words)" : ""}.${where}`, grounded: true };
    }
    return {
      answer: `I don't know what ${normalizeTerm(raw)} means yet.${where} Tell me in one line — “${normalizeTerm(raw)} is Trips with the TE on” — and I'll remember it for this team.`,
      grounded: false,
    };
  }

  // "Dallas is Snag" — the coach teaching us a word, not asking a question.
  const teaching = question.match(TEACH_TERM);
  if (teaching && !/\?/.test(question) && !NOT_A_TERM.test(teaching[1])) {
    const term = normalizeTerm(teaching[1]);
    const has = (pick: (p: (typeof o.plays)[number]) => string) =>
      o.plays.some((p) => normalizeTerm(pick(p)).split(" ").includes(term));
    const onFilm = has((p) => p.formation) || has((p) => p.play) || has((p) => p.backfield) || has((p) => p.motion);
    // Only treat it as a definition when it's a word off their film or the
    // answer is real football — otherwise it's just a sentence, answer normally.
    if (onFilm || matchTerm(teaching[2])) {
      const kindHint: TermKind | undefined = has((p) => p.formation)
        ? "formation"
        : has((p) => p.backfield)
          ? "backfield"
          : onFilm
            ? "concept"
            : undefined;
      const res = await resolveTerm(term, teaching[2], kindHint);
      return { answer: res.reply, grounded: true, termMapping: res };
    }
  }
  // The coach's ten questions (Q41) own their phrasing before the older
  // keyword routes get a look.
  const routed = await coachAsk(question, o, ctx);
  if (routed) return { answer: routed.answer, deeper: routed.deeper, grounded: true };

  const none = (where: string): MatchupAnswer => ({
    answer: `I don't have that in the scouting data for ${o.name} yet. Add it under ${where} and ask again.`,
    grounded: false,
  });
  const grid = o.downDistance;
  if (/red ?zone|inside the (10|20|5)|goal ?line/.test(q)) {
    const notes = o.matchupNotes.filter((n) => /red zone|2-point|two point/i.test(n.label)).map((n) => `${n.label}: ${n.value}`);
    return o.redZone || notes.length
      ? { answer: [o.redZone, ...notes].filter(Boolean).join(" "), grounded: true }
      : none("Red Zone");
  }
  const downMatch = q.match(/(1st|2nd|3rd|4th|first|second|third|fourth)\s*(?:down|&|and)?/);
  if (downMatch) {
    const key = ({ first: "1st", second: "2nd", third: "3rd", fourth: "4th" } as Record<string, string>)[downMatch[1]] ?? downMatch[1];
    const row = grid[key as (typeof DOWNS)[number]];
    const cells = DISTANCES.map((d) => (row[d] != null ? `${d}: ${row[d]}% run / ${100 - row[d]!}% pass` : null)).filter(Boolean);
    if (cells.length) {
      const hint = key === "3rd" && row["Long (7+)"] != null && row["Long (7+)"]! < 40 ? " On 3rd & long they throw — that's your pressure down." : "";
      return { answer: `On ${key} down — ${cells.join("; ")}.${hint}`, grounded: true };
    }
    return none("Down & Distance");
  }
  if (/personnel|formation|line up|sets?\b/.test(q)) {
    const pu = [...o.personnelUsage].filter((p) => p.pct != null).sort((a, b) => b.pct! - a.pct!);
    const fm = [...o.formations].filter((f) => f.name).sort((a, b) => (b.snapsPct ?? 0) - (a.snapsPct ?? 0));
    if (!pu.length && !fm.length) return none("Formation Usage / Formations");
    return {
      answer: [
        pu.length ? `Personnel: ${pu.slice(0, 3).map((p) => `${p.group} ${p.pct}%`).join(", ")}.` : null,
        fm.length ? `Formations: ${fm.slice(0, 3).map((f) => `${f.name}${f.snapsPct != null ? ` ${f.snapsPct}%` : ""}${f.runPct != null ? ` (${f.runPct}% run)` : ""}`).join(", ")}.` : null,
      ].filter(Boolean).join(" "),
      grounded: true,
    };
  }
  if (/run|pass|rpo|tendenc|most/.test(q)) {
    const bits = [
      o.runRate != null ? `${o.runRate}% run overall (${100 - o.runRate}% pass)` : null,
      o.firstDownRun != null ? `${o.firstDownRun}% run on 1st down` : null,
      o.rpoRate != null ? `${o.rpoRate}% RPO rate` : null,
      o.signatureConcept && o.signatureRate != null ? `${o.signatureRate}% of plays are ${o.signatureConcept}` : null,
    ].filter(Boolean);
    const top = [...o.concepts].filter((c) => c.name).sort((a, b) => (b.freq ?? 0) - (a.freq ?? 0)).slice(0, 3);
    if (!bits.length && !top.length) return none("Offensive Tendencies");
    return { answer: `${bits.join(", ")}.${top.length ? ` Top concepts: ${top.map((c) => `${c.name} (${c.type}${c.freq != null ? `, ${c.freq}×` : ""})`).join(", ")}.` : ""}`, grounded: true };
  }
  const kp = o.keyPlayers.find((k) => k.name && (q.includes(lc(k.name)) || (k.jersey && q.includes(`#${k.jersey}`)) || (k.pos && new RegExp(`\\b${lc(k.pos)}\\b`).test(q))));
  if (kp || /player|who|qb|quarterback|back|receiver/.test(q)) {
    if (!o.keyPlayers.length) return none("Key Players");
    const list = (kp ? [kp] : o.keyPlayers).map((k) => `#${k.jersey ?? "?"} ${k.name} (${k.pos ?? "—"}${k.height ? `, ${k.height}` : ""}${k.weight ? ` ${k.weight}` : ""}${k.cls ? `, ${k.cls}` : ""})${k.notes ? ` — ${k.notes}` : ""}`);
    return { answer: list.join(" · "), grounded: true };
  }
  if (/weak|attack|stress|recommend|adjust|what should/.test(q)) {
    const plan = await gamePlan(o, ctx, computeFindings(ctx).findings);
    return {
      answer: `Priorities: ${plan.priorities.map((p) => p.text).join("; ")}. Adjustments: ${plan.adjustments.map((a) => a.text).join("; ")}.`,
      grounded: true,
    };
  }
  if (/pressure|blitz/.test(q)) {
    const n = o.matchupNotes.find((x) => /pressure|blitz/i.test(`${x.label} ${x.value}`));
    return n ? { answer: `${n.label}: ${n.value}`, grounded: true } : none("Matchup Notes (how they handle pressure)");
  }
  return {
    answer: `I can answer from the scouting data about run/pass tendencies, any down, personnel and formations, concepts, key players, and the red zone. Try “What do they run on 3rd down?”`,
    grounded: false,
  };
}

// ---- practice emphasis + scout cards (Q5) -----------------------------------

/**
 * The pool is pure arithmetic over the snaps, so the engine just delegates. The
 * contract exists so a real model can later rewrite the "why it matters" lines
 * in the coach's voice while the ranking stays in code.
 */
async function practicePool(o: Opponent, ctx: SchemeContext, plan?: GamePlan): Promise<PracticePool> {
  return buildPracticePool({ opponent: o, concepts: ctx.concepts, termMap: ctx.termMap ?? [], plan });
}

// ---- one CounterScheme conversation (Q26, Q29, Q2, Q31) ---------------------
//
// Every box in the app — Teach on My Scheme, Ask on Opponent Matchup, the phone
// — sends its sentence here. This router decides what the coach actually did:
// taught us a rule, taught us a word, asked about the opponent, asked why a
// plan item is the answer, or asked what we're repping. The reply is direct,
// says the reasoning, and only asks a question when the answer depends on it.

type Action = NonNullable<ChatReply["reply"]["actions"]>[number];

/** Q50, in his words — only ever shown under "Go deeper". */
const PRINCIPLE_LIST = PRINCIPLES.map((p) => `${p.short}: ${p.line}`).join("\n");

const planLink = (ctx: ChatContext): Action | null =>
  ctx.opponent ? { label: "Open Game Plan", href: `/gameplan?id=${ctx.opponent.id}` } : null;
const matchupLink = (ctx: ChatContext): Action | null =>
  ctx.opponent ? { label: `Open ${ctx.opponent.name}`, href: `/matchup?id=${ctx.opponent.id}` } : null;
const acts = (...list: (Action | null | undefined)[]) => {
  const out = list.filter(Boolean) as Action[];
  return out.length ? out : undefined;
};

const reply = (
  text: string,
  ctx: ChatContext,
  extra: { actions?: Action[]; conceptIds?: string[]; playIds?: string[]; deeper?: string } = {},
): ChatReply["reply"] => ({
  role: "counterscheme",
  text,
  actions: extra.actions,
  deeper: extra.deeper,
  context: {
    page: ctx.page,
    opponentId: ctx.opponent?.id,
    conceptIds: extra.conceptIds?.length ? extra.conceptIds : undefined,
    playIds: extra.playIds?.length ? extra.playIds.slice(0, 40) : undefined,
  },
});

const GREETING = /^(?:hey|hi|hello|yo|sup|what's up|whats up|good morning|good evening|morning|thanks|thank you|thx|ok|okay|got it)\b[\s.!,]*$/i;
const QUESTION_START = /^(?:what|who|when|where|why|which|how|do|does|did|is|are|can|could|should|would|will|tell me|show me|give me|any|got)\b/i;
const WHY = /\b(?:why|evidence|how do (?:you|we) know|what'?s the proof|prove it|says who|back that up|sample size)\b/i;
const PRACTICE_Q = /\b(?:rep|reps|repping|practice|script|scout (?:card|team|period)|walk ?through|monday|tuesday|wednesday|thursday)\b/i;
const TEACH_ME = /^(?:teach|add|save|file|remember)\b.*\b(?:rule|front|coverage|pressure|blitz|check|adjustment)\b/i;
// "Should we add another coverage?" — the question Q50 answers before the data does.
const ADD_Q = /\b(?:should|can|could|do) (?:we|i)\b[^?]{0,60}?\b(?:add|install|put in|carry|pick up|learn|bring in)\b|\bis it worth (?:adding|installing|carrying)\b|\badd (?:another|a new|more)\b/i;
// An idea he wants evaluated, not a fact he wants looked up (Q28).
const ADVICE = /\b(?:should we|should i|what should|how should|how do we|what do we do|would you|do you think|is it worth|any reason)\b/i;

/** The words in a plan item that make it that item, for "why is that?" matching. */
const CHAT_NOISE = new Set([
  "the", "a", "an", "and", "or", "to", "of", "on", "in", "for", "is", "are", "we", "our", "us", "it", "that", "this",
  "why", "what", "how", "do", "does", "with", "from", "at", "be", "vs", "against", "you", "your", "them", "their",
  "answer", "else", "could", "inside", "defense", "and", "not",
]);
const keyWords = (s: string) =>
  normalizeTerm(s).split(" ").filter((w) => w.length > 2 && !CHAT_NOISE.has(w));

const allPlanItems = (plan?: GamePlan): { section: string; item: PlanItem }[] =>
  plan
    ? ([
        ["Top priority", plan.priorities], ["Their best players", plan.bestPlayers], ["Tendency", plan.threats],
        ["Concern", plan.concerns], ["Adjustment", plan.adjustments], ["Practice emphasis", plan.emphasis],
      ] as const).flatMap(([section, rows]) => (rows ?? []).map((item) => ({ section, item })))
    : [];

/** The plan line the coach is asking about, if he named one. */
function findPlanItem(input: string, plan?: GamePlan) {
  const asked = keyWords(input);
  if (!asked.length) return null;
  let best: { section: string; item: PlanItem; score: number } | null = null;
  for (const { section, item } of allPlanItems(plan)) {
    const words = new Set(keyWords(`${item.text} ${item.sub ?? ""}`));
    if (!words.size) continue;
    const hits = asked.filter((w) => words.has(w)).length;
    const score = hits / Math.max(3, keyWords(item.text).length);
    if (hits >= 2 && (!best || score > best.score)) best = { section, item, score };
  }
  return best;
}

/** Answer first, then the numbers underneath it (Q29). */
function explainItem(found: { section: string; item: PlanItem }, ctx: ChatContext): ChatReply {
  const { item, section } = found;
  const e = item.evidence;
  const named = (item.conceptIds ?? [])
    .map((id) => ctx.concepts.find((c) => c.id === id))
    .filter(Boolean)
    .map((c) => callName(c as Concept));
  const bits = [`${section}: ${item.text}.`];
  if (item.sub) bits.push(item.sub);
  if (e) {
    const base = e.baseline != null ? ` Their baseline is ${pctOf(e.baseline)}, so that's ${Math.round((e.rate - e.baseline) * 100)} points above how they play the rest of the game.` : "";
    bits.push(`The evidence: ${e.summary} — ${e.n} snap${e.n === 1 ? "" : "s"} on film at ${pctOf(e.rate)}.${base}${e.n < 5 ? " That's a small sample, so treat it as a lead, not a rule." : ""}`);
  } else {
    bits.push("There's no counted evidence behind this one — it came off your notes and your saved defense, not the snap data.");
  }
  if (named.length) bits.push(`It calls for ${named.join(" and ")} — already in your system, so nothing new to install.`);
  else bits.push("Nothing in your saved calls is filed against it yet. Tell me the call you want and I'll write the rule.");
  return {
    reply: reply(bits.join(" "), ctx, {
      conceptIds: item.conceptIds,
      playIds: e?.playIds,
      deeper: e
        ? [
            e.summary,
            `${e.n} snaps at ${pctOf(e.rate)}${e.baseline != null ? ` against a ${pctOf(e.baseline)} baseline` : ""}.`,
            `${e.playIds.length} play${e.playIds.length === 1 ? "" : "s"} behind it — open the plan to see the rows.`,
          ].join("\n")
        : undefined,
      actions: acts(planLink(ctx), e ? { label: "See evidence", href: ctx.opponent ? `/gameplan?id=${ctx.opponent.id}` : "/gameplan" } : null),
    }),
    sideEffects: {},
  };
}

/** What we're actually repping this week — the same arithmetic the page uses. */
function practiceAnswer(ctx: ChatContext): ChatReply {
  const o = ctx.opponent;
  if (!o || (o.plays?.length ?? 0) < 5) {
    return {
      reply: reply(
        `I can't build a rep list yet — ${o ? `${o.name} has ${o?.plays?.length ?? 0} tagged snaps on file` : "there's no opponent on file"}. Upload the Hudl breakdown and the candidate pool builds itself.`,
        ctx,
        { actions: acts(matchupLink(ctx)) },
      ),
      sideEffects: {},
    };
  }
  const pool = buildPracticePool({ opponent: o, concepts: ctx.concepts, termMap: ctx.termMap ?? [], plan: ctx.plan });
  const sel = pruneSelection(ctx.practiceSelection ?? emptySelection(), pool);
  const chosen = selectedReps(pool, sel);
  const sum = poolSummary(pool, sel);
  const script = buildScript(pool, sel);
  const byId = new Map(pool.reps.map((r) => [r.id, r]));
  const line = (r: PracticeRep) => `${[r.personnel, r.formation, r.play].filter(Boolean).join(" ")}${r.situation ? ` (${r.situation})` : ""}`;
  const mon = (script.find((d) => d.day === "Mon")?.repIds ?? []).map((id) => byId.get(id)).filter(Boolean) as PracticeRep[];
  const gaps = chosen.filter((r) => !r.hasAnswer);
  const bits = [
    `${sum.chosen} rep${sum.chosen === 1 ? "" : "s"} in the script out of ${sum.total} candidates off ${pool.snaps} tagged snaps.`,
    mon.length ? `Monday teaches ${mon.slice(0, 3).map(line).join("; ")}${mon.length > 3 ? `, plus ${mon.length - 3} more` : ""}.` : "",
    gaps.length
      ? `${gaps.length} of them have no stored answer — ${gaps.slice(0, 2).map(line).join("; ")}. Decide those calls Monday so Wednesday can be game-like.`
      : "Every rep in there has a call on file behind it.",
    sum.overCap ? `That's over ${pool.cap.high} — cut it down or the players get volume instead of mastery.` : "",
  ].filter(Boolean);
  return {
    reply: reply(bits.join(" "), ctx, {
      actions: acts({ label: "Open practice script", href: "/practice" }, planLink(ctx)),
    }),
    sideEffects: {},
  };
}

/** Greetings, "teach a rule", and anything we genuinely can't place (Q31). */
function capabilities(ctx: ChatContext, lead: string): ChatReply {
  const o = ctx.opponent;
  const where = o ? `${o.name}${(o.plays?.length ?? 0) ? ` (${o.plays.length} tagged snaps)` : ""}` : "no opponent on file yet";
  return {
    reply: reply(
      `${lead} I've got your ${ctx.scheme.structureName} and ${ctx.concepts.filter((c) => c.confirmed).length} saved calls, and this week is ${where}. Four things I'm good for: teach me a rule ("Against 12 personnel we check to Over"), ask about the opponent ("What do they run on 3rd down?"), ask why a plan item is the answer, or ask what we're repping this week.`,
      ctx,
      { actions: acts(matchupLink(ctx), planLink(ctx)) },
    ),
    sideEffects: {},
  };
}

async function chat(input: string, ctx: ChatContext): Promise<ChatReply> {
  const text = input.trim();
  if (!text) return capabilities(ctx, "Say the word.");
  const isQuestion = /\?/.test(text) || QUESTION_START.test(text);

  // 1. Hello / thanks — short, then say what I'm for.
  if (GREETING.test(text)) return capabilities(ctx, "Ready.");
  if (TEACH_ME.test(text) && text.split(/\s+/).length <= 5) {
    return {
      reply: reply(
        `Say it the way you'd say it to a player: “when ___, we ___.” Example: “Against Trips we check to Solo.” I'll file the trigger, the action and the result, and any front or coverage in it that you don't already carry.`,
        ctx,
        { actions: acts({ label: "Open My Scheme", href: "/scheme" }) },
      ),
      sideEffects: {},
    };
  }

  // 2. "What does Utah mean?" and "Dallas is Snag" — the terminology routes
  // already live in Ask, and they work with or without an opponent on file.
  const asked = text.match(ASK_TERM);
  const teaching = text.match(TEACH_TERM);
  if ((asked && !NOT_A_TERM.test(asked[1])) || (teaching && !isQuestion && !NOT_A_TERM.test(teaching[1]))) {
    if (ctx.opponent) {
      const a = await ask(text, ctx.opponent, ctx);
      if (a.termMapping || asked) {
        return {
          reply: reply(a.answer, ctx, { actions: acts({ label: "Open Terminology", href: "/scheme/terminology" }) }),
          sideEffects: a.termMapping ? { termMapping: a.termMapping } : {},
        };
      }
    } else if (teaching) {
      const res = await resolveTerm(normalizeTerm(teaching[1]), teaching[2]);
      return {
        reply: reply(res.reply, ctx, { actions: acts({ label: "Open Terminology", href: "/scheme/terminology" }) }),
        sideEffects: { termMapping: res },
      };
    }
  }

  // 3. "Should we add / install X?" — more football is the wrong default
  // (Q50). Answer with what we already carry and can't execute yet.
  if (ADD_Q.test(text)) {
    const load = callLoad(ctx.concepts);
    const what = text
      .replace(/^.*?\b(?:add|install|put in|carry|pick up|learn|bring in)\b\s*/i, "")
      .replace(/[?.!]+\s*$/, "")
      .trim();
    const top = (ctx.plan?.priorities ?? []).slice(0, 2).map((p) => p.text);
    const bits = [addAdvice(load, what.length > 2 && what.length < 60 ? what : undefined)];
    if (top.length) bits.push(`This week's plan says what matters is ${top.join("; ")} — if it doesn't serve one of those it costs reps.`);
    bits.push(principle("run"));
    return {
      reply: reply(`${bits.join(" ")} What are you willing to take off the menu to pay for it?`, ctx, {
        actions: acts({ label: "Open My Scheme", href: "/scheme" }, planLink(ctx)),
        deeper: [
          masteryNote(load),
          `On the menu now: ${load.active} live${load.backPocket ? `, ${load.backPocket} back pocket` : ""} out of a ${load.budget}-call in-season budget.`,
          PRINCIPLE_LIST,
        ].join("\n"),
      }),
      sideEffects: {},
    };
  }

  // 4. The coach's ten questions (Q41). They own their phrasing before the
  // "should we" route or the plan-item lookup gets a turn.
  if (ctx.opponent && isQuestion) {
    const routed = await coachAsk(text, ctx.opponent, ctx);
    if (routed) {
      return {
        reply: reply(routed.answer, ctx, {
          actions: acts(matchupLink(ctx), planLink(ctx)),
          deeper: routed.deeper,
        }),
        sideEffects: { question: { q: text, a: routed.answer, opponentId: ctx.opponent.id } },
      };
    }
  }

  // 5. "Why is that the answer?" about something in the plan (Q29).
  if (WHY.test(text)) {
    const found = findPlanItem(text, ctx.plan);
    if (found) return explainItem(found, ctx);
  }

  // 6. "What are we repping this week?"
  if (PRACTICE_Q.test(text) && isQuestion) return practiceAnswer(ctx);

  // 7. "Should we …?" — an idea he wants evaluated (Q28: collaborative). If the
  // plan already says something about it, say that; otherwise give him the
  // three things the plan says matter and let him push back.
  if (ADVICE.test(text) && ctx.plan) {
    const found = findPlanItem(text, ctx.plan);
    if (found) return explainItem(found, ctx);
    const top = (ctx.plan.priorities ?? []).slice(0, 3);
    if (top.length) {
      return {
        reply: reply(
          `Nothing in the plan speaks to that directly, so here's what it does say matters this week: ${top.map((p) => p.text).join("; ")}. If your idea serves one of those, it's worth a rep — tell me the call and I'll file the rule; if it doesn't, it costs practice time you don't have.`,
          ctx,
          { actions: acts(planLink(ctx)) },
        ),
        sideEffects: {},
      };
    }
  }

  // 8. A scheme sentence — the Teach parser owns it. Questions never come here.
  if (!isQuestion) {
    const res = await teach(text, ctx);
    if (res.concepts.length) {
      const named = res.concepts.map((c) => (c.kind === "adjustment" && c.trigger ? `${c.trigger} → ${c.result}` : c.name));
      return {
        reply: reply(
          `${res.summary.replace(" Confirm them in Recently Added.", "")} ${named.join("; ")}. It's sitting unconfirmed until you say it's right, and once you confirm it I'll use it in the game plan.`,
          ctx,
          { actions: acts({ label: "Confirm in Recently Added", href: "/scheme" }) },
        ),
        sideEffects: { concepts: res.concepts },
      };
    }
    // Nothing filed. If there's an opponent, it may still have been about them.
    if (!ctx.opponent) return capabilities(ctx, res.question ?? "I couldn't file that as a rule.");
  }

  // 9. Opponent questions.
  if (ctx.opponent) {
    const a = await ask(text, ctx.opponent, ctx);
    if (a.grounded || !ctx.plan) {
      return {
        reply: reply(a.answer, ctx, { actions: acts(matchupLink(ctx), planLink(ctx)), deeper: a.deeper }),
        sideEffects: a.termMapping
          ? { termMapping: a.termMapping }
          : a.grounded
            ? { question: { q: text, a: a.answer, opponentId: ctx.opponent.id } }
            : {},
      };
    }
    // Not in the scouting data — try the plan before giving up.
    const found = findPlanItem(text, ctx.plan);
    if (found) return explainItem(found, ctx);
    return { reply: reply(a.answer, ctx, { actions: acts(matchupLink(ctx), planLink(ctx)), deeper: a.deeper }), sideEffects: {} };
  }

  return capabilities(ctx, "I don't have an opponent on file to answer that against.");
}

export const localProvider: AiProvider = { name: "Local engine", teach, analyze, gamePlan, ask, resolveTerm, practicePool, chat };
