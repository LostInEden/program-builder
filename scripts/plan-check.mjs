// Verification script — NOT shipped in the app.
// Runs the coach's real Hudl export through the import mapping, the tendency
// engine, and the Game Plan v2 generator, and prints the plan CounterScheme
// would put in front of him.
//
//   & "C:\Program Files\nodejs\node.exe" scripts/plan-check.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createJiti } from "jiti";
import Papa from "papaparse";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const jiti = createJiti(import.meta.url, { alias: { "@": path.join(root, "src") } });

const T = await jiti.import(path.join(root, "src/lib/tendencies.ts"));
const S = await jiti.import(path.join(root, "src/lib/store.ts"));
const A = await jiti.import(path.join(root, "src/lib/ai/local.ts"));
const P = await jiti.import(path.join(root, "src/lib/plan.ts"));
const AN = await jiti.import(path.join(root, "src/lib/analyze.ts"));

const csvPath = process.argv[2] ?? path.join(root, "docs/coach-answers/hudl-playlist-sample.csv");
const parsed = Papa.parse(fs.readFileSync(csvPath, "utf8"), { header: true, skipEmptyLines: true });
const headers = (parsed.meta.fields ?? []).filter((h) => h && h.trim());
const plays = T.rowsToPlays(parsed.data, T.guessMapping(headers));

const st = S.useStore.getState();
const opponent = {
  ...S.emptyOpponent("opp-check", "Sample Opponent"),
  ...T.headlineFromPlays(plays),
  keyPlayers: [{ id: "kp-1", jersey: "22", name: "M. Johnson", pos: "RB", notes: "One-cut zone back" }],
  tempo: "Fast",
  notes: "From the real Hudl export.",
};
const ctx = {
  scheme: st.scheme, concepts: st.concepts, players: st.players,
  groups: st.groups, activeGroupId: st.activeGroupId, overrides: st.overrides, termMap: [],
};

const findings = AN.computeFindings(ctx).findings;
const plan = await A.localProvider.gamePlan(opponent, ctx, findings);

const line = (s = "") => console.log(s);
const rule = (t) => { line(); line(`== ${t} ${"=".repeat(Math.max(0, 62 - t.length))}`); };

line(`file: ${path.relative(root, csvPath)} — ${plays.length} offensive snaps`);
line(`saved defense: ${st.concepts.filter((c) => c.confirmed).length} concepts (${st.concepts.filter((c) => (c.status ?? "active") === "backPocket").length} back pocket)`);

for (const [key, title] of [
  ["priorities", "PRIORITIES"],
  ["bestPlayers", "THEIR BEST PLAYERS"],
  ["threats", "TOP THREATS & TELLS (answer inside our system)"],
  ["concerns", "CONCERNS"],
  ["adjustments", "SMALL ADJUSTMENTS"],
  ["emphasis", "PRACTICE EMPHASIS"],
]) {
  rule(title);
  const rows = plan[key] ?? [];
  if (!rows.length) line("  (none)");
  rows.forEach((it, i) => {
    line(`${String(i + 1).padStart(2)}. ${it.text}`);
    if (it.sub) line(`    -> ${it.sub}`);
    if (it.evidence) line(`    [evidence] ${it.evidence.summary}: ${it.evidence.n} snaps, ${Math.round(it.evidence.rate * 100)}%${it.evidence.baseline != null ? ` vs ${Math.round(it.evidence.baseline * 100)}% baseline` : ""}, plays ${it.evidence.playIds.map((id) => plays.find((p) => p.id === id)?.num).join(",")}`);
    if (it.conceptIds?.length) line(`    [calls] ${it.conceptIds.map((id) => st.concepts.find((c) => c.id === id)?.name ?? id).join(", ")}`);
    if (it.personnel) line(`    [personnel] ${it.personnel}`);
    line(`    [source] ${it.source}${it.edited ? " (edited)" : ""}  id=${it.id}`);
  });
}

