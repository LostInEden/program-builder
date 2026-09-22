"use client";

import { useEffect, useRef, useState } from "react";
import type { DrawLine, PlayerAppearance, LineKind, LineStyle } from "@/lib/football";
import { arrowStyleOf, ColorChoices, shortLabel } from "./PlayArtStyle";

const selectClass = "w-full rounded border border-line bg-pitch p-1 text-xs";
export default function PlayArtObjectMenu({ position, bounds, player, line, onPlayerChange, onLineChange, onDelete, onClose }: {
  position: [number, number]; bounds: [number, number];
  player?: { appearance: PlayerAppearance; label: string; symbol: NonNullable<PlayerAppearance["symbol"]> };
  line?: DrawLine;
  onPlayerChange: (patch: PlayerAppearance) => void; onLineChange: (patch: Partial<DrawLine>) => void;
  onDelete: () => void; onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(230);
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setHeight(entry.contentRect.height + 18));
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  const width = Math.min(280, bounds[0] - 16);
  const left = Math.max(8, Math.min(bounds[0] - width - 8, position[0] - width / 2));
  const top = position[1] > bounds[1] / 2 ? Math.max(8, position[1] - height - 26) : Math.min(bounds[1] - height - 8, position[1] + 26);
  return <div ref={ref} role="dialog" aria-label={player ? "Edit player" : "Edit drawing"}
    style={{ left, top: Math.max(8, top), width, maxHeight: Math.max(100, bounds[1] - 16) }}
    className="absolute z-30 overflow-y-auto rounded-lg border border-line bg-card p-2 text-ink shadow-xl"
    onPointerDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()} onDoubleClick={e => e.stopPropagation()}
    onKeyDown={e => { e.stopPropagation(); if (e.key === "Escape" || (e.key === "Enter" && (e.target as HTMLElement).tagName === "INPUT")) { e.preventDefault(); onClose(); } }}>
    <div className="mb-2 flex items-center justify-between text-xs font-semibold"><span>{player ? "Player" : "Drawing"}</span><button type="button" onClick={onClose} aria-label="Close object editor">✕</button></div>
    {player && <>
      <label className="flex items-center gap-2 text-xs">Label
        <input aria-label="Player label" value={player.label} maxLength={2} onChange={e => onPlayerChange({ displayLabel: shortLabel(e.target.value) })} className="min-w-0 flex-1 rounded border border-line bg-pitch px-2 py-1" placeholder="0–2 characters" />
      </label>
      <div className="my-2"><ColorChoices label="Player color" value={player.appearance.color} onChange={color => onPlayerChange({ color, fill: color ? "filled" : "outline" })} /></div>
      <details><summary className="cursor-pointer text-[11px] text-dim">More options</summary>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <label className="text-[11px]">Fill<select aria-label="Player fill" className={selectClass} value={player.appearance.fill ?? "outline"} onChange={e => onPlayerChange({ fill: e.target.value as PlayerAppearance["fill"], ...(player.symbol === "letters" && e.target.value !== "outline" ? { symbol: "circle" as const } : {}) })}>
          <option value="outline">Outline</option><option value="shaded">Shaded</option><option value="filled">Filled</option>
        </select></label>
        <label className="text-[11px]">Symbol<select aria-label="Player symbol" className={selectClass} value={player.symbol} onChange={e => onPlayerChange({ symbol: e.target.value as PlayerAppearance["symbol"] })}>
          <option value="circle">Circle</option><option value="square">Square</option><option value="triangle">Triangle</option><option value="letters">Letters only</option>
        </select></label>
      </div>
      </details>
    </>}
    {line && <>
      {line.anchor === "free" ? <ColorChoices label="Drawing color" value={line.color} onChange={color => onLineChange({ color })} /> : <p className="text-xs text-dim">Color follows the player.</p>}
      <div className="mt-2 grid grid-cols-2 gap-2">
        <label className="text-[11px]">Type<select aria-label="Drawing type" className={selectClass} value={line.kind} onChange={e => onLineChange({ kind: e.target.value as LineKind })}><option value="route">Route / Line</option><option value="block">Block</option><option value="motion">Motion</option><option value="pitch">Pitch</option></select></label>
        <label className="text-[11px]">Line style<select aria-label="Drawing line style" className={selectClass} value={line.style ?? (line.kind === "motion" ? "dashed" : line.kind === "pitch" ? "dotted" : "solid")} onChange={e => onLineChange({ style: e.target.value as LineStyle })}><option value="solid">Solid</option><option value="dashed">Dashed</option><option value="dotted">Dotted</option></select></label>
        <label className="text-[11px]">Thickness<select aria-label="Drawing thickness" className={selectClass} value={line.thickness ?? "normal"} onChange={e => onLineChange({ thickness: e.target.value as DrawLine["thickness"] })}><option value="thin">Thin</option><option value="normal">Normal</option><option value="thick">Thick</option></select></label>
        <label className="text-[11px]">Arrows<select aria-label="Drawing arrows" className={selectClass} value={arrowStyleOf(line)} onChange={e => onLineChange({ arrowStyle: e.target.value as DrawLine["arrowStyle"] })}><option value="none">None</option><option value="end">End</option><option value="both">Both ends</option></select></label>
      </div>
      <label className="mt-2 flex items-center gap-2 text-xs"><input type="checkbox" checked={line.smooth ?? false} onChange={e => onLineChange({ smooth: e.target.checked })} />Curved line</label>
    </>}
    <button type="button" onClick={onDelete} className="mt-2 text-xs text-red-400">Delete {player ? "player" : "drawing"}</button>
  </div>;
}
