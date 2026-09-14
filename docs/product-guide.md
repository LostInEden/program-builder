# CounterScheme — Product Walkthrough & Guide

*As of September 14, 2026. Live at https://program-builder-lostinedens-projects.vercel.app*

CounterScheme is a defense-first coaching app. You enter your team, teach it your defense, upload the opponent's film breakdown, and it turns that into a scouting report, a game plan, and a call sheet — with every claim backed by the snaps it came from. It organizes what the staff already produces; it doesn't create homework. You make every call.

The week it's built around:

**Scouting Report** (what they do) → **Game Plan** (what we're going to do about it) → **Call Sheet** (everything on one page for Friday)

Everything else — your team, your scheme, the analysis, practice reps — feeds those three.

---

## Part 1 — Walkthrough

### 1.1 Getting around

One navigation bar down the left. Click a section and its pages open underneath it.

| Section | What's inside |
|---|---|
| **Home** | Where you are in each system this week; Scouting report → Game plan → Call sheet shortcuts |
| **My Team** | Depth Chart, Roster, Player Profiles, Weight Room, Injuries, Watch List, Season Schedule |
| **My Scheme** | Fronts, Coverages, Pressures, Adjustments, Coverage Library, Terminology |
| **Opponent Matchup** | The opponent dashboard, plus the Scouting Report |
| **Game Plans** | The plan, plus Call Sheet and (optional) Practice Script |
| **Defensive Analysis** | Strengths, Concerns, Recommendations about your saved defense |
| **Reports** | Season rollups (fills in as the season does) |
| **Settings** | Program info, skill categories |

Top bar: player search, **Ask CounterScheme** (the conversation), recent updates, your name. On a phone, a bottom tab bar gives you Chat / Plan / Opponent / Team.

### 1.2 First-time setup (about 15 minutes)

1. **Settings → Program.** School name, level, state, classification. Mascot and coach name are optional. This replaces the placeholder identity everywhere.
2. **My Team → Import Roster.** Drop in a CSV or PDF roster (Hudl, MaxPreps, SportsEngine, or your own sheet). Map the columns once — jersey, name, position, class are the core; height/weight and testing numbers are optional. Missing data never blocks the import.
3. **My Team → Depth Chart.** One Varsity Base chart. Click a position, pick players from the eligible list (filtered by position), order them — first is the starter, up to three deep, nothing required. Packages (Heavy, Nickel, whatever you call them) branch from Base and only store the spots you change. JV and Freshman have their own charts on secondary tabs using the same player profiles.
4. **Player Profiles → Football Skills.** Five 1–5 grades per player, specific to his position (a lineman is graded on Get-Off, Block Destruction, Run Fit, Pass Rush, IQ; a corner on Coverage, Leverage/Eyes, Tackling, Run Support, IQ). Categories are suggested from your scheme and fully editable. Grade the eleven starters first — this is what lets the analysis say *who* fits a job, not just how many bodies are in the box.

### 1.3 Teaching it your defense (My Scheme)

The My Scheme page shows your base defense, philosophy, and four columns — **Fronts, Coverages, Pressures, Adjustments** — each listing what you carry.

**The fastest way in is the Teach box** at the bottom. Type (or dictate) plain football:

> Against 12 personnel we check to Over. On 3rd and long we play Cover 1 Robber. Our base is Okie.

It files each sentence: adjustments become **Trigger → Action → Result** rules in the right category (vs Formations, vs Motions, vs Personnel, Situational Rules, Special Situations); named fronts, coverages, and pressures become concepts. Everything lands in **Recently Added** waiting for a one-click confirm — nothing counts until you say it's right. If it can't file a sentence, it asks one question instead of guessing.

**Manage pages** (click any column's "Manage") let you edit each concept: name, summary, the rule, per-position responsibilities, notes, and two flags — **Base** (your default front/coverage) and **Back pocket** (something you've practiced and could pull out, but don't live in). In-season, the game plan only ever suggests active and back-pocket calls.

**Coverage Library** is the built-in reference of 30 match coverages with every defender's alignment, help, leverage, key, and rules. Any coverage you save can pull its responsibilities from the library and then be edited into your own words. It's educational — the app never forces match coverage on a spot-drop team.

**Terminology** maps what you call positions, formations, and strength to what the app recognizes. You never rename anything to fit the software.

### 1.4 Checking the defense (Defensive Analysis)

Three columns: **Strengths** (what the defense handles well), **Concerns** (where rules conflict or it can be stressed), **Recommendations** (small fixes using what you already carry). Click any card for the why, situational examples, the rule/fit breakdown, and a suggested adjustment. It updates itself whenever the scheme or depth chart changes.

### 1.5 The opponent week

**Add the opponent** (Opponent Matchup → Add Opponent), then **Upload Report**: the Hudl play-by-play export, one row per snap, as a CSV. The column mapping fills itself in from Hudl's headers; every column comes across, including ones the app doesn't know (they're kept with each play). Sparse tagging is normal — if personnel or the ball carrier aren't tagged, those sections just say so.

The moment the file lands, everything computes:

- **Tendency tiles** — run rate, 1st-down run, RPO rate, top play (rates built on play names say "of N plays with a name" so you know the denominator).
- **Down & Distance profile** and your exact situation buckets (1st & 10 normal / behind sticks; 2nd short/manageable/medium/long; 3rd–4th short yardage/manageable/medium/long).
- **Unknown terms** — if their film says UTAH or DOLPHIN and the app doesn't know it, it asks: "What does UTAH mean?" Answer in one line ("Utah is Trips with the TE on") and it's remembered for your team. Standard words (Trips, Deuce Stack, Duo Kick, Pistol…) resolve on their own.

**Scouting Report** (Opponent Matchup → Scouting Report) is the full "what they do," in your five headings: Personnel, Top Formations, Top Plays (most called *and* most dangerous), Best Players, Key Tendencies/Tells. Every tell reads as one sentence — "Right hash + Strength Right → ball goes Right 73% (38% overall)" — with **Evidence** underneath: how many snaps, the rate vs their normal, and the actual plays. Printable.

**Ask CounterScheme** on the matchup page answers questions about this opponent from the data ("What do they run on 3rd down?", "What gives us the best indication of what play is coming?"). Rotating chips show the kinds of questions it handles. Add what you know the same way: "Their QB keeps on every read" or "Dallas is Snag."

**Plan Status** on the Up Next card shows where you are in the week's seven steps — Prepare Opponent Data → Add Coach Knowledge → Scouting Report → Collaborate on Game Plan → Practice Emphasis → Scout Cards → Ongoing. It shows position, not permanently-checked boxes.

### 1.6 Game Plan

Press **Generate Plan** when you feel the scouting is far enough along — it never generates on its own. The draft leads with **their best players** and how to limit them, then the tells worth a call with an **answer inside your defense** (your saved rule, your coverage, your front — never a call you don't carry), then **Concerns** (where they stress your rules with nothing on file), **Small Adjustments**, and **Practice Emphasis**. Sections only exist when there's something real to say; there's no forced "top 3."

Every line: the answer first, an **Evidence** toggle second, **Ask about this** third (opens the conversation on that exact item). Type over any line and it's yours.

After the first draft it's a **living plan**: a new note, a taught rule, or a term answer updates the relevant lines quietly. A **major** change — new film uploaded, base front or coverage changed — doesn't rewrite anything; it stages a review: *"The scouting report changed — 17 lines would change,"* with Accept / Keep mine per line. Lines you wrote or edited are never touched either way.

A line says **"strong enough to lock in"** only when the tell is on 10+ snaps and 30+ points above their normal. Everything else is presented as an option with evidence. Print / Save as PDF.

### 1.7 Call Sheet

One page for Friday: the **full menu** you carry (fronts, coverages, pressures, adjustments as Trigger → Result one-liners, back-pocket calls marked), the **game-plan calls and emphasis** you kept, the **tells to remember** with their sample sizes, and your **situational notes**. Reorder, hide, or rename sections; add your own. Two or three columns, landscape, built to fit a page. It tells you what you have, not what to call.

### 1.8 Practice Script (optional)

From the snaps and the plan it builds a **candidate rep pool** — opponent looks ranked by how often they run it, how well it works, and how much it stresses your rules — each with a one-line "why it matters." You include, exclude, and reorder; it warns when you're past what the kids can master. It then lays out Monday (teach) → Tuesday (apply) → Wednesday (game-like) → Thursday (reminders) and prints text scout cards. Practice plans and drills are a later feature by his own choice.

### 1.9 The conversation

**Ask CounterScheme** is one thread that follows you: it knows the team, the scheme, this week's opponent, the plan, and the reps. Teach a rule, define a word, ask about the opponent, ask why a plan line says what it says, ask what you're repping. Replies are short and direct with a **Go deeper** expander; on judgment calls it ends with one question to make you think. On a phone, `/chat` is the main screen.

---

## Part 2 — How the features work

### The tendency engine
- Reads every snap: down, distance, hash, yard line, personnel, backfield, formation, play, strength, direction, result, gain, player, quarter, motion.
- **Situations** use the coach's exact table; the raw down and distance are kept on every snap underneath.
- **Tells** test every single tag (formation, backfield, personnel, hash, strength, situation, down, motion) and every pair of tags as a condition. For each condition with at least 5 snaps it computes how often the outcome happens (run/pass, direction, play) versus the opponent's own baseline — the **lift**. Tells are ranked by lift × sample size and split into *worth an answer* and *keep an eye on it*. A pair only survives if it beats both of its parent tags. Nothing is claimed on fewer than 5 snaps.
- **Success** comes from result and gain: touchdowns, first downs, explosives (12+ run / 16+ pass), negative plays, turnovers — so "most dangerous" and "most called" are separate lists.
- **Predictive power** ranks tag families (formation, down & distance, strength…) by their best tell, which is how it answers "what best indicates the play coming" and "what drives their play-calling."

### Terminology
A built-in football knowledge base (formations with their structure — receivers per side, TE on/off, backs; run/pass concepts with families like Zone, Gap, RPO, Crossing, Vertical, Screen; backfield sets) matches whole tags and their parts. Anything it can't resolve becomes one question to the coach; the answer is stored per team and used everywhere the tag appears. On his real file it resolved 113 of 124 tags on its own.

### The scheme model
Fronts, coverages, pressures, and adjustments are named concepts with responsibilities, a base flag, an active/back-pocket status, and — for adjustments — Trigger → Action → Result. The Teach parser turns sentences into these and holds them for confirmation. The analysis, the game plan, and the call sheet all read from this one model.

### The game plan generator
- Answers are found inside the coach's system: an adjustment whose trigger matches the look, a front or coverage that fits the concept family (Zone → Tite/Mint; crossing routes → post-safety and CUT rules; screens → Cloud; RPO → the conflict-defender rule), or a 3rd-down pressure. If nothing fits, it says "no check on file" — it never invents one.
- **Merge rules**: generated lines are replaced on regenerate; anything the coach wrote or edited is kept; a major-change review stages the new draft instead of applying it.
- The plan, the analysis, and the practice pool all recompute from the same inputs, so they never disagree.

### Defensive Analysis checks
Base front and coverage saved · stored answers for the seven situations every offense creates (motion, trips, empty, 12 personnel, 3rd & long, red zone, two-minute) · coverage responsibilities written · pressure package variety and a 3rd-down call · man coverage vs the corners' grades · box tackling vs a run-first philosophy · skill ratings coverage · depth chart integrity (duplicates, injured starters, open spots) · **Fundamentals** (more than 12 live calls → trim or back-pocket; run-stop always checked; physicality flagged when DB tackling/run-support grades are low).

### Depth chart and skills
Base plus inherited packages: a package stores only the spots you changed, so a Base starter change flows through. Skill categories come from position type (DL/LB/DB), are adjusted to the scheme (no man coverage taught → no man-coverage grade), and are editable. Weekly game grades feed a quiet trend that surfaces only inside a finding — never as an automatic personnel move.

### Practice pool
Each opponent look is scored by frequency, success, and stress against your rules; looks with no stored answer or behind a Concern score highest. It adds personnel-change operation reps when they use more than one grouping and at most three likely counters, labeled as guesses.

### Data, saving, and printing
Everything is saved in the browser (no account yet), with versioned migrations so updates never lose data. Hudl imports need CSV (Excel → Save As CSV). Scouting Report, Game Plan, and Call Sheet print cleanly to PDF.

---

## Part 3 — How the AI will work, and how we start

### What "the AI" is today
Everything above runs on an in-house engine: real math over real data, with template sentences. It's honest and useful, but it gets literal when a sentence doesn't fit its patterns and it can't reason about anything it wasn't coded to see.

### What changes with a real model
The model plugs into the same contract the local engine already implements — the pages don't change. The rule that stays: **the model reasons; the code counts.** Every percentage, sample size, and lift is computed by the app and handed to the model as facts. The model never invents a number.

Six jobs, in the order we'll turn them on:

1. **Teach parser.** Free text → structured concepts (which column, name, Trigger → Action → Result, confidence, and a clarifying question only when needed). Handles the sentences the pattern-matcher can't. Still lands in Recently Added for confirmation.
2. **Conversation.** The thread becomes a real coach in the room: it can answer any of the ten questions and the ones we didn't anticipate, argue with an idea, and go as deep as asked — always over the scouting numbers, the scheme, and the plan the app hands it.
3. **Game plan writer.** The draft reads like a coordinator wrote it: best players first, tells with answers inside the system, the why in one clause, the lock-in language only where the numbers earn it. Same merge rules and review flow; the model just writes better lines.
4. **Analysis narrative.** Why, examples, and breakdown on each finding written for that specific defense.
5. **Term resolution.** Understand "Utah is Trips with the TE on the line, Y off" without a fixed phrase list.
6. **Practice "why" lines and scout notes.**

### Guardrails (his rules, enforced in the prompt and in code)
- Only his active and back-pocket calls in-season; library ideas are labeled educational.
- Every claim carries its evidence; sample sizes shown; "I don't have that data" when it doesn't.
- Direct, the why in a clause, one thinking question on judgment calls, no filler.
- Quality over quantity; master the basics; run/stop the run; physicality everywhere.
- Never edits the depth chart, the scheme, or a plan line the coach wrote. It proposes; he confirms.
- Player names optional: we can send jersey numbers only.

### What we need from the coach
An **OpenAI API account** (separate from the ChatGPT app — pay-per-use, a few dollars a month at one program's usage) and its key. That makes the product his: his key, his billing. We paste the key into the Vercel project once; it never lives in the browser.

### Implementation plan
1. **Server route.** Add `/api/ai` on Vercel implementing the provider contract with structured outputs (JSON schemas for each job); a `remote` provider in the app that calls it; the local engine stays as the fallback when the model is unavailable. The Vercel build stops being a static export; the GitHub Pages mirror retires.
2. **Teach + Conversation first** — the two places he types.
3. **Game plan writer + analysis narrative** next — the two places he reads.
4. **Term resolution and practice lines.**
5. **Test against his real questions** (Q41's ten) and his real Hudl file; compare model answers to the local engine's numbers to catch any invented figure.
6. **Then accounts** (Supabase) so the conversation follows him across laptop, iPad, and phone and assistants can join with the roles he described.

Once the key is in, step 1 through the first version of step 3 is a few days of work, and he'll feel the difference the first time he types a sentence the pattern-matcher would have bounced.