rule("MERGE RULE CHECK");
const stored = { opponentId: "opp-check", ...plan };
// The coach edits one generated line and adds one of his own.
stored.threats = stored.threats.map((it, i) => (i === 0 ? { ...it, text: `${it.text} — COACH EDIT`, edited: true } : it));
stored.threats.push({ id: "coach-1", text: "Watch the backside guard", sub: "He tips the pull", source: "coach" });
const again = await A.localProvider.gamePlan(opponent, ctx, findings);
const merged = P.mergeGamePlan(stored, again, "hash-1");
line(`threats after regenerate: ${merged.threats.length}`);
merged.threats.forEach((it) => line(`  [${it.source}${it.edited ? "/edited" : ""}] ${it.text.slice(0, 78)}`));
line(`coach line survived: ${merged.threats.some((t) => t.id === "coach-1")}`);
line(`edited line survived: ${merged.threats.some((t) => t.edited && /COACH EDIT/.test(t.text))}`);
line(`no duplicate of the edited line: ${merged.threats.filter((t) => t.id === stored.threats[0].id).length === 1}`);

rule("INPUT HASH (Q33)");
const h1 = P.planInputHash(opponent, st.concepts, []);
const h2 = P.planInputHash(opponent, st.concepts, []);
const h3 = P.planInputHash({ ...opponent, notes: "changed" }, st.concepts, []);
line(`stable: ${h1 === h2}   changes with the data: ${h1 !== h3}   (${h1} / ${h3})`);

rule("PLAN STATUS (Q40)");
for (const s of P.planSteps(opponent, { ...stored, generatedAt: Date.now() }, 0, T.computeTells(plays).actionable.length)) {
  line(`  ${s.n}. ${s.done ? "[x]" : "[ ]"} ${s.label.padEnd(30)} ${s.detail}`);
}

rule("LIVING PLAN (Q47)");
// A MAJOR change — fewer snaps on file — must stage a review, not overwrite.
const fewer = { ...opponent, plays: plays.slice(0, 60) };
const major1 = P.majorInputHash(opponent, st.concepts);
const major2 = P.majorInputHash(fewer, st.concepts);
line(`major hash moves when the snaps do: ${major1 !== major2}`);
line(`major hash ignores a note: ${major1 === P.majorInputHash({ ...opponent, notes: "changed" }, st.concepts)}`);
const redraft = await A.localProvider.gamePlan(fewer, ctx, findings);
const changes = P.diffPlan(stored, redraft, []);
line(`staged lines: ${changes.length} (add ${changes.filter((c) => c.kind === "add").length}, replace ${changes.filter((c) => c.kind === "replace").length}, drop ${changes.filter((c) => c.kind === "remove").length})`);
line(`nothing staged against a coach or edited line: ${changes.every((c) => !(c.prev && (c.prev.source === "coach" || c.prev.edited)))}`);
const first = changes[0];
if (first) {
  const accepted = { ...stored, ...P.applyChange(stored, first) };
  const kept = { ...stored, ...P.keepMine(stored, first) };
  const inAccepted = (accepted[first.section] ?? []).find((it) => it.id === first.id);
  line(`accept applies the new line: ${first.kind === "remove" ? !inAccepted : inAccepted?.text === first.item.text}`);
  line(`keep mine protects it forever: ${first.kind === "add" ? (kept.declined ?? []).includes(first.id) : !!(kept[first.section] ?? []).find((it) => it.id === first.id)?.edited}`);
}
const all = { ...stored, ...P.applyAll(stored, { changes, createdAt: 0, reason: "", inputHash: "h2", majorHash: major2 }) };
line(`accept all leaves no staged line behind: ${P.diffPlan(all, redraft, []).length === 0}`);
line(`coach line still there after accept all: ${all.threats.some((t) => t.id === "coach-1")}`);

rule("NO FORCED COUNTS (Q44)");
const bare = { ...opponent, plays: [], keyPlayers: [], matchupNotes: [], formations: [], concepts: [], personnelUsage: [], notes: "", redZone: "" };
const barePlan = await A.localProvider.gamePlan(bare, ctx, findings);
for (const k of ["priorities", "bestPlayers", "threats", "concerns", "adjustments", "emphasis"]) {
  line(`  ${k.padEnd(12)} ${(barePlan[k] ?? []).length} line(s)${(barePlan[k] ?? []).length ? ` — ${barePlan[k][0].text.slice(0, 60)}` : ""}`);
}
