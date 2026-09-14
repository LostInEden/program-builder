"use client";

// The plan stays current on its own (Q33) — but it never overwrites the coach
// (Q47). Small changes (a note, a key player, a term answer, a rule taught)
// redraft the generated lines as they land. A MAJOR change — the snaps
// re-imported or a different count, the base front or base coverage swapped —
// is staged as a `pendingUpdate` and reviewed line by line. Coach lines and
// edited lines are never touched either way.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useStore, type GamePlan, type Opponent, type PlanChange } from "@/lib/store";
import { computeFindings } from "@/lib/analyze";
import {
  applyAll, applyChange, diffPlan, keepMine, majorChangeReason, majorInputHash, mergeGamePlan,
  planInputHash, settleUpdate, type PlanSections,
} from "@/lib/plan";
import { ai } from "@/lib/ai";

export function useGamePlan(opponent: Opponent | null) {
  const store = useStore();
  const { gamePlans, updateGamePlan } = store;
  const [busy, setBusy] = useState(false);
  const running = useRef<string | null>(null);

  const plan: GamePlan | undefined = opponent ? gamePlans.find((g) => g.opponentId === opponent.id) : undefined;

  const inputHash = useMemo(
    () => (opponent ? planInputHash(opponent, store.concepts, store.termMap) : ""),
    [opponent, store.concepts, store.termMap],
  );
  const majorHash = useMemo(
    () => (opponent ? majorInputHash(opponent, store.concepts) : ""),
    [opponent, store.concepts],
  );

  /** Fresh draft from the current data. All the math is in the engine. */
  const draft = useCallback(async (o: Opponent) => {
    const s = useStore.getState();
    const ctx = {
      scheme: s.scheme, concepts: s.concepts, players: s.players,
      groups: s.groups, activeGroupId: s.activeGroupId, overrides: s.overrides, termMap: s.termMap,
    };
    return (await ai.gamePlan(o, ctx, computeFindings(ctx).findings)) as unknown as PlanSections;
  }, []);

  /** The coach's press, and every small change after it. */
  const regenerate = useCallback(async () => {
    if (!opponent) return;
    const key = `gen:${opponent.id}:${inputHash}`;
    if (running.current === key) return;
    running.current = key;
    setBusy(true);
    try {
      const fresh = await draft(opponent);
      const prev = useStore.getState().gamePlans.find((g) => g.opponentId === opponent.id);
      updateGamePlan(opponent.id, { ...mergeGamePlan(prev, fresh, inputHash, majorHash), pendingUpdate: undefined });
    } finally {
      setBusy(false);
      running.current = null;
    }
  }, [opponent, inputHash, majorHash, draft, updateGamePlan]);

  /** A major change: draft it, diff it, and wait for him. */
  const stage = useCallback(async () => {
    if (!opponent) return;
    const key = `stage:${opponent.id}:${inputHash}`;
    if (running.current === key) return;
    running.current = key;
    setBusy(true);
    try {
      const fresh = await draft(opponent);
      const prev = useStore.getState().gamePlans.find((g) => g.opponentId === opponent.id);
      const changes = diffPlan(prev, fresh, prev?.declined ?? []);
      if (!changes.length) {
        updateGamePlan(opponent.id, { inputHash, majorHash, pendingUpdate: undefined });
        return;
      }
      updateGamePlan(opponent.id, {
        pendingUpdate: {
          createdAt: Date.now(),
          reason: majorChangeReason(prev, opponent, useStore.getState().concepts),
          inputHash,
          majorHash,
          changes,
        },
      });
    } finally {
      setBusy(false);
      running.current = null;
    }
  }, [opponent, inputHash, majorHash, draft, updateGamePlan]);

  // Auto-refresh only once a plan exists — the first one is still the coach's
  // call, so the empty state stays honest.
  useEffect(() => {
    if (!opponent || !plan?.generatedAt) return;
    if (plan.pendingUpdate) {
      // Already staged for exactly this data: leave it alone until he answers.
      if (plan.pendingUpdate.inputHash !== inputHash) void stage();
      return;
    }
    if (plan.inputHash === inputHash) return;
    // A plan drafted before we started tracking the major inputs has no
    // baseline to compare against — treat that first pass as a small change.
    const major = !!plan.majorHash && plan.majorHash !== majorHash;
    if (major) void stage();
    else void regenerate();
  }, [opponent, plan?.generatedAt, plan?.inputHash, plan?.majorHash, plan?.pendingUpdate, inputHash, majorHash, regenerate, stage]);

  // ---- answering the banner -------------------------------------------------

  const finish = useCallback(
    (cur: GamePlan, patch: Partial<GamePlan>, remaining: PlanChange[]) => {
      const pending = cur.pendingUpdate;
      if (!pending) return;
      updateGamePlan(
        cur.opponentId,
        remaining.length
          ? { ...patch, pendingUpdate: { ...pending, changes: remaining } }
          : { ...patch, ...settleUpdate(pending) },
      );
    },
    [updateGamePlan],
  );

  const current = useCallback(
    () => (opponent ? useStore.getState().gamePlans.find((g) => g.opponentId === opponent.id) : undefined),
    [opponent],
  );
  const without = (list: PlanChange[], c: PlanChange) => list.filter((x) => !(x.id === c.id && x.section === c.section));

  const acceptChange = useCallback(
    (c: PlanChange) => {
      const cur = current();
      if (!cur?.pendingUpdate) return;
      finish(cur, applyChange(cur, c), without(cur.pendingUpdate.changes, c));
    },
    [current, finish],
  );

  const keepChange = useCallback(
    (c: PlanChange) => {
      const cur = current();
      if (!cur?.pendingUpdate) return;
      finish(cur, keepMine(cur, c), without(cur.pendingUpdate.changes, c));
    },
    [current, finish],
  );

  const acceptAllChanges = useCallback(() => {
    const cur = current();
    if (!cur?.pendingUpdate) return;
    finish(cur, applyAll(cur, cur.pendingUpdate), []);
  }, [current, finish]);

  const keepAllMine = useCallback(() => {
    const cur = current();
    if (!cur?.pendingUpdate) return;
    let working = cur;
    let patch: Partial<GamePlan> = {};
    for (const c of cur.pendingUpdate.changes) {
      const p = keepMine(working, c);
      patch = { ...patch, ...p };
      working = { ...working, ...p };
    }
    finish(cur, patch, []);
  }, [current, finish]);

  const stale = !!plan?.generatedAt && plan.inputHash !== inputHash && !plan.pendingUpdate;
  return {
    plan, regenerate, busy, stale, inputHash,
    pending: plan?.pendingUpdate,
    acceptChange, keepChange, acceptAllChanges, keepAllMine,
  };
}

/** Keeps a relative timestamp honest without the coach touching anything. */
export function useTick(ms = 30000) {
  const [, set] = useState(0);
  useEffect(() => {
    const t = setInterval(() => set((x) => x + 1), ms);
    return () => clearInterval(t);
  }, [ms]);
}

/** "Updated just now" / "Updated 6 min ago" / "Updated Tue 4:12 PM". */
export function updatedLabel(ts?: number): string {
  if (!ts) return "Not generated yet";
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 1) return "Updated just now";
  if (mins < 60) return `Updated ${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 12) return `Updated ${hrs} hr${hrs === 1 ? "" : "s"} ago`;
  return `Updated ${new Date(ts).toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" })}`;
}
