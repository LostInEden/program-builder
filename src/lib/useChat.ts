"use client";

// One CounterScheme conversation (Q26, Q2). Every box in the app — Teach on My
// Scheme, Ask on Opponent Matchup, the drawer, the phone — sends through this
// hook, so the thread is the same thread everywhere and the coach never
// re-explains the situation.

import { useCallback, useMemo, useState } from "react";
import { useStore, type ChatMessage, type Opponent } from "@/lib/store";
import { usePractice } from "@/lib/usePractice";
import { ai, AI_LABEL, COACH_QUESTIONS } from "@/lib/ai";

/** Who we're talking about: the last opponent he opened, else the next game. */
export function useCurrentOpponent(): Opponent | null {
  const opponents = useStore((s) => s.opponents);
  const lastOpponentId = useStore((s) => s.lastOpponentId);
  const schedule = useStore((s) => s.seasonSchedule);
  return useMemo(() => {
    const last = opponents.find((o) => o.id === lastOpponentId);
    if (last) return last;
    // Nearest upcoming week that hasn't been played.
    const upcoming = schedule.filter((w) => w.opponent && !w.result).sort((a, b) => a.week - b.week);
    for (const w of upcoming) {
      const hit =
        opponents.find((o) => o.week === w.week) ??
        opponents.find((o) => o.name.toLowerCase() === (w.opponent ?? "").toLowerCase());
      if (hit) return hit;
    }
    return opponents.find((o) => !o.isDemo) ?? opponents[0] ?? null;
  }, [opponents, lastOpponentId, schedule]);
}

export type ChatSession = {
  thread: ChatMessage[];
  opponent: Opponent | null;
  busy: boolean;
  /** "Talking about: Westview · Wk 4 · plan drafted · 12 reps chosen" */
  contextLine: string;
  engineLine: string;
  /** Post the coach's line and CounterScheme's answer into the one thread. */
  send: (input: string, page?: string) => Promise<ChatMessage | null>;
  clear: () => void;
};

/**
 * The chips over the box rotate through the coach's own ten questions (Q41) so
 * the same four aren't staring at him all week. "Teach a rule" always stays.
 */
export function quickChips(page = 0, n = 3): string[] {
  const start = ((page * n) % COACH_QUESTIONS.length + COACH_QUESTIONS.length) % COACH_QUESTIONS.length;
  const picks = Array.from({ length: Math.min(n, COACH_QUESTIONS.length) }, (_, i) => COACH_QUESTIONS[(start + i) % COACH_QUESTIONS.length]);
  return [...picks, "Teach a rule"];
}

export const QUICK_CHIPS = quickChips(0);

export function useChat(page?: string): ChatSession {
  const store = useStore();
  const opponent = useCurrentOpponent();
  const { plan, progress } = usePractice(opponent);
  const [busy, setBusy] = useState(false);

  const contextLine = useMemo(() => {
    if (!opponent) return "No opponent on file yet — add one on Opponent Matchup.";
    const bits: string[] = [opponent.name];
    if (opponent.week) bits.push(`Wk ${opponent.week}`);
    bits.push(opponent.plays.length ? `${opponent.plays.length} snaps` : "no snaps tagged");
    bits.push(plan?.generatedAt ? "plan drafted" : "no plan yet");
    if (progress.reps) bits.push(`${progress.chosen} rep${progress.chosen === 1 ? "" : "s"} chosen`);
    return `Talking about: ${bits.join(" · ")}`;
  }, [opponent, plan?.generatedAt, progress.reps, progress.chosen]);

  const send = useCallback(
    async (input: string, fromPage?: string): Promise<ChatMessage | null> => {
      const text = input.trim();
      if (!text || busy) return null;
      setBusy(true);
      const s = useStore.getState();
      const where = fromPage ?? page;
      try {
        s.appendChat({ role: "coach", text, context: { page: where, opponentId: opponent?.id } });
        const res = await ai.chat(text, {
          scheme: s.scheme,
          concepts: s.concepts,
          players: s.players,
          groups: s.groups,
          activeGroupId: s.activeGroupId,
          overrides: s.overrides,
          termMap: s.termMap,
          program: s.program,
          opponent: opponent ?? null,
          plan: opponent ? s.gamePlans.find((g) => g.opponentId === opponent.id) : undefined,
          practiceSelection: opponent ? s.practice[opponent.id] : undefined,
          week: opponent?.week ?? null,
          page: where,
        });

        // Side effects: file what he taught, remember the word, keep the
        // opponent's question list honest.
        const conceptIds = (res.sideEffects.concepts ?? []).map((c) =>
          s.addConcept({ ...c, source: "teach", confirmed: false, createdAt: Date.now() }),
        );
        if (res.sideEffects.concepts?.length) s.addTeachEntry({ input: text, conceptIds });
        if (res.sideEffects.termMapping) {
          const t = res.sideEffects.termMapping;
          s.addTermMapping({ term: t.term, meaning: t.meaning, kind: t.kind, knowledgeId: t.knowledgeId });
        }
        const q = res.sideEffects.question;
        if (q) {
          const o = useStore.getState().opponents.find((x) => x.id === q.opponentId);
          if (o) {
            s.updateOpponent(o.id, {
              questions: [{ id: Math.random().toString(36).slice(2, 9), q: q.q, a: q.a, ts: Date.now() }, ...o.questions].slice(0, 20),
            });
          }
        }

        const id = s.appendChat({
          ...res.reply,
          context: { ...res.reply.context, conceptIds: conceptIds.length ? conceptIds : res.reply.context?.conceptIds },
        });
        return useStore.getState().chat.find((m) => m.id === id) ?? null;
      } finally {
        setBusy(false);
      }
    },
    [busy, opponent, page],
  );

  return {
    thread: store.chat,
    opponent,
    busy,
    contextLine,
    engineLine: `CounterScheme · ${AI_LABEL.toLowerCase()} — a real model plugs in later`,
    send,
    clear: store.clearChat,
  };
}

/** Browser speech-to-text, the same pattern My Scheme uses. Null = unsupported. */
export type SpeechHandle = { stop: () => void };
export function startDictation(onText: (t: string) => void, onEnd: () => void): SpeechHandle | null {
  const w = window as unknown as {
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    SpeechRecognition?: new () => SpeechRecognitionLike;
  };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  if (!Ctor) return null;
  const rec = new Ctor();
  rec.lang = "en-US";
  rec.interimResults = false;
  rec.onresult = (e) => onText(Array.from(e.results).map((r) => r[0].transcript).join(" "));
  rec.onend = onEnd;
  rec.onerror = onEnd;
  rec.start();
  return { stop: () => rec.stop?.() };
}

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop?: () => void;
};
