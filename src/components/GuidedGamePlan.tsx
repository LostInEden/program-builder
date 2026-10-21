"use client";
import {attachApprovedDefense,availableDefense} from "@/lib/fullDefense";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useStore, useHydrated, type Opponent, type StaffMeeting, type MeetingAnswer, type MeetingDecision, type MeetingTopic } from "@/lib/store";
import { initializeMeeting, orderedTopics, refreshScouting, workflowTopics, SECTION_PROMPTS } from "@/lib/coachingWorkflow";
import WorkflowDiagrams, { DiagramPreviews } from "@/components/WorkflowDiagrams";
import { ai, AI_IS_MODEL, AI_LABEL } from "@/lib/ai";
import { approveDecision, approvedPlan, decisionGroups, decisionText, emptyMeeting, blankAnswer, PLAN_CATEGORIES } from "@/lib/meeting";
import TalkTypeInput from "@/components/TalkTypeInput";
import ChatReferenceDiagram from "@/components/ChatReferenceDiagram";
import WorkspaceSaveStatus from "@/components/WorkspaceSaveStatus";
import DecisionPracticeAction from "@/components/DecisionPracticeAction";
import GamePlanContext from "@/components/GamePlanContext";
import VisualGamePlan from "@/components/VisualGamePlan";
import { readyVisualDiagram } from "@/lib/visualGamePlan";
import PlanningEvidence from "@/components/PlanningEvidence";
import { productLanguage } from "@/lib/productLanguage";
import SectionTools from "./SectionTools";
import PlanNavigation from "@/components/PlanNavigation";

const card = "rounded-xl border border-line bg-card p-5";
const button = "rounded-lg border border-line px-3 py-2 text-sm font-semibold hover:border-gold disabled:opacity-50";
const primary = "rounded-lg bg-grass px-4 py-2 text-sm font-bold text-white hover:bg-grass-deep disabled:opacity-50";
const input = "w-full rounded-lg border border-line bg-panel p-2 text-sm";
type Priority = MeetingTopic;
const priorityCategory = (p: Priority) => p.category ?? (p.section === "players" ? "Key Players" : p.section === "formations" ? "Formations / Checks" : /pass/i.test(p.detail) ? "Pass Plan" : /run/i.test(p.detail) ? "Run Plan" : "Situational");

