"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useStore, useHydrated, type Opponent, type StaffMeeting, type MeetingAnswer, type MeetingDecision } from "@/lib/store";
import { opponentOverview } from "@/lib/opponentOverview";
import { answerFor, makeKit } from "@/lib/plan";
import { ai, AI_LABEL } from "@/lib/ai";
import { approveDecision, approvedPlan, decisionGroups, decisionText, emptyMeeting, PLAN_CATEGORIES } from "@/lib/meeting";
import PlanNavigation from "@/components/PlanNavigation";

const card = "rounded-xl border border-line bg-card p-5";
const button = "rounded-lg border border-line px-3 py-2 text-sm font-semibold hover:border-gold disabled:opacity-50";
const primary = "rounded-lg bg-grass px-4 py-2 text-sm font-bold text-white hover:bg-grass-deep disabled:opacity-50";
const input = "w-full rounded-lg border border-line bg-panel p-2 text-sm";
type Priority = { id: string; title: string; detail: string; evidence: string; playIds?: string[]; section: string };
const priorityCategory = (p: Priority) => p.section === "players" ? "Key Players" : p.section === "formations" ? "Formations / Checks" : /pass/i.test(p.detail) ? "Pass Plan" : /run/i.test(p.detail) ? "Run Plan" : "Situational";

