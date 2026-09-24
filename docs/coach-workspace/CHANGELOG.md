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

## 2026-09-23 — Give Play Art a white drawing surface
- **Asked for:** Make Play Art more distinct from the background, possibly white.
- **Changed:** Set the drawing surface to pure white so it stands apart from the surrounding light-gray workspace.
- **Commit:** (this one)
- **Status:** On coach
- **Notes:** Keeps gray field markings, charcoal default players/routes, red line of scrimmage, and saved custom colors unchanged.

## 2026-09-23 — Match depth chart and Play Art to the light theme
- **Asked for:** The depth chart and Play Art need to match the light gray and red theme.
- **Changed:** Both fields now use light gray surfaces, gray markings, and red lines of scrimmage. Play Art default players, labels, and routes use charcoal; selection controls use red/gold. Depth chart uses red position chips and gold selections with readable labels.
- **Commit:** (this one)
- **Status:** On coach
- **Notes:** Saved custom player/route colors and football coordinates remain unchanged. Print styling remains separate.

## 2026-09-23 — Remove the custom header logo
- **Asked for:** Take the logo out.
- **Changed:** Removed the logo image from the top bar, retaining the CounterScheme text link.
- **Commit:** (this one)
- **Status:** On coach
- **Notes:** Logo assets remain saved for future use.

## 2026-09-23 — Restore the earlier light gray and red theme
- **Asked for:** Revert to the light grey and red theme from earlier today.
- **Changed:** Restored the original #E5E7E9 background, #F7F7F5 cards, #D9DCDF navigation, #AA0000 actions, charcoal text, and muted gold accents from d0f87fa. Restored that version's field color treatments and red active navigation.
- **Commit:** (this one)
- **Status:** On coach
- **Notes:** Only presentation is restored; newer functionality and saved data remain intact. Drawing fields retain the prior contrast treatment.

## 2026-09-23 — Lighten all software surfaces to medium gray
- **Asked for:** Medium grey, not so dark; include all components.
- **Changed:** Set the main background to #484C50, navigation to #42474B, cards to #555A5F, and raised panels to #61666B. Updated shared borders and secondary text for contrast. Depth chart and Play Art now use the shared medium-gray card surface, with brighter Play Art yard lines.
- **Commit:** (this one)
- **Status:** On coach
- **Notes:** Preserves red/gold accents, the red/gold header-only logo, saved player colors and diagram coordinates. Shared tokens cover toolbars, dropdowns, forms, and dialogs; print remains white.

## 2026-09-23 — Restore the dark graphite, red, and gold theme
- **Asked for:** Revert to dark grey with 49er accents.
- **Changed:** Restored the saved near-black/graphite surfaces, light text, red primary actions, gold highlights, and dark navigation.
- **Commit:** (this one)
- **Status:** On coach
- **Notes:** Restores the palette from 89c7831 without reverting later functionality.

## 2026-09-23 — Match the header logo to red and gold
- **Asked for:** Include the logo in this color theme.
- **Changed:** Added a transparent red/gold version of the selected classic logo and used it only in the top bar, proportionally scaled to 48px.
- **Commit:** (this one)
- **Status:** On coach
- **Notes:** Built-in image edit prompt: recolor the existing logo gold/red, preserving its geometry and transparent background. Asset: public/brand/counterscheme-classic-red-gold.png. Original navy asset retained.

## 2026-09-23 — Theme the depth chart and Play Art
- **Asked for:** Include the depth chart and Play Art in this color theme.
- **Changed:** Depth chart now uses a graphite field, red position chips and gold selections. Play Art keeps its graphite field and gold line of scrimmage, with red/gold zone outlines and gold editing handles. Shared toolbars use the restored dark theme.
- **Commit:** (this one)
- **Status:** On coach
- **Notes:** Saved player colors, routes, coordinates, and print rendering remain unchanged.

## 2026-09-23 — Keep the logo in the top bar only
- **Asked for:** The logo should only be at the top of the screen and scale to that bar.
- **Changed:** Removed the large home-page logo and fitted the header logo proportionally to 48px within the existing 52px top bar.
- **Commit:** (this one)
- **Status:** On coach
- **Notes:** Preserves the selected logo design and compact navigation height.

