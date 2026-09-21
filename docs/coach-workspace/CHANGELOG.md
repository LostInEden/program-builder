# Coach Workspace — Change Log

Every front-end change made from the coach's workspace goes here, **whether or not it shipped**. Newest first. One entry per change. The engineering side reads this to stay in sync — if it isn't here, it didn't happen.

Entry format:

```
## YYYY-MM-DD — <short title>
- **Asked for:** what the coach said, in his words
- **Changed:** what was actually done (pages, components, files)
- **Commit:** short commit id on the `coach` branch
- **Status:** On coach (live on the coach link) · Shipped (merged to master by Matt) · Dropped
- **Notes:** anything the engineering side should know (e.g. "needs a new field — see REQUESTS.md #3")
```

---

## 2026-09-21 — Give the offense more room for routes
- **Asked for:** Back the offense up some so there is space for routes.
- **Changed:** Extended the diagram viewport by 12 field units downfield, placing the formation higher on the same board and leaving more room beyond the defense. Updated pointer coordinates, drawing overlays, field markings, and print view to use the expanded area.
- **Commit:** (this one)
- **Status:** On coach
- **Notes:** Saved player positions, line-of-scrimmage alignment, and existing path coordinates are unchanged. The canvas layout and drawing interaction are retained.

## 2026-09-21 — Draw continuous multi-segment assignments
- **Asked for:** Make drawing feel like one continuous football assignment: click bends with live preview, finish quickly, and edit the whole path afterward without redesigning the tool.
- **Changed:** StudioCanvas now holds an unfinished path locally, adds unlimited click points, finishes with double-click or Enter, cancels with Escape, and undoes draft points before saved edits. Arrow, Line, Motion, and Block share this interaction. Added free-field starts and nearby-player snapping using existing anchors and points. Reset canvas history when changing diagrams or structures.
- **Commit:** (this one)
- **Status:** On coach
- **Notes:** Coach explicitly authorized the canvas behavior change. No store/model changes or migration. One finished assignment is one existing DrawLine. Existing player-relative paths remain attached when players move; free starts use absolute points with the existing free anchor. Print rendering now handles those free points without a spurious segment to the origin. New semantic categories remain REQUESTS.md #1 engineering work.

## 2026-09-21 — Refine path editing and stroke readability
- **Asked for:** Thin clean paths, smaller arrowheads, editable starts/bends/endpoints, and control over straight versus curved paths without changing the visual layout.
- **Changed:** Reduced path strokes and arrowheads; masked paths around player labels; added a reachable start handle, retained endpoint/midpoint editing and bend removal, and stopped midpoint insertion from automatically enabling curves. Dragging an attached start detaches that path while preserving its other vertices.
- **Commit:** (this one)
- **Status:** On coach
- **Notes:** Layout, field, player styling, navigation, colors, and My Scheme unchanged. TypeScript and production build checked; local browser checks cover multi-bend Enter/double-click completion, motion/block styles, draft cancellation, whole-path undo/redo/delete, point insertion/removal/dragging, attached-player movement, persistence, and print rendering. Live user diagrams were not edited during tests.

## 2026-09-21 — Enlarge and simplify the existing diagram workspace
- **Asked for:** Adjust the existing StudioCanvas into a larger, clearer coaching board with compact controls.
- **Changed:** Expanded the board area, collapsed saved diagrams and secondary inputs, reduced the inspector and toolbar, and improved dark position/text contrast on the light field. Defender labels now show positions rather than athlete tooltips or roster names.
- **Commit:** (this one)
- **Status:** On coach
- **Notes:** Existing drawing handlers, stored diagrams, and automatic saving remain intact. This is the visual phase; Save/Cancel, independent defender identities, traditional symbol rules, and scheme-linked diagrams remain engineering work in REQUESTS.md #1.

## 2026-09-21 — Remove My Team player-count badge
- **Asked for:** Take the player count off beside My Team.
- **Changed:** Removed the roster-count badge from the shared My Team navigation entry.
- **Commit:** (this one)
- **Status:** On coach
- **Notes:** Roster data and player counts elsewhere are unchanged.

