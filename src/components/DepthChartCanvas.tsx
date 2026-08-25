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
      className={`relative field-lines rounded-xl border border-line bg-[#0d130f] aspect-16/9 min-h-72 overflow-hidden ${className}`}
    >
      {/* line of scrimmage */}
      <div className="absolute inset-x-0 top-[8%] h-px bg-grass/50" />
      <span className="absolute left-2 top-[8%] -translate-y-1/2 text-[10px] text-grass/60 display tracking-widest">
        LOS
      </span>

      {structure.slots.map((slot, i) => {
        const ids = slots[i] ?? [];
        const starter = ids[0] ? byId.get(ids[0]) : undefined;
        const backups = ids.length - 1;
        const selected = selectedSlot === i;
        const label = slotLabelOf(overrides, structureId, i);
        return (
          <motion.button
            key={i}
            type="button"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.03 }}
            onClick={onSlotClick ? () => onSlotClick(i) : undefined}
            className={`absolute -translate-x-1/2 -translate-y-1/2 text-center ${
              onSlotClick ? "cursor-pointer" : "cursor-default"
            }`}
            style={{ left: `${slot.x}%`, top: `${8 + slot.y * 0.88}%` }}
          >
            <span
              className={`grid size-10 place-items-center rounded-full border-2 display text-sm font-bold transition-colors ${
                selected
                  ? "border-ember bg-ember/20 text-ember"
                  : starter
                    ? "border-grass bg-pitch text-grass"
                    : "border-dashed border-dim/60 bg-pitch/60 text-dim"
              } ${onSlotClick ? "hover:border-ember hover:text-ember" : ""}`}
            >
              {label}
            </span>
            <span className="mt-1 block max-w-24 text-[11px] leading-tight text-ink/90">
              {starter ? (
                <>
                  <span className="text-dim">#{starter.jersey ?? "—"}</span> {starter.name}
                  {backups > 0 && <span className="text-dim"> +{backups}</span>}
                </>
              ) : (
                <span className="text-dim/70 italic">open</span>
              )}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
