// The server half of the remote AI provider. The browser (src/lib/ai/remote.ts)
// sends a job plus a FACTS block that the app's own code already computed —
// tendencies, tells, the plan, the coach's saved defense — and the model turns
// that into language. The model never does the math and never sees the key.
//
// One vendor today: OpenAI's Responses API with strict structured outputs.
// Everything vendor-specific lives in callOpenAI().

import { COACH_KNOWLEDGE } from "./coachKnowledge";

export const AI_JOBS = ["chat", "ask", "teach"] as const;
export type AiJob = (typeof AI_JOBS)[number];

const PERSONA = `You are CounterScheme, the defensive assistant inside a football coaching app built for a Tennessee high-school head coach and his staff. You talk coach-to-coach: plain, short, direct — answer first, then the reason. No hype, no bullet-point essays unless he asks for a breakdown.

Hard rules:
- Every number you state (percentages, snap counts, sample sizes, records, heights) must appear in the FACTS block. Never estimate, round up, or invent a stat, a player, a formation or a play the facts don't contain. If the facts can't answer it, say exactly what's missing (e.g. "no snaps tagged for 3rd down yet — upload the Hudl breakdown").
- Small samples (under 5 snaps) are leads, not rules — say so.
- The coach makes the final call. You organize, challenge, and explain the why. Never claim a decision was approved, a call was added to the plan, or a depth chart changed.
- Use HIS terminology from the FACTS block when it exists. When recommending a call, prefer calls already saved in his scheme; if you suggest something he doesn't carry, say it's new and what it would cost in reps.
- His program's principles (in FACTS) are the tie-breaker: quality over quantity, master the basics then add, stopping the run is the foundation.
- Stay on football and this app. If the coach explains a football term, treat it as his definition.`;

const JOB_RULES: Record<AiJob, string> = {
  chat: `JOB: reply to the coach's latest message in the ongoing CounterScheme conversation.
You receive: FACTS (computed by the app), the recent conversation, the coach's message, and DRAFT — the app's own rules-based reply, which is always factually grounded but may be stiff or miss the point.
- Use DRAFT's facts and numbers when they answer him; rewrite it so it actually answers what he asked, like a sharp coordinator would. If DRAFT misunderstood him, ignore its framing but never contradict the FACTS.
- If FILED lists scheme items the app just saved as unconfirmed, mention them briefly and remind him they wait for his confirm on My Scheme.
- If the message includes staff-meeting instructions (options, questions, do not finalize), follow them: lay out 2–3 real options from his saved calls, the trade-off of each, and one question back.
- "reply" is what he reads (under ~150 words unless he asked for detail). "deeper" is the optional breakdown behind it (numbers, evidence) or null.`,
  ask: `JOB: answer the coach's question about this week's opponent.
You receive FACTS (the app's computed scouting numbers) and DRAFT (the app's rules-based answer).
- Answer first in one or two sentences, then the evidence. Only numbers from FACTS or DRAFT.
- "grounded" = true only if the FACTS or DRAFT actually contain what answers the question; false if you had to say the data isn't there.
- "deeper" = the supporting breakdown, or null.`,
  teach: `JOB: file what the coach just taught about HIS defense as structured scheme items.
Kinds: "front", "coverage", "pressure" (a blitz/pressure package), "adjustment" (a rule: when TRIGGER, we ACTION, so that RESULT).
- Extract only what he actually said. Do not add standard football details he didn't state; leave unknowns empty/null and ask about the single most important gap in "question".
- Skip anything already listed under Saved scheme in FACTS unless he is clearly adding a new rule to it (then file an adjustment).
- Names use his words and capitalization. "summary" is one short description in his terms. Responsibilities = position/role → job, only if he gave them.
- Adjustments: "category" is one of the listed categories; name it "Trigger = Result" (e.g. "Trips = Solo"); "action" is short ("Check coverage", "Change front", "Bring pressure", or his verb). Pressures: "group" is one of the listed groups, else null.
- "summary" at top level is one line back to him saying what you filed; "question" is null unless something genuinely ambiguous blocks filing it.
- If nothing in the message is a scheme item, return an empty concepts list and a question asking him to say it as "when ___, we ___".`,
};

const str = { type: "string" } as const;
const nstr = { type: ["string", "null"] } as const;

