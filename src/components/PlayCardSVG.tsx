"use client";

// Pure-SVG, print-friendly rendering of a play card (light palette for paper).
import {
  getStructure,
  defenseCanvasY,
  smoothPath,
  FIELD_H,
  LOS_Y,
  YD,
  FIELD_PRESETS,
} from "@/lib/football";
import { slotLabelOf, type Call, type Overrides } from "@/lib/store";

const OFF = "#b91c1c";
const DEF = "#0e7490";
const INKC = "#1f2937";
const FAINT = "#d1d5db";

export default function PlayCardSVG({
  call,
  structureId,
  overrides,
  defStyle,
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
      return structure.slots[i] ? defPos(i) : null;
    }
    return [0, 0];
  };

  const yardLines: { y: number; label: string | null; goal: boolean }[] = [];
  for (let k = -14; k <= 14; k++) {
    const dist = preset.losYardline - k * 5;
    const y = LOS_Y - k * 5 * YD;
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
      <defs>
        {[OFF, DEF].map((c) => (
          <marker key={c} id={arrId(c)} viewBox="0 0 6 6" refX="4.6" refY="3" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M0,0 L6,3 L0,6 z" fill={c} />
          </marker>
        ))}
      </defs>

      {yardLines.map((yl) => (
        <g key={yl.y}>
          <line x1="0" x2="100" y1={yl.y} y2={yl.y} stroke={yl.goal ? "#9ca3af" : FAINT} strokeWidth={yl.goal ? 0.5 : 0.22} />
          {yl.label && (
            <>
              <text x="7" y={yl.y + 1.2} fontSize="3" fill="#9ca3af" textAnchor="middle">{yl.label}</text>
              <text x="93" y={yl.y + 1.2} fontSize="3" fill="#9ca3af" textAnchor="middle">{yl.label}</text>
            </>
          )}
        </g>
      ))}
      {[40, 60].map((x) =>
        Array.from({ length: Math.floor(FIELD_H / YD) }, (_, i) => i * YD + (LOS_Y % YD)).map((y) => (
          <line key={`${x}-${y}`} x1={x - 0.6} x2={x + 0.6} y1={y} y2={y} stroke={FAINT} strokeWidth="0.18" />
        )),
      )}
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
        const pts: [number, number][] = [a, ...l.points.map(([dx, dy]) => [a[0] + dx, a[1] + dy] as [number, number])];
        if (pts.length < 2) return null;
        const color = l.anchor.startsWith("def:") ? DEF : OFF;
        const d = l.smooth ? smoothPath(pts) : pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`).join(" ");
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
              d={d} fill="none" stroke={color} strokeWidth="0.42" strokeLinejoin="round" strokeLinecap="round"
              strokeDasharray={l.kind === "motion" ? "1.5 1.1" : l.kind === "pitch" ? "0.35 0.9" : undefined}
              markerEnd={l.kind === "block" ? undefined : `url(#${arrId(color)})`}
            />
            {bar && <line {...bar} stroke={color} strokeWidth="0.42" strokeLinecap="round" />}
          </g>
        );
      })}

      {structure.slots.map((slot, i) => {
        const [x, y] = defPos(i);
        const label = slotLabelOf(overrides, structureId, i);
        return defStyle === "triangles" ? (
          <g key={`d${i}`}>
            <polygon
              points={`${x},${y - 2.1} ${x + 2},${y + 1.7} ${x - 2},${y + 1.7}`}
              fill="#fff" stroke={DEF} strokeWidth="0.35"
            />
            <text x={x} y={y + 1.2} textAnchor="middle" fontSize="1.9" fontWeight="700" fill={DEF}>{label.slice(0, 2)}</text>
          </g>
        ) : (
          <g key={`d${i}`}>
            <circle cx={x} cy={y} r="2" fill="#fff" stroke={DEF} strokeWidth="0.35" />
            <text x={x} y={y + 0.8} textAnchor="middle" fontSize="1.9" fontWeight="700" fill={DEF}>{label}</text>
          </g>
        );
      })}

      {call.offLook.map((o) => {
        const isCenter = o.label.toUpperCase() === "C";
        return (
          <g key={o.id}>
            {isCenter ? (
              <rect x={o.x - 1.9} y={o.y - 1.9} width="3.8" height="3.8" fill="#fff" stroke={OFF} strokeWidth="0.35" />
            ) : (
              <circle cx={o.x} cy={o.y} r="2" fill="#fff" stroke={OFF} strokeWidth="0.35" />
            )}
            <text x={o.x} y={o.y + 0.8} textAnchor="middle" fontSize="1.9" fontWeight="700" fill={OFF}>{o.label}</text>
          </g>
        );
      })}
    </svg>
  );
}
