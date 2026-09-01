"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useEffect, useState } from "react";
import {
  getStructure,
  offensivePresets,
  defaultPresetName,
  defenseCanvasY,
  type OffMarker,
  type Concept,
  type DrawLine,
  type Zone,
  type Structure,
} from "@/lib/football";
import type { StrengthRule } from "@/lib/recognize";

export type Evaluation = {
  skill?: string;
  iq?: string;
  strengths?: string;
  limitations?: string;
  notes?: string;
};

export type Player = {
  id: string;
  jersey: number | null;
  name: string;
  cls: string; // FR / SO / JR / SR — free text allowed
  positions: string[]; // supports multi-position e.g. ["CB","WR"]
  status: "Healthy" | "Limited" | "Out";
  heightIn?: number | null;
  weightLb?: number | null;
  squat?: number | null;
  bench?: number | null;
  clean?: number | null;
  vertical?: number | null;
  broad?: number | null;
  forty?: number | null;
  flying10?: number | null;
  shuttle?: number | null;
  rating?: number | null; // coach's overall grade, 0–5 in half steps
  eval: Evaluation;
};

// Recent-updates feed shown in the top bar and My Team overview.
export type ActivityItem = { id: string; text: string; sub?: string; ts: number };

// "TE + 2 strong → we bump to Over" — the structured rule format the coach's
// spec calls the Key V1 Requirement: don't just save the conversation.
export type SchemeRule = { id: string; trigger: string; action: string; result: string };

export type ScoutFormation = { id: string; name: string; snapsPct?: number | null; runPct?: number | null; notes?: string };
export type ScoutConcept = { id: string; name: string; type: "Run" | "Pass"; freq?: number | null; notes?: string };
export type ScoutKeyPlayer = { id: string; jersey?: string; name: string; pos?: string; notes?: string };
export type Opponent = {
  id: string;
  name: string;
  week?: number | null; // ties to seasonSchedule
  personnel: string; // e.g. "Mostly 11 and 12 personnel"
  formations: ScoutFormation[];
  concepts: ScoutConcept[];
  downDistance: string; // situational tendencies free text
  redZone: string;
  keyPlayers: ScoutKeyPlayer[];
  notes: string;
};

export type PlanItem = { id: string; text: string };
export type GamePlan = {
  opponentId: string;
  bestAnswers: PlanItem[];
  adjustments: PlanItem[];
  emphasis: PlanItem[];
};

// slots: structure slot index -> ordered player ids (index 0 = starter)
export type PersonnelGroup = {
  id: string;
  name: string; // coach terminology preserved
  structureId: string;
  slots: Record<number, string[]>;
};

// Coach terminology overrides per structure slot: what the coach calls the
// position, and (optionally) which standardized concept it maps to internally.
export type SlotOverride = { label?: string; concept?: Concept };
export type Overrides = Record<string, Record<number, SlotOverride>>;

export type PlaybookSection = "Fronts" | "Coverages" | "Pressures" | "Checks & Adjustments";

export type Call = {
  id: string;
  section: PlaybookSection;
  name: string;
  offForm: string;
  offConcept: string;
  offLook: OffMarker[]; // editable offensive look for this call
  fieldPreset?: "midfield" | "redzone" | "goalline" | "backedup";
  lines: DrawLine[]; // drawn routes / blocks / motions (both sides)
  zones: Zone[]; // coverage / responsibility areas
  texts?: { id: string; x: number; y: number; text: string }[]; // canvas annotations
  defOffsets: Record<number, [number, number]>; // per-call defensive alignment nudges
  assignments: Record<number, string>; // slot index -> responsibility text
  notes: string;
};

const uid = () => Math.random().toString(36).slice(2, 9);

// Seed ids are deterministic (pl-<jersey>) so links survive reloads before any
// state is persisted.
const p = (
  jersey: number,
  name: string,
  cls: string,
  positions: string[],
  extra: Partial<Player> = {},
): Player => ({
  id: `pl-${jersey}`,
  jersey,
  name,
  cls,
  positions,
  status: "Healthy",
  eval: {},
  ...extra,
});

