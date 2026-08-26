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
  Plus,
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
const INK = ROUTE_COLORS[0];
const DEF_INK = "#9aa59b";
// legacy stored colors from the light-theme build
const legacy = (c?: string) => (c === "#111827" ? undefined : c === "#3b82f6" ? "#38bdf8" : c === "#6b7280" ? undefined : c);

// Number keys per the coach's request, plus mnemonic letter aliases
// (the convention in Excalidraw/tldraw: letters primary, digits secondary).
const TOOLS: { id: Tool; icon: typeof MousePointer2; label: string; key: string; alias: string }[] = [
  { id: "select", icon: MousePointer2, label: "Select", key: "1", alias: "v" },
  { id: "line", icon: Minus, label: "Line", key: "2", alias: "l" },
  { id: "route", icon: ArrowUpRight, label: "Route", key: "3", alias: "r" },
  { id: "motion", icon: MoveRight, label: "Motion", key: "4", alias: "m" },
  { id: "block", icon: RectangleHorizontal, label: "Block", key: "5", alias: "b" },
  { id: "text", icon: Type, label: "Text", key: "6", alias: "t" },
  { id: "zone", icon: Circle, label: "Zone", key: "7", alias: "z" },
  { id: "player", icon: UserPlus, label: "Player", key: "8", alias: "p" },
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
  const [color, setColor] = useState(INK);
  const [style, setStyle] = useState<LineStyle>("solid");
  // New drawing model: click a player = arm ("pending"); the next field click
  // draws a COMPLETE line with its arrow and selects it. A small + button at
  // the endpoint arms one extension segment at a time.
  const [pending, setPending] = useState<string | null>(null); // armed anchor
  const [extendId, setExtendId] = useState<string | null>(null); // line armed for one more point
  const [hover, setHover] = useState<Pt | null>(null);
  const [zoneStart, setZoneStart] = useState<Pt | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const pendingFromDownRef = useRef(false); // pointerdown-on-player → drag-release draws
  const extendDragRef = useRef<string | null>(null); // + button pressed; click = arm, drag = live-extend
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
    setPending(null);
    setExtendId(null);
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
  const colorOf = (l: { anchor: string; color?: string }, selected: boolean) => {
    if (selected) return "#f59e0b";
    return legacy(l.color) ?? (l.anchor.startsWith("def:") ? DEF_INK : INK);
  };
  // clicks on empty field land on the SVG layer, not the container
  const isFieldTarget = (e: React.SyntheticEvent) => {
    const t = e.target as Element;
    return t === e.currentTarget || t.tagName?.toLowerCase() === "svg";
  };

  const isDrawTool = tool === "line" || tool === "route" || tool === "motion" || tool === "block";
  const toolKind = (): LineKind => (tool === "motion" ? "motion" : tool === "block" ? "block" : "route");

  // Draw one complete line from the armed player to the clicked point.
  const drawLineTo = (pt: Pt) => {
    if (!pending) return;
    const a = anchorPos(pending);
    if (!a) return;
    snapshot();
    const id = uid();
    updateCall(call.id, {
      lines: [
        ...call.lines,
        {
          id,
          anchor: pending,
          kind: toolKind(),
          points: [[pt[0] - a[0], pt[1] - a[1]]],
          color: color === INK ? undefined : color,
          style: tool === "motion" ? "dashed" : style,
          showArrow: tool !== "block" && tool !== "line",
        },
      ],
    });
    setPending(null);
    setHover(null);
    onSelect({ kind: "line", id });
  };

  // One extension point on an existing line.
  const extendLineTo = (pt: Pt) => {
    const l = call.lines.find((x) => x.id === extendId);
    const a = l && anchorPos(l.anchor);
    if (!l || !a) return;
    snapshot();
    updateCall(call.id, {
      lines: call.lines.map((x) => (x.id === l.id ? { ...x, points: [...x.points, [pt[0] - a[0], pt[1] - a[1]] as Pt] } : x)),
    });
    setExtendId(null);
    setHover(null);
  };

  // Block between two players: the bar stops just IN FRONT of the target,
  // perpendicular to the blocker→target direction.
  const blockBetween = (fromAnchor: string, toAnchor: string) => {
    const from = anchorPos(fromAnchor);
    const to = anchorPos(toAnchor);
    if (!from || !to) return false;
    const dx = to[0] - from[0];
    const dy = to[1] - from[1];
    const len = Math.hypot(dx, dy) || 1;
    const k = Math.max(0.2, (len - 3.4) / len); // marker radius + gap
    snapshot();
    const id = uid();
    updateCall(call.id, {
      lines: [...call.lines, { id, anchor: fromAnchor, kind: "block", points: [[dx * k, dy * k]], style: "solid", showArrow: false }],
    });
    onSelect({ kind: "line", id });
    return true;
  };
  const blockTo = (slotIndex: number) => {
    if (selection?.kind !== "off") return;
    blockBetween(`off:${selection.id}`, `def:${slotIndex}`);
  };

  const onFieldPointerDown = (e: React.PointerEvent) => {
    if (tool === "zone" && isFieldTarget(e)) setZoneStart(toCanvas(e));
  };
  const onFieldClick = (e: React.MouseEvent) => {
    const onField = isFieldTarget(e);
    if (pending && onField) return drawLineTo(toCanvas(e));
    if (extendId && onField) return extendLineTo(toCanvas(e));
    if (tool === "text" && onField) {
      const [x, y] = toCanvas(e);
      snapshot();
      const id = uid();
      updateCall(call.id, { texts: [...texts, { id, x, y, text: "Note" }] });
      onSelect({ kind: "text", id });
      setTool("select");
      return;
    }
    if (tool === "player" && onField) {
      const [x, y] = toCanvas(e);
      snapshot();
      const id = uid();
      updateCall(call.id, { offLook: [...call.offLook, { id, label: "?", x, y: Math.max(LOS_Y + 1.2, y) }] });
      onSelect({ kind: "off", id });
      setTool("select");
      return;
    }
    if (tool === "select" && onField) {
      onSelect(null);
      setExtendId(null);
    }
  };
  const onFieldPointerMove = (e: React.PointerEvent) => {
    if (pending || extendId || zoneStart) setHover(toCanvas(e));
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
    // press-drag-release drawing: released far from the armed player → draw now
    if (pending && pendingFromDownRef.current) {
      pendingFromDownRef.current = false;
      const a = anchorPos(pending);
      const pt = toCanvas(e);
      if (a && Math.hypot(pt[0] - a[0], pt[1] - a[1]) > 3) {
        drawLineTo(pt);
        return;
      }
      // plain click on the player → stays armed for click-to-place
    }
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
      else if (d.type === "wp" && extendDragRef.current === d.lineId) {
        // + tapped without dragging: nothing changed — drop the snapshot, arm extend
        undoStack.current.pop();
        setExtendId(d.lineId);
      }
    }
    extendDragRef.current = null;
    dragRef.current = null;
  };
  const beginMarkerDrag = (e: React.PointerEvent, kind: "off" | "def" | "text", id: string, slot?: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (isDrawTool && kind !== "text") {
      const anchor = kind === "off" ? `off:${id}` : `def:${slot}`;
      // Block tool, second player clicked: draw the block INTO that player —
      // T-bar in front of them, aimed from the blocker's direction.
      if (tool === "block" && pending && pending !== anchor) {
        if (blockBetween(pending, anchor)) {
          setPending(null);
          pendingFromDownRef.current = false;
          setHover(null);
          return;
        }
      }
      // arm this player — a release after dragging draws immediately (press-drag-release),
      // a plain click leaves it armed for the click-to-place model
      (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
      setPending(anchor);
      setExtendId(null);
      pendingFromDownRef.current = true;
      return;
    }
    if (tool !== "select") return;
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
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
    setExtendId(null);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName ?? "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      const toolByKey = TOOLS.find((t) => t.key === e.key || t.alias === e.key.toLowerCase());
      if (toolByKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
        setPending(null);
        setExtendId(null);
        setTool(toolByKey.id);
        return;
      }
      if (e.key === "Escape") {
        setPending(null);
        setExtendId(null);
        setZoneStart(null);
        setHover(null);
        onSelect(null);
      } else if ((e.key === "Delete" || e.key === "Backspace") && selection && selection.kind !== "def") deleteSelection();
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
  const selLineObj = selLineId ? call.lines.find((l) => l.id === selLineId) : null;

  // endpoint of a line in canvas coords (for the + extend button)
  const lineEnd = (l: { anchor: string; points: Pt[] }): Pt | null => {
    const a = anchorPos(l.anchor);
    if (!a || !l.points.length) return null;
    const last = l.points[l.points.length - 1];
    return [a[0] + last[0], a[1] + last[1]];
  };
  const extendBtnFor = selLineObj ?? null;
  const extendBtnPos = extendBtnFor ? lineEnd(extendBtnFor) : null;

  // hover ghost start point
  const ghostFrom: Pt | null = pending
    ? anchorPos(pending)
    : extendId
      ? lineEnd(call.lines.find((l) => l.id === extendId) ?? { anchor: "", points: [] })
      : null;

  const markerBase =
    "grid size-9 place-items-center rounded-full display text-[13px] font-bold text-pitch select-none transition bg-ink";

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div
        ref={fieldRef}
        onPointerDown={onFieldPointerDown}
        onPointerMove={onFieldPointerMove}
        onPointerUp={onFieldPointerUp}
        onPointerLeave={() => setHover(null)}
        onPointerCancel={() => {
          // iOS fires this on system gestures / palm rejection — abort the drag
          // and restore the pre-gesture state so nothing is half-moved.
          if (dragRef.current?.moved) undo();
          dragRef.current = null;
          setZoneStart(null);
        }}
        onClick={onFieldClick}
        className={`relative mx-auto aspect-4/3 max-h-full w-full max-w-full overflow-hidden rounded-xl border border-line bg-[#0d130f] touch-none select-none ${
          tool === "select" && !pending && !extendId ? "" : "cursor-crosshair"
        }`}
      >
        <svg viewBox={`0 0 100 ${FIELD_H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
          <defs>
            {[...ROUTE_COLORS, DEF_INK, "#f59e0b"].map((c) => (
              <marker key={c} id={`sarr-${c.slice(1)}`} viewBox="0 0 6 6" refX="4.6" refY="3" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                <path d="M0,0 L6,3 L0,6 z" fill={c} />
              </marker>
            ))}
          </defs>

          {yardLines.map((yl) => (
            <g key={yl.y}>
              <line x1="0" x2="100" y1={yl.y} y2={yl.y} stroke={yl.goal ? "rgba(233,239,233,0.35)" : "rgba(233,239,233,0.08)"} strokeWidth={yl.goal ? 0.5 : 0.24} />
              {yl.label && (
                <>
                  <text x="5.5" y={yl.y} fontSize="4.6" fill="rgba(233,239,233,0.14)" fontFamily="var(--font-barlow)" fontWeight="700" textAnchor="middle" transform={`rotate(-90 5.5 ${yl.y})`}>{yl.label}</text>
                  <text x="94.5" y={yl.y} fontSize="4.6" fill="rgba(233,239,233,0.14)" fontFamily="var(--font-barlow)" fontWeight="700" textAnchor="middle" transform={`rotate(90 94.5 ${yl.y})`}>{yl.label}</text>
                </>
              )}
            </g>
          ))}
          {[40, 60].map((x) =>
            Array.from({ length: Math.floor(FIELD_H / YD) }, (_, i) => i * YD + (LOS_Y % YD)).map((y) => (
              <polygon key={`${x}-${y}`} points={`${x - 0.5},${y + 0.35} ${x + 0.5},${y + 0.35} ${x},${y - 0.45}`} fill="rgba(233,239,233,0.08)" />
            )),
          )}
          <line x1="0" x2="100" y1={LOS_Y} y2={LOS_Y} stroke="#4ade80" strokeWidth="0.4" strokeOpacity="0.7" />

          {call.zones.map((z) => (
            <g key={z.id}>
              <ellipse
                cx={z.x} cy={z.y} rx={z.rx} ry={z.ry}
                fill={z.id === selZoneId ? "rgba(245,158,11,0.12)" : z.side === "def" ? "rgba(56,189,248,0.08)" : "rgba(248,113,113,0.08)"}
                stroke={z.id === selZoneId ? "#f59e0b" : z.side === "def" ? "rgba(56,189,248,0.55)" : "rgba(248,113,113,0.55)"}
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
                  x={z.x + z.rx - 1.1} y={z.y + z.ry - 1.1} width="2.2" height="2.2" fill="#e9efe9" stroke="#f59e0b" strokeWidth="0.25"
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
            const rawColor = legacy(l.color) ?? (l.anchor.startsWith("def:") ? DEF_INK : INK);
            const d = l.smooth ? smoothPath(pts) : pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`).join(" ");
            const showArrow = l.showArrow ?? l.kind !== "block";
            let bar = null;
            if (l.kind === "block") {
              const [ax, ay] = pts[pts.length - 2];
              const [bx, by] = pts[pts.length - 1];
              const len = Math.hypot(bx - ax, by - ay) || 1;
              const nx = -(by - ay) / len;
              const ny = (bx - ax) / len;
              bar = { x1: bx - nx * 1.9, y1: by - ny * 1.9, x2: bx + nx * 1.9, y2: by + ny * 1.9 };
            }
            // Excalidraw-style midpoint handles for bending
            // suppress midpoint handles on short segments (Excalidraw: 4× handle size)
            const midpoints: { x: number; y: number; insertAt: number }[] = selected
              ? pts
                  .slice(0, -1)
                  .map(([x1, y1], i) => ({
                    x: (x1 + pts[i + 1][0]) / 2,
                    y: (y1 + pts[i + 1][1]) / 2,
                    insertAt: i,
                    len: Math.hypot(pts[i + 1][0] - x1, pts[i + 1][1] - y1),
                  }))
                  .filter((m) => m.len > 4.5)
              : [];
            return (
              <g key={l.id}>
                <path
                  d={d} fill="none" stroke="transparent" strokeWidth="3"
                  style={{ pointerEvents: "stroke", cursor: tool === "select" ? "pointer" : undefined }}
                  onClick={(e) => {
                    if (tool !== "select") return;
                    e.stopPropagation();
                    onSelect(selected ? null : { kind: "line", id: l.id });
                    setExtendId(null);
                  }}
                />
                <path
                  d={d} fill="none" stroke={c} strokeWidth={selected ? 0.6 : 0.48}
                  strokeLinejoin="round" strokeLinecap="round" strokeDasharray={lineDash(l)}
                  markerEnd={showArrow ? `url(#sarr-${(selected ? "#f59e0b" : rawColor).slice(1)})` : undefined}
                />
                {bar && <line x1={bar.x1} y1={bar.y1} x2={bar.x2} y2={bar.y2} stroke={c} strokeWidth={selected ? 0.7 : 0.55} strokeLinecap="round" />}
                {selected && (
                  <>
                    {/* waypoint handles (filled) */}
                    {pts.slice(1).map(([x, y], i) =>
                      i === l.points.length - 1 && !extendId ? null : ( // tip is the + button
                      <circle
                        key={`wp${i}`} cx={x} cy={y} r="1.1" fill="#0d130f" stroke="#f59e0b" strokeWidth="0.3"
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
                    {/* midpoint bend handles (hollow) — drag to bend like Excalidraw */}
                    {midpoints.map((m, i) => (
                      <circle
                        key={`mid${i}`} cx={m.x} cy={m.y} r="0.95" fill="rgba(13,19,15,0.6)" stroke="#f59e0b" strokeWidth="0.22" strokeDasharray="0.5 0.4"
                        style={{ pointerEvents: "all", cursor: "grab" }}
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          snapshot();
                          const newPts = [...l.points];
                          newPts.splice(m.insertAt, 0, [m.x - a[0], m.y - a[1]]);
                          updateCall(call.id, {
                            lines: call.lines.map((x2) => (x2.id === l.id ? { ...x2, points: newPts, smooth: true } : x2)),
                          });
                          dragRef.current = { type: "wp", lineId: l.id, index: m.insertAt, moved: false };
                        }}
                      />
                    ))}
                  </>
                )}
              </g>
            );
          })}

          {/* aim ghost: armed player/extension → cursor */}
          {ghostFrom && hover && (
            <line x1={ghostFrom[0]} y1={ghostFrom[1]} x2={hover[0]} y2={hover[1]} stroke={INK} strokeOpacity="0.35" strokeWidth="0.35" strokeDasharray="0.9 0.9" />
          )}
          {zoneStart && hover && (
            <ellipse
              cx={(zoneStart[0] + hover[0]) / 2} cy={(zoneStart[1] + hover[1]) / 2}
              rx={Math.abs(hover[0] - zoneStart[0]) / 2} ry={Math.abs(hover[1] - zoneStart[1]) / 2}
              fill="rgba(74,222,128,0.06)" stroke="rgba(74,222,128,0.5)" strokeWidth="0.3" strokeDasharray="1.4 1"
            />
          )}
        </svg>

        {/* text notes */}
        {texts.map((t) => (
          <span
            key={t.id}
            onPointerDown={(e) => beginMarkerDrag(e, "text", t.id)}
            className={`absolute -translate-x-1/2 -translate-y-1/2 rounded px-1.5 py-0.5 text-[12px] font-semibold whitespace-pre ${
              selection?.kind === "text" && selection.id === t.id ? "bg-ember/20 text-ember ring-1 ring-ember" : "text-ink/80"
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
          const armed = pending === `def:${i}`;
          const ids = groupSlots[i] ?? [];
          const pl = ids[0] ? byId.get(ids[0]) : undefined;
          return (
            <button
              key={`d${i}`}
              onPointerDown={(e) => beginMarkerDrag(e, "def", `${i}`, i)}
              onDoubleClick={(e) => { e.stopPropagation(); if (tool === "select") blockTo(i); }}
              title={pl ? `#${pl.jersey} ${pl.name}` : undefined}
              className="group absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${x}%`, top: `${(y / FIELD_H) * 100}%` }}
            >
              <span className="pointer-events-none absolute -inset-1 rounded-lg border-2 border-grass opacity-0 transition group-hover:opacity-100" />
              <span className={`${markerBase} ${sel || armed ? "ring-2 ring-ember bg-ember text-pitch" : ""}`}>
                {labelFor(i)}
              </span>
            </button>
          );
        })}

        {/* offense */}
        {call.offLook.map((o) => {
          const sel = selection?.kind === "off" && selection.id === o.id;
          const armed = pending === `off:${o.id}`;
          return (
            <span
              key={o.id}
              onPointerDown={(e) => beginMarkerDrag(e, "off", o.id)}
              className={`group absolute -translate-x-1/2 -translate-y-1/2 ${tool === "select" ? "cursor-grab" : "cursor-crosshair"}`}
              style={{ left: `${o.x}%`, top: `${(o.y / FIELD_H) * 100}%` }}
            >
              <span className="pointer-events-none absolute -inset-1 rounded-lg border-2 border-grass opacity-0 transition group-hover:opacity-100" />
              <span className={`${markerBase} ${sel || armed ? "ring-2 ring-ember bg-ember text-pitch" : ""}`}>
                {(o.showLabel ?? true) ? o.label : ""}
              </span>
            </span>
          );
        })}

        {/* + extend button at the end of the selected line */}
        {extendBtnPos && !extendId && (
          <button
            onPointerDown={(e) => {
              // sits ON the arrow tip: drag moves the endpoint, click arms extend
              e.preventDefault();
              e.stopPropagation();
              const l = extendBtnFor!;
              (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
              snapshot();
              extendDragRef.current = l.id;
              dragRef.current = { type: "wp", lineId: l.id, index: l.points.length - 1, moved: false };
            }}
            onClick={(e) => e.stopPropagation()}
            title="Drag to move the endpoint · click + to extend the line"
            className="absolute z-10 grid size-6 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-ember bg-pitch text-ember shadow-lg transition hover:bg-ember hover:text-pitch"
            style={{ left: `${extendBtnPos[0]}%`, top: `${(extendBtnPos[1] / FIELD_H) * 100}%` }}
          >
            <Plus size={13} />
          </button>
        )}
      </div>

      {/* Floating toolbar */}
      <div className="mx-auto mt-3 flex flex-wrap items-center gap-1 rounded-xl border border-line bg-card px-2 py-1.5 shadow-lg">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            onClick={() => { setPending(null); setExtendId(null); setTool(t.id); }}
            title={`${t.label} (${t.key})`}
            className={`flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 text-[10px] font-semibold transition ${
              tool === t.id ? "bg-grass/15 text-grass ring-1 ring-grass/40" : "text-dim hover:bg-white/5 hover:text-ink"
            }`}
          >
            <t.icon size={17} />
            {t.label}
          </button>
        ))}
        <span className="mx-1 h-8 w-px bg-line" />
        {ROUTE_COLORS.map((c) => (
          <button
            key={c}
            onClick={() => {
              setColor(c);
              if (selLineId) {
                snapshot();
                updateCall(call.id, { lines: call.lines.map((l) => (l.id === selLineId ? { ...l, color: c === INK ? undefined : c } : l)) });
              }
            }}
            aria-label={`Color ${c}`}
            className={`grid size-7 place-items-center rounded-full transition ${color === c ? "ring-2 ring-grass ring-offset-1 ring-offset-card" : ""}`}
          >
            <span className="size-4.5 rounded-full border border-line" style={{ backgroundColor: c }} />
          </button>
        ))}
        <span className="mx-1 h-8 w-px bg-line" />
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
            className={`rounded-lg px-2.5 py-2 transition ${style === s.id && !selLineId ? "bg-grass/15 ring-1 ring-grass/40" : "hover:bg-white/5"}`}
          >
            <svg width="26" height="4" viewBox="0 0 26 4">
              <line x1="1" y1="2" x2="25" y2="2" stroke="#9aa59b" strokeWidth={s.id === "solid" ? 2.4 : 2} strokeDasharray={s.id === "dashed" ? "5 3" : s.id === "dotted" ? "1.6 2.6" : undefined} strokeLinecap="round" />
            </svg>
          </button>
        ))}
        <span className="mx-1 h-8 w-px bg-line" />
        <button onClick={undo} title="Undo (Ctrl+Z)" className="rounded-lg p-2 text-dim hover:bg-white/5 hover:text-ink"><Undo2 size={16} /></button>
        <button onClick={redo} title="Redo (Ctrl+Shift+Z)" className="rounded-lg p-2 text-dim hover:bg-white/5 hover:text-ink"><Redo2 size={16} /></button>
        <button
          onClick={deleteSelection}
          disabled={!selection || selection.kind === "def"}
          title="Delete selection"
          className="rounded-lg p-2 text-red-400 hover:bg-red-500/10 disabled:opacity-30"
        >
          <Trash2 size={16} />
        </button>
      </div>
      {(pending || extendId) && (
        <p className="mx-auto mt-1.5 text-xs font-medium text-grass">
          {pending && tool === "block"
            ? "Now click the player to block — the wall lands in front of them. (Or click the field to place it manually.)"
            : pending
              ? "Click the field to draw the line — it finishes where you click. Esc cancels."
              : "Click the field to add one segment. Esc cancels."}
        </p>
      )}
    </div>
  );
}
