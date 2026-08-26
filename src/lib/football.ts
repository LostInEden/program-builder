// Defensive structure definitions. Coordinates are % of the depth-chart canvas
// (x: 0 left sideline → 100 right sideline; y: 0 = line of scrimmage → 100 = deep).
// These are seeds — structures are data, never hard-coded to one defense, and every
// label can be overridden by the coach's own terminology (see store overrides).

export type Level = "front" | "second" | "deep";

// Internal standardized concepts so the AI can reason about a position regardless
// of what the coach calls it. The coach never sees these unless they open Terminology.
export const CONCEPTS = [
  "Edge rusher",
  "Interior DL",
  "Off-ball LB",
  "Slot / Nickel",
  "Corner",
  "Strong safety",
  "Free safety",
  "Hybrid / Overhang",
] as const;
export type Concept = (typeof CONCEPTS)[number];

export type Slot = {
  pos: string; // default label — coach terminology overrides win
  x: number;
  y: number;
  level: Level;
  concept: Concept;
};

export type Structure = {
  id: string;
  name: string;
  slots: Slot[];
};

export const structures: Structure[] = [
  {
    id: "3-4",
    name: "3-4",
    slots: [
      { pos: "E", x: 39.5, y: 14, level: "front", concept: "Interior DL" },
      { pos: "N", x: 50, y: 14, level: "front", concept: "Interior DL" },
      { pos: "E", x: 60.5, y: 14, level: "front", concept: "Interior DL" },
      { pos: "J", x: 31, y: 17, level: "front", concept: "Edge rusher" },
      { pos: "R", x: 69, y: 17, level: "front", concept: "Edge rusher" },
      { pos: "W", x: 43, y: 40, level: "second", concept: "Off-ball LB" },
      { pos: "M", x: 57, y: 40, level: "second", concept: "Off-ball LB" },
      { pos: "C", x: 8, y: 30, level: "deep", concept: "Corner" },
      { pos: "C", x: 92, y: 30, level: "deep", concept: "Corner" },
      { pos: "SS", x: 35, y: 68, level: "deep", concept: "Strong safety" },
      { pos: "FS", x: 62, y: 76, level: "deep", concept: "Free safety" },
    ],
  },
  {
    id: "4-2-5",
    name: "4-2-5",
    slots: [
      { pos: "E", x: 35.5, y: 14, level: "front", concept: "Edge rusher" },
      { pos: "T", x: 42.5, y: 14, level: "front", concept: "Interior DL" },
      { pos: "N", x: 51.5, y: 14, level: "front", concept: "Interior DL" },
      { pos: "E", x: 64.5, y: 14, level: "front", concept: "Edge rusher" },
      { pos: "M", x: 42, y: 40, level: "second", concept: "Off-ball LB" },
      { pos: "W", x: 58, y: 40, level: "second", concept: "Off-ball LB" },
      { pos: "NB", x: 16, y: 38, level: "second", concept: "Slot / Nickel" },
      { pos: "C", x: 6, y: 30, level: "deep", concept: "Corner" },
      { pos: "C", x: 94, y: 30, level: "deep", concept: "Corner" },
      { pos: "SS", x: 36, y: 66, level: "deep", concept: "Strong safety" },
      { pos: "FS", x: 60, y: 76, level: "deep", concept: "Free safety" },
    ],
  },
  {
    id: "4-3",
    name: "4-3",
    slots: [
      { pos: "E", x: 35.5, y: 14, level: "front", concept: "Edge rusher" },
      { pos: "T", x: 42.5, y: 14, level: "front", concept: "Interior DL" },
      { pos: "N", x: 51.5, y: 14, level: "front", concept: "Interior DL" },
      { pos: "E", x: 64.5, y: 14, level: "front", concept: "Edge rusher" },
      { pos: "S", x: 34, y: 40, level: "second", concept: "Off-ball LB" },
      { pos: "M", x: 50, y: 40, level: "second", concept: "Off-ball LB" },
      { pos: "W", x: 66, y: 40, level: "second", concept: "Off-ball LB" },
      { pos: "C", x: 7, y: 30, level: "deep", concept: "Corner" },
      { pos: "C", x: 93, y: 30, level: "deep", concept: "Corner" },
      { pos: "SS", x: 38, y: 66, level: "deep", concept: "Strong safety" },
      { pos: "FS", x: 62, y: 76, level: "deep", concept: "Free safety" },
    ],
  },
  {
    id: "3-3-5",
    name: "3-3-5",
    slots: [
      { pos: "E", x: 39.5, y: 14, level: "front", concept: "Edge rusher" },
      { pos: "N", x: 50, y: 14, level: "front", concept: "Interior DL" },
      { pos: "E", x: 60.5, y: 14, level: "front", concept: "Edge rusher" },
      { pos: "W", x: 36, y: 40, level: "second", concept: "Off-ball LB" },
      { pos: "M", x: 50, y: 40, level: "second", concept: "Off-ball LB" },
      { pos: "S", x: 64, y: 40, level: "second", concept: "Off-ball LB" },
      { pos: "C", x: 7, y: 30, level: "deep", concept: "Corner" },
      { pos: "C", x: 93, y: 30, level: "deep", concept: "Corner" },
      { pos: "NB", x: 18, y: 44, level: "second", concept: "Slot / Nickel" },
      { pos: "SS", x: 40, y: 66, level: "deep", concept: "Strong safety" },
      { pos: "FS", x: 62, y: 76, level: "deep", concept: "Free safety" },
    ],
  },
  {
    id: "3-2-6",
    name: "3-2-6",
    slots: [
      { pos: "E", x: 39.5, y: 14, level: "front", concept: "Edge rusher" },
      { pos: "N", x: 50, y: 14, level: "front", concept: "Interior DL" },
      { pos: "E", x: 60.5, y: 14, level: "front", concept: "Edge rusher" },
      { pos: "M", x: 42, y: 40, level: "second", concept: "Off-ball LB" },
      { pos: "W", x: 58, y: 40, level: "second", concept: "Off-ball LB" },
      { pos: "C", x: 6, y: 30, level: "deep", concept: "Corner" },
      { pos: "C", x: 94, y: 30, level: "deep", concept: "Corner" },
      { pos: "NB", x: 18, y: 42, level: "second", concept: "Slot / Nickel" },
      { pos: "DS", x: 82, y: 42, level: "second", concept: "Slot / Nickel" },
      { pos: "SS", x: 38, y: 66, level: "deep", concept: "Strong safety" },
      { pos: "FS", x: 62, y: 76, level: "deep", concept: "Free safety" },
    ],
  },
  {
    id: "tite",
    name: "Tite / Mint",
    slots: [
      { pos: "E", x: 39.5, y: 14, level: "front", concept: "Interior DL" },
      { pos: "N", x: 50, y: 14, level: "front", concept: "Interior DL" },
      { pos: "E", x: 60.5, y: 14, level: "front", concept: "Interior DL" },
      { pos: "J", x: 30, y: 17, level: "front", concept: "Edge rusher" },
      { pos: "B", x: 70, y: 17, level: "front", concept: "Edge rusher" },
      { pos: "M", x: 44, y: 40, level: "second", concept: "Off-ball LB" },
      { pos: "W", x: 56, y: 40, level: "second", concept: "Off-ball LB" },
      { pos: "C", x: 7, y: 30, level: "deep", concept: "Corner" },
      { pos: "C", x: 93, y: 30, level: "deep", concept: "Corner" },
      { pos: "S", x: 38, y: 66, level: "deep", concept: "Strong safety" },
      { pos: "S", x: 62, y: 66, level: "deep", concept: "Free safety" },
    ],
  },
];

