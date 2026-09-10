// Verification script — NOT shipped in the app.
// Runs a week's worth of real coach sentences through the ONE CounterScheme
// conversation router and prints where each one landed and what came back.
//
//   & "C:\Program Files\nodejs\node.exe" scripts/chat-check.mjs

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
const AN = await jiti.import(path.join(root, "src/lib/analyze.ts"));

const csvPath = process.argv[2] ?? path.join(root, "docs/coach-answers/hudl-playlist-sample.csv");
const parsed = Papa.parse(fs.readFileSync(csvPath, "utf8"), { header: true, skipEmptyLines: true });
const plays = T.rowsToPlays(parsed.data, T.guessMapping((parsed.meta.fields ?? []).filter((h) => h && h.trim())));

const st = S.useStore.getState();
const opponent = {
  ...S.emptyOpponent("opp-check", "Westview"),
  ...T.headlineFromPlays(plays),
  week: 4,
  tempo: "Fast",
  keyPlayers: [{ id: "kp-1", jersey: "22", name: "M. Johnson", pos: "RB", notes: "One-cut zone back" }],
};
const base = {
  scheme: st.scheme, concepts: st.concepts, players: st.players, groups: st.groups,
  activeGroupId: st.activeGroupId, overrides: st.overrides, termMap: [], program: st.program,
  opponent, week: 4, page: "/chat",
};
const plan = { opponentId: opponent.id, ...(await A.localProvider.gamePlan(opponent, base, AN.computeFindings(base).findings)) };
const ctx = { ...base, plan };

const INPUTS = [
  "hey",
  "Against 12 personnel we check to Over front.",
  "On 3rd and long we play Cover 1 Robber.",
  "What does Utah mean?",
  "Dallas is Snag",
  "What do they run on 3rd down?",
  "Who are their best players?",
  "What personnel do they live in?",
  `Why is that the answer — ${(plan.threats[0] ?? plan.priorities[0])?.text ?? "the top tendency"}?`,
  "What are we repping this week?",
  "Teach a rule",
  "Should we bring pressure on early downs?",
];

const line = (s = "") => console.log(s);
for (const input of INPUTS) {
  const res = await A.localProvider.chat(input, ctx);
  line();
  line(`COACH: ${input}`);
  line(`  CS: ${res.reply.text}`);
  const acts = (res.reply.actions ?? []).map((a) => `${a.label} → ${a.href}`);
  if (acts.length) line(`  [${acts.join("] [")}]`);
  const fx = [];
  if (res.sideEffects.concepts?.length) fx.push(`files ${res.sideEffects.concepts.length} concept(s): ${res.sideEffects.concepts.map((c) => c.name).join(", ")}`);
  if (res.sideEffects.termMapping) fx.push(`remembers "${res.sideEffects.termMapping.term}"`);
  if (res.sideEffects.question) fx.push("logged in Recent Questions");
  if (fx.length) line(`  (${fx.join("; ")})`);
}
line();
