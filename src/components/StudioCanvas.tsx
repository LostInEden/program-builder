"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  MousePointer2,
  Pencil,
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
  type PlayerAppearance,
  type DrawLine,
} from "@/lib/football";
import { useStore, type Call, type Player } from "@/lib/store";

import { ART_COLORS, arrowStyleOf, ColorChoices, offenseSymbol, PlayerGlyph, shortLabel, thicknessFactor } from "./PlayArtStyle";
import PlayArtObjectMenu from "./PlayArtObjectMenu";

export type Selection =
  | { kind: "off"; id: string }
  | { kind: "def"; slot: number }
  | { kind: "line"; id: string }
  | { kind: "zone"; id: string }
  | { kind: "text"; id: string }
  | null;

type Tool = "select" | "line" | "route" | "motion" | "block" | "text" | "zone" | "player" | "freehand";
type Pt = [number, number];
type DraftPath = { anchor: string; points: Pt[] };
type Drag =
  | { type: "off"; id: string; grab: Pt; members: { id: string; x: number; y: number }[]; moved: boolean }
  | { type: "def"; slot: number; moved: boolean }
  | { type: "text"; id: string; moved: boolean }
  | { type: "start"; lineId: string; moved: boolean }
  | { type: "wp"; lineId: string; index: number; moved: boolean }
  | { type: "zone-move"; id: string; grab: Pt; moved: boolean }
  | { type: "zone-resize"; id: string; moved: boolean };

// Show extra downfield space without rewriting saved player or path coordinates.
const FIELD_H = BASE_FIELD_H + 12;

// Explicit position type wins; older presets only have position labels.
const isOffensiveLineman = (m: { ptype?: string; label: string }) =>
  m.ptype ? m.ptype === "Offensive Line" : ["LT", "LG", "C", "RG", "RT"].includes(m.label.trim().toUpperCase());