## 2026-09-21 — Guided Build Plan and coach-approved Final Plan
- **Asked for:** A digital staff meeting where CounterScheme brings opponent priorities and the coach decides the answer, with Build Plan and Final Plan views.
- **Changed:** Shared the existing matchup priority presentation with Game Plan; added per-priority evidence, saved-scheme suggestions, Accept Answer, Modify, editable decision cards, and populated-only Final Plan categories. Added Plan / Call Sheet / Practice Script navigation and preserved the prior planning workspace.
- **Commit:** (this one)
- **Status:** On coach
- **Notes:** Added optional meeting metadata to existing GamePlan storage for drafts, conversations, topics, and approved decisions. Existing plans are preserved; no migration or deletion. Opening guided planning initializes an empty approval layer; legacy plans are not silently promoted. Automatic generated-plan updates stop for guided plans.

## 2026-09-21 — In-place priority discussions
- **Asked for:** Talk It Through in the selected priority, with opponent, scheme, team, evidence, and previous decisions as context, then Add to Plan.
- **Changed:** Added persistent per-priority discussions through the existing assistant interface, context for prior approved decisions, staff questions, and a reviewable decision draft action. Discussion cannot approve a decision or modify scheme rules as a side effect.
- **Commit:** (this one)
- **Status:** On coach
- **Notes:** The repository only has the local rules-based provider. Natural conversational reasoning requires a connected model; the UI states this limitation. See REQUESTS.md #4. No model credentials or external service were added.

## 2026-09-21 — Connect approved decisions to weekly preparation
- **Asked for:** Call Sheet and Practice Script should use Final Plan and reflect edits without re-entering decisions.
- **Changed:** Call Sheet renders approved decisions by category; practice shows live approved coaching references and uses chosen answers on reps linked to the decision's existing evidence snaps. Drafts and unapproved legacy lines do not enter guided plan outputs.
- **Commit:** (this one)
- **Status:** On coach
- **Notes:** Staff-added decisions without linked snaps remain explicit practice reminders. Existing rep selection, script ordering, call sheet customization, and legacy plan behavior outside guided mode remain intact. Added regression checks for approval boundaries, edits, categories, persistence, call sheet, and practice integration.

## 2026-09-21 — Add opponent Personnel and Situational Tendencies tabs
- **Asked for:** Add a Personnel tab and a Situational Tendencies tab to Opponent Matchup.
- **Changed:** Added both entries to the shared Opponent Matchup navigation and focused scouting views with view tabs. Personnel shows existing grouping and formation breakdowns; Situational Tendencies shows down-and-distance, existing situational analysis, tells, combinations, and red-zone notes.
- **Commit:** (this one)
- **Status:** On coach
- **Notes:** Uses existing stored data and scouting calculations. Full Scout and editing tools remain available. Opponent selection is retained between scouting views.

## 2026-09-20 — Remove the Reports navigation tab
- **Asked for:** Get rid of the Reports tab because the information is available elsewhere.
- **Changed:** Removed Reports from the shared navigation configuration used by the desktop and mobile menus.
- **Commit:** (this one)
- **Status:** On coach
- **Notes:** Existing report page remains accessible by direct URL. No stored data, calculations, or other reporting/scouting features changed.

## 2026-09-20 — Restore the side-by-side opponent dashboard
- **Asked for:** Keep a categorized coaching dashboard with full-width priorities, Offensive Identity beside Key Players, and What They Do beside When They Do It.
- **Changed:** Reworked the overview into compact paired cards with horizontal priority tiles, restored Build Game Plan in the top controls, and added direct player, tendency, and situation links. Moved opponent identification into a compact line above the cards.
- **Commit:** (this one)
- **Status:** On coach
- **Notes:** Dark theme, backend, models, storage, and scouting calculations unchanged. Situation summaries use existing first-down and explicitly labeled third-down distance splits; red-zone text remains a saved coach note. Full scouting and editing tools are retained; cards stack only on small screens.

## 2026-09-20 — Simplify the Opponent Matchup overview
- **Asked for:** A coach-scannable overview with a compact opponent header, prominent Game Plan Priorities, Quick Tendencies, Key Players, and clear Full Scout / Build Game Plan actions.
- **Changed:** Added a four-section overview using existing scouting calculations and saved entries, with up to five supported priorities and expandable evidence. Kept the red, gold, and graphite theme and added honest missing-data states.
- **Commit:** (this one)
- **Status:** On coach
- **Notes:** No backend, data-model, storage, or calculation changes. Priorities summarize existing actionable tells, frequent concepts, and coach-identified players; insufficient data is never padded with invented priorities.

