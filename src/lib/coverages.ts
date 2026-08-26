// Detailed Match Coverage Library — from the coach's spec PDF
// "Detailed_Match_Coverage_Library.pdf" (Aug 2026).
// Every defender's responsibility is defined in this order:
// Alignment → Help → Leverage → Initial Key → Release Rule → Communication → Match/Pass → Next Threat.

export const COVERAGE_FAMILIES = [
  "Man",
  "Single-High Match",
  "Two-High Match",
  "Split-Field",
  "Trips Adjustments",
  "Techniques",
  "Brackets & Tools",
] as const;
export type CoverageFamily = (typeof COVERAGE_FAMILIES)[number];

export type CoverageRole = {
  position: string;
  alignment?: string;
  help?: string;
  leverage?: string;
  key?: string;
  rules: string[];
};

export type Coverage = {
  id: string;
  num: number;
  name: string;
  family: CoverageFamily;
  summary: string;
  roles: CoverageRole[];
};

export const RECEIVER_NUMBERING = [
  { label: "#1", meaning: "Widest eligible receiver" },
  { label: "#2", meaning: "Second eligible receiver from the sideline" },
  { label: "#3", meaning: "Third eligible receiver from the sideline" },
];

// "Master Software Rule" — every coverage responsibility should contain the same information.
export const MASTER_RULE_FIELDS = [
  { field: "Alignment", question: "Where do I line up?" },
  { field: "Help", question: "Where is my help?" },
  { field: "Leverage", question: "What am I taking away?" },
  { field: "Funnel", question: "Where am I forcing the receiver?" },
  { field: "Initial Key", question: "Who do my eyes start on?" },
  { field: "Vertical", question: "What happens if he goes vertical?" },
  { field: "Out", question: "What happens if he goes outside?" },
  { field: "Under", question: "What happens if he goes underneath?" },
  { field: "Communication", question: "What call changes the distribution?" },
  { field: "Match", question: "When does the receiver become mine?" },
  { field: "Pass", question: "When am I allowed to release him?" },
  { field: "Next Key", question: "Where do my eyes go after I release him?" },
  { field: "Final Responsibility", question: "After the routes distribute, who/what am I actually defending?" },
];

// Worked example from the PDF — Cover 3 Match Overhang through the master rule.
export const MASTER_RULE_EXAMPLE = {
  title: "Example — Cover 3 Match Overhang",
  rows: [
    ["Alignment", "4–6 yard apex between #2 and the box"],
    ["Help", "Inside / post"],
    ["Leverage", "Outside #2"],
    ["Funnel", "Inside toward help"],
    ["Initial Key", "#2"],
    ["#2 Vertical", "Match #2"],
    ["#2 Out", "Match #2"],
    ["#2 Under", "Pass #2 inside"],
    ["Communication", "Alert for UNDER call from #1"],
    ["After #2 Under", "Work Curl/Flat"],
    ["Next Key", "#1"],
    ["Next Progression", "Back down to #3"],
    ["Eyes", "2 → 1 → 3"],
  ],
  core:
    "2 vertical or out = match 2. 2 under = pass it, work to 1, then back down to 3. If 1 goes under, the corner gives the UNDER call and the distribution adjusts.",
};