const seedPlayers: Player[] = [
  p(9, "D. Ville", "SR", ["CB"], { heightIn: 70, weightLb: 172, forty: 4.55, vertical: 34 }),
  p(90, "J. Lewis", "SR", ["DE"], { heightIn: 75, weightLb: 235, forty: 4.71, bench: 285, squat: 425 }),
  p(99, "A. Henry", "JR", ["DT"], { heightIn: 74, weightLb: 268, bench: 315, squat: 465 }),
  p(70, "A. Mack", "SR", ["NT"], { heightIn: 73, weightLb: 285, bench: 335, squat: 500 }),
  p(1, "T. Allen", "JR", ["DE", "TE"], { heightIn: 74, weightLb: 228, forty: 4.83 }),
  p(20, "P. Price", "SO", ["CB", "WR"], { heightIn: 69, weightLb: 165, forty: 4.6 }),
  p(10, "C. Locke", "JR", ["LB"], { heightIn: 72, weightLb: 212, forty: 4.8, squat: 405 }),
  p(7, "T. Mathine", "SR", ["LB", "RB"], { heightIn: 71, weightLb: 205, forty: 4.58, vertical: 36, squat: 455 }),
  p(5, "H. Amason", "JR", ["LB"], { heightIn: 72, weightLb: 209, forty: 4.85 }),
  p(3, "C. Beck", "SR", ["SS", "WR"], { heightIn: 72, weightLb: 185, forty: 4.62, vertical: 35 }),
  p(11, "E. Reed", "JR", ["FS"], { heightIn: 71, weightLb: 180, forty: 4.66 }),
  p(24, "M. Turner", "SO", ["CB"], { forty: 4.68 }),
  p(44, "R. Ogles", "SO", ["LB"], { weightLb: 198 }),
  p(55, "D. King", "JR", ["DT"], { weightLb: 262, bench: 300 }),
  p(2, "D. Smith", "SO", ["CB", "WR"], { forty: 4.6 }),
  p(14, "L. White", "JR", ["FS", "QB"], { forty: 4.66 }),
  p(33, "K. Byrd", "FR", ["SS"], {}),
  p(66, "S. Pruitt", "JR", ["NT", "OG"], { weightLb: 275 }),
];

// 3-4 slot order in football.ts: E,N,E,J,R,W,M,C,C,SS,FS
const baseSlots: Record<number, string[]> = {
  0: ["pl-99", "pl-55"], // E A. Henry, D. King
  1: ["pl-70", "pl-66"], // N A. Mack, S. Pruitt
  2: ["pl-1"], // E T. Allen
  3: ["pl-90"], // J J. Lewis
  4: ["pl-44"], // R R. Ogles
  5: ["pl-10", "pl-5"], // W C. Locke, H. Amason
  6: ["pl-7"], // M T. Mathine
  7: ["pl-9", "pl-24"], // C D. Ville, M. Turner
  8: ["pl-20", "pl-2"], // C P. Price, D. Smith
  9: ["pl-3", "pl-33"], // SS C. Beck, K. Byrd
  10: ["pl-11", "pl-14"], // FS E. Reed, L. White
};

export type ScheduleWeek = {
  week: number;
  date: string; // YYYY-MM-DD (bye weeks keep a date for calendar placement)
  opponent: string | null; // null = bye
  homeAway: "home" | "away";
  result?: string;
};

// Default: 10 games + a bye across an 11-week regular season.
const seedSchedule: ScheduleWeek[] = [
  { week: 1, date: "2026-08-21", opponent: "Franklin East", homeAway: "away", result: "W 27\u201314" },
  { week: 2, date: "2026-08-28", opponent: "Central", homeAway: "home", result: "W 21\u201317" },
  { week: 3, date: "2026-09-04", opponent: "Miller Creek", homeAway: "away", result: "L 13\u201320" },
  { week: 4, date: "2026-09-11", opponent: "Westview", homeAway: "home", result: "W 35\u20137" },
  { week: 5, date: "2026-09-19", opponent: "Red Valley", homeAway: "home" },
  { week: 6, date: "2026-09-26", opponent: null, homeAway: "home" },
  { week: 7, date: "2026-10-02", opponent: "North Ridge", homeAway: "away" },
  { week: 8, date: "2026-10-09", opponent: "Bellwood", homeAway: "home" },
  { week: 9, date: "2026-10-16", opponent: "South Gate", homeAway: "away" },
  { week: 10, date: "2026-10-23", opponent: "Pine Hill", homeAway: "home" },
  { week: 11, date: "2026-10-30", opponent: "East Ridge", homeAway: "away" },
];

