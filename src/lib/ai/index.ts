// Provider selection. The local engine is the default; the remote model
// (OpenAI, via POST /api/ai) is enabled by building with
// NEXT_PUBLIC_AI_PROVIDER=remote once OPENAI_API_KEY is set on the server —
// see docs/AI-SETUP.md. Pages only import `ai` and never know which provider
// answered; the remote one falls back to local on any failure.

import { localProvider } from "./local";
import { remoteProvider } from "./remote";
import type { AiProvider } from "./types";

export type {
  AiProvider, TeachResult, SchemeContext, MatchupAnswer, ChatContext, ChatReply, ChatSideEffects,
} from "./types";

/** The coach's ten example questions (Q41) — the rotating chips on every Ask box. */
export { COACH_QUESTIONS } from "./local";

const providers: Record<string, AiProvider> = {
  local: localProvider,
  remote: remoteProvider,
};

const selected = process.env.NEXT_PUBLIC_AI_PROVIDER ?? "local";
export const ai: AiProvider = providers[selected] ?? localProvider;
export const AI_LABEL = ai.name;
/** True when a language model (not just the rules engine) writes the replies. */
export const AI_IS_MODEL = ai === remoteProvider;
