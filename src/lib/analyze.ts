// Defensive Analysis — deterministic checks of the saved defensive model
// (fronts, coverages, pressures, adjustments) plus personnel, against the
// football knowledge base. Considerations, not corrections.

import { getStructure } from "@/lib/football";
import { COVERAGES } from "@/lib/coverages";
import {
  slotLabelOf,
  type Player,
  type PersonnelGroup,
  type Overrides,
  type Concept,
} from "@/lib/store";

export type Status = "Sound" | "Needs Review" | "Potential Conflict";

export type Finding = {
  id: string;
  check: string;
  status: Status;
  detail: string;
  affected?: string[];
  why?: string; // deeper explanation
  examples?: string[]; // situational examples
  breakdown?: string[]; // rule / fit breakdown
  suggestion?: string; // small adjustment using what the coach already carries
};

export type AnalysisInput = {
  scheme: { structureName: string; philosophyTitle: string; philosophy: string };
  concepts: Concept[];
  players: Player[];
  groups: PersonnelGroup[];
  activeGroupId: string;
  overrides: Overrides;
};

const has = (text: string | undefined, ...words: string[]) =>
  !!text && words.some((w) => text.toLowerCase().includes(w));

// Situations every defense gets asked on Friday. Each maps to the trigger
// words that would show a stored answer exists.
export const SITUATIONS: { key: string; label: string; words: string[]; category: string; fallback: string }[] = [
  { key: "motion", label: "Motion (jet / across / orbit)", words: ["motion", "jet", "orbit", "across"], category: "vs Motions", fallback: "Motion Bump — bump the second level, corners stay, no rotation." },
  { key: "trips", label: "Trips / 3x1", words: ["trips", "3x1", "3 x 1", "bunch"], category: "vs Formations", fallback: "Quarters Match with Special/Solo or Poach rules (Coverage Library) handles 3x1 without leaving the backside corner alone." },
  { key: "empty", label: "Empty (5 wide)", words: ["empty", "5 wide", "five wide"], category: "vs Formations", fallback: "Declare the 5 immediate threats: Cover 3 Match or Quarters keeps 5 underneath eyes on the QB." },
  { key: "12", label: "12 / 2-TE personnel", words: ["12", "two te", "2 te", "te + 2", "tight end", "heavy", "unbalanced"], category: "vs Personnel", fallback: "Over/Under front check to the TE side puts the 3-tech in the B gap they want to run through." },
  { key: "3rdlong", label: "3rd & long", words: ["3rd & long", "3rd and long", "3rd & 7", "3rd and 7", "third and long", "3rd & 10", "long yardage"], category: "Situational Rules", fallback: "A 3rd Down Call pressure with Cover 1 Robber or Tampa 2 Match behind it." },
  { key: "redzone", label: "Red zone / goal line", words: ["red zone", "redzone", "inside the", "goal line", "goalline"], category: "Special Situations", fallback: "A five-man front (Bear) inside the 10 and a match coverage that stays on top of fades." },
  { key: "2min", label: "Two-minute", words: ["two minute", "2 minute", "two-minute", "2-minute", "hurry"], category: "Special Situations", fallback: "Two-high match (Quarters / Tampa 2) that keeps everything in front and tackles in bounds." },
];

