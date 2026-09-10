// Practice emphasis + scout script (Q5, Q40 steps 5–6).
//
// Q5 is the coach's biggest pain point: "the biggest time/stress point is
// turning film and tendencies into an intentional practice/scout script." So
// this file does exactly what he described:
//
//   1. Build a LARGER candidate pool from the opponent's snaps — every look
//      they actually ran — ranked by frequency × success × stress against our
//      saved rules. Frequency alone is not enough: "a play does not have to be
//      their most-called play to deserve practice time if it is especially
//      dangerous against what we do."
//   2. Say in one line WHY each rep matters, so the coach can eliminate down to
//      the essentials instead of being handed thirty equal-looking plays.
//   3. Rehearse the game OPERATION when they change personnel: recognize →
//      communicate → substitute → receive the call → align → execute.
//   4. A small number of counters they could come back with — not endless
//      guessing, three at most, and always labelled as guesses.
//   5. Progress the week instead of running the same script three times:
//      Monday teach it, Tuesday apply it, Wednesday make it game-like,
//      Thursday only the reminders.
//
// Pure functions. No React, no store writes. The AI layer delegates here so a
// real model can later rewrite the "why" lines while the math stays in code.

import type { Concept, GamePlan, Opponent, Play, PracticeDayKey, PracticeSelection } from "@/lib/store";
import { shortMeaning, type TermMapping } from "@/lib/knowledge";
import {
  bestPlays, computeTells, formationCombos, hashOf, makeResolver, outcomeOf, playRows, sideOf,
  situationLabel, situationOf, summarize, tag as normTag, type Tell,
} from "@/lib/tendencies";
import { answerFor, callName, makeKit, readConcept, type PlanKit } from "@/lib/plan";

// ---- shapes -----------------------------------------------------------------

export type RepKind = "look" | "operation" | "counter";
/** The coach's practice week. The selection shape lives in the store. */
export type PracticeDay = PracticeDayKey;
export type { PracticeSelection };

export const PRACTICE_DAYS: { day: PracticeDay; label: string; tempo: string; purpose: string }[] = [
  { day: "Mon", label: "Monday", tempo: "WALK IT", purpose: "Understand it — teach the look, the personnel and why we do what we do." },
  { day: "Tue", label: "Tuesday", tempo: "JOG IT", purpose: "Apply it — mixed order, situations called out loud, moderate tempo." },
  { day: "Wed", label: "Wednesday", tempo: "FULL SPEED", purpose: "Game-like — communication, substitutions and the pressure-point plays." },
  { day: "Thu", label: "Thursday", tempo: "CLEANUP", purpose: "Essential reminders and alerts only. Do not overload them." },
];

/** How many reps a high school defense can actually master in a week (Q5). */
export const PRACTICE_CAP = { low: 12, high: 16 };

export type RepStats = {
  n: number;
  runRate: number | null;
  avgGain: number | null;
  successRate: number | null;
  explosive: number;
  explosiveRate: number | null;
  tds: number;
};

export type PracticeRep = {
  id: string;
  kind: RepKind;
  /** Everything off the breakdown the scout team needs (Q5). */
  personnel: string;
  formation: string;
  formationMeaning: string;
  backfield: string;
  play: string;
  playMeaning: string;
  direction: string;
  hash: string;
  motion: string;
  /** The coach's Q36 label ("2nd & 7-9 — Medium") … */
  situation: string;
  /** … and the exact down & distance underneath it. */
  downDistance: string;
  playIds: string[];
  stats: RepStats;
  /** One line: why this rep is worth practice time. */
  why: string;
  /** What the scout team is being asked to give us. */
  note: string;
  /** Our expected call, when the saved defense has one. */
  answer: string | null;
  hasAnswer: boolean;
  conceptIds: string[];
  score: number;
  scoreParts: { frequency: number; success: number; stress: number };
  /** Short flags for the UI: "No stored answer", "Concern", "Best play"… */
  flags: string[];
  /** In CounterScheme's own suggested script unless the coach says otherwise. */
  recommended: boolean;
};

export type PracticePool = {
  opponentId: string;
  reps: PracticeRep[];
  generatedAt: number;
  /** Snaps the pool was built from — honesty about sample size. */
  snaps: number;
  cap: { low: number; high: number };
  /** Plain-language note when there wasn't much to work with. */
  warning?: string;
};

