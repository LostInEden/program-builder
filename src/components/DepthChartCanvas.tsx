"use client";

import { motion } from "motion/react";
import { getStructure } from "@/lib/football";
import { slotLabelOf, type Player, type Overrides } from "@/lib/store";

// Per-level vertical bands (percent of field height), matching the coach's
// mock: secondary on top, second level in the middle, front at the bottom.
// Within a band, deeper slots (larger structure y) sit slightly higher.
// Values are where the BOTTOM of a chip lands (chips render upward from it).
const BANDS: Record<"deep" | "second" | "front", [number, number]> = {
  deep: [50, 64],
  second: [74, 76],
  front: [90, 91],
};

export default function DepthChartCanvas({
  structureId,
  slots,
  players,
  overrides = {},
  onSlotClick,
  selectedSlot,
  changedSlots,
  className = "",
}: {
  structureId: string;
  slots: Record<number, string[]>;
  players: Player[];
  overrides?: Overrides;
  onSlotClick?: (index: number) => void;
  selectedSlot?: number | null;
  /** Spots this package changes from Base — marked so inheritance is visible. */
  changedSlots?: number[];
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
    const slot = structure.slots[i];
    // Keep the inside linebackers central and the corners near the sidelines.
    if (slot.concept === "Off-ball LB" && (slot.pos === "M" || slot.pos === "W")) {
      return slot.x < 50 ? 39 : slot.x > 50 ? 61 : 50;
    }
    if (slot.concept === "Corner") return slot.x < 50 ? 8 : 92;
    const r = xRank.get(i);
    if (!r) return structure.slots[i].x;
    return 8 + ((r.rank + 0.5) / r.count) * 84;
  };

  return (
    <div
      className={`relative rounded-xl border border-line bg-[#174b3b] w-full aspect-[12/5] min-h-90 overflow-hidden ${className}`}
      style={{ backgroundImage: "repeating-linear-gradient(180deg, transparent 0%, transparent 21%, rgba(255,255,255,0.04) 21%, rgba(255,255,255,0.04) 42%)" }}
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-2 rounded-md border border-white/40" />
      {/* Wide 20-yard view, with the line of scrimmage at the bottom. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 select-none">
        {[0, 5, 10, 15, 20].map((yard) => (
          <div key={yard} className="absolute inset-x-2" style={{ top: `${8 + yard * 4.2}%` }}>
            <div className={`absolute inset-x-0 h-px ${yard === 0 ? "bg-white/75" : "bg-white/40"}`} />
            {yard % 10 === 0 && (
              <>
                <span className="absolute left-2 -translate-y-full pb-1 text-sm font-bold tabular-nums text-white/70 sm:left-4 sm:text-lg">{yard === 0 ? "G" : yard}</span>
                <span className="absolute right-2 -translate-y-full pb-1 text-sm font-bold tabular-nums text-white/70 sm:right-4 sm:text-lg">{yard === 0 ? "G" : yard}</span>
              </>
            )}
          </div>
        ))}
        {Array.from({ length: 19 }, (_, i) => i + 1).filter((yard) => yard % 5 !== 0).map((yard) => (
          <div key={yard} className="absolute inset-x-0" style={{ top: `${8 + yard * 4.2}%` }}>
            <span className="absolute left-[37%] h-px w-2 bg-white/45" />
            <span className="absolute right-[37%] h-px w-2 bg-white/45" />
          </div>
        ))}
      </div>

      <div aria-hidden="true" className="pointer-events-none absolute inset-x-2 top-[92%] border-t-2 border-sky-300">
        <span className="absolute left-1/2 top-1 -translate-x-1/2 whitespace-nowrap text-[10px] font-bold tracking-wider text-sky-100">LINE OF SCRIMMAGE</span>
      </div>

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
            style={{ left: `clamp(68px, ${leftFor(i)}%, calc(100% - 68px))`, top: `${topFor(slot.level, slot.y)}%` }}
          >
            <span
              className={`display relative z-10 rounded-[4px] px-2.5 py-[3px] text-[10.5px] font-bold tracking-wide text-white transition-colors ${
                selected ? "bg-ember" : ids.length > 0 ? "bg-navy" : "bg-dim/70"
              } ${onSlotClick ? "hover:bg-ember" : ""}`}
            >
              {label}
            </span>
            <span
              className={`-mt-0.5 min-w-[86px] max-w-32 rounded-md border bg-white shadow-sm px-2 pt-1.5 pb-1 text-left ${
                changedSlots?.includes(i) ? "border-grass ring-1 ring-grass/30" : "border-line"
              }`}
            >
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
