// Verification script — NOT shipped in the app.
// Runs the coach's real Hudl export through the import mapping, the game plan,
// and the practice pool, then prints the candidate reps and the week's script.
//
//   & "C:\Program Files\nodejs\node.exe" scripts/practice-check.mjs

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
const PR = await jiti.import(path.join(root, "src/lib/practice.ts"));
const AN = await jiti.import(path.join(root, "src/lib/analyze.ts"));

const csvPath = process.argv[2] ?? path.join(root, "docs/coach-answers/hudl-playlist-sample.csv");
const parsed = Papa.parse(fs.readFileSync(csvPath, "utf8"), { header: true, skipEmptyLines: true });
const headers = (parsed.meta.fields ?? []).filter((h) => h && h.trim());
const plays = T.rowsToPlays(parsed.data, T.guessMapping(headers));

const st = S.useStore.getState();
const opponent = {
  ...S.emptyOpponent("opp-check", "Sample Opponent"),
  ...T.headlineFromPlays(plays),
  tempo: "Fast",
};
const ctx = {
  scheme: st.scheme, concepts: st.concepts, players: st.players,
  groups: st.groups, activeGroupId: st.activeGroupId, overrides: st.overrides, termMap: [],
};

const plan = await A.localProvider.gamePlan(opponent, ctx, AN.computeFindings(ctx).findings);
const pool = await A.localProvider.practicePool(opponent, ctx, plan);

const line = (s = "") => console.log(s);
const rule = (t) => { line(); line(`== ${t} ${"=".repeat(Math.max(0, 62 - t.length))}`); };
const pc = (v) => (v == null ? "—" : `${Math.round(v * 100)}%`);

line(`file: ${path.relative(root, csvPath)} — ${plays.length} offensive snaps`);
line(`pool: ${pool.reps.length} candidate reps (${pool.reps.filter((r) => r.recommended).length} suggested, cap ${pool.cap.low}-${pool.cap.high})`);
if (pool.warning) line(`note: ${pool.warning}`);

rule("CANDIDATE REPS (top 16 by frequency x success x stress)");
pool.reps.slice(0, 16).forEach((r, i) => {
  const detail = [
    r.personnel && `${r.personnel} pers`, r.formation, r.backfield && `${r.backfield} bf`,
    r.play, r.direction, r.hash, r.situation, r.downDistance && `(${r.downDistance})`,
  ].filter(Boolean).join(" · ");
  line(`${String(i + 1).padStart(2)}. [${r.kind}] ${r.recommended ? "IN " : "   "}${detail || "(untagged)"}`);
  line(`     why: ${r.why}`);
  line(`     ${r.stats.n} snaps · ${pc(r.stats.runRate)} run · ${r.stats.avgGain?.toFixed(1) ?? "—"} yds · ${r.stats.explosive} explosive · score ${r.score.toFixed(2)}`);
  line(`     ${r.hasAnswer ? "call" : "NO ANSWER"}: ${r.answer ?? "—"}`);
  line(`     scout: ${r.note}`);
});

const sel = PR.pruneSelection(PR.emptySelection(), pool);
const summary = PR.poolSummary(pool, sel);
rule("DEFAULT SELECTION");
line(`${summary.chosen} of ${summary.total} reps · ${summary.covered} with a call on file · ${summary.gaps} gaps · ${summary.snapsCovered} of ${plays.length} snaps covered · over cap: ${summary.overCap}`);

rule("THE WEEK");
for (const d of PR.buildScript(pool, sel)) {
  const byId = new Map(pool.reps.map((r) => [r.id, r]));
  line(`${d.label} — ${d.tempo}: ${d.purpose}`);
  line(`  ${d.presentation}`);
  d.repIds.forEach((id, i) => {
    const r = byId.get(id);
    line(`  ${String(i + 1).padStart(2)}. ${[r.play || r.formation || `${r.personnel} personnel`, r.personnel, r.backfield, r.situation].filter(Boolean).join(" · ")}${r.kind !== "look" ? `  [${r.kind}]` : ""}`);
  });
  line();
}

rule("SCOUT CARDS");
for (const c of PR.scoutCards(pool, sel).slice(0, 3)) {
  line(`card ${c.number} (${c.days.join(", ") || "not scripted"}) — ${c.rep.play || c.rep.formation}`);
  line(`  personnel ${c.rep.personnel || "—"} · formation ${c.rep.formation || "—"}${c.rep.formationMeaning ? ` (${c.rep.formationMeaning})` : ""} · backfield ${c.rep.backfield || "—"}`);
  line(`  motion ${c.rep.motion || "—"} · dir ${c.rep.direction || "—"} · hash ${c.rep.hash || "—"} · ${c.rep.situation || "—"} ${c.rep.downDistance || ""}`);
  line(`  note: ${c.rep.note}`);
  line(`  call: ${c.rep.answer ?? "—"}`);
}

rule("PLAN STATUS 5 & 6");
const P = await jiti.import(path.join(root, "src/lib/plan.ts"));
const script = PR.buildScript(pool, sel);
const progress = { reps: pool.reps.length, chosen: summary.chosen, scripted: PR.scriptHasReps(script) };
for (const s of P.planSteps(opponent, plan, 0, T.computeTells(plays).actionable.length, progress).slice(4, 6)) {
  line(`${s.n}. [${s.done ? "x" : " "}] ${s.label} — ${s.detail}`);
}
