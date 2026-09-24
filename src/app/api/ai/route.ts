// POST /api/ai — the only place the OpenAI key is used. The browser sends
// { job, input }; see src/server/ai.ts for the jobs and src/lib/ai/remote.ts
// for the caller. GET is a health check the setup guide uses.
//
// The URL is public, so it guards the coach's bill: same-origin only, a size
// cap, and a per-instance rate limit. The real ceiling is the monthly budget
// set on his OpenAI account (docs/AI-SETUP.md).

import { AI_JOBS, AiError, aiConfigured, aiModel, runJob, type AiJob } from "@/server/ai";

export const maxDuration = 60;

const MAX_BODY = 80_000; // characters — the FACTS brief is capped well under this
const WINDOW_MS = 60_000;
const PER_WINDOW = 30;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > PER_WINDOW;
}

function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function GET() {
  return Response.json({ configured: aiConfigured(), model: aiConfigured() ? aiModel() : null });
}

export async function POST(req: Request) {
  if (!aiConfigured()) return Response.json({ error: "not_configured" }, { status: 503 });
  if (!sameOrigin(req)) return Response.json({ error: "forbidden" }, { status: 403 });
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "local";
  if (rateLimited(ip)) return Response.json({ error: "rate_limited" }, { status: 429 });

  const raw = await req.text();
  if (raw.length > MAX_BODY) return Response.json({ error: "too_large" }, { status: 413 });
  let body: { job?: string; input?: Record<string, unknown> };
  try {
    body = JSON.parse(raw);
  } catch {
    return Response.json({ error: "bad_json" }, { status: 400 });
  }
  if (!AI_JOBS.includes(body.job as AiJob) || !body.input || typeof body.input !== "object") {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }

  try {
    const result = await runJob({ job: body.job as AiJob, input: body.input });
    return Response.json({ result });
  } catch (e) {
    const status = e instanceof AiError ? e.status : 500;
    console.error("[api/ai]", body.job, e instanceof Error ? e.message : e);
    return Response.json({ error: "model_failed" }, { status });
  }
}