## 2026-09-23 — Add the selected classic CounterScheme logo
- **Asked for:** Use the third logo and put it on the website.
- **Changed:** Added the classic serif C/S logo as a transparent local asset, replaced the header CS badge with it, and placed a larger version on the home page. Header text remains readable at small sizes.
- **Commit:** (this one)
- **Status:** On coach
- **Notes:** Prepared with built-in image generation from the chosen concept: isolate the third classic logo, retain lettering and blocking detail, remove comparison labels, use a transparent background. Asset: public/brand/counterscheme-classic.png.

## 2026-09-23 — Real AI model connected (engineering)
- **Asked for:** REQUESTS #4, a real conversational staff-meeting AI.
- **Changed:** Merged master into coach. It adds the OpenAI model behind `/api/ai`, used by Ask CounterScheme, Talk It Through, and Teach. Talk It Through's footer now says whether the model or the rules engine answered.
- **Commit:** 16e25ad
- **Status:** On coach (also on master)
- **Notes:** `src/server/`, `src/app/api/` and `src/lib/ai/` are engineering-only. Setup is in `docs/AI-SETUP.md`. REQUESTS #4 can close once the coach confirms the replies are useful.

## 2026-09-23 — Apply the navy and steel blue palette
- **Asked for:** Light gray dominant software with deep navy branding, steel blue interactions, and muted status colors.
- **Changed:** Updated shared backgrounds, cards, navigation, borders, typography colors, primary buttons and hover states, selected backgrounds, links, and status colors to the requested palette.
- **Commit:** (this one)
- **Status:** On coach
- **Notes:** Earlier themes remain saved in Git history. Dedicated field rendering and saved player/drawing colors are unchanged. Small warning labels use a darker gold for readability.

## 2026-09-23 — Darken the gray background
- **Asked for:** Make the grey darker.
- **Changed:** Darkened the main background to #CCD0D4 and navigation to #BFC5CA, with darker secondary navigation text for readability.
- **Commit:** (this one)
- **Status:** On coach
- **Notes:** Off-white cards and red/gold accents remain unchanged. Earlier palettes remain available in Git history.

## 2026-09-23 — Explore the light gray, deep red, and muted gold theme
- **Asked for:** Use a light gray base, off-white cards, deep red primary accents, and sparing muted gold highlights.
- **Changed:** Updated shared software colors, navigation, dropdowns, forms, active tabs, and status treatments for a light theme with charcoal text and gray borders. Darkened small gold text for readability.
- **Commit:** (this one)
- **Status:** On coach
- **Notes:** Previous red/gold/graphite theme is preserved at 89c7831553d16ec160f52ec237e5f9abde0780c2. Drawing fields retain their dedicated contrast treatment; saved play colors and data are unchanged.

## 2026-09-22 — Enlarge labels inside player symbols
- **Asked for:** Make the letter bigger inside the circle.
- **Changed:** Increased single-character labels from 14 to 22 SVG units and two-character labels to 19 units, keeping them centered in player symbols in the canvas and print view.
- **Commit:** (this one)
- **Status:** On coach
- **Notes:** Preserves symbol size, player colors, and the size of standalone defensive letters.

## 2026-09-22 — Match attached drawings to the player's color
- **Asked for:** The color of the circle should determine the color of the line.
- **Changed:** Attached routes, blocks, motion, arrows, and drawing previews now inherit their player's color. Changing the player updates all attached drawings immediately, including print.
- **Commit:** (this one)
- **Status:** On coach
- **Notes:** Unattached drawings retain their own color controls. Stored paths and positions remain unchanged.

## 2026-09-22 — Simplify player color and label editing
- **Asked for:** Keep it simple: click the circle to fill it with a color and/or label it.
- **Changed:** Choosing a player color fills the symbol immediately. Label and color are the primary controls; shading and symbol choices are under More options.
- **Commit:** (this one)
- **Status:** On coach
- **Notes:** Auto restores the normal outline appearance. Defensive letters retain their letter-only form unless a symbol is chosen.

## 2026-09-22 — Add one contextual editor for every Play Art player
- **Asked for:** Click any offensive or defensive player for a small nearby editor.
- **Changed:** Added a shared on-field player menu for labels, preset colors, fill, symbols, and deletion. Kept player metadata and assignment notes in the secondary menu.
- **Commit:** (this one)
- **Status:** On coach
- **Notes:** Defender removal is per play and supports Undo; it does not remove team depth-chart slots.

