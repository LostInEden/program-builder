"use client";

import { motion } from "motion/react";
import { getStructure } from "@/lib/football";
import { slotLabelOf, type Player, type Overrides } from "@/lib/store";

export default function DepthChartCanvas({
  structureId,
  slots,
  players,
  overrides = {},
  onSlotClick,
  selectedSlot,
  className = "",
}: {
  structureId: string;
  slots: Record<number, string[]>;
  players: Player[];
  overrides?: Overrides;
  onSlotClick?: (index: number) => void;
  selectedSlot?: number | null;
  className?: string;
}) {
  const structure = getStructure(structureId);
  const byId = new Map(players.map((p) => [p.id, p]));

  return (
    <div
      className={`relative field-lines rounded-xl border border-line bg-[#f8fafd] aspect-16/9 min-h-80 overflow-hidden ${className}`}
    >
      {/* faint yard numbers */}
      {[10, 30, 50, 70, 90].map((x, i) => (
        <span
          key={x}
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 text-4xl font-extrabold text-ink/5 select-none"
          style={{ left: `${x}%` }}
        >
          {[10, 30, 50, 30, 10][i]}
        </span>
      ))}
      {/* line of scrimmage — the offense is below, so the front lines up at the bottom */}
      <div className="absolute inset-x-0 bottom-[4%] h-px bg-grass/40" />
      <span className="absolute left-2 bottom-[4%] translate-y-1/2 text-[10px] text-grass/70 display uppercase tracking-widest font-bold">
        LOS
      </span>

      {structure.slots.map((slot, i) => {
        const ids = slots[i] ?? [];
        const selected = selectedSlot === i;
        const label = slotLabelOf(overrides, structureId, i);
        return (
          <motion.button
            key={i}
            type="button"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.03 }}
            onClick={onSlotClick ? () => onSlotClick(i) : undefined}
            className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center ${
              onSlotClick ? "cursor-pointer" : "cursor-default"
            }`}
            style={{ left: `${slot.x}%`, top: `${86 - slot.y * 0.74}%` }}
          >
            <span
              className={`display rounded-md px-2.5 py-0.5 text-[11px] font-bold tracking-wide text-white transition-colors ${
                selected ? "bg-ember" : ids.length > 0 ? "bg-navy" : "bg-dim/70"
              } ${onSlotClick ? "hover:bg-ember" : ""}`}
            >
              {label}
            </span>
            <span className="mt-0.5 min-w-24 max-w-32 rounded-lg border border-line bg-white shadow-sm px-2 py-1 text-left">
              {ids.length === 0 && <span className="block text-[10px] text-dim/70 italic px-0.5">open</span>}
              {ids.slice(0, 2).map((pid, depth) => {
                const p = byId.get(pid);
                return p ? (
                  <span
                    key={pid}
                    className={`block truncate text-[11px] leading-4.5 ${depth === 0 ? "font-semibold text-ink" : "text-dim"}`}
                  >
                    <span className="tabular-nums text-dim mr-1">{p.jersey ?? "—"}</span>
                    {p.name}
                  </span>
                ) : null;
              })}
              {ids.length > 2 && (
                <span className="block text-[9.5px] text-dim/70 px-0.5">+{ids.length - 2} more</span>
              )}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