// ---- small helpers ----------------------------------------------------------

const stable = (s: string) => {
  let x = 5381;
  for (let i = 0; i < s.length; i++) x = ((x * 33) ^ s.charCodeAt(i)) >>> 0;
  return x.toString(36);
};

const modal = (rows: Play[], of: (p: Play) => string): string => {
  const m = new Map<string, number>();
  for (const p of rows) {
    const v = of(p);
    if (!v) continue;
    m.set(v, (m.get(v) ?? 0) + 1);
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? "";
};

const one = (v: number | null | undefined) => (v == null ? "—" : v.toFixed(1));
const snaps = (n: number) => `${n} snap${n === 1 ? "" : "s"}`;
const pctOf = (v: number | null | undefined) => (v == null ? "—" : `${Math.round(v * 100)}%`);

const statsOf = (rows: Play[]): RepStats => {
  const s = summarize(rows);
  return {
    n: rows.length,
    runRate: s.plays ? s.runs / s.plays : null,
    avgGain: s.avgGain,
    successRate: s.successRate,
    explosive: s.explosive,
    explosiveRate: s.explosiveRate,
    tds: s.tds,
  };
};

/** "2nd & 7" — the exact numbers the coach wants kept under the bucket (Q36). */
const ddOf = (rows: Play[]): string => {
  const withDD = rows.filter((p) => p.down && p.distance != null);
  if (!withDD.length) return "";
  const counts = new Map<string, number>();
  for (const p of withDD) {
    const k = `${p.down} & ${p.distance}`;
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  return sorted.length > 1 ? `${sorted[0][0]} (also ${sorted.slice(1, 3).map((x) => x[0]).join(", ")})` : sorted[0][0];
};

// ---- the candidate pool -----------------------------------------------------

export type PracticeInput = {
  opponent: Opponent;
  concepts: Concept[];
  termMap?: TermMapping[];
  plan?: GamePlan;
};

type LookGroup = { key: string; rows: Play[] };

/** One "look" = the things the scout team has to be told to line up in and run. */
function groupLooks(plays: Play[]): LookGroup[] {
  const m = new Map<string, Play[]>();
  for (const p of plays) {
    const formation = normTag(p.formation);
    const play = normTag(p.play);
    if (!formation && !play) continue; // nothing to put on a card
    const key = [normTag(p.personnel), formation, normTag(p.backfield), play].join("|");
    m.set(key, [...(m.get(key) ?? []), p]);
  }
  return [...m.entries()].map(([key, rows]) => ({ key, rows }));
}

/** Play ids the game plan already pointed at, and what it called them. */
function planIndex(plan?: GamePlan) {
  const concern = new Map<string, string>();
  const threat = new Map<string, string>();
  const emphasis = new Set<string>();
  const mark = (ids: string[] | undefined, into: Map<string, string>, text: string) => {
    for (const id of ids ?? []) if (!into.has(id)) into.set(id, text);
  };
  for (const it of plan?.concerns ?? []) mark(it.evidence?.playIds, concern, it.text);
  for (const it of plan?.threats ?? []) mark(it.evidence?.playIds, threat, it.text);
  for (const it of plan?.priorities ?? []) mark(it.evidence?.playIds, threat, it.text);
  for (const it of plan?.emphasis ?? []) for (const id of it.evidence?.playIds ?? []) emphasis.add(id);
  return { concern, threat, emphasis };
}

const overlap = (ids: string[], set: { has: (id: string) => boolean }) => ids.some((id) => set.has(id));

/**
 * The strongest tell that fires on this look, if any (Q35 feeding Q5). A look
 * with one or two snaps under it isn't evidence of a tell — it just happens to
 * sit inside one — so those don't get to borrow the sentence.
 */
function tellFor(ids: string[], tells: Tell[]): Tell | null {
  if (ids.length < 3) return null;
  const set = new Set(ids);
  let best: Tell | null = null;
  for (const t of tells) {
    const hit = t.playIds.filter((id) => set.has(id)).length;
    if (hit / ids.length < 0.6) continue;
    if (!best || t.score > best.score) best = t;
  }
  return best;
}

const describeLook = (rep: Pick<PracticeRep, "personnel" | "formation" | "backfield" | "play" | "situation">) =>
  [rep.personnel && `${rep.personnel} personnel`, rep.formation, rep.backfield && `${rep.backfield} backfield`, rep.play, rep.situation]
    .filter(Boolean)
    .join(" + ");

/**
 * Build the pool. Everything here is counted off the snaps — the only opinions
 * are the weights, and they are the coach's: how often they run it, how well it
 * works, and how much it stresses what we have on file.
 */
export function buildPracticePool(input: PracticeInput): PracticePool {
  const { opponent, concepts, termMap = [], plan } = input;
  const plays = opponent.plays ?? [];
  const kit = makeKit(concepts);
  const resolve = makeResolver(termMap);
  const idx = planIndex(plan);
  const tells = plays.length ? computeTells(plays).all : [];
  const best = bestPlays(plays);
  const dangerous = new Map(best.bySuccess.slice(0, 3).map((p) => [p.name, p]));
  const mostCalled = best.byFrequency[0]?.name ?? "";
  const rows = playRows(plays);
  const freqByPlay = new Map(rows.map((r) => [r.name, r.n]));
  const looks = groupLooks(plays);
  const maxN = looks.reduce((a, l) => Math.max(a, l.rows.length), 0) || 1;
  const baseline = summarize(plays);
  const baseSuccess = baseline.successRate ?? 0.4;

  const reps: PracticeRep[] = [];

  for (const { key, rows: group } of looks) {
    const st = statsOf(group);
    const personnel = normTag(group[0].personnel);
    const formation = normTag(group[0].formation);
    const backfield = normTag(group[0].backfield);
    const play = normTag(group[0].play);
    const situation = modal(group, (p) => { const s = situationOf(p); return s ? situationLabel(s) : ""; });
    const direction = modal(group, (p) => sideOf(p.direction) || normTag(p.direction));
    const hash = modal(group, (p) => hashOf(p.hash) || normTag(p.hash));
    const motion = modal(group, (p) => normTag(p.motion));
    const ids = group.map((p) => p.id);

    // --- our answer, out of the coach's own toolbox (Q30/Q32)
    const runIsh = st.runRate != null && st.runRate >= 0.5;
    const condition = describeLook({ personnel, formation, backfield, play, situation });
    const ans = answerFor(
      {
        condition,
        outcome: play || (runIsh ? "Run" : "Pass"),
        outcomeKind: play ? "play" : "runpass",
        tags: [
          formation && { field: "formation" as const, value: formation, label: formation },
          personnel && { field: "personnel" as const, value: personnel, label: `${personnel} personnel` },
          backfield && { field: "backfield" as const, value: backfield, label: `${backfield} backfield` },
          situation && { field: "situation" as const, value: situation, label: situation },
        ].filter(Boolean) as { field: "formation" | "personnel" | "backfield" | "situation"; value: string; label: string }[],
        termMap,
      },
      kit,
    );
    const hasAnswer = !ans.practice && !ans.generic && !ans.educational;

    // --- score: frequency × success × stress against our rules (Q5)
    const frequency = st.n / maxN;
    const success = Math.min(1.4, (st.successRate ?? baseSuccess) + (st.explosiveRate ?? 0) * 1.5 + (st.tds ? 0.2 : 0));
    // A look only inherits a game-plan concern when most of ITS snaps are the
    // evidence behind that concern — one shared snap is not the same thing.
    const concernText =
      [...idx.concern.entries()].filter(([id]) => ids.includes(id)).length >= Math.max(1, Math.ceil(ids.length * 0.6)) && ids.length >= 2
        ? [...idx.concern.entries()].find(([id]) => ids.includes(id))![1]
        : null;
    let stress = 1;
    if (!hasAnswer) stress += ans.practice ? 0.6 : 0.35;
    if (concernText) stress += 0.5;
    if (overlap(ids, idx.threat)) stress += 0.3;
    if (idx.emphasis.size && ids.some((id) => idx.emphasis.has(id))) stress += 0.25;
    const tell = tellFor(ids, tells);
    if (tell?.actionable) stress += 0.2;
    // Sample size is not the same as importance, but a look the scout team has
    // seen once is thin evidence — it can still make the list, just not the top.
    const support = 0.45 + 0.55 * Math.min(1, st.n / 4);
    const score = (0.35 + 0.65 * frequency) * (0.4 + 0.6 * success) * stress * support;

    // --- the one line that lets him eliminate (Q5)
    const flags: string[] = [];
    if (ans.practice) flags.push("No stored answer");
    else if (ans.generic) flags.push("No check on file");
    if (concernText) flags.push("Concern");
    if (play && dangerous.has(play)) flags.push("Best play");
    if (play && play === mostCalled) flags.push("Most-called");
    if (tell?.actionable) flags.push("Tell");

    const cover = kit.baseCoverage ? callName(kit.baseCoverage) : "our coverage rules";
    const front = kit.baseFront ? callName(kit.baseFront) : "our base fits";
    const read = play ? readConcept(play, termMap) : { family: null, type: null, label: null };
    const why = (() => {
      if (ans.practice) return `No stored answer for this look — decide the call before Monday. They ran it ${st.n}×.`;
      if (concernText) return `Game plan concern: ${concernText}`;
      if (play && dangerous.has(play)) {
        const d = dangerous.get(play)!;
        return `Their best play against ${read.type === "pass" ? cover : front} — ${one(d.avgGain)} yds a snap with ${d.explosive} explosive, on only ${d.n} snaps.`;
      }
      if (tell) {
        if (tell.outcomeKind === "runpass") return `${Math.round(tell.rate * 100)}% ${tell.outcome.toLowerCase()} from this look (${Math.round(tell.baseline * 100)}% overall).`;
        if (tell.outcomeKind === "direction") return `The ball goes ${tell.outcome.toLowerCase()} ${Math.round(tell.rate * 100)}% of the time out of this look.`;
        return `${tell.outcome} ${Math.round(tell.rate * 100)}% of the time out of this look (${Math.round(tell.baseline * 100)}% overall).`;
      }
      if (play && play === mostCalled) return `Their most-called play — ${snaps(freqByPlay.get(play) ?? st.n)}. Fit it until it's boring.`;
      if (ans.generic) return `Base covers it, but there's no check on file for this look. ${snaps(st.n)}, ${pctOf(st.runRate)} run.`;
      if (st.explosive) return `${st.explosive} explosive off this look in ${snaps(st.n)} — ${one(st.avgGain)} yds a pop.`;
      return `${snaps(st.n)} out of this look, ${pctOf(st.runRate)} run, ${one(st.avgGain)} yds a snap.`;
    })();

    const note = [
      `Line up ${formation ? `in ${formation}` : "in their base look"}${personnel ? ` with ${personnel} personnel` : ""}${backfield ? `, ${backfield} backfield` : ""}.`,
      motion ? `${motion} motion.` : "",
      play ? `Run ${play}${direction ? ` ${direction.toLowerCase()}` : ""}.` : direction ? `Ball goes ${direction.toLowerCase()}.` : "",
      hash ? (/middle/i.test(hash) ? "Ball in the middle of the field." : `Ball on the ${hash.toLowerCase()}.`) : "",
      situation ? `Give it to us on ${situation}.` : "",
    ].filter(Boolean).join(" ");

    reps.push({
      id: `r-${stable(key)}`,
      kind: "look",
      personnel,
      formation,
      formationMeaning: (formation && shortMeaning(resolve(formation, "formation"), 48)) || "",
      backfield,
      play,
      playMeaning: (play && shortMeaning(resolve(play, "concept"), 48)) || "",
      direction,
      hash,
      motion,
      situation,
      downDistance: ddOf(group),
      playIds: ids,
      stats: st,
      why,
      note,
      answer: hasAnswer || ans.generic ? ans.text : ans.practice ?? null,
      hasAnswer,
      conceptIds: ans.conceptIds,
      score,
      scoreParts: { frequency, success, stress },
      flags,
      recommended: false,
    });
  }

  reps.sort((a, b) => b.score - a.score || b.stats.n - a.stats.n || a.id.localeCompare(b.id));

  // --- personnel-change operation reps (Q5: "Personnel changes are huge.")
  const ops = operationReps(plays, kit);
  // --- counters they could come back with — three at most (Q5)
  const counters = counterReps(reps, plays, kit, termMap);

  // CounterScheme's own suggested script: the top looks plus every operation
  // rep. The coach eliminates from there — the rest of the pool stays visible.
  // A one-snap look can stay in the pool, but it doesn't go on the script
  // unless it's dangerous or we have nothing filed against it.
  const worthy = reps.filter((r) => r.stats.n >= 2 || r.flags.includes("Best play") || r.flags.includes("Concern"));
  const shortlist = (worthy.length ? worthy : reps).slice(0, Math.max(1, PRACTICE_CAP.low - ops.length));
  const suggested = new Set([...shortlist.map((r) => r.id), ...ops.map((r) => r.id)]);

  // Counters are a guess, so they never crowd out a rep we actually counted —
  // but they sit where the coach is making his cuts, not at the bottom.
  const cut = shortlist[shortlist.length - 1]?.score ?? 1;
  for (const c of counters) c.score = cut * 0.95;

  const all = [...reps, ...ops, ...counters].sort(
    (a, b) => b.score - a.score || b.stats.n - a.stats.n || a.id.localeCompare(b.id),
  );
  for (const r of all) r.recommended = suggested.has(r.id);

  const warning =
    plays.length === 0
      ? "No snaps imported yet. Upload the Hudl play-by-play on Opponent Matchup and the reps build themselves."
      : plays.length < 20
        ? `Only ${plays.length} snaps on file — the ranking is thin. Tag more film and this list gets sharper.`
        : looks.every((l) => !normTag(l.rows[0].play))
          ? "No play/concept tags in the import, so the reps are formation-only. Tag Offensive Play in Hudl for real scout cards."
          : undefined;

  return { opponentId: opponent.id, reps: all, generatedAt: Date.now(), snaps: plays.length, cap: PRACTICE_CAP, warning };
}

/**
 * The rep whose purpose is the OPERATION, not the play: recognize the personnel,
 * communicate it, make our package change, take the call, align, execute. One
 * per grouping they actually use — only when they use more than one (Q5).
 */
function operationReps(plays: Play[], kit: PlanKit): PracticeRep[] {
  const groups = new Map<string, Play[]>();
  for (const p of plays) {
    const g = normTag(p.personnel);
    if (!g) continue;
    groups.set(g, [...(groups.get(g) ?? []), p]);
  }
  const used = [...groups.entries()].filter(([, rows]) => rows.length >= 3).sort((a, b) => b[1].length - a[1].length);
  if (used.length < 2) return [];
  const total = used.reduce((a, [, rows]) => a + rows.length, 0);
  return used.slice(0, 3).map(([group, rows]) => {
    const st = statsOf(rows);
    const forms = modal(rows, (p) => normTag(p.formation));
    return {
      id: `op-${stable(group)}`,
      kind: "operation" as const,
      personnel: group,
      formation: forms,
      formationMeaning: "",
      backfield: modal(rows, (p) => normTag(p.backfield)),
      play: "",
      playMeaning: "",
      direction: "",
      hash: "",
      motion: modal(rows, (p) => normTag(p.motion)),
      situation: modal(rows, (p) => { const s = situationOf(p); return s ? situationLabel(s) : ""; }),
      downDistance: "",
      playIds: rows.map((p) => p.id),
      stats: st,
      why: `They play ${Math.round((rows.length / total) * 100)}% of their snaps in ${group}. The rep is the operation, not the play — a personnel change we don't see is a busted call.`,
      note: `Scout team subs into ${group} personnel between snaps and huddles up in ${forms || "their base look"}. Defense: recognize it, communicate it, make the package change, take the call, align, execute. Run it live — no walking through the substitution.`,
      answer: kit.baseFront ? `Match it out of ${callName(kit.baseFront)} and get the call out before they're set.` : "Get the personnel call out before they're set.",
      hasAnswer: !!kit.baseFront,
      conceptIds: kit.baseFront ? [kit.baseFront.id] : [],
      score: 2 + rows.length / Math.max(1, total),
      scoreParts: { frequency: rows.length / Math.max(1, total), success: 1, stress: 1 },
      flags: ["Operation"],
      recommended: true,
    };
  });
}

// The counters a staff actually sees when you commit to stopping something.
// Football knowledge, not data — so the rep says so out loud (Q5, Q32).
const COUNTER_FAMILIES: Record<string, { play: string; why: string; note: string }[]> = {
  Zone: [
    { play: "BOOT / WAGGLE", why: "If we commit the backside end and the backers to the zone, boot off that same action is the standard answer.", note: "Same zone footwork, quarterback pulls it and works the 3-level boot away from the run." },
    { play: "RPO GLANCE", why: "Zone teams tag a glance behind the linebacker who is filling the run.", note: "Zone action, quarterback pulls and throws the glance behind the fitting backer." },
  ],
  Gap: [
    { play: "COUNTER BASH", why: "When our backside backer starts running over the top of the pullers, the keep off the same look is the counter.", note: "Same pull action, back runs away from the quarterback — quarterback keeps it backside." },
    { play: "TRAP", why: "If our ends are spilling everything, the trap back inside is the natural answer.", note: "Let our end up the field and trap him from the inside out." },
  ],
  Perimeter: [
    { play: "COUNTER OFF JET", why: "Once we start chasing the sweep, the give back inside off the same motion is the counter.", note: "Show the jet, hand it inside off the fake." },
  ],
  Option: [
    { play: "PLAY-ACTION SHOT", why: "Option teams throw off the same run look the moment the safeties start jumping the mesh.", note: "Full option action, one receiver over the top." },
  ],
  RPO: [
    { play: "QB KEEP", why: "If our conflict defender starts sitting on the throw, they hand it back to the quarterback.", note: "Same RPO look, quarterback pulls and runs it." },
  ],
  Crossing: [
    { play: "SCREEN", why: "If we start pressuring the crossers, the screen off that drop is what comes back.", note: "Show the same drop, throw the screen behind the rush." },
  ],
  Vertical: [
    { play: "DOUBLE MOVE", why: "Once our corners start squatting on the comeback, they push it over the top.", note: "Hitch-and-go on the corner who has been sitting on it." },
  ],
  "High-Low": [
    { play: "DOUBLE MOVE", why: "Sitting on the underneath route is what gets you beat over the top of it.", note: "Same look, receiver breaks it off and goes." },
  ],
  Screen: [
    { play: "SCREEN AND GO", why: "If the corner starts flying up on the screen, the throw behind it is next.", note: "Fake the screen, receiver turns it up the sideline." },
  ],
};

function counterReps(looks: PracticeRep[], plays: Play[], kit: PlanKit, termMap: TermMapping[]): PracticeRep[] {
  const top = looks.filter((r) => r.play).slice(0, 10);
  if (!top.length) return [];
  // Which families are we about to spend the week stopping?
  const weight = new Map<string, number>();
  for (const r of top) {
    const fam = readConcept(r.play, termMap).family;
    if (!fam) continue;
    weight.set(fam, (weight.get(fam) ?? 0) + r.score);
  }
  const ranked = [...weight.entries()].sort((a, b) => b[1] - a[1]);
  const already = new Set(plays.map((p) => normTag(p.play)).filter(Boolean));
  const out: PracticeRep[] = [];
  for (const [family] of ranked) {
    for (const c of COUNTER_FAMILIES[family] ?? []) {
      if (out.length >= 3) break;
      if (out.some((r) => r.play === c.play)) continue;
      // They may already have it under a slightly different tag — say which.
      const seen = [...already].some((t) => t === c.play || t.includes(c.play) || c.play.includes(t));
      const source = top.find((r) => readConcept(r.play, termMap).family === family);
      out.push({
        id: `ctr-${stable(`${family}|${c.play}`)}`,
        kind: "counter",
        personnel: source?.personnel ?? "",
        formation: source?.formation ?? "",
        formationMeaning: source?.formationMeaning ?? "",
        backfield: source?.backfield ?? "",
        play: c.play,
        playMeaning: "",
        direction: "",
        hash: "",
        motion: "",
        situation: "",
        downDistance: "",
        playIds: [],
        stats: { n: 0, runRate: null, avgGain: null, successRate: null, explosive: 0, explosiveRate: null, tds: 0 },
        why: `Counter — our guess, ${seen ? "and it is on their film" : "not something they've shown"}. ${c.why}`,
        note: `${c.note} Give it to us out of ${source?.formation || "their base look"} so it looks exactly like the play we've been fitting all week.`,
        answer: kit.baseCoverage ? `Everybody plays their rule out of ${callName(kit.baseCoverage)} — the counter only works when somebody leaves his job.` : "Everybody plays his rule. The counter only works when somebody leaves his job.",
        hasAnswer: !!kit.baseCoverage,
        conceptIds: kit.baseCoverage ? [kit.baseCoverage.id] : [],
        score: 0.5,
        scoreParts: { frequency: 0, success: 0, stress: 1 },
        flags: ["Counter"],
        recommended: false,
      });
    }
    if (out.length >= 3) break;
  }
  return out;
}

// ---- the coach's choices ----------------------------------------------------

export const emptySelection = (): PracticeSelection => ({ included: [], excluded: [], order: [], notes: "", generatedAt: 0 });

/** Included = the coach said yes, or CounterScheme suggested it and he hasn't said no. */
export const isIncluded = (rep: PracticeRep, sel: PracticeSelection) =>
  sel.included.includes(rep.id) ? true : sel.excluded.includes(rep.id) ? false : rep.recommended;

/** His order first (for the reps that still exist), then the rest by score. */
export function orderedReps(pool: PracticePool, sel: PracticeSelection): PracticeRep[] {
  const byId = new Map(pool.reps.map((r) => [r.id, r]));
  const seen = new Set<string>();
  const out: PracticeRep[] = [];
  for (const id of sel.order) {
    const r = byId.get(id);
    if (r && !seen.has(id)) { out.push(r); seen.add(id); }
  }
  for (const r of pool.reps) if (!seen.has(r.id)) out.push(r);
  return out;
}

export const selectedReps = (pool: PracticePool, sel: PracticeSelection) =>
  orderedReps(pool, sel).filter((r) => isIncluded(r, sel));

/**
 * Drop choices about reps that are no longer in the pool, keep everything else.
 * Regenerating must never quietly undo the coach's eliminations (Q5).
 */
export function pruneSelection(sel: PracticeSelection, pool: PracticePool): PracticeSelection {
  const live = new Set(pool.reps.map((r) => r.id));
  const keep = (ids: string[]) => ids.filter((id) => live.has(id));
  const days = sel.days
    ? (Object.fromEntries(Object.entries(sel.days).map(([d, ids]) => [d, keep(ids ?? [])])) as Partial<Record<PracticeDay, string[]>>)
    : undefined;
  return { ...sel, included: keep(sel.included), excluded: keep(sel.excluded), order: keep(sel.order), days };
}

// ---- the scout script (Q1: Mon teach → Tue apply → Wed game-like → Thu clean) ---

export type ScriptDay = {
  day: PracticeDay;
  label: string;
  tempo: string;
  purpose: string;
  /** How the reps are presented that day — this is what changes across the week. */
  presentation: string;
  repIds: string[];
};

/**
 * The same important reps repeat — players need repetition — but Monday they are
 * grouped by look and taught, Tuesday they come in mixed order with the
 * situation called, Wednesday they run game-like with the substitutions and the
 * pressure points, and Thursday it is only the reminders (Q1, Q5).
 */
export function buildScript(pool: PracticePool, sel: PracticeSelection): ScriptDay[] {
  const chosen = selectedReps(pool, sel);
  const looks = chosen.filter((r) => r.kind === "look");
  const ops = chosen.filter((r) => r.kind === "operation");
  const counters = chosen.filter((r) => r.kind === "counter");

  // Monday — the personnel picture first (that's the identity teach), then the
  // looks grouped together so the teaching stays in one place.
  const mon = [...ops, ...looks].sort((a, b) =>
    (a.kind === "operation" ? 0 : 1) - (b.kind === "operation" ? 0 : 1) ||
    (a.personnel || "~").localeCompare(b.personnel || "~") ||
    (a.formation || "~").localeCompare(b.formation || "~") ||
    b.score - a.score,
  );

  // Tuesday — mixed on purpose: no two neighbours out of the same formation.
  const tue = interleave(looks, (r) => r.situation || r.formation || r.id);

  // Wednesday — game-like: operation reps and the pressure points first, then
  // the rest in the order the coach put them in.
  const pressure = looks.filter((r) => !r.hasAnswer || r.flags.includes("Concern") || r.flags.includes("Best play"));
  const rest = looks.filter((r) => !pressure.includes(r));
  const wed = dedupe([...ops, ...pressure, ...rest, ...counters]);

  // Thursday — reminders only. Never the whole list.
  const thu = dedupe([
    ...looks.filter((r) => !r.hasAnswer || r.flags.includes("Concern")),
    ...looks.filter((r) => r.flags.includes("Most-called") || r.flags.includes("Best play")),
    ...ops,
  ]).slice(0, 5);

  const generated: Record<PracticeDay, string[]> = {
    Mon: mon.map((r) => r.id),
    Tue: tue.map((r) => r.id),
    Wed: wed.map((r) => r.id),
    Thu: thu.map((r) => r.id),
  };

  const presentation: Record<PracticeDay, string> = {
    Mon: "Grouped by look. Walk it, name the personnel and formation out loud, and teach why the call is the call.",
    Tue: "Mixed order at a jog. Call the situation before every snap — no two reps in a row from the same look.",
    Wed: "Game-like sequence. Substitutions live, communication live, pressure-point plays first.",
    Thu: "Reminders and alerts only. Show the look, confirm the call, move on.",
  };

  const live = new Set(chosen.map((r) => r.id));
  return PRACTICE_DAYS.map(({ day, label, tempo, purpose }) => {
    const override = sel.days?.[day];
    const ids = (override ?? generated[day]).filter((id) => live.has(id));
    return { day, label, tempo, purpose, presentation: presentation[day], repIds: ids };
  });
}

const dedupe = <T extends { id: string }>(rows: T[]): T[] => {
  const seen = new Set<string>();
  return rows.filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)));
};