## 2026-09-22 — Save player labels, colors, shading, and symbols
- **Asked for:** Allow optional 0–2 character labels, eight preset colors, outline/shaded/filled states, and circle/square/triangle symbols.
- **Changed:** Added optional saved appearance properties for offense and defense, readable contrasting labels, and shared glyph rendering for the editor and print view.
- **Commit:** (this one)
- **Status:** On coach
- **Notes:** Existing diagrams retain their default styling. Customizations survive reload and duplication; player coordinates remain unchanged.

## 2026-09-22 — Add persistent drawing colors and editable route styles
- **Asked for:** Keep the selected drawing color until it changes and allow existing drawings to be restyled.
- **Changed:** Added a compact new-drawing palette and thickness selector, plus a contextual drawing editor for color, type, line style, thickness, curve, and none/end/both arrow styles.
- **Commit:** (this one)
- **Status:** On coach
- **Notes:** New drawing defaults do not recolor existing paths. All route styling persists with the play and renders in print.

## 2026-09-22 — Support colored free drawing in Play Art
- **Asked for:** Apply drawing colors to free drawing as well as routes and assignments.
- **Changed:** Added a Free draw tool that records pointer strokes in football coordinates using the same saved color, thickness, style, and editing controls.
- **Commit:** (this one)
- **Status:** On coach
- **Notes:** Free draw remains selected after a stroke. Defaults remain clean and neutral.

## 2026-09-22 — Keep the canvas stationary while drawing
- **Asked for:** Keep the drawing board responsive and usable without scrolling.
- **Changed:** Moved temporary drawing instructions out of the layout flow so starting a path does not resize the canvas.
- **Commit:** (this one)
- **Status:** On coach
- **Notes:** Preserves pointer alignment and the fitted viewport while constructing routes.

## 2026-09-22 — Reduce defensive letters by twenty percent
- **Asked for:** Defenders 20% smaller.
- **Changed:** Reduced defensive font size from 2.3 to 1.84 field units.
- **Commit:** (this one)
- **Status:** On coach
- **Notes:** Preserves player positions, offensive symbols, drawing stroke weights, and responsive scaling.

## 2026-09-22 — Slightly thicken Play Art lines
- **Asked for:** Lines slightly thicker.
- **Changed:** Increased the shared drawing stroke by 12.5%, including routes, arrows, blocking lines, and previews.
- **Commit:** (this one)
- **Status:** On coach
- **Notes:** Keeps the shorter blocking end bars and coordinated zoom scaling.

## 2026-09-22 — Slightly reduce defensive letters
- **Asked for:** Defenders slightly smaller.
- **Changed:** Reduced defensive font size from 2.5 to 2.3 field units, an 8% reduction.
- **Commit:** (this one)
- **Status:** On coach
- **Notes:** Preserves all player positions, offense sizes, and defense-bottom orientation.

## 2026-09-22 — Set defensive letters to a medium size
- **Asked for:** The defensive icons are too big; find a medium.
- **Changed:** Reduced defensive letter size from 3.5 to 2.5 field units, between the original and enlarged sizes. Line masks continue to scale with the letters.
- **Commit:** (this one)
- **Status:** On coach
- **Notes:** Keeps defense below the offense and preserves saved alignments, Fit, and zoom.

## 2026-09-22 — Reduce blocking line size
- **Asked for:** Make the block line smaller.
- **Changed:** Shortened the blocking end bar from 3.8 to 2.2 field units and slightly thinned blocking strokes, including the drawing preview.
- **Commit:** (this one)
- **Status:** On coach
- **Notes:** Existing blocking paths and endpoints stay in place; only their visual styling changes.

## 2026-09-22 — Match defensive player size to offensive symbols
- **Asked for:** Defensive players need to be the same size as offensive players, with lines scaled to them.
- **Changed:** Enlarged defensive letter cap heights to match offensive symbol diameters. Route and blocking strokes derive from the shared player size, and defensive line masks now account for the larger letters.
- **Commit:** (this one)
- **Status:** On coach
- **Notes:** Player symbols, defensive labels, paths, and arrowheads retain their proportions at every screen size and zoom level.

## 2026-09-22 — Restore defense below the offense in Play Art
- **Asked for:** Flip it back with the defense on the bottom.
- **Changed:** Reversed the visual camera orientation, including pointer and pan mapping. Offense is above the LOS and defense is below it, with the LOS 32% down the canvas.
- **Commit:** (this one)
- **Status:** On coach
- **Notes:** Preserves Fit, zoom, responsive sizing, and all saved football coordinates.