export const COVERAGES: Coverage[] = [
  {
    id: "cover-0",
    num: 1,
    name: "Cover 0",
    family: "Man",
    summary: "Pure man coverage with no deep safety help.",
    roles: [
      {
        position: "Corners",
        alignment: "Press or off based on the call. If off, typically 5–7 yards over the assigned receiver.",
        help: "None.",
        leverage: "Protect the top shoulder first. Inside/outside leverage can be determined by pressure design.",
        key: "Assigned receiver.",
        rules: [
          "Receiver vertical → Match.",
          "Receiver outside → Match.",
          "Receiver inside → Match.",
          "Receiver under → Match.",
          "Receiver motions → Travel or bump based on call.",
          "There is no passing the receiver.",
        ],
      },
      {
        position: "Nickel / Overhang",
        alignment: "Apex or directly over assigned receiver depending on formation and pressure.",
        help: "None.",
        leverage: "Protect top shoulder first.",
        key: "Assigned receiver.",
        rules: ["Match everywhere."],
      },
      {
        position: "Linebacker",
        alignment: "Normal box alignment unless pressure or matchup changes it.",
        key: "Assigned RB/TE.",
        rules: ["Match assigned receiver everywhere."],
      },
    ],
  },
  {
    id: "cover-1",
    num: 2,
    name: "Cover 1 — Man Free",
    family: "Man",
    summary: "Man coverage underneath with one post safety.",
    roles: [
      {
        position: "Corners",
        alignment: "Press or 5–7 yards off #1 depending on the call.",
        help: "Post safety inside.",
        leverage: "Outside/top shoulder. Take away outside access and funnel #1 toward the post.",
        key: "#1.",
        rules: [
          "#1 vertical → Match.",
          "#1 outside → Match.",
          "#1 inside → Match while maintaining outside leverage.",
          "#1 under → Match.",
          "Motion → Travel/bump based on call.",
        ],
      },
      {
        position: "Nickel / Overhang",
        alignment: "Apex #2 and the box or align directly over #2 depending on formation.",
        help: "Post safety inside.",
        leverage: "Outside/top shoulder.",
        key: "#2.",
        rules: ["Match #2 everywhere."],
      },
      {
        position: "Linebacker",
        alignment: "Box alignment with enough depth/leverage to handle assigned back or TE.",
        help: "Post safety/inside coverage structure.",
        key: "Assigned receiver.",
        rules: ["Match everywhere."],
      },
      {
        position: "Post Safety",
        alignment:
          "Approximately 10–12+ yards deep in the middle of the formation. Depth adjusts to offensive speed and situation.",
        help: "He is the primary inside/deep help.",
        leverage: "Inside/top-down.",
        key: "QB through vertical receiver distribution.",
        rules: [
          "Stay deeper than deepest.",
          "Overlap verticals.",
          "Help posts, seams, digs and overs when possible.",
          "Do not remove the inside help underneath defenders are funneling toward.",
        ],
      },
    ],
  },
  {
    id: "cover-1-robber",
    num: 3,
    name: "Cover 1 Robber",
    family: "Man",
    summary: "Cover 1 man rules with an added low-hole robber.",
    roles: [
      {
        position: "Corners / Man Defenders",
        alignment: "Same as Cover 1.",
        help: "Post safety high + robber inside/low.",
        leverage: "Outside/top shoulder.",
        key: "Assigned receiver.",
        rules: ["Match everywhere and funnel inside."],
      },
      {
        position: "Robber",
        alignment: "Approximately 5–8 yards inside the formation depending on personnel and formation.",
        help: "Post safety behind him.",
        leverage: "Inside/underneath.",
        key: "QB through inside receiver distribution.",
        rules: [
          "Cut crossers.",
          "Rob digs, glance routes and overs.",
          "Look for routes being funneled toward you.",
          "Do not chase routes outside your leverage.",
        ],
      },
      {
        position: "Post Safety",
        alignment: "10–12+ yards middle of field.",
        key: "Deepest threats.",
        rules: ["Maintain top-down help."],
      },
    ],
  },
  {
    id: "cover-1-cone",
    num: 4,
    name: "Cover 1 Cone / Double",
    family: "Man",
    summary: "One receiver is bracketed while the rest play Cover 1 principles.",
    roles: [
      {
        position: "Non-Bracket Defenders",
        alignment: "Normal Cover 1 alignment.",
        leverage: "Outside/top shoulder.",
        rules: ["Match assigned receiver."],
      },
      {
        position: "Low / Outside Bracket Defender",
        alignment: "4–7 yards with outside leverage on bracketed receiver.",
        leverage: "Outside/underneath.",
        key: "Bracketed receiver.",
        rules: ["Take away underneath/outside access."],
      },
      {
        position: "High / Inside Bracket Defender",
        alignment: "8–12 yards inside/top of bracketed receiver.",
        leverage: "Inside/top-down.",
        key: "Bracketed receiver.",
        rules: ["Take away inside/vertical access.", "Squeeze the receiver between both defenders."],
      },
    ],
  },
  {
    id: "cover-2-match",
    num: 5,
    name: "Cover 2 Match",
    family: "Two-High Match",
    summary: "Two-high match coverage — not spot-drop Cover 2.",
    roles: [
      {
        position: "Corner",
        alignment: "Approximately 4–6 yards outside-shade of #1. Can press depending on call.",
        help: "Safety inside/top.",
        leverage: "Outside/underneath.",
        key: "#2 through #1.",
        rules: [
          "#2 vertical → Safety matches #2; corner works #1.",
          "#2 out → Drive/match #2 according to route depth; safety works over #1.",
          "#2 under → Pass #2; work immediately to #1.",
          "Eye progression: 2 → 1.",
        ],
      },
      {
        position: "Safety",
        alignment: "Approximately 10–12 yards deep, generally over/inside #2.",
        help: "Corner outside/underneath.",
        leverage: "Inside/top-down.",
        key: "#2.",
        rules: [
          "#2 vertical → Match #2.",
          "#2 out → Communicate and work over #1.",
          "#2 under → Pass and work #1.",
        ],
      },
      {
        position: "Inside Defender",
        alignment: "Box/apex based on formation.",
        key: "Inside receiver distribution.",
        rules: [
          "Match routes entering inside responsibility.",
          "Receive underneath routes passed by outside defenders.",
          "Communicate changes in distribution.",
        ],
      },
    ],
  },
  {
    id: "tampa-2-match",
    num: 6,
    name: "Tampa 2 Match",
    family: "Two-High Match",
    summary: "Two-high match structure with the Mike becoming a vertical match player.",
    roles: [
      {
        position: "Mike",
        alignment: "Approximately 4–6 yards over the ball/interior box.",
        leverage: "Underneath/inside.",
        key: "#3 / middle vertical threat.",
        rules: [
          "#3 vertical → Carry/match #3.",
          "#3 under → Pass based on direction and find next middle threat.",
          "#3 out → Communicate/push and work next inside threat.",
          "The Mike is not simply running to a landmark.",
        ],
      },
    ],
  },
  {
    id: "2-man",
    num: 7,
    name: "2-Man",
    family: "Man",
    summary: "Man underneath with two safeties over the top.",
    roles: [
      {
        position: "Corners / Man Defenders",
        alignment: "Press or 5–7 yards off assigned receiver.",
        help: "Safety over the top.",
        leverage: "Underneath; inside/outside leverage determined by safety and formation.",
        key: "Assigned receiver.",
        rules: ["Match everywhere while staying underneath the receiver."],
      },
      {
        position: "Safeties",
        alignment: "10–14 yards deep, each responsible for helping over his half.",
        leverage: "Top-down.",
        key: "Receiver distribution/QB.",
        rules: ["Stay over vertical threats and overlap man defenders."],
      },
    ],
  },
  {
    id: "palms-2-read",
    num: 8,
    name: "Palms / 2-Read",
    family: "Two-High Match",
    summary: "Two-high pattern-match coverage.",
    roles: [
      {
        position: "Corner",
        alignment: "4–6 yards, outside shade of #1.",
        help: "Safety inside/top.",
        leverage: "Outside/underneath.",
        key: "#2 through #1.",
        rules: [
          "#2 out → Drive/match #2.",
          "#2 vertical → Safety takes #2; work #1.",
          "#2 under → Pass; work #1.",
        ],
      },
      {
        position: "Safety",
        alignment: "10–12 yards, over/inside #2.",
        leverage: "Inside/top-down.",
        key: "#2.",
        rules: [
          "#2 vertical → Match.",
          "#2 out → Corner takes; overlap #1.",
          "#2 under → Pass; work #1.",
        ],
      },
      {
        position: "Overhang / Inside Defender",
        alignment: "Apex based on #2 and box.",
        key: "#2/#3 distribution.",
        rules: ["Receive routes pushed inside and replace based on distribution."],
      },
    ],
  },
  {
    id: "2-trap",
    num: 9,
    name: "2-Trap",
    family: "Two-High Match",
    summary: "Match/trap concept designed to attack an outside underneath throw.",
    roles: [
      {
        position: "Trap Corner",
        alignment: "4–6 yards with outside leverage. Alignment should disguise the trap.",
        leverage: "Outside/underneath.",
        key: "#2 through #1.",
        rules: ["Trigger aggressively on the designated outside route."],
      },
      {
        position: "Safety",
        alignment: "10–12 yards over/inside #2.",
        leverage: "Inside/top-down.",
        rules: ["Replace corner over #1 when corner triggers."],
      },
    ],
  },
  {
    id: "cover-3-match",
    num: 10,
    name: "Cover 3 Match",
    family: "Single-High Match",
    summary: "One-high match coverage. No defender is simply dropping to a landmark.",
    roles: [
      {
        position: "Corner",
        alignment: "Approximately 6–8 yards over/outside shade of #1. Can press-bail depending on call.",
        help: "Post safety inside.",
        leverage: "Outside/top shoulder.",
        key: "#1.",
        rules: [
          "#1 vertical → Match #1 and funnel toward post help.",
          "#1 outside → Match #1 and maintain outside leverage.",
          "#1 under → Give UNDER! UNDER!, pass #1 into underneath distribution, zone off and find the next vertical threat.",
        ],
      },
      {
        position: "Overhang",
        alignment:
          "Apex between #2 and the end man/box; approximately 4–6 yards deep with width adjusted to #2's split.",
        help: "Inside/post structure.",
        leverage: "Outside leverage on #2.",
        key: "#2.",
        rules: [
          "#2 vertical → MATCH #2. Carry him vertically.",
          "#2 out → MATCH #2. Expand with out, speed out, flat or wheel progression.",
          "#2 under → Communicate/pass #2 inside. Do not chase across the formation.",
          "After #2 under, work Curl/Flat by progression — not by dropping to grass.",
          "Eye progression: 2 → 1 → 3.",
          "If #1 goes under, hear the corner's UNDER call and adjust the distribution.",
        ],
      },
      {
        position: "Post Safety",
        alignment:
          "Approximately 10–14 yards deep in the middle of the formation; adjust for speed, down/distance, formation, hash and tendency.",
        help: "He is the inside/deep help.",
        leverage: "Inside/top-down.",
        key: "QB through vertical distribution.",
        rules: [
          "Stay deeper than deepest.",
          "Overlap seams, posts, digs, deep overs and inside verticals.",
          "Outside defenders are intentionally funneling receivers toward him.",
        ],
      },
      {
        position: "Inside Defender",
        alignment: "Approximately 4–5 yards in the box, adjusted to #3.",
        key: "#3.",
        rules: [
          "#3 vertical → Carry/match #3 based on the call and post help.",
          "#3 under → Match/pass according to direction and coverage rules.",
          "#3 out → Communicate/push #3 toward the overhang, then find the next inside threat.",
        ],
      },
    ],
  },
  {
    id: "cover-3-sky",
    num: 11,
    name: "Cover 3 Sky Match",
    family: "Single-High Match",
    summary: "Cover 3 Match with a safety rotating down to become the overhang.",
    roles: [
      {
        position: "Corner",
        alignment: "6–8 yards outside shade #1.",
        leverage: "Outside/top shoulder.",
        key: "#1.",
        rules: ["Use normal Cover 3 Match corner rules."],
      },
      {
        position: "Rotating Safety / Overhang",
        alignment:
          "Starts from safety depth for disguise, then rotates toward a 4–6 yard apex between #2 and the box.",
        key: "#2.",
        rules: [
          "#2 vertical → Match #2.",
          "#2 out → Match #2.",
          "#2 under → Pass → Work #1 → Back to #3.",
        ],
      },
      {
        position: "Post Safety",
        alignment: "Rotate to middle field at approximately 10–14 yards.",
        rules: ["Provide inside/top-down help."],
      },
    ],
  },
  {
    id: "cover-3-cloud",
    num: 12,
    name: "Cover 3 Cloud Match",
    family: "Single-High Match",
    summary: "Cloud corner plays underneath while safety rotates over him.",
    roles: [
      {
        position: "Cloud Corner",
        alignment: "Press or 4–6 yards outside #1.",
        leverage: "Outside/underneath.",
        key: "#1/#2 distribution.",
        rules: ["Control outside underneath routes while safety replaces vertically."],
      },
      {
        position: "Rotating Safety",
        alignment: "10–12 yards pre-snap, rotating over #1.",
        leverage: "Inside/top-down.",
        rules: ["Match the vertical threat replacing the cloud corner."],
      },
      {
        position: "Opposite Corner",
        alignment: "6–8 yards outside #1.",
        leverage: "Outside/top shoulder.",
        rules: ["Normal Cover 3 Match rules."],
      },
    ],
  },
  {
    id: "cover-3-buzz",
    num: 13,
    name: "Cover 3 Buzz Match",
    family: "Single-High Match",
    summary: "Safety rotates inside underneath instead of becoming the primary outside overhang.",
    roles: [
      {
        position: "Corners",
        alignment: "6–8 yards outside shade #1.",
        leverage: "Outside/top shoulder.",
        key: "#1.",
        rules: [],
      },
      {
        position: "Buzz Safety",
        alignment: "Begin 10–12 yards deep and rotate into approximately 5–8 yards inside.",
        leverage: "Inside/underneath.",
        key: "Inside receiver distribution.",
        rules: ["Look for dig, crosser, glance, over and #3 distribution."],
      },
      {
        position: "Post Safety",
        alignment: "10–14 yards middle field.",
        rules: ["Stay top-down."],
      },
    ],
  },
  {
    id: "rip-liz-match",
    num: 14,
    name: "Rip/Liz Match",
    family: "Single-High Match",
    summary: "Cover 3 Match with rotation determining the Rip/Liz side.",
    roles: [
      {
        position: "Corners",
        alignment: "6–8 yards outside shade #1.",
        help: "Post safety.",
        leverage: "Outside/top shoulder.",
        key: "#1.",
        rules: [],
      },
      {
        position: "Seam / Overhang Defender",
        alignment: "Apex #2 and box at approximately 4–6 yards.",
        key: "#2.",
        rules: [
          "#2 vertical → Match.",
          "#2 out → Match.",
          "#2 under → Pass → Work #1 → Back to #3.",
          "Rotation determines Rip/Liz responsibility.",
        ],
      },
    ],
  },
  {
    id: "quarters-match",
    num: 15,
    name: "Quarters Match",
    family: "Two-High Match",
    summary: "Two-high pattern-match coverage.",
    roles: [
      {
        position: "Corner",
        alignment: "Approximately 6–8 yards over/outside shade #1.",
        help: "Safety inside.",
        leverage: "Outside/top shoulder.",
        key: "#1.",
        rules: [
          "#1 vertical → Match.",
          "#1 outside → Match.",
          "#1 under → UNDER call → Zone off/find next vertical threat.",
        ],
      },
      {
        position: "Safety",
        alignment: "Approximately 8–12 yards deep, over/inside #2.",
        help: "Corner/underneath structure outside.",
        leverage: "Inside #2.",
        key: "#2.",
        rules: [
          "#2 vertical → Match #2.",
          "#2 out → Communicate/push to underneath defender; work to #1.",
          "#2 under → Pass #2; work immediately toward #1.",
          "Eye progression: 2 → 1.",
        ],
      },
      {
        position: "Overhang",
        alignment: "Apex #2 and box approximately 4–6 yards deep.",
        key: "#2 through #3.",
        rules: [
          "#2 out → Expand/match #2.",
          "#2 vertical → Safety takes #2; work underneath distribution.",
          "#2 under → Communicate/pass and find next threat.",
        ],
      },
    ],
  },
  {
    id: "mod",
    num: 16,
    name: "MOD — Man Outside & Deep",
    family: "Techniques",
    summary: "Quarters corner technique.",
    roles: [
      {
        position: "Corner",
        alignment: "6–8 yards outside shade #1.",
        help: "Safety inside.",
        leverage: "Outside/top shoulder.",
        key: "#1.",
        rules: ["Match #1 outside and deep unless his release removes him according to MOD rules."],
      },
    ],
  },
  {
    id: "meg",
    num: 17,
    name: "MEG — Man Everywhere He Goes",
    family: "Techniques",
    summary: "Locked man technique within a match structure.",
    roles: [
      {
        position: "Corner",
        alignment: "Press or off based on call.",
        help: "Depends on coverage.",
        leverage: "Determined by location of help.",
        key: "#1.",
        rules: ["Man Everywhere He Goes. No route distribution changes the matchup."],
      },
    ],
  },
  {
    id: "special-solo",
    num: 18,
    name: "Special / Solo — Trips",
    family: "Trips Adjustments",
    summary: "Quarters adjustment against 3x1.",
    roles: [
      {
        position: "Trips Corner",
        alignment: "6–8 yards outside shade #1.",
        leverage: "Outside/top shoulder.",
        key: "#1.",
        rules: [],
      },
      {
        position: "Trips Safety",
        alignment: "8–12 yards over/inside #2.",
        key: "#2.",
        rules: ["Match #2 based on Quarters distribution."],
      },
      {
        position: "Backside / Poach Safety",
        alignment: "10–12 yards with enough inside leverage to see #3 and backside #1.",
        key: "#3 through backside threat.",
        rules: ["Help/match #3 vertical according to call."],
      },
      {
        position: "Backside Corner",
        alignment: "Press or off #1.",
        leverage: "Based on remaining safety help.",
        rules: ["Usually MEG/MOD based on the specific call."],
      },
    ],
  },
  {
    id: "poach",
    num: 19,
    name: "Poach",
    family: "Trips Adjustments",
    summary: "Backside safety helps match #3 from Trips.",
    roles: [
      {
        position: "Trips Corner",
        alignment: "6–8 yards outside #1.",
        leverage: "Outside/top shoulder.",
        rules: [],
      },
      {
        position: "Trips Safety",
        alignment: "8–12 yards over #2.",
        key: "#2.",
        rules: [],
      },
      {
        position: "Poach Safety",
        alignment: "Approximately 10–12 yards backside with eyes through #3.",
        leverage: "Inside/top-down.",
        key: "#3.",
        rules: [
          "#3 vertical → Poach/match #3.",
          "#3 under/out → Communicate and work back toward backside threat according to the call.",
        ],
      },
      {
        position: "Backside Corner",
        alignment: "Press or off #1.",
        rules: ["Usually isolated MEG/MOD."],
      },
    ],
  },
  {
    id: "box",
    num: 20,
    name: "Box",
    family: "Brackets & Tools",
    summary: "Four defenders surround and distribute two receiver threats.",
    roles: [
      {
        position: "Outside Low Defender",
        alignment: "4–6 yards outside.",
        leverage: "Outside/underneath.",
        rules: [],
      },
      {
        position: "Inside Low Defender",
        alignment: "4–6 yards inside.",
        leverage: "Inside/underneath.",
        rules: [],
      },
      {
        position: "Outside High Defender",
        alignment: "8–12 yards outside/top.",
        leverage: "Outside/top-down.",
        rules: [],
      },
      {
        position: "Inside High Defender",
        alignment: "8–12 yards inside/top.",
        leverage: "Inside/top-down.",
        rules: [
          "Do not declare static man assignments pre-snap.",
          "Distribute the two receivers based on release.",
          "Match the threat entering your leverage.",
        ],
      },
    ],
  },
  {
    id: "cover-6",
    num: 21,
    name: "Cover 6 — Quarter-Quarter-Half Match",
    family: "Split-Field",
    summary: "Split-field match: Quarters on one side, Palms/Half principles on the other.",
    roles: [
      {
        position: "Quarters Side — Corner",
        alignment: "6–8 yards outside #1.",
        leverage: "Outside/top shoulder.",
        key: "#1.",
        rules: [],
      },
      {
        position: "Quarters Side — Safety",
        alignment: "8–12 yards over/inside #2.",
        leverage: "Inside.",
        key: "#2.",
        rules: [],
      },
      {
        position: "Quarters Side — Overhang",
        alignment: "4–6 yard apex.",
        key: "#2/#3.",
        rules: ["Use normal Quarters Match rules."],
      },
      {
        position: "Palms / Half Side — Corner",
        alignment: "4–6 yards outside #1.",
        leverage: "Outside/underneath.",
        key: "#2 through #1.",
        rules: [],
      },
      {
        position: "Palms / Half Side — Safety",
        alignment: "10–12 yards over/inside #2.",
        leverage: "Inside/top-down.",
        key: "#2.",
        rules: ["Use Palms Match rules."],
      },
    ],
  },
  {
    id: "cover-8",
    num: 22,
    name: "Cover 8",
    family: "Split-Field",
    summary: "Alignment follows whichever match structure is being played to each side.",
    roles: [
      {
        position: "Quarters Side",
        rules: [
          "CB → 6–8 yards outside #1",
          "Safety → 8–12 yards over/inside #2",
          "Overhang → 4–6 yard apex",
        ],
      },
      {
        position: "Palms Side",
        rules: [
          "CB → 4–6 yards outside #1",
          "Safety → 10–12 yards over/inside #2",
          "Overhang → Apex based on #2/#3",
          "All responsibilities follow the corresponding match rules.",
        ],
      },
    ],
  },
  {
    id: "quarters-palms",
    num: 23,
    name: "Quarters + Palms",
    family: "Split-Field",
    summary: "Alignment and rules are split by side. Each side executes its own match rules independently.",
    roles: [
      {
        position: "Quarters Side",
        rules: [
          "CB: 6–8 yards outside #1",
          "Safety: 8–12 yards over/inside #2",
          "Overhang: 4–6 yard apex",
        ],
      },
      {
        position: "Palms Side",
        rules: [
          "CB: 4–6 yards outside #1",
          "Safety: 10–12 yards over/inside #2",
          "Overhang: Apex #2/box",
        ],
      },
    ],
  },
  {
    id: "quarters-cone",
    num: 24,
    name: "Quarters + Cone",
    family: "Split-Field",
    summary: "Quarters Match to one side with a bracket on the other.",
    roles: [
      {
        position: "Quarters Side",
        alignment: "Normal Quarters alignment and rules.",
        rules: [],
      },
      {
        position: "Cone Side — Low / Outside Defender",
        alignment: "4–7 yards outside/underneath receiver.",
        leverage: "Outside/underneath.",
        rules: [],
      },
      {
        position: "Cone Side — High / Inside Defender",
        alignment: "8–12 yards inside/top of receiver.",
        leverage: "Inside/top-down.",
        rules: ["Squeeze receiver between both leverage players."],
      },
    ],
  },
  {
    id: "palms-cone",
    num: 25,
    name: "Palms + Cone",
    family: "Split-Field",
    summary: "Palms Match on one side with a cone bracket on the other.",
    roles: [
      {
        position: "Palms Side",
        alignment: "Normal Palms alignment and match rules.",
        rules: [],
      },
      {
        position: "Cone Side",
        alignment: "One defender outside/underneath; second defender inside/top-down.",
        rules: ["Both match the bracketed receiver based on his release."],
      },
    ],
  },
  {
    id: "match-meg",
    num: 26,
    name: "Match + MEG",
    family: "Split-Field",
    summary: "One side uses a match concept while a selected receiver is locked MEG.",
    roles: [
      {
        position: "Match Side",
        alignment: "Follows selected match coverage.",
        rules: [],
      },
      {
        position: "MEG Defender",
        alignment: "Press or off assigned receiver.",
        leverage: "Based on available help.",
        key: "Assigned receiver.",
        rules: ["Match him everywhere regardless of route distribution."],
      },
    ],
  },
  {
    id: "cone",
    num: 27,
    name: "Cone",
    family: "Brackets & Tools",
    summary: "Two-defender bracket.",
    roles: [
      {
        position: "Outside / Low Defender",
        alignment: "Approximately 4–7 yards outside receiver.",
        leverage: "Outside/underneath.",
        rules: [],
      },
      {
        position: "Inside / High Defender",
        alignment: "Approximately 8–12 yards inside/top.",
        leverage: "Inside/top-down.",
        rules: [
          "Both key the same receiver and maintain opposite leverage.",
          "Goal: Funnel him into each other.",
        ],
      },
    ],
  },
  {
    id: "in-out",
    num: 28,
    name: "In / Out",
    family: "Brackets & Tools",
    summary: "Horizontal bracket.",
    roles: [
      {
        position: "Inside Defender",
        alignment: "Inside of receiver distribution.",
        leverage: "Inside.",
        rules: ["Match inside-breaking threat."],
      },
      {
        position: "Outside Defender",
        alignment: "Outside receiver distribution.",
        leverage: "Outside.",
        rules: ["Match outside-breaking threat."],
      },
    ],
  },
  {
    id: "under-over",
    num: 29,
    name: "Under / Over",
    family: "Brackets & Tools",
    summary: "Vertical bracket.",
    roles: [
      {
        position: "Under Defender",
        alignment: "4–7 yards underneath receiver.",
        leverage: "Underneath.",
        rules: ["Eliminate underneath/intermediate access."],
      },
      {
        position: "Over Defender",
        alignment: "8–12+ yards above receiver.",
        leverage: "Top-down.",
        rules: ["Eliminate vertical access."],
      },
    ],
  },
  {
    id: "cut-cross",
    num: 30,
    name: "Cut / Cross",
    family: "Brackets & Tools",
    summary: "Match rule designed to handle crossing routes without chasing across the field.",
    roles: [
      {
        position: "Cut Defender",
        alignment: "Inside at approximately 5–8 yards where he can see crossing threats.",
        leverage: "Inside/underneath.",
        key: "Inside route distribution.",
        rules: [
          "When another defender's receiver crosses into his leverage: CUT!",
          "Take the crossing route.",
          "Original defender releases and replaces into the coverage structure.",
        ],
      },
    ],
  },
];
