import type { Call } from "./store";
import { getStructure, LOS_Y, YD } from "./football";

// Deliberately narrow: a generic illustration is not the coach's tagged variant.
export function isBasicSnagRequest(input: string): boolean {
  return /^(?:(?:please|can you|could you)\s+)*(?:draw|show|sketch|diagram|illustrate)(?:\s+me)?(?:\s+(?:a|the|basic|simple|standard))*\s+snag(?:\s+(?:concept|diagram|play|route concept))?(?:\s+please)?[.!?]*$/i.test(input.trim());
}
export function resolveSnagRequest(input: string, history: { role: string; text: string }[]): boolean {
  if (isBasicSnagRequest(input)) return true;
  if (!/^(?:let me see (?:it|that)|show (?:me )?(?:it|that)|draw (?:it|that))[.!?]*$/i.test(input.trim())) return false;
  // Only follow the immediately preceding topic, never an old unrelated Snag mention.
  const previousCoach = [...history].reverse().find(m => m.role === "coach");
  return !!previousCoach && (isBasicSnagRequest(previousCoach.text) || /^(?:what is|explain|describe) (?:the )?snag(?: concept)?[.!?]*$/i.test(previousCoach.text.trim()));
}

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
