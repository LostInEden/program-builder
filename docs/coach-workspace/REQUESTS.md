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

