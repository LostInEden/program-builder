import type { OffMarker, PlayerAppearance, DrawLine } from "@/lib/football";

export const ART_COLORS = [
  { name: "Black", value: "#000000" }, { name: "White", value: "#FFFFFF" },
  { name: "Gray", value: "#9DA3A6" }, { name: "Red", value: "#EF4444" },
  { name: "Blue", value: "#3B82F6" }, { name: "Green", value: "#22C55E" },
  { name: "Yellow", value: "#FACC15" }, { name: "Purple", value: "#A855F7" },
];
export const thicknessFactor = (v?: DrawLine["thickness"]) => v === "thin" ? 0.7 : v === "thick" ? 1.6 : 1;
export const arrowStyleOf = (l: DrawLine) => l.arrowStyle ?? ((l.showArrow ?? l.kind !== "block") ? "end" : "none");
export const offenseSymbol = (o: OffMarker): NonNullable<PlayerAppearance["symbol"]> => o.symbol ??
  (o.ptype === "Tight End" || (!o.ptype && o.label.toUpperCase() === "TE") ? "triangle" :
    o.label.toUpperCase() === "C" && (!o.ptype || o.ptype === "Offensive Line") ? "square" : "circle");
export const shortLabel = (label: string) => Array.from(label).slice(0, 2).join("");
export function contrastText(color: string) {
  const hex = color.replace("#", "");
  const rgb = [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722 > 0.179 ? "#121212" : "#FFFFFF";
}

// Shared SVG glyph for the live board and print, with identical saved styling.
export function PlayerGlyph({ appearance, label, symbol, defaultColor = "#E8EAEB" }: {
  appearance: PlayerAppearance; label: string; symbol: NonNullable<PlayerAppearance["symbol"]>; defaultColor?: string;
}) {
  const color = appearance.color ?? defaultColor;
  const fill = appearance.fill ?? "outline";
  const textColor = symbol === "letters" ? color : fill === "filled" ? contrastText(color) : defaultColor;
  const shapeProps = { fill: fill === "outline" ? "none" : color, fillOpacity: fill === "shaded" ? 0.25 : 1, stroke: color, strokeWidth: 2 };
  return <>
    {symbol === "circle" && <circle cx="20" cy="20" r="17" {...shapeProps} />}
    {symbol === "square" && <rect x="3" y="3" width="34" height="34" {...shapeProps} />}
    {symbol === "triangle" && <path d="M20 3 L37 36 H3 Z" {...shapeProps} />}
    {label && <text x="20" y={symbol === "triangle" ? 25 : 21} dominantBaseline="middle" textAnchor="middle" fontSize={symbol === "letters" ? 24 : 14} fontWeight="800" fill={textColor}>{shortLabel(label)}</text>}
  </>;
}

export function ColorChoices({ value, onChange, label = "Color" }: { value?: string; onChange: (value: string | undefined) => void; label?: string }) {
  return <div role="group" aria-label={label} className="flex flex-wrap gap-1">
    <button type="button" aria-label={`${label}: Default`} aria-pressed={!value} onClick={() => onChange(undefined)} className={`h-6 rounded border px-1 text-[10px] ${!value ? "border-gold" : "border-line"}`}>Auto</button>
    {ART_COLORS.map(c => <button key={c.value} type="button" aria-label={`${label}: ${c.name}`} title={c.name} aria-pressed={value === c.value} onClick={() => onChange(c.value)} className={`size-6 rounded-full border ${value === c.value ? "ring-2 ring-gold border-white" : "border-[#9DA3A6]"}`} style={{ background: c.value }} />)}
  </div>;
}
