import type { Call } from "./store";
import { getStructure, LOS_Y, YD } from "./football";

// Resolve the subject at the drawing boundary too: existing replies and follow-ups
// do not carry the metadata added by newer chat versions.
const FOLLOW_UP = /^(?:please\s+)?(?:(?:diagram|drawing|picture)|let me see (?:it|that)|show (?:me )?(?:it|that|the (?:diagram|drawing))|draw (?:it|that)|(?:(?:can you|could you) )?(?:show|draw|give|make|create)(?: me)? (?:a |the )?(?:diagram|drawing|picture))(?: again)?[.!?]*$/i;
const CUSTOM = /\b(?:our|my|bunch|trips|3x1|3×1|empty|left|right|versus|vs|against|cover(?:age)?|motion|tag|tagged|custom|modify|modified|change|instead|from|with)\b/i;
export function snagReferenceIntent(question: string, answer = ""): "standard" | "custom" | null {
  const q = question.trim();
  if (/\b(?:don't|do not|not)\s+(?:draw|show|sketch)\b/i.test(q)) return null;
  const explicit = /\bsnag\b/i.test(q);
  const inherited = FOLLOW_UP.test(q) && /\bsnag\b/i.test(answer);
  if (!explicit && !inherited) return null;
  // Never substitute a standard example for a requested variant or comparison.
  if (CUSTOM.test(q) || /\b(?:smash|mesh|flood|stick|sail)\b/i.test(q)) return "custom";
  const remaining = q.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean).filter(word => !['snag','draw','show','sketch','diagram','drawing','picture','illustrate','create','make','a','an','the','of','me','it','that','can','could','you','please','for','again','basic','standard','concept','play','i','want','to','see','what','is','explain'].includes(word));
  if (explicit && remaining.length) return "custom";
  return "standard";
}
export function isBasicSnagRequest(input: string): boolean {
  return /\b(?:draw|show|sketch|diagram|illustrate|create|make)\b/i.test(input) && snagReferenceIntent(input) === "standard";
}
export function referenceQuestion(input: string, history: { role: string; text: string }[]): string {
  if (!FOLLOW_UP.test(input.trim())) return input;
  return [...history].reverse().find(m => m.role === "coach" && !FOLLOW_UP.test(m.text.trim()))?.text ?? input;
}
export function resolveSnagRequest(input: string, history: { role: string; text: string }[]): boolean {
  if (isBasicSnagRequest(input)) return true;
  if (!FOLLOW_UP.test(input.trim())) return false;
  // Follow the current topic across repeated "show it" messages. Stop on a new topic.
  for (let i = history.length - 1; i >= 0; i--) {
    const m = history[i];
    if (m.role !== "coach" || FOLLOW_UP.test(m.text.trim())) continue;
    return snagReferenceIntent(m.text) === "standard";
  }
  return false;
}
export const SNAG_VARIANT_QUESTION = "The checked Snag reference is the standard 2×2 example: Z on snag, Y on corner, and B to the flat. For your variation, specify each receiver’s alignment and route so I don’t substitute a different play.";

export const SNAG_EXPLANATION = "Here’s a standard Snag reference: Z settles inside at about 5 yards, Y runs the corner, and the back releases to the flat. This example uses a 2×2 formation; backside routes, protection, and defensive assignments are intentionally omitted. Open it in Play Art to edit it.";

// Coaching reference: https://coachkoufootball.substack.com/p/pass-concept-6-the-snag-concept
// Fixed football geometry, not free-form model coordinates. Offense travels down-screen.
export function snagReference(structureId: string): Call {
  const marker = (id: string, label: string, x: number, y: number, color = "#17191B") => ({ id, label, displayLabel: label, showLabel: true, x, y, color });
  const offLook = [
    marker("rt", "RT", 42, 39), marker("rg", "RG", 46, 39), marker("c", "C", 50, 39), marker("lg", "LG", 54, 39), marker("lt", "LT", 58, 39),
    marker("x", "X", 10, 39), marker("h", "H", 24, 36), marker("y", "Y", 72, 36, "#7C3AED"), marker("z", "Z", 91, 39, "#315EFB"),
    marker("q", "Q", 50, 29), marker("b", "B", 58, 29, "#16824B"),
  ];
  const path = (id: string, absolute: [number, number][], color: string, arrow: boolean): Call["lines"][number] => {
    const player = offLook.find(p => p.id === id)!;
    return { id: `snag-${id}`, anchor: `off:${id}`, kind: "route", points: absolute.map(([x,y]) => [x-player.x,y-player.y]), color, smooth: false, arrowStyle: arrow ? "end" : "none", thickness: "normal" };
  };
  return {
    id: "snag-reference", section: "Fronts", name: "Snag — standard 2×2 reference", offForm: "Gun Spread (2x2)", offConcept: "Snag", offLook,
    defAppearance: Object.fromEntries(getStructure(structureId).slots.map((_, i) => [i, { hidden: true }])), defOffsets: {}, assignments: {}, zones: [],
    lines: [
      path("z", [[91,39],[75,LOS_Y+5*YD]], "#315EFB", false),
      path("y", [[72,36],[72,LOS_Y+8*YD],[91,LOS_Y+15*YD]], "#7C3AED", true),
      path("b", [[58,29],[65,39],[91,LOS_Y+2*YD]], "#16824B", true),
    ],
    texts: [
      {id:"snag-label",x:83,y:57,text:"SNAG · settle 5 yd"},
      {id:"corner-label",x:83,y:79,text:"CORNER"},
      {id:"flat-label",x:91,y:50,text:"FLAT"},
    ],
    notes: "Standard Snag example: Z (#1) runs inside and settles about 5 yards beyond the LOS; Y (#2) stems vertically and breaks to the corner; B releases to the flat. Route depths are illustrative. Offense attacks down-screen. No defensive look, protection, or backside route is assumed. This is not a saved team call.",
  };
}

// Compatibility with the existing diagram API, including older browser clients.
// Modern clients replace this payload with the same styled reference locally.
export function snagDiagramPayload() {
  const call = snagReference("");
  return {
    referenceConcept: "snag", title: call.name, explanation: SNAG_EXPLANATION,
    assumptions: call.notes, question: "", defense: [],
    offense: call.offLook.map(({label,x,y}) => ({label,x,y})),
    lines: call.lines.map(line => {
      const player = call.offLook.findIndex(p => `off:${p.id}` === line.anchor);
      const origin = call.offLook[player];
      return { side: "off", player, kind: line.kind, points: line.points.map(([x,y]) => ({x:origin.x+x,y:origin.y+y})) };
    }),
  };
}