function PriorityMeeting({ opponent, priority, meeting, update }: { opponent: Opponent; priority: Priority; meeting: StaffMeeting; update: (fn: (m: StaffMeeting) => StaffMeeting) => void }) {
  const state = useStore();
  const [editing, setEditing] = useState(false);
  const [talking, setTalking] = useState(false);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const remember = (m: StaffMeeting) => ({ ...m, topics: [...(m.topics ?? []).filter(p => p.id !== priority.id), priority] });
  const saved = meeting.decisions.find(d => d.id === priority.id);
  const suggestion = useMemo(() => answerFor({ condition: priority.title, outcome: priority.title.split(" — ")[0], outcomeKind: "play", termMap: state.termMap }, makeKit(state.concepts)), [priority.title, state.concepts, state.termMap]);
  const matched = state.concepts.filter(c => suggestion.conceptIds.includes(c.id));
  const initial: MeetingAnswer = { category: priorityCategory(priority), call: matched.filter(c => c.kind === "front" || c.kind === "coverage" || c.kind === "pressure").map(c => c.name).join(" + "), check: matched.filter(c => c.kind === "adjustment").map(c => c.name).join(" + "), fit: "", point: suggestion.educational ? "" : suggestion.text };
  const draft = meeting.drafts[priority.id] ?? saved ?? initial;
  const messages = meeting.conversations[priority.id] ?? [];
  const patch = (p: Partial<MeetingAnswer>) => update(m => ({ ...m, topics: remember(m).topics, drafts: { ...m.drafts, [priority.id]: { ...draft, ...p } } }));
  const save = (answer: MeetingAnswer) => {
    if (!decisionText(answer).trim()) return;
    update(m => approveDecision(remember(m), { ...answer, id: priority.id, title: priority.title, evidence: priority.evidence, playIds: priority.playIds ?? [], approvedAt: Date.now() }));
    setEditing(false);
  };
  const send = async () => {
    const text = question.trim();
    if (!text || busy) return;
    setBusy(true); setError(""); setQuestion("");
    const history = [...messages, { role: "coach" as const, text }];
    update(m => ({ ...m, topics: remember(m).topics, conversations: { ...m.conversations, [priority.id]: history } }));
    try {
      const s = useStore.getState();
      const plan = s.gamePlans.find(g => g.opponentId === opponent.id);
      const context = `Current priority: ${priority.title}\nEvidence: ${priority.evidence}\nCoach-approved decisions: ${(plan?.meeting?.decisions ?? []).map(d => `${d.title}: ${decisionText(d)}`).join("\n") || "None yet"}\nDiscussion so far: ${history.slice(-12).map(m => `${m.role}: ${m.text}`).join("\n")}`;
      const result = await ai.chat(`${text}\n\nStaff meeting context:\n${context}\nOffer options and questions. Do not finalize a decision or assume an unconfirmed call is approved.`, {
        scheme: s.scheme, concepts: s.concepts, players: s.players, groups: s.groups, activeGroupId: s.activeGroupId, overrides: s.overrides, termMap: s.termMap,
        program: s.program, opponent, plan: approvedPlan(plan), practiceSelection: s.practice[opponent.id], page: "/gameplan", week: opponent.week,
      });
      // Conversation suggestions never file scheme rules or approve decisions as a side effect.
      update(m => ({ ...m, conversations: { ...m.conversations, [priority.id]: [...(m.conversations[priority.id] ?? history), { role: "counterscheme", text: result.reply.text }] } }));
    } catch { setError("The assistant could not reply. Your question is saved; try again."); }
    finally { setBusy(false); }
  };
  return <div className="grid lg:grid-cols-2 gap-4 items-start">
    <section className={card}>
      <p className="text-xs uppercase tracking-widest text-gold font-bold">{saved ? "Plan set · coach approved" : "Work the priority"}</p>
      <h2 className="mt-2 text-xl font-bold">{priority.title}</h2>
      <details className="mt-3 text-sm"><summary className="font-semibold text-gold cursor-pointer">View Evidence</summary><p className="mt-2 text-dim">{priority.detail}</p><p className="mt-2">{priority.evidence}</p><Link href={`/scouting?id=${opponent.id}#${priority.section}`} className="inline-block mt-2 text-gold">Open opponent evidence →</Link></details>
      {saved && !editing ? <><dl className="mt-4 space-y-2 text-sm">{[["Call", saved.call], ["Check", saved.check], ["Fit", saved.fit], ["Key Coaching Point", saved.point]].filter(([, value]) => value).map(([label, value]) => <div key={label}><dt className="text-dim">{label}</dt><dd className="font-semibold whitespace-pre-wrap">{value}</dd></div>)}</dl><div className="mt-4 flex gap-2"><button className={button} onClick={() => setEditing(true)}>Edit</button><button className={button} onClick={() => setTalking(true)}>Discuss Again</button></div></> : <>
        <h3 className="mt-5 font-bold">CounterScheme Thought</h3><p className="mt-2 text-sm leading-relaxed">{suggestion.text}</p>
        <h3 className="mt-4 font-bold">Why</h3><p className="mt-2 text-sm text-dim">{matched.length ? `Uses saved calls/rules: ${matched.map(c => c.name).join(", ")}. ${suggestion.generic ? "This is a base answer; no specific check is saved for this look." : "Review the saved rule against the evidence before accepting."}` : "No confirmed scheme answer was matched. Choose an answer with your staff before adding it to the plan."}</p>
        <p className="mt-2 text-sm text-dim">My Team: {state.players.length} players on file. Confirm the assigned players can execute the fit; roster presence alone does not establish readiness.</p>
        <div className="mt-4 flex flex-wrap gap-2"><button className={primary} disabled={suggestion.educational || !matched.length} onClick={() => save(initial)}>Accept Answer</button><button className={button} onClick={() => setEditing(true)}>Modify</button><button className={button} onClick={() => setTalking(true)}>Talk It Through</button></div>
      </>}
      {editing && <div className="mt-5 border-t border-line pt-4 space-y-3"><h3 className="font-bold">Our answer</h3><label className="block text-xs text-dim">Final Plan category<select value={draft.category} onChange={e => patch({ category: e.target.value })} className={`${input} mt-1`}>{PLAN_CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></label>
        {([['call', 'Call'], ['check', 'Check'], ['fit', 'Fit']] as const).map(([key, label]) => <label key={key} className="block text-xs text-dim">{label}<input className={`${input} mt-1`} value={draft[key]} onChange={e => patch({ [key]: e.target.value })} placeholder="Coach’s choice" /></label>)}
        <label className="block text-xs text-dim">Key Coaching Point<textarea rows={3} value={draft.point} onChange={e => patch({ point: e.target.value })} className={`${input} mt-1`} /></label>
        <div className="flex gap-2"><button className={primary} disabled={!decisionText(draft).trim()} onClick={() => save(draft)}>{saved ? "Save Decision" : "Add to Plan"}</button><button className={button} onClick={() => setEditing(false)}>Close Draft</button></div><p className="text-xs text-dim">Draft edits stay separate from your approved decision until saved.</p>
      </div>}
    </section>
    <section className={card}>
      <h2 className="font-bold">{talking ? "Talk It Through" : "Staff discussion"}</h2>
      <p className="mt-2 text-sm text-dim">{saved ? "Does this answer still fit our personnel and the opponent’s evidence?" : `Who owns the key and the fit against ${priority.title}? What check do you want if they change the look?`}</p>
      <p className="mt-3 text-xs text-dim">{AI_LABEL}: rules-based suggestions, not a connected conversational model. Review football reasoning with your staff.</p>
      {!talking ? <button className={`${button} mt-4`} onClick={() => setTalking(true)}>Talk It Through</button> : <>
        <div className="mt-4 space-y-3 max-h-[420px] overflow-y-auto" aria-live="polite">{messages.map((m, i) => <div key={i} className={`rounded-lg p-3 text-sm ${m.role === "coach" ? "bg-panel" : "border border-line"}`}><p className="text-xs font-bold text-gold mb-1">{m.role === "coach" ? "Coach" : "CounterScheme"}</p><p className="whitespace-pre-wrap">{m.text}</p><button className="mt-2 text-gold text-xs font-semibold hover:underline" onClick={() => { patch({ point: m.text }); setEditing(true); }}>Use in decision draft</button></div>)}</div>
        <form className="mt-4 space-y-2" onSubmit={e => { e.preventDefault(); void send(); }}><label htmlFor="priority-question" className="text-sm font-semibold">Discuss this priority</label><textarea id="priority-question" className={input} rows={3} value={question} onChange={e => setQuestion(e.target.value)} placeholder="What if they start reading the end?" /><button className={primary} disabled={busy || !question.trim()}>{busy ? "Thinking…" : "Send"}</button></form>
        {error && <p role="alert" className="mt-2 text-sm text-red-500">{error}</p>}
        <button className={`${button} mt-3`} onClick={() => setEditing(true)}>Add to Plan — review decision</button>
      </>}
      {meeting.decisions.length > 0 && <details className="mt-5 text-sm"><summary className="cursor-pointer text-gold">Decisions already made ({meeting.decisions.length})</summary>{meeting.decisions.map(d => <p key={d.id} className="mt-2"><strong>{d.title}:</strong> {decisionText(d)}</p>)}</details>}
    </section>
  </div>;
}

export default function GuidedGamePlan() {
  const hydrated = useHydrated();
  const state = useStore();
  const search = useSearchParams();
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const o = state.opponents.find(o => o.id === search.get("id")) ?? state.opponents.find(o => o.id === state.lastOpponentId) ?? state.opponents[0];
  const plan = state.gamePlans.find(g => g.opponentId === o?.id);
  const meeting = plan?.meeting ?? emptyMeeting();
  const priorities = useMemo(() => o ? opponentOverview(o).priorities.map(p => ({ ...p, id: `${p.section}:${p.title}` })) : [], [o]);
  const final = search.get("view") === "final";
  useEffect(() => {
    if (!hydrated || !o) return;
    state.setLastOpponent(o.id);
    const current = useStore.getState();
    if (!current.gamePlans.find(g => g.opponentId === o.id)?.meeting) current.updateGamePlan(o.id, { meeting: emptyMeeting() });
  }, [hydrated, o, state.setLastOpponent]);
  if (!hydrated) return <div className="p-8 text-dim">Loading…</div>;
  if (!o) return <div className="p-8"><h1 className="text-2xl font-bold">Game Plan</h1><p className="my-3 text-dim">Add an opponent to start a staff meeting.</p><Link href="/matchup" className={button}>Opponent Matchup</Link></div>;
  const update = (fn: (m: StaffMeeting) => StaffMeeting) => {
    const current = useStore.getState();
    const stored = current.gamePlans.find(g => g.opponentId === o.id);
    current.updateGamePlan(o.id, { meeting: fn(stored?.meeting ?? emptyMeeting()) });
  };
  const preserved: Priority[] = meeting.decisions.filter(d => !priorities.some(p => p.id === d.id)).map(d => ({ id: d.id, title: d.title, evidence: d.evidence, playIds: d.playIds, detail: "Previously approved decision — review if the scout has changed.", section: "plays" }));
  const remembered = (meeting.topics ?? []).filter(p => !priorities.some(x => x.id === p.id) && !preserved.some(x => x.id === p.id));
  const choices = [...priorities, ...preserved, ...remembered];
  const active = choices.find(p => p.id === selected) ?? choices[0];
  const openDecision = (d: MeetingDecision) => { setSelected(d.id); router.push(`/gameplan?id=${o.id}`); };
  return <div className="px-4 sm:px-6 py-6 max-w-[1500px] mx-auto print-root">
    <div className="no-print flex flex-wrap justify-between items-center gap-3 mb-5"><div><h1 className="text-3xl font-extrabold">Game Plan — {o.name}</h1><p className="text-dim mt-1">Our answers. Your decisions.</p></div><select aria-label="Select opponent" className={input + " max-w-xs"} value={o.id} onChange={e => { setSelected(null); router.push(`/gameplan?id=${e.target.value}`); }}>{state.opponents.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</select></div>
    <h1 className="hidden print:block text-2xl font-bold mb-4">Game Plan — {o.name}</h1>
    <PlanNavigation id={o.id} active="Plan" />
    <div className="no-print flex flex-wrap justify-between gap-3 mb-5"><div className="flex gap-2"><Link href={`/gameplan?id=${o.id}`} className={final ? button : primary}>Build Plan</Link><Link href={`/gameplan?id=${o.id}&view=final`} className={final ? primary : button}>Final Plan ({meeting.decisions.length})</Link></div><div className="flex gap-3 text-sm"><Link href={`/matchup?id=${o.id}`} className="text-gold">Opponent Matchup</Link>{plan && <Link href={`/gameplan?id=${o.id}&view=legacy`} className="text-dim">Previous planning workspace</Link>}</div></div>
    {final ? <><div className="flex justify-between gap-3 mb-4"><h2 className="text-2xl font-bold">Final Plan</h2><button onClick={() => window.print()} className={`${button} no-print`}>Print / Save as PDF</button></div>{!meeting.decisions.length && <div className={card}>No approved decisions yet. Work through a priority in Build Plan, then Accept Answer or Add to Plan.</div>}<div className="grid md:grid-cols-2 gap-4">{decisionGroups(meeting.decisions).map(group => <section key={group.category} className={`${card} print-card`}><h2 className="font-bold text-gold uppercase text-sm tracking-wider">{group.category}</h2>{group.decisions.map(d => <article key={d.id} className="border-t border-line mt-4 pt-4"><h3 className="font-bold">{d.title} — Plan Set</h3><p className="mt-2 text-sm whitespace-pre-wrap">{decisionText(d)}</p><div className="no-print mt-3 flex gap-3"><button className="text-sm text-gold" onClick={() => openDecision(d)}>Edit / Discuss Again</button><details className="text-sm"><summary className="text-gold cursor-pointer">View Evidence</summary><p className="mt-2 text-dim">{d.evidence}</p></details></div></article>)}</section>)}</div><p className="mt-5 text-sm text-dim">Approved decisions update Call Sheet and Practice Script references automatically. Unaccepted ideas stay in Build Plan.</p></> : <>
      <section className={`${card} mb-5`}><div className="flex justify-between gap-2"><h2 className="text-lg font-bold">Game Plan Priorities</h2><span className="text-xs text-dim">From Opponent Matchup</span></div><div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{choices.map((p, i) => <button key={p.id} onClick={() => setSelected(p.id)} className={`rounded-lg border p-3 text-left ${active?.id === p.id ? "border-gold bg-panel" : "border-line"}`}><span className="text-xs text-gold">{meeting.decisions.some(d => d.id === p.id) ? "✓ Plan set" : `Priority ${i + 1}`}</span><span className="block mt-1 font-bold">{p.title}</span><span className="block text-xs text-dim mt-1">{p.detail}</span></button>)}</div><button className={`${button} mt-3`} onClick={() => { const title = window.prompt("What else does the staff need to solve?")?.trim(); if (title) { const p = { id: `coach:${crypto.randomUUID()}`, title, detail: "Coach-added priority", evidence: "Added by the coach; no opponent evidence attached.", section: "plays" }; update(m => ({ ...m, topics: [...(m.topics ?? []), p] })); setSelected(p.id); } }}>Add coach priority</button>{!choices.length && <p className="mt-3 text-dim text-sm">Add scouting data or a coach priority to begin.</p>}</section>
      {active && <PriorityMeeting key={`${o.id}:${active.id}`} opponent={o} priority={active} meeting={meeting} update={update} />}
    </>}
  </div>;
}