## 2026-09-20 — Preserve detailed opponent scouting outside the overview
- **Asked for:** Keep detailed scouting and editing functionality available without cluttering the overview.
- **Changed:** Preserved the previous detailed workspace at matchup?view=details, linked from Edit Opponent Information and Full Scout. Full Scout evidence links open the appropriate analysis section; opponent selection and question deep links remain supported.
- **Commit:** (this one)
- **Status:** On coach
- **Notes:** Secondary opponent information, personnel tables, down-and-distance matrix, notes, schedule, chat, and existing editing controls remain available. Build Game Plan opens the existing game-plan workflow without automatically regenerating a saved plan. Previous overview remains recoverable in Git at 2e594c6.

## 2026-09-20 — Apply CounterScheme red, gold, and graphite
- **Asked for:** Near Black #121212, Graphite #252729, Dark Gray #36393C, Counter Red #C62828, Deep Red #8F1D22, Champagne Gold #BFA46F, Metallic Gray #9DA3A6, Light Text #E8EAEB, and Muted Text #A7ADB1.
- **Changed:** applied near-black backgrounds/navigation, graphite cards, dark-gray raised panels, red primary actions with deep-red hover, champagne-gold links and focus outlines, metallic-gray blended borders, and the specified text colors. Kept the depth chart neutral with a gold line-of-scrimmage accent.
- **Commit:** (this one)
- **Status:** On coach
- **Notes:** Preserves field geometry, position spacing, saved data, and calculations. Status feedback remains distinct; print retains white paper and dark text.

## 2026-09-20 — Make the depth chart field neutral
- **Asked for:** "Make the field on the depth chart a nuetral color where you can still see the lines and names"
- **Changed:** replaced the green field with neutral charcoal #252A30 and increased yard-line contrast. Retained subtle field stripes, light yard numbers and hash marks, and separate name cards.
- **Commit:** (this one)
- **Status:** On coach
- **Notes:** Shared by the team overview and depth chart editor. Field dimensions, position spacing, player names, and saved assignments are unchanged.

## 2026-09-20 — Apply the charcoal and muted-blue palette
- **Asked for:** Main Background #292E33, Sidebar #1C2126, Cards #353B42, Raised Panels #40474F, Accent #4C8DBB, Primary Text #F2F4F5, Secondary Text #AEB7BF, Borders #505860.
- **Changed:** applied the eight supplied colors to the shared theme, navigation, cards, raised panels, controls, text, and dividers. Restored dark native controls and adjusted legacy white surfaces and status indicators for dark backgrounds.
- **Commit:** (this one)
- **Status:** On coach
- **Notes:** Preserves field layout, position spacing, saved data, and calculations. Print keeps white paper and dark text; the glow remains removed.

## 2026-09-20 — Apply the specified CounterScheme palette
- **Asked for:** Primary Navy #0B1F33, Slate #263746, Light Cool Gray #F3F5F7, White #FFFFFF, Electric Blue #2F80ED, Charcoal #17212B, Secondary Gray #667685, Border Gray #DCE2E7, Success Green #2E8B57, Warning Amber #E5A11A, and Alert Red #C94A4A.
- **Changed:** applied the supplied colors to shared theme tokens: navy header/navigation, slate secondary navigation and hover states, light gray pages, white cards and tables, blue actions, charcoal headings, gray labels and borders, and coordinated success/warning/alert indicators. Removed the previous dark-surface overrides and glow effects.
- **Commit:** (this one)
- **Status:** On coach
- **Notes:** Pale status backgrounds use tints of the specified colors. Navigation retains light text for readability; field layout, player spacing, saved data, and calculations are unchanged.

