// Standard football knowledge base (Q27).
//
// Every staff tags film in its own words. CounterScheme's job is to understand
// what those words mean STRUCTURALLY without making the coach build a
// dictionary first: recognize what we can from common football language, and
// only ask about the words that are genuinely that team's own ("Utah",
// "Dolphin", "Queen").
//
// Nothing here is team-specific. What the coach teaches us lives in the store
// as `termMap` and always wins over this file — see `resolveTag`.

export type TermKind = "formation" | "concept" | "backfield" | "other";

/** What a formation word tells us about how they line up. */
export type TermStructure = {
  receivers?: string; // "3x1", "2x2", "3x2"
  te?: "attached" | "detached" | "none" | "two";
  backs?: number;
  side?: "left" | "right";
};

export type KnowledgeEntry = {
  id: string;
  kind: TermKind;
  label: string;
  aliases: string[];
  /** One short football phrase. Short on purpose — it renders next to the raw tag. */
  meaning: string;
  /** "base" words can stand alone; "modifier" words tune a base word. */
  role: "base" | "modifier";
  structure?: TermStructure;
  type?: "run" | "pass" | "screen" | "rpo";
  family?: string;
};

/** What the coach has taught us for THIS team. Stored per team in the store. */
export type TermMapping = {
  id: string;
  term: string; // normalized, uppercase
  meaning: string; // the coach's own words, kept verbatim
  kind: TermKind;
  knowledgeId?: string;
  createdAt: number;
};

// ---- formations -------------------------------------------------------------

