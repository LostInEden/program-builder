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

## #6 — 2026-09-21 — Contextual interpreted proposals for scheme and scout information
- **Coach asked:** Talk or type football explanations; show structured understanding, allow corrections, then save explicitly to the selected scheme item, opponent, or player.
- **Why it's not front-end:** The existing local teach parser can propose limited new scheme concepts, but there is no interpreted update contract for an existing Concept, no opponent/player observation extraction contract, and useChat currently applies terminology and question side effects immediately. Engineering needs context-bound proposals, stable target IDs, validation, preview/correction, and an explicit apply boundary for interpreted writes. Keep observations distinct from imported statistics; do not infer percentages from coach prose. Coordinate the real conversational provider in request #4.
- **Where it would show up:** My Scheme teaching and item details, Opponent Matchup Add Scout Info, and opponent Personnel Add Note. The frontend now reuses ai.teach for ephemeral new-concept proposals with Save approval, and offers reviewed verbatim notes on opponents and scheme items. It does not claim to extract structured observations or attach notes to inferred players. Global Ask behavior remains unchanged.
- **Status:** Open

## #5 — 2026-09-21 — Designate global defensive core rules
- **Coach asked:** Show actual system-wide Strength, Run Fit, Trips, Motion, Unbalanced, and Personnel rules in a concise Core Rules summary without duplicating scheme definitions.
- **Why it's not front-end:** There is no persisted global defensive-rule designation. Existing Concept responsibilities and adjustment trigger/action/result fields are scoped to individual concepts. The existing strengthRule supports offensive formation recognition and must not be relabeled as the defense's global strength rule. Engineering should define explicit references or scope for existing rules, preserve structured knowledge, and support editing without duplicating or guessing rules from prose.
- **Where it would show up:** My Scheme Overview → Core Rules → View / Edit Rules. The frontend currently explains the missing designation and links to saved checks and terminology. Do not promote situational adjustments into universal rules automatically.
- **Status:** Open

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

- **2026-09-21 drawing-interaction update:** The coach explicitly authorized continuous-path behavior in StudioCanvas. Multi-point drafting, player/free starts, snapping, finish/cancel, point editing, thinner paths, and legacy-format persistence are implemented using the existing route/block/motion/pitch types. Dedicated blitz, slant/stunt, coverage/drop, and run-fit semantic values still require coordinated model and consumer changes; none were silently mapped into new stored categories. This does not complete the other #1 follow-up requirements.

### #1 / #2 follow-up — 2026-09-21 — Visual scheme libraries and separate Play Art
- **Coach asked:** Automatically show each Front, Coverage, Pressure, and Adjustment diagram in consistent category cards; select existing components in Play Art to draw complete calls without changing permanent scheme definitions.
- **Why it's not front-end:** Concept-to-Call references are still missing; Play Art defFront/defCoverage are free text, not associations. Use stable IDs and diagram structure/defender identities, with legacy-safe migration and no name matching. Reuse PlayCardSVG for read-only previews and StudioCanvas for editing; do not mount a writable canvas as a preview. Combining components needs explicit coordinate/anchor merging and assignment-conflict handling. Drawing edits must be isolated from permanent components.
- **Where it would show up:** Shared SchemeConceptCard and scheme item details, then the existing Play Art workspace. The new category UI displays honest No diagram linked states until engineering supplies associations. No second drawing system is requested.
- **Status:** Open

- **2026-09-21 navigation update for #2:** Coach now wants Full Calls first under My Scheme → Scheme Library, followed by Fronts, Coverages, Pressures, and Adjustments. Play Art and Defense Analysis are sibling My Scheme tabs. The Full Calls entry is present with an explicit unavailable state; its future saved combinations must use existing scheme references, not duplicate definitions or relabel drawings as structured full calls.
