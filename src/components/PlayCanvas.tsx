"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  MousePointer2,
  ArrowUpRight,
  RectangleHorizontal,
  MoveRight,
  Circle,
  Undo2,
  Eraser,
  Check,
  Trash2,
} from "lucide-react";
import {
  getStructure,
  defenseCanvasY,
  FIELD_H,
  LOS_Y,
  type DrawLine,
  type Zone,
  type LineKind,
} from "@/lib/football";
import { useStore, type Call, type Player } from "@/lib/store";

type Tool = "select" | "route" | "block" | "motion" | "zone";
type Pt = [number, number];

const uid = () => Math.random().toString(36).slice(2, 9);

const TOOLS: { id: Tool; icon: typeof MousePointer2; label: string; hint: string }[] = [
  { id: "select", icon: MousePointer2, label: "Select", hint: "Drag players · click lines to edit" },
  { id: "route", icon: ArrowUpRight, label: "Route", hint: "Click a player, click waypoints, double-click to finish" },
  { id: "block", icon: RectangleHorizontal, label: "Block", hint: "Click a player, click waypoints, double-click to finish" },
  { id: "motion", icon: MoveRight, label: "Motion", hint: "Click a player, click waypoints, double-click to finish" },
  { id: "zone", icon: Circle, label: "Zone", hint: "Drag on the field to draw a coverage area" },
];

