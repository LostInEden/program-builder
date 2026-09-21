"use client";

import { useEffect, useId, useRef, useState } from "react";
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
  FIELD_H as BASE_FIELD_H,
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
type DraftPath = { anchor: string; points: Pt[] };
type Drag =
  | { type: "off"; id: string; moved: boolean }
  | { type: "def"; slot: number; moved: boolean }
  | { type: "text"; id: string; moved: boolean }
  | { type: "start"; lineId: string; moved: boolean }
  | { type: "wp"; lineId: string; index: number; moved: boolean }
  | { type: "zone-move"; id: string; grab: Pt; moved: boolean }
  | { type: "zone-resize"; id: string; moved: boolean };

// Show extra downfield space without rewriting saved player or path coordinates.
const FIELD_H = BASE_FIELD_H + 12;

const uid = () => Math.random().toString(36).slice(2, 9);
const INK = ROUTE_COLORS[0];
const DEF_INK = "#5b6b7c";
// legacy stored colors from the light-theme build
const legacy = (c?: string) =>
  c === "#111827" || c === "#6b7280" || c === "#e9efe9" || c === "#9aa59b"
    ? undefined
    : c === "#3b82f6" || c === "#38bdf8"
      ? "#0284c7"
      : c === "#eab308"
        ? "#ca8a04"
        : c === "#22c55e"
          ? "#16a34a"
          : c;

// Number keys per the coach's request, plus mnemonic letter aliases
// (the convention in Excalidraw/tldraw: letters primary, digits secondary).
const TOOLS: { id: Tool; icon: typeof MousePointer2; label: string; key: string; alias: string }[] = [
  { id: "select", icon: MousePointer2, label: "Select", key: "1", alias: "v" },
  { id: "line", icon: Minus, label: "Line", key: "2", alias: "l" },
  { id: "route", icon: ArrowUpRight, label: "Arrow", key: "3", alias: "r" },
  { id: "motion", icon: MoveRight, label: "Motion", key: "4", alias: "m" },
  { id: "block", icon: RectangleHorizontal, label: "Block", key: "5", alias: "b" },
  { id: "text", icon: Type, label: "Text", key: "6", alias: "t" },
  { id: "zone", icon: Circle, label: "Zone", key: "7", alias: "z" },
  { id: "player", icon: UserPlus, label: "Add Offense", key: "8", alias: "p" },
];

const STYLES: { id: LineStyle; label: string }[] = [
  { id: "solid", label: "Solid" },
  { id: "dashed", label: "Dashed" },
  { id: "dotted", label: "Dotted" },
];

