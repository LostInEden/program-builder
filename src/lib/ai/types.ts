// The AI contract. Every job is structured JSON in, structured JSON out over
// the coach's saved data. Two providers implement it: `local` (heuristics and
// templates, no key, runs in the browser) and a remote model behind a server
// route once the coach's API key is configured. Pages never know which.

import type {
  ChatAction, ChatMessage, Concept, Opponent, Player, PersonnelGroup, Overrides, GamePlan, PracticeSelection, Program,
} from "@/lib/store";
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
  /** The breakdown behind the answer, shown only when he asks to go deeper (Q49). */
  deeper?: string;
  /** Set when the question was really the coach teaching us a word ("Dallas is Snag"). */
  termMapping?: TermResolution;
};

// ---- one conversation (Q26, Q29, Q2) ---------------------------------------
// Everything CounterScheme already knows before the coach types a word: his
// program, his defense, who he plays this week, the plan on file and where the
// practice week stands. He never re-explains the situation.
export type ChatContext = SchemeContext & {
  program?: Program;
  /** Who we're talking about — nearest upcoming week, or the last one he opened. */
  opponent: Opponent | null;
  plan?: GamePlan;
  /** His rep choices for that opponent; the pool itself is recomputed. */
  practiceSelection?: PracticeSelection;
  week?: number | null;
  /** Where he typed it: "/scheme", "/matchup", "/chat". */
  page?: string;
};

/** What the reply asks the app to do — filing concepts, remembering a word. */
export type ChatSideEffects = {
  /** Scheme sentences the parser filed; they land unconfirmed in Recently Added. */
  concepts?: TeachResult["concepts"];
  /** "Dallas is Snag" — remember it for this team. */
  termMapping?: TermResolution;
  /** Opponent questions still show up in his Recent Questions list. */
  question?: { q: string; a: string; opponentId: string };
};

export type ChatReply = {
  reply: Omit<ChatMessage, "id" | "ts"> & { role: "counterscheme"; actions?: ChatAction[] };
  sideEffects: ChatSideEffects;
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
  /**
   * The one conversation. Everything the coach says on any page comes through
   * here; the router decides whether it was a scheme rule to file, a word to
   * remember, a question about the opponent, "why is that the answer?", or the
   * week's reps — and answers coach-to-coach (Q31).
   */
  chat(input: string, ctx: ChatContext): Promise<ChatReply>;
}