const FORMATIONS: KnowledgeEntry[] = [
  { id: "f-trips", kind: "formation", label: "Trips", aliases: ["TRIO", "3X1", "TRIPLE STACK"], role: "base", meaning: "3 receivers to one side (3x1)", structure: { receivers: "3x1", te: "none" } },
  { id: "f-trey", kind: "formation", label: "Trey", aliases: ["TREYS"], role: "base", meaning: "3x1 with the tight end attached", structure: { receivers: "3x1", te: "attached" } },
  { id: "f-deuce", kind: "formation", label: "Deuce", aliases: ["DUECE"], role: "base", meaning: "2x2 with a tight end attached", structure: { receivers: "2x2", te: "attached" } },
  { id: "f-doubles", kind: "formation", label: "Doubles", aliases: ["DUB", "DUBS", "2X2"], role: "base", meaning: "2 receivers each side, no tight end", structure: { receivers: "2x2", te: "none" } },
  { id: "f-twins", kind: "formation", label: "Twins", aliases: ["TWIN"], role: "base", meaning: "2 receivers to one side, single receiver away", structure: { receivers: "2x1" } },
  { id: "f-pro", kind: "formation", label: "Pro", aliases: ["PRO SET"], role: "base", meaning: "tight end attached, split end away", structure: { te: "attached", backs: 2 } },
  { id: "f-ace", kind: "formation", label: "Ace", aliases: ["SINGLE BACK", "SINGLEBACK", "ONE BACK"], role: "base", meaning: "one back, balanced set", structure: { backs: 1 } },
  { id: "f-empty", kind: "formation", label: "Empty", aliases: ["EMPTY GUN", "5 WIDE", "FIVE WIDE"], role: "base", meaning: "no backs — 5 eligibles out (3x2)", structure: { receivers: "3x2", backs: 0 } },
  { id: "f-bunch", kind: "formation", label: "Bunch", aliases: ["CLUSTER"], role: "base", meaning: "three receivers in a tight cluster" },
  { id: "f-quads", kind: "formation", label: "Quads", aliases: ["4X1", "QUAD"], role: "base", meaning: "4 receivers to one side (4x1)", structure: { receivers: "4x1" } },
  { id: "f-unbalanced", kind: "formation", label: "Unbalanced", aliases: ["UNBAL", "TACKLE OVER"], role: "base", meaning: "extra lineman shifted to one side — count the eligibles" },
  { id: "f-double-tight", kind: "formation", label: "Double Tight", aliases: ["DBL TIGHT", "TWO TIGHT", "2 TIGHT", "DOUBLE TE"], role: "base", meaning: "tight ends attached both sides", structure: { te: "two" } },
  { id: "f-jumbo", kind: "formation", label: "Jumbo", aliases: ["HEAVY", "GOAL LINE", "GOALLINE", "MAX"], role: "base", meaning: "extra linemen/tight ends — heavy short-yardage set" },
  { id: "f-wildcat", kind: "formation", label: "Wildcat", aliases: ["WILDBACK", "DIRECT SNAP"], role: "base", meaning: "a back takes the direct snap" },
  { id: "f-flexbone", kind: "formation", label: "Flexbone", aliases: ["BONE", "WISHBONE", "VEER SET"], role: "base", meaning: "two slots off the tackles with a fullback — option look" },
  { id: "f-diamond", kind: "formation", label: "Diamond", aliases: ["TRIPLE BACK"], role: "base", meaning: "three backs around the quarterback in the gun", structure: { backs: 3 } },
  { id: "f-spread", kind: "formation", label: "Spread", aliases: [], role: "base", meaning: "four receivers out, one back" },
  { id: "f-wing-t", kind: "formation", label: "Wing-T", aliases: ["WINGT", "WING T"], role: "base", meaning: "wing-T: wingback, fullback, and a pulling run game" },
  // modifiers — the words staffs bolt onto a base look
  { id: "f-open", kind: "formation", label: "Open", aliases: [], role: "modifier", meaning: "no tight end to that side (open)" },
  { id: "f-closed", kind: "formation", label: "Closed", aliases: ["CLOSE"], role: "modifier", meaning: "tight end attached to that side (closed)", structure: { te: "attached" } },
  { id: "f-on", kind: "formation", label: "On", aliases: [], role: "modifier", meaning: "the tight end/wing is on the line", structure: { te: "attached" } },
  { id: "f-off", kind: "formation", label: "Off", aliases: ["OFFSET"], role: "modifier", meaning: "off the line / back offset", structure: { te: "detached" } },
  { id: "f-slot", kind: "formation", label: "Slot", aliases: [], role: "modifier", meaning: "inside receiver off the ball" },
  { id: "f-stack", kind: "formation", label: "Stack", aliases: ["STACKED"], role: "modifier", meaning: "receivers stacked one behind the other" },
  { id: "f-wing", kind: "formation", label: "Wing", aliases: ["WINGBACK"], role: "modifier", meaning: "back/tight end off the ball outside the tackle" },
  { id: "f-tight", kind: "formation", label: "Tight", aliases: [], role: "modifier", meaning: "split down tight to the formation" },
  { id: "f-wide", kind: "formation", label: "Wide", aliases: [], role: "modifier", meaning: "split out wide" },
  { id: "f-nasty", kind: "formation", label: "Nasty", aliases: ["PLUS", "FLEX"], role: "modifier", meaning: "receiver tightened inside the numbers" },
  { id: "f-over", kind: "formation", label: "Over", aliases: ["SHIFT"], role: "modifier", meaning: "shifted over to one side" },
  { id: "f-y", kind: "formation", label: "Y", aliases: ["TE", "TIGHT END"], role: "modifier", meaning: "the tight end (Y)" },
  { id: "f-h", kind: "formation", label: "H", aliases: ["H BACK", "HBACK"], role: "modifier", meaning: "the H-back / move tight end" },
  { id: "f-left", kind: "formation", label: "Left", aliases: ["LT"], role: "modifier", meaning: "set to the left", structure: { side: "left" } },
  { id: "f-right", kind: "formation", label: "Right", aliases: ["RT"], role: "modifier", meaning: "set to the right", structure: { side: "right" } },
];

// ---- backfields -------------------------------------------------------------