## 2026-09-22 — Make Play Art lines and arrows thinner
- **Asked for:** Make the lines smaller.
- **Changed:** Reduced drawn route, line, arrow, and blocking stroke widths, including drawing previews and selected lines. Arrowheads scale with the thinner strokes.
- **Commit:** (this one)
- **Status:** On coach
- **Notes:** Changes presentation only; existing paths and click targets remain intact.

## 2026-09-22 — Fit the Play Art workspace below app navigation
- **Asked for:** Make the drawing board use the available screen without page scrolling.
- **Changed:** Restored CounterScheme navigation, measured its height, and allocated the remaining viewport to compact setup controls, the canvas, and drawing tools. Moved selection editing and secondary information into expandable panels.
- **Commit:** (this one)
- **Status:** On coach
- **Notes:** Uses dynamic viewport height and responsive icon-only tool labels to preserve canvas space on smaller screens.

## 2026-09-22 — Scale football geometry together with route space above the LOS
- **Asked for:** Keep football locations consistent and place the line of scrimmage 65–70% down the canvas.
- **Changed:** Added a uniform visual camera for field markings, players, routes, objects, and labels. The offense appears below the LOS, with 68% of the fitted canvas above it for route development.
- **Commit:** (this one)
- **Status:** On coach
- **Notes:** Saved football coordinates and data models remain unchanged. Pointer coordinates are converted through the same camera used to render the field.

## 2026-09-22 — Add Fit, zoom, and pan to Play Art
- **Asked for:** Default to Fit to Screen and provide minus, percentage, plus, Fit, and panning when zoomed.
- **Changed:** Added canvas-only zoom from 100% Fit to 400%, a Pan mode for dragging the zoomed view, and immediate Fit reset. Fit includes the saved play's drawing bounds.
- **Commit:** (this one)
- **Status:** On coach
- **Notes:** Camera changes do not alter saved positions or route geometry. Selecting a drawing tool exits Pan mode.

## 2026-09-21 — Expand Play Art into a wide drawing workspace
- **Asked for:** Make the screen fit like the supplied wide coaching-board screenshot.
- **Changed:** Made Play Art a focused drawing workspace with three compact options menus across the top and the drawing tools under the field. Added a wide, uniformly scaled field window with a field-position control and Show full field option.
- **Commit:** (this one)
- **Status:** On coach
- **Notes:** Preserves graphite styling, player positions, routes, and proportions. Wide view shows a smaller yardage window rather than squashing the diagram; full-field view remains available for long routes. Camera coordinates are translated for drawing and player positioning without rewriting saved art. My Scheme navigation remains accessible through workspace options.

## 2026-09-21 — Fit Play Art to the screen
- **Asked for:** Scale the diagram to fit the screen without scrolling.
- **Changed:** Sized the centered field from available viewport height, reserving room for its drawing toolbar. Recalculates on resizing and layout changes while preserving the field's aspect ratio. Player symbols and defensive text scale down with the board. Collapsed workspace options and play details by default to reserve more room for the diagram.
- **Commit:** (this one)
- **Status:** On coach
- **Notes:** Saved coordinates and drawing behavior are unchanged. Extra editing panels remain below the board; the field and toolbar fit together on normal desktop viewports.

## 2026-09-21 — Make Play Art strokes thicker
- **Asked for:** Slightly thicken lines, arrows, and other drawn paths.
- **Changed:** Increased saved and preview path stroke widths, block end bars, and print strokes.
- **Commit:** (this one)
- **Status:** On coach
- **Notes:** Field markings and stored path coordinates are unchanged.

## 2026-09-21 — Add optional two-character offensive labels
- **Asked for:** Let users name offensive players with a maximum of two letters or numbers.
- **Changed:** Added an optional displayLabel on offensive markers; the inspector accepts up to two alphanumeric characters and shows entered labels automatically. Studio and print use that label.
- **Commit:** (this one)
- **Status:** On coach
- **Notes:** Explicitly requested persisted label support. Optional field is backward compatible; original position label and type stay intact so center shapes and grouped line dragging do not change when renamed.

