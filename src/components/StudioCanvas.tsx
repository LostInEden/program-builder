"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  MousePointer2,
  Minus,
  ArrowUpRight,
  MoveRight,
  RectangleHorizontal,
  Type,
  Circle,
  UserPlus,
  Trash2,
  Undo2,
  Redo2,
} from "lucide-react";
import {
  getStructure,
  defenseCanvasY,
  smoothPath,
  lineDash,
  FIELD_H,
  LOS_Y,
  YD,
  FIELD_PRESETS,
  ROUTE_COLORS,
  type LineKind,
  type LineStyle,
} from "@/lib/football";
import { useStore, type Call, type Player } from "@/lib/store";

export type Selection =
  | { kind: "off"; id: string }
  | { kind: "def"; slot: number }
  | { kind: "line"; id: string }
  | { kind: "zone"; id: string }
  | { kind: "text"; id: string }
  | null;

type Tool = "select" | "line" | "route" | "motion" | "block" | "text" | "zone" | "player";
type Pt = [number, number];
type Drag =
  | { type: "off"; id: string; moved: boolean }
  | { type: "def"; slot: number; moved: boolean }
  | { type: "text"; id: string; moved: boolean }
  | { type: "wp"; lineId: string; index: number; moved: boolean }
  | { type: "zone-move"; id: string; grab: Pt; moved: boolean }
  | { type: "zone-resize"; id: string; moved: boolean };

const uid = () => Math.random().toString(36).slice(2, 9);

const TOOLS: { id: Tool; icon: typeof MousePointer2; label: string }[] = [
  { id: "select", icon: MousePointer2, label: "Select" },
  { id: "line", icon: Minus, label: "Line" },
  { id: "route", icon: ArrowUpRight, label: "Route" },
  { id: "motion", icon: MoveRight, label: "Motion" },
  { id: "block", icon: RectangleHorizontal, label: "Block" },
  { id: "text", icon: Type, label: "Text" },
  { id: "zone", icon: Circle, label: "Zone" },
  { id: "player", icon: UserPlus, label: "Player" },
];

const STYLES: { id: LineStyle; label: string }[] = [
  { id: "solid", label: "Solid" },
  { id: "dashed", label: "Dashed" },
  { id: "dotted", label: "Dotted" },
];

