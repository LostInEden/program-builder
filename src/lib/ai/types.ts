// The AI contract. Every job is structured JSON in, structured JSON out over
// the coach's saved data. Two providers implement it: `local` (heuristics and
// templates, no key, runs in the browser) and a remote model behind a server
// route once the coach's API key is configured. Pages never know which.

import type { Concept, Opponent, Player, PersonnelGroup, Overrides, GamePlan } from "@/lib/store";
import type { TermKind, TermMapping } from "@/lib/knowledge";
import type { Finding } from "@/lib/analyze";
import type { PracticePool } from "@/lib/practice";

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
  /** This staff's terminology, when the caller has it (Q27). */
  termMap?: TermMapping[];
};

// One of THIS team's words, understood (Q27). `meaning` is always the coach's
// own sentence — the knowledge base only tells us how to file it.
export type TermResolution = {
  term: string;
  meaning: string;
  kind: TermKind;
  knowledgeId?: string;
  /** What CounterScheme recognized in the answer, if anything. */
  matched: { label: string; meaning: string } | null;
  /** One line back to the coach. */
  reply: string;
};

export type MatchupAnswer = {
  answer: string;
  grounded: boolean;
  /** Set when the question was really the coach teaching us a word ("Dallas is Snag"). */
  termMapping?: TermResolution;
};

export interface AiProvider {
  readonly name: string;
  teach(input: string, ctx: SchemeContext): Promise<TeachResult>;
  analyze(ctx: SchemeContext): Promise<Finding[]>;
  gamePlan(opponent: Opponent, ctx: SchemeContext, findings: Finding[]): Promise<Omit<GamePlan, "opponentId">>;
  ask(question: string, opponent: Opponent, ctx: SchemeContext): Promise<MatchupAnswer>;
  /**
   * The week's candidate rep pool (Q5). The ranking is arithmetic and stays in
   * `src/lib/practice.ts` — a remote model may later rewrite the "why it
   * matters" lines, but it never gets to invent the numbers.
   */
  practicePool(opponent: Opponent, ctx: SchemeContext, plan?: GamePlan): Promise<PracticePool>;
  /** "What does Utah mean?" → "Utah is Trips with the TE on." */
  resolveTerm(term: string, answer: string, kind?: TermKind): Promise<TermResolution>;
}