## 2026-09-20 — Black theme with glowing royal blue
- **Asked for:** "make the color theme black with a glowing royal blue"
- **Changed:** replaced the shared dark-blue/grey palette with black backgrounds and near-black cards, royal-blue buttons and accents, brighter blue links, and subtle static glows on navigation, active tabs, primary buttons, and keyboard focus. Dropdowns now use the shared panel color.
- **Commit:** (this one)
- **Status:** On coach
- **Notes:** Theme styling only; field markings, position spacing, saved data, and calculations are unchanged. Print retains white paper and no glow; status colors remain distinct.

## 2026-09-20 — Level and widen the safeties
- **Asked for:** "Even the safeties up and spread them out a little bit"
- **Changed:** aligned both safety cards at the same depth and widened their horizontal positions to 35% and 65% of the shared depth chart field.
- **Commit:** (this one)
- **Status:** On coach
- **Notes:** Display only; other position spacing, field layout, saved assignments, and defensive structure data are unchanged.

## 2026-09-20 — Give depth chart names room between positions
- **Asked for:** "space out the positions slightly so the names dont overlap and cover other positions"
- **Changed:** increased the vertical gaps between defensive levels, spread crowded linebacker rows, and kept name cards at a consistent width. Narrow screens can scroll the field horizontally rather than squeezing positions together; full player names are available on hover.
- **Commit:** (this one)
- **Status:** On coach
- **Notes:** Retains the opponent's 20-yard line, field markings, wide corners, and saved assignments. Display changes apply to both overview and editor.

## 2026-09-20 — Show the defense at the opponent's 20
- **Asked for:** "make it the same but defense on the opponents 20 yards line"
- **Changed:** relabeled the shared depth chart field from the opponent's 40 at the top to their 20 at the line of scrimmage. Added an explicit opponent's 20 label at the line and removed the goal-line marking.
- **Commit:** (this one)
- **Status:** On coach
- **Notes:** Preserves the approved field dimensions, defensive spacing, and player assignments. Display labels only; the defense faces the opponent's end zone beyond the bottom of the view.

## 2026-09-20 — Widen the depth chart and bring the defense toward the line
- **Asked for:** "Make the depth chart wider like it was before but only show 20 yards. The whole defense has to be near the line of scrimmage"
- **Changed:** restored the full-width landscape depth chart with horizontal field markings showing only the goal line through the 20. Added a visible line of scrimmage at the bottom and moved all defensive levels closer to it, with safeties deepest, linebackers behind the front, and corners still wide.
- **Commit:** (this one)
- **Status:** On coach
- **Notes:** Shared by overview and editor. This is display spacing only; saved structures and assignments are unchanged. A minimum display height keeps the stacked player cards readable.

## 2026-09-20 — Turn the depth chart field vertical
- **Asked for:** "Turn the field from horizontal to vertical" and show "the 40 yard line and in".
- **Changed:** made the shared depth chart a centered portrait field showing the goal line through the 40, with horizontal five-yard lines, paired 10/20/30/40 labels, and vertical columns of hash marks. Rotated the turf striping to match.
- **Commit:** (this one)
- **Status:** On coach
- **Notes:** Applies to My Team overview and the depth chart editor. Retains the closer Mike/Will spacing and wider corners; player assignments and defensive structure data are unchanged.

## 2026-09-20 — Bring Mike and Will inside and widen the corners
- **Asked for:** "move the mike and will in some and widen the corners"
- **Changed:** positioned Mike and Will closer to the center and corners toward the sidelines in the shared depth chart display. Clamped player-card centers to keep edge cards inside the field on narrow screens.
- **Commit:** (this one)
- **Status:** On coach
- **Notes:** Display positioning only; underlying defensive structures, player assignments, and saved data are unchanged.

## 2026-09-20 — Make the depth chart field visible
- **Asked for:** "The depth chart background needs to be fixed where you can see the field behind it"
- **Changed:** replaced the pale depth chart background with dark green turf, subtle alternating strips, and visible white yard lines, numbers, hash marks, and boundary in `DepthChartCanvas.tsx`. Applies to the overview and depth chart editor.
- **Commit:** (this one)
- **Status:** On coach
- **Notes:** The old background used near-white field markings against a pale surface after the dark theme change. Styling only; player cards, positions, assignments, and editing behavior are unchanged.