## 2026-09-21 — Keep defenders as letters and retain drawing tools
- **Asked for:** Defenders should only be letters with no box; keep each tool active until selecting another tool.
- **Changed:** Removed defender hover/selection boxes, using gold letters for selection. Completing paths, zones, text, or added players no longer switches automatically to Select.
- **Commit:** (this one)
- **Status:** On coach
- **Notes:** Select remains available through the toolbar or keyboard shortcut. Existing drawing data is unchanged.

## 2026-09-21 — Center the Play Art board
- **Asked for:** Center the drawing board on the screen.
- **Changed:** Changed the studio to a centered single-column workspace, with the inspector below the field instead of reserving an empty right column.
- **Commit:** (this one)
- **Status:** On coach
- **Notes:** Retains the field aspect ratio and proportional symbols.

## 2026-09-21 — Restore contextual Talk and Type controls
- **Asked for:** Add talk/speech areas where needed, reusing the existing voice and AI tools.
- **Changed:** Added a shared TalkTypeInput using existing startDictation, with Type fallback, editable transcript, stop controls, and microphone cleanup. Surfaced Teach CounterScheme near the top of My Scheme and added Talk / Type inside the existing Game Plan priority discussion.
- **Commit:** (this one)
- **Status:** On coach
- **Notes:** No new voice service or AI provider. Global Ask CounterScheme and Play Art controls are unchanged. Game Plan still requires explicit Add to Plan approval.

## 2026-09-21 — Review scheme teaching before saving
- **Asked for:** Show what CounterScheme understood and let the coach confirm or correct before saving.
- **Changed:** Reused the existing pure ai.teach parser to hold proposals in component state. Displayed proposed names, kinds, base flags, checks, responsibilities, and notes before Save to My Scheme. Only approval calls existing concept, teaching-log, and conversation actions; existing pending-item review and uploads remain available.
- **Commit:** (this one)
- **Status:** On coach
- **Notes:** No store schema or engine changes. The local parser handles limited patterns; unrecognized text is reported rather than invented. Drafts are not persisted before approval.

## 2026-09-21 — Add reviewed coaching notes through Talk or Type
- **Asked for:** Add Scout Info on Opponent Matchup and contextual input for individual scheme items.
- **Changed:** Added expandable Add Scout Info and Add Coaching Note controls. Talk and Type feed the same draft; review, correction, discard, and explicit Save Note append the coach’s words to the selected opponent or scheme item’s existing notes.
- **Commit:** (this one)
- **Status:** On coach
- **Notes:** Notes are explicitly labeled coach observations, not AI interpretations or snap statistics. Selection IDs are bound to each editor and current notes are read at save time. Structured opponent/player extraction and targeted interpreted scheme updates remain engineering work.

## 2026-09-21 — Move Self Scout to the end of Game Plans
- **Asked for:** Put Self Scout as the last tab under Game Plans.
- **Changed:** Added Self Scout after Call Sheet and Practice Script in shared Game Plans navigation. Removed the My Scheme tools link, changed Self Scout’s back link to Game Plans, and made Game Plans the active section on Self Scout.
- **Commit:** (this one)
- **Status:** On coach
- **Notes:** Corrected the unshipped Reports placement at the coach's request. Kept the existing URL and report status; no data or report logic changed.

## 2026-09-21 — Drop proposed Self Scout placement under Reports
- **Asked for:** Initially put Self Scout under Reports, then corrected to the last tab under Game Plans.
- **Changed:** Removed the unshipped Reports navigation and card additions before publishing.
- **Commit:** (this one)
- **Status:** Dropped
- **Notes:** Reports placement never shipped. Self Scout now belongs to Game Plans.

## 2026-09-21 — Match Play Art field to the CounterScheme theme
- **Asked for:** Make the Play Art background fit my color theme.
- **Changed:** Changed the drawing field to graphite with a subtle dark-gray grid, metallic-gray yard lines and hashes, and a champagne-gold line of scrimmage. Player symbols and labels use light ink; selection accents use deep red and gold. Screen-only route colors are brightened for contrast.
- **Commit:** (this one)
- **Status:** On coach
- **Notes:** Presentation only. Saved drawings, route color values, field geometry, drawing interactions, and the light print renderer are unchanged.