const seedGroups: PersonnelGroup[] = [
  { id: "base", name: "Base", structureId: "3-4", slots: baseSlots },
  { id: "nickel", name: "Nickel", structureId: "4-2-5", slots: {} },
  { id: "dime", name: "Dime", structureId: "3-2-6", slots: {} },
  { id: "heavy", name: "Heavy", structureId: "4-3", slots: {} },
  { id: "goalline", name: "Goal Line", structureId: "4-3", slots: {} },
];

const look = (preset: string) => offensivePresets[preset].map((m) => ({ ...m }));
const L = (id: string, anchor: string, kind: DrawLine["kind"], points: [number, number][]): DrawLine => ({
  id,
  anchor,
  kind,
  points,
});

const seedCalls: Call[] = [
  {
    id: "call-front-okie",
    section: "Fronts",
    name: "Okie",
    offForm: "Trips Right",
    offConcept: "Inside zone",
    offLook: look("Trips Right (3x1)"),
    // 3-4 slot order: 0 E, 1 N, 2 E, 3 J, 4 R — squeeze/penetrate arrows.
    lines: [
      L("l-okie-1", "def:0", "route", [[1, -3]]),
      L("l-okie-2", "def:1", "route", [[0, -3]]),
      L("l-okie-3", "def:2", "route", [[-1, -3]]),
      L("l-okie-4", "def:3", "route", [[1.5, -2.5]]),
      L("l-okie-5", "def:4", "route", [[-1.5, -2.5]]),
    ],
    zones: [],
    defOffsets: {},
    assignments: { 0: "4i, B gap, squeeze down blocks", 1: "0-tech, 2-gap A gaps", 2: "4i, B gap penetrate", 3: "Edge, C gap force", 4: "Edge, C gap, force on flow" },
    notes: "Base front vs 11/12 personnel.",
  },
  {
    id: "call-cov-sky3",
    section: "Coverages",
    name: "Sky 3",
    offForm: "Doubles",
    offConcept: "Quick game",
    offLook: look("Gun Spread (2x2)"),
    lines: [
      L("l-sky-ss", "def:9", "motion", [[-12, -18]]), // SS rotates up to the flat
      L("l-sky-fs", "def:10", "motion", [[-6, 3]]),
    ],
    zones: [
      { id: "z-sky-1", x: 15, y: 66, rx: 13, ry: 6, side: "def" },
      { id: "z-sky-2", x: 50, y: 68, rx: 13, ry: 6, side: "def" },
      { id: "z-sky-3", x: 85, y: 66, rx: 13, ry: 6, side: "def" },
    ],
    defOffsets: {},
    assignments: { 7: "Deep 1/3, outside leverage", 8: "Deep 1/3", 9: "Flat / force, sky support", 10: "Middle 1/3" },
    notes: "Strong safety rotates down. Beats quick game and RPO.",
  },
  {
    id: "call-prs-smokew",
    section: "Pressures",
    name: "Smoke W",
    offForm: "Gun Spread",
    offConcept: "Dropback",
    offLook: look("Gun Spread (2x2)"),
    lines: [
      L("l-smk-w", "def:5", "route", [[8, -4], [11, -8]]), // W shoots the A gap
      L("l-smk-m", "def:6", "route", [[-2, -5]]),
      L("l-smk-s", "def:4", "motion", [[6, 6]]), // R walls #2
    ],
    zones: [],
    defOffsets: {},
    assignments: { 5: "A-gap blitz, contain rules off", 6: "Green dog vs back block", 4: "Wall #2, seam carry" },
    notes: "Fire zone behind it — 3 under, 3 deep.",
  },
  {
    id: "call-chk-cloud",
    section: "Checks & Adjustments",
    name: "Cloud Check",
    offForm: "Any 2x2 to boundary",
    offConcept: "—",
    offLook: look("Empty (3x2)"),
    lines: [],
    zones: [],
    defOffsets: {},
    assignments: { 7: "Cloud: squat flat, corner force", 9: "Push to deep half over #2" },
    notes: "Auto-check vs condensed boundary sets.",
  },
];

