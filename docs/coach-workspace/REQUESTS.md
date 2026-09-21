# Coach Workspace — Requests for Engineering

Anything the coach asks for that changes what the app knows, saves, computes, imports, or recommends goes here instead of being built in the workspace. Matt and the engineering side pick these up. Newest first; keep the number.

Entry format:

```
## #<n> — YYYY-MM-DD — <short title>
- **Coach asked:** in his words
- **Why it's not front-end:** which data / computation / file it would need to change
- **Where it would show up:** page(s) and what the coach expects to see
- **Status:** Open · Planned · Done · Declined (with reason)
```

---

## #4 — 2026-09-21 — Connect conversational staff-meeting AI
- **Coach asked:** CounterScheme should discuss a game-plan priority naturally, compare football options, ask useful questions, and evaluate ideas against My Scheme, My Team, opponent evidence, and earlier decisions.
- **Why it's not front-end:** The provider registry currently contains only the local rules/template engine. A real conversational provider requires a server-side integration, credentials, grounded prompts, conversation context handling, and validation of scheme/personnel claims. No remote model or credentials are configured in this workspace. The guided UI and persisted coach approval workflow are implemented; local replies do not satisfy unrestricted football reasoning.
- **Where it would show up:** Game Plan → Build Plan → Talk It Through. The existing provider receives current priority/evidence, discussion history, saved scheme/team context, and approved decisions. Preserve the explicit Add to Plan boundary and never auto-file speculative scheme rules.
- **Status:** Open

## #3 — 2026-09-20 — Self scout our defense, then both sides
- **Coach asked:** "Add Self scout to my scheme. This will include a tendency report on the team using the software." Clarified: "Defense for now, but ones offense is added it will do both".
- **Why it's not front-end:** Own-team defensive game snaps are not saved in `src/lib/store.ts`. Existing `Play` records belong to opponents and lack dedicated defensive front, coverage, and pressure fields; `rowsToPlays` in `src/lib/tendencies.ts` filters out defensive snaps, and `TendencyImport.tsx` applies imports to an opponent. Engineering needs separate own-team snap storage and game identity, a defensive import/mapping flow, and defensive tendency calculations with sample sizes and underlying snap evidence. Do not derive usage percentages from scheme concepts or reuse opponent data as this team's snaps. Confirm the coach's export columns and situational breakdowns before implementing calculations. Preserve a path to separate offense/defense reports when offense support is added.
- **Where it would show up:** My Scheme → Self scout (`/scheme/self-scout`), also linked from the scheme overview for phone access. The page currently states that the report is unavailable. The requested report should show this team's front, coverage, and pressure usage by game situation, with missing tags and sample sizes made clear; offense comes later, not in this first scope.
- **Status:** Open

## #2 — 2026-09-17 — Build complete calls and check how they fit
- **Coach asked:** a tab where coverages, fronts, and adjustments "mesh"; confirmed "Both" for building combinations to call on Friday and seeing whether the pieces work together.
- **Why it's not front-end:** the existing `Concept` records in `src/lib/store.ts` are separate concepts without a persisted complete-call association. Naming and saving a combination of front, coverage, pressure, and adjustment needs a data model and actions. Checking a selected combination, rather than the whole saved scheme, also needs engineering support in `src/lib/analyze.ts`; any effects on recommendations or the call sheet belong in `src/lib/plan.ts` and `src/lib/callsheet.ts` after coach/engineering agreement. Do not invent compatibility judgments.
- **Where it would show up:** My Scheme → Complete Calls, where the coach can build, name, review, and edit combinations from his saved defense. Show grounded fit checks and explain missing assignments or conflicts. Existing overall analysis is surfaced now as My Scheme → Scheme Fit; it is not a combination-specific checker.
- **Status:** Open

## #1 — 2026-09-17 — Starting diagrams to review and adjust
- **Coach asked:** "Can we create drawings of each front, coverage, and pressure"; chose "review and adjust" when offered a starting diagram beside each concept.
- **Why it's not front-end:** `Concept` in `src/lib/store.ts` has no link to a saved drawing. The separate `Call` model stores drawings (`lines`, `zones`, and other drawing fields), and `PRESET_PLAYS` supplies some starting plays, but there is no confirmed mapping from every saved concept to a correct diagram. Creating and persisting that association, producing starting alignments/assignments from the saved scheme, and preserving coach edits requires engineering changes. Relevant existing pieces: `addCall`, `updateCall`, `addPresetCall` in `src/lib/store.ts`; `src/lib/football.ts`; `src/components/StudioCanvas.tsx`.
- **Where it would show up:** My Scheme's front, coverage, and pressure concept detail (`src/app/scheme/concepts/page.tsx`), with a starting diagram to review and adjust using the existing drawing tools (`src/app/scheme/playbook/page.tsx`). Fronts show alignment; coverages show assignments; pressures show rush paths and coverage responsibilities. The diagram should use the coach's saved rules and terminology, make the offensive look clear, and ask for missing football details instead of treating guesses as his defense. Coach edits must survive reopening and any later regeneration.
- **Status:** Open

### #1 follow-up — 2026-09-21 — Improve the existing StudioCanvas
- **Coach asked:** Reuse the current diagram tool with traditional offensive symbols, team terminology, independent defenders, typed defensive movements, explicit Save/Cancel, read-only rendering, and a scheme diagram grid.
- **Why it's not front-end:** Implement draft state and complete Save/Cancel boundaries instead of direct store updates; give defenders stable diagram identities and label overrides independent of roster athletes; separate offensive position identity, display label, and optional symbol (center square, tight end triangle, others circles). Preserve ambiguous legacy markers rather than guessing identity from labels. Add typed blitz/slant/fit/coverage movement metadata and stable anchors, and optional Concept-to-Call links for saved scheme diagrams. Plan backward-compatible migration from the current version 14 store.
- **Where it would show up:** The existing StudioCanvas remains the shared renderer. Read-only mode must disable keyboard and pointer mutations, editing controls, and selection handlers. My Scheme should show a visual grid of linked saved diagrams without inventing alignments. The visual workspace improvements are complete; automatic saving remains clearly labeled until engineering supplies Save/Cancel.
- **Status:** Open
