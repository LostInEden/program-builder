# CounterScheme — UI Map

Where things live, the theme, the patterns, and the exact line between front-end and everything else. Referenced by `SUPER-PROMPT.md`.

## Screens → files

| Screen (URL) | File | Notes |
|---|---|---|
| Home `/` | `src/app/page.tsx` | Per-system progress cards, Scouting report → Game plan → Call sheet strip |
| My Team `/team?view=…` | `src/app/team/page.tsx` | Views: overview, depth, roster, profiles, weights, injuries, watchlist, schedule |
| Player profile `/team/player?id=` | `src/app/team/player/page.tsx` | Identity, skills (1–5), weekly grades, measurables, evaluation |
| My Scheme `/scheme` | `src/app/scheme/page.tsx` | Identity strip, four columns, Teach box, Recently Added |
| Manage concepts `/scheme/concepts?kind=` | `src/app/scheme/concepts/page.tsx` | List + editor per front/coverage/pressure/adjustment |
| Coverage Library `/scheme/coverages` | `src/app/scheme/coverages/page.tsx` | Reference, read-only content |
| Terminology `/scheme/terminology` | `src/app/scheme/terminology/page.tsx` | Positions / Formations / Strength / Reference tabs |
| Play studio `/scheme/playbook` | `src/app/scheme/playbook/page.tsx` + `components/StudioCanvas.tsx` | Off nav; canvas drawing logic — treat as off-limits except chrome |
| Defensive Analysis `/analysis` | `src/app/analysis/page.tsx` | Three columns of finding cards |
| Opponent Matchup `/matchup?id=` | `src/app/matchup/page.tsx` | Dashboard cards, Up Next + Plan Status, Ask box, importer modal |
| Scouting Report `/scouting?id=` | `src/app/scouting/page.tsx` + `components/TendencyReport.tsx` | Five headings; the report cards are exported components |
| Game Plan `/gameplan?id=` | `src/app/gameplan/page.tsx` | Sections, evidence toggles, pending-update review |
| Call Sheet `/callsheet?id=` | `src/app/callsheet/page.tsx` | Sections, layout editor, landscape print |
| Practice Script `/practice?id=` | `src/app/practice/page.tsx` | Pool, script by day, scout cards |
| Chat `/chat` | `src/app/chat/page.tsx` + `components/ChatThread.tsx`, `ChatDrawer.tsx` | Phone-first thread; drawer on desktop |
| Reports `/reports` | `src/app/reports/page.tsx` | Rollup tiles |
| Settings `/settings` | `src/app/settings/page.tsx` + `components/SkillCategoriesPanel.tsx` | Program info, skill categories |

Shell: `src/app/layout.tsx` (TopNav + SideNav + main + BottomTabs), `src/components/TopNav.tsx`, `SideNav.tsx`, `BottomTabs.tsx`. Shared bits: `PageHeader.tsx`, `PlanStatus.tsx`, `DepthChartCanvas.tsx`, `UnknownTerms.tsx`, `RosterImport.tsx`, `WeightRoomImport.tsx`, `TendencyImport.tsx` (the modals' *appearance* is front-end; their parsing logic is not).

## Theme

`src/app/globals.css` defines the tokens under `@theme`. The names are historical; the values are the light CounterScheme palette:

| Token (class) | Today | Role |
|---|---|---|
| `pitch` | `#f4f6fa` | page background |
| `card` | `#ffffff` | surfaces |
| `line` | `#e3e8f0` | borders |
| `ink` | `#0f1c2e` | primary text (navy) |
| `dim` | `#64748b` | secondary text |
| `grass` / `grass-deep` | `#1d63ed` / `#1450c4` | primary accent (blue) |
| `navy` | `#0b1526` | dark chips, logo |
| `sky`, `ember`, `mind` | blue / amber / violet | secondary accents |

Change the *values* to restyle the whole app at once. Keep the *names* — they're used everywhere. Font is Inter via `layout.tsx` (`--font-inter`); `.display` is the heading utility.

## Patterns used on every page

```
card     = "rounded-xl border border-line bg-card shadow-sm"
cardHead = "display uppercase text-xs font-bold tracking-[0.15em] text-ink px-5 py-3.5 border-b border-line flex items-center gap-3"
input    = "rounded-md border border-line bg-white px-2.5 py-1.5 text-sm focus:outline-none focus:border-grass"
th       = "display uppercase text-[11px] tracking-widest text-dim font-semibold"
```

Print: global `@media print` in `globals.css` with `print-root`, `print-section`, `print-card`, `print-keep`, `no-print`; the call sheet adds landscape rules scoped by `sheet-root`.

Phone: below `lg` the SideNav hides and `BottomTabs` shows; pages use `px-4 sm:px-6`, stacked grids, and tables inside `overflow-x-auto`.

## Where the data comes from (read-only for you)

Everything on screen is read from the zustand store (`useStore` in `src/lib/store.ts`) or computed by a function in `src/lib/`:

- Team: `players`, `groups` (use `effectiveSlots(group, baseGroupFor(groups, level))` — never `group.slots`), `watchList`, `program`, `skillCategories`.
- Scheme: `concepts` (front / coverage / pressure / adjustment; `confirmed`, `isBase`, `status`), `termMap`, `scheme`.
- Opponent: `opponents[]` with `plays[]` (every Hudl column), tendencies computed by `lib/tendencies.ts` (`tendencyReport`, `computeTells`, `situationTable`, `formationsByPersonnel`, `bestPlays`, `keyPlayerUsage`, `headlineFromPlays`).
- Plan: `gamePlans[]` via `useGamePlan(opponent)`; call sheet via `lib/callsheet.ts`; practice via `usePractice(opponent)`.
- Analysis: `computeFindings(...)` in `lib/analyze.ts`.
- Chat: `chat[]` via `useChat()`.

If a value exists in one of those, you can show it anywhere. If it doesn't, it's a request.

## You may / you may not

**May:** any file under `src/app/**/page.tsx` (layout, JSX, classes, copy), `src/app/globals.css`, `src/app/layout.tsx` (arrangement only), `src/components/*` presentational code, new presentational components.

**May not:** anything under `src/lib/`, `package.json`, `next.config.ts`, `vercel.json`, `.claude/`, `scripts/`, `docs/coach-answers/`, `HANDOFF.md` (engineering owns it), deleting pages or data, or any change that alters what is saved, computed, imported, or recommended.

**Grey zone — ask first (write a request, don't guess):** the importer modals' behavior, `StudioCanvas.tsx` internals, `DepthChartCanvas.tsx` positioning math, anything that changes a URL/route.