export function getStructure(id: string): Structure {
  return structures.find((s) => s.id === id) ?? structures[0];
}

// ── Playbook canvas geometry ─────────────────────────────────────────────────
// Canvas space: x 0–100 across the field, y 0–75 down the page (matches a 4:3
// canvas with uniform scaling).

export const FIELD_H = 75;
export const LOS_Y = 42;

// The diagram is drawn from OUR team's perspective: DEFENSE at the bottom of
// the card, opponent offense on top, LOS between them.
// Defense structure slots (y 14 front → 76 deep) map below the LOS:
export const defenseCanvasY = (slotY: number) => 38 + slotY * 0.45; // front ≈44.5, deep ≈72

// ── Offensive looks for the Playbook canvas ──────────────────────────────────
// Per-call and fully editable: presets seed a look, then the coach drags,
// renames, adds, or removes players. Coordinates are canvas space (offense
// ABOVE the LOS, smaller y = deeper in the backfield).

export type OffMarker = {
  id: string;
  label: string;
  x: number;
  y: number;
  jersey?: string;
  ptype?: string; // position type e.g. "Running Back"
  showLabel?: boolean; // default true
};

const om = (label: string, x: number, y: number, i: number): OffMarker => ({
  id: `${label}-${i}`,
  label,
  x,
  y,
});

const line = (): OffMarker[] => [
  om("LT", 38, 39, 1),
  om("LG", 44, 39, 2),
  om("C", 50, 39, 3),
  om("RG", 56, 39, 4),
  om("RT", 62, 39, 5),
];

