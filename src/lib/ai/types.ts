// The AI contract. Every job is structured JSON in, structured JSON out over
// the coach's saved data. Two providers implement it: `local` (heuristics and
// templates, no key, runs in the browser) and a remote model behind a server
// route once the coach's API key is configured. Pages never know which.

import type { Concept, Opponent, Player, PersonnelGroup, Overrides, GamePlan } from "@/lib/store";
import type { Finding } from "@/lib/analyze";

export type TeachResult = {
  // Concepts the parser extracted. They land unconfirmed in "Recently Added".
  concepts: (Partial<Concept> & { kind: Concept["kind"]; name: string })[];
  // Only asked when something is genuinely ambiguous.
  question?: string;
  summary: string; // one line back to the coach
};

export type SchemeContext = {
  scheme: { structureName: string; philosophyTitle: string; philosophy: string };
  concepts: Concept[];
  players: Player[];
  groups: PersonnelGroup[];
  activeGroupId: string;
  overrides: Overrides;
};

export type MatchupAnswer = { answer: string; grounded: boolean };

export interface AiProvider {
  readonly name: string;
  teach(input: string, ctx: SchemeContext): Promise<TeachResult>;
  analyze(ctx: SchemeContext): Promise<Finding[]>;
  gamePlan(opponent: Opponent, ctx: SchemeContext, findings: Finding[]): Promise<Omit<GamePlan, "opponentId">>;
  ask(question: string, opponent: Opponent, ctx: SchemeContext): Promise<MatchupAnswer>;
}
