"use client";

import { useRef, useState } from "react";
import Link from "next/link";

import {
  ChevronRight, Send, Upload,
  CheckCircle2, Clock, X,
} from "lucide-react";
import { useStore, useHydrated } from "@/lib/store";

import { ai, AI_LABEL, type TeachResult } from "@/lib/ai";
import TalkTypeInput from "@/components/TalkTypeInput";

const card = "rounded-xl border border-line bg-card shadow-sm";

function relTime(ts: number) {
  if (ts < 1_000_000) return "starter scheme";
  const d = Date.now() - ts;
  if (d < 60_000) return "just now";
  if (d < 3_600_000) return `${Math.floor(d / 60_000)}m ago`;
  if (d < 86_400_000) return `${Math.floor(d / 3_600_000)}h ago`;
  return `${Math.floor(d / 86_400_000)}d ago`;
}

export default function SchemeTeachingPanel() {
  const hydrated = useHydrated();
  const {
    concepts, confirmConcept, removeConcept, teachLog,
  } = useStore();
  const [teach, setTeach] = useState("");
  const [busy, setBusy] = useState(false);
  const [reply, setReply] = useState<{ summary: string; actions?: { label: string; href: string }[] } | null>(null);
  const [proposal, setProposal] = useState<TeachResult | null>(null);
  const saving = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!hydrated) return <div className="px-8 py-10 text-dim">Loading…</div>;

  const pending = concepts.filter((c) => !c.confirmed);
  const recent = [...concepts].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5);

  const submitTeach = async () => {
    const input = teach.trim();
    if (!input || busy) return;
    setBusy(true);
    try {
      const result = await ai.teach(input, useStore.getState());
      setProposal(result); setReply(null);
    } catch { setReply({ summary: "Could not interpret this draft. Your text is still here; try again." });
    } finally {
      setBusy(false);
    }
  };

  const saveProposal = () => {
    if (!proposal?.concepts.length || saving.current) return;
    saving.current = true;
    const state = useStore.getState();
    const ids = proposal.concepts.map(c => state.addConcept({ ...c, source: "teach", confirmed: true }));
    state.addTeachEntry({ input: teach, conceptIds: ids });
    state.appendChat({ role: "coach", text: teach, context: { page: "/scheme" } });
    state.appendChat({ role: "counterscheme", text: `Coach approved ${ids.length} scheme item(s).`, context: { page: "/scheme", conceptIds: ids } });
    setProposal(null); setTeach(""); setReply({ summary: "Saved to My Scheme." });
    saving.current = false;
  };

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    if (/\.(txt|md|csv)$/i.test(f.name) || f.type.startsWith("text/")) {
      const text = await f.text();
      setTeach((t) => (t ? `${t}\n${text}` : text));
    } else {
      setReply({ summary: "Photos and PDFs of notes need the model connected — paste the text for now, or upload a .txt file." });
    }
  };

  return (
      <div className={`${card} grid lg:grid-cols-[1.6fr_1fr] divide-y lg:divide-y-0 lg:divide-x divide-line`}>
        <div className="p-6">
          <div className="flex items-start gap-3 mb-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-navy text-white font-extrabold text-sm">CS</span>
            <div>
              <div className="text-lg font-extrabold">Teach CounterScheme</div>
              <p className="text-sm text-dim">Explain your defense. Review the proposed scheme items before saving.</p>
            </div>
          </div>
          <div className="rounded-xl border border-line bg-white p-3">
            <TalkTypeInput value={teach} onChange={setTeach} label="Teach CounterScheme how your defense works" disabled={busy || !!proposal} />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                disabled={busy || !!proposal} onClick={() => fileRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-lg border border-line px-3.5 py-2 text-sm font-semibold text-ink hover:border-dim"
              >
                <Upload size={15} /> Upload Note
              </button>
              <input ref={fileRef} type="file" accept=".txt,.md,.csv,text/plain" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
              <button
                onClick={submitTeach}
                disabled={!teach.trim() || busy || !!proposal}
                className="ml-auto inline-flex items-center gap-2 rounded-lg bg-grass px-5 py-2.5 text-sm font-bold text-white hover:bg-grass-deep disabled:opacity-50"
              >
                <Send size={15} /> {busy ? "Interpreting…" : "Review Interpretation"}
              </button>
            </div>
          </div>
          {proposal && <section className="mt-4 rounded-xl border border-line p-4">
            <h3 className="font-bold">Here&apos;s what I understood</h3>
            {proposal.concepts.map((c, i) => <div key={i} className="mt-3 border-t border-line pt-3 text-sm">
              <p className="font-semibold">{c.name} · {c.kind}{c.isBase ? ' · Base' : ''}</p>
              <dl>{[['Summary', c.summary], ['Category', c.category || c.group], ['Trigger', c.trigger], ['Action', c.action], ['Result', c.result], ['Notes', c.notes]].filter(([,v]) => v).map(([k,v]) => <div key={k} className="mt-1"><dt className="text-xs text-dim">{k}</dt><dd className="whitespace-pre-wrap">{v}</dd></div>)}</dl>
              {c.responsibilities?.map(r => <p key={r.id} className="mt-2">{r.role}: {r.job}</p>)}
            </div>)}
            {proposal.question && <p className="mt-3 text-sm text-dim">{proposal.question}</p>}
            {!proposal.concepts.length && <p className="mt-3 text-sm">No scheme items were recognized. Correct the draft or use the existing scheme editor.</p>}
            <div className="mt-4 flex flex-wrap gap-2"><button disabled={!proposal.concepts.length} onClick={saveProposal} className="rounded-lg bg-grass px-3 py-2 text-sm font-bold text-white disabled:opacity-50">Save to My Scheme</button><button onClick={() => setProposal(null)} className="px-3 text-sm text-gold">Correct Something</button><button onClick={() => { setProposal(null); setTeach(''); }} className="px-3 text-sm text-dim">Discard Draft</button></div>
          </section>}
          {reply && (
            <div className="mt-3 rounded-lg border border-grass/30 bg-grass/5 px-4 py-3 text-sm">
              <div className="leading-relaxed">{reply.summary}</div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(reply.actions ?? []).map((a) => (
                  <Link key={a.href + a.label} href={a.href} className="rounded-lg border border-line bg-white px-2.5 py-1 text-[12px] font-semibold text-grass hover:border-grass">
                    {a.label}
                  </Link>
                ))}
                <Link href="/chat" className="rounded-lg border border-line bg-white px-2.5 py-1 text-[12px] font-semibold text-dim hover:border-grass hover:text-grass">
                  Open the conversation
                </Link>
              </div>
            </div>
          )}
          <p className="mt-3 text-[11px] text-dim">
            Engine: {AI_LABEL}. Recognizes a limited set of scheme statements. Only the items shown in your review are saved, after you approve them. Unrecognized details need correction or manual entry.
          </p>
        </div>

        <div className="p-6">
          <div className="display uppercase text-[11px] font-bold tracking-[0.15em] text-dim mb-3 flex items-center gap-2">
            <Clock size={13} /> Recently Added
            {pending.length > 0 && (
              <span className="ml-auto rounded-full bg-ember/10 px-2 py-0.5 text-[10px] font-bold text-ember normal-case tracking-normal">
                {pending.length} to confirm
              </span>
            )}
          </div>
          <div className="flex flex-col">
            {[...pending, ...recent.filter((c) => c.confirmed)].slice(0, 6).map((c) => (
              <div key={c.id} className="flex items-start gap-2.5 py-2.5 border-b border-line/60 last:border-0">
                {c.confirmed ? (
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" />
                ) : (
                  <button onClick={() => confirmConcept(c.id)} className="mt-0.5 shrink-0 text-ember hover:text-emerald-600" aria-label="Confirm">
                    <CheckCircle2 size={16} />
                  </button>
                )}
                <div className="min-w-0 flex-1">
                  <Link href={`/scheme/concepts?kind=${c.kind}&id=${c.id}`} className="block text-sm font-semibold truncate hover:text-grass">
                    {c.kind === "adjustment" && c.trigger ? `${c.trigger} = ${c.result}` : c.name}
                  </Link>
                  <div className="text-[11px] text-dim">
                    {c.kind === "adjustment" ? c.category : c.kind} · {c.confirmed ? relTime(c.createdAt) : "needs confirm"}
                  </div>
                </div>
                {!c.confirmed && (
                  <button onClick={() => removeConcept(c.id)} className="shrink-0 text-dim hover:text-red-500" aria-label="Discard">
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}
            {recent.length === 0 && <div className="py-4 text-sm text-dim">Nothing taught yet.</div>}
          </div>
          <Link href="/scheme/concepts" className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-grass hover:underline">
            View All Activity <ChevronRight size={14} />
          </Link>
          {teachLog.length > 0 && (
            <p className="mt-2 text-[11px] text-dim">{teachLog.length} teaching note{teachLog.length === 1 ? "" : "s"} on file.</p>
          )}
        </div>
      </div>
  );
}