export const offensivePresets: Record<string, OffMarker[]> = {
  "Gun Spread (2x2)": [
    ...line(),
    om("X", 8, 39.5, 6),
    om("H", 20, 37, 7),
    om("Y", 80, 37, 8),
    om("Z", 93, 39.5, 9),
    om("Q", 50, 31, 10),
    om("T", 44, 29, 11),
  ],
  "Trips Right (3x1)": [
    ...line(),
    om("X", 6, 39.5, 6),
    om("H", 72, 37, 7),
    om("Y", 80, 38.5, 8),
    om("Z", 92, 39.5, 9),
    om("Q", 50, 31, 10),
    om("T", 56, 29, 11),
  ],
  "I-Form (21)": [
    ...line(),
    om("X", 10, 39.5, 6),
    om("Y", 68, 39, 7),
    om("Z", 90, 39.5, 8),
    om("Q", 50, 37.5, 9),
    om("F", 50, 31, 10),
    om("T", 50, 26.5, 11),
  ],
  "Empty (3x2)": [
    ...line(),
    om("X", 6, 39.5, 6),
    om("H", 16, 37, 7),
    om("W", 72, 37, 8),
    om("Y", 82, 37, 9),
    om("Z", 93, 39.5, 10),
    om("Q", 50, 31, 11),
  ],
};

export const defaultPresetName = "Gun Spread (2x2)";

// Additional built-in formations (coach request: more loadable formations).
offensivePresets["Bunch Right (3x1)"] = [
  ...line(),
  om("X", 6, 39.5, 6),
  om("H", 70, 37.5, 7),
  om("Y", 74, 39, 8),
  om("Z", 78, 37, 9),
  om("Q", 50, 31, 10),
  om("T", 44, 29, 11),
];
offensivePresets["Doubles TE (11)"] = [
  ...line(),
  om("Y", 67, 39, 6), // on-ball TE
  om("X", 8, 39.5, 7),
  om("H", 20, 37, 8),
  om("Z", 92, 39.5, 9),
  om("Q", 50, 31, 10),
  om("T", 56, 29, 11),
];
offensivePresets["Power I (22)"] = [
  ...line(),
  om("Y", 67, 39, 6),
  om("X", 12, 39.5, 7),
  om("Z", 88, 39.5, 8),
  om("Q", 50, 37.5, 9),
  om("F", 50, 31, 10),
  om("T", 50, 26.5, 11),
];
offensivePresets["Empty Left (3x2)"] = [
  ...line(),
  om("X", 7, 39.5, 6),
  om("H", 18, 37, 7),
  om("W", 27, 37.5, 8),
  om("Y", 80, 37, 9),
  om("Z", 93, 39.5, 10),
  om("Q", 50, 31, 11),
];

// ── Play drawing model ───────────────────────────────────────────────────────
// Lines anchor to a player ("off:<markerId>" or "def:<slotIndex>") with points
// stored RELATIVE to the anchor, so moving the player moves the whole drawing.
// "free" anchors store absolute canvas coordinates.

export type LineKind = "route" | "block" | "motion" | "pitch";

// Field-position presets (Hudl-style): the card shows a slice of field around
// the LOS; the preset picks which slice, driving yard numbers and end zones.
export type FieldPreset = "midfield" | "redzone" | "goalline" | "backedup";
export const FIELD_PRESETS: { id: FieldPreset; label: string; losYardline: number }[] = [
  { id: "midfield", label: "Midfield", losYardline: 50 },
  { id: "redzone", label: "Red Zone", losYardline: 15 },
  { id: "goalline", label: "Goal Line", losYardline: 3 },
  { id: "backedup", label: "Backed Up", losYardline: 95 }, // own 5
];
export const YD = 2.2; // canvas units per yard

export type LineStyle = "solid" | "dashed" | "dotted";

export type DrawLine = {
  id: string;
  anchor: string; // "off:<markerId>" | "def:<slotIndex>" | "free"
  points: [number, number][];
  kind: LineKind;
  smooth?: boolean; // render as a curved (Catmull-Rom) path
  color?: string; // overrides side default
  style?: LineStyle; // overrides kind default
  showArrow?: boolean; // default: kind !== "block"
};

export type TextNote = { id: string; x: number; y: number; text: string };

// First entry is the default "ink" color — light on the dark field; the print
// renderer maps it back to dark for paper.
export const ROUTE_COLORS = ["#e9efe9", "#eab308", "#ef4444", "#38bdf8", "#22c55e"];

export function lineDash(l: { kind: LineKind; style?: LineStyle }): string | undefined {
  const style = l.style ?? (l.kind === "motion" ? "dashed" : l.kind === "pitch" ? "dotted" : "solid");
  return style === "dashed" ? "1.5 1.1" : style === "dotted" ? "0.35 0.9" : undefined;
}

// Catmull-Rom spline → SVG cubic path, for smooth curved routes.
export function smoothPath(pts: [number, number][]): string {
  if (pts.length < 3) return pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`).join(" ");
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${c1x},${c1y} ${c2x},${c2y} ${p2[0]},${p2[1]}`;
  }
  return d;
}

export type Zone = {
  id: string;
  x: number;
  y: number;
  rx: number;
  ry: number;
  side: "off" | "def";
};
