"use client";

// The plan stays current on its own (Q33). When the opponent's snaps, the
// coach's notes, or the saved defense change, the generated half of the plan
// re-drafts itself; the coach's own lines are never touched. There is still a
// Regenerate button — this just means he rarely has to press it.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useStore, type GamePlan, type Opponent } from "@/lib/store";
import { computeFindings } from "@/lib/analyze";
import { mergeGamePlan, planInputHash } from "@/lib/plan";
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

  const regenerate = useCallback(async () => {
    if (!opponent) return;
    const key = `${opponent.id}:${inputHash}`;
    if (running.current === key) return;
    running.current = key;
    setBusy(true);
    try {
      const ctx = {
        scheme: store.scheme, concepts: store.concepts, players: store.players,
        groups: store.groups, activeGroupId: store.activeGroupId, overrides: store.overrides, termMap: store.termMap,
      };
      const fresh = await ai.gamePlan(opponent, ctx, computeFindings(ctx).findings);
      const prev = useStore.getState().gamePlans.find((g) => g.opponentId === opponent.id);
      updateGamePlan(opponent.id, mergeGamePlan(prev, fresh, inputHash));
    } finally {
      setBusy(false);
      running.current = null;
    }
    // store is a whole-store subscription; the values used are read fresh above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opponent, inputHash, updateGamePlan]);

  // Auto-refresh only once a plan exists — the first one is still the coach's
  // call, so the empty state stays honest.
  useEffect(() => {
    if (!opponent || !plan?.generatedAt) return;
    if (plan.inputHash === inputHash) return;
    void regenerate();
  }, [opponent, plan?.generatedAt, plan?.inputHash, inputHash, regenerate]);

  const stale = !!plan?.generatedAt && plan.inputHash !== inputHash;
  return { plan, regenerate, busy, stale, inputHash };
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
