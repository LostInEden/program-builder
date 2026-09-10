"use client";

// Plan Status — the coach's seven steps (Q40). It shows WHERE HE IS in the
// week, not a list of permanently completed chores: everything is read from the
// data, the current step is called out, and step 7 says out loud that the plan
// is never really finished.

import { useMemo } from "react";
import Link from "next/link";
import { Check, ChevronRight, Circle, Dot } from "lucide-react";
import { useStore, type GamePlan, type Opponent } from "@/lib/store";
import { computeTells } from "@/lib/tendencies";
import { planSteps } from "@/lib/plan";
import { usePractice } from "@/lib/usePractice";

const th = "display uppercase text-[11px] tracking-widest text-dim font-semibold";

export default function PlanStatus({ opponent, plan, compact }: { opponent: Opponent; plan?: GamePlan; compact?: boolean }) {
  const termMap = useStore((s) => s.termMap);
  const tellCount = useMemo(
    () => (opponent.plays.length ? computeTells(opponent.plays).actionable.length : 0),
    [opponent.plays],
  );
  const { progress } = usePractice(opponent);
  const steps = planSteps(opponent, plan, termMap.length, tellCount, progress);
  // "Where you are" = the first step that isn't finished.
  const hereIndex = steps.findIndex((s) => !s.done);

  return (
    <div>
      <div className={`${th} mb-2 flex items-center gap-2`}>
        Plan Status
        <span className="ml-auto normal-case tracking-normal font-normal text-dim">where you are</span>
      </div>
      <div className="flex flex-col">
        {steps.map((s, i) => {
          const here = i === hereIndex;
          const body = (
            <>
              <span
                className={`grid size-5 shrink-0 place-items-center rounded-full text-[10px] font-extrabold ${
                  s.done ? "bg-emerald-600 text-white" : here ? "bg-grass text-white" : "border border-line text-dim"
                }`}
              >
                {s.done ? <Check size={12} /> : here ? <Dot size={16} /> : s.n}
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block truncate ${here ? "font-bold text-ink" : s.done ? "font-semibold" : "text-dim"}`}>{s.label}</span>
                {!compact && <span className="block truncate text-[11px] text-dim">{s.detail}</span>}
              </span>
              {here && <span className="shrink-0 rounded-full bg-grass/10 px-2 py-0.5 text-[10px] font-bold text-grass">You are here</span>}
              {s.href && <ChevronRight size={13} className="shrink-0 text-dim" />}
            </>
          );
          const cls = "flex items-center gap-2 py-1.5 text-sm border-b border-line/60 last:border-0 text-left w-full";
          return s.href ? (
            <Link key={s.n} href={s.href} className={`${cls} hover:text-grass`}>
              {body}
            </Link>
          ) : (
            <div key={s.n} className={cls}>
              {body}
            </div>
          );
        })}
      </div>
      {hereIndex === -1 && (
        <p className="mt-2 text-[11px] text-dim inline-flex items-center gap-1">
          <Circle size={9} className="text-grass" /> Nothing is ever locked — keep adding through Friday.
        </p>
      )}
    </div>
  );
}