function PriorityMeeting({ opponent, priority, meeting, update }: { opponent: Opponent; priority: Priority; meeting: StaffMeeting; update: (fn: (m: StaffMeeting) => StaffMeeting) => void }) {
  const calls = useStore(s=>s.calls);
  const [editing, setEditing] = useState(true);
  const [talking, setTalking] = useState(true);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const remember = (m: StaffMeeting) => ({ ...m, topics: m.topics?.some(p=>p.id===priority.id) ? m.topics : [...(m.topics??[]),priority] });
  const saved = meeting.decisions.find(d => d.id === priority.id);
  const initial = blankAnswer(priorityCategory(priority));
  const draft = meeting.drafts[priority.id] ?? saved ?? initial;
  const prompts = priority.id.startsWith("workflow:") ? SECTION_PROMPTS[priority.id.slice(9)] : undefined;
  const messages = meeting.conversations[priority.id] ?? [];
  const patch = (p: Partial<MeetingAnswer>) => update(m => ({ ...m, topics: remember(m).topics, drafts: { ...m.drafts, [priority.id]: { ...draft, ...p } } }));
  const save = (answer: MeetingAnswer) => {
    if ((!decisionText(answer).trim() && !answer.diagrams?.length) || answer.diagrams?.some(d=>!readyVisualDiagram(d))) return;
    update(m => approveDecision(remember(m), { ...answer, id: priority.id, title: priority.title, evidence: priority.evidence, playIds: priority.playIds ?? [], approvedAt: Date.now() }));
    setEditing(false);
  };
  const send = async (suggestion?: string) => {
    const text = (suggestion ?? question).trim();
    if (!text || busy) return;
    setBusy(true); setError(""); setQuestion("");
    const history = [...messages, { role: "coach" as const, text }];
    update(m => ({ ...m, topics: remember(m).topics, conversations: { ...m.conversations, [priority.id]: history } }));
    try {
      const s = useStore.getState();
      const plan = s.gamePlans.find(g => g.opponentId === opponent.id);
      const context = `Current priority: ${priority.title}\nEvidence: ${priority.evidence}\nCoach-approved decisions: ${(plan?.meeting?.decisions ?? []).map(d => `${d.title}: ${decisionText(d)}`).join("\n") || "None yet"}\nCurrent unapproved draft: ${decisionText(draft)}\nAttached drawing data (unvalidated; coordinates alone do not establish assignments): ${JSON.stringify((draft.diagrams??[]).slice(0,3).map(d=>({name:d.call.name,structureId:d.structureId,front:d.call.defFront,coverage:d.call.defCoverage,assignments:d.call.assignments,offense:d.call.offLook,defense:d.call.defOffsets,appearance:d.call.defAppearance,lines:d.call.lines,zones:d.call.zones}))).slice(0,18000)}\nCoaching notes: ${meeting.notes?.[priority.id]??""}\nOpen questions: ${meeting.questions?.[priority.id]??""}\nDiscussion so far: ${history.slice(-12).map(m => `${m.role}: ${m.text}`).join("\n")}`;
      const result = await ai.chat(`${text}\n\nStaff meeting context:\n${context}\nRespond in 1–3 short sentences unless more detail was requested. Use the current draft and notes as unapproved context. Explain legitimate football concerns; ask a question only when necessary. Do not finalize or approve decisions.`, {
        scheme: s.scheme, concepts: s.concepts, players: s.players, groups: s.groups, activeGroupId: s.activeGroupId, overrides: s.overrides, termMap: s.termMap,
        program: s.program, opponent, plan: approvedPlan(plan), practiceSelection: s.practice[opponent.id], page: "/gameplan", week: opponent.week,
      });
      // Conversation suggestions never file scheme rules or approve decisions as a side effect.
      update(m => ({ ...m, conversations: { ...m.conversations, [priority.id]: [...(m.conversations[priority.id] ?? history), { role: "counterscheme", text: result.reply.text }] } }));
    } catch { setError("The assistant could not reply. Your question is saved; try again."); }
    finally { setBusy(false); }
  };
  const evidenceAtTop = ["identity", "situations"].includes(priority.section);
  return <div className="grid lg:grid-cols-2 gap-4 items-start min-w-0">
    {evidenceAtTop && <section className={`${card} lg:col-span-2`}><p className="text-xs uppercase tracking-widest text-gold font-bold">{saved ? "Plan set · coach approved" : "Work the priority"}</p><h2 className="mt-1 text-xl font-bold">{priority.title}</h2><p className="mt-1 text-sm text-dim">{priority.detail}</p><PlanningEvidence text={priority.evidence} opponentId={opponent.id} section={priority.section}/></section>}
    <section className={card}>
      {!evidenceAtTop && <><p className="text-xs uppercase tracking-widest text-gold font-bold">{saved ? "Plan set · coach approved" : "Work the priority"}</p>
      <h2 className="mt-2 text-xl font-bold">{priority.title}</h2><p className="mt-2 text-sm text-dim">{priority.detail}</p>
      <PlanningEvidence text={priority.evidence} opponentId={opponent.id} section={priority.section}/></>}
      {saved && !editing ? <><dl className="mt-4 space-y-2 text-sm">{[["Call", saved.call], ["Check", saved.check], ["Fit", saved.fit], ["Key Coaching Point", saved.point],...Object.entries(saved.responses??{})].filter(([, value]) => value).map(([label, value]) => <div key={label}><dt className="text-dim">{label}</dt><dd className="font-semibold whitespace-pre-wrap">{value}</dd></div>)}</dl><div className="mt-4 flex gap-2"><button className={button} onClick={() => setEditing(true)}>Edit</button><button className={button} onClick={() => setTalking(true)}>Discuss Again</button></div></> : !editing ? <>
        <p className="mt-4 text-sm text-dim">Scouting is ready for review. Your call, fit and adjustments stay blank until you choose them.</p>
        <div className="mt-4 flex flex-wrap gap-2"><button className={primary} onClick={() => setEditing(true)}>Enter our answer</button><button className={button} onClick={() => setTalking(true)}>Talk It Through</button></div>
      </> : null}
      {editing && <div className="mt-5 border-t border-line pt-4 space-y-3"><h3 className="font-bold">Our answer</h3><details className="text-xs"><summary className="cursor-pointer text-dim">Title &amp; category</summary><label className="block text-xs text-dim">Priority title<input className={input} value={priority.title} onChange={e=>update(m=>({...m,topics:(m.topics??[]).map(t=>t.id===priority.id?{...t,title:e.target.value,scouting:false}:t)}))}/></label><label className="block text-xs text-dim">Final Plan category<select value={draft.category} onChange={e => patch({ category: e.target.value })} className={`${input} mt-1`}>{PLAN_CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></label></details>
        {(priority.section === "answers" || priority.id.startsWith("scout:")) && <VisualGamePlan focus={priority.id.startsWith("scout:")?{title:priority.title,evidence:priority.evidence}:undefined} opponent={opponent} diagrams={draft.diagrams??[]} onChange={diagrams=>patch({diagrams})}/>}
        <label className="block text-xs text-dim">Use a saved call<select className={`${input} mt-1`} value="" onChange={e=>{const c=calls.find(c=>c.id===e.target.value);if(c)patch({call:c.name,...(c.fullDefense?{diagrams:[...(draft.diagrams??[]).filter(d=>d.sourceDefense?.id!==c.id),attachApprovedDefense(c)]}:{})});}}><option value="">Choose from our scheme…</option>{calls.filter(availableDefense).map(c=><option key={c.id} value={c.id}>{c.name} · {c.fullDefense?'Full Defense':c.section}</option>)}</select></label>{draft.call&&<p className="text-sm font-semibold">Call: {draft.call} <button className="ml-2 text-xs text-dim underline" onClick={()=>patch({call:""})}>Clear selection</button></p>}
        <details className="rounded-lg border border-line p-3" open={undefined}><summary className="cursor-pointer text-sm font-semibold">Coaching notes &amp; responsibilities</summary>{prompts ? prompts.map(label=><label key={label} className="block text-xs text-dim">{label}<textarea rows={2} className={`${input} mt-1`} placeholder="Your staff’s answer" value={draft.responses?.[label]??''} onChange={e=>patch({responses:{...draft.responses,[label]:e.target.value}})}/></label>) : <>
        {([['call', 'Call'], ['check', 'Check'], ['fit', 'Fit']] as const).map(([key, label]) => <label key={key} className="block text-xs text-dim">{label}<input className={`${input} mt-1`} value={draft[key]} onChange={e => patch({ [key]: e.target.value })} placeholder="Coach’s choice" /></label>)}
        <label className="block text-xs text-dim">Key Coaching Point<textarea rows={3} value={draft.point} onChange={e => patch({ point: e.target.value })} className={`${input} mt-1`} /></label>
        </>}
        </details>
        <WorkflowDiagrams diagrams={draft.diagrams} onChange={diagrams=>patch({diagrams})} opponentId={opponent.id} context={`${priority.title}\n${priority.evidence}\nDraft (not approved): ${decisionText(draft)}`} available={opponent.diagrams}/>
        <div className="flex gap-2"><button className={primary} disabled={(!decisionText(draft).trim() && !draft.diagrams?.length) || draft.diagrams?.some(d=>!readyVisualDiagram(d))} onClick={() => save(draft)}>{saved ? "Approve Updated Decision" : "Approve Decision"}</button><button className={button} onClick={() => setEditing(false)}>Close Draft</button></div><p className="text-xs text-dim">Draft edits stay separate from your approved decision until saved. Visual answers need a current check and coach review before approval.</p>
      </div>}
      {saved&&!editing&&<DiagramPreviews diagrams={saved.diagrams}/>}
      <details className="mt-4 border-t border-line pt-3"><summary className="cursor-pointer text-sm font-semibold">Notes &amp; open questions{meeting.questions?.[priority.id] ? " · Question saved" : ""}</summary><label className="block text-xs text-dim mt-4">Coaching notes<textarea rows={2} className={`${input} mt-1`} value={meeting.notes?.[priority.id]??""} onChange={e=>update(m=>({...remember(m),notes:{...m.notes,[priority.id]:e.target.value}}))}/></label>
      <label className="block text-xs text-dim mt-3">Unanswered questions<textarea rows={2} className={`${input} mt-1`} value={meeting.questions?.[priority.id]??""} onChange={e=>update(m=>({...remember(m),questions:{...m.questions,[priority.id]:e.target.value}}))}/></label>
      </details>
      {saved&&<button className={`${button} mt-3`} onClick={()=>update(m=>({...m,decisions:m.decisions.filter(d=>d.id!==priority.id),drafts:{...m.drafts,[priority.id]:saved}}))}>Return decision to draft</button>}
    </section>
    <section className={card}>
      <p className="text-xs font-bold uppercase tracking-wider text-grass">Test the answer</p><h2 className="mt-1 text-lg font-bold">{talking ? "Coach + CounterScheme" : "Staff discussion"}</h2>
      <p className="mt-2 text-sm text-dim">{saved ? "Does this answer still fit our personnel and the opponent’s evidence?" : "Work manually or ask for help when you need it. Suggestions remain separate from approved decisions."}</p>
      <p className="mt-3 text-xs text-dim">{AI_IS_MODEL ? `${AI_LABEL}: answers from your saved scheme, team and opponent data. It suggests; you decide what goes in the plan.` : `${AI_LABEL}: rules-based suggestions, not a connected conversational model. Review football reasoning with your staff.`}</p>
      {!talking ? <button className={`${button} mt-4`} onClick={() => setTalking(true)}>Talk It Through</button> : <>
        <div className="mt-4 space-y-3 min-h-20 max-h-[420px] overflow-y-auto" aria-live="polite">{!messages.length&&<p className="rounded-lg bg-panel p-3 text-sm text-dim">Discuss personnel fit, challenge an assignment, or ask for a diagram. Nothing here becomes an approved decision automatically.</p>}{messages.map((m, i) => <div key={i} className={`rounded-lg p-3 text-sm ${m.role === "coach" ? "bg-panel" : "border border-line"}`}><p className="text-xs font-bold text-gold mb-1">{m.role === "coach" ? "Coach" : "CounterScheme"}</p><p className="whitespace-pre-wrap">{m.role === "counterscheme" ? productLanguage(m.text) : m.text}</p>{m.role==="counterscheme"&&<ChatReferenceDiagram compact message={{id:`meeting:${priority.id}:${i}`,role:"counterscheme",text:m.text,ts:0,context:{opponentId:opponent.id}}} question={messages[i-1]?.text??priority.title} contextText={`${priority.title}\n${priority.evidence}\n${messages.slice(0,i+1).map(x=>`${x.role}: ${x.text}`).join("\n")}`} onAttach={diagram=>{patch({diagrams:[...(draft.diagrams??[]),diagram]});setEditing(true);}}/>}<button className="mt-2 text-gold text-xs font-semibold hover:underline" onClick={() => { patch({ point: [draft.point,m.text].filter(Boolean).join("\n\n") }); setEditing(true); }}>Add to decision notes</button></div>)}</div>
        <div className="mt-3 flex flex-wrap gap-2">{["Check our answer", "Does this fit our personnel?", "What adjustment would you suggest?"].map(q=><button key={q} disabled={busy} className={button} onClick={()=>void send(q)}>{q}</button>)}</div>
        <form className="mt-4 space-y-2" onSubmit={e => { e.preventDefault(); void send(); }}><TalkTypeInput value={question} onChange={setQuestion} label="Discuss this priority" disabled={busy} /><button className={primary} disabled={busy || !question.trim()}>{busy ? "Thinking…" : "Send"}</button></form>
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

  const final = search.get("view") === "final";
  useEffect(() => {
    if (!hydrated || !o) return;
    const current = useStore.getState();
    current.setLastOpponent(o.id);
    const existing = current.gamePlans.find(g => g.opponentId === o.id)?.meeting;
    if (!existing?.topics?.some(p=>p.id.startsWith("workflow:"))) current.updateGamePlan(o.id, { meeting: initializeMeeting(o, existing) });
  }, [hydrated, o]);
  if (!hydrated) return <div className="p-8 text-dim">Loading…</div>;
  if (!o) return <div className="p-8"><h1 className="text-2xl font-bold">Game Plan</h1><SectionTools section="gameplan"/><p className="my-3 text-dim">Add an opponent to start a staff meeting.</p><Link href="/matchup" className={button}>Opponent Matchup</Link></div>;
  const update = (fn: (m: StaffMeeting) => StaffMeeting) => {
    const current = useStore.getState();
    const stored = current.gamePlans.find(g => g.opponentId === o.id);
    current.updateGamePlan(o.id, { meeting: fn(stored?.meeting ?? emptyMeeting()) });
  };
  const allTopics = orderedTopics(meeting);
  const choices = workflowTopics(meeting);
  const earlier = allTopics.filter(t=>!t.id.startsWith("workflow:"));
  const active = allTopics.find(p => p.id === (selected ?? search.get("topic"))) ?? choices[0];
  const openDecision = (d: MeetingDecision) => { update(m=>({...m,hidden:m.hidden?.filter(id=>id!==d.id)})); setSelected(d.id); router.push(`/gameplan?id=${o.id}`); };
  return <div className="px-4 sm:px-6 py-6 max-w-[1500px] mx-auto print-root">
    <div className="no-print flex flex-wrap justify-between items-center gap-3 mb-5"><div><h1 className="text-3xl font-extrabold">Game Plan — {o.name}</h1><p className="text-dim mt-1">Your personnel + your scheme + their tendencies. Develop the answer, then approve it.</p></div><select aria-label="Select opponent" className={input + " max-w-xs"} value={o.id} onChange={e => { setSelected(null); router.push(`/gameplan?id=${e.target.value}`); }}>{state.opponents.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</select></div>
    <h1 className="hidden print:block text-2xl font-bold mb-4">Game Plan — {o.name}</h1>
    {!final&&<SectionTools section="gameplan" opponentId={o.id}/>}<PlanNavigation id={o.id} active="Plan" /><WorkspaceSaveStatus/>
    <div className="no-print flex flex-wrap justify-between gap-3 mb-5"><div>{final?<Link href={`/gameplan?id=${o.id}`} className="text-sm font-semibold text-grass">← Game Plans</Link>:<Link href={`/gameplan?id=${o.id}&view=final`} className={button}>Open Final Plan ({meeting.decisions.length}) →</Link>}</div><div className="flex gap-3 text-sm"><Link href={`/matchup?id=${o.id}`} className="text-gold">Opponent Matchup</Link>{plan && <Link href={`/gameplan?id=${o.id}&view=legacy`} className="text-dim">Previous planning workspace</Link>}</div></div>
    {final ? <><div className="flex justify-between gap-3 mb-4"><h2 className="text-2xl font-bold">Final Plan</h2><button onClick={() => window.print()} className={`${button} no-print`}>Print / Save as PDF</button></div>{!meeting.decisions.length && <div className={card}>No approved decisions yet. Work through a priority in Build Plan, then explicitly approve your decision.</div>}<div className="grid md:grid-cols-2 gap-4">{decisionGroups(meeting.decisions).map(group => <section key={group.category} className={`${card} print-card`}><h2 className="font-bold text-gold uppercase text-sm tracking-wider">{group.category}</h2>{group.decisions.map(d => <article key={d.id} className="border-t border-line mt-4 pt-4"><h3 className="font-bold">{d.title} — Plan Set</h3><p className="mt-2 text-sm whitespace-pre-wrap">{decisionText(d)}</p><DiagramPreviews diagrams={d.diagrams}/><DecisionPracticeAction decision={d} opponentId={o.id}/><div className="no-print mt-3 flex gap-3"><button className="text-sm text-gold" onClick={() => openDecision(d)}>Edit / Discuss Again</button><details className="text-sm"><summary className="text-gold cursor-pointer">View Evidence</summary><p className="mt-2 text-dim">{d.evidence}</p></details></div></article>)}</section>)}</div><p className="mt-5 text-sm text-dim">Approved decisions update Call Sheet and Practice Script references automatically. Unaccepted ideas stay in Build Plan.</p></> : <>
      <GamePlanContext opponent={o}/>
      <div className="grid items-start gap-4 lg:grid-cols-[230px_minmax(0,1fr)]">
      <section aria-label="Planning topics" className="rounded-xl border border-line bg-card p-3 lg:sticky lg:top-4"><h2 className="text-sm font-bold">Game-planning workflow</h2><p className="mt-1 text-xs text-dim">Work through your seven sections.</p><div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-1">{choices.map((p,i)=><button key={p.id} onClick={()=>setSelected(p.id)} aria-pressed={active?.id===p.id} className={`rounded-lg border p-3 text-left ${active?.id===p.id?'border-grass bg-grass/5':'border-line hover:border-grass'}`}><span className="text-xs font-bold text-grass">{i+1}{meeting.decisions.some(d=>d.id===p.id)?' · Approved':''}</span><span className="mt-1 block text-sm font-semibold">{p.title}</span></button>)}</div><button className={`${button} mt-3 w-full`} onClick={()=>update(m=>refreshScouting(o,m))}>Refresh scouting evidence</button><p className="mt-2 text-xs text-dim">Drafts, notes and discussions save in this browser. Refreshing evidence never changes your approved decisions.</p>{!choices.length && <p className="mt-3 text-dim text-sm">Add scouting data or a coach priority to begin.</p>}</section>
      <div className="min-w-0">
      {active && <PriorityMeeting key={`${o.id}:${active.id}`} opponent={o} priority={active} meeting={meeting} update={update} />}
      {active&&choices.some(t=>t.id===active.id)&&<div className="mt-3 flex justify-between gap-2"><button className={button} disabled={choices[0]?.id===active.id} onClick={()=>setSelected(choices[choices.findIndex(t=>t.id===active.id)-1]?.id??null)}>← Previous section</button><button className={button} disabled={choices.at(-1)?.id===active.id} onClick={()=>setSelected(choices[choices.findIndex(t=>t.id===active.id)+1]?.id??null)}>Next section →</button></div>}
      </div>
      </div>
      {!!earlier.length&&<details className="mt-4 rounded-lg border border-line bg-card p-3 text-sm"><summary className="cursor-pointer font-semibold text-dim">Earlier planning notes &amp; discussions ({earlier.length})</summary><p className="mt-2 text-xs text-dim">Your previous work is preserved. Open an item to review or continue it; approved decisions still appear below.</p><div className="mt-2 flex flex-wrap gap-2">{earlier.map(t=><button key={t.id} className={button} onClick={()=>{setSelected(t.id);window.scrollTo({top:0,behavior:'smooth'});}}>{t.title}</button>)}</div></details>}
      <section aria-label="Approved decisions" className={`${card} mt-5`}>
        <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-grass">Take it to the field</p><h2 className="mt-1 text-xl font-bold">Approved decisions ({meeting.decisions.length})</h2></div><div className="flex flex-wrap gap-2"><Link className={button} href={`/practice?id=${o.id}`}>Practice script →</Link><Link className={button} href={`/callsheet?id=${o.id}`}>Call sheet →</Link><Link className={primary} href={`/gameplan?id=${o.id}&view=final`}>View Final Plan</Link></div></div>
        {!meeting.decisions.length?<p className="mt-3 text-sm text-dim">No answers approved yet. Your working notes and CounterScheme suggestions stay in the planning area above.</p>:<div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{meeting.decisions.map(d=><article key={d.id} className="rounded-lg border border-line p-3"><p className="text-xs font-semibold text-grass">Coach approved · {d.category}</p><h3 className="mt-1 font-bold">{d.title}</h3><p className="mt-2 text-sm text-dim whitespace-pre-wrap">{decisionText(d)}</p><DecisionPracticeAction decision={d} opponentId={o.id}/><button className="mt-3 text-xs font-semibold text-grass" onClick={()=>{openDecision(d);window.scrollTo({top:0,behavior:'smooth'});}}>Review answer ↑</button></article>)}</div>}
      </section>
    </>}
  </div>;
}
