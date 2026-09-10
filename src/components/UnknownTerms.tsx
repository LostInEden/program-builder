"use client";

// Unknown terms (Q27) — the one place CounterScheme admits it doesn't know a
// word. It reads standard football on its own; this strip only shows up when
// something on THIS opponent's film is that staff's own language. One term at a
// time, only when it's actually on the film. Never a setup task.

import { useMemo, useState } from "react";
import { HelpCircle, Check, X, BookOpen } from "lucide-react";
import { useStore, type Play } from "@/lib/store";
import { ai } from "@/lib/ai";
import { unknownTerms, type UnknownTerm } from "@/lib/tendencies";
import { knowledgeById } from "@/lib/knowledge";

const card = "rounded-xl border border-line bg-card shadow-sm";
const cardHead = "display uppercase text-xs font-bold tracking-[0.15em] text-ink px-5 py-3.5 border-b border-line flex items-center gap-3";
const input = "rounded-md border border-line bg-white px-2.5 py-1.5 text-sm focus:outline-none focus:border-grass";

const cap = (t: string) => t.charAt(0) + t.slice(1).toLowerCase();

const example = (u: UnknownTerm) =>
  u.field === "formation"
    ? `${cap(u.term)} is Trips with the tight end on`
    : u.field === "backfield"
      ? `${cap(u.term)} is the back offset to the strength`
      : `${cap(u.term)} is Snag`;

export default function UnknownTerms({ plays }: { plays: Play[] }) {
  const termMap = useStore((s) => s.termMap);
  const addTermMapping = useStore((s) => s.addTermMapping);
  const removeTermMapping = useStore((s) => s.removeTermMapping);
  const [skipped, setSkipped] = useState<string[]>([]);
  const [answer, setAnswer] = useState("");
  const [reply, setReply] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showTaught, setShowTaught] = useState(false);

  const unknown = useMemo(() => unknownTerms(plays, termMap), [plays, termMap]);
  const queue = unknown.filter((u) => !skipped.includes(u.term));
  const current = queue[0] ?? null;

  const save = async () => {
    if (!current || !answer.trim() || busy) return;
    setBusy(true);
    try {
      const res = await ai.resolveTerm(current.term, answer.trim(), current.kind);
      addTermMapping({ term: res.term, meaning: res.meaning, kind: res.kind, knowledgeId: res.knowledgeId });
      setReply(res.reply);
      setAnswer("");
    } finally {
      setBusy(false);
    }
  };

  if (!plays.length) return null;
  if (!current && !termMap.length) return null;

  return (
    <div className={card}>
      <div className={cardHead}>
        <HelpCircle size={14} className="text-grass" /> Unknown Terms
        <span className="ml-auto normal-case tracking-normal text-xs font-normal text-dim">
          {queue.length ? `${queue.length} word${queue.length === 1 ? "" : "s"} off their film I don't know` : "Everything on their film reads"}
        </span>
      </div>

      {current ? (
        <div className="px-5 py-4">
          <div className="text-lg font-extrabold">What does {current.term} mean?</div>
          <p className="mt-0.5 text-sm text-dim">
            It shows up on {current.count} snap{current.count === 1 ? "" : "s"} in their{" "}
            {current.field === "play" ? "play calls" : current.field === "formation" ? "formations" : current.field === "backfield" ? "backfield tags" : "motion tags"}
            {current.tags.length ? ` — ${current.tags.slice(0, 4).join(", ")}${current.tags.length > 4 ? "…" : ""}` : ""}. Tell me in your own words and I'll read it that way from here on.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && save()}
              placeholder={example(current)}
              className={`${input} min-w-[260px] flex-1`}
              aria-label={`What does ${current.term} mean?`}
            />
            <button
              onClick={save}
              disabled={!answer.trim() || busy}
              className="inline-flex items-center gap-1.5 rounded-lg bg-grass px-4 py-2 text-sm font-bold text-white hover:bg-grass-deep disabled:opacity-50"
            >
              <Check size={14} /> Save
            </button>
            <button
              onClick={() => { setSkipped((s) => [...s, current.term]); setAnswer(""); setReply(null); }}
              className="rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold text-dim hover:border-dim"
            >
              Not now
            </button>
          </div>
          {reply && <div className="mt-3 rounded-lg border border-line bg-slate-50 px-4 py-2.5 text-sm">{reply}</div>}
        </div>
      ) : (
        <div className="px-5 py-3 text-sm text-dim">
          Every formation, play, and backfield tag on this film reads as standard football or as something you&apos;ve taught me.
        </div>
      )}

      {termMap.length > 0 && (
        <div className="border-t border-line px-5 py-2.5">
          <button onClick={() => setShowTaught((v) => !v)} className="inline-flex items-center gap-1.5 text-xs font-bold text-grass hover:underline">
            <BookOpen size={12} /> {showTaught ? "Hide" : "Show"} your terminology ({termMap.length})
          </button>
          {showTaught && (
            <div className="mt-2 flex flex-col gap-1">
              {termMap.map((m) => {
                const entry = m.knowledgeId ? knowledgeById(m.knowledgeId) : null;
                return (
                  <div key={m.id} className="flex items-baseline gap-2 border-b border-line/60 py-1 last:border-0 text-sm">
                    <span className="font-bold">{m.term}</span>
                    <span className="text-dim truncate">{m.meaning}{entry ? ` · reads as ${entry.label}` : ""}</span>
                    <button onClick={() => removeTermMapping(m.id)} className="ml-auto text-dim hover:text-red-500" aria-label={`Forget ${m.term}`}><X size={12} /></button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
