"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useStore, type Call, type ChatMessage, type PlaybookSection, slotLabelOf } from "@/lib/store";
import { useCurrentOpponent } from "@/lib/useChat";
import { getStructure } from "@/lib/football";
import { buildBrief } from "@/lib/ai/brief";
import { approvedPlan } from "@/lib/meeting";
import { parseReference } from "@/lib/referenceDiagram";
import StudioCanvas, { type Selection } from "@/components/StudioCanvas";

export default function ChatReferenceDiagram({ message, question }: { message: ChatMessage; question: string }) {
  const opponent = useCurrentOpponent();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [draft, setDraft] = useState<Call | null>(null);
  const [open, setOpen] = useState(false);
  const [structureId, setStructureId] = useState("");
  const [selection, setSelection] = useState<Selection>(null);
  const [category, setCategory] = useState<PlaybookSection>("Fronts");
  const [saved, setSaved] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const overrides = useStore(s => s.overrides);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    if (!open) return;
    const previousFocus = opener.current;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.focus();
    return () => { document.body.style.overflow = overflow; previousFocus?.focus(); };
  }, [open]);

  async function generate() {
    if (draft) { setOpen(true); return; }
    if (busy) return;
    setBusy(true); setNote("");
    const abort = new AbortController(); controller.current = abort;
    const timeout = setTimeout(() => abort.abort(), 60_000);
    try {
      const s = useStore.getState();
      const contextOpponent = message.context?.opponentId ? s.opponents.find(o => o.id === message.context?.opponentId) ?? null : opponent;
      const group = s.groups.find(g => g.id === s.activeGroupId) ?? s.groups[0];
      const structure = getStructure(group.structureId);
      const response = await fetch("/api/ai", {
        method: "POST", headers: { "Content-Type": "application/json" }, signal: abort.signal,
        body: JSON.stringify({ job: "diagram", input: {
          facts: buildBrief({ ...s, opponent: contextOpponent, plan: approvedPlan(s.gamePlans.find(p => p.opponentId === contextOpponent?.id)) }, contextOpponent),
          question: question.slice(0, 3000), answer: message.text.slice(0, 4000),
          slots: structure.slots.map((_, i) => ({ slot: i, label: slotLabelOf(s.overrides, group.structureId, i) })),
        } }),
      });
      if (!response.ok) throw new Error(response.status === 503 ? "AI diagrams need the site's OpenAI connection enabled. Your saved Play Art is still available." : "Couldn't create the reference diagram. Please try again.");
      const result = parseReference((await response.json()).result, group.structureId);
      if (abort.signal.aborted) return;
      if (!result.call) { setNote(result.question); return; }
      setStructureId(group.structureId); setDraft(result.call); setSelection(null); setSaved(false); setOpen(true);
    } catch (error) {
      if (controller.current === abort) setNote(abort.signal.aborted ? "Diagram request stopped. Try again when ready." : error instanceof Error ? error.message : "Couldn't create the diagram.");
    } finally { clearTimeout(timeout); if (controller.current === abort) setBusy(false); }
  }

  function save() {
    if (!draft || saved) return;
    const s = useStore.getState();
    const group = s.groups.find(g => g.id === s.activeGroupId) ?? s.groups[0];
    if (group.structureId !== structureId) { setNote("Your defensive structure changed. Return to that structure before saving this reference."); return; }
    const id = s.addCall(category);
    s.updateCall(id, { ...draft, id, section: category });
    setSaved(true);
  }

  return <>
    <button ref={opener} disabled={busy} onClick={() => void generate()} className="mt-2 rounded-lg border border-line bg-white px-2.5 py-1 text-xs font-semibold text-grass disabled:opacity-50">{busy ? "Drawing reference…" : draft ? "Open reference in Play Art" : "Show reference diagram"}</button>
    {note && <p role="status" className="mt-1 text-xs text-dim">{note}</p>}
    {open && draft && createPortal(<div ref={dialog} role="dialog" aria-modal="true" aria-label="Reference diagram in Play Art" tabIndex={-1}
      className="fixed inset-0 z-[80] flex flex-col bg-pitch p-2 outline-none"
      onKeyDown={event => {
        if (event.key === "Escape") { event.stopPropagation(); setOpen(false); }
        if (event.key === "Tab") {
          const controls = [...event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), input, select, textarea, a[href], [tabindex="0"]')].filter(el => el.getClientRects().length);
          const first = controls[0], last = controls.at(-1);
          if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last?.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
        }
      }}>
      <div className="flex shrink-0 flex-wrap items-center gap-2 rounded-lg border border-line bg-white p-2">
        <div className="mr-auto"><h2 className="text-sm font-bold">{draft.name}</h2><p className="text-xs text-dim">AI reference · Review assumptions · Not added to your scheme</p></div>
        <select aria-label="Save reference category" value={category} onChange={e => { setCategory(e.target.value as PlaybookSection); setSaved(false); }} className="rounded border border-line bg-white px-2 py-1 text-xs">
          {["Fronts", "Coverages", "Pressures", "Checks & Adjustments"].map(c => <option key={c}>{c}</option>)}
        </select>
        <button disabled={saved} onClick={save} className="rounded bg-grass px-3 py-2 text-xs font-bold text-white disabled:opacity-60">{saved ? "Saved to Play Art" : "Save a copy"}</button>
        <button onClick={() => setOpen(false)} className="rounded border border-line px-3 py-2 text-xs">Close</button>
      </div>
      <details className="my-1 shrink-0 rounded border border-line bg-white px-2 py-1 text-xs" open><summary className="cursor-pointer font-semibold">Explanation & assumptions</summary><p className="max-h-24 overflow-auto whitespace-pre-wrap text-dim">{draft.notes}</p></details>
      {note && <p role="status" className="text-xs text-dim">{note}</p>}
      <div className="flex min-h-0 flex-1 flex-col"><StudioCanvas call={draft} structureId={structureId} groupSlots={{}} players={[]} labelFor={i => slotLabelOf(overrides, structureId, i)} selection={selection} onSelect={setSelection} onUpdate={(_, patch) => { setDraft(previous => previous ? { ...previous, ...patch } : previous); setSaved(false); }} /></div>
    </div>, document.body)}
  </>;
}
