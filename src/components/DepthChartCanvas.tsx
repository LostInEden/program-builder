"use client";

import { motion } from "motion/react";
import { getStructure } from "@/lib/football";
import { slotLabelOf, type Player, type Overrides } from "@/lib/store";

// Per-level vertical bands (percent of field height), matching the coach's
// mock: secondary on top, second level in the middle, front at the bottom.
// Within a band, deeper slots (larger structure y) sit slightly higher.
// Values are where the BOTTOM of a chip lands (chips render upward from it).
const BANDS: Record<"deep" | "second" | "front", [number, number]> = {
  deep: [32, 46],
  second: [66, 68],
  front: [91, 92],
};

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

  // Normalize slot.y within each level so every structure fills its band, and
  // spread each band's slots evenly left-to-right (play-canvas x coords bunch
  // the front too tightly for name cards).
  const levelRange = new Map<string, [number, number]>();
  const xRank = new Map<number, { rank: number; count: number }>();
  for (const level of ["deep", "second", "front"] as const) {
    const members = structure.slots
      .map((s, i) => ({ ...s, i }))
      .filter((s) => s.level === level);
    const ys = members.map((s) => s.y);
    if (ys.length) levelRange.set(level, [Math.min(...ys), Math.max(...ys)]);
    [...members]
      .sort((a, b) => a.x - b.x)
      .forEach((s, rank) => xRank.set(s.i, { rank, count: members.length }));
  }
  const topFor = (level: "deep" | "second" | "front", y: number) => {
    const [lo, hi] = BANDS[level];
    const [min, max] = levelRange.get(level) ?? [0, 0];
    const norm = max > min ? (y - min) / (max - min) : 0.5;
    return hi - norm * (hi - lo); // deeper (larger y) → higher on the card
  };
  const leftFor = (i: number) => {
    const r = xRank.get(i);
    if (!r) return structure.slots[i].x;
    return 8 + ((r.rank + 0.5) / r.count) * 84;
  };

  return (
    <div
      className={`relative rounded-xl border border-line bg-[#f8fafd] aspect-[12/5] min-h-64 overflow-hidden ${className}`}
    >
      {/* vertical yard lines with rotated numbers, like a field strip */}
      {[8, 22.75, 36.5, 50, 63.5, 77.25, 92].map((x, i) => (
        <div key={x} className="absolute inset-y-0" style={{ left: `${x}%` }}>
          <div className="absolute inset-y-2 w-px bg-ink/8" />
          {[null, "10", "30", "50", "30", "10", null][i] && (
            <span className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rotate-90 text-[13px] font-bold text-ink/10 select-none tabular-nums">
              {[null, "10", "30", "50", "30", "10", null][i]}
            </span>
          )}
        </div>
      ))}
      {/* hash ticks */}
      {[30, 45, 60, 75].map((y) => (
        <div key={y} className="absolute inset-x-6 flex justify-between pointer-events-none" style={{ top: `${y}%` }}>
          {Array.from({ length: 24 }, (_, i) => (
            <span key={i} className="h-1 w-px bg-ink/5" />
          ))}
        </div>
      ))}

      {structure.slots.map((slot, i) => {
        const ids = slots[i] ?? [];
        const selected = selectedSlot === i;
        const label = slotLabelOf(overrides, structureId, i);
        return (
          <motion.button
            key={i}
            type="button"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.03 }}
            onClick={onSlotClick ? () => onSlotClick(i) : undefined}
            className={`absolute -translate-x-1/2 -translate-y-full flex flex-col items-center ${
              onSlotClick ? "cursor-pointer" : "cursor-default"
            }`}
            style={{ left: `${leftFor(i)}%`, top: `${topFor(slot.level, slot.y)}%` }}
          >
            <span
              className={`display relative z-10 rounded-[4px] px-2.5 py-[3px] text-[10.5px] font-bold tracking-wide text-white transition-colors ${
                selected ? "bg-ember" : ids.length > 0 ? "bg-navy" : "bg-dim/70"
              } ${onSlotClick ? "hover:bg-ember" : ""}`}
            >
              {label}
            </span>
            <span className="-mt-0.5 min-w-[86px] max-w-32 rounded-md border border-line bg-white shadow-sm px-2 pt-1.5 pb-1 text-left">
              {ids.length === 0 && <span className="block text-[10px] text-dim/70 italic px-0.5">open</span>}
              {ids.slice(0, 2).map((pid, depth) => {
                const p = byId.get(pid);
                return p ? (
                  <span
                    key={pid}
                    className={`block truncate text-[11px] leading-4.5 ${depth === 0 ? "font-semibold text-ink" : "text-dim"}`}
                  >
                    <span className="tabular-nums text-dim mr-1.5">{p.jersey ?? "—"}</span>
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
