// Verification script — NOT shipped in the app.
// Builds the game-day Call Sheet (Q45) off the coach's real Hudl export plus the
// seeded defense, prints it the way it prints on paper, and checks the layout
// rules: reorder, hide, rename, custom sections, and that the coach's own lines
// survive a regenerated game plan.
//
//   & "C:\Program Files\nodejs\node.exe" scripts/callsheet-check.mjs

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
const CS = await jiti.import(path.join(root, "src/lib/callsheet.ts"));

const csvPath = process.argv[2] ?? path.join(root, "docs/coach-answers/hudl-playlist-sample.csv");
const parsed = Papa.parse(fs.readFileSync(csvPath, "utf8"), { header: true, skipEmptyLines: true });
const headers = (parsed.meta.fields ?? []).filter((h) => h && h.trim());
const plays = T.rowsToPlays(parsed.data, T.guessMapping(headers));

const st = S.useStore.getState();
const opponent = {
  ...S.emptyOpponent("opp-check", "Sample Opponent"),
  ...T.headlineFromPlays(plays),
  plays,
  keyPlayers: [{ id: "kp-1", jersey: "22", name: "M. Johnson", pos: "RB", notes: "One-cut zone back" }],
};
const ctx = {
  scheme: st.scheme, concepts: st.concepts, players: st.players,
  groups: st.groups, activeGroupId: st.activeGroupId, overrides: st.overrides, termMap: [],
};
const plan = { opponentId: opponent.id, ...(await A.localProvider.gamePlan(opponent, ctx, AN.computeFindings(ctx).findings)) };

const line = (s = "") => console.log(s);
const rule = (t) => { line(); line(`== ${t} ${"=".repeat(Math.max(0, 62 - t.length))}`); };

const show = (sheet) => {
  for (const s of CS.renderCallSheet({ sheet, concepts: st.concepts, plan, plays, termMap: [] })) {
    if (!s.enabled) { line(`\n[hidden] ${s.title}`); continue; }
    rule(s.title.toUpperCase());
    if (!s.blocks.length) { line("  (nothing yet — stays off the paper)"); continue; }
    for (const b of s.blocks) {
      if (b.heading) line(`  -- ${b.heading}`);
      for (const l of b.lines) line(`     ${l.text}${l.note ? ` — ${l.note}` : ""}${l.tag ? `   [${l.tag}]` : ""}`);
    }
  }
};

line(`file: ${path.relative(root, csvPath)} — ${plays.length} offensive snaps`);
const sheet = CS.defaultCallSheet();
show(sheet);

rule("LAYOUT RULES");
const moved = CS.moveSection(sheet.sections, "tells", -1);
line(`moved tells up:   ${moved.map((s) => s.id).join(" > ")}`);
const renamed = moved.map((s) => (s.id === "notes" ? { ...s, title: "Friday Reminders", lines: ["First series: check the tight end", "Reset the strength call after every first down"] } : s));
const hidden = renamed.map((s) => (s.id === "menu" ? { ...s, enabled: false } : s));
const withCustom = CS.renumber([...hidden, CS.customSection(hidden.length)]);
const mine = withCustom.map((s) => (s.key === "custom" ? { ...s, title: "Openers", lines: ["Tite / Cover 4", "Over / Robber"] } : s));
show({ columns: 3, sections: mine });

rule("COACH CONTENT SURVIVES A NEW GAME PLAN");
const plan2 = { opponentId: opponent.id, ...(await A.localProvider.gamePlan({ ...opponent, notes: "new film" }, ctx, AN.computeFindings(ctx).findings)) };
const after = CS.renderCallSheet({ sheet: { columns: 3, sections: mine }, concepts: st.concepts, plan: plan2, plays, termMap: [] });
const notes = after.find((s) => s.id === "notes");
const openers = after.find((s) => s.key === "custom");
line(`his notes intact:    ${notes.title === "Friday Reminders"} / ${notes.blocks[0]?.lines.length === 2}`);
line(`his section intact:  ${openers.title === "Openers"} / ${openers.blocks[0]?.lines.length === 2}`);
line(`menu still hidden:   ${after.find((s) => s.id === "menu").enabled === false}`);
line(`plan section reran:  ${CS.sectionLineCount(after.find((s) => s.id === "plan")) > 0}`);

rule("HEALING A SAVED LAYOUT");
const old = { columns: 2, sections: [{ id: "notes", key: "notes", title: "Mine", lines: ["x"], enabled: true, order: 0 }] };
const healed = CS.withDefaults(old);
line(`sections: ${healed.sections.map((s) => `${s.id}(${s.order})`).join(" ")}`);
line(`his section stayed first: ${healed.sections[0].id === "notes" && healed.sections[0].title === "Mine"}`);
