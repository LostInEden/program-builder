import type { Call } from "./store";
import { defenseCanvasY, getStructure } from "./football";

const string = { type: "string" };
const number = { type: "number" };
const object = (properties: Record<string, object>) => ({ type: "object", additionalProperties: false, properties, required: Object.keys(properties) });
const array = (items: object) => ({ type: "array", items });
export const REFERENCE_SCHEMA = object({
  title: string, explanation: string, assumptions: string, question: string,
  offense: array(object({ label: string, x: number, y: number })),
  defense: array(object({ slot: { type: "integer" }, label: string, x: number, y: number })),
  lines: array(object({ side: { type: "string", enum: ["off", "def"] }, player: { type: "integer" }, kind: { type: "string", enum: ["route", "block", "motion"] }, points: array(object({ x: number, y: number })) })),
});

// Treat model JSON as untrusted: only known fields, bounded points, valid anchors.
export function parseReference(value: unknown, structureId: string): { call: Call | null; explanation: string; assumptions: string; question: string } {
  if (!value || typeof value !== "object") throw new Error("Invalid diagram response");
  const v = value as Record<string, unknown>;
  const text = (key: string, max = 1500) => {
    if (typeof v[key] !== "string" || v[key].length > max) throw new Error("Invalid diagram text");
    return v[key] as string;
  };
  const title = text("title", 100), explanation = text("explanation"), assumptions = text("assumptions"), question = text("question");
  if (question.trim()) return { call: null, explanation, assumptions, question };
  const list = (key: string, max: number) => {
    if (!Array.isArray(v[key]) || v[key].length > max) throw new Error("Invalid diagram objects");
    return v[key] as Record<string, unknown>[];
  };
  const point = (p: Record<string, unknown>): [number, number] => {
    if (!p || typeof p.x !== "number" || typeof p.y !== "number" || !Number.isFinite(p.x) || !Number.isFinite(p.y) || p.x < 1 || p.x > 99 || p.y < 1 || p.y > 86) throw new Error("Diagram is outside the field");
    return [p.x, p.y];
  };
  const label = (p: Record<string, unknown>) => {
    if (typeof p.label !== "string" || !/^[a-z0-9]{1,2}$/i.test(p.label)) throw new Error("Invalid player label");
    return p.label;
  };
  const structure = getStructure(structureId);
  const off = list("offense", 11).map((p, i) => { const [x, y] = point(p); return { id: `ref-off-${i}`, label: label(p), displayLabel: label(p), showLabel: true, x, y }; });
  const defense = list("defense", 11);
  if (!off.length && !defense.length) throw new Error("No players in reference diagram");
  const offsets: Call["defOffsets"] = {};
  const appearance: NonNullable<Call["defAppearance"]> = Object.fromEntries(structure.slots.map((_, i) => [i, { hidden: true }]));
  for (const p of defense) {
    const i = p.slot;
    if (typeof i !== "number" || !Number.isInteger(i) || !structure.slots[i] || offsets[i]) throw new Error("Invalid defender slot");
    const [x,y] = point(p), slot = structure.slots[i];
    offsets[i] = [x - slot.x, y - defenseCanvasY(slot.y)];
    appearance[i] = { hidden: false, displayLabel: label(p) };
  }
  const lines: Call["lines"] = list("lines", 24).map((l, i) => {
    if ((l.side !== "off" && l.side !== "def") || typeof l.player !== "number" || !Number.isInteger(l.player) || !["route", "block", "motion"].includes(l.kind as string)) throw new Error("Invalid assignment line");
    const p = l.side === "off" ? off[l.player] : defense.find(d => d.slot === l.player);
    if (!p || !Array.isArray(l.points) || l.points.length < 2 || l.points.length > 12) throw new Error("Invalid line anchor");
    const origin = point(p);
    const absolute = l.points.map(point);
    if (Math.hypot(absolute[0][0] - origin[0], absolute[0][1] - origin[1]) > 2) throw new Error("Line does not start at its player");
    return { id: `ref-line-${i}`, anchor: l.side === "off" ? `off:${off[l.player].id}` : `def:${l.player}`, kind: l.kind as "route" | "block" | "motion", points: absolute.map(([x,y]) => [x-origin[0], y-origin[1]]), color: "#315EFB" };
  });
  return { explanation, assumptions, question, call: { id: "reference", section: "Fronts", name: title || "Reference diagram", offForm: "", offConcept: "", offLook: off, defOffsets: offsets, defAppearance: appearance, lines, zones: [], assignments: {}, notes: `AI reference — review before using.\n${explanation}\n${assumptions}` } };
}