## 2026-09-20 — Remove Watch List from the interface
- **Asked for:** "I dont want watchlist on the software - remove that"
- **Changed:** removed Watch List navigation, its team screen, roster badges, summary and quick-action links, player-profile toggle, and old Watch List entries from displayed activity feeds. Old Watch List URLs now show the team overview.
- **Commit:** (this one)
- **Status:** On coach
- **Notes:** Existing saved metadata is left untouched for compatibility; Watch List is no longer accessible in the interface. Player evaluation stars remain because they are football grades, not Watch List controls.

## 2026-09-20 — Simplify My Team navigation
- **Asked for:** "Keep depth chart, roster, and schedule on there" and "have the rest on the overview part as options"
- **Changed:** kept Overview, Depth Chart, Roster, and Schedule in the My Team dropdown. Added prominent Player Profiles, Weight Room, and Injuries links to Overview, plus a return-to-overview link on team subviews.
- **Commit:** (this one)
- **Status:** On coach
- **Notes:** Existing profile, weight room, injury, roster, depth chart, and schedule functionality is retained. No changes to saved team data or calculations.

## 2026-09-20 — Add Self scout under My Scheme
- **Asked for:** "Add Self scout to my scheme"; defense for now, with both sides once offense is added.
- **Changed:** added Self scout to the My Scheme dropdown, a link on the scheme overview, and `/scheme/self-scout` with the team's name, defense scope, and an explicit report-unavailable state. Documented defensive snap import, storage, and tendency reporting as request #3.
- **Commit:** (this one)
- **Status:** On coach
- **Notes:** Navigation and page only; the tendency report is not implemented. Current imports analyze opponents' offensive snaps, so they are not used as own-team defensive evidence. No fake statistics, inactive upload controls, or changes to data/calculations. Offense remains a future extension.

## 2026-09-18 — Authenticate this Mac for coach pushes
- **Asked for:** "Help me authenticate this Mac with GitHub" and verify access before pushing the existing `coach` commit.
- **Changed:** recorded the completed Git Credential Manager browser sign-in, verified push access to `LostInEden/program-builder`, and successfully ran `git push origin coach:coach` from this Mac.
- **Commit:** (this one)
- **Status:** On coach
- **Notes:** The verification push reported Everything up-to-date; local `coach`, `origin/coach`, and GitHub's `coach` all matched `f936304c42b7dfe8a96cc31d230ae4cb558b152c`. Authentication setup changed no app code, commits, or branches. This commit updates only the changelog; credentials are not stored in the repository.

## 2026-09-18 — Record complete-call combinations for engineering
- **Asked for:** a tab where coverages, fronts, and adjustments "mesh", both to build calls and check how the pieces fit
- **Changed:** brought request #2 into `docs/coach-workspace/REQUESTS.md`, describing saved Complete Calls and combination-specific fit checks.
- **Commit:** (this one)
- **Status:** On coach
- **Notes:** Documentation only; Complete Calls and combination-specific checking are not implemented. Existing analysis still checks the whole scheme. Source: `7c56d48` on `preserved-coach-top-dropdown-navigation`.

## 2026-09-18 — Record starting diagrams to review and adjust
- **Asked for:** "Can we create drawings of each front, coverage, and pressure", with starting diagrams to "review and adjust"
- **Changed:** brought request #1 into `docs/coach-workspace/REQUESTS.md`, including saved concept-to-diagram associations and preserving coach edits.
- **Commit:** (this one)
- **Status:** On coach
- **Notes:** Documentation only; diagram generation is not implemented. Already included in `7c56d48` on `preserved-coach-top-dropdown-navigation`; no duplicate changes taken from the diagrams branch.

## 2026-09-18 — Put terminology setup in Settings
- **Asked for:** move one-time terminology setup elsewhere
- **Changed:** moved the terminology entry out of the My Scheme menu and added an Edit terminology section to Settings, linking to the existing terminology screen.
- **Commit:** (this one)
- **Status:** On coach
- **Notes:** Existing route and saved terminology are unchanged. Source: `7c56d48` on `preserved-coach-top-dropdown-navigation`.