const BACKFIELDS: KnowledgeEntry[] = [
  { id: "b-i", kind: "backfield", label: "I", aliases: ["I FORM", "IFORM", "I FORMATION", "I BACK"], role: "base", meaning: "fullback and tailback stacked under center", structure: { backs: 2 } },
  { id: "b-pistol", kind: "backfield", label: "Pistol", aliases: ["PISTOL GUN"], role: "base", meaning: "quarterback 4 yards deep, back directly behind him" },
  { id: "b-gun", kind: "backfield", label: "Gun", aliases: ["SHOTGUN", "SG"], role: "base", meaning: "quarterback in the shotgun" },
  { id: "b-under-center", kind: "backfield", label: "Under Center", aliases: ["UC", "CENTER"], role: "base", meaning: "quarterback under center" },
  { id: "b-dot", kind: "backfield", label: "Dot", aliases: ["BEHIND"], role: "base", meaning: "back directly behind the quarterback in the gun" },
  { id: "b-split", kind: "backfield", label: "Split", aliases: ["SPLIT BACKS", "PRO I"], role: "base", meaning: "backs split either side of the quarterback", structure: { backs: 2 } },
  { id: "b-full-house", kind: "backfield", label: "Full House", aliases: ["FULLHOUSE"], role: "base", meaning: "three backs in the backfield", structure: { backs: 3 } },
  { id: "b-near", kind: "backfield", label: "Near", aliases: [], role: "base", meaning: "back aligned to the strength (near side)" },
  { id: "b-far", kind: "backfield", label: "Far", aliases: [], role: "base", meaning: "back aligned away from the strength (far side)" },
  { id: "b-strong", kind: "backfield", label: "Strong", aliases: ["STRONGSIDE"], role: "base", meaning: "back set to the strong side" },
  { id: "b-weak", kind: "backfield", label: "Weak", aliases: ["WEAKSIDE"], role: "base", meaning: "back set to the weak side" },
  { id: "b-left", kind: "backfield", label: "Left", aliases: [], role: "base", meaning: "back set to the left of the quarterback", structure: { side: "left" } },
  { id: "b-right", kind: "backfield", label: "Right", aliases: [], role: "base", meaning: "back set to the right of the quarterback", structure: { side: "right" } },
];

// ---- run concepts -----------------------------------------------------------

const RUNS: KnowledgeEntry[] = [
  { id: "c-inside-zone", kind: "concept", label: "Inside Zone", aliases: ["IZ", "ZONE", "I ZONE", "TIGHT ZONE", "IZONE"], role: "base", type: "run", family: "Zone", meaning: "inside zone — back reads the first down lineman" },
  { id: "c-outside-zone", kind: "concept", label: "Outside Zone", aliases: ["OZ", "WIDE ZONE", "STRETCH", "OUTSIDE"], role: "base", type: "run", family: "Zone", meaning: "outside zone — reach the edge, press and cut" },
  { id: "c-split-zone", kind: "concept", label: "Split Zone", aliases: ["SLICE", "SPLIT"], role: "base", type: "run", family: "Zone", meaning: "inside zone with the H blocking back across" },
  { id: "c-duo", kind: "concept", label: "Duo", aliases: ["DOU"], role: "base", type: "run", family: "Gap", meaning: "double teams both sides of center, no puller" },
  { id: "c-power", kind: "concept", label: "Power", aliases: ["G POWER", "GT POWER", "QB POWER", "POWER READ"], role: "base", type: "run", family: "Gap", meaning: "gap run — backside guard pulls through the hole" },
  { id: "c-counter", kind: "concept", label: "Counter", aliases: ["CTR", "COUNTER GT", "COUNTER TREY", "COUNTER BASH"], role: "base", type: "run", family: "Gap", meaning: "misdirection gap run — guard and tackle/H pull" },
  { id: "c-trap", kind: "concept", label: "Trap", aliases: ["MIDLINE TRAP"], role: "base", type: "run", family: "Gap", meaning: "let the first defender up the field, trap him from the side" },
  { id: "c-wham", kind: "concept", label: "Wham", aliases: ["INFLUENCE"], role: "base", type: "run", family: "Gap", meaning: "tight end/H wham block on an interior lineman" },
  { id: "c-iso", kind: "concept", label: "Iso", aliases: ["ISOLATION", "LEAD"], role: "base", type: "run", family: "Man", meaning: "downhill lead run, fullback on the linebacker" },
  { id: "c-dive", kind: "concept", label: "Dive", aliases: ["BLAST", "BELLY"], role: "base", type: "run", family: "Man", meaning: "quick hitter straight up inside" },
  { id: "c-sweep", kind: "concept", label: "Sweep", aliases: ["BUCK SWEEP", "BUCK"], role: "base", type: "run", family: "Perimeter", meaning: "pullers lead the back around the edge" },
  { id: "c-toss", kind: "concept", label: "Toss", aliases: ["PITCH", "ROCKET", "ROCKET TOSS"], role: "base", type: "run", family: "Perimeter", meaning: "pitch it wide and get outside fast" },
  { id: "c-jet", kind: "concept", label: "Jet", aliases: ["JET SWEEP", "FLY", "FLY SWEEP"], role: "base", type: "run", family: "Perimeter", meaning: "receiver in full motion takes it around the edge" },
  { id: "c-draw", kind: "concept", label: "Draw", aliases: ["QB DRAW", "DELAY"], role: "base", type: "run", family: "Misdirection", meaning: "show pass, hand it off late" },
  { id: "c-option", kind: "concept", label: "Option", aliases: ["SPEED OPTION", "TRIPLE OPTION", "VEER", "MIDLINE", "LOAD OPTION"], role: "base", type: "run", family: "Option", meaning: "quarterback options an unblocked defender" },
  { id: "c-zone-read", kind: "concept", label: "Zone Read", aliases: ["READ", "READ OPTION", "QB READ", "ZR"], role: "base", type: "run", family: "Option", meaning: "quarterback reads the end and keeps or gives" },
  { id: "c-pin-pull", kind: "concept", label: "Pin & Pull", aliases: ["PIN AND PULL", "PIN PULL"], role: "base", type: "run", family: "Perimeter", meaning: "pin the down men inside, pull the uncovered linemen" },
  { id: "c-sneak", kind: "concept", label: "Sneak", aliases: ["QB SNEAK"], role: "base", type: "run", family: "Short Yardage", meaning: "quarterback sneak" },
  { id: "c-kneel", kind: "concept", label: "Kneel", aliases: ["VICTORY", "TAKE A KNEE"], role: "base", type: "run", family: "Clock", meaning: "kneel down" },
  // run-game modifiers
  { id: "c-kick", kind: "concept", label: "Kick", aliases: ["KICK OUT", "KICKOUT"], role: "modifier", type: "run", family: "Blocking", meaning: "kick-out block on the edge defender" },
  { id: "c-crack", kind: "concept", label: "Crack", aliases: ["CRACK TOSS"], role: "modifier", type: "run", family: "Blocking", meaning: "receiver cracks inside, someone else kicks the edge" },
  { id: "c-bash", kind: "concept", label: "Bash", aliases: ["BACK AWAY"], role: "modifier", type: "run", family: "Option", meaning: "back runs away from the quarterback's read" },
];

