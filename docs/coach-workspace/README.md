# Coach Workspace — How this works

This folder is the coach's sandbox for how CounterScheme looks and how things are organized. It's set up so he can work with ChatGPT directly, everything gets recorded, and anything that changes what the app *knows* comes to Matt.

**For the coach (three steps):**

1. Open ChatGPT with the GitHub repo connected (`LostInEden/program-builder`).
2. Paste the whole of `SUPER-PROMPT.md` as your first message.
3. Talk to it in football and plain English: "move the tells above the tiles," "I want the depth chart to feel more like Hudl," "show me the best players before anything else on the game plan," "new coat of paint — dark navy, gold accent." It will restate what it's about to do, make the change on its own branch, and give you a preview link to look at. If it says "that one goes to Matt," it means the change would alter what the app knows or computes — it's written up in `REQUESTS.md` and Matt will handle it.

**Files here:**
- `SUPER-PROMPT.md` — what he pastes into ChatGPT. The rules of the sandbox.
- `UI-MAP.md` — where every screen lives, the theme, the patterns, the may/may-not list.
- `CHANGELOG.md` — every change made from the workspace, shipped or not. ChatGPT must update it with each change.
- `REQUESTS.md` — the queue of things that need engineering.

**For Matt:** review `CHANGELOG.md` and `REQUESTS.md` whenever you sit down; PRs from `coach/*` branches are the coach's work — Vercel builds a preview for each one, and `master` only changes when a PR is merged.