// Preset plays a coach can load into the playbook (built against whatever
// structure the active package uses).
export const PRESET_PLAYS: {
  id: string;
  name: string;
  section: PlaybookSection;
  build: (st: Structure) => Pick<Call, "zones" | "lines" | "assignments" | "notes">;
}[] = [
  {
    id: "pp-cover2",
    name: "Cover 2",
    section: "Coverages",
    build: () => ({
      zones: [
        { id: uid(), x: 28, y: 64, rx: 20, ry: 7, side: "def" },
        { id: uid(), x: 72, y: 64, rx: 20, ry: 7, side: "def" },
        { id: uid(), x: 10, y: 50, rx: 8, ry: 4.5, side: "def" },
        { id: uid(), x: 90, y: 50, rx: 8, ry: 4.5, side: "def" },
      ],
      lines: [],
      assignments: {},
      notes: "Two deep halves, corners squat in the flats. Vulnerable in the deep middle hole.",
    }),
  },
  {
    id: "pp-cover4",
    name: "Cover 4 Quarters",
    section: "Coverages",
    build: () => ({
      zones: [
        { id: uid(), x: 14, y: 65, rx: 11, ry: 6, side: "def" },
        { id: uid(), x: 38, y: 65, rx: 11, ry: 6, side: "def" },
        { id: uid(), x: 62, y: 65, rx: 11, ry: 6, side: "def" },
        { id: uid(), x: 86, y: 65, rx: 11, ry: 6, side: "def" },
      ],
      lines: [],
      assignments: {},
      notes: "Four deep quarters \u2014 safeties read #2. Strong vs 4 verts and play action.",
    }),
  },
  {
    id: "pp-cover1",
    name: "Cover 1 Robber",
    section: "Coverages",
    build: () => ({
      zones: [
        { id: uid(), x: 50, y: 68, rx: 15, ry: 6, side: "def" },
        { id: uid(), x: 50, y: 52, rx: 8, ry: 4, side: "def" },
      ],
      lines: [],
      assignments: {},
      notes: "Man across, single high, robber sits on crossers at 10\u201312 yards.",
    }),
  },
  {
    id: "pp-doublea",
    name: "Double A Gap",
    section: "Pressures",
    build: (st) => {
      const lbs = st.slots.map((sl, i) => ({ sl, i })).filter((x) => x.sl.concept === "Off-ball LB").slice(0, 2);
      return {
        zones: [],
        lines: lbs.map(({ sl, i }, k) => ({
          id: uid(),
          anchor: `def:${i}`,
          kind: "route" as const,
          points: [[(k === 0 ? 48 : 52) - sl.x, 40.5 - defenseCanvasY(sl.y)] as [number, number]],
        })),
        assignments: Object.fromEntries(lbs.map(({ i }) => [i, "A-gap blitz \u2014 hug the center hip"])),
        notes: "Both backers show and shoot the A gaps. Check protection answers.",
      };
    },
  },
  {
    id: "pp-edgefire",
    name: "Edge Fire",
    section: "Pressures",
    build: (st) => {
      const edges = st.slots.map((sl, i) => ({ sl, i })).filter((x) => x.sl.concept === "Edge rusher").slice(0, 2);
      return {
        zones: [],
        lines: edges.map(({ sl, i }) => ({
          id: uid(),
          anchor: `def:${i}`,
          kind: "route" as const,
          points: [[sl.x < 50 ? 4 : -4, -5] as [number, number]],
        })),
        assignments: Object.fromEntries(edges.map(({ i }) => [i, "Speed rush \u2014 contain, close the pocket"])),
        notes: "Edges fire off both sides. Coverage plays 3 under, 3 deep behind it.",
      };
    },
  },
  {
    id: "pp-motioncheck",
    name: "Motion Bump",
    section: "Checks & Adjustments",
    build: () => ({
      zones: [],
      lines: [],
      assignments: {},
      notes: "Vs across-the-formation motion: bump the second level, corners stay \u2014 no rotation.",
    }),
  },
];