export default function PlayCanvas({
  call,
  structureId,
  groupSlots,
  players,
  labelFor,
  selectedSlot,
  onSelectSlot,
  selectedOff,
  onSelectOff,
}: {
  call: Call;
  structureId: string;
  groupSlots: Record<number, string[]>;
  players: Player[];
  labelFor: (i: number) => string;
  selectedSlot: number | null;
  onSelectSlot: (i: number | null) => void;
  selectedOff: string | null;
  onSelectOff: (id: string | null) => void;
}) {
  const updateCall = useStore((s) => s.updateCall);
  const structure = getStructure(structureId);
  const byId = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);

  const fieldRef = useRef<HTMLDivElement>(null);
  const [tool, setTool] = useState<Tool>("select");
  const [draft, setDraft] = useState<{ anchor: string; anchorPos: Pt; rel: Pt[] } | null>(null);
  const [hover, setHover] = useState<Pt | null>(null);
  const [zoneStart, setZoneStart] = useState<Pt | null>(null);
  const [selLine, setSelLine] = useState<string | null>(null);
  const [selZone, setSelZone] = useState<string | null>(null);
  const dragRef = useRef<{ kind: "off" | "def"; id: string; slot?: number; moved: boolean } | null>(null);
  const undoStack = useRef<Pick<Call, "offLook" | "lines" | "zones" | "defOffsets">[]>([]);

  const snapshot = () => {
    undoStack.current.push({
      offLook: call.offLook.map((m) => ({ ...m })),
      lines: call.lines.map((l) => ({ ...l, points: l.points.map((p) => [...p] as Pt) })),
      zones: call.zones.map((z) => ({ ...z })),
      defOffsets: { ...call.defOffsets },
    });
    if (undoStack.current.length > 50) undoStack.current.shift();
  };

  const undo = () => {
    const prev = undoStack.current.pop();
    if (prev) updateCall(call.id, prev);
    setSelLine(null);
    setSelZone(null);
  };

  // ── position helpers (canvas space: x 0–100, y 0–75) ──────────────────────
  const defPos = (i: number): Pt => {
    const slot = structure.slots[i];
    const off = call.defOffsets[i] ?? [0, 0];
    return [slot.x + off[0], defenseCanvasY(slot.y) + off[1]];
  };
  const anchorPos = (anchor: string): Pt | null => {
    if (anchor.startsWith("off:")) {
      const m = call.offLook.find((x) => x.id === anchor.slice(4));
      return m ? [m.x, m.y] : null;
    }
    if (anchor.startsWith("def:")) {
      const i = Number(anchor.slice(4));
      return structure.slots[i] ? defPos(i) : null;
    }
    return [0, 0];
  };
  const toCanvas = (e: { clientX: number; clientY: number }): Pt => {
    const r = fieldRef.current!.getBoundingClientRect();
    return [
      Math.min(99, Math.max(1, ((e.clientX - r.left) / r.width) * 100)),
      Math.min(FIELD_H - 1, Math.max(1, ((e.clientY - r.top) / r.height) * FIELD_H)),
    ];
  };

  const lineColor = (anchor: string, selected: boolean) =>
    selected ? "#f59e0b" : anchor.startsWith("def:") ? "#38bdf8" : "#f87171";

  // ── drawing interactions ──────────────────────────────────────────────────
  const startDraft = (anchor: string) => {
    const pos = anchorPos(anchor);
    if (pos) setDraft({ anchor, anchorPos: pos, rel: [] });
  };

  const finishDraft = () => {
    if (draft && draft.rel.length > 0) {
      snapshot();
      updateCall(call.id, {
        lines: [
          ...call.lines,
          { id: uid(), anchor: draft.anchor, kind: tool === "select" || tool === "zone" ? "route" : tool, points: draft.rel },
        ],
      });
    }
    setDraft(null);
    setHover(null);
  };

  const onPlayerClick = (anchor: string) => {
    if (tool === "route" || tool === "block" || tool === "motion") {
      if (!draft) startDraft(anchor);
      return;
    }
    if (tool === "select") {
      if (anchor.startsWith("off:")) {
        onSelectOff(anchor.slice(4));
        onSelectSlot(null);
      } else {
        onSelectSlot(Number(anchor.slice(4)));
        onSelectOff(null);
      }
      setSelLine(null);
      setSelZone(null);
    }
  };

  const onFieldPointerDown = (e: React.PointerEvent) => {
    if (tool === "zone" && e.target === e.currentTarget) setZoneStart(toCanvas(e));
  };

  const onFieldClick = (e: React.MouseEvent) => {
    if (draft) {
      const [x, y] = toCanvas(e);
      setDraft({ ...draft, rel: [...draft.rel, [x - draft.anchorPos[0], y - draft.anchorPos[1]]] });
    } else if (tool === "select" && e.target === e.currentTarget) {
      onSelectSlot(null);
      onSelectOff(null);
      setSelLine(null);
      setSelZone(null);
    }
  };

  const onFieldPointerMove = (e: React.PointerEvent) => {
    if (draft || zoneStart) setHover(toCanvas(e));
    const d = dragRef.current;
    if (!d) return;
    d.moved = true;
    const [x, y] = toCanvas(e);
    if (d.kind === "off") {
      updateCall(call.id, {
        offLook: call.offLook.map((m) => (m.id === d.id ? { ...m, x, y: Math.min(72, Math.max(LOS_Y + 1.5, y)) } : m)),
      });
    } else if (d.slot !== undefined) {
      const slot = structure.slots[d.slot];
      const base: Pt = [slot.x, defenseCanvasY(slot.y)];
      updateCall(call.id, {
        defOffsets: { ...call.defOffsets, [d.slot]: [x - base[0], Math.min(LOS_Y - 1.5, y) - base[1]] },
      });
    }
  };

  const onFieldPointerUp = (e: React.PointerEvent) => {
    if (zoneStart) {
      const [x, y] = toCanvas(e);
      const rx = Math.abs(x - zoneStart[0]) / 2;
      const ry = Math.abs(y - zoneStart[1]) / 2;
      if (rx > 1.5 && ry > 1.5) {
        const cx = (x + zoneStart[0]) / 2;
        const cy = (y + zoneStart[1]) / 2;
        snapshot();
        updateCall(call.id, {
          zones: [...call.zones, { id: uid(), x: cx, y: cy, rx, ry, side: cy < LOS_Y ? "def" : "off" }],
        });
      }
      setZoneStart(null);
      setHover(null);
    }
    if (dragRef.current && !dragRef.current.moved) {
      onPlayerClick(dragRef.current.kind === "off" ? `off:${dragRef.current.id}` : `def:${dragRef.current.slot}`);
    }
    dragRef.current = null;
  };

  const beginDrag = (e: React.PointerEvent, kind: "off" | "def", id: string, slot?: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (tool === "route" || tool === "block" || tool === "motion") {
      if (!draft) startDraft(kind === "off" ? `off:${id}` : `def:${slot}`);
      return;
    }
    if (tool !== "select") return;
    snapshot();
    dragRef.current = { kind, id, slot, moved: false };
  };

  // Keyboard: Escape cancels, Delete removes selection, Ctrl+Z undoes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName ?? "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      if (e.key === "Escape") {
        setDraft(null);
        setZoneStart(null);
        setSelLine(null);
        setSelZone(null);
      } else if ((e.key === "Delete" || e.key === "Backspace") && (selLine || selZone)) {
        snapshot();
        updateCall(call.id, {
          lines: selLine ? call.lines.filter((l) => l.id !== selLine) : call.lines,
          zones: selZone ? call.zones.filter((z) => z.id !== selZone) : call.zones,
        });
        setSelLine(null);
        setSelZone(null);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // ── SVG path builders ─────────────────────────────────────────────────────
  const linePath = (l: DrawLine): { pts: Pt[]; color: string } | null => {
    const a = anchorPos(l.anchor);
    if (!a) return null;
    const pts: Pt[] = [a, ...l.points.map(([dx, dy]) => [a[0] + dx, a[1] + dy] as Pt)];
    return { pts, color: lineColor(l.anchor, l.id === selLine) };
  };

  const blockBar = (pts: Pt[]): { x1: number; y1: number; x2: number; y2: number } | null => {
    if (pts.length < 2) return null;
    const [ax, ay] = pts[pts.length - 2];
    const [bx, by] = pts[pts.length - 1];
    const len = Math.hypot(bx - ax, by - ay) || 1;
    const nx = -(by - ay) / len;
    const ny = (bx - ax) / len;
    const s = 1.6;
    return { x1: bx - nx * s, y1: by - ny * s, x2: bx + nx * s, y2: by + ny * s };
  };

  const selLineObj = call.lines.find((l) => l.id === selLine) ?? null;
  const activeToolMeta = TOOLS.find((t) => t.id === tool)!;

  return (
    <div>
      {/* Toolbar */}
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-full border border-line bg-card p-1">
          {TOOLS.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                finishDraft();
                setTool(t.id);
              }}
              title={t.label}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs display font-semibold transition ${
                tool === t.id ? "bg-grass text-pitch" : "text-dim hover:text-ink"
              }`}
            >
              <t.icon size={14} /> {t.label}
            </button>
          ))}
        </div>
        {draft && (
          <button
            onClick={finishDraft}
            className="inline-flex items-center gap-1.5 rounded-full border border-grass bg-grass/15 px-3 py-1.5 text-xs text-grass"
          >
            <Check size={13} /> Finish line
          </button>
        )}
        <button
          onClick={undo}
          title="Undo (Ctrl+Z)"
          className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs text-dim hover:text-ink"
        >
          <Undo2 size={13} /> Undo
        </button>
        <button
          onClick={() => {
            if (call.lines.length || call.zones.length) {
              snapshot();
              updateCall(call.id, { lines: [], zones: [] });
            }
          }}
          title="Clear all drawings"
          className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs text-dim hover:text-red-400 hover:border-red-500/40"
        >
          <Eraser size={13} /> Clear
        </button>
        <span className="text-xs text-dim ml-auto">{activeToolMeta.hint}</span>
      </div>

      {/* Field */}
      <div
        ref={fieldRef}
        onPointerDown={onFieldPointerDown}
        onPointerMove={onFieldPointerMove}
        onPointerUp={onFieldPointerUp}
        onClick={onFieldClick}
        onDoubleClick={finishDraft}
        className={`relative rounded-xl border border-line bg-[#0d130f] aspect-4/3 overflow-hidden touch-none select-none ${
          tool === "select" ? "" : "cursor-crosshair"
        }`}
      >
        {/* field markings + drawings */}
        <svg viewBox={`0 0 100 ${FIELD_H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
          <defs>
            <marker id="arr-off" viewBox="0 0 6 6" refX="4.6" refY="3" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M0,0 L6,3 L0,6 z" fill="#f87171" />
            </marker>
            <marker id="arr-def" viewBox="0 0 6 6" refX="4.6" refY="3" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M0,0 L6,3 L0,6 z" fill="#38bdf8" />
            </marker>
            <marker id="arr-sel" viewBox="0 0 6 6" refX="4.6" refY="3" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M0,0 L6,3 L0,6 z" fill="#f59e0b" />
            </marker>
          </defs>

          {/* yard lines + hashes */}
          {[7, 14.5, 22, 29.5, 49.5, 57, 64.5, 72].map((y) => (
            <line key={y} x1="0" x2="100" y1={y} y2={y} stroke="rgba(233,239,233,0.06)" strokeWidth="0.25" />
          ))}
          {[38, 62].map((x) =>
            Array.from({ length: 14 }, (_, i) => 4 + i * 5).map((y) => (
              <line key={`${x}-${y}`} x1={x - 0.7} x2={x + 0.7} y1={y} y2={y} stroke="rgba(233,239,233,0.07)" strokeWidth="0.22" />
            )),
          )}
          {/* LOS */}
          <line x1="0" x2="100" y1={LOS_Y} y2={LOS_Y} stroke="rgba(74,222,128,0.55)" strokeWidth="0.35" />

          {/* zones */}
          {call.zones.map((z: Zone) => (
            <ellipse
              key={z.id}
              cx={z.x}
              cy={z.y}
              rx={z.rx}
              ry={z.ry}
              fill={z.id === selZone ? "rgba(245,158,11,0.14)" : z.side === "def" ? "rgba(56,189,248,0.10)" : "rgba(248,113,113,0.10)"}
              stroke={z.id === selZone ? "#f59e0b" : z.side === "def" ? "rgba(56,189,248,0.55)" : "rgba(248,113,113,0.55)"}
              strokeWidth="0.3"
              strokeDasharray="1.4 1"
              style={{ pointerEvents: "all", cursor: "pointer" }}
              onClick={(e) => {
                if (tool !== "select") return;
                e.stopPropagation();
                setSelZone(z.id === selZone ? null : z.id);
                setSelLine(null);
              }}
            />
          ))}

          {/* committed lines */}
          {call.lines.map((l) => {
            const built = linePath(l);
            if (!built) return null;
            const d = built.pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`).join(" ");
            const bar = l.kind === "block" ? blockBar(built.pts) : null;
            const selected = l.id === selLine;
            const markerEnd =
              l.kind === "block" ? undefined : selected ? "url(#arr-sel)" : l.anchor.startsWith("def:") ? "url(#arr-def)" : "url(#arr-off)";
            return (
              <g key={l.id}>
                <path
                  d={d}
                  fill="none"
                  stroke="transparent"
                  strokeWidth="2.5"
                  style={{ pointerEvents: "stroke", cursor: tool === "select" ? "pointer" : undefined }}
                  onClick={(e) => {
                    if (tool !== "select") return;
                    e.stopPropagation();
                    setSelLine(selected ? null : l.id);
                    setSelZone(null);
                    onSelectSlot(null);
                    onSelectOff(null);
                  }}
                />
                <path
                  d={d}
                  fill="none"
                  stroke={built.color}
                  strokeWidth={selected ? 0.55 : 0.42}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  strokeDasharray={l.kind === "motion" ? "1.5 1.1" : undefined}
                  markerEnd={markerEnd}
                />
                {bar && <line x1={bar.x1} y1={bar.y1} x2={bar.x2} y2={bar.y2} stroke={built.color} strokeWidth={selected ? 0.55 : 0.42} strokeLinecap="round" />}
              </g>
            );
          })}

          {/* rubber-band preview */}
          {draft && (
            <path
              d={[
                `M${draft.anchorPos[0]},${draft.anchorPos[1]}`,
                ...draft.rel.map(([dx, dy]) => `L${draft.anchorPos[0] + dx},${draft.anchorPos[1] + dy}`),
                hover ? `L${hover[0]},${hover[1]}` : "",
              ].join(" ")}
              fill="none"
              stroke={lineColor(draft.anchor, false)}
              strokeOpacity="0.6"
              strokeWidth="0.4"
              strokeDasharray={tool === "motion" ? "1.5 1.1" : "0.9 0.9"}
            />
          )}
          {zoneStart && hover && (
            <ellipse
              cx={(zoneStart[0] + hover[0]) / 2}
              cy={(zoneStart[1] + hover[1]) / 2}
              rx={Math.abs(hover[0] - zoneStart[0]) / 2}
              ry={Math.abs(hover[1] - zoneStart[1]) / 2}
              fill="rgba(74,222,128,0.07)"
              stroke="rgba(74,222,128,0.5)"
              strokeWidth="0.3"
              strokeDasharray="1.4 1"
            />
          )}
        </svg>

        {/* LOS tag */}
        <span
          className="absolute left-2 -translate-y-1/2 text-[10px] text-grass/60 display tracking-widest pointer-events-none"
          style={{ top: `${(LOS_Y / FIELD_H) * 100}%` }}
        >
          LOS
        </span>

        {/* defense (top) */}
        {structure.slots.map((slot, i) => {
          const [x, y] = defPos(i);
          const ids = groupSlots[i] ?? [];
          const pl = ids[0] ? byId.get(ids[0]) : undefined;
          const sel = selectedSlot === i;
          const anchored = draft?.anchor === `def:${i}`;
          return (
            <button
              key={`d${i}`}
              onPointerDown={(e) => beginDrag(e, "def", `${i}`, i)}
              className="absolute -translate-x-1/2 -translate-y-1/2 text-center"
              style={{ left: `${x}%`, top: `${(y / FIELD_H) * 100}%` }}
            >
              <span
                className={`grid size-8 place-items-center rounded-full border-2 display text-[11px] font-bold transition ${
                  sel || anchored
                    ? "border-ember bg-ember/20 text-ember"
                    : call.assignments[i]
                      ? "border-sky bg-pitch text-sky"
                      : "border-sky/50 bg-pitch text-sky/80 hover:border-sky"
                }`}
              >
                {labelFor(i)}
              </span>
              {pl && <span className="mt-0.5 block text-[9px] text-dim">#{pl.jersey}</span>}
            </button>
          );
        })}

        {/* offense (bottom) */}
        {call.offLook.map((o) => {
          const anchored = draft?.anchor === `off:${o.id}`;
          const isCenter = o.label.toUpperCase() === "C";
          return (
            <span
              key={o.id}
              onPointerDown={(e) => beginDrag(e, "off", o.id)}
              className={`absolute -translate-x-1/2 -translate-y-1/2 grid size-8 place-items-center border-2 display text-[11px] font-bold select-none ${
                isCenter ? "rounded-md" : "rounded-full"
              } ${
                selectedOff === o.id || anchored
                  ? "border-ember bg-ember/20 text-ember"
                  : "border-red-400/70 bg-pitch text-red-400"
              } ${tool === "select" ? "cursor-grab" : "cursor-crosshair"}`}
              style={{ left: `${o.x}%`, top: `${(o.y / FIELD_H) * 100}%` }}
            >
              {o.label}
            </span>
          );
        })}

        {/* selected line / zone control bar */}
        {(selLineObj || selZone) && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-full border border-line bg-pitch/95 px-2 py-1.5 shadow-lg">
            {selLineObj && (
              <>
                {(["route", "block", "motion"] as LineKind[]).map((k) => (
                  <button
                    key={k}
                    onClick={() => {
                      snapshot();
                      updateCall(call.id, {
                        lines: call.lines.map((l) => (l.id === selLineObj.id ? { ...l, kind: k } : l)),
                      });
                    }}
                    className={`display rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${
                      selLineObj.kind === k ? "bg-ember text-pitch" : "text-dim hover:text-ink"
                    }`}
                  >
                    {k}
                  </button>
                ))}
                <span className="h-4 w-px bg-line" />
              </>
            )}
            <button
              onClick={() => {
                snapshot();
                updateCall(call.id, {
                  lines: selLine ? call.lines.filter((l) => l.id !== selLine) : call.lines,
                  zones: selZone ? call.zones.filter((z) => z.id !== selZone) : call.zones,
                });
                setSelLine(null);
                setSelZone(null);
              }}
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] text-red-400 hover:bg-red-500/10"
            >
              <Trash2 size={12} /> Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
