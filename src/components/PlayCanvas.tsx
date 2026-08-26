"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  MousePointer2,
  ArrowUpRight,
  RectangleHorizontal,
  MoveRight,
  Spline,
  Circle,
  Undo2,
  Redo2,
  Eraser,
  Check,
  Trash2,
  FlipHorizontal2,
} from "lucide-react";
import {
  getStructure,
  defenseCanvasY,
  FIELD_H,
  LOS_Y,
  YD,
  FIELD_PRESETS,
  type FieldPreset,
  type DrawLine,
  type Zone,
  type LineKind,
} from "@/lib/football";
import { useStore, type Call, type Player } from "@/lib/store";

type Tool = "select" | "route" | "block" | "motion" | "pitch" | "zone";
type Pt = [number, number];
type Drag =
  | { type: "off"; id: string; moved: boolean }
  | { type: "def"; slot: number; moved: boolean }
  | { type: "wp"; lineId: string; index: number; moved: boolean }
  | { type: "zone-move"; id: string; grab: Pt; moved: boolean }
  | { type: "zone-resize"; id: string; moved: boolean };

const uid = () => Math.random().toString(36).slice(2, 9);

const TOOLS: { id: Tool; icon: typeof MousePointer2; label: string; hint: string }[] = [
  { id: "select", icon: MousePointer2, label: "Select", hint: "Drag players & handles · click lines to edit · with an O selected, double-click a defender to block him" },
  { id: "route", icon: ArrowUpRight, label: "Route", hint: "Click a player → click points (or hold & drag to freehand) → double-click / Enter to finish" },
  { id: "block", icon: RectangleHorizontal, label: "Block", hint: "Click a player → click points → finish. Ends in a block bar" },
  { id: "motion", icon: MoveRight, label: "Motion", hint: "Dashed pre-snap movement — click a player, then points" },
  { id: "pitch", icon: Spline, label: "Pitch", hint: "Dotted pitch / option path — click a player, then points" },
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
  large = false,
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
  large?: boolean;
}) {
  const updateCall = useStore((s) => s.updateCall);
  const structure = getStructure(structureId);
  const byId = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);
  const preset = FIELD_PRESETS.find((p) => p.id === (call.fieldPreset ?? "midfield")) ?? FIELD_PRESETS[0];

  const fieldRef = useRef<HTMLDivElement>(null);
  const [tool, setTool] = useState<Tool>("select");
  const [draft, setDraft] = useState<{ anchor: string; anchorPos: Pt; rel: Pt[] } | null>(null);
  const [hover, setHover] = useState<Pt | null>(null);
  const [zoneStart, setZoneStart] = useState<Pt | null>(null);
  const [selLine, setSelLine] = useState<string | null>(null);
  const [selZone, setSelZone] = useState<string | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const freehandRef = useRef(false);
  const undoStack = useRef<Pick<Call, "offLook" | "lines" | "zones" | "defOffsets">[]>([]);
  const redoStack = useRef<Pick<Call, "offLook" | "lines" | "zones" | "defOffsets">[]>([]);

  const snap = () => ({
    offLook: call.offLook.map((m) => ({ ...m })),
    lines: call.lines.map((l) => ({ ...l, points: l.points.map((p) => [...p] as Pt) })),
    zones: call.zones.map((z) => ({ ...z })),
    defOffsets: { ...call.defOffsets },
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
    setSelLine(null);
    setSelZone(null);
  };
  const redo = () => {
    const next = redoStack.current.pop();
    if (next) {
      undoStack.current.push(snap());
      updateCall(call.id, next);
    }
  };

  // ── position helpers ──────────────────────────────────────────────────────
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

  // ── flip horizontal (mirror everything across midfield) ───────────────────
  const flipH = () => {
    snapshot();
    updateCall(call.id, {
      offLook: call.offLook.map((m) => ({ ...m, x: 100 - m.x })),
      zones: call.zones.map((z) => ({ ...z, x: 100 - z.x })),
      lines: call.lines.map((l) => ({ ...l, points: l.points.map(([dx, dy]) => [-dx, dy] as Pt) })),
      defOffsets: Object.fromEntries(
        Object.entries(call.defOffsets).map(([k, [ox, oy]]) => {
          const slot = structure.slots[Number(k)];
          return [k, [100 - 2 * slot.x - ox, oy] as Pt];
        }),
      ),
    });
  };

  // ── drawing ───────────────────────────────────────────────────────────────
  const startDraft = (anchor: string) => {
    const pos = anchorPos(anchor);
    if (pos) setDraft({ anchor, anchorPos: pos, rel: [] });
  };
  const finishDraft = () => {
    setDraft((d) => {
      if (d && d.rel.length > 0) {
        snapshot();
        updateCall(call.id, {
          lines: [
            ...call.lines,
            {
              id: uid(),
              anchor: d.anchor,
              kind: (tool === "select" || tool === "zone" ? "route" : tool) as LineKind,
              points: d.rel,
            },
          ],
        });
      }
      return null;
    });
    setHover(null);
    freehandRef.current = false;
  };

  const selectMarker = (anchor: string) => {
    if (anchor.startsWith("off:")) {
      onSelectOff(anchor.slice(4));
      onSelectSlot(null);
    } else {
      onSelectSlot(Number(anchor.slice(4)));
      onSelectOff(null);
    }
    setSelLine(null);
    setSelZone(null);
  };

  // Hudl block shortcut: with an O selected, double-click a defender.
  const blockTo = (slotIndex: number) => {
    if (!selectedOff) return false;
    const from = anchorPos(`off:${selectedOff}`);
    const to = defPos(slotIndex);
    if (!from) return false;
    const dx = to[0] - from[0];
    const dy = to[1] - from[1];
    const len = Math.hypot(dx, dy) || 1;
    const shorten = Math.max(0, len - 2.2) / len; // stop just short of the defender
    snapshot();
    updateCall(call.id, {
      lines: [...call.lines, { id: uid(), anchor: `off:${selectedOff}`, kind: "block", points: [[dx * shorten, dy * shorten]] }],
    });
    return true;
  };

  const onFieldPointerDown = (e: React.PointerEvent) => {
    if (tool === "zone" && e.target === e.currentTarget) setZoneStart(toCanvas(e));
    if (draft && e.target === e.currentTarget) freehandRef.current = true;
  };
  const onFieldClick = (e: React.MouseEvent) => {
    if (draft) {
      if (freehandRef.current && draft.rel.length > 2) return; // freehand already added points
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
    // freehand: append points while held down
    if (draft && freehandRef.current) {
      const [x, y] = toCanvas(e);
      const rel: Pt = [x - draft.anchorPos[0], y - draft.anchorPos[1]];
      const last = draft.rel[draft.rel.length - 1] ?? [0, 0];
      if (Math.hypot(rel[0] - last[0], rel[1] - last[1]) > 1.6) {
        setDraft({ ...draft, rel: [...draft.rel, rel] });
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
        defOffsets: {
          ...call.defOffsets,
          [d.slot]: [x - slot.x, Math.min(LOS_Y - 1.2, y) - defenseCanvasY(slot.y)],
        },
      });
    } else if (d.type === "wp") {
      const line = call.lines.find((l) => l.id === d.lineId);
      const a = line && anchorPos(line.anchor);
      if (line && a) {
        updateCall(call.id, {
          lines: call.lines.map((l) =>
            l.id === d.lineId
              ? { ...l, points: l.points.map((p, i) => (i === d.index ? ([x - a[0], y - a[1]] as Pt) : p)) }
              : l,
          ),
        });
      }
    } else if (d.type === "zone-move") {
      updateCall(call.id, {
        zones: call.zones.map((z) => (z.id === d.id ? { ...z, x: x - d.grab[0], y: y - d.grab[1] } : z)),
      });
    } else if (d.type === "zone-resize") {
      updateCall(call.id, {
        zones: call.zones.map((z) =>
          z.id === d.id ? { ...z, rx: Math.max(2, Math.abs(x - z.x)), ry: Math.max(2, Math.abs(y - z.y)) } : z,
        ),
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
        updateCall(call.id, {
          zones: [...call.zones, { id: uid(), x: cx, y: cy, rx, ry, side: cy < LOS_Y ? "def" : "off" }],
        });
      }
      setZoneStart(null);
      setHover(null);
    }
    const d = dragRef.current;
    if (d && !d.moved) {
      if (d.type === "off") selectMarker(`off:${d.id}`);
      else if (d.type === "def") selectMarker(`def:${d.slot}`);
    }
    dragRef.current = null;
  };

  const beginMarkerDrag = (e: React.PointerEvent, kind: "off" | "def", id: string, slot?: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (tool === "route" || tool === "block" || tool === "motion" || tool === "pitch") {
      if (!draft) startDraft(kind === "off" ? `off:${id}` : `def:${slot}`);
      else {
        // clicking another player while drafting = waypoint at that player
        const pos = kind === "off" ? anchorPos(`off:${id}`) : defPos(slot!);
        if (pos) setDraft({ ...draft, rel: [...draft.rel, [pos[0] - draft.anchorPos[0], pos[1] - draft.anchorPos[1]]] });
      }
      return;
    }
    if (tool !== "select") return;
    snapshot();
    dragRef.current = kind === "off" ? { type: "off", id, moved: false } : { type: "def", slot: slot!, moved: false };
  };

  // Keyboard shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName ?? "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      if (e.key === "Escape") {
        setDraft(null);
        setZoneStart(null);
        setSelLine(null);
        setSelZone(null);
        freehandRef.current = false;
      } else if (e.key === "Enter" && draft) {
        finishDraft();
      } else if ((e.key === "Delete" || e.key === "Backspace") && (selLine || selZone)) {
        snapshot();
        updateCall(call.id, {
          lines: selLine ? call.lines.filter((l) => l.id !== selLine) : call.lines,
          zones: selZone ? call.zones.filter((z) => z.id !== selZone) : call.zones,
        });
        setSelLine(null);
        setSelZone(null);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && e.shiftKey) {
        e.preventDefault();
        redo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // ── field markings from the preset ────────────────────────────────────────
  // Yards upfield (defense side) decrease toward the opponent goal; behind the
  // offense they increase toward their own goal.
  const yardLines: { y: number; label: string | null; goal: boolean }[] = [];
  for (let k = -14; k <= 14; k++) {
    const yardsFromLos = k * 5;
    const dist = preset.losYardline - yardsFromLos; // distance to opponent goal at this stripe
    const y = LOS_Y - yardsFromLos * YD;
    if (y < 1 || y > FIELD_H - 1) continue;
    if (dist < 0 || dist > 100) continue;
    const fieldNum = dist > 50 ? 100 - dist : dist;
    yardLines.push({
      y,
      label: dist % 10 === 0 && dist !== 0 && dist !== 100 && fieldNum !== 0 ? String(fieldNum) : null,
      goal: dist === 0 || dist === 100,
    });
  }
  const oppGoalY = LOS_Y - preset.losYardline * YD; // may be off-canvas
  const ownGoalY = LOS_Y + (100 - preset.losYardline) * YD;

  const linePath = (l: DrawLine): { pts: Pt[]; color: string } | null => {
    const a = anchorPos(l.anchor);
    if (!a) return null;
    return { pts: [a, ...l.points.map(([dx, dy]) => [a[0] + dx, a[1] + dy] as Pt)], color: lineColor(l.anchor, l.id === selLine) };
  };
  const blockBar = (pts: Pt[]) => {
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
  const selZoneObj = call.zones.find((z) => z.id === selZone) ?? null;
  const activeToolMeta = TOOLS.find((t) => t.id === tool)!;
  const mSize = large ? "size-11 text-sm" : "size-8 text-[11px]";
  const dSize = large ? "size-10 text-[13px]" : "size-8 text-[11px]";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
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
              className={`inline-flex items-center gap-1.5 rounded-full px-3 ${large ? "py-2 text-sm" : "py-1.5 text-xs"} display font-semibold transition ${
                tool === t.id ? "bg-grass text-pitch" : "text-dim hover:text-ink"
              }`}
            >
              <t.icon size={large ? 16 : 14} /> {t.label}
            </button>
          ))}
        </div>
        {draft && (
          <button
            onClick={finishDraft}
            className={`inline-flex items-center gap-1.5 rounded-full border border-grass bg-grass/15 px-3 ${large ? "py-2 text-sm" : "py-1.5 text-xs"} text-grass`}
          >
            <Check size={13} /> Finish
          </button>
        )}
        <button onClick={undo} title="Undo (Ctrl+Z)" className={`inline-flex items-center gap-1.5 rounded-full border border-line px-3 ${large ? "py-2 text-sm" : "py-1.5 text-xs"} text-dim hover:text-ink`}>
          <Undo2 size={13} /> Undo
        </button>
        <button onClick={redo} title="Redo (Ctrl+Shift+Z)" className={`inline-flex items-center gap-1.5 rounded-full border border-line px-3 ${large ? "py-2 text-sm" : "py-1.5 text-xs"} text-dim hover:text-ink`}>
          <Redo2 size={13} /> Redo
        </button>
        <button onClick={flipH} title="Flip play horizontally" className={`inline-flex items-center gap-1.5 rounded-full border border-line px-3 ${large ? "py-2 text-sm" : "py-1.5 text-xs"} text-dim hover:text-ink`}>
          <FlipHorizontal2 size={13} /> Flip
        </button>
        <select
          value={preset.id}
          onChange={(e) => updateCall(call.id, { fieldPreset: e.target.value as FieldPreset })}
          className={`rounded-full border border-line bg-card px-3 ${large ? "py-2 text-sm" : "py-1.5 text-xs"} text-dim`}
          title="Field position"
        >
          {FIELD_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>{p.label}</option>
          ))}
        </select>
        <button
          onClick={() => {
            if (call.lines.length || call.zones.length) {
              snapshot();
              updateCall(call.id, { lines: [], zones: [] });
            }
          }}
          title="Clear all drawings"
          className={`inline-flex items-center gap-1.5 rounded-full border border-line px-3 ${large ? "py-2 text-sm" : "py-1.5 text-xs"} text-dim hover:text-red-400 hover:border-red-500/40`}
        >
          <Eraser size={13} /> Clear
        </button>
      </div>
      <p className={`mb-2 text-dim ${large ? "text-sm" : "text-xs"}`}>{activeToolMeta.hint}</p>

      {/* Field */}
      <div
        ref={fieldRef}
        onPointerDown={onFieldPointerDown}
        onPointerMove={onFieldPointerMove}
        onPointerUp={onFieldPointerUp}
        onClick={onFieldClick}
        onDoubleClick={finishDraft}
        className={`relative rounded-xl border border-line bg-[#0d130f] aspect-4/3 overflow-hidden touch-none select-none min-h-0 ${
          tool === "select" ? "" : "cursor-crosshair"
        }`}
      >
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

          {/* end zones */}
          {oppGoalY > -22 && (
            <rect x="0" y={Math.max(-22, oppGoalY - 22)} width="100" height={Math.min(22, oppGoalY - Math.max(-22, oppGoalY - 22))} fill="rgba(74,222,128,0.06)" />
          )}
          {ownGoalY < FIELD_H + 22 && <rect x="0" y={ownGoalY} width="100" height="22" fill="rgba(248,113,113,0.05)" />}

          {/* yard lines + numbers */}
          {yardLines.map((yl) => (
            <g key={yl.y}>
              <line x1="0" x2="100" y1={yl.y} y2={yl.y} stroke={yl.goal ? "rgba(233,239,233,0.35)" : "rgba(233,239,233,0.09)"} strokeWidth={yl.goal ? 0.45 : 0.25} />
              {yl.label && (
                <>
                  <text x="8" y={yl.y + 1.2} fontSize="3.2" fill="rgba(233,239,233,0.22)" fontFamily="var(--font-barlow)" textAnchor="middle">{yl.label}</text>
                  <text x="92" y={yl.y + 1.2} fontSize="3.2" fill="rgba(233,239,233,0.22)" fontFamily="var(--font-barlow)" textAnchor="middle">{yl.label}</text>
                </>
              )}
            </g>
          ))}
          {/* hash marks every yard */}
          {[40, 60].map((x) =>
            Array.from({ length: Math.floor(FIELD_H / YD) }, (_, i) => i * YD + (LOS_Y % YD)).map((y) => (
              <line key={`${x}-${y}`} x1={x - 0.7} x2={x + 0.7} y1={y} y2={y} stroke="rgba(233,239,233,0.10)" strokeWidth="0.22" />
            )),
          )}
          {/* LOS */}
          <line x1="0" x2="100" y1={LOS_Y} y2={LOS_Y} stroke="rgba(74,222,128,0.55)" strokeWidth="0.4" />

          {/* zones */}
          {call.zones.map((z: Zone) => (
            <g key={z.id}>
              <ellipse
                cx={z.x} cy={z.y} rx={z.rx} ry={z.ry}
                fill={z.id === selZone ? "rgba(245,158,11,0.14)" : z.side === "def" ? "rgba(56,189,248,0.10)" : "rgba(248,113,113,0.10)"}
                stroke={z.id === selZone ? "#f59e0b" : z.side === "def" ? "rgba(56,189,248,0.55)" : "rgba(248,113,113,0.55)"}
                strokeWidth="0.3" strokeDasharray="1.4 1"
                style={{ pointerEvents: "all", cursor: tool === "select" ? "move" : undefined }}
                onPointerDown={(e) => {
                  if (tool !== "select") return;
                  e.stopPropagation();
                  const [x, y] = toCanvas(e);
                  snapshot();
                  dragRef.current = { type: "zone-move", id: z.id, grab: [x - z.x, y - z.y], moved: false };
                  setSelZone(z.id);
                  setSelLine(null);
                }}
              />
              {z.id === selZone && (
                <rect
                  x={z.x + z.rx - 1.1} y={z.y + z.ry - 1.1} width="2.2" height="2.2"
                  fill="#fff" stroke="#f59e0b" strokeWidth="0.25"
                  style={{ pointerEvents: "all", cursor: "nwse-resize" }}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    snapshot();
                    dragRef.current = { type: "zone-resize", id: z.id, moved: false };
                  }}
                />
              )}
            </g>
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
                  d={d} fill="none" stroke="transparent" strokeWidth="3"
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
                  d={d} fill="none" stroke={built.color}
                  strokeWidth={selected ? 0.55 : 0.42}
                  strokeLinejoin="round" strokeLinecap="round"
                  strokeDasharray={l.kind === "motion" ? "1.5 1.1" : l.kind === "pitch" ? "0.35 0.9" : undefined}
                  markerEnd={markerEnd}
                />
                {bar && <line x1={bar.x1} y1={bar.y1} x2={bar.x2} y2={bar.y2} stroke={built.color} strokeWidth={selected ? 0.55 : 0.42} strokeLinecap="round" />}
                {/* waypoint handles when selected */}
                {selected &&
                  built.pts.slice(1).map(([x, y], i) => (
                    <circle
                      key={i} cx={x} cy={y} r="1.15"
                      fill="#0d130f" stroke="#f59e0b" strokeWidth="0.3"
                      style={{ pointerEvents: "all", cursor: "grab" }}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        snapshot();
                        dragRef.current = { type: "wp", lineId: l.id, index: i, moved: false };
                      }}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        snapshot();
                        const remaining = l.points.filter((_, j) => j !== i);
                        updateCall(call.id, {
                          lines: remaining.length
                            ? call.lines.map((x2) => (x2.id === l.id ? { ...x2, points: remaining } : x2))
                            : call.lines.filter((x2) => x2.id !== l.id),
                        });
                        if (!remaining.length) setSelLine(null);
                      }}
                    />
                  ))}
              </g>
            );
          })}

          {/* rubber-band preview */}
          {draft && (
            <path
              d={[
                `M${draft.anchorPos[0]},${draft.anchorPos[1]}`,
                ...draft.rel.map(([dx, dy]) => `L${draft.anchorPos[0] + dx},${draft.anchorPos[1] + dy}`),
                hover && !freehandRef.current ? `L${hover[0]},${hover[1]}` : "",
              ].join(" ")}
              fill="none" stroke={lineColor(draft.anchor, false)} strokeOpacity="0.6" strokeWidth="0.4"
              strokeDasharray={tool === "motion" ? "1.5 1.1" : tool === "pitch" ? "0.35 0.9" : "0.9 0.9"}
            />
          )}
          {zoneStart && hover && (
            <ellipse
              cx={(zoneStart[0] + hover[0]) / 2} cy={(zoneStart[1] + hover[1]) / 2}
              rx={Math.abs(hover[0] - zoneStart[0]) / 2} ry={Math.abs(hover[1] - zoneStart[1]) / 2}
              fill="rgba(74,222,128,0.07)" stroke="rgba(74,222,128,0.5)" strokeWidth="0.3" strokeDasharray="1.4 1"
            />
          )}
        </svg>

        {/* LOS tag */}
        <span
          className="absolute left-2 -translate-y-1/2 text-[10px] text-grass/60 display tracking-widest pointer-events-none"
          style={{ top: `${(LOS_Y / FIELD_H) * 100}%` }}
        >
          LOS · {preset.losYardline > 50 ? `own ${100 - preset.losYardline}` : `opp ${preset.losYardline}`}
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
              onPointerDown={(e) => beginMarkerDrag(e, "def", `${i}`, i)}
              onDoubleClick={(e) => {
                e.stopPropagation();
                if (tool === "select" && selectedOff) blockTo(i);
              }}
              className="absolute -translate-x-1/2 -translate-y-1/2 text-center"
              style={{ left: `${x}%`, top: `${(y / FIELD_H) * 100}%` }}
            >
              <span
                className={`grid ${dSize} place-items-center rounded-full border-2 display font-bold transition ${
                  sel || anchored
                    ? "border-ember bg-ember/20 text-ember"
                    : call.assignments[i]
                      ? "border-sky bg-pitch text-sky"
                      : "border-sky/50 bg-pitch text-sky/80 hover:border-sky"
                }`}
              >
                {labelFor(i)}
              </span>
              {pl && <span className={`mt-0.5 block ${large ? "text-[11px]" : "text-[9px]"} text-dim`}>#{pl.jersey}</span>}
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
              onPointerDown={(e) => beginMarkerDrag(e, "off", o.id)}
              className={`absolute -translate-x-1/2 -translate-y-1/2 grid ${mSize} place-items-center border-2 display font-bold select-none ${
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
        {(selLineObj || selZoneObj) && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-full border border-line bg-pitch/95 px-2 py-1.5 shadow-lg">
            {selLineObj && (
              <>
                {(["route", "block", "motion", "pitch"] as LineKind[]).map((k) => (
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
                <span className="text-[10px] text-dim px-1">drag dots · dbl-click dot removes</span>
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