export function computeFindings(input: AnalysisInput): { findings: Finding[]; groupName: string; structureName: string } {
  const { groups, activeGroupId, players, scheme, overrides, concepts } = input;
  const group = groups.find((g) => g.id === activeGroupId) ?? groups[0];
  const structure = getStructure(group.structureId);
  const byId = new Map(players.map((p) => [p.id, p]));
  const label = (i: number) => slotLabelOf(overrides, group.structureId, i);
  const confirmed = concepts.filter((c) => c.confirmed);
  const fronts = confirmed.filter((c) => c.kind === "front");
  const coverages = confirmed.filter((c) => c.kind === "coverage");
  const pressures = confirmed.filter((c) => c.kind === "pressure");
  const adjustments = confirmed.filter((c) => c.kind === "adjustment");

  const findings: Finding[] = [];

  // ---- 1. Base identity saved ------------------------------------------------
  const baseFront = fronts.find((f) => f.isBase) ?? fronts[0];
  const baseCov = coverages.find((c) => c.isBase) ?? coverages[0];
  if (baseFront && baseCov) {
    findings.push({
      id: "base",
      check: "Base defense",
      status: "Sound",
      detail: `${scheme.structureName} · ${baseFront.name} front · ${baseCov.name}. ${fronts.length} fronts, ${coverages.length} coverages, ${pressures.length} pressures, ${adjustments.length} adjustments saved.`,
      why: "The engine can only reason about what is saved. A named base front and base coverage give every other check something to compare against.",
      breakdown: [`Base front: ${baseFront.name} — ${baseFront.summary || "no summary"}`, `Base coverage: ${baseCov.name} — ${baseCov.summary || "no summary"}`],
    });
  } else {
    findings.push({
      id: "base",
      check: "Base defense",
      status: "Potential Conflict",
      detail: `${!baseFront ? "No base front" : "No base coverage"} is saved. Everything else is checked against a base that doesn't exist yet.`,
      affected: [!baseFront ? "Fronts" : "Coverages"],
      why: "Adjustments are written as changes from the base. Without one, 'check to Over' has nothing to check from.",
      suggestion: `Teach it in one line — "Our base is ${!baseFront ? "Okie" : "Cover 3 Match"}" — or mark one in Manage ${!baseFront ? "Fronts" : "Coverages"}.`,
    });
  }

  // ---- 2. Stored answers for the situations every offense creates ----------
  const covered: string[] = [];
  const missing: typeof SITUATIONS = [];
  for (const s of SITUATIONS) {
    const hit = adjustments.find((a) => has(`${a.trigger} ${a.name}`, ...s.words));
    if (hit) covered.push(`${s.label} → ${hit.result || hit.name}`);
    else missing.push(s);
  }
  if (covered.length) {
    findings.push({
      id: "answers",
      check: "Stored answers",
      status: "Sound",
      detail: `${covered.length} of ${SITUATIONS.length} common situations have a saved rule.`,
      breakdown: covered,
      why: "Each of these is a Trigger → Action → Result the players can execute without a timeout.",
    });
  }
  for (const s of missing) {
    findings.push({
      id: `missing-${s.key}`,
      check: `No answer stored: ${s.label}`,
      status: "Needs Review",
      detail: `Nothing in ${s.category} triggers on ${s.label.toLowerCase()}. On Friday that becomes a sideline decision.`,
      affected: [s.category],
      why: "Offenses use motion, personnel, and formation strength to force late decisions. A stored rule is what lets the software — and your players — answer automatically.",
      examples: [`Opponent shows ${s.label.toLowerCase()} on 2nd & 6 at midfield — what's the call?`],
      suggestion: `Using what you carry: ${s.fallback}`,
    });
  }

  // ---- 3. Coverage responsibilities ----------------------------------------
  const thin = coverages.filter((c) => c.responsibilities.length === 0);
  if (coverages.length && thin.length === 0) {
    findings.push({
      id: "cov-rules",
      check: "Coverage responsibilities",
      status: "Sound",
      detail: `Every saved coverage has per-position responsibilities written down.`,
      why: "Match coverage lives or dies on who takes #2 vertical and who owns the post — those rules are what the analyst checks fits against.",
    });
  } else if (thin.length) {
    findings.push({
      id: "cov-rules",
      check: "Coverage responsibilities",
      status: "Needs Review",
      detail: `${thin.map((c) => c.name).join(", ")} ${thin.length === 1 ? "has" : "have"} no responsibilities entered — the engine can't check who carries #2 vertical or who owns the post.`,
      affected: thin.map((c) => c.name),
      why: "A coverage name alone doesn't say what your players do when #2 goes vertical, out, or under.",
      breakdown: thin
        .filter((c) => c.libraryId)
        .map((c) => {
          const lib = COVERAGES.find((x) => x.id === c.libraryId);
          return lib ? `${c.name}: the Coverage Library has ${lib.roles.length} positions of rules ready to import.` : c.name;
        }),
      suggestion: "Open the coverage in Manage Coverages and pull the rules in from the Coverage Library, then edit them to your terms.",
    });
  }

  // ---- 4. Pressure package -------------------------------------------------
  const groupsUsed = [...new Set(pressures.map((p) => p.group).filter(Boolean))];
  const thirdDown = pressures.some((p) => p.group === "3rd Down Calls") || adjustments.some((a) => has(a.trigger, "3rd"));
  findings.push({
    id: "pressure",
    check: "Pressure package",
    status: pressures.length === 0 ? "Needs Review" : thirdDown ? "Sound" : "Needs Review",
    detail:
      pressures.length === 0
        ? "No pressures saved — the offense never has to account for a fifth rusher."
        : `${pressures.length} pressures across ${groupsUsed.length} group${groupsUsed.length === 1 ? "" : "s"} (${groupsUsed.join(", ")}).${thirdDown ? "" : " No dedicated 3rd-down call."}`,
    affected: pressures.length === 0 ? ["Pressures"] : thirdDown ? undefined : ["3rd Down Calls"],
    why: "Negative plays come from pressure the protection didn't expect. Variety by origin (edge, A gap, field) is what keeps it unexpected.",
    suggestion:
      pressures.length === 0
        ? "Teach one: “On 3rd and long we bring Smoke W with Cover 3 behind it.”"
        : thirdDown
          ? undefined
          : "Tag your best long-yardage pressure as a 3rd Down Call so the game plan can reach for it.",
  });

  // ---- 5. Personnel vs scheme ---------------------------------------------
  const starters = Object.entries(group.slots)
    .filter(([, ids]) => ids.length > 0)
    .map(([k, ids]) => ({ slot: Number(k), pl: byId.get(ids[0]) }))
    .filter((e) => e.pl) as { slot: number; pl: Player }[];
  const skill = (p: Player, k: "tackle" | "coverage" | "blockShed" | "pursuit" | "iq") => p.skills?.[k] ?? null;
  const dbStarters = starters.filter((e) => ["deep"].includes(structure.slots[e.slot].level));
  const covGrades = dbStarters.map((e) => skill(e.pl, "coverage")).filter((v): v is number => v != null);
  const manHeavy = coverages.filter((c) => has(c.name, "cover 1", "cover 0", "man", "meg", "2-man", "robber"));
  if (covGrades.length >= 2 && manHeavy.length) {
    const avg = covGrades.reduce((a, b) => a + b, 0) / covGrades.length;
    const weak = dbStarters.filter((e) => (skill(e.pl, "coverage") ?? 5) <= 2);
    findings.push({
      id: "man-fit",
      check: "Man coverage vs your corners",
      status: avg < 3 ? "Potential Conflict" : "Sound",
      detail:
        avg < 3
          ? `Starting secondary averages ${avg.toFixed(1)}/5 in coverage, but you carry ${manHeavy.map((c) => c.name).join(", ")}. ${weak.map((e) => `${label(e.slot)} ${e.pl.name}`).join(", ")} would be isolated.`
          : `Secondary averages ${avg.toFixed(1)}/5 in coverage — good enough to carry ${manHeavy.map((c) => c.name).join(", ")}.`,
      affected: avg < 3 ? weak.map((e) => label(e.slot)) : undefined,
      why: "Man coverages put a defender alone on a receiver with limited help. Skill ratings are the only thing that tells the engine whether that's a strength or a liability.",
      examples: ["3rd & 8, opponent's best WR isolated on the boundary corner in Cover 1."],
      suggestion: avg < 3 ? "Keep the man calls for your strongest matchups and lean on Cover 3 Match / Quarters (help inside) as the default." : undefined,
    });
  }
  const boxStarters = starters.filter((e) => structure.slots[e.slot].level !== "deep");
  const tackleGrades = boxStarters.map((e) => skill(e.pl, "tackle")).filter((v): v is number => v != null);
  if (tackleGrades.length >= 3) {
    const avg = tackleGrades.reduce((a, b) => a + b, 0) / tackleGrades.length;
    const runFirst = has(scheme.philosophy, "run");
    findings.push({
      id: "run-fit",
      check: "Box tackling vs philosophy",
      status: runFirst && avg < 3 ? "Needs Review" : "Sound",
      detail:
        runFirst && avg < 3
          ? `Your philosophy leads with the run but the box averages ${avg.toFixed(1)}/5 in tackling.`
          : `Box averages ${avg.toFixed(1)}/5 tackling — consistent with ${runFirst ? "a run-first identity" : "the stated philosophy"}.`,
      why: "Gap integrity is only as good as the tackle at the end of it. Missed tackles turn sound fits into explosives.",
      suggestion: runFirst && avg < 3 ? "Practice emphasis: tackling circuit for the second level; consider Tite to keep the ends in the B gaps and shorten the LBs' runs." : undefined,
    });
  }
  const rated = players.filter((p) => p.skills && Object.values(p.skills).some((v) => v != null)).length;
  if (rated < Math.min(6, players.length)) {
    findings.push({
      id: "ratings",
      check: "Skill ratings",
      status: "Needs Review",
      detail: `${rated} of ${players.length} players have football skill ratings. Personnel checks stay shallow until the starters are graded.`,
      affected: ["Player Profiles"],
      why: "Tackling, coverage, block shedding, pursuit, and IQ are what let the analyst say *who* creates the advantage or the problem — not just how many bodies are in the box.",
      suggestion: "Grade the eleven starters first (Player Profiles → Football Skills). Five clicks each.",
    });
  }

  // ---- 6. Depth chart integrity -------------------------------------------
  const starterIds = starters.map((e) => e.pl.id);
  const dupeIds = [...new Set(starterIds.filter((id, i) => starterIds.indexOf(id) !== i))];
  const unavailable = starters.filter((e) => e.pl.status !== "Healthy");
  const openIdx = structure.slots.map((_, i) => i).filter((i) => !(group.slots[i]?.length > 0));
  if (dupeIds.length) {
    findings.push({
      id: "depth",
      check: "Depth chart conflicts",
      status: "Potential Conflict",
      detail: `${dupeIds.map((id) => `${byId.get(id)?.name} starts at ${starters.filter((e) => e.pl.id === id).map((e) => label(e.slot)).join(" and ")}`).join("; ")}. One body can't own two spots.`,
      affected: dupeIds.flatMap((id) => starters.filter((e) => e.pl.id === id).map((e) => label(e.slot))),
      why: "Duplicate starters usually appear after a structure change. Fits and assignments key on the depth chart, so a doubled starter silently breaks both.",
      suggestion: "Open the Depth Chart, pick the true spot, and promote a backup at the other.",
    });
  } else if (unavailable.length) {
    findings.push({
      id: "depth",
      check: "Starter availability",
      status: "Needs Review",
      detail: `${unavailable.map((e) => `#${e.pl.jersey} ${e.pl.name} (${e.pl.status}) at ${label(e.slot)}`).join(", ")} — check before game day.`,
      affected: unavailable.map((e) => label(e.slot)),
      why: "An injured or limited starter changes who actually executes the rules on Friday.",
      suggestion: "Promote the #2 for the week, or update the status under Injuries if it's stale.",
    });
  } else if (openIdx.length) {
    findings.push({
      id: "depth",
      check: "Open positions",
      status: "Needs Review",
      detail: `${openIdx.length} spot${openIdx.length > 1 ? "s" : ""} in ${group.name} unassigned: ${openIdx.map(label).join(", ")}.`,
      affected: openIdx.map(label),
      why: "Rules need real bodies behind them before any fit analysis means anything.",
      suggestion: "Fill the open spots from the eligible list in the Depth Chart editor.",
    });
  } else {
    findings.push({
      id: "depth",
      check: "Depth chart",
      status: "Sound",
      detail: `All ${structure.slots.length} spots in ${group.name} filled, no duplicate or unavailable starters.`,
      why: "The people layer under the scheme is complete.",
    });
  }

  return { findings, groupName: group.name, structureName: structure.name };
}
