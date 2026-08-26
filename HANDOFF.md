# Program Builder AI — Project Handoff / Context

> Paste-me-first context for continuing this project in a fresh chat. Last updated 2026-08-26.

## 1. What this is

**Program Builder AI** — a football coaching app being built for Matt's buddy, a **high school head coach in Tennessee** (TSSAA). Defense-first product. His program uses **Hudl** (tier unknown); goal is "Hudl-comparable for far less." Users: coach + assistants only — **no player/parent accounts** (keeps FERPA/COPPA simple). The coach delivers requirements as PDF spec sheets and annotated screenshots; Matt relays them. Matt is not a football person — explain football concepts when they matter.

**Brand**: dark UI, lime/grass accent (#4ade80), PB logo, "Wildcats Football / Coach Carver" placeholder identity. Tagline: "You call the shots. AI does the homework."

## 2. Where everything lives

| Thing | Location |
|---|---|
| Code | `C:\Users\matta\program-builder` (Next.js 16, App Router, TS, Tailwind v4) |
| GitHub | `github.com/LostInEden/program-builder` (public; branch `master` = source, `gh-pages` = static mirror) |
| **Primary live URL** | **https://program-builder-lostinedens-projects.vercel.app** — auto-deploys on push to master |
| Backup mirror | https://lostineden.github.io/program-builder/ — manual: `GHPAGES=1 npm run build`, copy `vercel.json` + `.nojekyll` into `out/`, force-push `out/` as branch `gh-pages` |
| Vercel | project `program-builder` on team `lostinedens-projects` (hobby). CLI logged in as `lostineden`, local folder linked. |
| Research blueprint (market/AI/legal/schema) | Claude artifact: https://claude.ai/code/artifact/5d7dff92-6ec4-4377-8a04-23529a04296a |
| Coach's spec PDFs | `C:\Users\matta\Downloads\`: `Program_Builder_My_Team_Page_Engineer_Spec (1).pdf`, `Program_Builder_My_Scheme_Engineer_Spec_v2.pdf`, `football_terminology_rules.pdf`, `counter_scheme_engineer_notes_v6.pdf` |
| Claude memory | `~/.claude/projects/C--Users-matta/memory/project_coach_iq_football.md` (detailed running log) |

**Run dev**: `.claude/launch.json` entry `program-builder` (port 3100), or in PowerShell:
`cd C:\Users\matta\program-builder; & "C:\Program Files\nodejs\npm.cmd" run dev -- --port 3100`
Node is at `C:\Program Files\nodejs` and NOT on PATH (bash: `export PATH="/c/Program Files/nodejs:$PATH"`).

**Deploy**: just `git push origin master` (Vercel auto). gh-pages mirror is optional (see table).

## 3. Architecture

- **All client-side, no backend yet.** State = zustand + `persist` to localStorage, key **`program-builder-v3`**, persist `version: 3` with a `migrate` chain (v1→v2 remapped an old coordinate space; v2→v3 mirrored the field). Every visitor has their own sandbox.
- Key files:
  - `src/lib/store.ts` — the entire data model + seeds + migrations. Players, personnel groups (depth chart: `slots: Record<slotIndex, playerId[]>`, index 0 = starter), scheme identity, terminology overrides, formation templates, playbook calls, season schedule, PRESET_PLAYS, weight-room sync (`applyWeightRoom`).
  - `src/lib/football.ts` — defensive `structures` (slot coords + labels + standardized `concept`), canvas geometry constants, offensive formation presets, line/zone types, `smoothPath` (Catmull-Rom), field presets.
  - `src/lib/recognize.ts` — formation recognition (rules from the terminology PDF) + DL techniques/gaps reference + strength rules.
  - `src/components/StudioCanvas.tsx` — THE play-drawing editor (SVG). All interactions live here.
  - `src/components/PlayCardSVG.tsx` — pure-SVG light-palette renderer for print (`/scheme/playbook/print`).
  - `src/components/DepthChartCanvas.tsx`, `RosterImport.tsx`, `WeightRoomImport.tsx` (papaparse CSV + column-mapping UI).
  - Pages: `/` home, `/team` (+`/team/player?id=`), `/scheme`, `/scheme/playbook` (the editor page), `/scheme/playbook/print`, `/scheme/soundcheck`, `/scheme/terminology`, `/calendar`, `/practice`, `/reports`, `/settings`, `/week`, `/ask` (mock chat).

### Canvas geometry (critical invariants)
- Canvas space: x 0–100, y 0–75 (`FIELD_H`), uniform scale on a 4:3 box. **LOS_Y = 42.**
- **DEFENSE AT THE BOTTOM** (our team's perspective — the coach's explicit call), opponent offense on top. `defenseCanvasY(slotY) = 38 + slotY*0.45`. Offense presets: OL row y=39, backs shallower (smaller y). Yard numbers count down going DOWN (offense drives toward bottom goal). `YD = 2.2` units/yard.
- Lines are anchored: `anchor: "off:<markerId>" | "def:<slotIndex>"`, `points` are RELATIVE to the anchor so moving a player moves its lines.
- Fronts are aligned to the OL by technique (N 0-tech at x50 head-up on C; 3-tech 42.5/57.5; 5-tech 35.5/64.5; 4i 39.5/60.5). OL: LT38 LG44 C50 RG56 RT62.

### Editor interaction model (built to the coach's spec + research)
- Click-to-complete: pick tool (1-8 or v/l/r/m/b/t/z/p) → click player (arms, orange) → ONE field click draws the complete line+arrow and selects it. Press-drag-release also works.
- **"+" button sits ON the arrow tip**: drag = move endpoint, click = arm one extension segment.
- Click a line → waypoint handles (drag; double-click removes) + hollow **midpoint bend handles** (Excalidraw-style: drag inserts point + sets `smooth`). Midpoints suppressed on segments < 4.5 units.
- **Block gesture**: Block tool → click blocker → click target player → block draws with the T-bar stopping 3.4 units in front of the target. (Also: Select tool, O selected, double-click defender.)
- **Empty-field click = universal done**: returns to Select, deselects/places. Guarded by `clickConsumedRef` so the phantom click after a pointerup (drag end, zone create, drag-draw) doesn't wipe the selection.
- Esc clears everything; Ctrl+Z / Ctrl+Shift+Z undo/redo (snapshot-per-gesture, stacks in refs); Delete removes selection; pointercancel aborts drags (iPad).
- Colors: `ROUTE_COLORS`, default ink `#e9efe9` stored as `undefined` (print maps to dark). Defense default `#9aa59b`.

## 4. Spec coverage (what the coach asked for → status)

All four PDFs are implemented. Highlights per spec:
1. **My Team spec**: roster panel w/ search, CSV import w/ column mapping (MaxPreps/SportsEngine/Hudl aliases), player profile (identity/body/strength/explosiveness/speed/eval, blanks allowed), field-style depth chart, separate edit mode with depth ordering.
2. **My Scheme v2**: written identity landing (structure + philosophy, no diagram), Playbook as the visual area, Sound Check (5 checks → Sound / Needs Review / Potential Conflict, "considerations not corrections", names affected positions), terminology never forced.
3. **Terminology rules**: recognition from player location; coach labels via `/scheme/terminology` (Positions / Formations / Strength / Reference tabs); strength-rule setting; DL techniques + gaps tables; live "Recognized: Twins Right · Strength: Right" bar with "Use as formation name".
4. **Counter Scheme v6**: Weight Room tab (CSV → player profiles), depth chart top-3 + position-filtered add (CONCEPT_POS map + "show entire roster" toggle), fronts renamed per scheme (4-down: **E,T,N,E**; 3-down: **E,N,E**; 3-4 is now TRUE 3-down with J/R edges + W/M ILBs), new **Tite/Mint** structure, season schedule (11 wks, 10 games + bye, calendar-driven), Playbook "all" tab + preset plays (Cover 2/4/1 Robber, Double A Gap, Edge Fire, Motion Bump — built against the active structure via concepts), more formations, **"Plus" tag appended once** ("Trips Right Plus"), **OL identified by label LT/LG/C/RG/RT and excluded from formation naming**.

Other shipped: ClickUp-style month calendar (week toggle, store-driven), print/PDF play cards, formation templates ("save as formation" — never draw twice), defense Letters/Triangles toggle, field presets (Midfield/Red Zone/Goal Line/Backed Up), flip horizontal, text + zone + add-player tools.

## 5. Problems we hit and how we fixed them (recurrence guide)

| Problem | Root cause | Fix |
|---|---|---|
| Zone/Text/Player tools "don't work at all" | Clicks on empty field land on the covering `<svg>` layer, not the container div, so `e.target === e.currentTarget` never matched | `isFieldTarget()` accepts the svg root too |
| Clicking exactly ON a line's visible stroke did nothing | Painted stroke intercepted the click (default `pointer-events: visiblePainted`), no handler, bubbled as non-field target | `pointerEvents: "none"` on decorative strokes; fat transparent hit paths (blocks 4.5 wide) + invisible hit circles over endpoints/bars |
| Selection instantly lost after drawing/dragging | Browsers fire a synthetic `click` after `pointerup`; our new universal empty-click-deselect consumed it | `clickConsumedRef` set in pointerup when work was done; click handler early-returns once |
| "Grey" in dropdowns | Global dark CSS styled `option` but not `optgroup` (and originally not `select` at all — light popup) | globals.css: `select { color-scheme: dark; appearance:none; custom chevron; padding-right 38px }`, dark `option` AND `optgroup` rules; number inputs: spinners removed |
| Player profile links broke on reload | Seed ids used `Math.random()` at module load — new ids every evaluation | Deterministic seed ids (`pl-<jersey>`, fixed call ids); `uid()` only for user-created entities |
| zustand persist vs SSR hydration | First client render must match SSR until rehydrated | `useHydrated()` mounted-flag guard on every store-reading page |
| Old saved plays after coordinate changes | We changed canvas space twice (offense flip, then defense-to-bottom mirror) | persist `version` + `migrate` chain (currently version 3); NEVER change geometry without a migration |
| Vercel: "Failed preview deployment" email flood | Vercel auto-builds every branch; `gh-pages` (static export) fails `next build` | `vercel.json`: `{"git":{"deploymentEnabled":{"gh-pages":false}}}` — must exist IN the gh-pages tree too (copy into `out/` before pushing) |
| Vercel deploy landed on Matt's WORK team (go-guardian), SSO-locked | CLI was logged in as work account; personal scope not deployable there | Deleted that project. Vercel MCP connector could list but not create (403) until Matt reconnected it → `create_git_project` worked. CLI later re-logged as `lostineden` (`npx vercel logout/login`). **Never deploy this to the go-guardian scope.** |
| PowerShell errors for Matt (`&&` invalid; `npx.ps1` blocked) | Windows PowerShell 5.1: no `&&`; script execution policy blocks `.ps1` shims | Give him `;` chaining and `& "path"` call operator; `npx.cmd` explicitly; or once: `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser`. He has all three shells — Terminal is just the window. |
| Long bash heredocs with quotes failing on Git Bash | Complex quoting breaks | Write python patch scripts to scratchpad with the Write tool, then run the file |
| a11y-tree checks giving false negatives | Accessibility tree shows placeholders for number inputs and CSS-uppercased text ("Recognized" → "RECOGNIZED"); input values invisible in innerText | Verify with `getComputedStyle`/`.value`/case-insensitive checks via javascript_tool |
| Synthetic event tests flaky | Firing pointerdown/move/up in one tick beats React state updates | setTimeout gaps (~80-150ms) between dispatched events |
| Browser-pane screenshots often unavailable | Pane not displayed → no compositing | Verify via read_console_messages + javascript_tool DOM checks instead |
| 3-4 restructure (v6) shifted slot indices | Depth chart + assignments + line anchors key on slot INDEX | Seeds were remapped; users' old 3-4 Base assignments may sit on wrong spots — coach re-drags once. Future structure edits: keep slot order stable or migrate. |

## 6. Research on file (already done — don't redo)

- **Market/feasibility** (in the artifact): no HS-level product does situational call recommendation; trained ML on ~600 plays/season is infeasible → explainable scoring engine (tags + shrinkage tendency tables + matchups) with reason codes; Claude for tagging/narrative only; NFHS = coach-facing only (TN allows press-box tablets; no coach-to-player electronics); TSSAA has no Hudl mandate, MaxPreps is official stats partner; TN SOPIPA applies. **Don't compete on film hosting — own everything after the film.**
- **Hudl Play Tools UX** (tutorial transcripts): pick line style → click athlete → click points / hold-drag freehand; blocks = double-click the target; formation name templates auto-populate ("never draw twice"); field-position presets instead of zoom; print grids.
- **Excalidraw/tldraw source-level** (constants in memory/transcript): drag threshold ~6-10px unifies segment/polyline; hit radius ≈ 2× visual; midpoints suppressed under 40 screen px; binding = ray ∩ outline inflated by gap (5 + strokeWidth/2); tldraw handle taxonomy vertex/virtual/create; `normalizedAnchor` + 600ms dwell-to-precise for shoulder-precise blocks (not yet built).
- **Architecture review** (Opus): SVG + snapshot undo is right at this scale ("do not move to Canvas"). Pre-backend schema roadmap: flat `Record<id, Element>` + `schemaVersion`/migrate + fractional z-index + bindings as records + `Segment[]` geometry + reserved `motion`/`frames` fields. Animation = path-driven `getPointAtLength`, ONE RAF clock, route IS the animation (no keyframe authoring).

## 7. Open items / roadmap (rough priority)

1. **Play animation (Frames)** — the blueprint exists (§6 architecture notes); most demo-worthy next feature.
2. **Backend** — Supabase + PowerSync per the research blueprint (full Postgres schema drafted in the artifact); do the schema flattening (§6) as part of it. Enables sharing, multi-device, assistants.
3. **AI wiring** — Ask AI + Sound Check narrative + play-name/tag reconciliation via Claude API (structured outputs over computed stats; never the calculator).
4. Editor niceties from research: shoulder-precise block bindings (normalizedAnchor + dwell), tool-lock (Q), Alt-click insert point, wristband export, practice-script card printing, defense front templates.
5. Coach question backlog: which Hudl tier/Assist?, real roster+testing+Hudl export files to build importers against, offense-side playbook timing, "invert display order of position names and formation names" (v6 note — interpreted as formation/concept inputs above canvas; **confirm with him**).
6. Recommendation engine (the original product thesis) — deterministic scoring with reason codes; blueprint in the artifact.

## 8. Working conventions with Matt

- He says "make it work like X" with screenshots — copy the interaction skeleton, keep the app's dark theme (he rejected the light Figma look in favor of site theme).
- Ship every change to BOTH deploy targets, verify in-browser first (tsc + console + DOM assertions), then summarize in plain English with football context explained.
- He likes: subagent research passes (Opus) before big features; honest "coming soon" stubs over fake UI; features removed if unlinked/filler.
- Commit style: descriptive one-liner + `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
