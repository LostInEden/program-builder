"use client";

// One place the practice week is assembled (Q5, Q33). The candidate pool is
// always recomputed from the snaps + the current game plan — only the coach's
// choices are stored — so it stays current the same way the plan does, and
// regenerating never throws away an elimination he already made.

import { useMemo } from "react";
import { useStore, type GamePlan, type Opponent, type PracticeSelection } from "@/lib/store";
import {
  buildPracticePool, buildScript, emptySelection, isIncluded, orderedReps, poolSummary,
  pruneSelection, scoutCards, scriptHasReps, selectedReps,
  type PracticeDay, type PracticePool, type PracticeRep, type ScoutCard, type ScriptDay,
} from "@/lib/practice";

export type PracticeWeek = {
  pool: PracticePool | null;
  selection: PracticeSelection;
  /** The pool in the coach's order, whether or not each rep is in. */
  ordered: PracticeRep[];
  chosen: PracticeRep[];
  script: ScriptDay[];
  cards: ScoutCard[];
  summary: ReturnType<typeof poolSummary> | null;
  plan?: GamePlan;
  /** Step 5/6 state for Plan Status. */
  progress: { reps: number; chosen: number; scripted: boolean };
  isIn: (rep: PracticeRep) => boolean;
  setSelection: (patch: Partial<PracticeSelection>) => void;
  toggle: (rep: PracticeRep, on: boolean) => void;
  move: (repId: string, dir: -1 | 1) => void;
  moveToDay: (repId: string, day: PracticeDay | null, from: PracticeDay) => void;
};

export function usePractice(opponent: Opponent | null): PracticeWeek {
  const concepts = useStore((s) => s.concepts);
  const termMap = useStore((s) => s.termMap);
  const gamePlans = useStore((s) => s.gamePlans);
  const practice = useStore((s) => s.practice);
  const updatePractice = useStore((s) => s.updatePractice);

  const plan = opponent ? gamePlans.find((g) => g.opponentId === opponent.id) : undefined;

  const pool = useMemo(
    () => (opponent ? buildPracticePool({ opponent, concepts, termMap, plan }) : null),
    [opponent, concepts, termMap, plan],
  );

  const stored = opponent ? practice[opponent.id] : undefined;
  const selection = useMemo(
    () => (pool ? pruneSelection(stored ?? emptySelection(), pool) : emptySelection()),
    [stored, pool],
  );

  const ordered = useMemo(() => (pool ? orderedReps(pool, selection) : []), [pool, selection]);
  const chosen = useMemo(() => (pool ? selectedReps(pool, selection) : []), [pool, selection]);
  const script = useMemo(() => (pool ? buildScript(pool, selection) : []), [pool, selection]);
  const cards = useMemo(() => (pool ? scoutCards(pool, selection) : []), [pool, selection]);
  const summary = useMemo(() => (pool ? poolSummary(pool, selection) : null), [pool, selection]);

  const setSelection = (patch: Partial<PracticeSelection>) => {
    if (opponent) updatePractice(opponent.id, { ...patch, generatedAt: selection.generatedAt || Date.now() });
  };

  const toggle = (rep: PracticeRep, on: boolean) =>
    setSelection({
      included: on ? [...new Set([...selection.included, rep.id])] : selection.included.filter((id) => id !== rep.id),
      excluded: on ? selection.excluded.filter((id) => id !== rep.id) : [...new Set([...selection.excluded, rep.id])],
    });

  // Reordering writes the WHOLE current order, so one nudge doesn't reshuffle
  // everything else the next time the pool is rebuilt.
  const move = (repId: string, dir: -1 | 1) => {
    const ids = ordered.map((r) => r.id);
    const i = ids.indexOf(repId);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    setSelection({ order: ids });
  };

  // Moving a rep between days (or dropping it from one) freezes that day's list
  // — from then on it is the coach's script for that day, not ours.
  const moveToDay = (repId: string, day: PracticeDay | null, from: PracticeDay) => {
    const current = Object.fromEntries(script.map((d) => [d.day, d.repIds])) as Record<PracticeDay, string[]>;
    const days: Partial<Record<PracticeDay, string[]>> = { ...selection.days };
    days[from] = (current[from] ?? []).filter((id) => id !== repId);
    if (day) {
      const target = current[day] ?? [];
      days[day] = target.includes(repId) ? target : [...target, repId];
    }
    setSelection({ days });
  };

  return {
    pool,
    selection,
    ordered,
    chosen,
    script,
    cards,
    summary,
    plan,
    progress: { reps: pool?.reps.length ?? 0, chosen: chosen.length, scripted: scriptHasReps(script) },
    isIn: (rep) => isIncluded(rep, selection),
    setSelection,
    toggle,
    move,
    moveToDay,
  };
}
