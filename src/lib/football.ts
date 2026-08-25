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
      { pos: "WE", x: 32, y: 14, level: "front", concept: "Edge rusher" },
      { pos: "T", x: 44, y: 14, level: "front", concept: "Interior DL" },
      { pos: "N", x: 56, y: 14, level: "front", concept: "Interior DL" },
      { pos: "SE", x: 68, y: 14, level: "front", concept: "Edge rusher" },
      { pos: "W", x: 34, y: 40, level: "second", concept: "Off-ball LB" },
      { pos: "M", x: 50, y: 40, level: "second", concept: "Off-ball LB" },
      { pos: "S", x: 66, y: 40, level: "second", concept: "Off-ball LB" },
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
      { pos: "DE", x: 28, y: 14, level: "front", concept: "Edge rusher" },
      { pos: "DT", x: 42, y: 14, level: "front", concept: "Interior DL" },
      { pos: "DT", x: 58, y: 14, level: "front", concept: "Interior DL" },
      { pos: "DE", x: 72, y: 14, level: "front", concept: "Edge rusher" },
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
      { pos: "DE", x: 28, y: 14, level: "front", concept: "Edge rusher" },
      { pos: "DT", x: 42, y: 14, level: "front", concept: "Interior DL" },
      { pos: "DT", x: 58, y: 14, level: "front", concept: "Interior DL" },
      { pos: "DE", x: 72, y: 14, level: "front", concept: "Edge rusher" },
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
      { pos: "DE", x: 34, y: 14, level: "front", concept: "Edge rusher" },
      { pos: "N", x: 50, y: 14, level: "front", concept: "Interior DL" },
      { pos: "DE", x: 66, y: 14, level: "front", concept: "Edge rusher" },
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
      { pos: "DE", x: 34, y: 14, level: "front", concept: "Edge rusher" },
      { pos: "N", x: 50, y: 14, level: "front", concept: "Interior DL" },
      { pos: "DE", x: 66, y: 14, level: "front", concept: "Edge rusher" },
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
];

export function getStructure(id: string): Structure {
  return structures.find((s) => s.id === id) ?? structures[0];
}

// ── Offensive looks for the Playbook canvas ──────────────────────────────────
// Per-call and fully editable: presets seed a look, then the coach drags,
// renames, adds, or removes players.

export type OffMarker = { id: string; label: string; x: number; y: number };

const om = (label: string, x: number, y: number, i: number): OffMarker => ({
  id: `${label}-${i}`,
  label,
  x,
  y,
});

const line = (y: number): OffMarker[] => [
  om("LT", 38, y, 1),
  om("LG", 44, y, 2),
  om("C", 50, y, 3),
  om("RG", 56, y, 4),
  om("RT", 62, y, 5),
];

export const offensivePresets: Record<string, OffMarker[]> = {
  "Gun Spread (2x2)": [
    ...line(82),
    om("X", 8, 78, 6),
    om("H", 20, 74, 7),
    om("Y", 80, 74, 8),
    om("Z", 93, 78, 9),
    om("Q", 50, 64, 10),
    om("T", 44, 62, 11),
  ],
  "Trips Right (3x1)": [
    ...line(82),
    om("X", 6, 78, 6),
    om("H", 72, 74, 7),
    om("Y", 80, 76, 8),
    om("Z", 92, 78, 9),
    om("Q", 50, 64, 10),
    om("T", 56, 62, 11),
  ],
  "I-Form (21)": [
    ...line(82),
    om("X", 10, 78, 6),
    om("Y", 68, 80, 7),
    om("Z", 90, 78, 8),
    om("Q", 50, 76, 9),
    om("F", 50, 66, 10),
    om("T", 50, 58, 11),
  ],
  "Empty (3x2)": [
    ...line(82),
    om("X", 6, 78, 6),
    om("H", 16, 74, 7),
    om("W", 72, 74, 8),
    om("Y", 82, 74, 9),
    om("Z", 93, 78, 10),
    om("Q", 50, 64, 11),
  ],
};

export const defaultPresetName = "Gun Spread (2x2)";
