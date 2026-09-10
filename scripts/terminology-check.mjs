// Verification script — NOT shipped in the app.
// Runs the coach's real Hudl export through the knowledge base and prints which
// of their tags CounterScheme reads on its own and which ones it would ask
// about (Q27).
//
//   & "C:\Program Files\nodejs\node.exe" scripts/terminology-check.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createJiti } from "jiti";
import Papa from "papaparse";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const jiti = createJiti(import.meta.url, { alias: { "@": path.join(root, "src") } });

const T = await jiti.import(path.join(root, "src/lib/tendencies.ts"));
const K = await jiti.import(path.join(root, "src/lib/knowledge.ts"));

const csvPath = process.argv[2] ?? path.join(root, "docs/coach-answers/hudl-playlist-sample.csv");
const parsed = Papa.parse(fs.readFileSync(csvPath, "utf8"), { header: true, skipEmptyLines: true });
const headers = (parsed.meta.fields ?? []).filter((h) => h && h.trim());
const plays = T.rowsToPlays(parsed.data, T.guessMapping(headers));

const line = (s = "") => console.log(s);
const rule = (t) => { line(); line(`== ${t} ${"=".repeat(Math.max(0, 60 - t.length))}`); };

const FIELDS = [
  ["formation", "formation", (p) => p.formation],
  ["play", "concept", (p) => p.play],
  ["backfield", "backfield", (p) => p.backfield],
  ["motion", "concept", (p) => p.motion],
];

let read = 0;
let ask = 0;
for (const [name, kind, of] of FIELDS) {
  const counts = new Map();
  for (const p of plays) {
    const t = T.tag(of(p));
    if (t) counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  if (!counts.size) continue;
  rule(`${name.toUpperCase()} TAGS (${counts.size} distinct)`);
  for (const [t, n] of [...counts.entries()].sort((a, b) => b[1] - a[1])) {
    const r = K.resolveTag(t, [], kind);
    const ok = r.source !== "unknown" && !r.unknownWords.length;
    if (ok) read += n; else ask += n;
    line(`  ${ok ? "OK  " : "ASK "} ${String(n).padStart(3)}x ${t.padEnd(26)} ${r.meaning ?? "(no read)"}${r.unknownWords.length ? `   << ${r.unknownWords.join(", ")}` : ""}`);
  }
}

rule("WHAT COUNTERSCHEME WOULD ASK");
const unknown = T.unknownTerms(plays, []);
for (const u of unknown) line(`  ${String(u.count).padStart(3)} snaps  ${u.term.padEnd(12)} (${u.field}) — in ${u.tags.join(", ")}`);
line();
line(`tags read on their own: ${read} · tags needing a word from the coach: ${ask} · questions to ask: ${unknown.length}`);
