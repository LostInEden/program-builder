// The FACTS block a remote model answers from. Everything in here was counted
// by the app's own code (tendencies, tells, the plan) or typed by the coach —
// the model gets words and numbers to explain, never raw data to do math on.
// Capped so a big roster or scouting file can't blow up the request.

import { decisionText } from "@/lib/meeting";
import type { Concept, GamePlan, Opponent } from "@/lib/store";
import { computeTells, headlineFromPlays, makeResolver, playRows, tellSentence } from "@/lib/tendencies";
import { getStructure } from "@/lib/football";
import { PRINCIPLES } from "@/lib/principles";
import type { ChatContext, SchemeContext } from "./types";

const MAX = 24_000;
const cut = (s: string | undefined | null, n = 160) => {
  const t = (s ?? "").replace(/\s+/g, " ").trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
};
const pct = (v: number | null | undefined) => (v == null ? "unknown" : `${Math.round(v)}%`);

function conceptLine(c: Concept): string {
  const tags = [c.isBase ? "base" : "", (c.status ?? "active") === "backPocket" ? "back pocket" : "", c.group ?? "", c.category ?? ""].filter(Boolean);
  const head = `- [${c.kind}] ${c.name}${tags.length ? ` (${tags.join(", ")})` : ""}`;
  const rule = c.kind === "adjustment" && (c.trigger || c.action) ? ` — when ${cut(c.trigger, 80)}, ${cut(c.action, 80)}${c.result ? ` → ${cut(c.result, 80)}` : ""}` : "";
  const jobs = c.responsibilities.slice(0, 11).map((r) => `${r.role}: ${cut(r.job, 50)}`).join("; ");
  return `${head}${rule}${c.summary ? ` — ${cut(c.summary)}` : ""}${jobs ? `\n  Jobs: ${jobs}` : ""}`;
}

function schemeBlock(ctx: SchemeContext): string[] {
  const confirmed = ctx.concepts.filter((c) => c.confirmed);
  const waiting = ctx.concepts.length - confirmed.length;
  const out = [
    "## Optional reference philosophies — NOT mandatory team rules; the saved coach philosophy below takes precedence",
    ...PRINCIPLES.map((p) => `- ${p.short}: ${p.line}`),
    "",
    `## Saved scheme: ${ctx.scheme.structureName}${ctx.scheme.philosophyTitle ? ` — ${ctx.scheme.philosophyTitle}` : ""}`,
  ];
  for (const rule of ctx.scheme.coachingRules ?? []) out.push(`Confirmed coach rule [${rule.id}] (${rule.scope === "general" ? "base philosophy" : `ONLY install ${rule.callId}`}): ${cut(rule.text, 700)}`);
  if (ctx.scheme.philosophy) out.push(`Philosophy: ${cut(ctx.scheme.philosophy, 400)}`);
  out.push(...(confirmed.length ? confirmed.map(conceptLine) : ["(no confirmed calls saved yet)"]));
  if (waiting) out.push(`(${waiting} more taught but still unconfirmed — not part of his defense until he confirms)`);
  if (ctx.termMap?.length) {
    out.push("", "## His terminology");
    out.push(...ctx.termMap.slice(0, 80).map((t) => `- ${t.term} = ${cut(t.meaning, 100)} (${t.kind})`));
  }
  const hurt = ctx.players.filter((p) => p.status !== "Healthy");
  out.push("", `## Roster: ${ctx.players.length} players on file`);
  if (hurt.length) out.push(`Not healthy: ${hurt.slice(0, 20).map((p) => `${p.jersey != null ? `#${p.jersey} ` : ""}${p.name} (${p.positions.join("/")}, ${p.status})`).join("; ")}`);
  const group=ctx.groups.find(g=>g.id===ctx.activeGroupId)??ctx.groups[0];
  if(group){
    const base=ctx.groups.find(g=>g.isBase&&g.level===group.level&&g.structureId===group.structureId);
    const slots=group.isBase?group.slots:{...base?.slots,...group.overrides};
    const structure=getStructure(group.structureId);
    out.push(`## Current personnel package: ${group.name}`);
    structure.slots.forEach((slot,i)=>{const p=ctx.players.find(p=>p.id===slots?.[i]?.[0]);const name=ctx.overrides[group.structureId]?.[i]?.label??slot.pos;out.push(p?`${name}: ${p.jersey!=null?'#'+p.jersey+' ':''}${p.name}, ${p.status}; coach ratings (1–5, not measured ability): ${Object.entries(p.skills??{}).map(([k,v])=>`${k} ${v}`).join(', ')||'not rated'}`:`${name}: no starter assigned`);});
  }
  return out;
}

