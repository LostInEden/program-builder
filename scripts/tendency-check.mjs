// Verification script — NOT shipped in the app.
// Runs the coach's real Hudl export through the exact same column mapping and
// tendency engine the app uses, and prints what CounterScheme would say.
//
//   & "C:\Program Files\nodejs\node.exe" scripts/tendency-check.mjs
//   (optionally pass a different CSV path as the first argument)

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createJiti } from "jiti";
import Papa from "papaparse";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const jiti = createJiti(import.meta.url, { alias: { "@": path.join(root, "src") } });

const T = await jiti.import(path.join(root, "src/lib/tendencies.ts"));

const csvPath = process.argv[2] ?? path.join(root, "docs/coach-answers/hudl-playlist-sample.csv");
const csv = fs.readFileSync(csvPath, "utf8");
const parsed = Papa.parse(csv, { header: true, skipEmptyLines: true });
const headers = (parsed.meta.fields ?? []).filter((h) => h && h.trim());

const map = T.guessMapping(headers);
const plays = T.rowsToPlays(parsed.data, map);
const r = T.tendencyReport(plays);
const head = T.headlineFromPlays(plays);

const pct = (v) => (v == null ? "—" : `${Math.round(v * 100)}%`);
const line = (s = "") => console.log(s);
const rule = (t) => { line(); line(`== ${t} ${"=".repeat(Math.max(0, 60 - t.length))}`); };

rule("MAPPING");
line(`file: ${path.relative(root, csvPath)}  (${parsed.data.length} rows)`);
for (const f of T.PLAY_FIELDS) line(`  ${f.key.padEnd(11)} -> ${map[f.key] ?? "(not in file)"}`);
const unmapped = headers.filter((h) => !Object.values(map).includes(h));
line(`  unmapped -> extra: ${unmapped.length ? unmapped.join(", ") : "(none)"}`);

rule("HEADLINE");
line(`offensive snaps kept: ${plays.length}`);
line(`run/pass tagged: ${r.summary.plays}  (${r.summary.runs} run / ${r.summary.passes} pass)`);
line(`run rate: ${head.runRate}%   1st-down run: ${head.firstDownRun}%   RPO: ${head.rpoRate ?? "—"}%`);
line(`most-called play: ${head.signatureConcept || "—"} (${head.signatureRate ?? "—"}% of snaps)`);
line(`avg gain: ${r.summary.avgGain?.toFixed(2)}   explosive: ${r.summary.explosive}   negative: ${r.summary.negative}   TDs: ${r.summary.tds}   turnovers: ${r.summary.turnovers}`);
line(`success rate: ${pct(r.summary.successRate)}`);

rule("SITUATIONS (coach's table)");
for (const s of r.situations) {
  line(`  ${(`${s.situation.group} & ${s.situation.range} ${s.situation.label}`).padEnd(30)} n=${String(s.n).padStart(3)}  run ${pct(s.runRate).padStart(4)}  ${s.avgGain?.toFixed(1).padStart(5) ?? "   — "} yds  top: ${s.topFormation?.name ?? "—"}`);
}

rule("DOWN x DISTANCE GRID (run %)");
for (const [down, row] of Object.entries(head.downDistance)) {
  line(`  ${down.padEnd(4)} ${Object.entries(row).map(([k, v]) => `${k}: ${v == null ? "—" : `${v}%`}`).join("   ")}`);
}

rule(`TELLS — WORTH AN ANSWER (${r.actionable.length})`);
r.actionable.slice(0, 12).forEach((t, i) => {
  line(`${String(i + 1).padStart(2)}. ${T.tellSentence(t)}`);
  line(`    n=${t.n}  hits=${t.hits}  lift=+${Math.round(t.lift * 100)}pts  score=${t.score.toFixed(2)}`);
  line(`    evidence plays: ${t.playIds.map((id) => plays.find((p) => p.id === id)?.num).join(", ")}`);
});

rule(`TELLS — INTERESTING (${r.interesting.length}, showing 10)`);
r.interesting.slice(0, 10).forEach((t, i) => line(`${String(i + 1).padStart(2)}. ${T.tellSentence(t)}   [n=${t.n}]`));

rule("FORMATIONS BY PERSONNEL");
for (const g of r.personnel) {
  line(`  ${g.personnel} — ${g.n} snaps (${Math.round(g.pct * 100)}%)`);
  for (const f of g.formations.slice(0, 12)) {
    line(`     ${f.name.padEnd(26)} n=${String(f.n).padStart(2)}  run ${pct(f.runRate).padStart(4)}  ${f.avgGain?.toFixed(1).padStart(5) ?? "   — "} yds  top play: ${f.topPlay?.name ?? "—"}`);
  }
}

rule("BEST PLAYS");
line("  by frequency:");
for (const p of r.best.byFrequency.slice(0, 10)) line(`     ${p.name.padEnd(16)} ${String(p.n).padStart(2)}x  ${p.avgGain?.toFixed(1) ?? "—"} yds  ${p.type}`);
line("  by success (3+ snaps):");
for (const p of r.best.bySuccess.slice(0, 10)) line(`     ${p.name.padEnd(16)} ${String(p.n).padStart(2)}x  ${p.avgGain?.toFixed(1) ?? "—"} yds  explosive ${p.explosive}`);

rule("KEY PLAYER USAGE");
if (!r.players.length) line("  (nobody tagged with the ball in this export — expected: PLAYER is blank on all 85 rows)");
for (const p of r.players.slice(0, 10)) line(`  ${p.player.padEnd(14)} touches=${p.touches} share=${Math.round(p.share * 100)}% avg=${p.avgGain?.toFixed(1) ?? "—"}`);

rule("HAND-CHECK HELPERS");
const counted = plays.filter((p) => p.playType);
line(`raw run count  = ${counted.filter((p) => p.playType === "Run").length} / ${counted.length} run-or-pass snaps`);
const firsts = counted.filter((p) => p.down === 1);
line(`1st-down snaps = ${firsts.length}, of which run = ${firsts.filter((p) => p.playType === "Run").length}`);
const wing = plays.filter((p) => T.tag(p.formation) === "WING TWINS");
line(`WING TWINS snaps = ${wing.length}: ${wing.map((p) => `#${p.num} ${p.playType || "?"}/${T.sideOf(p.direction) || "?"}`).join(", ")}`);
const proWing = plays.filter((p) => T.tag(p.formation) === "PRO WING");
line(`PRO WING snaps  = ${proWing.length}: ${proWing.map((p) => `#${p.num} ${p.playType || "?"}`).join(", ")}`);