## 2026-09-21 — Regroup My Scheme tabs and library segments
- **Asked for:** My Scheme tabs should be Overview, Scheme Library (Full Calls first, then each segment), Defense Analysis, and Play Art.
- **Changed:** Updated shared navigation and page tabs to those four destinations. Moved Fronts, Coverages, Pressures, and Adjustments into a second-level Scheme Library navigation after Full Calls. Added the same My Scheme tabs to Defense Analysis and Play Art; removed the separate Play Art main-navigation entry.
- **Commit:** (this one)
- **Status:** On coach
- **Notes:** Reused existing pages and query navigation. Full Calls clearly states that saved component combinations are not yet available and links to existing Play Art; engineering request #2 remains open. No stored scheme data, drawing behavior, or engine changes.

## 2026-09-21 — Simplify My Scheme overview
- **Asked for:** Simplify My Scheme to Defensive Identity, Your Defense, and Core Rules without losing information.
- **Changed:** Replaced the overview lists with a concise identity section and 2x2 category summaries. Moved the existing teaching, uploads, confirmation, and activity workflow into an expandable Scheme tools & review panel; preserved terminology, reference, Self Scout, and Defensive Analysis links.
- **Commit:** (this one)
- **Status:** On coach
- **Notes:** Counts show confirmed active items with back-pocket counts separately. Base designations and philosophy reuse existing data. Core Rules explicitly states that system-wide rules are not separately designated; see REQUESTS.md #5. No persisted data or engine changes.

## 2026-09-21 — Make scheme categories consistent card libraries
- **Asked for:** Use the same visual card layout for Fronts, Coverages, Pressures, and Adjustments, with details one level deeper.
- **Changed:** Added shared SchemeConceptCard and SchemeTabs components. Category pages show cards with status, designation, summary, and diagram empty state; opening a card shows saved rules, responsibilities, checks, notes, and an Edit Scheme Item action using the existing editor. Preserved add, filter, confirm, remove, and coverage import functionality.
- **Commit:** (this one)
- **Status:** On coach
- **Notes:** Concept-to-diagram links do not exist yet. Cards honestly say No diagram linked; no drawings are guessed or generated. Automatic previews and diagram editing remain engineering request #1.

## 2026-09-21 — Separate Play Art from My Scheme navigation
- **Asked for:** Keep My Scheme focused on its defensive components and make Play Art a separate main section.
- **Changed:** Promoted the existing Play Art page into main navigation; My Scheme now offers Overview, Fronts, Coverages, Pressures, and Adjustments. Corrected category highlighting and prevented Play Art from highlighting My Scheme.
- **Commit:** (this one)
- **Status:** On coach
- **Notes:** Existing URLs and saved drawings are unchanged. Combining components in Play Art remains engineering request #2.

## 2026-09-21 — Add Play Art under My Scheme
- **Asked for:** Add a Play Art tab under My Scheme that presents the drawing tool with offensive formation, defensive front, offensive play call, and defensive coverage fields.
- **Changed:** Added Play Art to the shared My Scheme navigation, opening the existing diagram workspace. Renamed its heading and placed four labeled text fields directly above the board.
- **Commit:** (this one)
- **Status:** On coach
- **Notes:** Reused offForm and offConcept for offensive descriptions; added optional defFront and defCoverage to existing Call records so all four descriptions save with each diagram. Coach explicitly requested these fields. Existing drawings remain compatible without migration; typed descriptions do not automatically alter alignments or assignments.

## 2026-09-21 — Prevent vertically compressed diagrams
- **Asked for:** The plays look smashed down at times; check the draw diagram again.
- **Changed:** Matched the board's aspect ratio to its 100-by-87 drawing coordinates, disabled flex shrinking of the field, and preserved SVG proportions. Player clearance and start handles now use the measured board height rather than the former fixed wide ratio.
- **Commit:** (this one)
- **Status:** On coach
- **Notes:** The board retains its width and gains the height needed to display routes and alignments without vertical distortion. Saved coordinates, symbols, closer line splits, and drawing tools remain unchanged.

## 2026-09-21 — Remove split control and enlarge offensive symbols
- **Asked for:** Take off Tighten splits, just keep the linemen closer, and make offensive players a little larger because the diagram feels too far away.
- **Changed:** Removed the Tighten splits button and handler. Enlarged proportional offensive symbols from 2.4% to 3.1% of board width, with 24–36px bounds, and matched route clearance and printed symbols.
- **Commit:** (this one)
- **Status:** On coach
- **Notes:** The closer four-unit default splits and the spacing already applied to the coach's open diagram are retained. Group dragging and the wide field remain intact; no bulk changes to saved diagrams.