// ---- pass concepts ----------------------------------------------------------

const PASSES: KnowledgeEntry[] = [
  { id: "c-mesh", kind: "concept", label: "Mesh", aliases: ["MESH RAIL", "MESH SIT"], role: "base", type: "pass", family: "Crossing", meaning: "two shallow crossers rubbing under the linebackers" },
  { id: "c-drive", kind: "concept", label: "Drive", aliases: ["SHALLOW", "SHALLOW CROSS"], role: "base", type: "pass", family: "Crossing", meaning: "shallow cross under a dig from the other side" },
  { id: "c-post-cross", kind: "concept", label: "Post Cross", aliases: ["POST WHEEL", "YANKEE", "CROSS"], role: "base", type: "pass", family: "Crossing", meaning: "deep post with a crosser underneath it" },
  { id: "c-y-cross", kind: "concept", label: "Y Cross", aliases: ["Y SAIL", "CROSS COUNTRY"], role: "base", type: "pass", family: "Crossing", meaning: "tight end crosses deep behind the linebackers" },
  { id: "c-smash", kind: "concept", label: "Smash", aliases: ["CHINA"], role: "base", type: "pass", family: "High-Low", meaning: "hitch under a corner route — high/low on the corner" },
  { id: "c-snag", kind: "concept", label: "Snag", aliases: ["SPOT", "TRIANGLE"], role: "base", type: "pass", family: "High-Low", meaning: "spot/snag triangle: slide, corner, flat" },
  { id: "c-sail", kind: "concept", label: "Sail", aliases: ["FLOOD", "3 LEVEL", "THREE LEVEL"], role: "base", type: "pass", family: "Flood", meaning: "3-level flood: deep, out, and flat to one side" },
  { id: "c-verts", kind: "concept", label: "Verts", aliases: ["FOUR VERTS", "4 VERTS", "VERTICALS", "SEAMS", "SEAM"], role: "base", type: "pass", family: "Vertical", meaning: "four vertical releases stretching the deep zones" },
  { id: "c-levels", kind: "concept", label: "Levels", aliases: ["IN CONCEPT"], role: "base", type: "pass", family: "Horizontal", meaning: "two in-breakers at different depths" },
  { id: "c-dagger", kind: "concept", label: "Dagger", aliases: ["SEAM DIG"], role: "base", type: "pass", family: "Vertical", meaning: "clear-out seam with a dig behind it" },
  { id: "c-stick", kind: "concept", label: "Stick", aliases: ["STICK NOD"], role: "base", type: "pass", family: "Quick", meaning: "quick stick to the flat defender's conflict" },
  { id: "c-slant", kind: "concept", label: "Slant", aliases: ["SLANT FLAT", "SLANT ARROW"], role: "base", type: "pass", family: "Quick", meaning: "quick slant, usually with a flat route under it" },
  { id: "c-spacing", kind: "concept", label: "Spacing", aliases: ["SPACE"], role: "base", type: "pass", family: "Quick", meaning: "hitches spaced across the underneath zones" },
  { id: "c-curl-flat", kind: "concept", label: "Curl Flat", aliases: ["CURL", "HOOK FLAT"], role: "base", type: "pass", family: "High-Low", meaning: "curl with a flat route stretching the underneath defender" },
  { id: "c-hitch", kind: "concept", label: "Hitch", aliases: ["STOP", "NOW"], role: "base", type: "pass", family: "Quick", meaning: "quick hitch off the snap" },
  { id: "c-fade", kind: "concept", label: "Fade", aliases: ["GO", "STREAK", "9 ROUTE"], role: "base", type: "pass", family: "Vertical", meaning: "outside vertical over the top of the corner" },
  { id: "c-comeback", kind: "concept", label: "Comeback", aliases: ["CB ROUTE"], role: "base", type: "pass", family: "Vertical", meaning: "push vertical then break back to the sideline" },
  { id: "c-out", kind: "concept", label: "Out", aliases: ["SPEED OUT", "OUTS"], role: "base", type: "pass", family: "Horizontal", meaning: "breaking out to the sideline" },
  { id: "c-corner", kind: "concept", label: "Corner", aliases: ["7 ROUTE", "FLAG"], role: "base", type: "pass", family: "Vertical", meaning: "corner route to the sideline over the flat defender" },
  { id: "c-wheel", kind: "concept", label: "Wheel", aliases: ["WHEEL POST"], role: "base", type: "pass", family: "Vertical", meaning: "back or slot turns up the sideline" },
  { id: "c-hot", kind: "concept", label: "Hot", aliases: ["Y HOT", "SIGHT", "SIGHT ADJUST"], role: "base", type: "pass", family: "Answer", meaning: "quick answer replacing a blitzing defender" },
  { id: "c-waggle", kind: "concept", label: "Waggle", aliases: ["BOOT", "BOOTLEG", "NAKED", "KEEP PASS"], role: "base", type: "pass", family: "Movement", meaning: "fake the run, quarterback off the edge with a 3-level read" },
  { id: "c-sprint", kind: "concept", label: "Sprint Out", aliases: ["SPRINT", "ROLL", "ROLLOUT"], role: "base", type: "pass", family: "Movement", meaning: "quarterback sprints one way and throws on the move" },
  { id: "c-play-action", kind: "concept", label: "Play Action", aliases: ["PA", "PLAY PASS", "PAP"], role: "base", type: "pass", family: "Movement", meaning: "run fake first, throw behind it" },
  { id: "c-dropback", kind: "concept", label: "Dropback", aliases: ["DROP BACK", "STRAIGHT DROP"], role: "base", type: "pass", family: "Dropback", meaning: "straight dropback pass" },
  { id: "c-screen", kind: "concept", label: "Screen", aliases: ["QUICK SCREEN", "TUNNEL", "JAILBREAK", "SLIP SCREEN", "RB SCREEN", "SMOKE"], role: "base", type: "screen", family: "Screen", meaning: "screen — let them come, block it out in front" },
  { id: "c-bubble", kind: "concept", label: "Bubble", aliases: ["BUBBLE SCREEN"], role: "base", type: "screen", family: "Screen", meaning: "bubble screen to the slot" },
  { id: "c-rpo", kind: "concept", label: "RPO", aliases: ["RUN PASS OPTION", "POP", "POP PASS", "GLANCE"], role: "base", type: "rpo", family: "RPO", meaning: "run-pass option — the quarterback reads a defender post-snap" },
  { id: "c-trick", kind: "concept", label: "Trick", aliases: ["REVERSE", "FLEA FLICKER", "DOUBLE PASS", "THROWBACK", "SPECIAL"], role: "base", type: "pass", family: "Trick", meaning: "trick play — reverse action or a second throw" },
  { id: "c-spike", kind: "concept", label: "Spike", aliases: ["CLOCK"], role: "base", type: "pass", family: "Clock", meaning: "spike to stop the clock" },
];