function opponentBlock(o: Opponent, termMap: ChatContext["termMap"]): string[] {
  const plays = o.plays ?? [];
  const h = plays.length ? headlineFromPlays(plays) : {};
  const out = [`## This week's opponent: ${o.name}${o.week ? ` (Week ${o.week})` : ""}${o.isDemo ? " — DEMO data, not a real opponent" : ""}`];
  const meta = [o.record, o.offensiveStyle && `style: ${o.offensiveStyle}`, o.tempo && `tempo: ${o.tempo}`].filter(Boolean);
  if (meta.length) out.push(meta.join(" · "));
  out.push(`Tagged snaps on file: ${plays.length}`);
  out.push(`Run rate: ${pct(h.runRate ?? o.runRate)} · 1st-down run: ${pct(h.firstDownRun ?? o.firstDownRun)}`);
  const grid = h.downDistance ?? o.downDistance;
  const dd = Object.entries(grid ?? {})
    .map(([down, row]) => {
      const cells = Object.entries(row).filter(([, v]) => v != null).map(([dist, v]) => `${dist} ${pct(v)}`);
      return cells.length ? `${down}: ${cells.join(", ")}` : "";
    })
    .filter(Boolean);
  if (dd.length) out.push(`Run % by down & distance (rest is pass): ${dd.join(" | ")}`);
  const personnel = (h.personnelUsage ?? o.personnelUsage).filter((p) => p.group.trim() && p.pct != null).slice(0, 5);
  if (personnel.length) out.push(`Personnel: ${personnel.map((p) => `${p.group} ${pct(p.pct)}`).join(", ")}`);
  const forms = (h.formations ?? o.formations).filter((f) => f.name.trim()).slice(0, 8);
  if (forms.length) out.push(`Formations: ${forms.map((f) => `${f.name}${f.snapsPct != null ? ` ${pct(f.snapsPct)} of snaps` : ""}${f.runPct != null ? ` (run ${pct(f.runPct)})` : ""}`).join("; ")}`);
  if (plays.length) {
    const rows = playRows(plays).slice(0, 10);
    if (rows.length) out.push(`Top plays (tagged snaps): ${rows.map((r) => `${r.name} [${r.type}] ${r.n}${r.avgGain != null ? `, avg ${r.avgGain.toFixed(1)} yds` : ""}`).join("; ")}`);
    const tells = computeTells(plays).actionable.slice(0, 8);
    if (tells.length) {
      const resolve = makeResolver(termMap ?? []);
      out.push("Tells (condition → outcome, counted by the app):");
      out.push(...tells.map((t) => `- ${tellSentence(t, resolve)} [${t.hits} of ${t.n} snaps, ${Math.round(t.rate * 100)}% vs ${Math.round(t.baseline * 100)}% baseline]`));
    }
  } else {
    const cs = o.concepts.filter((c) => c.name.trim()).slice(0, 10);
    if (cs.length) out.push(`Scouted concepts (coach-entered): ${cs.map((c) => `${c.name} [${c.type}]${c.freq != null ? ` ${c.freq}` : ""}`).join("; ")}`);
  }
  const kp = o.keyPlayers.filter((p) => p.name.trim()).slice(0, 8);
  if (kp.length) out.push(`Key players: ${kp.map((p) => `${p.jersey ? `#${p.jersey} ` : ""}${p.name}${p.pos ? ` (${p.pos})` : ""}${p.notes ? ` — ${cut(p.notes, 80)}` : ""}`).join("; ")}`);
  const notes = o.matchupNotes.filter((n) => n.value.trim()).slice(0, 10);
  if (notes.length) out.push(...notes.map((n) => `${n.label}: ${cut(n.value, 140)}`));
  if (o.redZone) out.push(`Red zone: ${cut(o.redZone, 200)}`);
  if (o.notes) out.push(`Coach's notes: ${cut(o.notes, 500)}`);
  return out;
}

