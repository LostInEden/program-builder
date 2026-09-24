// The remote provider: a real language model behind POST /api/ai.
//
// It never replaces the local engine — it stands on it. Every job runs the
// local engine first (routing, side effects, counted evidence, links), then
// hands the model the app's FACTS brief plus that draft so the model can
// actually answer the coach instead of pattern-matching him. The numbers stay
// the app's; the words become the model's. Any failure (no key, offline,
// rate limit, bad reply) quietly falls back to the local answer.

import type { Concept } from "@/lib/store";
import { localProvider } from "./local";
import { buildBrief } from "./brief";
import type { AiProvider, ChatContext, ChatReply, MatchupAnswer, SchemeContext, TeachResult } from "./types";

// Once the server says it has no key, stop asking for the rest of the session.
let unavailable = false;

async function call<T>(job: "chat" | "ask" | "teach", input: Record<string, unknown>): Promise<T | null> {
  if (unavailable) return null;
  try {
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ job, input }),
    });
    if (res.status === 503 || res.status === 404) unavailable = true;
    if (!res.ok) return null;
    const data = (await res.json()) as { result?: T };
    return data.result ?? null;
  } catch {
    return null;
  }
}

type RemoteConcept = {
  kind: Concept["kind"]; name: string; summary: string; status: "active" | "backPocket";
  group: Concept["group"] | null; category: Concept["category"] | null;
  trigger: string | null; action: string | null; result: string | null;
  responsibilities: { role: string; job: string }[]; notes: string;
};

const rid = () => Math.random().toString(36).slice(2, 9);

/** Model output → the same shape the local parser files, minus anything he already carries. */
function toConcepts(list: RemoteConcept[], existing: Concept[]): TeachResult["concepts"] {
  const have = new Set(existing.map((c) => `${c.kind}|${c.name.trim().toLowerCase()}`));
  return list
    .filter((c) => c.name?.trim() && !have.has(`${c.kind}|${c.name.trim().toLowerCase()}`))
    .map((c) => ({
      kind: c.kind,
      name: c.name.trim(),
      summary: c.summary ?? "",
      status: c.status,
      ...(c.kind === "pressure" && c.group ? { group: c.group } : {}),
      ...(c.kind === "adjustment"
        ? { category: c.category ?? "Situational Rules", trigger: c.trigger ?? "", action: c.action ?? "", result: c.result ?? "" }
        : {}),
      responsibilities: (c.responsibilities ?? []).filter((r) => r.role && r.job).map((r) => ({ id: rid(), ...r })),
      notes: c.notes ?? "",
    }));
}

async function teach(input: string, ctx: SchemeContext): Promise<TeachResult> {
  const r = await call<{ summary: string; question: string | null; concepts: RemoteConcept[] }>("teach", {
    facts: buildBrief(ctx),
    coachSaid: input,
  });
  if (!r) return localProvider.teach(input, ctx);
  const concepts = toConcepts(r.concepts, ctx.concepts);
  if (!concepts.length && !r.question) return localProvider.teach(input, ctx);
  return { concepts, question: r.question ?? undefined, summary: r.summary };
}

async function ask(question: string, opponent: Parameters<AiProvider["ask"]>[1], ctx: SchemeContext): Promise<MatchupAnswer> {
  const draft = await localProvider.ask(question, opponent, ctx);
  // A word he's teaching us ("Dallas is Snag") is filing, not conversation.
  if (draft.termMapping) return draft;
  const r = await call<{ answer: string; deeper: string | null; grounded: boolean }>("ask", {
    facts: buildBrief(ctx, opponent),
    question,
    draft: [draft.answer, draft.deeper].filter(Boolean).join("\n"),
  });
  if (!r?.answer) return draft;
  return { answer: r.answer, deeper: r.deeper ?? draft.deeper, grounded: draft.grounded || r.grounded };
}

async function chat(input: string, ctx: ChatContext): Promise<ChatReply> {
  const draft = await localProvider.chat(input, ctx);
  const effects = { ...draft.sideEffects };

  // He taught something: let the model file it properly (the regex parser
  // only catches "when ___, we ___"). Still lands unconfirmed.
  if (effects.concepts?.length) {
    const better = await teach(input, ctx);
    if (better.concepts.length) effects.concepts = better.concepts;
  }
  // Terminology is exact filing — keep the local reply verbatim.
  if (effects.termMapping) return { reply: draft.reply, sideEffects: effects };

  const r = await call<{ reply: string; deeper: string | null }>("chat", {
    facts: buildBrief(ctx),
    conversation: (ctx.history ?? []).slice(-12).map((m) => `${m.role === "coach" ? "Coach" : "CounterScheme"}: ${m.text.slice(0, 600)}`).join("\n"),
    coachMessage: input,
    draft: [draft.reply.text, draft.reply.deeper].filter(Boolean).join("\n"),
    filed: (effects.concepts ?? []).map((c) => `${c.kind}: ${c.name}`),
  });
  if (!r?.reply) return { reply: draft.reply, sideEffects: effects };
  return {
    reply: { ...draft.reply, text: r.reply, deeper: r.deeper ?? draft.reply.deeper },
    sideEffects: effects.question ? { ...effects, question: { ...effects.question, a: r.reply } } : effects,
  };
}

export const remoteProvider: AiProvider = {
  ...localProvider,
  name: "OpenAI model",
  teach,
  ask,
  chat,
};
