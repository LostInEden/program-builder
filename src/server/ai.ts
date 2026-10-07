// The server half of the remote AI provider. The browser (src/lib/ai/remote.ts)
// sends a job plus a FACTS block that the app's own code already computed —
// tendencies, tells, the plan, the coach's saved defense — and the model turns
// that into language. The model never does the math and never sees the key.
//
// One vendor today: OpenAI's Responses API with strict structured outputs.
// Everything vendor-specific lives in callOpenAI().

import { snagReferenceIntent, snagDiagramPayload } from "@/lib/snagReference";
import { BLUEPRINT_SCHEMA, renderBlueprint } from "@/lib/footballBlueprint";
import { referenceBlueprint } from "@/lib/referenceCatalog";
import { COACH_KNOWLEDGE } from "./coachKnowledge";

export const AI_JOBS = ["chat", "ask", "teach", "diagram"] as const;
export type AiJob = (typeof AI_JOBS)[number];

export const PERSONA = `You are CounterScheme, the defensive assistant inside a football coaching app built for a Tennessee high-school head coach and his staff. You talk coach-to-coach: plain, short, direct — answer first, then the reason. No hype, no bullet-point essays unless he asks for a breakdown.

Hard rules:
- Every number you state (percentages, snap counts, sample sizes, records, heights) must appear in the FACTS block. Never estimate, round up, or invent a stat, a player, a formation or a play the facts don't contain. If the facts can't answer it, say exactly what's missing (e.g. "no snaps tagged for 3rd down yet — upload the Hudl breakdown").
- Small samples (under 5 snaps) are leads, not rules — say so.
- The coach makes the final call. You organize, challenge, and explain the why. Never claim a decision was approved, a call was added to the plan, or a depth chart changed.
- Use HIS terminology from the FACTS block when it exists. When recommending a call, prefer calls already saved in his scheme; if you suggest something he doesn't carry, say it's new and what it would cost in reps.
- His program's principles (in FACTS) are the tie-breaker: quality over quantity, master the basics then add, stopping the run is the foundation.
- Stay on football and this app. If the coach explains a football term, treat it as his definition.`;

const JOB_RULES: Record<AiJob, string> = {
  diagram: `Translate the requested football reference into football-v1 assignments, never SVG/pixel coordinates. Respect the coach's request above the supplied assistant answer. Saved facts are authoritative for their scheme; a generic concept may use a conventional example only with its assumptions stated. A custom name without alignments/assignments MUST return one focused question and empty arrays. Do not invent what our/my/tagged call means. If a requested assignment cannot be represented faithfully, ask instead of silently substituting.
Use a formation preset (offense array empty), none for defense only, or custom with explicit offensive alignments. All widths are signed YARDS from ball, screen right positive; depth is yards beyond LOS, offense negative, defense positive. Offense attacks down-screen. mirror flips a preset, not custom coordinates. Screen right is offense's left: disclose screen-side examples. Labels match preset: RT RG C LG LT X H Y Z Q T (I-form uses F, empty W). All labels unique per side, max 2 characters. Use C1/C2 for corners.
ROUTES use player label, named primitive, depth in yards beyond LOS, width NONNEGATIVE lateral yards traveled. inward means toward middle, outward means toward nearest sideline. vertical: straight to depth; hitch: stem then settle 1 yard back; snag: diagonal inside and settle; slant: 1-yard stem then inside; out/in/cross: stem to depth then lateral break; corner/post: stem to depth then diagonal 4 yards deeper outward/inward; flat: release outside to depth; wheel: flat then up to depth; comeback: stem then outside 3 yards back. Do not use a primitive if its direction doesn't match the request. Supply explicit paths instead. Check width against receiver split: X=8 H=20 Y=80 Z=93 in 2x2; trips H=72 Y=80 Z=92; bunch H=70 Y=74 Z=78. Field width 53.33 yards; default ball centered. Route endpoint must stay on field, maximum 19 yards beyond LOS. If deeper routes requested, ask to shorten displayed reference instead of clipping.
DEFENDERS use technique 0/1/2i/2/3/4i/4/5/6i/6/9 at depth 0.5–2, side left/middle/right SCREEN SIDE. 0 requires middle. Others require left/right. Techniques use the fixed OL: C=50, guards=46/54, tackles=42/58. 6i/6/9 REQUIRE an attached tight end drawn in offense (Doubles TE preset or custom). Even a down-linemen-only front request must include that offensive reference, never formation none when using 6i/6/9. Use landmark for other spacing. Landmark uses width/depth. Give each player unique labels, e.g E1/E2. A front alone does not imply gap fits or coverage; show only known alignments. Tite is 4i–0–4i; Bear interior is 3–0–3, edge responsibilities unspecified.
PATHS support explicit run tracks, blocking, pressure, motion, and routes not covered by a primitive. Specify side, exact player label, kind, brief assignment, and ordered destinations in signed width/depth yards from BALL/LOS; renderer attaches start to player. Do not duplicate a player's route in paths. Blocking/run/pressure assignments require a specified opponent look and rules; if missing ask for those rather than guessing targets. ZONES require a defender label, landmark width/depth, radii in yards and coverage assignment. Coverage landmarks alone do not establish pattern-match rules; state omissions. Don't add defense to an offense-only question.
Keep reference concise and uncluttered. Explanation must match assignments. Enumerate formation, intended side, depths and omitted assignments in assumptions. Never promise correctness or claim it is a saved call. Return a question if uncertain.`,
  chat: `Never draw a football play with ASCII art, dots, slashes, or Unicode arrows in the reply. Those are not usable diagrams. When asked for a drawing, explain the concept briefly and direct the coach to Show reference diagram. Do not claim a field diagram exists until the drawing tool has made one.
JOB: reply to the coach's latest message in the ongoing CounterScheme conversation.
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
  diagram: BLUEPRINT_SCHEMA,
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
  if (job === "diagram") {
    const intent = snagReferenceIntent(typeof input.question === "string" ? input.question : "", typeof input.answer === "string" ? input.answer : "");
    if (intent === "standard") return snagDiagramPayload();
    const known = referenceBlueprint(typeof input.question === "string" ? input.question : "");
    if (known) return known;
  }
  const instructions = [
    PERSONA,
    COACH_KNOWLEDGE.trim() ? `The coach's own football knowledge, in his words (authoritative for his scheme and terminology):\n${COACH_KNOWLEDGE.trim()}` : "",
    JOB_RULES[job],
  ].filter(Boolean).join("\n\n");
  const text = await callOpenAI(instructions, renderInput(input), job, SCHEMAS[job]);
  try {
    let result = JSON.parse(text);
    if (job === "diagram") {
      try { renderBlueprint(result, "3-4"); }
      catch (error) {
        // One bounded repair using the original request: never ask the coach to
        // repeat an alignment that the model simply forgot to include.
        try {
          const repaired = await callOpenAI(instructions + "\nRepair the validation issue without changing the coach's request. Include any required alignment reference. If it cannot be fixed faithfully, return a focused question.", renderInput({ ...input, rejectedBlueprint: result, validationError: error instanceof Error ? error.message : "Invalid assignments" }), job, SCHEMAS[job]);
          result = JSON.parse(repaired);
          renderBlueprint(result, "3-4");
        } catch {
          return { ...result, question: `I couldn’t draw that reliably: ${error instanceof Error ? error.message : "Please clarify the alignments and assignments."}` };
        }
      }
    }
    return result;
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
    signal: AbortSignal.timeout(name === "diagram" ? 25_000 : 55_000),
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