export default function StudioCanvas({
  call,
  structureId,
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
  const texts = call.texts ?? [];

  const fieldRef = useRef<HTMLDivElement>(null);
  const pathMaskId = useId();
  const [fieldWidth, setFieldWidth] = useState(1000);
  useEffect(() => {
    const field = fieldRef.current;
    if (!field) return;
    const observer = new ResizeObserver(() => setFieldWidth(field.getBoundingClientRect().width));
    observer.observe(field);
    return () => observer.disconnect();
  }, []);
  const [tool, setTool] = useState<Tool>("select");
  const [color, setColor] = useState(INK);
  const [style, setStyle] = useState<LineStyle>("solid");
  // Draft points stay local until the entire assignment is finished.
  const [draft, setDraft] = useState<DraftPath | null>(null);
  const pending = draft?.anchor ?? null;
  const cancelDraft = () => { setDraft(null); setHover(null); };
  const [extendId, setExtendId] = useState<string | null>(null); // line armed for one more point
  const [hover, setHover] = useState<Pt | null>(null);
  const [zoneStart, setZoneStart] = useState<Pt | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const clickConsumedRef = useRef(false); // pointerup did work — swallow the synthetic click that follows
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
    if (draft) {
      const minimum = draft.anchor === "free" ? 1 : 0;
      if (draft.points.length > minimum) setDraft({ ...draft, points: draft.points.slice(0, -1) });
      else cancelDraft();
      return;
    }
    const prev = undoStack.current.pop();
    if (prev) {
      redoStack.current.push(snap());
      updateCall(call.id, prev);
    }
    onSelect(null);
    cancelDraft();
    setExtendId(null);
  };
  const redo = () => {
    if (draft) return;
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

  const startPath = (pt: Pt, anchor?: string) => {
    if (!anchor) {
      const r = fieldRef.current!.getBoundingClientRect();
      const candidates = [
        ...call.offLook.map((m) => ({ anchor: `off:${m.id}`, pos: [m.x, m.y] as Pt })),
        ...structure.slots.map((_, i) => ({ anchor: `def:${i}`, pos: defPos(i) })),
      ];
      const nearest = candidates.map((c) => ({ ...c, distance: Math.hypot((c.pos[0] - pt[0]) * r.width / 100, (c.pos[1] - pt[1]) * r.height / FIELD_H) }))
        .sort((a, b) => a.distance - b.distance)[0];
      if (nearest?.distance <= 26) anchor = nearest.anchor;
    }
    setDraft({ anchor: anchor ?? "free", points: anchor ? [] : [pt] });
    setHover(pt);
    setExtendId(null);
    onSelect(null);
  };
  const appendPoint = (pt: Pt) => {
    if (!draft) return;
    const last = draft.points.at(-1) ?? anchorPos(draft.anchor);
    if (last && Math.hypot(pt[0] - last[0], pt[1] - last[1]) < 0.25) return;
    setDraft({ ...draft, points: [...draft.points, pt] });
    setHover(pt);
  };
  const finishPath = (includeCursor = false) => {
    if (!draft) return;
    const a = anchorPos(draft.anchor);
    const points = [...draft.points];
    const last = points.at(-1) ?? a;
    if (includeCursor && hover && last && Math.hypot(hover[0] - last[0], hover[1] - last[1]) >= 0.25) points.push(hover);
    if (!a || points.length < (draft.anchor === "free" ? 2 : 1)) return;
    snapshot();
    const id = uid();
    updateCall(call.id, {
      lines: [...call.lines, {
        id, anchor: draft.anchor, kind: toolKind(),
        points: points.map(([x, y]) => [x - a[0], y - a[1]] as Pt),
        color: color === INK ? undefined : color,
        style: tool === "motion" ? "dashed" : style,
        showArrow: tool !== "block" && tool !== "line",
      }],
    });
    cancelDraft();
    setTool("select");
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
    clickConsumedRef.current = false;
    if (tool === "zone" && isFieldTarget(e)) setZoneStart(toCanvas(e));
  };
  const onFieldClick = (e: React.MouseEvent) => {
    if (clickConsumedRef.current) {
      clickConsumedRef.current = false;
      return;
    }
    const onField = isFieldTarget(e);
    if (isDrawTool && onField) {
      if (e.detail > 1) return; // the first click already placed the double-click endpoint
      if (draft) appendPoint(toCanvas(e));
      else startPath(toCanvas(e));
      return;
    }
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
      updateCall(call.id, { offLook: [...call.offLook, { id, label: "?", x, y: Math.min(LOS_Y - 1.2, y) }] });
      onSelect({ kind: "off", id });
      setTool("select");
      return;
    }
    if (onField) {
      // empty-field click = done: back to Select, everything deselected/placed
      setTool("select");
      onSelect(null);
      setExtendId(null);
      cancelDraft();
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
        offLook: call.offLook.map((m) => (m.id === d.id ? { ...m, x, y: Math.max(4, Math.min(LOS_Y - 1.2, y)) } : m)),
      });
    } else if (d.type === "def") {
      const slot = structure.slots[d.slot];
      updateCall(call.id, {
        defOffsets: { ...call.defOffsets, [d.slot]: [x - slot.x, Math.max(LOS_Y + 1.2, Math.min(72, y)) - defenseCanvasY(slot.y)] },
      });
    } else if (d.type === "text") {
      updateCall(call.id, { texts: texts.map((t) => (t.id === d.id ? { ...t, x, y } : t)) });
    } else if (d.type === "start") {
      updateCall(call.id, { lines: call.lines.map((l) => {
        if (l.id !== d.lineId) return l;
        const a = anchorPos(l.anchor);
        if (!a) return l;
        const rest = l.anchor === "free" ? l.points.slice(1) : l.points.map(([dx, dy]) => [a[0] + dx, a[1] + dy] as Pt);
        return { ...l, anchor: "free", points: [[x, y] as Pt, ...rest] };
      }) });
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
    if (zoneStart) {
      const [x, y] = toCanvas(e);
      const rx = Math.abs(x - zoneStart[0]) / 2;
      const ry = Math.abs(y - zoneStart[1]) / 2;
      if (rx > 1.5 && ry > 1.5) {
        const cx = (x + zoneStart[0]) / 2;
        const cy = (y + zoneStart[1]) / 2;
        snapshot();
        const id = uid();
        updateCall(call.id, { zones: [...call.zones, { id, x: cx, y: cy, rx, ry, side: cy < LOS_Y ? "off" : "def" }] });
        onSelect({ kind: "zone", id });
        setTool("select");
        clickConsumedRef.current = true;
      }
      setZoneStart(null);
      setHover(null);
    }
    const d = dragRef.current;
    if (d && !d.moved) {
      undoStack.current.pop(); // selection alone is not an edit
      if (d.type === "off") onSelect({ kind: "off", id: d.id });
      else if (d.type === "def") onSelect({ kind: "def", slot: d.slot });
      else if (d.type === "text") onSelect({ kind: "text", id: d.id });
      else if (d.type === "wp" && extendDragRef.current === d.lineId) {
        // + tapped without dragging: nothing changed — drop the snapshot, arm extend
        setExtendId(d.lineId);
      }
    }
    if (d) clickConsumedRef.current = true;
    extendDragRef.current = null;
    dragRef.current = null;
  };
  const beginMarkerDrag = (e: React.PointerEvent, kind: "off" | "def" | "text", id: string, slot?: number) => {
    e.preventDefault();
    e.stopPropagation();
    clickConsumedRef.current = false;
    if (isDrawTool && kind !== "text") {
      const anchor = kind === "off" ? `off:${id}` : `def:${slot}`;
      if (draft) appendPoint(toCanvas(e));
      else startPath(toCanvas(e), anchor);
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
        cancelDraft();
        setExtendId(null);
        setTool(toolByKey.id);
        return;
      }
      if (e.key === "Enter" && draft) {
        e.preventDefault();
        finishPath(true);
      } else if (e.key === "Escape") {
        cancelDraft();
        setExtendId(null);
        setZoneStart(null);
        setHover(null);
        onSelect(null);
      } else if ((e.key === "Delete" || e.key === "Backspace") && !draft && selection && selection.kind !== "def") { e.preventDefault(); deleteSelection(); }
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
    const y = LOS_Y + k * 5 * YD;
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
    "grid min-w-9 h-9 px-1 place-items-center rounded-full border-2 border-[#17212B] text-[13px] font-bold text-[#17212B] select-none bg-[#FFFFFF]";

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <p className="mb-2 text-xs text-dim">Click a player or field to start · Click bends · Double-click the endpoint or press Enter to finish · Esc cancels</p>
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
        onDoubleClick={(e) => { if (draft) { e.preventDefault(); finishPath(); } }}
        className={`relative mx-auto aspect-4/3 max-h-full w-full max-w-full overflow-hidden rounded-xl border border-line bg-[#f8fafd] touch-none select-none ${
          tool === "select" && !pending && !extendId ? "" : "cursor-crosshair"
        }`}
      >
        <svg viewBox={`0 0 100 ${FIELD_H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full" style={{ pointerEvents: "none" }}>
          <defs>
            <mask id={pathMaskId} maskUnits="userSpaceOnUse" x="0" y="0" width="100" height={FIELD_H}>
              <rect width="100" height={FIELD_H} fill="white" />
              {structure.slots.map((_, i) => {
                const [x, y] = defPos(i);
                const halfWidth = (labelFor(i).length * 6 + 3) * 100 / fieldWidth;
                const halfHeight = 11 * 100 / fieldWidth;
                return <rect key={`def-${i}`} x={x - halfWidth} y={y - halfHeight} width={halfWidth * 2} height={halfHeight * 2} fill="black" />;
              })}
              {call.offLook.map((m) => <circle key={m.id} cx={m.x} cy={m.y} r={21 * 100 / fieldWidth} fill="black" />)}
            </mask>
            {[...ROUTE_COLORS, DEF_INK, "#f59e0b"].map((c) => (
              <marker key={c} id={`sarr-${c.slice(1)}`} viewBox="0 0 6 6" refX="4.6" refY="3" markerWidth="3.5" markerHeight="3.5" orient="auto-start-reverse">
                <path d="M0,0 L6,3 L0,6 z" fill={c} />
              </marker>
            ))}
          </defs>

          {yardLines.map((yl) => (
            <g key={yl.y}>
              <line x1="0" x2="100" y1={yl.y} y2={yl.y} stroke={yl.goal ? "rgba(15,28,46,0.4)" : "rgba(15,28,46,0.08)"} strokeWidth={yl.goal ? 0.5 : 0.24} />
              {yl.label && (
                <>
                  <text x="5.5" y={yl.y} fontSize="4.6" fill="rgba(15,28,46,0.12)" fontFamily="var(--font-inter)" fontWeight="700" textAnchor="middle" transform={`rotate(-90 5.5 ${yl.y})`}>{yl.label}</text>
                  <text x="94.5" y={yl.y} fontSize="4.6" fill="rgba(15,28,46,0.12)" fontFamily="var(--font-inter)" fontWeight="700" textAnchor="middle" transform={`rotate(90 94.5 ${yl.y})`}>{yl.label}</text>
                </>
              )}
            </g>
          ))}
          {/* Coach-preferred wider hash spacing with horizontal ticks only. */}
          {[25, 75].map((x) =>
            Array.from({ length: Math.floor(FIELD_H / YD) }, (_, i) => i * YD + (LOS_Y % YD)).map((y) => (
              <line key={`${x}-${y}`} x1={x - 0.625} x2={x + 0.625} y1={y} y2={y} stroke="rgba(15,28,46,0.32)" strokeWidth="0.22" />
            )),
          )}
          {/* The board ends at each sideline; no out-of-bounds strip. */}
          {[0, 100].map((x) => <line key={`sideline-${x}`} x1={x} x2={x} y1="0" y2={FIELD_H} stroke="rgba(15,28,46,0.32)" strokeWidth="0.8" />)}
          <line x1="0" x2="100" y1={LOS_Y} y2={LOS_Y} stroke="#505860" strokeWidth="0.4" strokeOpacity="0.8" />

          {call.zones.map((z) => (
            <g key={z.id}>
              <ellipse
                cx={z.x} cy={z.y} rx={z.rx} ry={z.ry}
                fill={z.id === selZoneId ? "rgba(245,158,11,0.12)" : z.side === "def" ? "rgba(56,189,248,0.08)" : "rgba(248,113,113,0.08)"}
                stroke={z.id === selZoneId ? "#f59e0b" : z.side === "def" ? "rgba(56,189,248,0.55)" : "rgba(248,113,113,0.55)"}
                strokeWidth="0.3" strokeDasharray="1.4 1"
                style={{ pointerEvents: tool === "select" ? "all" : "none", cursor: "move" }}
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
                  x={z.x + z.rx - 1.1} y={z.y + z.ry - 1.1} width="2.2" height="2.2" fill="#ffffff" stroke="#d97706" strokeWidth="0.25"
                  style={{ pointerEvents: "all", cursor: "nwse-resize" }}
                  onPointerDown={(e) => { e.stopPropagation(); snapshot(); dragRef.current = { type: "zone-resize", id: z.id, moved: false }; }}
                />
              )}
            </g>
          ))}

          {call.lines.map((l) => {
            const a = anchorPos(l.anchor);
            if (!a) return null;
            const pts: Pt[] = l.anchor === "free" ? l.points : [a, ...l.points.map(([dx, dy]) => [a[0] + dx, a[1] + dy] as Pt)];
            if (pts.length < 2) return null;
            const selected = l.id === selLineId;
            // Keep the attached start handle just outside the player so it is reachable.
            const dx = pts[1][0] - pts[0][0], dy = pts[1][1] - pts[0][1];
            const defIndex = l.anchor.startsWith("def:") ? Number(l.anchor.slice(4)) : null;
            const halfWidth = (defIndex !== null ? Math.max(22, labelFor(defIndex).length * 6 + 5) : 22) * 100 / fieldWidth;
            const halfHeight = 22 * 100 / fieldWidth;
            const edge = Math.min(halfWidth / (Math.abs(dx) || 0.0001), halfHeight / (Math.abs(dy) || 0.0001));
            const startHandle: Pt = l.anchor === "free" ? pts[0] : [pts[0][0] + dx * (edge + 1.4 / (Math.hypot(dx, dy) || 1)), pts[0][1] + dy * (edge + 1.4 / (Math.hypot(dx, dy) || 1))];
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
                    insertAt: l.anchor === "free" ? i + 1 : i,
                    len: Math.hypot(pts[i + 1][0] - x1, pts[i + 1][1] - y1),
                  }))
                  .filter((m) => m.len > 4.5)
              : [];
            return (
              <g key={l.id}>
                <path
                  d={d} fill="none" stroke="transparent" strokeWidth={l.kind === "block" ? 4.5 : 3}
                  style={{ pointerEvents: tool === "select" ? "stroke" : "none", cursor: "pointer" }}
                  onClick={(e) => {
                    if (tool !== "select") return;
                    e.stopPropagation();
                    onSelect(selected ? null : { kind: "line", id: l.id });
                    setExtendId(null);
                  }}
                />
                {/* fat hit target over the endpoint / block bar — short lines are hard to hit */}
                <circle
                  cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r={l.kind === "block" ? 3 : 2.2}
                  fill="transparent"
                  style={{ pointerEvents: tool === "select" ? "all" : "none", cursor: "pointer" }}
                  onClick={(e) => {
                    if (tool !== "select") return;
                    e.stopPropagation();
                    onSelect(selected ? null : { kind: "line", id: l.id });
                    setExtendId(null);
                  }}
                />
                <path
                  mask={`url(#${pathMaskId})`} d={d} fill="none" stroke={c} strokeWidth={selected ? 0.32 : 0.25}
                  strokeLinejoin="round" strokeLinecap="round" strokeDasharray={lineDash(l)}
                  markerEnd={showArrow ? `url(#sarr-${(selected ? "#f59e0b" : rawColor).slice(1)})` : undefined}
                  style={{ pointerEvents: "none" }}
                />
                {bar && <line mask={`url(#${pathMaskId})`} x1={bar.x1} y1={bar.y1} x2={bar.x2} y2={bar.y2} stroke={c} strokeWidth={selected ? 0.35 : 0.28} strokeLinecap="round" style={{ pointerEvents: "none" }} />}
                {selected && tool === "select" && (
                  <>
                    <circle cx={startHandle[0]} cy={startHandle[1]} r="1.1" fill="#ffffff" stroke="#d97706" strokeWidth="0.3"
                      style={{ pointerEvents: "all", cursor: "grab" }}
                      onPointerDown={(e) => { e.stopPropagation(); e.currentTarget.setPointerCapture(e.pointerId); snapshot(); dragRef.current = { type: "start", lineId: l.id, moved: false }; }}>
                      <title>Drag start (detaches from player)</title>
                    </circle>
                    {/* waypoint handles (filled), stored indices differ for free paths */}
                    {pts.slice(1).map(([x, y], vertexIndex) => {
                      const i = l.anchor === "free" ? vertexIndex + 1 : vertexIndex;
                      return vertexIndex === pts.length - 2 && !extendId ? null : ( // tip is the + button
                      <circle
                        key={`wp${i}`} cx={x} cy={y} r="1.1" fill="#ffffff" stroke="#d97706" strokeWidth="0.3"
                        style={{ pointerEvents: "all", cursor: "grab" }}
                        onPointerDown={(e) => { e.stopPropagation(); e.currentTarget.setPointerCapture(e.pointerId); snapshot(); dragRef.current = { type: "wp", lineId: l.id, index: i, moved: false }; }}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          snapshot();
                          const remaining = l.points.filter((_, j) => j !== i);
                          updateCall(call.id, {
                            lines: remaining.length >= (l.anchor === "free" ? 2 : 1)
                              ? call.lines.map((x2) => (x2.id === l.id ? { ...x2, points: remaining } : x2))
                              : call.lines.filter((x2) => x2.id !== l.id),
                          });
                          if (remaining.length < (l.anchor === "free" ? 2 : 1)) onSelect(null);
                        }}
                      />
                    ); })}
                    {/* midpoint bend handles (hollow) — drag to bend like Excalidraw */}
                    {midpoints.map((m, i) => (
                      <circle
                        key={`mid${i}`} cx={m.x} cy={m.y} r="0.95" fill="rgba(255,255,255,0.85)" stroke="#f59e0b" strokeWidth="0.22" strokeDasharray="0.5 0.4"
                        style={{ pointerEvents: "all", cursor: "grab" }}
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          e.currentTarget.setPointerCapture(e.pointerId);
                          snapshot();
                          const newPts = [...l.points];
                          newPts.splice(m.insertAt, 0, [m.x - a[0], m.y - a[1]]);
                          updateCall(call.id, {
                            lines: call.lines.map((x2) => (x2.id === l.id ? { ...x2, points: newPts } : x2)),
                          });
                          dragRef.current = { type: "wp", lineId: l.id, index: m.insertAt, moved: true };
                        }}
                      />
                    ))}
                  </>
                )}
              </g>
            );
          })}

          {/* The unfinished assignment is one continuous preview, never a saved partial line. */}
          {draft && (() => {
            const a = anchorPos(draft.anchor);
            if (!a) return null;
            const pts = [...(draft.anchor === "free" ? [] : [a]), ...draft.points, ...(hover ? [hover] : [])];
            if (pts.length < 2) return null;
            const c = color === INK && draft.anchor.startsWith("def:") ? DEF_INK : color;
            const end = pts.at(-1)!;
            const prev = pts.at(-2)!;
            const len = Math.hypot(end[0] - prev[0], end[1] - prev[1]) || 1;
            const nx = -(end[1] - prev[1]) / len, ny = (end[0] - prev[0]) / len;
            return <g mask={`url(#${pathMaskId})`} style={{ pointerEvents: "none" }}>
              <path d={pts.map(([x, y], i) => `${i ? "L" : "M"}${x},${y}`).join(" ")} fill="none" stroke={c} strokeWidth="0.25" strokeLinejoin="round" strokeLinecap="round"
                strokeDasharray={lineDash({ kind: toolKind(), style: tool === "motion" ? "dashed" : style })}
                markerEnd={tool !== "block" && tool !== "line" ? `url(#sarr-${c.slice(1)})` : undefined} />
              {tool === "block" && <line x1={end[0] - nx * 1.9} y1={end[1] - ny * 1.9} x2={end[0] + nx * 1.9} y2={end[1] + ny * 1.9} stroke={c} strokeWidth="0.28" />}
              {draft.points.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="0.5" fill={c} />)}
            </g>;
          })()}
          {extendId && ghostFrom && hover && (
            <line x1={ghostFrom[0]} y1={ghostFrom[1]} x2={hover[0]} y2={hover[1]} stroke={INK} strokeOpacity="0.35" strokeWidth="0.35" strokeDasharray="0.9 0.9" />
          )}
          {zoneStart && hover && (
            <ellipse
              cx={(zoneStart[0] + hover[0]) / 2} cy={(zoneStart[1] + hover[1]) / 2}
              rx={Math.abs(hover[0] - zoneStart[0]) / 2} ry={Math.abs(hover[1] - zoneStart[1]) / 2}
              fill="rgba(29,99,237,0.06)" stroke="rgba(29,99,237,0.5)" strokeWidth="0.3" strokeDasharray="1.4 1"
            />
          )}
        </svg>

        {/* text notes */}
        {texts.map((t) => (
          <span
            key={t.id}
            onPointerDown={(e) => beginMarkerDrag(e, "text", t.id)}
            className={`absolute -translate-x-1/2 -translate-y-1/2 rounded px-1.5 py-0.5 text-[14px] font-semibold whitespace-pre ${
              selection?.kind === "text" && selection.id === t.id ? "bg-[#F4E8E8] text-[#17212B] ring-1 ring-[#8F1D22]" : "text-[#17212B]"
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
          return (
            <button
              key={`d${i}`}
              onPointerDown={(e) => beginMarkerDrag(e, "def", `${i}`, i)}
              onDoubleClick={(e) => { if (!draft) { e.stopPropagation(); if (tool === "select") blockTo(i); } }}
              title={`${labelFor(i)} · drag to align`}
              className="group absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${x}%`, top: `${(y / FIELD_H) * 100}%` }}
            >
              <span className="pointer-events-none absolute -inset-1 rounded-lg border-2 border-grass opacity-0 transition group-hover:opacity-100" />
              <span className={`grid min-w-10 min-h-10 px-1 place-items-center text-[17px] font-extrabold text-[#17212B] whitespace-nowrap ${sel || armed ? "rounded-md ring-2 ring-[#8F1D22] bg-[#F4E8E8]" : ""}`}>
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
              <span className={`${markerBase} ${sel || armed ? "ring-2 ring-[#8F1D22]" : ""}`}>
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
            className="absolute z-10 grid size-6 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-ember bg-pitch text-ember shadow-lg transition hover:bg-ember hover:text-white"
            style={{ left: `${extendBtnPos[0]}%`, top: `${(extendBtnPos[1] / FIELD_H) * 100}%` }}
          >
            <Plus size={13} />
          </button>
        )}
      </div>

      {/* Floating toolbar */}
      <div className="mx-auto mt-2 flex flex-wrap items-center justify-center gap-0.5 rounded-lg border border-line bg-card px-2 py-1">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            onClick={() => { cancelDraft(); setExtendId(null); setTool(t.id); }}
            title={`${t.label} (${t.key})`}
            className={`flex flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 text-[11px] font-semibold transition ${
              tool === t.id ? "bg-grass/15 text-grass ring-1 ring-grass/40" : "text-dim hover:bg-slate-100 hover:text-ink"
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
            className={`rounded-lg px-2.5 py-2 transition ${style === s.id && !selLineId ? "bg-grass/15 ring-1 ring-grass/40" : "hover:bg-slate-100"}`}
          >
            <svg width="26" height="4" viewBox="0 0 26 4">
              <line x1="1" y1="2" x2="25" y2="2" stroke="#5b6b7c" strokeWidth={s.id === "solid" ? 2.4 : 2} strokeDasharray={s.id === "dashed" ? "5 3" : s.id === "dotted" ? "1.6 2.6" : undefined} strokeLinecap="round" />
            </svg>
          </button>
        ))}
        <span className="mx-1 h-8 w-px bg-line" />
        <button onClick={undo} title="Undo (Ctrl+Z)" className="rounded-lg p-2 text-dim hover:bg-slate-100 hover:text-ink"><Undo2 size={16} /></button>
        <button onClick={redo} title="Redo (Ctrl+Shift+Z)" className="rounded-lg p-2 text-dim hover:bg-slate-100 hover:text-ink"><Redo2 size={16} /></button>
        <button
          onClick={deleteSelection}
          disabled={!selection || selection.kind === "def"}
          title="Delete selection"
          className="rounded-lg p-2 text-red-500 hover:bg-red-500/10 disabled:opacity-30"
        >
          <Trash2 size={16} />
        </button>
      </div>
      {(pending || extendId) && (
        <p className="mx-auto mt-1.5 text-xs font-medium text-grass">
          {pending ? "Click to add bends. Double-click the endpoint or press Enter to finish. Esc cancels. Undo removes the last bend." : "Click the field to add one segment. Esc cancels."}
        </p>
      )}
    </div>
  );
}
