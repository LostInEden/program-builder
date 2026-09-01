// Defensive Analysis — deterministic checks over the saved defense.
// Considerations, not corrections: an intentional weakness created by the
// coach's philosophy is flagged, never changed.

import { getStructure } from "@/lib/football";
import { slotLabelOf, type Player, type PersonnelGroup, type Call, type Overrides, type SchemeRule } from "@/lib/store";

export type Status = "Sound" | "Needs Review" | "Potential Conflict";

export type Finding = {
  check: string;
  status: Status;
  detail: string;
  affected?: string[];
  why?: string; // deeper explanation for the detail view
  suggestion?: string; // small, practical adjustment using what the coach already carries
};

export function computeFindings(input: {
  groups: PersonnelGroup[];
  activeGroupId: string;
  players: Player[];
  scheme: { structureName: string; philosophy: string };
  calls: Call[];
  overrides: Overrides;
  schemeRules: SchemeRule[];
}): { findings: Finding[]; groupName: string; structureName: string } {
  const { groups, activeGroupId, players, scheme, calls, overrides, schemeRules } = input;
  const group = groups.find((g) => g.id === activeGroupId) ?? groups[0];
  const structure = getStructure(group.structureId);
  const byId = new Map(players.map((p) => [p.id, p]));
  const label = (i: number) => slotLabelOf(overrides, group.structureId, i);

  const findings: Finding[] = [];

  // 1. Run gaps / box numbers
  const frontIdx = structure.slots.map((s, i) => (s.level === "front" ? i : -1)).filter((i) => i >= 0);
  const secondIdx = structure.slots.map((s, i) => (s.level === "second" ? i : -1)).filter((i) => i >= 0);
  const boxCount = frontIdx.length + secondIdx.length;
  const gaps = 8;
  if (boxCount >= 7) {
    findings.push({
      check: "Run gaps / gap numbers",
      status: "Sound",
      detail: `${frontIdx.length} down (${frontIdx.map(label).join(", ")}) + ${secondIdx.length} second-level (${secondIdx.map(label).join(", ")}) = ${boxCount} potential fitters for ${gaps} gaps.`,
      why: "Against a two-back or TE-flex look the offense can create eight gaps (A/A/B/B/C/C/D/D). With seven or more box-capable defenders, every gap has an owner before a safety has to trigger.",
    });
  } else {
    findings.push({
      check: "Run gaps / gap numbers",
      status: "Needs Review",
      detail: `${structure.name} puts ${boxCount} defenders near the box for ${gaps} gaps — a safety must trigger as an extra fitter, or a gap is intentionally traded for coverage.`,
      affected: [...frontIdx, ...secondIdx].map(label),
      why: "A light box is a coverage-first tradeoff. It is only a problem if run-fit responsibilities don't name which safety replaces the missing fitter.",
      suggestion: "Confirm in the Playbook which safety is the extra fitter vs 2-back sets, or note the trade in your philosophy so it reads as intentional.",
    });
  }

  // 2. Numbers vs stated philosophy
  const wantsRunFirst = /run/i.test(scheme.philosophy);
  if (wantsRunFirst && boxCount < 7) {
    findings.push({
      check: "Defensive numbers vs philosophy",
      status: "Needs Review",
      detail: `Your philosophy says stop the run first, but ${group.name} (${structure.name}) is a light box.`,
      why: "The stated identity and the structure pull in different directions. That can be deliberate — flag, not a fault.",
      suggestion: "Either make a heavier package the base against run-first opponents, or add a rule (Rules & Adjustments) for when the extra fitter comes down.",
    });
  } else {
    findings.push({
      check: "Defensive numbers vs philosophy",
      status: "Sound",
      detail: wantsRunFirst
        ? `Run-first philosophy and ${boxCount} box-capable defenders in ${group.name} are consistent.`
        : "No numbers mismatch detected against the stated philosophy.",
      why: "The structure supports the identity you wrote down.",
    });
  }

  // 3. Coverage responsibilities
  const deepIdx = structure.slots.map((s, i) => (s.level === "deep" ? i : -1)).filter((i) => i >= 0);
  findings.push({
    check: "Coverage responsibilities",
    status: deepIdx.length >= 3 ? "Sound" : "Needs Review",
    detail:
      deepIdx.length >= 3
        ? `${deepIdx.length} secondary players available (${deepIdx.map(label).join(", ")}) — 5 immediate threats can be matched with a rotation.`
        : `Only ${deepIdx.length} secondary players in this structure; verify who carries #2 vertical and who owns the post.`,
    affected: deepIdx.length >= 3 ? undefined : deepIdx.map(label),
    why: "Five eligible receivers can release on any snap. The secondary plus overhangs must account for every vertical threat in your match rules (see the Coverage Library for who takes #2 vertical in each coverage).",
    suggestion:
      deepIdx.length >= 3 ? undefined : "Open the Coverage Library and confirm the #2-vertical rule for your base coverage, then note who owns the post in the Playbook assignment.",
  });

  // 4. Personnel conflicts in the depth chart (starters only — backups may repeat)
  const starterEntries = Object.entries(group.slots)
    .filter(([, ids]) => ids.length > 0)
    .map(([k, ids]) => ({ slot: Number(k), id: ids[0] }));
  const starterIds = starterEntries.map((e) => e.id);
  const dupeIds = [...new Set(starterIds.filter((id, i) => starterIds.indexOf(id) !== i))];
  const unavailable = starterEntries
    .map((e) => ({ ...e, pl: byId.get(e.id) }))
    .filter((e) => e.pl && e.pl.status !== "Healthy");
  const openIdx = structure.slots.map((_, i) => i).filter((i) => !(group.slots[i]?.length > 0));

  if (dupeIds.length) {
    findings.push({
      check: "Conflict / weak points",
      status: "Potential Conflict",
      detail: `${dupeIds
        .map((id) => {
          const spots = starterEntries.filter((e) => e.id === id).map((e) => label(e.slot));
          return `${byId.get(id)?.name} is the starter at ${spots.join(" and ")}`;
        })
        .join("; ")}. One body can't own two spots on the same snap.`,
      affected: dupeIds.flatMap((id) => starterEntries.filter((e) => e.id === id).map((e) => label(e.slot))),
      why: "Duplicate starters usually appear after a structure change or import. The depth chart drives fits and assignments, so a doubled starter silently breaks both.",
      suggestion: "Open the Depth Chart, pick which spot the player truly starts at, and promote a backup at the other.",
    });
  } else if (unavailable.length) {
    findings.push({
      check: "Conflict / weak points",
      status: "Needs Review",
      detail: `${unavailable.map((e) => `#${e.pl!.jersey} ${e.pl!.name} (${e.pl!.status}) at ${label(e.slot)}`).join(", ")} — check availability before game day.`,
      affected: unavailable.map((e) => label(e.slot)),
      why: "An injured or limited starter changes who actually executes the rules on Friday.",
      suggestion: "Promote the #2 for the week (Depth Chart) or update the player's status if it's stale (Injuries).",
    });
  } else if (openIdx.length > 0) {
    findings.push({
      check: "Conflict / weak points",
      status: "Needs Review",
      detail: `${openIdx.length} position${openIdx.length > 1 ? "s" : ""} in ${group.name} unassigned: ${openIdx.map(label).join(", ")}.`,
      affected: openIdx.map(label),
      why: "Pressure paths and coverage rules need real bodies behind them before the analysis of fits means anything.",
      suggestion: "Fill the open spots from the eligible list in the Depth Chart editor.",
    });
  } else {
    findings.push({
      check: "Conflict / weak points",
      status: "Sound",
      detail: `No duplicate starters, no unavailable starters, all ${structure.slots.length} spots filled in ${group.name}.`,
      why: "The people layer under your scheme is complete and available.",
    });
  }

  // 5. Pre/post-snap rules
  const checkCalls = calls.filter((c) => c.section === "Checks & Adjustments");
  const ruleCount = schemeRules.filter((r) => r.trigger.trim() && r.result.trim()).length;
  findings.push({
    check: "Pre/post-snap rules",
    status: checkCalls.length > 0 || ruleCount > 0 ? "Sound" : "Needs Review",
    detail:
      checkCalls.length > 0 || ruleCount > 0
        ? `${ruleCount} structured rule${ruleCount === 1 ? "" : "s"} (Trigger → Action → Result) and ${checkCalls.length} check/adjustment call${checkCalls.length === 1 ? "" : "s"} stored${checkCalls.length ? `: ${checkCalls.map((c) => c.name).join(", ")}` : ""}.`
        : "No checks, adjustments, or structured rules stored yet — motion and unbalanced sets currently have no automatic answer.",
    affected: checkCalls.length > 0 || ruleCount > 0 ? undefined : ["Rules & Adjustments", "Checks & Adjustments"],
    why: "Offenses use motion and formation strength to force late decisions. Structured rules are what let the software (and your players) answer without a timeout.",
    suggestion:
      checkCalls.length > 0 || ruleCount > 0 ? undefined : "Add your first rule on My Scheme (e.g. “TE + 2 strong → Change front → Over”) or load the Motion Bump preset in the Playbook.",
  });

  return { findings, groupName: group.name, structureName: structure.name };
}