## 2026-09-21 — Match the supplied coaching-board reference
- **Asked for:** Field and icons need to look like the supplied screenshot.
- **Changed:** Widened the studio board to a 1.85:1 ratio; added a faint gray grid, outlined yard numbers, clearer yard lines, blue-violet line of scrimmage, and horizontal hashes positioned like the reference. Offensive icons are proportional outlined circles, a square center, and triangles for players typed Tight End (or legacy TE labels). Labels default off and remain available through Show Label; hover identifies each player. Updated printed offensive symbols too.
- **Commit:** (this one)
- **Status:** On coach
- **Notes:** No saved coordinates, identity fields, or routes were rewritten. Existing explicit label choices remain honored. Updated masking and start handles for the wider aspect ratio. Local browser checks verified tight-end symbol selection, tighter splits, and player-anchored multi-point drawing. The reference is used for visual direction only; no third-party code or branding was copied.

## 2026-09-21 — Widen the space outside the yard numbers
- **Asked for:** The field needs to be a little wider outside the numbers.
- **Changed:** Moved the yard numbers inward to 11% and 89% of the board width, opening wider visual lanes between the numbers and sidelines in the studio and print view.
- **Commit:** (this one)
- **Status:** On coach
- **Notes:** Sidelines and hash rows stay in place. This changes the field markings, not saved player or route coordinates.

## 2026-09-21 — Tighten offensive line splits
- **Asked for:** Linemen splits are too far apart.
- **Changed:** Reduced default offensive line splits from six to four field units. Added an undoable Tighten splits action for existing diagrams, preserving line order, center position where possible, and individual depths.
- **Commit:** (this one)
- **Status:** On coach
- **Notes:** Coach explicitly requested spacing changes. Updated formation preset coordinates only; no data-model migration or bulk rewrite of saved diagrams. Group dragging and player-relative paths remain intact.

## 2026-09-21 — Make offensive markers more compact for boundary formations
- **Asked for:** Either the offensive players need to be smaller or the field wider; I can't draw a formation into the boundary.
- **Changed:** Reduced offensive markers from 36px to 28px with compact readable labels and thinner borders. Reduced their route-clearance masks and start-handle offsets to match. Scaled offensive symbols down in printed diagrams too.
- **Commit:** (this one)
- **Status:** On coach
- **Notes:** Player coordinates, offensive-line group dragging, defense, field width, and saved routes remain unchanged. Smaller markers leave more usable space for tight boundary formations.

## 2026-09-21 — Drag the offensive line as a group
- **Asked for:** Make it where the offensive line is grouped together for dragging.
- **Changed:** Dragging an offensive lineman in Select mode moves the offensive line as one group, preserving splits and relative depths. Shift-drag adjusts an individual lineman. Group movement is clamped together at the field limits and is one undo action.
- **Commit:** (this one)
- **Status:** On coach
- **Notes:** Uses existing Offensive Line type, falling back to LT/LG/C/RG/RT labels for older presets without a type. Explicit non-line types stay independent. Existing player-attached paths follow their anchors. No model or storage changes. Local browser checks verified five-player movement, preserved spacing at the sideline, and single-step undo; live diagrams were not edited.

## 2026-09-21 — Widen the hashes and remove vertical marks
- **Asked for:** The hashes are a lot wider in high school — no vertical hashes needed.
- **Changed:** Spread the diagram hash rows to 25% and 75% of board width and rendered horizontal ticks only, including the print view.
- **Commit:** (this one)
- **Status:** On coach
- **Notes:** Coach-requested visual spacing, not a regulation-scale field. Sidelines, route space, and saved drawings remain unchanged.

## 2026-09-21 — Add high school hashes and sideline boundaries
- **Asked for:** Put high school hash marks on the diagram and have the sidelines be the ends on the sides.
- **Changed:** Positioned hash rows at one-third and two-thirds of the field width, replaced faint triangles with clear yard ticks and five-yard hash marks, and drew sidelines at both outer board edges. Applied the same markings to printed diagrams.
- **Commit:** (this one)
- **Status:** On coach
- **Notes:** NFHS field reference: https://nsaa-static.s3.amazonaws.com/textfile/fbl/fbfield.pdf. Existing formation coordinates, saved paths, drawing interaction, and route space remain unchanged.

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
