export type Player = {
  jersey: number;
  name: string;
  pos: string;
  year: string;
  height: string;
  weight: number;
  forty: number;
  grade: number; // coach grade 1-10
  status: "Healthy" | "Limited" | "Out";
};

export const roster: Player[] = [
  { jersey: 7, name: "J. Mathis", pos: "RB", year: "SR", height: "5'11\"", weight: 205, forty: 4.58, grade: 9.1, status: "Healthy" },
  { jersey: 12, name: "C. Boyd", pos: "QB", year: "JR", height: "6'1\"", weight: 190, forty: 4.82, grade: 8.4, status: "Healthy" },
  { jersey: 9, name: "T. Harris", pos: "DE", year: "SR", height: "6'3\"", weight: 235, forty: 4.71, grade: 8.8, status: "Healthy" },
  { jersey: 21, name: "R. Brown", pos: "S", year: "JR", height: "6'0\"", weight: 185, forty: 4.62, grade: 8.2, status: "Limited" },
  { jersey: 3, name: "A. Johnson", pos: "CB", year: "SR", height: "5'10\"", weight: 172, forty: 4.55, grade: 8.6, status: "Healthy" },
  { jersey: 43, name: "B. Green", pos: "LB", year: "SR", height: "6'0\"", weight: 218, forty: 4.79, grade: 8.9, status: "Healthy" },
  { jersey: 45, name: "C. Price", pos: "LB", year: "SO", height: "5'11\"", weight: 209, forty: 4.85, grade: 7.4, status: "Healthy" },
  { jersey: 72, name: "M. Delgado", pos: "LT", year: "SR", height: "6'4\"", weight: 285, forty: 5.31, grade: 8.5, status: "Healthy" },
  { jersey: 55, name: "D. King", pos: "DT", year: "JR", height: "6'2\"", weight: 268, forty: 5.12, grade: 7.9, status: "Healthy" },
  { jersey: 6, name: "T. Collins", pos: "DE", year: "JR", height: "6'1\"", weight: 228, forty: 4.83, grade: 7.6, status: "Out" },
  { jersey: 14, name: "L. White", pos: "S", year: "JR", height: "5'11\"", weight: 180, forty: 4.66, grade: 7.8, status: "Healthy" },
  { jersey: 2, name: "D. Smith", pos: "CB", year: "SO", height: "5'9\"", weight: 165, forty: 4.6, grade: 7.2, status: "Healthy" },
];

export const packages = [
  { name: "Base 4-2-5", tag: "Base", active: true, desc: "4 down linemen, 2 LB, 5 DB" },
  { name: "Nickel 4-2-5", tag: "Nickel", active: false, desc: "Sub package vs 11 personnel" },
  { name: "Dime 2-3-6", tag: "Dime", active: false, desc: "Obvious passing downs" },
  { name: "Goal Line 6-2", tag: "Goal Line", active: false, desc: "Short yardage & goal line" },
];

export const coverages = [
  { name: "Cover 3 Sky", beats: ["Quick game", "RPO"], usage: 38 },
  { name: "Cover 1 Robber", beats: ["Mesh", "Shallow cross"], usage: 22 },
  { name: "Cover 2 Man", beats: ["Fade", "Out routes"], usage: 16 },
  { name: "Cover 4 Quarters", beats: ["4 verts", "Play action"], usage: 14 },
  { name: "Cover 0 Blitz", beats: ["Slow developing pass"], usage: 10 },
];

export const pressures = [
  { name: "Overload 3 Seam", type: "Fire zone", down: "3rd & long" },
  { name: "Double A Gap", type: "Interior", down: "3rd & short" },
  { name: "Edge Blitz 1", type: "Man pressure", down: "2nd & long" },
  { name: "Will Dog 3", type: "Fire zone", down: "1st down" },
];