function planBlock(plan: GamePlan): string[] {
  const out = ["## Game plan on file"];
  const decisions = plan.meeting?.decisions ?? [];
  if (decisions.length) {
    out.push("Coach-approved decisions:");
    out.push(...decisions.map((d) => `- ${d.title}: ${decisionText(d)}`));
  }
  if(plan.meeting){
    out.push("## Working organizer — notes, questions and drafts are NOT approved decisions");
    for(const t of plan.meeting.topics??[]) {
      const draft=plan.meeting.drafts[t.id],notes=plan.meeting.notes?.[t.id],question=plan.meeting.questions?.[t.id];
      if(draft||notes||question)out.push(`${t.title}: ${notes?'Notes: '+cut(notes,250):''} ${question?'Open question: '+cut(question,200):''} ${draft?'Unapproved draft: '+cut(decisionText(draft),600):''}`);
    }
  }
  const sections: [string, GamePlan[keyof GamePlan]][] = [
    ["Priorities", plan.priorities], ["Their best players", plan.bestPlayers], ["Tendencies", plan.threats],
    ["Concerns", plan.concerns], ["Adjustments", plan.adjustments], ["Practice emphasis", plan.emphasis],
  ];
  for (const [label, items] of sections) {
    if (!Array.isArray(items) || !items.length) continue;
    out.push(`${label}:`);
    for (const it of items.slice(0, 8) as GamePlan["priorities"]) {
      const e = it.evidence;
      out.push(`- ${cut(it.text, 140)}${it.sub ? ` — ${cut(it.sub, 100)}` : ""}${e ? ` [evidence: ${cut(e.summary, 100)}; ${e.n} snaps at ${Math.round(e.rate * 100)}%${e.baseline != null ? ` vs ${Math.round(e.baseline * 100)}% baseline` : ""}]` : ""}${it.source === "coach" || it.edited ? " (coach's line)" : ""}`);
    }
  }
  return out;
}

export function buildBrief(ctx: SchemeContext & Partial<ChatContext>, opponent?: Opponent | null): string {
  const o = opponent ?? ctx.opponent ?? null;
  const out: string[] = [];
  if (ctx.program?.name) out.push(`Program: ${[ctx.program.name, ctx.program.level, ctx.program.state, ctx.program.classification].filter(Boolean).join(" · ")}`);
  if (ctx.page) out.push(`Coach is on page: ${ctx.page}`);
  if (ctx.plan) out.push("", ...planBlock(ctx.plan));
  out.push("", ...schemeBlock(ctx));
  out.push("", ...(o ? opponentBlock(o, ctx.termMap) : ["## No opponent on file yet"]));
  if(ctx.practiceSelection){
    out.push("## Current practice work",`Staff notes: ${cut(ctx.practiceSelection.notes,500)}`);
    for(const r of (ctx.practiceSelection.manual??[]).slice(0,15)) out.push(`Coach-entered look: ${r.play} · ${r.formation} · ${r.situation} · ${cut(r.note,180)}`);
  }
  const text = out.join("\n");
  return text.length > MAX ? `${text.slice(0, MAX)}\n…(trimmed)` : text;
}
