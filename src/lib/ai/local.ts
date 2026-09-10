// Local engine — heuristics and templates over the coach's saved data.
// No API key, runs in the browser. It is deliberately conservative: when a
// sentence can't be filed with confidence it asks instead of guessing.

import { COVERAGES } from "@/lib/coverages";
import { computeFindings, SITUATIONS, type Finding } from "@/lib/analyze";
import { DOWNS, DISTANCES, type Concept, type Opponent, type GamePlan, type PlanItem, type Play } from "@/lib/store";
import { matchTerm, parseTermAnswer, resolveTag, normalizeTerm, type TermKind } from "@/lib/knowledge";
import {
  tendencyReport, tellSentence, makeResolver, summarize, tag as normTag, type PlayerUsage, type Tell,
} from "@/lib/tendencies";
import {
  answerFor, callName, genItem, makeKit, readConcept, tellEvidence, type PlanAnswer, type PlanKit, type PlanSections,
} from "@/lib/plan";
import { buildPracticePool, type PracticePool } from "@/lib/practice";
import type { AiProvider, SchemeContext, TeachResult, MatchupAnswer, TermResolution } from "./types";

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
      genItem(`t-${t.id}`, tellSentence(t, resolve), `${ans.text}${ans.educational ? " Educational — not in your system, so don't call it Friday." : ""}`, {
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

  // -- top 3 priorities: the biggest things on the list, said plainly
  const priorities: PlanItem[] = [];
  if (bestPlayers[0]) priorities.push(genItem("pri-player", `Take away ${bestPlayers[0].text.split(" — ")[0]}`, bestPlayers[0].sub));
  for (const t of threats.slice(0, 3)) {
    if (priorities.length >= 3) break;
    priorities.push(genItem(`pri-${t.id}`, t.text, t.sub, { evidence: t.evidence, conceptIds: t.conceptIds }));
  }
  if (priorities.length < 3 && emphasis[0]) priorities.push(genItem("pri-emp", emphasis[0].text, emphasis[0].sub));
  if (!priorities.length)
    priorities.push(genItem("pri-none", "Not enough tagged snaps to call a priority yet", "Tag more film in Hudl — formation, play and personnel are what turn snaps into tells."));

  return {
    priorities: priorities.slice(0, 3),
    bestPlayers: bestPlayers.slice(0, 5),
    threats: threats.slice(0, 7),
    concerns: concerns.slice(0, 5),
    adjustments: adjustments.slice(0, 5),
    emphasis: emphasis.slice(0, 6),
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
  const priorities = cands.sort((a, b) => b.score - a.score).slice(0, 3).map((c) => c.it);
  if (priorities.length === 0) priorities.push(item("Enter tendencies to generate priorities", "Run rate, 1st-down run, down & distance, and concepts drive this list."));

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
  if (best.length === 0) best.push(item("No saved rules match their tendencies yet", "Teach a rule on My Scheme and it will show up here."));

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
  if (concerns.length === 0) concerns.push(item("Nothing flagged against their tendencies", "Your saved rules cover what they show most."));

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
  if (adj.length === 0) adj.push(item("Enter their concepts and personnel", "Adjustments are matched to your saved fronts and coverages."));

  // -- practice / call emphasis
  const emphasis: PlanItem[] = [];
  if (runs[0]) emphasis.push(item(`Fit ${runs[0].name} from every front`, "Tuesday: inside run, all fronts, both hashes."));
  if (thirdLongPass != null && thirdLongPass >= 55) emphasis.push(item("3rd & long period", `${pressures.find((p) => p.group === "3rd Down Calls")?.name ?? "Best pressure"} + ${coverages.find((c) => /robber|tampa|quarters/i.test(c.name))?.name ?? "match coverage"} behind it.`));
  if (o.rpoRate != null && o.rpoRate >= 40) emphasis.push(item("RPO conflict drill", "Overhang and Mike: run key first, then re-route #2."));
  if (passes.some((p) => /cross|post|wheel/i.test(p.name))) emphasis.push(item("Match rules vs crossers and wheels", "Overhang expands with the wheel; CUT call on crossers (Coverage Library)."));
  if (o.redZone) emphasis.push(item("Red zone Thursday", o.redZone.slice(0, 80)));
  if (emphasis.length === 0) emphasis.push(item("Base fundamentals", "Fits, leverage, and tackling until the scouting report fills in."));

  // Answers we already carry belong with the rest of the small stuff now —
  // the plan reads best players → threats → concerns → adjustments → practice.
  return {
    priorities,
    bestPlayers: o.keyPlayers
      .filter((k) => k.name.trim())
      .slice(0, 4)
      .map((k) => item(`${k.jersey ? `#${k.jersey} ` : ""}${k.name}${k.pos ? ` (${k.pos})` : ""}`, k.notes || "Add what he does well and CounterScheme will suggest how to limit him.")),
    threats: threats.slice(0, 6),
    concerns: concerns.slice(0, 5),
    adjustments: [...best.slice(0, 4), ...adj].slice(0, 6),
    emphasis: emphasis.slice(0, 5),
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

export const localProvider: AiProvider = { name: "Local engine", teach, analyze, gamePlan, ask, resolveTerm, practicePool };
