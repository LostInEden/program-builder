"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useEffect, useState } from "react";
import {
  getStructure,
  offensivePresets,
  defaultPresetName,
  type OffMarker,
  type Concept,
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
  eval: Evaluation;
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

// 3-4 slot order in football.ts: WE,T,N,SE,W,M,S,C,C,SS,FS
const baseSlots: Record<number, string[]> = {
  0: ["pl-90"], // WE J. Lewis
  1: ["pl-99", "pl-55"], // T A. Henry, D. King
  2: ["pl-70", "pl-66"], // N A. Mack, S. Pruitt
  3: ["pl-1"], // SE T. Allen
  4: ["pl-10", "pl-44"], // W C. Locke, R. Ogles
  5: ["pl-7"], // M T. Mathine
  6: ["pl-5"], // S H. Amason
  7: ["pl-9", "pl-24"], // C D. Ville, M. Turner
  8: ["pl-20", "pl-2"], // C P. Price, D. Smith
  9: ["pl-3", "pl-33"], // SS C. Beck, K. Byrd
  10: ["pl-11", "pl-14"], // FS E. Reed, L. White
};

const seedGroups: PersonnelGroup[] = [
  { id: "base", name: "Base", structureId: "3-4", slots: baseSlots },
  { id: "nickel", name: "Nickel", structureId: "4-2-5", slots: {} },
  { id: "dime", name: "Dime", structureId: "3-2-6", slots: {} },
  { id: "heavy", name: "Heavy", structureId: "4-3", slots: {} },
  { id: "goalline", name: "Goal Line", structureId: "4-3", slots: {} },
];

const look = (preset: string) => offensivePresets[preset].map((m) => ({ ...m }));

const seedCalls: Call[] = [
  {
    id: "call-front-okie",
    section: "Fronts",
    name: "Okie",
    offForm: "Trips Right",
    offConcept: "Inside zone",
    offLook: look("Trips Right (3x1)"),
    assignments: { 0: "5-tech, C gap, squeeze down blocks", 1: "3-tech, B gap penetrate", 2: "0-tech, 2-gap A gaps", 3: "5-tech, C gap, force on flow" },
    notes: "Base front vs 11/12 personnel.",
  },
  {
    id: "call-cov-sky3",
    section: "Coverages",
    name: "Sky 3",
    offForm: "Doubles",
    offConcept: "Quick game",
    offLook: look("Gun Spread (2x2)"),
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
    assignments: { 4: "A-gap blitz, contain rules off", 5: "Green dog vs back block", 6: "Wall #2, seam carry" },
    notes: "Fire zone behind it — 3 under, 3 deep.",
  },
  {
    id: "call-chk-cloud",
    section: "Checks & Adjustments",
    name: "Cloud Check",
    offForm: "Any 2x2 to boundary",
    offConcept: "—",
    offLook: look("Empty (3x2)"),
    assignments: { 7: "Cloud: squat flat, corner force", 9: "Push to deep half over #2" },
    notes: "Auto-check vs condensed boundary sets.",
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
  calls: Call[];
  activeCallId: string | null;
  opponent: { name: string; kickoff: string };

  addPlayer: (pl?: Partial<Player>) => string;
  updatePlayer: (id: string, patch: Partial<Player>) => void;
  removePlayer: (id: string) => void;
  importPlayers: (rows: Partial<Player>[]) => number;

  setActiveGroup: (id: string) => void;
  setGroupStructure: (groupId: string, structureId: string) => void;
  setSlotPlayers: (groupId: string, slotIndex: number, playerIds: string[]) => void;
  addGroup: (name: string) => void;

  setScheme: (patch: Partial<{ structureName: string; philosophy: string }>) => void;
  setSlotOverride: (structureId: string, slotIndex: number, patch: SlotOverride) => void;
  setStrengthRule: (rule: StrengthRule) => void;
  setFormationTerm: (internal: string, label: string) => void;

  addCall: (section: PlaybookSection) => string;
  updateCall: (id: string, patch: Partial<Call>) => void;
  duplicateCall: (id: string) => void;
  deleteCall: (id: string) => void;
  setActiveCall: (id: string | null) => void;

  setOpponent: (patch: Partial<{ name: string; kickoff: string }>) => void;
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
      calls: seedCalls,
      activeCallId: seedCalls[0].id,
      opponent: { name: "Red Valley", kickoff: "Saturday, 7:00 PM" },

      addPlayer: (pl = {}) => {
        const id = uid();
        set((s) => ({
          players: [
            ...s.players,
            { id, jersey: null, name: "New Player", cls: "", positions: [], status: "Healthy", eval: {}, ...pl },
          ],
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
        set((s) => ({ players: [...s.players, ...players] }));
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
            { ...c, id: nid, name: `${c.name} (copy)`, offLook: c.offLook.map((m) => ({ ...m })) },
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
    }),
    { name: "program-builder-v3" },
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