type Store = {
  players: Player[];
  groups: PersonnelGroup[];
  activeGroupId: string;
  scheme: { structureName: string; philosophy: string };
  overrides: Overrides;
  strengthRule: StrengthRule;
  formationTerms: Record<string, string>; // internal name -> coach's label
  formationTemplates: Record<string, OffMarker[]>; // saved offensive looks by name
  defStyle: "letters" | "triangles";
  calls: Call[];
  activeCallId: string | null;
  opponent: { name: string; kickoff: string };
  seasonSchedule: ScheduleWeek[];
  watchList: string[]; // player ids
  activity: ActivityItem[];
  schemeRules: SchemeRule[];
  opponents: Opponent[];
  gamePlans: GamePlan[];

  toggleWatch: (playerId: string) => void;
  logActivity: (text: string, sub?: string) => void;
  addSchemeRule: () => void;
  updateSchemeRule: (id: string, patch: Partial<SchemeRule>) => void;
  removeSchemeRule: (id: string) => void;
  addOpponent: (name?: string) => string;
  updateOpponent: (id: string, patch: Partial<Opponent>) => void;
  removeOpponent: (id: string) => void;
  updateGamePlan: (opponentId: string, patch: Partial<GamePlan>) => void;

  addPlayer: (pl?: Partial<Player>) => string;
  updatePlayer: (id: string, patch: Partial<Player>) => void;
  removePlayer: (id: string) => void;
  importPlayers: (rows: Partial<Player>[]) => number;
  applyWeightRoom: (rows: (Partial<Player> & { name?: string })[]) => number;

  setActiveGroup: (id: string) => void;
  setGroupStructure: (groupId: string, structureId: string) => void;
  setSlotPlayers: (groupId: string, slotIndex: number, playerIds: string[]) => void;
  addGroup: (name: string) => void;

  setScheme: (patch: Partial<{ structureName: string; philosophy: string }>) => void;
  setSlotOverride: (structureId: string, slotIndex: number, patch: SlotOverride) => void;
  setStrengthRule: (rule: StrengthRule) => void;
  setFormationTerm: (internal: string, label: string) => void;
  saveFormationTemplate: (name: string, look: OffMarker[]) => void;
  setDefStyle: (s: "letters" | "triangles") => void;

  addCall: (section: PlaybookSection) => string;
  updateCall: (id: string, patch: Partial<Call>) => void;
  duplicateCall: (id: string) => void;
  deleteCall: (id: string) => void;
  setActiveCall: (id: string | null) => void;

  setOpponent: (patch: Partial<{ name: string; kickoff: string }>) => void;
  updateScheduleWeek: (week: number, patch: Partial<ScheduleWeek>) => void;
  addPresetCall: (presetId: string) => void;
};

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      players: seedPlayers,
      groups: seedGroups,
      activeGroupId: "base",
      scheme: {
        structureName: "3-4",
        philosophy:
          "Stop the run first. Eliminate explosive plays, create negative plays, disguise intentions, and force the offense to execute long drives without help.",
      },
      overrides: {},
      strengthRule: "Receiver strength",
      formationTerms: {},
      formationTemplates: {},
      defStyle: "letters",
      calls: seedCalls,
      activeCallId: seedCalls[0].id,
      opponent: { name: "Red Valley", kickoff: "Saturday, 7:00 PM" },
      seasonSchedule: seedSchedule,
      watchList: [],
      activity: [],
      schemeRules: [
        { id: "sr-seed", trigger: "TE + 2 strong", action: "Change front", result: "Over" },
      ],
      opponents: [],
      gamePlans: [],

      logActivity: (text, sub) =>
        set((s) => ({
          activity: [{ id: uid(), text, sub, ts: Date.now() }, ...s.activity].slice(0, 25),
        })),
      toggleWatch: (playerId) =>
        set((s) => {
          const on = s.watchList.includes(playerId);
          const pl = s.players.find((p) => p.id === playerId);
          return {
            watchList: on ? s.watchList.filter((x) => x !== playerId) : [...s.watchList, playerId],
            activity: pl
              ? [
                  { id: uid(), text: pl.name, sub: on ? "Removed from Watch List" : "Added to Watch List", ts: Date.now() },
                  ...s.activity,
                ].slice(0, 25)
              : s.activity,
          };
        }),
      addSchemeRule: () =>
        set((s) => ({ schemeRules: [...s.schemeRules, { id: uid(), trigger: "", action: "", result: "" }] })),
      updateSchemeRule: (id, patch) =>
        set((s) => ({ schemeRules: s.schemeRules.map((r) => (r.id === id ? { ...r, ...patch } : r)) })),
      removeSchemeRule: (id) =>
        set((s) => ({ schemeRules: s.schemeRules.filter((r) => r.id !== id) })),
      addOpponent: (name) => {
        const id = uid();
        set((s) => ({
          opponents: [
            ...s.opponents,
            {
              id,
              name: name?.trim() || "New Opponent",
              week: null,
              personnel: "",
              formations: [],
              concepts: [],
              downDistance: "",
              redZone: "",
              keyPlayers: [],
              notes: "",
            },
          ],
          activity: [{ id: uid(), text: name?.trim() || "New Opponent", sub: "Opponent added to Scout", ts: Date.now() }, ...s.activity].slice(0, 25),
        }));
        return id;
      },
      updateOpponent: (id, patch) =>
        set((s) => ({ opponents: s.opponents.map((o) => (o.id === id ? { ...o, ...patch } : o)) })),
      removeOpponent: (id) =>
        set((s) => ({
          opponents: s.opponents.filter((o) => o.id !== id),
          gamePlans: s.gamePlans.filter((g) => g.opponentId !== id),
        })),
      updateGamePlan: (opponentId, patch) =>
        set((s) => {
          const existing = s.gamePlans.find((g) => g.opponentId === opponentId);
          const base: GamePlan = existing ?? { opponentId, bestAnswers: [], adjustments: [], emphasis: [] };
          const next = { ...base, ...patch };
          return {
            gamePlans: existing
              ? s.gamePlans.map((g) => (g.opponentId === opponentId ? next : g))
              : [...s.gamePlans, next],
          };
        }),

      addPlayer: (pl = {}) => {
        const id = uid();
        set((s) => ({
          players: [
            ...s.players,
            { id, jersey: null, name: "New Player", cls: "", positions: [], status: "Healthy", eval: {}, ...pl },
          ],
          activity: [{ id: uid(), text: pl.name ?? "New Player", sub: "Added to roster", ts: Date.now() }, ...s.activity].slice(0, 25),
        }));
        return id;
      },
      updatePlayer: (id, patch) =>
        set((s) => ({ players: s.players.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
      removePlayer: (id) =>
        set((s) => ({
          players: s.players.filter((x) => x.id !== id),
          groups: s.groups.map((g) => ({
            ...g,
            slots: Object.fromEntries(
              Object.entries(g.slots).map(([k, ids]) => [k, ids.filter((x) => x !== id)]),
            ),
          })),
        })),
      importPlayers: (rows) => {
        const players = rows
          .filter((r) => r.name)
          .map((r) => ({
            id: uid(),
            jersey: r.jersey ?? null,
            name: r.name!,
            cls: r.cls ?? "",
            positions: r.positions ?? [],
            status: "Healthy" as const,
            eval: {},
            heightIn: r.heightIn ?? null,
            weightLb: r.weightLb ?? null,
            squat: r.squat ?? null,
            bench: r.bench ?? null,
            clean: r.clean ?? null,
            vertical: r.vertical ?? null,
            broad: r.broad ?? null,
            forty: r.forty ?? null,
            flying10: r.flying10 ?? null,
            shuttle: r.shuttle ?? null,
          }));
        set((s) => ({
          players: [...s.players, ...players],
          activity: [
            { id: uid(), text: `${players.length} players imported`, sub: "Roster import", ts: Date.now() },
            ...s.activity,
          ].slice(0, 25),
        }));
        return players.length;
      },

      setActiveGroup: (id) => set({ activeGroupId: id }),
      setGroupStructure: (groupId, structureId) =>
        set((s) => ({
          groups: s.groups.map((g) => (g.id === groupId ? { ...g, structureId, slots: {} } : g)),
        })),
      setSlotPlayers: (groupId, slotIndex, playerIds) =>
        set((s) => ({
          groups: s.groups.map((g) => {
            if (g.id !== groupId) return g;
            const slots = { ...g.slots };
            if (playerIds.length === 0) delete slots[slotIndex];
            else slots[slotIndex] = playerIds;
            return { ...g, slots };
          }),
        })),
      addGroup: (name) =>
        set((s) => ({
          groups: [...s.groups, { id: uid(), name, structureId: "3-4", slots: {} }],
        })),

      setScheme: (patch) => set((s) => ({ scheme: { ...s.scheme, ...patch } })),
      setSlotOverride: (structureId, slotIndex, patch) =>
        set((s) => ({
          overrides: {
            ...s.overrides,
            [structureId]: {
              ...s.overrides[structureId],
              [slotIndex]: { ...s.overrides[structureId]?.[slotIndex], ...patch },
            },
          },
        })),

      setStrengthRule: (rule) => set({ strengthRule: rule }),
      saveFormationTemplate: (name, look) =>
        set((s) => ({
          formationTemplates: { ...s.formationTemplates, [name]: look.map((m) => ({ ...m })) },
        })),
      setDefStyle: (defStyle) => set({ defStyle }),
      setFormationTerm: (internal, label) =>
        set((s) => ({ formationTerms: { ...s.formationTerms, [internal]: label } })),

      addCall: (section) => {
        const id = uid();
        set((s) => ({
          calls: [
            ...s.calls,
            {
              id,
              section,
              name: "New Call",
              offForm: "",
              offConcept: "",
              offLook: look(defaultPresetName),
              lines: [],
              zones: [],
              defOffsets: {},
              assignments: {},
              notes: "",
            },
          ],
          activeCallId: id,
        }));
        return id;
      },
      updateCall: (id, patch) =>
        set((s) => ({ calls: s.calls.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
      duplicateCall: (id) => {
        const c = get().calls.find((x) => x.id === id);
        if (!c) return;
        const nid = uid();
        set((s) => ({
          calls: [
            ...s.calls,
            {
              ...c,
              id: nid,
              name: `${c.name} (copy)`,
              offLook: c.offLook.map((m) => ({ ...m })),
              lines: c.lines.map((l) => ({ ...l, points: l.points.map((p) => [...p] as [number, number]) })),
              zones: c.zones.map((z) => ({ ...z })),
              defOffsets: { ...c.defOffsets },
            },
          ],
          activeCallId: nid,
        }));
      },
      deleteCall: (id) =>
        set((s) => ({
          calls: s.calls.filter((c) => c.id !== id),
          activeCallId: s.activeCallId === id ? null : s.activeCallId,
        })),
      setActiveCall: (id) => set({ activeCallId: id }),

      setOpponent: (patch) => set((s) => ({ opponent: { ...s.opponent, ...patch } })),
      updateScheduleWeek: (week, patch) =>
        set((s) => ({
          seasonSchedule: s.seasonSchedule.map((w) => (w.week === week ? { ...w, ...patch } : w)),
        })),
      applyWeightRoom: (rows) => {
        let matched = 0;
        const norm = (v: string) => v.toLowerCase().replace(/[^a-z]/g, "");
        set((s) => ({
          players: s.players.map((pl) => {
            const pn = norm(pl.name);
            const row = rows.find(
              (r) =>
                (r.jersey != null && r.jersey === pl.jersey) ||
                (r.name && (pn.includes(norm(r.name).slice(-6)) || norm(r.name).includes(pn.slice(-6)))),
            );
            if (!row) return pl;
            matched++;
            const num = (v: number | null | undefined, prev: number | null | undefined) => (v != null ? v : prev);
            return {
              ...pl,
              squat: num(row.squat, pl.squat),
              bench: num(row.bench, pl.bench),
              clean: num(row.clean, pl.clean),
              vertical: num(row.vertical, pl.vertical),
              broad: num(row.broad, pl.broad),
              forty: num(row.forty, pl.forty),
              flying10: num(row.flying10, pl.flying10),
              shuttle: num(row.shuttle, pl.shuttle),
              weightLb: num(row.weightLb, pl.weightLb),
            };
          }),
        }));
        return matched;
      },
      addPresetCall: (presetId) => {
        const preset = PRESET_PLAYS.find((x) => x.id === presetId);
        if (!preset) return;
        const st = getStructure(get().groups.find((g) => g.id === get().activeGroupId)?.structureId ?? "3-4");
        const built = preset.build(st);
        const id = uid();
        set((s) => ({
          calls: [
            ...s.calls,
            {
              id,
              section: preset.section,
              name: preset.name,
              offForm: "",
              offConcept: "",
              offLook: offensivePresets[defaultPresetName].map((m) => ({ ...m })),
              lines: built.lines,
              zones: built.zones,
              defOffsets: {},
              assignments: built.assignments,
              notes: built.notes,
            },
          ],
          activeCallId: id,
        }));
      },
    }),
    {
      name: "program-builder-v3",
      version: 4,
      migrate: (persisted, version) => {
        const state = persisted as { calls?: Call[]; formationTemplates?: Record<string, OffMarker[]> };
        if (version < 2 && state?.calls) {
          // v1 offensive looks lived at y 58–86 (OL at 82): remap into the
          // offense-at-bottom space and add the drawing fields.
          state.calls = state.calls.map((c) => ({
            ...c,
            offLook: (c.offLook ?? []).map((m) => ({
              ...m,
              y: Math.min(72, Math.max(43, 46 + (82 - m.y) * 0.55)),
            })),
            lines: c.lines ?? [],
            zones: c.zones ?? [],
            defOffsets: c.defOffsets ?? {},
          }));
        }
        if (version < 3 && state?.calls) {
          // v3 flips the card to OUR perspective: defense at the bottom,
          // offense on top. Mirror everything across the LOS (y' = 84 - y).
          state.calls = state.calls.map((c) => ({
            ...c,
            offLook: (c.offLook ?? []).map((m) => ({
              ...m,
              y: Math.min(40.8, Math.max(4, 84 - m.y)),
            })),
            lines: (c.lines ?? []).map((l) => ({
              ...l,
              points: l.points.map(([dx, dy]) => [dx, -dy] as [number, number]),
            })),
            zones: (c.zones ?? []).map((z) => ({ ...z, y: Math.min(73, Math.max(2, 84 - z.y)) })),
            texts: (c.texts ?? []).map((t) => ({ ...t, y: Math.min(73, Math.max(2, 84 - t.y)) })),
            defOffsets: Object.fromEntries(
              Object.entries(c.defOffsets ?? {}).map(([k, [dx, dy]]) => [k, [dx, -dy] as [number, number]]),
            ),
          }));
        }
        if (version < 4) {
          // v4 relabels the OL from the OFFENSE's perspective (they face our
          // defense, so their RT sits on our left). Labels only — marker ids
          // stay put so anchored lines keep working.
          const OL_SWAP: Record<string, string> = { LT: "RT", LG: "RG", RG: "LG", RT: "LT" };
          const relabel = (m: OffMarker) => (OL_SWAP[m.label] ? { ...m, label: OL_SWAP[m.label] } : m);
          if (state?.calls) {
            state.calls = state.calls.map((c) => ({ ...c, offLook: (c.offLook ?? []).map(relabel) }));
          }
          if (state?.formationTemplates) {
            state.formationTemplates = Object.fromEntries(
              Object.entries(state.formationTemplates).map(([name, look]) => [name, look.map(relabel)]),
            );
          }
        }
        return state;
      },
    },
  ),
);

// The coach's label for a structure slot — override first, default second.
export function useSlotLabel() {
  const overrides = useStore((s) => s.overrides);
  return (structureId: string, slotIndex: number) =>
    overrides[structureId]?.[slotIndex]?.label ?? getStructure(structureId).slots[slotIndex].pos;
}

export function slotLabelOf(overrides: Overrides, structureId: string, slotIndex: number) {
  return overrides[structureId]?.[slotIndex]?.label ?? getStructure(structureId).slots[slotIndex].pos;
}

// Hydration guard — zustand/persist reads localStorage, so first client render
// must match SSR output until mounted.
export function useHydrated() {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  return ready;
}

export const fmtHeight = (inches?: number | null) =>
  inches ? `${Math.floor(inches / 12)}'${inches % 12}"` : "—";
