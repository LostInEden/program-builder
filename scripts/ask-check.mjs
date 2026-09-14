// Verification script — NOT shipped in the app.
// Runs the coach's ten example questions (Q41) through the CounterScheme chat
// router against his real Hudl export and prints the reply, the "Go deeper"
// breakdown and the links each one comes back with. Also checks the Q50 routes:
// the Fundamentals finding and the "should we add X?" answer.
//
//   & "C:\Program Files\nodejs\node.exe" scripts/ask-check.mjs

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
const P = await jiti.import(path.join(root, "src/lib/principles.ts"));

const csvPath = process.argv[2] ?? path.join(root, "docs/coach-answers/hudl-playlist-sample.csv");
const parsed = Papa.parse(fs.readFileSync(csvPath, "utf8"), { header: true, skipEmptyLines: true });
const plays = T.rowsToPlays(parsed.data, T.guessMapping((parsed.meta.fields ?? []).filter((h) => h && h.trim())));

const st = S.useStore.getState();
const opponent = {
  ...S.emptyOpponent("opp-check", "Westview"),
  ...T.headlineFromPlays(plays),
  plays,
  week: 4,
  tempo: "Fast",
  keyPlayers: [{ id: "kp-1", jersey: "22", name: "M. Johnson", pos: "RB", notes: "One-cut zone back, everything goes through him" }],
};
const base = {
  scheme: st.scheme, concepts: st.concepts, players: st.players, groups: st.groups,
  activeGroupId: st.activeGroupId, overrides: st.overrides, termMap: [], program: st.program,
  opponent, week: 4, page: "/chat",
};
const plan = { opponentId: opponent.id, ...(await A.localProvider.gamePlan(opponent, base, AN.computeFindings(base).findings)) };
const ctx = { ...base, plan };

const line = (s = "") => console.log(s);
const wrap = (s, w = 108) => {
  const out = [];
  for (const para of String(s).split("\n")) {
    let cur = "";
    for (const word of para.split(/\s+/)) {
      if ((cur + " " + word).trim().length > w) { out.push(cur.trim()); cur = word; } else cur += ` ${word}`;
    }
    out.push(cur.trim());
  }
  return out.filter(Boolean);
};

line(`file: ${path.relative(root, csvPath)} — ${plays.length} offensive snaps`);
line(`defense on file: ${st.concepts.filter((c) => c.confirmed).length} confirmed calls`);

for (const [i, q] of A.COACH_QUESTIONS.entries()) {
  const res = await A.localProvider.chat(q, ctx);
  line();
  line(`${String(i + 1).padStart(2)}. COACH: ${q}`);
  for (const l of wrap(res.reply.text)) line(`    ${l}`);
  if (res.reply.deeper) {
    line("    -- Go deeper --");
    for (const l of wrap(res.reply.deeper)) line(`       ${l}`);
  }
  const acts = (res.reply.actions ?? []).map((a) => `${a.label} → ${a.href}`);
  if (acts.length) line(`    [${acts.join("] [")}]`);
}

line();
line("== Q50 =====================================================");
const load = P.callLoad(st.concepts);
line(`call load: ${load.active} live / ${load.backPocket} back pocket (budget ${load.budget}, over=${load.over})`);
const fund = AN.computeFindings(base).findings.find((f) => f.id === "fundamentals");
line(`Fundamentals finding [${fund.status}]:`);
for (const l of wrap(fund.detail)) line(`   ${l}`);
for (const b of fund.breakdown ?? []) line(`   · ${b}`);
if (fund.suggestion) for (const l of wrap(`→ ${fund.suggestion}`)) line(`   ${l}`);

for (const q of ["Should we add another coverage this week?", "Can we install a new pressure for Friday?"]) {
  const res = await A.localProvider.chat(q, ctx);
  line();
  line(`COACH: ${q}`);
  for (const l of wrap(res.reply.text)) line(`   ${l}`);
}
line();
