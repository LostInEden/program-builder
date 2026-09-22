"use client";

// Pure-SVG, print-friendly rendering of a play card (light palette for paper).
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
} from "@/lib/football";
import { ART_COLORS, arrowStyleOf, offenseSymbol, PlayerGlyph, shortLabel, thicknessFactor } from "./PlayArtStyle";
import { slotLabelOf, type Call, type Overrides } from "@/lib/store";

// Show extra downfield space without rewriting saved player or path coordinates.
const FIELD_H = BASE_FIELD_H + 12;

const OFF = "#17212B";
const DEF = "#505050";
const INKC = "#1f2937";
const FAINT = "#d1d5db";

export default function PlayCardSVG({
  call,
  structureId,
  overrides,
}: {
  call: Call;
  structureId: string;
  overrides: Overrides;
  defStyle: "letters" | "triangles";
}) {
  const structure = getStructure(structureId);
  const preset = FIELD_PRESETS.find((p) => p.id === (call.fieldPreset ?? "midfield")) ?? FIELD_PRESETS[0];

  const defPos = (i: number): [number, number] => {
    const slot = structure.slots[i];
    const off = call.defOffsets[i] ?? [0, 0];
    return [slot.x + off[0], defenseCanvasY(slot.y) + off[1]];
  };
  const anchorPos = (anchor: string): [number, number] | null => {
    if (anchor.startsWith("off:")) {
      const m = call.offLook.find((x) => x.id === anchor.slice(4));
      return m ? [m.x, m.y] : null;
    }
    if (anchor.startsWith("def:")) {
      const i = Number(anchor.slice(4));
      return structure.slots[i] && !call.defAppearance?.[i]?.hidden ? defPos(i) : null;
    }
    return [0, 0];
  };

  const yardLines: { y: number; label: string | null; goal: boolean }[] = [];
  for (let k = -14; k <= 14; k++) {
    const dist = preset.losYardline - k * 5;
    const y = LOS_Y + k * 5 * YD;
    if (y < 1 || y > FIELD_H - 1 || dist < 0 || dist > 100) continue;
    const fieldNum = dist > 50 ? 100 - dist : dist;
    yardLines.push({
      y,
      label: dist % 10 === 0 && dist !== 0 && dist !== 100 && fieldNum !== 0 ? String(fieldNum) : null,
      goal: dist === 0 || dist === 100,
    });
  }

  const arrId = (c: string) => `pa-${c.replace("#", "")}-${call.id}`;

  return (
    <svg viewBox={`0 0 100 ${FIELD_H}`} className="w-full h-auto rounded border border-gray-300 bg-white">
      <rect width="100" height={FIELD_H} fill="#FFFFFF" />
      <defs>
        {[...new Set([OFF, DEF, ...ROUTE_COLORS, ...ART_COLORS.map(c => c.value), ...call.lines.map(l => l.color).filter((c): c is string => !!c), "#6b7280"])].map((c) => (
          <marker key={c} id={arrId(c)} viewBox="0 0 6 6" refX="4.6" refY="3" markerWidth="3.5" markerHeight="3.5" orient="auto-start-reverse">
            <path d="M0,0 L6,3 L0,6 z" fill={c} />
          </marker>
        ))}
      </defs>

      {yardLines.map((yl) => (
        <g key={yl.y}>
          <line x1="0" x2="100" y1={yl.y} y2={yl.y} stroke={yl.goal ? "#9ca3af" : FAINT} strokeWidth={yl.goal ? 0.5 : 0.22} />
          {yl.label && (
            <>
              <text x="14" y={yl.y + 1.2} fontSize="3" fill="#9ca3af" textAnchor="middle">{yl.label}</text>
              <text x="86" y={yl.y + 1.2} fontSize="3" fill="#9ca3af" textAnchor="middle">{yl.label}</text>
            </>
          )}
        </g>
      ))}
      {/* Coach-preferred wider hash spacing with horizontal ticks only. */}
          {[100 / 3, 200 / 3].map((x) =>
            Array.from({ length: Math.floor(FIELD_H / YD) }, (_, i) => i * YD + (LOS_Y % YD)).map((y) => (
              <line key={`${x}-${y}`} x1={x - 0.625} x2={x + 0.625} y1={y} y2={y} stroke="#9ca3af" strokeWidth="0.22" />
            )),
          )}
          {/* The board ends at each sideline; no out-of-bounds strip. */}
          {[0, 100].map((x) => <line key={`sideline-${x}`} x1={x} x2={x} y1="0" y2={FIELD_H} stroke="#9ca3af" strokeWidth="0.8" />)}
          <line x1="0" x2="100" y1={LOS_Y} y2={LOS_Y} stroke={INKC} strokeWidth="0.4" />

      {call.zones.map((z) => (
        <ellipse
          key={z.id} cx={z.x} cy={z.y} rx={z.rx} ry={z.ry}
          fill={z.side === "def" ? "rgba(14,116,144,0.08)" : "rgba(185,28,28,0.08)"}
          stroke={z.side === "def" ? DEF : OFF} strokeWidth="0.28" strokeDasharray="1.4 1"
        />
      ))}

      {call.lines.map((l) => {
        const a = anchorPos(l.anchor);
        if (!a) return null;
        const pts: [number, number][] = l.anchor === "free" ? l.points : [a, ...l.points.map(([dx, dy]) => [a[0] + dx, a[1] + dy] as [number, number])];
        if (pts.length < 2) return null;
        const color = l.anchor.startsWith("off:") ? call.offLook.find(o => o.id === l.anchor.slice(4))?.color ?? OFF :
          l.anchor.startsWith("def:") ? call.defAppearance?.[Number(l.anchor.slice(4))]?.color ?? DEF : l.color ?? OFF;
        const arrows = arrowStyleOf(l);
        const showArrow = arrows !== "none";
        const d = l.smooth ? smoothPath(pts) : pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`).join(" ");
        let bar = null;
        if (l.kind === "block") {
          const [ax, ay] = pts[pts.length - 2];
          const [bx, by] = pts[pts.length - 1];
          const len = Math.hypot(bx - ax, by - ay) || 1;
          const nx = -(by - ay) / len;
          const ny = (bx - ax) / len;
          bar = { x1: bx - nx * 1.1, y1: by - ny * 1.1, x2: bx + nx * 1.1, y2: by + ny * 1.1 };
        }
        return (
          <g key={l.id}>
            <path
              d={d} fill="none" stroke={color} strokeWidth={3.1 * 0.09 * thicknessFactor(l.thickness) * (l.kind === "block" ? 0.9 : 1)} strokeLinejoin="round" strokeLinecap="round"
              strokeDasharray={lineDash(l)}
              markerStart={arrows === "both" ? `url(#${arrId(color)})` : undefined}
              markerEnd={showArrow ? `url(#${arrId(color)})` : undefined}
            />
            {bar && <line {...bar} stroke={color} strokeWidth={3.1 * 0.09 * thicknessFactor(l.thickness) * 0.9} strokeLinecap="round" />}
          </g>
        );
      })}

      {structure.slots.map((slot, i) => {
        const appearance = call.defAppearance?.[i] ?? {};
        if (appearance.hidden) return null;
        const [x, y] = defPos(i);
        const label = shortLabel(appearance.displayLabel ?? slotLabelOf(overrides, structureId, i));
        const symbol = appearance.symbol ?? "letters";
        return symbol === "letters" ? <text key={`d${i}`} x={x} y={y} dominantBaseline="middle" textAnchor="middle" fontSize="1.84" fontWeight="800" fill={appearance.color ?? DEF}>{label}</text> :
          <svg key={`d${i}`} x={x - 1.55} y={y - 1.55} width="3.1" height="3.1" viewBox="0 0 40 40"><PlayerGlyph appearance={appearance} label={label} symbol={symbol} defaultColor={DEF} /></svg>;
      })}

      {(call.texts ?? []).map((t) => (
        <text key={t.id} x={t.x} y={t.y} textAnchor="middle" fontSize="2" fontWeight="600" fill="#4b5563">{t.text}</text>
      ))}

      {call.offLook.map(o => <svg key={o.id} x={o.x - 1.55} y={o.y - 1.55} width="3.1" height="3.1" viewBox="0 0 40 40">
        <PlayerGlyph appearance={o} label={o.showLabel ? o.displayLabel ?? o.label : ""} symbol={offenseSymbol(o)} defaultColor={OFF} />
      </svg>)}
    </svg>
  );
}
