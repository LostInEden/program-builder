# CounterScheme — Build Brief (2026-09-10)

Shared brief for every agent working this build. Read fully before touching code.

## Context you must load first
- `HANDOFF.md` (project context; §1a is the current V1 architecture).
- `docs/coach-answers/q01-10.txt`, `q21-30.txt`, `q31-40.txt` — the coach's answers. They are the spec. Where they conflict with anything in the app today, the answers win.
- `docs/coach-answers/hudl-playlist-sample.csv` — a REAL Hudl play-by-play export (85 snaps). Columns: `PLAY #, ODK, PERSONNEL, BACKFIELD, DN, DIST, HASH, YARD LN, PLAY TYPE, RESULT, GN/LS, OFF FORM, OFF PLAY, OFF STR, PLAY DIR, PLAYER, QTR`. Fill rates: PERSONNEL 0/85, PLAYER 0/85, OFF PLAY 23/85, BACKFIELD 22/85, everything else ~full. Sparse tagging is NORMAL — code must cope and show sample sizes. The coach also wants a `MOTION` column supported even though this file lacks it.
- `AGENTS.md` — this is Next.js 16; read `node_modules/next/dist/docs/` for anything you're unsure of.

## Non-negotiable conventions
- Stack: Next.js 16 App Router, TypeScript, Tailwind v4, zustand + `persist` (localStorage key `program-builder-v3`, currently `version: 5` with a `migrate` chain — **bump the version and add a migration whenever you change persisted shapes**; never break existing saved data).
- Theme tokens keep their historical names: `grass` = primary blue accent, `pitch` = light page bg, `ink` = navy text, `dim` = muted, `line` = borders, `navy` = dark chips. Light theme only. Existing pages use these class patterns: `card = "rounded-xl border border-line bg-card shadow-sm"`, `cardHead = "display uppercase text-xs font-bold tracking-[0.15em] text-ink px-5 py-3.5 border-b border-line flex items-center gap-3"`, `input = "rounded-md border border-line bg-white px-2.5 py-1.5 text-sm focus:outline-none focus:border-grass"`. Match them.
- Any page using `useSearchParams` must be wrapped in `<Suspense>` (static export). All pages are `"use client"` and guard first render with `useHydrated()`.
- **The AI layer is `src/lib/ai/`** (`types.ts` contract, `local.ts` heuristic engine, `index.ts` selector). Pages call `ai.*` only. Code does ALL math; the model only reasons over JSON. Keep the local engine working — a real model is added later behind the same contract.
- Honest UI: no fake data presented as real, no dead buttons. The demo opponent is flagged `isDemo` and says so.
- Windows PowerShell 5.1 shell: no `&&`, use `;`. Node is at `C:\Program Files\nodejs` (not on PATH): use `& "C:\Program Files\nodejs\npx.cmd" tsc --noEmit` and `& "C:\Program Files\nodejs\npm.cmd" run build`. Long heredocs in Git Bash are flaky — write scripts to files and run them.
- Verification for each phase: `tsc --noEmit` clean, then `$env:GHPAGES="1"; npm run build` succeeds. Do NOT start dev servers, do NOT deploy, do NOT push. Commit your phase with a descriptive message ending in `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Keep the coach's voice: plain football language in UI copy, no jargon like "API", "schema", "engine" in user-facing text (say "CounterScheme").
- Don't delete other phases' work. Don't refactor unrelated code. Small, surgical, complete.

## The phases (build in this order; each agent does ONE)

### Phase 1 — Play-level import + tendency engine + Tendency Report (Q34–Q38, Q36, Q5 partially)
- Store: `Opponent.plays: Play[]` where `Play` keeps every column: `{ id, num, odk, personnel, backfield, down, distance, hash, yardLine, playType ("Run"|"Pass"|""), result, gain, formation, play, strength, direction, player, quarter, motion, extra: Record<string,string> }`. Keep `playsImported` = plays.length. Migrate persisted opponents (plays: []).
- `components/TendencyImport.tsx`: map ALL of the coach's core fields (Play #, ODK, Personnel, Backfield, Down, Distance, Hash, Yard Line, Play Type, Result, Gain/Loss, Formation, Play, Strength, Direction, Player, Quarter, Motion) with auto-guess from the Hudl header names above; unmapped columns go to `extra`. Keep ODK filter (import only `O` rows when ODK present). Accept CSV; keep the "save Excel as CSV" message. Applying an import REPLACES plays and recomputes the headline tendencies (runRate, firstDownRun, rpoRate, signature, personnelUsage, formations, concepts, downDistance grid) from the plays — computed, never hand-typed after an import.
- New `src/lib/tendencies.ts` (pure functions over `Play[]`):
  - **Situations (Q36, exact):** 1st: 10 → "Normal", 10+ → "Behind Sticks"; 2nd: 1–3 "Short", 4–6 "Manageable", 7–9 "Medium", 10+ "Long"; 3rd/4th: 1–2 "Short Yardage", 3–6 "Manageable", 7–10 "Medium", 11+ "Long". Export a `situationOf(play)` and the table. Keep the existing 4×3 `downDistance` grid working (derive it from plays for the heatmap) but the situations table is the primary breakdown.
  - **Formations grouped by personnel (Q37)** and formation × backfield × situation combinations.
  - **Success**: from `result`/`gain` (TD, first-down-ish gains ≥ distance, explosive ≥ 12 run / ≥ 16 pass, negative plays, turnovers).
  - **Tells engine (Q35):** evaluate single tags (formation, backfield, personnel, hash, strength, situation, down, motion) and pairs of tags as conditions; for each condition with n ≥ 5 compute the distribution of outcomes (run/pass, direction L/R, play/concept) and the **lift** vs the opponent's baseline; rank by lift × support; return the top tells with `{ condition, outcome, rate, n, baseline, lift, plays: id[] }`. Separate "actionable" (lift meaningful, n adequate) from "interesting". Never claim a tell on n < 5.
  - **Key player usage (Q38)** from the `player` column when present: touches, plays, situations, success.
  - **Best plays**: by frequency AND by success (explosive rate, avg gain) — both lists.
- Opponent Matchup page: add a **Tendency Report** section: top tells (each with an Evidence drill-down showing n, rate vs baseline, and the play rows), situations table, formations by personnel, best plays by frequency/success, key-player usage. Headline tiles now computed from plays when plays exist. Keep manual entry working when there are no plays.
- Verify against `docs/coach-answers/hudl-playlist-sample.csv`: write a small node/ts test script (in `scripts/` — not shipped) that imports the CSV through the same mapping + engine and prints the tells; sanity-check the numbers by hand for at least two of them.

### Phase 2 — Terminology mapping (Q27)
- New `src/lib/knowledge.ts`: standard football knowledge base — formations (Trips/Trey/Doubles/Twins/Pro/Ace/Empty/Bunch/Stack/Wing/Unbalanced/Pistol/I/etc.) with structural meaning (receivers per side, TE, backs), common concepts (Inside Zone, Wide/Outside Zone, Duo, Power, Counter, Trap, Iso, Sweep, RPO, Mesh, Smash, Snag, Sail/Flood, Post-Cross, Verts, Screens…) with type run/pass and family, backfield sets. Alias-tolerant matching.
- Store: `termMap: { term, meaning, kind: "formation"|"concept"|"backfield"|"other", knowledgeId?, createdAt }[]` per team. When the tendency engine or Matchup page hits an opponent tag it can't resolve (e.g. "UTAH", "DEUCE STACK", "DUO KICK"), it collects "unknown terms". UI: an **Unknown terms** strip on Opponent Matchup: "What does Utah mean?" → coach answers in plain text ("Utah is Trips with the TE on") → parsed against the knowledge base (local engine: alias match + free text kept) and remembered. Also allow answering through the Ask box ("Dallas is Snag"). Never a big setup task.
- Tendency Report uses resolved meanings alongside the raw tag (e.g. "UTAH (Trips, TE attached)").
- Extend `ai/types.ts` + `local.ts` with `resolveTerm(term, answer)` and use the knowledge base in Teach (My Scheme) as well for opponent-side words.

### Phase 3 — Game Plan v2 (Q28–Q30, Q33, Q40)
- `PlanItem` gains `{ source: "generated"|"coach", evidence?: { summary, n, rate, baseline?, playIds: string[] }, conceptIds?: string[], personnel?: string }`. Regenerating replaces ONLY generated items and never touches coach items or coach-edited generated items (mark `edited: true` when the coach changes text).
- Plan is **reactive** (Q33): recompute generated items automatically when opponent data or scheme changes (memoized from a hash of inputs), keeping the merge rule above. A visible "Updated just now" stamp; still keep a manual Regenerate.
- Content order per Q28: **Best players first** (from key-player usage + coach notes) with practical ways to limit them; then actionable tendencies each paired with a response inside the coach's system (Trigger→Action→Result concepts, coverages/fronts he carries, or `backPocket` concepts); situational tells ("boundary comeback on 3rd & 5+") get specific answers; where the opponent stresses our rules → practice priorities; break answers out by personnel grouping when relevant.
- Concepts gain `status: "active" | "backPocket"` (Q30); in-season suggestions only use active + backPocket; library-only ideas are labeled "educational — not in your system".
- Every item: answer first, **Evidence** toggle second (Q29), and an **Ask about this** button that opens the Ask box on Opponent Matchup pre-filled with the item (Q29).
- Plan Status becomes the coach's 7 steps (Q40) with "where you are" semantics: Prepare Opponent Data → Add Coach Knowledge → Generate Tendency Report → Collaborate on Game Plan → Generate Practice Emphasis → Generate Scout Cards → Ongoing. Derive state from data; steps 5–6 link to Phase 5 surfaces (leave honest placeholders that Phase 5 fills).
- Tone (Q31): direct, explains the reasoning, teaches; asks a question only when it helps.

### Phase 4 — Team model changes (Q9, Q10, Q22–Q24, Q6)
- Depth chart: ONE Base package per level; packages **inherit** Base with per-position overrides (`overrides: Record<slotIndex, string[]>`; a package's effective slots = base unless overridden). Migrate existing groups: current "base" stays; other seeded empty packages are removed; user-created packages become overrides. Default seeds: Base only (+ nothing else). Up to 3-deep, never required. Custom package names.
- Levels: `level: "Varsity" | "JV" | "Freshman"` on packages; Varsity opens by default; JV/Freshman as secondary tabs; same player profiles.
- Skill ratings: `skillCategories: Record<positionKey, { id, label }[]>` suggested per position type from scheme responsibilities/concepts (defaults per position: DL = Get-Off, Block Destruction, Run Fit/Gap Control, Pass Rush, Football IQ; LB = Run Fits, Block Destruction, Tackling, Coverage, Football IQ; DB = adjusted to coverage/leverage/run-support; editable add/remove/rename). `Player.skills` keyed by category id. 1–5 with the coach's definitions shown (1 major weakness … 5 difference-maker). **Remove the overall star rating** from roster/profile. Add optional weekly game grade + short note per player (`weeklyGrades: { week, grade, note }[]`); show a quiet trend (improving/steady/struggling) only where relevant (player profile), never auto-changing the depth chart.
- Roster import: add PDF support (extract text client-side — `pdfjs-dist` is acceptable; if it can't parse, say so plainly) alongside CSV; core fields name/position/class; partial rows fine.
- Program setup (Q6): Settings gets Team/School name, Level, State, Classification (mascot/logo optional) stored in `program`; TopNav/SideNav/Up Next use it instead of "Demo High School / Coach Linville".

### Phase 5 — Practice emphasis + scout cards (Q5, Q40 steps 5–6)
- From plays + tells + game plan: build a **candidate rep pool** (opponent plays ranked by frequency × success × stress-against-our-rules), each rep carrying personnel, formation, backfield, play/concept, direction, hash, motion, situation, and "why it matters".
- Coach narrows the pool (include/exclude, reorder). Generate a **scout script** with a Mon (teach) / Tue (apply) / Wed (game-like) progression; important reps repeat but presentation/purpose progresses; include personnel-change operation reps when the opponent changes personnel; optionally a few counters the opponent may use (max 3).
- Scout cards: printable cards (one per rep) with the details above — text layout is fine for V1 (no auto-drawing). New page `/practice` (sidebar under Plan) reachable from Plan Status steps 5–6 and the Game Plan "Practice / Call Emphasis" section.

### Phase 6 — One AI conversation (Q26, Q29, Q2, Q4) — local engine version
- Merge Teach (My Scheme) and Ask (Opponent Matchup) into one persistent **CounterScheme chat** thread stored in the app (`chat: Message[]`), available from a button in the TopNav and as a full-screen mobile route `/chat`; context-aware (knows team/scheme/current opponent/plan); the per-page boxes stay but post into the same thread. Local engine routes: scheme sentences → Teach parser; opponent questions → Ask; "what does X mean" → term mapping; plan items → explain evidence. Phone layout: chat + plan summary + opponent notes only.