export const opponent = {
  name: "Red Valley",
  record: "3-1 (2-0)",
  scheme: "Spread — heavy 17 personnel usage",
  kickoff: "Saturday, 7:00 PM",
  runRate: 62,
  tendencies: [
    { label: "Run — 1st down", value: 71 },
    { label: "Run — overall (last 3)", value: 62 },
    { label: "Play action rate", value: 24 },
    { label: "3rd down conversion", value: 41 },
    { label: "Red zone TD rate", value: 68 },
  ],
  keyPlayer: { jersey: 7, pos: "RB", size: "5'11\" 205", note: "28 carries/gm — everything runs through him" },
  weaknesses: [
    "OL struggles vs interior pressure — 6 sacks allowed on A-gap blitzes",
    "QB completion drops to 44% when forced off first read",
    "Boundary corner (#4) is 5'8\" — loses contested balls",
  ],
  planCalls: [
    { situation: "1st & 10", call: "Base 4-2-5 · Cover 3 Sky", why: "71% run rate — fit the box, sky support" },
    { situation: "2nd & long", call: "Nickel · Cover 1 Robber", why: "They live on mesh concepts here" },
    { situation: "3rd & short", call: "Goal Line 6-2 · Double A Gap", why: "100% run from 12 personnel" },
    { situation: "3rd & long", call: "Dime · Overload 3 Seam", why: "OL can't pick up overload — 6 sacks" },
  ],
};

export const schedule = [
  { day: "Mon", date: "Sep 14", items: [{ time: "3:30 PM", title: "Film — Red Valley offense", kind: "film" }, { time: "4:30 PM", title: "Practice — Install day", kind: "practice" }] },
  { day: "Tue", date: "Sep 15", items: [{ time: "4:30 PM", title: "Practice — Pads, run fits", kind: "practice" }] },
  { day: "Wed", date: "Sep 16", items: [{ time: "4:30 PM", title: "Practice — 3rd down & pressures", kind: "practice" }, { time: "6:30 PM", title: "Coaches meeting", kind: "meeting" }] },
  { day: "Thu", date: "Sep 17", items: [{ time: "4:30 PM", title: "Walkthrough + special teams", kind: "practice" }] },
  { day: "Fri", date: "Sep 18", items: [{ time: "3:00 PM", title: "Team dinner", kind: "team" }, { time: "6:00 PM", title: "Walk through — call sheet", kind: "film" }] },
  { day: "Sat", date: "Sep 19", items: [{ time: "7:00 PM", title: "GAME — vs Red Valley", kind: "game" }] },
  { day: "Sun", date: "Sep 20", items: [{ time: "2:00 PM", title: "Film grade + self scout", kind: "film" }] },
];

export const practicePlan = {
  date: "Wednesday, Sep 16",
  theme: "3rd down & pressure install",
  periods: [
    { n: 1, time: "4:30", min: 10, name: "Flex & warm-up", unit: "Team", detail: "Dynamic stretch, footwork ladders" },
    { n: 2, time: "4:40", min: 15, name: "Indy — tackling circuit", unit: "Position", detail: "Angle tackle, profile fit, punch" },
    { n: 3, time: "4:55", min: 15, name: "Run fits vs 17 personnel", unit: "Front 6", detail: "Scout O runs Red Valley top 5" },
    { n: 4, time: "5:10", min: 15, name: "Pressure install — Overload 3", unit: "Team D", detail: "Walk through, then thud tempo" },
    { n: 5, time: "5:25", min: 15, name: "7-on-7 — 3rd & medium", unit: "Coverage", detail: "Robber rules vs mesh" },
    { n: 6, time: "5:40", min: 20, name: "Team — situational", unit: "Team", detail: "3rd down script, 12 plays" },
    { n: 7, time: "6:00", min: 10, name: "Conditioning + specials", unit: "Team", detail: "Punt safe, hands team" },
  ],
};

export const reportCards = [
  { title: "Opponent tendency report", desc: "Red Valley — run/pass by down, distance, formation, hash. Built from 3 games of breakdown data.", stat: "184 plays analyzed", accent: "ember" },
  { title: "Self scout", desc: "Your own call tendencies — where you're predictable and what to break.", stat: "62% run on 1st — flag", accent: "grass" },
  { title: "Player grades — Week 4", desc: "Per-play film grades rolled up by player and unit, ready to share.", stat: "11 graded / 34 dressed", accent: "sky" },
  { title: "Personnel & testing", desc: "Roster athletic profile vs position benchmarks. 3 players trending up.", stat: "Updated Sep 12", accent: "mind" },
];