export const KNOWLEDGE: KnowledgeEntry[] = [...FORMATIONS, ...BACKFIELDS, ...RUNS, ...PASSES];

// ---- matching ---------------------------------------------------------------

/** Film boards are messy: "Twins Open SLOT", "PRO OFF TWINS", "duo-kick". */
export const normalizeTerm = (s: string) =>
  (s ?? "").toUpperCase().replace(/[^A-Z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();

// Words that carry no football meaning on their own. ("On" and "Off" DO — they
// tell us whether the tight end is on the line — so they are not in here.)
const STOP = new Set(["AND", "THE", "TO", "A", "OF", "OR", "VS", "WITH"]);

const INDEX = new Map<string, KnowledgeEntry>();
// A second index per kind, so a BACKFIELD tag of "LEFT" reads as the back's
// alignment rather than the formation's.
const INDEX_BY_KIND = new Map<TermKind, Map<string, KnowledgeEntry>>();
for (const e of KNOWLEDGE) {
  const byKind = INDEX_BY_KIND.get(e.kind) ?? new Map<string, KnowledgeEntry>();
  INDEX_BY_KIND.set(e.kind, byKind);
  for (const alias of [e.label, ...e.aliases]) {
    const key = normalizeTerm(alias);
    if (!key) continue;
    if (!INDEX.has(key)) INDEX.set(key, e);
    if (!byKind.has(key)) byKind.set(key, e);
  }
}

const look = (key: string, kindHint?: TermKind) =>
  (kindHint ? INDEX_BY_KIND.get(kindHint)?.get(key) : undefined) ?? INDEX.get(key);

export const knowledgeById = (id: string) => KNOWLEDGE.find((e) => e.id === id) ?? null;

export type TermMatch = {
  kind: TermKind;
  knowledgeId: string;
  label: string;
  meaning: string;
  entries: KnowledgeEntry[];
  /** Words in the tag we could not account for — these are what we ask about. */
  unknownWords: string[];
  /** True when the whole tag was understood. */
  exact: boolean;
};

const buildMatch = (used: KnowledgeEntry[], unknown: string[], kindHint?: TermKind): TermMatch | null => {
  if (!used.length) return null;
  const primary =
    (kindHint && used.find((e) => e.kind === kindHint && e.role === "base")) ??
    used.find((e) => e.role === "base") ??
    (kindHint && used.find((e) => e.kind === kindHint)) ??
    used[0];
  return {
    kind: primary.kind,
    knowledgeId: primary.id,
    label: used.map((e) => e.label).join(" "),
    meaning: used.map((e) => e.meaning).join(" · "),
    entries: used,
    unknownWords: unknown,
    exact: unknown.length === 0,
  };
};

/**
 * Alias-tolerant read of an opponent tag. Whole-tag alias first, then a greedy
 * left-to-right pass so composite tags resolve from their parts:
 *   "DEUCE STACK"    -> Deuce + Stack
 *   "PRO OPEN SLOT"  -> Pro + Open + Slot
 *   "UTAH"           -> null (that one is theirs — we have to ask)
 */
export function matchTerm(text: string, kindHint?: TermKind): TermMatch | null {
  const t = normalizeTerm(text);
  if (!t) return null;
  const direct = look(t, kindHint);
  if (direct) return buildMatch([direct], [], kindHint);

  const words = t.split(" ");
  const used: KnowledgeEntry[] = [];
  const unknown: string[] = [];
  let i = 0;
  while (i < words.length) {
    let hit: KnowledgeEntry | undefined;
    let len = 1;
    for (const L of [3, 2, 1]) {
      if (i + L > words.length) continue;
      const found = look(words.slice(i, i + L).join(" "), kindHint);
      if (found) {
        hit = found;
        len = L;
        break;
      }
    }
    if (hit) {
      if (!used.includes(hit)) used.push(hit);
      i += len;
    } else {
      const w = words[i];
      if (!STOP.has(w) && !/^\d+$/.test(w)) unknown.push(w);
      i += 1;
    }
  }
  return buildMatch(used, unknown, kindHint);
}

// ---- resolving a tag against the coach's own dictionary ---------------------

export type ResolvedTerm = {
  term: string; // normalized raw tag
  source: "coach" | "knowledge" | "unknown";
  kind: TermKind;
  label: string | null;
  /** Plain-football meaning to show next to the raw tag, or null. */
  meaning: string | null;
  knowledgeId?: string;
  /** What we still can't account for — empty when fully resolved. */
  unknownWords: string[];
};

const findMapping = (termMap: TermMapping[], term: string) => {
  const key = normalizeTerm(term);
  return termMap.find((m) => normalizeTerm(m.term) === key) ?? null;
};

/**
 * The coach's dictionary first, then standard football, then honestly unknown.
 * Anything the coach taught us always wins — his words are the team's words.
 */
export function resolveTag(term: string, termMap: TermMapping[] = [], kindHint?: TermKind): ResolvedTerm {
  const t = normalizeTerm(term);
  const empty: ResolvedTerm = { term: t, source: "unknown", kind: kindHint ?? "other", label: null, meaning: null, unknownWords: [] };
  if (!t) return empty;

  const taught = findMapping(termMap, t);
  if (taught) {
    const entry = taught.knowledgeId ? knowledgeById(taught.knowledgeId) : null;
    return {
      term: t,
      source: "coach",
      kind: taught.kind,
      label: entry?.label ?? taught.meaning,
      meaning: taught.meaning || entry?.meaning || null,
      knowledgeId: taught.knowledgeId,
      unknownWords: [],
    };
  }

  const match = matchTerm(t, kindHint);
  if (match) {
    // A word we don't know may still be one the coach has already taught us.
    const extra: string[] = [];
    const stillUnknown: string[] = [];
    for (const w of match.unknownWords) {
      const m = findMapping(termMap, w);
      if (m) extra.push(`${m.term}: ${m.meaning}`);
      else stillUnknown.push(w);
    }
    return {
      term: t,
      source: "knowledge",
      kind: match.kind,
      label: match.label,
      meaning: [match.meaning, ...extra].join(" · "),
      knowledgeId: match.knowledgeId,
      unknownWords: stillUnknown,
    };
  }

  // Nothing standard in it — but the coach may have taught some of the words.
  const words = t.split(" ").filter((w) => !STOP.has(w) && !/^\d+$/.test(w));
  const taughtWords = words.map((w) => findMapping(termMap, w));
  if (taughtWords.some(Boolean)) {
    const known = taughtWords.filter((m): m is TermMapping => !!m);
    const missing = words.filter((w, i) => !taughtWords[i]);
    return {
      term: t,
      source: "coach",
      kind: known[0].kind,
      label: known.map((m) => m.term).join(" "),
      meaning: known.map((m) => m.meaning).join(" · "),
      knowledgeId: known[0].knowledgeId,
      unknownWords: missing,
    };
  }
  return { ...empty, kind: kindHint ?? "other", unknownWords: [t] };
}

/** The short parenthetical the report shows next to a raw tag. */
export function shortMeaning(r: ResolvedTerm | null, max = 72): string | null {
  if (!r || !r.meaning) return null;
  const m = r.meaning.trim();
  return m.length > max ? `${m.slice(0, max - 1).trimEnd()}…` : m;
}

/**
 * Read a coach's answer to "What does X mean?" — "Utah is Trips with the TE on",
 * "Dallas = Snag", "it means bunch left". The football words get matched against
 * the knowledge base; the coach's own sentence is what we keep as the meaning.
 */
export function parseTermAnswer(term: string, answer: string, kindHint?: TermKind) {
  const raw = (answer ?? "").trim().replace(/\s+/g, " ");
  const stripped = raw
    .replace(new RegExp(`^\\s*${normalizeTerm(term).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*`, "i"), "")
    .replace(/^(?:is|means|=|:|stands for|it'?s|that'?s|we call)\s+/i, "")
    .replace(/^(?:our|their|the|a|an)\s+/i, "")
    .replace(/[.!]+$/, "")
    .trim();
  const text = stripped || raw;
  const match = matchTerm(text, kindHint);
  const meaning = text || raw;
  return {
    term: normalizeTerm(term),
    meaning,
    kind: (match?.kind ?? kindHint ?? "other") as TermKind,
    knowledgeId: match?.knowledgeId,
    match,
  };
}