export default function StudioCanvas({
  call,
  structureId,
  groupSlots,
  players,
  labelFor,
  selection,
  onSelect,
}: {
  call: Call;
  structureId: string;
  groupSlots: Record<number, string[]>;
  players: Player[];
  labelFor: (i: number) => string;
  selection: Selection;
  onSelect: (s: Selection) => void;
}) {
  const updateCall = useStore((s) => s.updateCall);
  const structure = getStructure(structureId);
  const byId = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);
  const texts = call.texts ?? [];

  const fieldRef = useRef<HTMLDivElement>(null);
  const [tool, setTool] = useState<Tool>("select");
  const [color, setColor] = useState(ROUTE_COLORS[0]);
  const [style, setStyle] = useState<LineStyle>("solid");
  const [active, setActive] = useState<{ lineId: string; anchor: string } | null>(null);
  const [hover, setHover] = useState<Pt | null>(null);
  const [zoneStart, setZoneStart] = useState<Pt | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const freehandRef = useRef(false);
  type Snap = Pick<Call, "offLook" | "lines" | "zones" | "defOffsets"> & { texts: NonNullable<Call["texts"]> };
  const undoStack = useRef<Snap[]>([]);
  const redoStack = useRef<Snap[]>([]);

  const snap = (): Snap => ({
    offLook: call.offLook.map((m) => ({ ...m })),
    lines: call.lines.map((l) => ({ ...l, points: l.points.map((p) => [...p] as Pt) })),
    zones: call.zones.map((z) => ({ ...z })),
    defOffsets: { ...call.defOffsets },
    texts: texts.map((t) => ({ ...t })),
  });
  const snapshot = () => {
    undoStack.current.push(snap());
    redoStack.current = [];
    if (undoStack.current.length > 60) undoStack.current.shift();
  };
  const undo = () => {
    const prev = undoStack.current.pop();
    if (prev) {
      redoStack.current.push(snap());
      updateCall(call.id, prev);
    }
    onSelect(null);
  };
  const redo = () => {
    const next = redoStack.current.pop();
    if (next) {
      undoStack.current.push(snap());
      updateCall(call.id, next);
    }
  };

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
  const colorOf = (l: { anchor: string; color?: string }, selected: boolean) =>
    selected ? "#2563eb" : l.color ?? (l.anchor.startsWith("def:") ? "#6b7280" : "#111827");

  // ── live-commit drawing ───────────────────────────────────────────────────
  const activeLine = active ? call.lines.find((l) => l.id === active.lineId) ?? null : null;
  const toolKind = (): LineKind => (tool === "motion" ? "motion" : tool === "block" ? "block" : "route");

  const startLine = (anchor: string) => {
    const pos = anchorPos(anchor);
    if (!pos) return;
    snapshot();
    const id = uid();
    updateCall(call.id, {
      lines: [
        ...call.lines,
        {
          id,
          anchor,
          kind: toolKind(),
          points: [],
          color: anchor.startsWith("def:") && color === ROUTE_COLORS[0] ? "#6b7280" : color,
          style: tool === "motion" ? "dashed" : style,
          showArrow: tool !== "block" && tool !== "line",
        },
      ],
    });
    setActive({ lineId: id, anchor });
  };
  const endLine = () => {
    setActive((a) => {
      if (a) {
        const l = call.lines.find((x) => x.id === a.lineId);
        if (l && l.points.length === 0) {
          updateCall(call.id, { lines: call.lines.filter((x) => x.id !== a.lineId) });
          undoStack.current.pop();
        }
      }
      return null;
    });
    setHover(null);
    freehandRef.current = false;
  };
  const appendPoint = (canvasPt: Pt) => {
    if (!active) return;
    const l = call.lines.find((x) => x.id === active.lineId);
    const a = anchorPos(active.anchor);
    if (!l || !a) return;
    const rel: Pt = [canvasPt[0] - a[0], canvasPt[1] - a[1]];
    const last = l.points[l.points.length - 1];
    if (last && Math.hypot(rel[0] - last[0], rel[1] - last[1]) < 0.9) return;
    updateCall(call.id, {
      lines: call.lines.map((x) => (x.id === l.id ? { ...x, points: [...x.points, rel] } : x)),
    });
  };

  const isDrawTool = tool === "line" || tool === "route" || tool === "motion" || tool === "block";

  // Hudl block shortcut: O selected → double-click defender.
  const blockTo = (slotIndex: number) => {
    if (selection?.kind !== "off") return;
    const from = anchorPos(`off:${selection.id}`);
    const to = defPos(slotIndex);
    if (!from) return;
    const dx = to[0] - from[0];
    const dy = to[1] - from[1];
    const len = Math.hypot(dx, dy) || 1;
    const k = Math.max(0, len - 2.2) / len;
    snapshot();
    updateCall(call.id, {
      lines: [...call.lines, { id: uid(), anchor: `off:${selection.id}`, kind: "block", points: [[dx * k, dy * k]], color: "#111827", style: "solid", showArrow: false }],
    });
  };

  const onFieldPointerDown = (e: React.PointerEvent) => {
    if (tool === "zone" && e.target === e.currentTarget) setZoneStart(toCanvas(e));
    if (active && e.target === e.currentTarget) freehandRef.current = true;
  };
  const onFieldClick = (e: React.MouseEvent) => {
    if (active) {
      appendPoint(toCanvas(e));
      return;
    }
    if (tool === "text" && e.target === e.currentTarget) {
      const [x, y] = toCanvas(e);
      snapshot();
      const id = uid();
      updateCall(call.id, { texts: [...texts, { id, x, y, text: "Note" }] });
      onSelect({ kind: "text", id });
      setTool("select");
      return;
    }
    if (tool === "player" && e.target === e.currentTarget) {
      const [x, y] = toCanvas(e);
      snapshot();
      const id = uid();
      updateCall(call.id, {
        offLook: [...call.offLook, { id, label: "?", x, y: Math.max(LOS_Y + 1.2, y) }],
      });
      onSelect({ kind: "off", id });
      setTool("select");
      return;
    }
    if (tool === "select" && e.target === e.currentTarget) onSelect(null);
  };
  const onFieldPointerMove = (e: React.PointerEvent) => {
    if (active || zoneStart) setHover(toCanvas(e));
    if (active && freehandRef.current) {
      const [x, y] = toCanvas(e);
      const l = call.lines.find((x2) => x2.id === active.lineId);
      const a = anchorPos(active.anchor);
      if (l && a) {
        const rel: Pt = [x - a[0], y - a[1]];
        const last = l.points[l.points.length - 1] ?? [0, 0];
        if (Math.hypot(rel[0] - last[0], rel[1] - last[1]) > 1.6) {
          updateCall(call.id, {
            lines: call.lines.map((x2) => (x2.id === l.id ? { ...x2, points: [...x2.points, rel] } : x2)),
          });
        }
      }
      return;
    }
    const d = dragRef.current;
    if (!d) return;
    d.moved = true;
    const [x, y] = toCanvas(e);
    if (d.type === "off") {
      updateCall(call.id, {
        offLook: call.offLook.map((m) => (m.id === d.id ? { ...m, x, y: Math.min(72, Math.max(LOS_Y + 1.2, y)) } : m)),
      });
    } else if (d.type === "def") {
      const slot = structure.slots[d.slot];
      updateCall(call.id, {
        defOffsets: { ...call.defOffsets, [d.slot]: [x - slot.x, Math.min(LOS_Y - 1.2, y) - defenseCanvasY(slot.y)] },
      });
    } else if (d.type === "text") {
      updateCall(call.id, { texts: texts.map((t) => (t.id === d.id ? { ...t, x, y } : t)) });
    } else if (d.type === "wp") {
      const line = call.lines.find((l) => l.id === d.lineId);
      const a = line && anchorPos(line.anchor);
      if (line && a) {
        updateCall(call.id, {
          lines: call.lines.map((l) =>
            l.id === d.lineId ? { ...l, points: l.points.map((p, i) => (i === d.index ? ([x - a[0], y - a[1]] as Pt) : p)) } : l,
          ),
        });
      }
    } else if (d.type === "zone-move") {
      updateCall(call.id, { zones: call.zones.map((z) => (z.id === d.id ? { ...z, x: x - d.grab[0], y: y - d.grab[1] } : z)) });
    } else if (d.type === "zone-resize") {
      updateCall(call.id, {
        zones: call.zones.map((z) => (z.id === d.id ? { ...z, rx: Math.max(2, Math.abs(x - z.x)), ry: Math.max(2, Math.abs(y - z.y)) } : z)),
      });
    }
  };
  const onFieldPointerUp = (e: React.PointerEvent) => {
    freehandRef.current = false;
    if (zoneStart) {
      const [x, y] = toCanvas(e);
      const rx = Math.abs(x - zoneStart[0]) / 2;
      const ry = Math.abs(y - zoneStart[1]) / 2;
      if (rx > 1.5 && ry > 1.5) {
        const cx = (x + zoneStart[0]) / 2;
        const cy = (y + zoneStart[1]) / 2;
        snapshot();
        const id = uid();
        updateCall(call.id, { zones: [...call.zones, { id, x: cx, y: cy, rx, ry, side: cy < LOS_Y ? "def" : "off" }] });
        onSelect({ kind: "zone", id });
      }
      setZoneStart(null);
      setHover(null);
    }
    const d = dragRef.current;
    if (d && !d.moved) {
      if (d.type === "off") onSelect({ kind: "off", id: d.id });
      else if (d.type === "def") onSelect({ kind: "def", slot: d.slot });
      else if (d.type === "text") onSelect({ kind: "text", id: d.id });
    }
    dragRef.current = null;
  };
  const beginMarkerDrag = (e: React.PointerEvent, kind: "off" | "def" | "text", id: string, slot?: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (isDrawTool && kind !== "text") {
      if (active) endLine();
      startLine(kind === "off" ? `off:${id}` : `def:${slot}`);
      return;
    }
    if (tool !== "select") return;
    snapshot();
    dragRef.current =
      kind === "off" ? { type: "off", id, moved: false } : kind === "def" ? { type: "def", slot: slot!, moved: false } : { type: "text", id, moved: false };
  };

  const deleteSelection = () => {
    if (!selection) return;
    snapshot();
    if (selection.kind === "line") updateCall(call.id, { lines: call.lines.filter((l) => l.id !== selection.id) });
    else if (selection.kind === "zone") updateCall(call.id, { zones: call.zones.filter((z) => z.id !== selection.id) });
    else if (selection.kind === "text") updateCall(call.id, { texts: texts.filter((t) => t.id !== selection.id) });
    else if (selection.kind === "off")
      updateCall(call.id, {
        offLook: call.offLook.filter((m) => m.id !== selection.id),
        lines: call.lines.filter((l) => l.anchor !== `off:${selection.id}`),
      });
    onSelect(null);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName ?? "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      if (e.key === "Escape") {
        endLine();
        setZoneStart(null);
        onSelect(null);
      } else if (e.key === "Enter" && active) endLine();
      else if ((e.key === "Delete" || e.key === "Backspace") && selection && selection.kind !== "def") deleteSelection();
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && e.shiftKey) { e.preventDefault(); redo(); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") { e.preventDefault(); undo(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // field markings
  const preset = FIELD_PRESETS.find((p) => p.id === (call.fieldPreset ?? "midfield")) ?? FIELD_PRESETS[0];
  const yardLines: { y: number; label: string | null; goal: boolean }[] = [];
  for (let k = -14; k <= 14; k++) {
    const dist = preset.losYardline - k * 5;
    const y = LOS_Y - k * 5 * YD;
    if (y < 1 || y > FIELD_H - 1 || dist < 0 || dist > 100) continue;
    const fieldNum = dist > 50 ? 100 - dist : dist;
    yardLines.push({ y, label: dist % 10 === 0 && fieldNum !== 0 ? String(fieldNum) : null, goal: dist === 0 || dist === 100 });
  }

  const selLineId = selection?.kind === "line" ? selection.id : null;
  const selZoneId = selection?.kind === "zone" ? selection.id : null;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      {/* Field */}
      <div
        ref={fieldRef}
        onPointerDown={onFieldPointerDown}
        onPointerMove={onFieldPointerMove}
        onPointerUp={onFieldPointerUp}
        onPointerLeave={() => setHover(null)}
        onClick={onFieldClick}
        onDoubleClick={endLine}
        className={`relative mx-auto aspect-4/3 max-h-full w-full max-w-full overflow-hidden rounded-lg border border-gray-200 bg-[#fbfbfa] shadow-sm touch-none select-none ${
          tool === "select" ? "" : "cursor-crosshair"
        }`}
      >
        <svg viewBox={`0 0 100 ${FIELD_H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
          <defs>
            {[...ROUTE_COLORS, "#6b7280", "#2563eb"].map((c) => (
              <marker key={c} id={`sarr-${c.slice(1)}`} viewBox="0 0 6 6" refX="4.6" refY="3" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                <path d="M0,0 L6,3 L0,6 z" fill={c} />
              </marker>
            ))}
          </defs>

          {yardLines.map((yl) => (
            <g key={yl.y}>
              <line x1="0" x2="100" y1={yl.y} y2={yl.y} stroke={yl.goal ? "#9ca3af" : "#e7e5e4"} strokeWidth={yl.goal ? 0.5 : 0.24} />
              {yl.label && (
                <>
                  <text x="5.5" y={yl.y} fontSize="4.6" fill="#d6d3d1" fontFamily="var(--font-barlow)" fontWeight="700" textAnchor="middle" transform={`rotate(-90 5.5 ${yl.y})`}>{yl.label}</text>
                  <text x="94.5" y={yl.y} fontSize="4.6" fill="#d6d3d1" fontFamily="var(--font-barlow)" fontWeight="700" textAnchor="middle" transform={`rotate(90 94.5 ${yl.y})`}>{yl.label}</text>
                </>
              )}
            </g>
          ))}
          {[40, 60].map((x) =>
            Array.from({ length: Math.floor(FIELD_H / YD) }, (_, i) => i * YD + (LOS_Y % YD)).map((y) => (
              <polygon key={`${x}-${y}`} points={`${x - 0.5},${y + 0.35} ${x + 0.5},${y + 0.35} ${x},${y - 0.45}`} fill="#e7e5e4" />
            )),
          )}
          <line x1="0" x2="100" y1={LOS_Y} y2={LOS_Y} stroke="#2563eb" strokeWidth="0.4" />

          {call.zones.map((z) => (
            <g key={z.id}>
              <ellipse
                cx={z.x} cy={z.y} rx={z.rx} ry={z.ry}
                fill={z.id === selZoneId ? "rgba(37,99,235,0.10)" : z.side === "def" ? "rgba(107,114,128,0.08)" : "rgba(239,68,68,0.07)"}
                stroke={z.id === selZoneId ? "#2563eb" : z.side === "def" ? "#9ca3af" : "#ef4444"}
                strokeWidth="0.3" strokeDasharray="1.4 1"
                style={{ pointerEvents: "all", cursor: tool === "select" ? "move" : undefined }}
                onPointerDown={(e) => {
                  if (tool !== "select") return;
                  e.stopPropagation();
                  const [x, y] = toCanvas(e);
                  snapshot();
                  dragRef.current = { type: "zone-move", id: z.id, grab: [x - z.x, y - z.y], moved: false };
                  onSelect({ kind: "zone", id: z.id });
                }}
              />
              {z.id === selZoneId && (
                <rect
                  x={z.x + z.rx - 1.1} y={z.y + z.ry - 1.1} width="2.2" height="2.2" fill="#fff" stroke="#2563eb" strokeWidth="0.25"
                  style={{ pointerEvents: "all", cursor: "nwse-resize" }}
                  onPointerDown={(e) => { e.stopPropagation(); snapshot(); dragRef.current = { type: "zone-resize", id: z.id, moved: false }; }}
                />
              )}
            </g>
          ))}

          {call.lines.map((l) => {
            const a = anchorPos(l.anchor);
            if (!a) return null;
            const pts: Pt[] = [a, ...l.points.map(([dx, dy]) => [a[0] + dx, a[1] + dy] as Pt)];
            if (pts.length < 2) return null;
            const selected = l.id === selLineId;
            const c = colorOf(l, selected);
            const d = l.smooth ? smoothPath(pts) : pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`).join(" ");
            const showArrow = l.showArrow ?? l.kind !== "block";
            let bar = null;
            if (l.kind === "block") {
              const [ax, ay] = pts[pts.length - 2];
              const [bx, by] = pts[pts.length - 1];
              const len = Math.hypot(bx - ax, by - ay) || 1;
              const nx = -(by - ay) / len;
              const ny = (bx - ax) / len;
              bar = { x1: bx - nx * 1.6, y1: by - ny * 1.6, x2: bx + nx * 1.6, y2: by + ny * 1.6 };
            }
            return (
              <g key={l.id}>
                <path
                  d={d} fill="none" stroke="transparent" strokeWidth="3"
                  style={{ pointerEvents: "stroke", cursor: tool === "select" ? "pointer" : undefined }}
                  onClick={(e) => {
                    if (tool !== "select") return;
                    e.stopPropagation();
                    onSelect(selected ? null : { kind: "line", id: l.id });
                  }}
                />
                <path
                  d={d} fill="none" stroke={c} strokeWidth={selected ? 0.6 : 0.48}
                  strokeLinejoin="round" strokeLinecap="round" strokeDasharray={lineDash(l)}
                  markerEnd={showArrow ? `url(#sarr-${(selected ? "#2563eb" : (l.color ?? (l.anchor.startsWith("def:") ? "#6b7280" : "#111827"))).slice(1)})` : undefined}
                />
                {bar && <line x1={bar.x1} y1={bar.y1} x2={bar.x2} y2={bar.y2} stroke={c} strokeWidth={selected ? 0.6 : 0.48} strokeLinecap="round" />}
                {selected &&
                  pts.slice(1).map(([x, y], i) => (
                    <circle
                      key={i} cx={x} cy={y} r="1.1" fill="#fff" stroke="#2563eb" strokeWidth="0.3"
                      style={{ pointerEvents: "all", cursor: "grab" }}
                      onPointerDown={(e) => { e.stopPropagation(); snapshot(); dragRef.current = { type: "wp", lineId: l.id, index: i, moved: false }; }}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        snapshot();
                        const remaining = l.points.filter((_, j) => j !== i);
                        updateCall(call.id, {
                          lines: remaining.length
                            ? call.lines.map((x2) => (x2.id === l.id ? { ...x2, points: remaining } : x2))
                            : call.lines.filter((x2) => x2.id !== l.id),
                        });
                        if (!remaining.length) onSelect(null);
                      }}
                    />
                  ))}
              </g>
            );
          })}

          {active && activeLine && hover && !freehandRef.current && (() => {
            const a = anchorPos(active.anchor);
            if (!a) return null;
            const last = activeLine.points.length
              ? ([a[0] + activeLine.points[activeLine.points.length - 1][0], a[1] + activeLine.points[activeLine.points.length - 1][1]] as Pt)
              : a;
            return <line x1={last[0]} y1={last[1]} x2={hover[0]} y2={hover[1]} stroke={colorOf(activeLine, false)} strokeOpacity="0.4" strokeWidth="0.4" strokeDasharray="0.9 0.9" />;
          })()}
          {zoneStart && hover && (
            <ellipse
              cx={(zoneStart[0] + hover[0]) / 2} cy={(zoneStart[1] + hover[1]) / 2}
              rx={Math.abs(hover[0] - zoneStart[0]) / 2} ry={Math.abs(hover[1] - zoneStart[1]) / 2}
              fill="rgba(37,99,235,0.06)" stroke="#2563eb" strokeWidth="0.3" strokeDasharray="1.4 1"
            />
          )}
        </svg>

        {/* text notes */}
        {texts.map((t) => (
          <span
            key={t.id}
            onPointerDown={(e) => beginMarkerDrag(e, "text", t.id)}
            className={`absolute -translate-x-1/2 -translate-y-1/2 rounded px-1.5 py-0.5 text-[12px] font-semibold whitespace-pre ${
              selection?.kind === "text" && selection.id === t.id ? "bg-blue-100 text-blue-800 ring-1 ring-blue-500" : "text-gray-700"
            } ${tool === "select" ? "cursor-grab" : ""}`}
            style={{ left: `${t.x}%`, top: `${(t.y / FIELD_H) * 100}%` }}
          >
            {t.text}
          </span>
        ))}

        {/* defense */}
        {structure.slots.map((slot, i) => {
          const [x, y] = defPos(i);
          const sel = selection?.kind === "def" && selection.slot === i;
          const anchored = active?.anchor === `def:${i}`;
          const ids = groupSlots[i] ?? [];
          const pl = ids[0] ? byId.get(ids[0]) : undefined;
          return (
            <button
              key={`d${i}`}
              onPointerDown={(e) => beginMarkerDrag(e, "def", `${i}`, i)}
              onDoubleClick={(e) => { e.stopPropagation(); if (tool === "select") blockTo(i); }}
              title={pl ? `#${pl.jersey} ${pl.name}` : undefined}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${x}%`, top: `${(y / FIELD_H) * 100}%` }}
            >
              <span
                className={`grid size-9 place-items-center rounded-full display text-[13px] font-bold text-white transition ${
                  sel || anchored ? "bg-blue-600 ring-2 ring-blue-300" : "bg-gray-900 hover:ring-2 hover:ring-gray-300"
                }`}
              >
                {labelFor(i)}
              </span>
            </button>
          );
        })}

        {/* offense */}
        {call.offLook.map((o) => {
          const sel = selection?.kind === "off" && selection.id === o.id;
          const anchored = active?.anchor === `off:${o.id}`;
          return (
            <span
              key={o.id}
              onPointerDown={(e) => beginMarkerDrag(e, "off", o.id)}
              className={`absolute -translate-x-1/2 -translate-y-1/2 grid size-9 place-items-center rounded-full display text-[13px] font-bold text-white select-none transition ${
                sel || anchored ? "bg-blue-600 ring-2 ring-blue-300" : "bg-gray-900 hover:ring-2 hover:ring-gray-300"
              } ${tool === "select" ? "cursor-grab" : "cursor-crosshair"}`}
              style={{ left: `${o.x}%`, top: `${(o.y / FIELD_H) * 100}%` }}
            >
              {(o.showLabel ?? true) ? o.label : ""}
            </span>
          );
        })}
      </div>

      {/* Floating toolbar */}
      <div className="mx-auto mt-3 flex flex-wrap items-center gap-1 rounded-xl border border-gray-200 bg-white px-2 py-1.5 shadow-lg">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            onClick={() => { endLine(); setTool(t.id); }}
            title={t.label}
            className={`flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 text-[10px] font-semibold transition ${
              tool === t.id ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200" : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
            }`}
          >
            <t.icon size={17} />
            {t.label}
          </button>
        ))}
        <span className="mx-1 h-8 w-px bg-gray-200" />
        {ROUTE_COLORS.map((c) => (
          <button
            key={c}
            onClick={() => {
              setColor(c);
              if (selLineId) {
                snapshot();
                updateCall(call.id, { lines: call.lines.map((l) => (l.id === selLineId ? { ...l, color: c } : l)) });
              }
            }}
            aria-label={`Color ${c}`}
            className={`grid size-7 place-items-center rounded-full transition ${color === c ? "ring-2 ring-blue-400 ring-offset-1" : ""}`}
          >
            <span className="size-4.5 rounded-full" style={{ backgroundColor: c }} />
          </button>
        ))}
        <span className="mx-1 h-8 w-px bg-gray-200" />
        {STYLES.map((s) => (
          <button
            key={s.id}
            onClick={() => {
              setStyle(s.id);
              if (selLineId) {
                snapshot();
                updateCall(call.id, { lines: call.lines.map((l) => (l.id === selLineId ? { ...l, style: s.id } : l)) });
              }
            }}
            title={s.label}
            className={`rounded-lg px-2.5 py-2 transition ${style === s.id && !selLineId ? "bg-blue-50 ring-1 ring-blue-200" : "hover:bg-gray-50"}`}
          >
            <svg width="26" height="4" viewBox="0 0 26 4">
              <line x1="1" y1="2" x2="25" y2="2" stroke="#374151" strokeWidth={s.id === "solid" ? 2.4 : 2} strokeDasharray={s.id === "dashed" ? "5 3" : s.id === "dotted" ? "1.6 2.6" : undefined} strokeLinecap="round" />
            </svg>
          </button>
        ))}
        <span className="mx-1 h-8 w-px bg-gray-200" />
        <button onClick={undo} title="Undo (Ctrl+Z)" className="rounded-lg p-2 text-gray-500 hover:bg-gray-50 hover:text-gray-800"><Undo2 size={16} /></button>
        <button onClick={redo} title="Redo (Ctrl+Shift+Z)" className="rounded-lg p-2 text-gray-500 hover:bg-gray-50 hover:text-gray-800"><Redo2 size={16} /></button>
        <button
          onClick={deleteSelection}
          disabled={!selection || selection.kind === "def"}
          title="Delete selection"
          className="rounded-lg p-2 text-red-500 hover:bg-red-50 disabled:opacity-30"
        >
          <Trash2 size={16} />
        </button>
      </div>
      {active && (
        <p className="mx-auto mt-1.5 text-xs text-blue-600 font-medium">
          Drawing — click points on the field · click another player to start their line · Esc to stop
        </p>
      )}
    </div>
  );
}