const SCHEMAS: Record<AiJob, object> = {
  chat: {
    type: "object",
    additionalProperties: false,
    required: ["reply", "deeper"],
    properties: { reply: str, deeper: nstr },
  },
  ask: {
    type: "object",
    additionalProperties: false,
    required: ["answer", "deeper", "grounded"],
    properties: { answer: str, deeper: nstr, grounded: { type: "boolean" } },
  },
  teach: {
    type: "object",
    additionalProperties: false,
    required: ["summary", "question", "concepts"],
    properties: {
      summary: str,
      question: nstr,
      concepts: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["kind", "name", "summary", "status", "group", "category", "trigger", "action", "result", "responsibilities", "notes"],
          properties: {
            kind: { type: "string", enum: ["front", "coverage", "pressure", "adjustment"] },
            name: str,
            summary: str,
            status: { type: "string", enum: ["active", "backPocket"] },
            group: { type: ["string", "null"], enum: ["Zone Blitzes", "Man Blitzes", "Edge Blitzes", "Pressure Packages", "3rd Down Calls", null] },
            category: { type: ["string", "null"], enum: ["vs Formations", "vs Motions", "vs Personnel", "Situational Rules", "Special Situations", null] },
            trigger: nstr,
            action: nstr,
            result: nstr,
            responsibilities: {
              type: "array",
              items: { type: "object", additionalProperties: false, required: ["role", "job"], properties: { role: str, job: str } },
            },
            notes: str,
          },
        },
      },
    },
  },
};

export type AiRequest = { job: AiJob; input: Record<string, unknown> };

/** Lay the job's input out as labeled blocks the model can't confuse with instructions. */
function renderInput(input: Record<string, unknown>): string {
  return Object.entries(input)
    .filter(([, v]) => v != null && v !== "" && !(Array.isArray(v) && !v.length))
    .map(([k, v]) => `### ${k.toUpperCase()}\n${typeof v === "string" ? v : JSON.stringify(v, null, 1)}`)
    .join("\n\n");
}

export class AiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export const aiConfigured = () => !!process.env.OPENAI_API_KEY;
export const aiModel = () => process.env.OPENAI_MODEL || "gpt-6-sol";

export async function runJob({ job, input }: AiRequest): Promise<unknown> {
  const instructions = [
    PERSONA,
    COACH_KNOWLEDGE.trim() ? `The coach's own football knowledge, in his words (authoritative for his scheme and terminology):\n${COACH_KNOWLEDGE.trim()}` : "",
    JOB_RULES[job],
  ].filter(Boolean).join("\n\n");
  const text = await callOpenAI(instructions, renderInput(input), job, SCHEMAS[job]);
  try {
    return JSON.parse(text);
  } catch {
    throw new AiError("Model returned malformed JSON", 502);
  }
}

type ResponsesOutput = {
  status?: string;
  error?: { message?: string } | null;
  incomplete_details?: { reason?: string } | null;
  output?: { type: string; content?: { type: string; text?: string; refusal?: string }[] }[];
};

async function callOpenAI(instructions: string, input: string, name: string, schema: object): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: aiModel(),
      instructions,
      input,
      reasoning: { effort: process.env.OPENAI_REASONING_EFFORT || "low" },
      max_output_tokens: 4000,
      store: false,
      text: { format: { type: "json_schema", name, schema, strict: true } },
    }),
    signal: AbortSignal.timeout(55_000),
  });
  const data = (await res.json().catch(() => ({}))) as ResponsesOutput;
  if (!res.ok) {
    // 401 bad key, 429 rate limit / out of credit — pass the reason through for the logs.
    throw new AiError(`OpenAI ${res.status}: ${data.error?.message ?? "request failed"}`, res.status === 401 ? 500 : 502);
  }
  if (data.status === "incomplete") throw new AiError(`OpenAI response incomplete: ${data.incomplete_details?.reason ?? "unknown"}`, 502);
  for (const item of data.output ?? []) {
    if (item.type !== "message") continue;
    for (const c of item.content ?? []) {
      if (c.type === "refusal") throw new AiError(`Model refused: ${c.refusal ?? ""}`, 502);
      if (c.type === "output_text" && c.text) return c.text;
    }
  }
  throw new AiError("OpenAI returned no text", 502);
}
