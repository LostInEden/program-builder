// What CounterScheme believes, in the coach's own words (Q50).
//
// These are not slogans to sprinkle on the screen. They are the tie-breaker
// whenever the app is tempted to hand a staff more football: more calls, more
// reps, more install. One line at a time, only where it changes a decision.

import type { Concept, Player } from "@/lib/store";
import { menuBlocks } from "@/lib/callsheet";

export type PrincipleId = "quality" | "master" | "run" | "physical" | "own";

export type Principle = { id: PrincipleId; short: string; line: string };

/** His words. Nothing here is generated, and nothing here gets preached. */
export const PRINCIPLES: Principle[] = [
  { id: "quality", short: "Quality over quantity", line: "Do a few things at an elite level before you try to do everything at an average level." },
  { id: "master", short: "Master the basics, then add", line: "Master the basics. Master your scheme. Then add to it." },
  { id: "run", short: "Run it, stop it", line: "Running the football and stopping the run is the foundation of the program — everything else is built on top of it." },
  { id: "physical", short: "Physicality at every position", line: "Physicality isn't a position. Corners tackle and defeat blocks too — every player has a job in the run game." },
  { id: "own", short: "Do what you do", line: "Do what you do, but do it really well." },
];

export const principle = (id: PrincipleId): string =>
  PRINCIPLES.find((p) => p.id === id)?.line ?? "";

// ---- how much defense are we carrying? --------------------------------------

/**
 * In-season budget. More than this many live calls and the week stops being
 * about mastery and starts being about memory. Back-pocket calls don't count —
 * they're already parked.
 */
export const MASTERY_BUDGET = 12;

export type CallLoad = {
  /** Calls on the menu this week that are NOT back-pocketed. */
  active: number;
  backPocket: number;
  total: number;
  budget: number;
  over: boolean;
};

/**
 * Counted off the same menu the call sheet prints, so the number the coach sees
 * here is the number of lines he'd be holding on Friday.
 */
export function callLoad(concepts: Concept[]): CallLoad {
  const lines = menuBlocks(concepts).flatMap((b) => b.lines);
  const backPocket = lines.filter((l) => l.tag === "BP").length;
  const active = lines.length - backPocket;
  return { active, backPocket, total: lines.length, budget: MASTERY_BUDGET, over: active > MASTERY_BUDGET };
}

/** One line about the load — never two. */
export function masteryNote(load: CallLoad): string {
  if (load.over)
    return `${load.active} live calls on the menu this week. ${principle("quality")} Trim it or back-pocket what you haven't repped.`;
  return `${load.active} live calls${load.backPocket ? ` plus ${load.backPocket} in the back pocket` : ""} — a menu the kids can own. ${principle("own")}`;
}

/** Should we add this? The answer starts with what we already can't execute. */
export function addAdvice(load: CallLoad, what?: string): string {
  const it = what ? `“${what}”` : "it";
  return load.over
    ? `You're carrying ${load.active} live calls already — adding ${it} costs reps from something they still can't execute. ${principle("master")}`
    : `You're at ${load.active} live calls, so there's room — but it earns its place only if it answers something on this week's film. ${principle("quality")}`;
}

// ---- the fundamentals the software always checks ----------------------------

export type SkillLookup = (p: Player, ...keys: string[]) => number | null;

export const TACKLE_SKILL_KEYS = ["tackling", "runFit", "runSupport"];

/** Average of whatever run-support / tackling grades exist, or null. */
export function avgGrade(players: Player[], skill: SkillLookup, keys: string[]): number | null {
  const vals = players.map((p) => skill(p, ...keys)).filter((v): v is number => v != null);
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

/** Run-stop check — always said, whatever the answer is. */
export function runStopLine(boxAvg: number | null, carriesRunFront: boolean): string {
  if (boxAvg == null)
    return `Nobody in the box is graded on tackling or run fits yet, so the run-stop check has nothing to read. ${principle("run")}`;
  if (boxAvg < 3)
    return `The box averages ${boxAvg.toFixed(1)}/5 tackling and run fits. ${principle("run")}`;
  return `The box averages ${boxAvg.toFixed(1)}/5 tackling and run fits${carriesRunFront ? " behind a front built to stop it" : ""} — the foundation is where it needs to be.`;
}

/** Physicality note — only when the secondary's run-support grades say it. */
export function physicalityLine(dbAvg: number | null): string | null {
  if (dbAvg == null || dbAvg >= 3) return null;
  return `Secondary averages ${dbAvg.toFixed(1)}/5 tackling and run support. ${principle("physical")}`;
}
