# Turning on the real AI model

CounterScheme ships with a rules-based local engine. This guide connects a real OpenAI model behind it. The code is already in place: once the key is set, the model starts answering. If the model ever fails (bad key, out of credit, outage), the app quietly falls back to the local engine, so the coach never sees a broken box.

## How it's wired (one paragraph)

The browser never sees the key. Pages call `ai.*` (`src/lib/ai/index.ts`). With `NEXT_PUBLIC_AI_PROVIDER=remote`, that becomes `src/lib/ai/remote.ts`, which runs the local engine first (its routing, filing, counted evidence and links), then posts `{ job, input }` to **`POST /api/ai`** (`src/app/api/ai/route.ts`). The server adds the key and calls OpenAI's Responses API with strict JSON schemas (`src/server/ai.ts`). The model receives a FACTS brief (`src/lib/ai/brief.ts`) that the app's own code computed: his confirmed scheme, terminology, principles, roster health, opponent tendencies and tells, and the plan. It is told never to state a number that isn't in that brief.

| Job | What the model does | Stays local |
|---|---|---|
| `chat` | Writes the reply in the one conversation (drawer, `/chat`, Talk It Through), using the last 12 messages | Routing, links, term filing, the counted draft |
| `ask` | Answers opponent questions on Opponent Matchup | Term mappings ("Dallas is Snag") |
| `teach` | Turns the coach's scheme explanations into structured fronts/coverages/pressures/adjustments (still land **unconfirmed** in Recently Added) | Fallback parser |
| — | — | `analyze`, `gamePlan`, `practicePool`, `resolveTerm`: all the math and all generated plan content |

## Step 1: The OpenAI account (coach's account, ~5 min)

1. Sign in at **platform.openai.com**. This is separate from a ChatGPT subscription; ChatGPT Plus does not include API access.
2. **Billing**: add a payment method and a small prepaid credit (e.g. $10–20).
3. **Limits**: set a **monthly budget** (e.g. $25) and an email alert at 50%. This is the real safety net on the bill.
4. **API keys → Create new secret key**. Scope it to a project named "CounterScheme" and copy the key (it starts with `sk-`). You only get to see it once.

> Don't paste the key into chat (ChatGPT, Claude, text messages). It only goes in the two places below.

## Step 2: Vercel environment variables (~3 min)

Vercel → project **program-builder** → **Settings → Environment Variables**. Add:

| Name | Value | Environments | Notes |
|---|---|---|---|
| `OPENAI_API_KEY` | the `sk-…` key | Production, Preview | Mark **Sensitive**. No `NEXT_PUBLIC_` prefix, ever: that would ship it to browsers. |
| `NEXT_PUBLIC_AI_PROVIDER` | `remote` | Production, Preview | Turns the model on in the browser build. |
| `OPENAI_MODEL` *(optional)* | e.g. `gpt-6-luna` | Production, Preview | Default is `gpt-6-sol` (balanced). `gpt-6-luna` is cheaper; `gpt-6-astra` is the top tier. |
| `OPENAI_REASONING_EFFORT` *(optional)* | `low` | | Default `low`. `medium` gives better football reasoning but is slower and costs more. |

"Preview" is what makes the coach's `coach` branch link use the model too.

## Step 3: Deploy

Environment variables only apply to **new** deployments.

1. Merge this work to `master` and push. Vercel rebuilds production.
2. Merge `master` → `coach` and push, so the coach's preview link gets it.
3. If the variables were added after the last build: Vercel → Deployments → ⋯ → **Redeploy** on the latest production deployment (and the latest `coach` one).

## Step 4: Verify (2 min)

1. Open `https://program-builder-lostinedens-projects.vercel.app/api/ai`. You should see `{"configured":true,"model":"gpt-6-sol"}`. `false` means the key variable isn't on this deployment.
2. Open Ask CounterScheme (`/chat`). The footer should read **"CounterScheme · OpenAI model"**. Ask something open-ended ("Should we play more Cover 3 against them?"). A model reply reads like a person answering the question; the local engine gives a canned "I can answer from the scouting data…" line.
3. If you only get local answers: Vercel → the deployment → **Logs**, filter `api/ai`. The server logs the reason (`OpenAI 401` = bad key, `429` = out of credit or rate limited).

## Testing on your own computer

Create `.env.local` in the repo root (it's git-ignored; see `.env.example`):

```
OPENAI_API_KEY=sk-...
NEXT_PUBLIC_AI_PROVIDER=remote
```

Restart `npm run dev`. Delete the file when you're done if you don't want local testing to bill his account.

## Turning it off

Set `NEXT_PUBLIC_AI_PROVIDER` to `local` (or delete `OPENAI_API_KEY`) and redeploy. The app goes back to the rules engine; nothing else changes.

## What protects the key and the bill

- The key is only read on the server (`src/server/ai.ts`).
- `/api/ai` only accepts requests from the app's own pages (same-origin check), caps request size, and rate-limits each visitor to 30 calls a minute.
- Each call is capped at 4,000 output tokens, and OpenAI is told not to store the conversations (`store: false`).
- The OpenAI monthly budget is the hard ceiling.

## Loading the coach's ChatGPT knowledge

The coach runs `docs/coach-workspace/CHATGPT-EXPORT-PROMPT.md` in his ChatGPT and sends back the export (plus the full ChatGPT data export .zip). Then:

1. Save the raw export as `docs/coach-answers/chatgpt-export.md`.
2. Paste Parts 1–6, trimmed to his actual football, into `COACH_KNOWLEDGE` in `src/server/coachKnowledge.ts`. The model reads it on every call as authoritative for his scheme and terminology. It stays on the server.
3. Part 7's JSON (concepts + terminology) gets imported into his saved scheme as **unconfirmed** items for him to confirm on My Scheme. There's no importer yet; build it (or file it through Teach) when the export arrives.

Everything the coach confirms in the app becomes part of the FACTS brief automatically. `COACH_KNOWLEDGE` is for the reasoning and philosophy the app's data model doesn't capture.
