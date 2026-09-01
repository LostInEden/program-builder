// Provider selection. The local engine is the default; a remote model
// (OpenAI, Anthropic, …) is enabled by pointing NEXT_PUBLIC_AI_PROVIDER at
// "remote" once a server route and the coach's API key exist. Pages only
// import `ai` and never know which provider answered.

import { localProvider } from "./local";
import type { AiProvider } from "./types";

export type { AiProvider, TeachResult, SchemeContext, MatchupAnswer } from "./types";

const providers: Record<string, AiProvider> = {
  local: localProvider,
};

const selected = process.env.NEXT_PUBLIC_AI_PROVIDER ?? "local";
export const ai: AiProvider = providers[selected] ?? localProvider;
export const AI_LABEL = ai.name;
