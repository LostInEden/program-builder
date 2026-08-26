// Formation recognition per the coach's Terminology & Recognition Rules:
// identify the formation from player LOCATION and structure first, then apply
// the coach's preferred terminology as the label (overrides live in the store).

import type { OffMarker } from "@/lib/football";

// ── Reference tables (from the rules sheet) ─────────────────────────────────

export const DL_TECHNIQUES: { tech: string; alignment: string }[] = [
  { tech: "0", alignment: "Head up on center" },
  { tech: "1", alignment: "Outside shade of center" },
  { tech: "2", alignment: "Head up on guard" },
  { tech: "2i", alignment: "Inside shade of guard" },
  { tech: "3", alignment: "Outside shade of guard" },
  { tech: "4", alignment: "Head up on tackle" },
  { tech: "4i", alignment: "Inside shade of tackle" },
  { tech: "5", alignment: "Outside shoulder of tackle" },
  { tech: "6", alignment: "Head up on tight end" },
  { tech: "7", alignment: "Inside shade of tight end" },
  { tech: "9", alignment: "Outside shade of tight end" },
];

export const GAPS: { gap: string; location: string }[] = [
  { gap: "A", location: "Between center and guard" },
  { gap: "B", location: "Between guard and tackle" },
  { gap: "C", location: "Between tackle and tight end, or outside the tackle" },
  { gap: "D", location: "Outside the tight end / extra edge player" },
];

export const STRENGTH_RULES = [
  "Receiver strength",
  "Tight end strength",
  "Field location",
  "Personnel",
  "Structure",
] as const;
export type StrengthRule = (typeof STRENGTH_RULES)[number];

// Base names + tags the coach can relabel on the Terminology page.
export const FORMATION_TERMS = [
  "Twins",
  "Trips",
  "Quads",
  "Closed",
  "Pro",
  "Trey",
  "Plus",
  "Bunch",
  "Stack",
  "Slot",
  "Wing",
  "H (off-ball TE)",
  "Empty",
] as const;

// ── Recognition ─────────────────────────────────────────────────────────────

export type Recognition = {
  base: string; // internal base name (before coach relabel)
  side: "Left" | "Right" | null;
  tags: string[]; // internal tag names
  strengthSide: "Left" | "Right" | null;
  detail: string; // e.g. "3 removed right, 1 removed left, TE on ball right"
};