const uid = () => Math.random().toString(36).slice(2, 9);
const INK = ROUTE_COLORS[0];
const DEF_INK = "#17212B";
// Sizes are in football coordinates so symbols and strokes zoom together.
const PLAYER_SIZE = 3.1;
const DEF_FONT_SIZE = 1.84; // Medium-sized defensive letters keep the alignment easy to read.
const PATH_WIDTH = PLAYER_SIZE * 0.09;
const BLOCK_BAR_HALF = 1.1;
// Display defaults match the light field without changing saved player colors.
const fieldColor = (color: string) => ({
  "#1e2a3a": "#262626", "#17212B": "#262626",
}[color] ?? color);
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
  { id: "freehand", icon: Pencil, label: "Free draw", key: "9", alias: "f" },
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
  const defAppearance = (i: number) => call.defAppearance?.[i] ?? {};
  const defLabel = (i: number) => shortLabel(defAppearance(i).displayLabel ?? labelFor(i));

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
      return structure.slots[i] && !defAppearance(i).hidden ? defPos(i) : null;
    }
    return [0, 0];
  };
  const workingSize = () => {
    const points: Pt[] = [...call.offLook.map(m => [m.x, m.y] as Pt), ...structure.slots.map((_, i) => defPos(i)), ...texts.map(t => [t.x, t.y] as Pt)];
    for (const line of call.lines) {
      const anchor = anchorPos(line.anchor);
      if (anchor) points.push(...line.points.map(p => [anchor[0] + p[0], anchor[1] + p[1]] as Pt));
    }
    for (const zone of call.zones) points.push([zone.x - zone.rx, zone.y - zone.ry], [zone.x + zone.rx, zone.y + zone.ry]);
    return {
      width: Math.max(100, ...points.map(p => (Math.abs(p[0] - 50) + 3) * 2)),
      height: Math.max(70, ...points.map(p => p[1] > LOS_Y ? (p[1] - LOS_Y + 3) / 0.68 : (LOS_Y - p[1] + 3) / 0.32)),
    };
  };
  const [fitSize, setFitSize] = useState(workingSize);
  const fieldRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<Pt>([0, 0]);
  const [panMode, setPanMode] = useState(false);
  const panDrag = useRef<{ x: number; y: number; origin: Pt } | null>(null);
  const [fieldWidth, setFieldWidth] = useState(1000);
  const [fieldHeight, setFieldHeight] = useState(600);
  const pathMaskId = useId();
  useEffect(() => {
    const field = fieldRef.current;
    if (!field) return;
    const observer = new ResizeObserver(([entry]) => {
      setFieldWidth(entry.contentRect.width);
      setFieldHeight(entry.contentRect.height);
    });
    observer.observe(field);
    return () => observer.disconnect();
  }, []);
  // One uniform camera scale for all football geometry. Saved coordinates never change.
  const scale = Math.max(0.01, Math.min(fieldWidth / fitSize.width, fieldHeight / fitSize.height)) * zoom;
  const viewWidth = fieldWidth / scale;
  const viewHeight = fieldHeight / scale;
  const cameraLeft = 50 - viewWidth / 2 + pan[0];
  const cameraTop = LOS_Y - viewHeight * 0.32 + pan[1];
  const screenPosition = (x: number, y: number) => ({
    left: `${(x - cameraLeft) / viewWidth * 100}%`,
    top: `${(y - cameraTop) / viewHeight * 100}%`,
  });
  const fit = () => { setFitSize(workingSize()); setZoom(1); setPan([0, 0]); setPanMode(false); };
  const [tool, setTool] = useState<Tool>("select");
  const [color, setColor] = useState(INK);
  const [thickness, setThickness] = useState<DrawLine["thickness"]>("normal");
  const [style, setStyle] = useState<LineStyle>("solid");
  // Draft points stay local until the entire assignment is finished.
  const [draft, setDraft] = useState<DraftPath | null>(null);
  const pending = draft?.anchor ?? null;
  const freehandPoints = useRef<Pt[] | null>(null);
  const cancelDraft = () => { freehandPoints.current = null; setDraft(null); setHover(null); };
  const [extendId, setExtendId] = useState<string | null>(null); // line armed for one more point
  const [hover, setHover] = useState<Pt | null>(null);
  const [zoneStart, setZoneStart] = useState<Pt | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const clickConsumedRef = useRef(false); // pointerup did work — swallow the synthetic click that follows
  const extendDragRef = useRef<string | null>(null); // + button pressed; click = arm, drag = live-extend
  type Snap = Pick<Call, "offLook" | "lines" | "zones" | "defOffsets" | "defAppearance"> & { texts: NonNullable<Call["texts"]> };
  const undoStack = useRef<Snap[]>([]);
  const redoStack = useRef<Snap[]>([]);

  const snap = (): Snap => ({
    offLook: call.offLook.map((m) => ({ ...m })),
    lines: call.lines.map((l) => ({ ...l, points: l.points.map((p) => [...p] as Pt) })),
    zones: call.zones.map((z) => ({ ...z })),
    defOffsets: { ...call.defOffsets },
    defAppearance: Object.fromEntries(Object.entries(call.defAppearance ?? {}).map(([k,v]) => [k, { ...v }])),
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

  const toCanvas = (e: { clientX: number; clientY: number }): Pt => {
    const r = fieldRef.current!.getBoundingClientRect();
    return [
      Math.min(99, Math.max(1, cameraLeft + ((e.clientX - r.left) / r.width) * viewWidth)),
      Math.min(FIELD_H - 1, Math.max(1, cameraTop + ((e.clientY - r.top) / r.height) * viewHeight)),
    ];
  };
  const colorOf = (l: { anchor: string; color?: string }) => {
    if (l.anchor.startsWith("off:")) return call.offLook.find(o => o.id === l.anchor.slice(4))?.color ?? INK;
    if (l.anchor.startsWith("def:")) return defAppearance(Number(l.anchor.slice(4))).color ?? DEF_INK;
    return legacy(l.color) ?? INK;
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
        ...structure.slots.flatMap((_, i) => defAppearance(i).hidden ? [] : [{ anchor: `def:${i}`, pos: defPos(i) }]),
      ];
      const nearest = candidates.map((c) => ({ ...c, distance: Math.hypot((c.pos[0] - pt[0]) * r.width / viewWidth, (c.pos[1] - pt[1]) * r.height / viewHeight) }))
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
        thickness,
        drawingType: tool === "line" ? "line" : "route",
        style: tool === "motion" ? "dashed" : style,
        showArrow: tool !== "block" && tool !== "line",
      }],
    });
    cancelDraft();
    onSelect(null);
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
      lines: [...call.lines, { id, anchor: fromAnchor, kind: "block", color: color === INK ? undefined : color, thickness, points: [[dx * k, dy * k]], style: "solid", showArrow: false }],
    });
    onSelect({ kind: "line", id });
    return true;
  };
  const blockTo = (slotIndex: number) => {
    if (selection?.kind !== "off") return;
    blockBetween(`off:${selection.id}`, `def:${slotIndex}`);
  };

  const onFieldPointerDown = (e: React.PointerEvent) => {
    if (panMode && zoom > 1) {
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      panDrag.current = { x: e.clientX, y: e.clientY, origin: pan };
      clickConsumedRef.current = true;
      return;
    }
    clickConsumedRef.current = false;
    if (tool === "freehand" && isFieldTarget(e)) {
      e.currentTarget.setPointerCapture(e.pointerId);
      freehandPoints.current = [toCanvas(e)];
      setDraft({ anchor: "free", points: freehandPoints.current });
      return;
    }
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
      return;
    }
    if (tool === "player" && onField) {
      const [x, y] = toCanvas(e);
      snapshot();
      const id = uid();
      updateCall(call.id, { offLook: [...call.offLook, { id, label: "?", x, y: Math.min(LOS_Y - 1.2, y) }] });
      onSelect({ kind: "off", id });
      return;
    }
    if (onField && tool === "select") {
      // empty-field click = done: back to Select, everything deselected/placed
      setTool("select");
      onSelect(null);
      setExtendId(null);
      cancelDraft();
    }
  };
  const onFieldPointerMove = (e: React.PointerEvent) => {
    if (panDrag.current) {
      const drag = panDrag.current;
      setPan([Math.max(-100, Math.min(100, drag.origin[0] - (e.clientX - drag.x) / scale)), Math.max(-FIELD_H, Math.min(FIELD_H, drag.origin[1] - (e.clientY - drag.y) / scale))]);
      return;
    }
    if (freehandPoints.current) {
      const pt = toCanvas(e), last = freehandPoints.current.at(-1)!;
      if (Math.hypot(pt[0] - last[0], pt[1] - last[1]) > 0.3) {
        freehandPoints.current.push(pt);
        setDraft({ anchor: "free", points: [...freehandPoints.current] });
      }
      return;
    }
    if (pending || extendId || zoneStart) setHover(toCanvas(e));
    const d = dragRef.current;
    if (!d) return;
    const [x, y] = toCanvas(e);
    if (d.type === "off" && !d.moved && Math.hypot(x - d.grab[0], y - d.grab[1]) < 0.25) return;
    d.moved = true;
    if (d.type === "off") {
      // Clamp the translation once for the group so splits never collapse at an edge.
      const dx = Math.max(1 - Math.min(...d.members.map((m) => m.x)), Math.min(99 - Math.max(...d.members.map((m) => m.x)), x - d.grab[0]));
      const dy = Math.max(4 - Math.min(...d.members.map((m) => m.y)), Math.min(LOS_Y - 1.2 - Math.max(...d.members.map((m) => m.y)), y - d.grab[1]));
      updateCall(call.id, {
        offLook: call.offLook.map((m) => {
          const origin = d.members.find((member) => member.id === m.id);
          return origin ? { ...m, x: origin.x + dx, y: origin.y + dy } : m;
        }),
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
    if (panDrag.current) { panDrag.current = null; clickConsumedRef.current = true; return; }
    if (freehandPoints.current) {
      const points = [...freehandPoints.current, toCanvas(e)];
      if (points.length > 2) { snapshot(); updateCall(call.id, { lines: [...call.lines, { id: uid(), anchor: "free", points, kind: "route", drawingType: "freehand", color: color === INK ? undefined : color, thickness, style, showArrow: false }] }); }
      cancelDraft(); clickConsumedRef.current = true; return;
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
        updateCall(call.id, { zones: [...call.zones, { id, x: cx, y: cy, rx, ry, side: cy < LOS_Y ? "off" : "def" }] });
        onSelect({ kind: "zone", id });
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
    if (panMode) { onFieldPointerDown(e); return; }
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
    if (kind === "off") {
      const marker = call.offLook.find((m) => m.id === id);
      const groupLine = marker && isOffensiveLineman(marker) && !e.shiftKey;
      const members = call.offLook.filter((m) => groupLine ? isOffensiveLineman(m) : m.id === id).map(({ id, x, y }) => ({ id, x, y }));
      dragRef.current = { type: "off", id, grab: toCanvas(e), members, moved: false };
    } else {
      dragRef.current = kind === "def" ? { type: "def", slot: slot!, moved: false } : { type: "text", id, moved: false };
    }
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
    if (selection.kind === "def") updateCall(call.id, {
      defAppearance: { ...call.defAppearance, [selection.slot]: { ...defAppearance(selection.slot), hidden: true } },
      lines: call.lines.filter(l => l.anchor !== `def:${selection.slot}`),
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
        setPanMode(false);
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

  const selectedOff = selection?.kind === "off" ? call.offLook.find(o => o.id === selection.id) : undefined;
  const selectedDef = selection?.kind === "def" ? selection.slot : undefined;
  const menuPlayer = selectedOff ? { appearance: selectedOff, label: selectedOff.showLabel ? selectedOff.displayLabel ?? selectedOff.label : "", symbol: offenseSymbol(selectedOff) } :
    selectedDef !== undefined ? { appearance: defAppearance(selectedDef), label: defLabel(selectedDef), symbol: defAppearance(selectedDef).symbol ?? "letters" as const } : undefined;
  const menuPoint: Pt | null = selectedOff ? [selectedOff.x, selectedOff.y] : selectedDef !== undefined ? defPos(selectedDef) : selLineObj ? lineEnd(selLineObj) : null;
  const patchPlayer = (patch: PlayerAppearance) => {
    snapshot();
    if (selectedOff) updateCall(call.id, { offLook: call.offLook.map(o => o.id === selectedOff.id ? { ...o, ...patch, ...(patch.displayLabel !== undefined ? { showLabel: !!patch.displayLabel } : {}) } : o) });
    if (selectedDef !== undefined) updateCall(call.id, { defAppearance: { ...call.defAppearance, [selectedDef]: { ...defAppearance(selectedDef), ...patch, ...(patch.displayLabel === "" && !defAppearance(selectedDef).symbol ? { symbol: "circle" as const } : {}) } } });
  };
  const patchLine = (patch: Partial<DrawLine>) => { if (selLineObj) { snapshot(); updateCall(call.id, { lines: call.lines.map(l => l.id === selLineObj.id ? { ...l, ...patch } : l) }); } };
  const offenseRadius = PLAYER_SIZE * scale / 2;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-2 py-1 text-xs">
        <span className="hidden lg:block text-dim">Click bends · Enter finishes · Esc cancels</span>
        <div className="ml-auto flex items-center gap-1" aria-label="Canvas view controls">
          <button type="button" aria-label="Zoom out" onClick={() => { cancelDraft(); setZoom(z => Math.max(1, z / 1.25)); setPan([0, 0]); setPanMode(false); }} className="rounded border border-line px-3 py-1">−</button>
          <button type="button" title="100% is Fit to Screen" onClick={() => { cancelDraft(); fit(); }} className="min-w-14 rounded border border-line px-2 py-1">{Math.round(zoom * 100)}%</button>
          <button type="button" aria-label="Zoom in" onClick={() => { cancelDraft(); setZoom(z => Math.min(4, z * 1.25)); }} className="rounded border border-line px-3 py-1">+</button>
          <button type="button" onClick={() => { cancelDraft(); fit(); }} className="rounded border border-line px-3 py-1 text-gold">Fit</button>
          <button type="button" aria-pressed={panMode} disabled={zoom === 1} onClick={() => { cancelDraft(); setPanMode(!panMode); }} className={`rounded border border-line px-3 py-1 disabled:opacity-40 ${panMode ? "bg-grass text-white" : ""}`}>Pan</button>
        </div>
      </div>
      <div
        ref={fieldRef}
        onPointerDownCapture={e => { if (panMode) { onFieldPointerDown(e); e.stopPropagation(); } }}
        onPointerDown={onFieldPointerDown}
        onPointerMove={onFieldPointerMove}
        onPointerUp={onFieldPointerUp}
        onPointerLeave={() => setHover(null)}
        onPointerCancel={() => {
          panDrag.current = null;
          cancelDraft();
          // iOS fires this on system gestures / palm rejection — abort the drag
          // and restore the pre-gesture state so nothing is half-moved.
          if (dragRef.current?.moved) undo();
          dragRef.current = null;
          setZoneStart(null);
        }}
        onClick={onFieldClick}
        onDoubleClick={(e) => { if (draft) { e.preventDefault(); finishPath(); } }}
        style={{ cursor: panMode ? "grab" : undefined }}
        className={`relative min-h-0 flex-1 w-full overflow-hidden rounded-sm border border-line bg-[#FFFFFF] touch-none select-none ${
          tool === "select" && !pending && !extendId ? "" : "cursor-crosshair"
        }`}
      >
        <svg viewBox={`${cameraLeft} ${cameraTop} ${viewWidth} ${viewHeight}`} preserveAspectRatio="xMidYMid meet" className="absolute inset-0 h-full w-full" style={{ pointerEvents: "none" }}>
          <defs>
            <mask id={pathMaskId} maskUnits="userSpaceOnUse" x="0" y="0" width="100" height={FIELD_H}>
              <rect width="100" height={FIELD_H} fill="white" />
              {structure.slots.map((_, i) => {
                if (defAppearance(i).hidden) return null;
                const [x, y] = defPos(i);
                const halfWidth = (defAppearance(i).symbol && defAppearance(i).symbol !== "letters" ? PLAYER_SIZE / 2 : defLabel(i).length * DEF_FONT_SIZE * 0.35 + 0.3) * scale * viewWidth / fieldWidth;
                const halfHeight = (defAppearance(i).symbol && defAppearance(i).symbol !== "letters" ? PLAYER_SIZE / 2 : DEF_FONT_SIZE * 0.5) * scale * viewHeight / fieldHeight;
                return <rect key={`def-${i}`} x={x - halfWidth} y={y - halfHeight} width={halfWidth * 2} height={halfHeight * 2} fill="black" />;
              })}
              {call.offLook.map((m) => <ellipse key={m.id} cx={m.x} cy={m.y} rx={(offenseRadius + 0.2 * scale) * viewWidth / fieldWidth} ry={(offenseRadius + 0.2 * scale) * viewHeight / fieldHeight} fill="black" />)}
            </mask>
            {[...new Set([...ROUTE_COLORS, ...ART_COLORS.map(c => c.value), ...call.lines.map(l => l.color).filter((c): c is string => !!c), DEF_INK, "#B3995D"])].map((c) => (
              <marker key={c} id={`sarr-${c.slice(1)}`} viewBox="0 0 6 6" refX="4.6" refY="3" markerWidth="3.5" markerHeight="3.5" orient="auto-start-reverse">
                <path d="M0,0 L6,3 L0,6 z" fill={fieldColor(c)} />
              </marker>
            ))}
          </defs>

          <g>
          {yardLines.map((yl) => (
            <g key={yl.y}>
              <line x1="0" x2="100" y1={yl.y} y2={yl.y} stroke={yl.goal ? "#A7ADB1" : "#686E72"} strokeWidth={yl.goal ? 0.5 : 0.24} />
              {yl.label && (
                <>
                  <text x="14" y={yl.y} fontSize="6" fill="none" stroke="#9DA3A6" strokeWidth="0.1" fontFamily="var(--font-inter)" fontWeight="700" textAnchor="middle" transform={`rotate(-90 14 ${yl.y})`}>{yl.label}</text>
                  <text x="86" y={yl.y} fontSize="6" fill="none" stroke="#9DA3A6" strokeWidth="0.1" fontFamily="var(--font-inter)" fontWeight="700" textAnchor="middle" transform={`rotate(90 86 ${yl.y})`}>{yl.label}</text>
                </>
              )}
            </g>
          ))}
          {/* Horizontal hash marks positioned like the reference board. */}
          {[100 / 3, 200 / 3].map((x) =>
            Array.from({ length: Math.floor(FIELD_H / YD) }, (_, i) => i * YD + (LOS_Y % YD)).map((y) => (
              <line key={`${x}-${y}`} x1={x - 0.625} x2={x + 0.625} y1={y} y2={y} stroke="rgba(157,163,166,0.65)" strokeWidth="0.22" />
            )),
          )}
          {/* The board ends at each sideline; no out-of-bounds strip. */}
          {[0, 100].map((x) => <line key={`sideline-${x}`} x1={x} x2={x} y1="0" y2={FIELD_H} stroke="rgba(157,163,166,0.65)" strokeWidth="0.8" />)}
          <line x1="0" x2="100" y1={LOS_Y} y2={LOS_Y} stroke="#AA0000" strokeWidth="0.4" />

          {call.zones.map((z) => (
            <g key={z.id}>
              <ellipse
                cx={z.x} cy={z.y} rx={z.rx} ry={z.ry}
                fill={z.id === selZoneId ? "rgba(179,153,93,0.12)" : z.side === "def" ? "rgba(179,153,93,0.08)" : "rgba(170,0,0,0.06)"}
                stroke={z.id === selZoneId ? "#B3995D" : z.side === "def" ? "rgba(179,153,93,0.65)" : "rgba(170,0,0,0.55)"}
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
                  x={z.x + z.rx - 1.1} y={z.y + z.ry - 1.1} width="2.2" height="2.2" fill="#ffffff" stroke="#B3995D" strokeWidth="0.25"
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
            const halfWidth = (defIndex !== null ? Math.max(2.2, labelFor(defIndex).length * DEF_FONT_SIZE * 0.35 + 0.3) * scale : offenseRadius + 0.3 * scale) * viewWidth / fieldWidth;
            const halfHeight = (defIndex !== null ? 2.2 * scale : offenseRadius + 0.3 * scale) * viewHeight / fieldHeight;
            const edge = Math.min(halfWidth / (Math.abs(dx) || 0.0001), halfHeight / (Math.abs(dy) || 0.0001));
            const startHandle: Pt = l.anchor === "free" ? pts[0] : [pts[0][0] + dx * (edge + 1.4 / (Math.hypot(dx, dy) || 1)), pts[0][1] + dy * (edge + 1.4 / (Math.hypot(dx, dy) || 1))];
            const c = colorOf(l);
            const rawColor = c;
            const d = l.smooth ? smoothPath(pts) : pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`).join(" ");
            const arrows = arrowStyleOf(l);
            const showArrow = arrows !== "none";
            let bar = null;
            if (l.kind === "block") {
              const [ax, ay] = pts[pts.length - 2];
              const [bx, by] = pts[pts.length - 1];
              const len = Math.hypot(bx - ax, by - ay) || 1;
              const nx = -(by - ay) / len;
              const ny = (bx - ax) / len;
              bar = { x1: bx - nx * BLOCK_BAR_HALF, y1: by - ny * BLOCK_BAR_HALF, x2: bx + nx * BLOCK_BAR_HALF, y2: by + ny * BLOCK_BAR_HALF };
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
                  mask={`url(#${pathMaskId})`} d={d} fill="none" stroke={fieldColor(c)} strokeWidth={PATH_WIDTH * thicknessFactor(l.thickness) * (selected ? 1.35 : l.kind === "block" ? 0.9 : 1)}
                  strokeLinejoin="round" strokeLinecap="round" strokeDasharray={lineDash(l)}
                  markerStart={arrows === "both" ? `url(#sarr-${rawColor.slice(1)})` : undefined}
                  markerEnd={showArrow ? `url(#sarr-${rawColor.slice(1)})` : undefined}
                  style={{ pointerEvents: "none" }}
                />
                {bar && <line mask={`url(#${pathMaskId})`} x1={bar.x1} y1={bar.y1} x2={bar.x2} y2={bar.y2} stroke={fieldColor(c)} strokeWidth={PATH_WIDTH * thicknessFactor(l.thickness) * (selected ? 1.2 : 0.9)} strokeLinecap="round" style={{ pointerEvents: "none" }} />}
                {selected && tool === "select" && (
                  <>
                    <circle cx={startHandle[0]} cy={startHandle[1]} r="1.1" fill="#ffffff" stroke="#B3995D" strokeWidth="0.3"
                      style={{ pointerEvents: "all", cursor: "grab" }}
                      onPointerDown={(e) => { e.stopPropagation(); e.currentTarget.setPointerCapture(e.pointerId); snapshot(); dragRef.current = { type: "start", lineId: l.id, moved: false }; }}>
                      <title>Drag start (detaches from player)</title>
                    </circle>
                    {/* waypoint handles (filled), stored indices differ for free paths */}
                    {pts.slice(1).map(([x, y], vertexIndex) => {
                      const i = l.anchor === "free" ? vertexIndex + 1 : vertexIndex;
                      return vertexIndex === pts.length - 2 && !extendId ? null : ( // tip is the + button
                      <circle
                        key={`wp${i}`} cx={x} cy={y} r="1.1" fill="#ffffff" stroke="#B3995D" strokeWidth="0.3"
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
                        key={`mid${i}`} cx={m.x} cy={m.y} r="0.95" fill="rgba(255,255,255,0.85)" stroke="#B3995D" strokeWidth="0.22" strokeDasharray="0.5 0.4"
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
            const c = colorOf({ anchor: draft.anchor, color: color === INK ? undefined : color });
            const end = pts.at(-1)!;
            const prev = pts.at(-2)!;
            const len = Math.hypot(end[0] - prev[0], end[1] - prev[1]) || 1;
            const nx = -(end[1] - prev[1]) / len, ny = (end[0] - prev[0]) / len;
            return <g mask={`url(#${pathMaskId})`} style={{ pointerEvents: "none" }}>
              <path d={pts.map(([x, y], i) => `${i ? "L" : "M"}${x},${y}`).join(" ")} fill="none" stroke={fieldColor(c)} strokeWidth={PATH_WIDTH * thicknessFactor(thickness) * (tool === "block" ? 0.9 : 1)} strokeLinejoin="round" strokeLinecap="round"
                strokeDasharray={lineDash({ kind: toolKind(), style: tool === "motion" ? "dashed" : style })}
                markerEnd={tool !== "block" && tool !== "line" && tool !== "freehand" ? `url(#sarr-${c.slice(1)})` : undefined} />
              {tool === "block" && <line x1={end[0] - nx * BLOCK_BAR_HALF} y1={end[1] - ny * BLOCK_BAR_HALF} x2={end[0] + nx * BLOCK_BAR_HALF} y2={end[1] + ny * BLOCK_BAR_HALF} stroke={fieldColor(c)} strokeWidth={PATH_WIDTH * thicknessFactor(thickness) * 0.9} />}
              {draft.points.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="0.5" fill={fieldColor(c)} />)}
            </g>;
          })()}
          {extendId && ghostFrom && hover && (
            <line x1={ghostFrom[0]} y1={ghostFrom[1]} x2={hover[0]} y2={hover[1]} stroke={fieldColor(extendBtnFor ? colorOf(extendBtnFor) : INK)} strokeOpacity="0.35" strokeWidth={PATH_WIDTH} strokeDasharray="0.9 0.9" />
          )}
          {zoneStart && hover && (
            <ellipse
              cx={(zoneStart[0] + hover[0]) / 2} cy={(zoneStart[1] + hover[1]) / 2}
              rx={Math.abs(hover[0] - zoneStart[0]) / 2} ry={Math.abs(hover[1] - zoneStart[1]) / 2}
              fill="rgba(170,0,0,0.06)" stroke="rgba(170,0,0,0.5)" strokeWidth="0.3" strokeDasharray="1.4 1"
            />
          )}
          </g>
        </svg>

        {/* text notes */}
        {texts.map((t) => (
          <span
            key={t.id}
            onPointerDown={(e) => beginMarkerDrag(e, "text", t.id)}
            className={`absolute -translate-x-1/2 -translate-y-1/2 rounded px-1.5 py-0.5 font-semibold whitespace-pre ${
              selection?.kind === "text" && selection.id === t.id ? "bg-grass text-white ring-1 ring-gold" : "text-ink"
            } ${tool === "select" ? "cursor-grab" : ""}`}
            style={{ ...screenPosition(t.x, t.y), fontSize: 1.4 * scale }}
          >
            {t.text}
          </span>
        ))}

        {/* Every player uses the same selection and appearance workflow. */}
        {structure.slots.map((slot, i) => {
          const appearance = defAppearance(i);
          if (appearance.hidden) return null;
          const [x, y] = defPos(i);
          const selected = selection?.kind === "def" && selection.slot === i;
          const symbol = appearance.symbol ?? "letters";
          return <button key={`d${i}`} onPointerDown={e => beginMarkerDrag(e, "def", `${i}`, i)}
            onDoubleClick={e => { if (!draft && tool === "select") { e.stopPropagation(); blockTo(i); } }}
            title={`${defLabel(i) || "Defender"} · drag to align`} aria-label={`Defender ${defLabel(i) || i + 1}`}
            className={`absolute -translate-x-1/2 -translate-y-1/2 ${selected ? "ring-1 ring-gold rounded" : ""}`}
            style={{ ...screenPosition(x, y), width: PLAYER_SIZE * scale, height: PLAYER_SIZE * scale }}>
            {symbol === "letters" ? <span style={{ color: appearance.color ?? "#262626", fontSize: DEF_FONT_SIZE * scale, ...(appearance.color === "#000000" ? { textShadow: "0 0 2px white" } : {}) }} className="font-extrabold whitespace-nowrap">{defLabel(i)}</span> :
              <svg viewBox="0 0 40 40" className="pointer-events-none h-full w-full"><PlayerGlyph defaultColor="#262626" appearance={appearance} label={defLabel(i)} symbol={symbol} /></svg>}
          </button>;
        })}
        {call.offLook.map(o => {
          const selected = selection?.kind === "off" && selection.id === o.id;
          return <span key={o.id} title={`${o.label} · Drag to align`} role="button" aria-label={`Offensive player ${o.displayLabel || o.label}`}
            onPointerDown={e => beginMarkerDrag(e, "off", o.id)}
            className={`absolute aspect-square -translate-x-1/2 -translate-y-1/2 cursor-grab ${selected ? "ring-1 ring-gold rounded" : ""}`}
            style={{ ...screenPosition(o.x, o.y), width: PLAYER_SIZE * scale }}>
            <svg viewBox="0 0 40 40" className="pointer-events-none h-full w-full"><PlayerGlyph defaultColor="#262626" appearance={o} label={o.showLabel ? o.displayLabel ?? o.label : ""} symbol={offenseSymbol(o)} /></svg>
          </span>;
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
            style={{ ...screenPosition(extendBtnPos[0], extendBtnPos[1]) }}
          >
            <Plus size={13} />
          </button>
        )}
        {tool === "select" && menuPoint && (menuPlayer || selLineObj) && !panMode && <PlayArtObjectMenu
          key={selectedOff?.id ?? (selectedDef !== undefined ? `def:${selectedDef}` : selLineObj?.id)}
          position={[(menuPoint[0] - cameraLeft) * scale, (menuPoint[1] - cameraTop) * scale]} bounds={[fieldWidth, fieldHeight]}
          player={menuPlayer} line={selLineObj ?? undefined} onPlayerChange={patchPlayer} onLineChange={patchLine}
          onDelete={deleteSelection} onClose={() => onSelect(null)} />}
      </div>

      {/* Floating toolbar */}
      <div className="mx-auto mt-1 shrink-0 flex flex-wrap items-center justify-center gap-0.5 rounded-lg border border-line bg-card px-2 py-1">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            onClick={() => { cancelDraft(); setExtendId(null); setTool(t.id); setPanMode(false); }}
            aria-label={t.label} title={`${t.label} (${t.key})`}
            className={`flex flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 text-[11px] font-semibold transition ${
              tool === t.id ? "bg-grass/15 text-grass ring-1 ring-grass/40" : "text-dim hover:bg-slate-100 hover:text-ink"
            }`}
          >
            <t.icon size={17} />
            <span className="hidden min-[1100px]:inline">{t.label}</span>
          </button>
        ))}
        <span className="mx-1 h-8 w-px bg-line" />
        <details className="relative">
          <summary className="cursor-pointer rounded border border-line px-2 py-1 text-xs">Color <span style={{ color: fieldColor(color) }}>●</span></summary>
          <div className="absolute bottom-full right-0 mb-2 w-72 rounded border border-line bg-card p-2 shadow-xl"><ColorChoices label="New drawing color" value={color === INK ? undefined : color} onChange={c => setColor(c ?? INK)} /></div>
        </details>
        <select aria-label="New drawing thickness" value={thickness} onChange={e => setThickness(e.target.value as DrawLine["thickness"])} className="rounded border border-line bg-card p-1 text-xs"><option value="thin">Thin</option><option value="normal">Normal</option><option value="thick">Thick</option></select>
        {STYLES.map((s) => (
          <button
            key={s.id}
            onClick={() => {
              setStyle(s.id);
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
          disabled={!selection}
          title="Delete selection"
          className="rounded-lg p-2 text-red-500 hover:bg-red-500/10 disabled:opacity-30"
        >
          <Trash2 size={16} />
        </button>
      </div>
      {(pending || extendId) && (
        <p className="pointer-events-none absolute left-2 top-10 z-10 max-w-[75%] rounded bg-card/90 px-2 py-1 text-[10px] font-medium text-grass">
          {pending ? "Click to add bends. Double-click the endpoint or press Enter to finish. Esc cancels. Undo removes the last bend." : "Click the field to add one segment. Esc cancels."}
        </p>
      )}
    </div>
  );
}