/** Spread rows so the same bucket never lands back to back — deterministic. */
function interleave<T>(rows: T[], bucketOf: (r: T) => string): T[] {
  const buckets = new Map<string, T[]>();
  for (const r of rows) {
    const k = bucketOf(r);
    buckets.set(k, [...(buckets.get(k) ?? []), r]);
  }
  const lists = [...buckets.values()].sort((a, b) => b.length - a.length);
  const out: T[] = [];
  let i = 0;
  while (out.length < rows.length) {
    let placed = false;
    for (const list of lists) {
      if (list.length > i) { out.push(list[i]); placed = true; }
    }
    if (!placed) break;
    i++;
  }
  return out;
}

/** The cards, numbered the way they'll be printed. */
export type ScoutCard = { number: number; rep: PracticeRep; days: PracticeDay[] };

export function scoutCards(pool: PracticePool, sel: PracticeSelection): ScoutCard[] {
  const script = buildScript(pool, sel);
  const daysOf = new Map<string, PracticeDay[]>();
  for (const d of script) for (const id of d.repIds) daysOf.set(id, [...(daysOf.get(id) ?? []), d.day]);
  return selectedReps(pool, sel).map((rep, i) => ({ number: i + 1, rep, days: daysOf.get(rep.id) ?? [] }));
}

/** Plan Status step 6: is there a script with something in it? */
export const scriptHasReps = (script: ScriptDay[]) => script.some((d) => d.repIds.length > 0);

/** Formation × backfield × situation combos, for the "what else is on film" strip. */
export const looksOnFilm = (plays: Play[]) => formationCombos(plays, 3);

/** How many of the chosen reps actually have a stored answer — honest counter. */
export function poolSummary(pool: PracticePool, sel: PracticeSelection) {
  const chosen = selectedReps(pool, sel);
  const counted = chosen.flatMap((r) => r.playIds);
  const covered = chosen.filter((r) => r.hasAnswer).length;
  return {
    total: pool.reps.length,
    chosen: chosen.length,
    covered,
    gaps: chosen.length - covered,
    snapsCovered: new Set(counted).size,
    overCap: chosen.length > pool.cap.high,
  };
}

/** Success flags on one snap, for the evidence tables. */
export const repOutcome = outcomeOf;