// Marker coords: canvas space — offense sits ABOVE the LOS (defense is drawn at
// the bottom, our perspective), so the OL row is the DEEPEST offensive y (~39)
// and backs are shallower (smaller y).
export function recognizeFormation(look: OffMarker[], strengthRule: StrengthRule): Recognition | null {
  if (look.length < 6) return null;

  // OL rule: the five players labeled LT, LG, C, RG, RT ARE the offensive line.
  // They render on the diagram but never count toward the formation name —
  // recognition is based on the eligible skill positions only.
  const OL_LABELS = new Set(["LT", "LG", "C", "RG", "RT"]);
  let ol = look.filter((m) => OL_LABELS.has(m.label.toUpperCase())).sort((a, b) => a.x - b.x);
  const maxY = Math.max(...look.map((m) => m.y));
  if (ol.length < 3) {
    // fallback: infer the line positionally (row nearest the LOS, central)
    const lineRow = look.filter((m) => m.y >= maxY - 2 && m.x >= 28 && m.x <= 72).sort((a, b) => a.x - b.x);
    if (lineRow.length < 3) return null;
    ol = lineRow.slice(0, 5);
  }
  const leftEdge = ol[0].x;
  const rightEdge = ol[ol.length - 1].x;
  const center = (leftEdge + rightEdge) / 2;

  const others = look.filter((m) => !ol.includes(m));
  const onBall = (m: OffMarker) => m.y >= maxY - 5;
  const nearEdge = (m: OffMarker) =>
    (m.x > rightEdge && m.x <= rightEdge + 8) || (m.x < leftEdge && m.x >= leftEdge - 8);

  const tes = others.filter((m) => onBall(m) && nearEdge(m)); // on-ball TE
  const wings = others.filter((m) => !onBall(m) && nearEdge(m) && m.y >= maxY - 12); // wing / off-ball TE (H)
  const backs = others.filter(
    (m) => !tes.includes(m) && !wings.includes(m) && m.x > leftEdge - 6 && m.x < rightEdge + 6 && m.y < maxY - 6,
  );
  const removed = others.filter((m) => !tes.includes(m) && !wings.includes(m) && !backs.includes(m));

  const rightRemoved = removed.filter((m) => m.x >= center);
  const leftRemoved = removed.filter((m) => m.x < center);
  const nR = rightRemoved.length;
  const nL = leftRemoved.length;
  const side: "Left" | "Right" | null = nR === nL ? (nR > 0 ? "Right" : null) : nR > nL ? "Right" : "Left";
  const n = Math.max(nR, nL);
  const sideRemoved = side === "Left" ? leftRemoved : rightRemoved;

  const hasTE = tes.length > 0;
  const teSide: "Left" | "Right" | null = hasTE ? (tes[0].x >= center ? "Right" : "Left") : null;

  // Base name per the recognition table.
  let base: string;
  if (backs.length <= 1 && removed.length >= 4 && Math.min(nL, nR) >= 2 && !hasTE && backs.length === 1) {
    base = "Empty";
  } else if (hasTE && n === 0) base = "Closed";
  else if (hasTE && n === 1) base = "Pro";
  else if (hasTE && n === 2) base = "Trey";
  else if (n === 2) base = "Twins";
  else if (n === 3) base = "Trips";
  else if (n >= 4) base = "Quads";
  else base = ""; // 1 WR removed → no tag

  // Tags.
  const tags: string[] = [];
  if (base === "Trips" || base === "Trey") {
    const xs = sideRemoved.map((m) => m.x);
    if (xs.length >= 3 && Math.max(...xs) - Math.min(...xs) <= 9) tags.push("Bunch");
    // "Plus" is a tag appended once to the base name (HB aligned to the trips
    // side): "Trips Right Plus", never "Trips Right Trips Plus".
    const tripsBack = backs.find((m) => (side === "Right" ? m.x > center + 2 : m.x < center - 2));
    if (tripsBack) tags.push("Plus");
  }
  // Stack: two removed receivers nearly on top of each other.
  outer: for (let i = 0; i < removed.length; i++) {
    for (let j = i + 1; j < removed.length; j++) {
      if (Math.abs(removed[i].x - removed[j].x) <= 3) {
        tags.push("Stack");
        break outer;
      }
    }
  }
  // Slot: a removed receiver close to the tackle box.
  if (removed.some((m) => (m.x > rightEdge && m.x <= rightEdge + 14) || (m.x < leftEdge && m.x >= leftEdge - 14)))
    tags.push("Slot");
  if (wings.length > 0) tags.push(tes.length > 0 ? "Wing" : "H (off-ball TE)");

  // Strength per the coach's chosen rule.
  let strengthSide: "Left" | "Right" | null;
  switch (strengthRule) {
    case "Tight end strength":
      strengthSide = teSide ?? side;
      break;
    case "Receiver strength":
    default:
      strengthSide = side ?? teSide;
      break;
  }

  const detail = [
    `${nR} removed right, ${nL} removed left`,
    hasTE ? `on-ball TE ${teSide?.toLowerCase()}` : "no on-ball TE",
    `${backs.length} in backfield`,
    wings.length ? `${wings.length} wing/off-ball` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return { base, side, tags, strengthSide, detail };
}

// Render the recognition with the coach's preferred labels applied.
export function formationLabel(rec: Recognition, terms: Record<string, string>): string {
  const t = (name: string) => terms[name] || name;
  const parts: string[] = [];
  if (rec.base) parts.push(t(rec.base));
  if (rec.side) parts.push(rec.side);
  for (const tag of rec.tags) parts.push(t(tag));
  return parts.length ? parts.join(" ") : "Base";
}
