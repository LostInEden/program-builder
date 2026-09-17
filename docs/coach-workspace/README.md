# Coach Workspace — How this works

This folder is the coach's sandbox for how CounterScheme looks and how things are organized. It's set up so he can work with ChatGPT directly, everything gets recorded, and anything that changes what the app *knows* comes to Matt.

**For the coach (three steps):**

1. Go to chatgpt.com/codex, pick the repo `LostInEden/program-builder`, and set the branch picker to **`coach`** (not `master`).
2. Paste the whole of `SUPER-PROMPT.md`, then say what you want changed, and send.
3. When the task finishes, press **Create PR** (top right). You don't have to do anything on GitHub — it merges itself. Wait about two minutes and refresh your link.

What to say — talk to it in football and plain English: "move the tells above the tiles," "I want the depth chart to feel more like Hudl," "show me the best players before anything else on the game plan," "new coat of paint — dark navy, gold accent." It will restate what it's about to do, make the change on its own branch, and give you a preview link to look at. If it says "that one goes to Matt," it means the change would alter what the app knows or computes — it's written up in `REQUESTS.md` and Matt will handle it.

**Where his work lives:** one branch called `coach`. His live link, which rebuilds about a minute after every push:
https://program-builder-git-coach-lostinedens-projects.vercel.app
The real site only changes when Matt merges `coach` into `master`.

**Files here:**
- `SUPER-PROMPT.md` — what he pastes into ChatGPT. The rules of the sandbox.
- `UI-MAP.md` — where every screen lives, the theme, the patterns, the may/may-not list.
- `CHANGELOG.md` — every change made from the workspace, shipped or not. ChatGPT must update it with each change.
- `REQUESTS.md` — the queue of things that need engineering.

**For Matt:** review `CHANGELOG.md` and `REQUESTS.md` on the `coach` branch whenever you sit down. To ship his work: open a pull request from `coach` into `master`, skim the diff (it should only touch pages, components, `globals.css`, and this folder), merge. To give him the latest engineering work: merge `master` into `coach`.