## 2026-09-18 — Put Defensive Analysis under My Scheme
- **Asked for:** see how the defense fits and "name scheme fit defensive analysis"
- **Changed:** placed the existing analysis screen under My Scheme, removed its duplicate top-level desktop tab, named its menu entry and heading Defensive Analysis, and added a return link to My Scheme.
- **Commit:** (this one)
- **Status:** On coach
- **Notes:** Existing whole-scheme findings and calculations are unchanged. Sources: `7c56d48` and `d33d698` on `preserved-coach-top-dropdown-navigation`.

## 2026-09-18 — Organize concepts in Scheme Library
- **Asked for:** group fronts, coverages, pressures, and adjustments together; "scheme library is good for now"
- **Changed:** grouped the four existing concept categories under My Scheme → Scheme Library and updated the editor heading. Removed Coverage Library menu and standalone editor links while preserving its content and responsibility tools.
- **Commit:** (this one)
- **Status:** On coach
- **Notes:** Preserves the final Scheme Library name, replacing the intermediate Defensive Calls wording. Existing category routes and saved data are unchanged. Sources: `f4ea202` and `261c8fe` on `preserved-coach-top-dropdown-navigation`.

## 2026-09-18 — Keep the header and navigation compact
- **Asked for:** "I like the clean layout that doesnt take up a lot of space"
- **Changed:** brought over the 52px identity bar, 44px text navigation row, compact dropdowns, active underlines, and program name on wide screens in `TopNav.tsx` and `SectionTabs.tsx`.
- **Commit:** (this one)
- **Status:** On coach
- **Notes:** Preserves the final compact presentation rather than the earlier bulky tab styling. Source: `96ee197` on `preserved-coach-top-dropdown-navigation`.

## 2026-09-18 — Restore top navigation with dropdown menus
- **Asked for:** "I liked the previous layout how the tabs were on the top and had drop down menus"
- **Changed:** replaced the desktop sidebar with top section navigation and dropdowns, using `SectionTabs.tsx`, shared section definitions, `TopNav.tsx`, and the page layout. Retained current-page indicators, counts, keyboard and outside-click dismissal, and phone bottom navigation.
- **Commit:** (this one)
- **Status:** On coach
- **Notes:** Pages use the full available width. Existing routes and data are unchanged. Source: `e85b01b` on `preserved-coach-top-dropdown-navigation`.

## 2026-09-18 — Apply the final dark-blue and charcoal-grey theme
- **Asked for:** "Background colors - medium grey and light dark blue theme", then "maybe switch the two and make it darker"
- **Changed:** brought over the final deep-blue page backgrounds and cards, charcoal-grey navigation and top bar, lighter text and controls, and white print backgrounds in `globals.css` and navigation components.
- **Commit:** (this one)
- **Status:** On coach
- **Notes:** Final palette includes both theme revisions (`1c55527`, `0646061`) from `preserved-coach-top-dropdown-navigation`. No duplicate changes taken from the theme branch; no data or calculation changes. Validation for this integration: `tsc --noEmit` and `next build --webpack` passed, including all 23 generated pages. The default Turbopack build was blocked by this environment's local port restriction; no build configuration was changed.

## 2026-09-17 — Auto-merge turned on for the coach branch
- **Asked for:** the coach's work should land and show on his link without anyone touching GitHub
- **Changed:** added `.github/workflows/coach-automerge.yml` — pull requests into `coach` from the coach or Matt merge themselves. No app changes.
- **Commit:** (this one — opened as a test pull request to prove the automation)
- **Status:** On coach
- **Notes:** `master` is never auto-merged; shipping is still a manual pull request from `coach`.

## 2026-09-17 — Coach branch created
- **Asked for:** a place where all of the coach's work is recorded in GitHub, with a live link he can look at
- **Changed:** created the `coach` branch from `master`. No app changes. Live link: https://program-builder-git-coach-lostinedens-projects.vercel.app
- **Commit:** (this one)
- **Status:** On coach
- **Notes:** everything from the workspace lands on this branch; Matt merges it to `master` to ship.

## 2026-09-16 — Workspace created
- **Asked for:** a way for the coach to work on the look and organization of the app himself, with everything recorded
- **Changed:** added `docs/coach-workspace/` (SUPER-PROMPT, UI-MAP, this log, REQUESTS, README). No app changes.
- **Branch / PR:** master (engineering)
- **Status:** Merged
- **Notes:** —
