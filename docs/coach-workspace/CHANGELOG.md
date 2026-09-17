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
