"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import {
  Pencil, Check, Plus, ChevronRight, Shield, Layers, Zap, SlidersHorizontal, Send, Mic, Upload,
  CheckCircle2, Clock, X, Info,
} from "lucide-react";
import { useStore, useHydrated, ADJUSTMENT_CATEGORIES, PRESSURE_GROUPS, type Concept, type ConceptKind } from "@/lib/store";
import { getStructure, structures } from "@/lib/football";
import { ai, AI_LABEL } from "@/lib/ai";

const card = "rounded-xl border border-line bg-card shadow-sm";
const cardHead = "display uppercase text-xs font-bold tracking-[0.15em] text-ink px-5 py-3.5 border-b border-line flex items-center gap-3";

const COLUMNS: { kind: ConceptKind; title: string; sub: string; icon: typeof Shield; color: string }[] = [
  { kind: "front", title: "Fronts", sub: "Multiple fronts to create mismatches and fit the run.", icon: Shield, color: "bg-emerald-600" },
  { kind: "coverage", title: "Coverages", sub: "Match coverages with rules that change based on strengths.", icon: Layers, color: "bg-grass" },
  { kind: "pressure", title: "Pressures", sub: "Bring heat from multiple spots and create negative plays.", icon: Zap, color: "bg-amber-500" },
  { kind: "adjustment", title: "Adjustments", sub: "Rules and adjustments that keep us sound and one step ahead.", icon: SlidersHorizontal, color: "bg-mind" },
];

function relTime(ts: number) {
  if (ts < 1_000_000) return "starter scheme";
  const d = Date.now() - ts;
  if (d < 60_000) return "just now";
  if (d < 3_600_000) return `${Math.floor(d / 60_000)}m ago`;
  if (d < 86_400_000) return `${Math.floor(d / 3_600_000)}h ago`;
  return `${Math.floor(d / 86_400_000)}d ago`;
}

export default function SchemePage() {
  const hydrated = useHydrated();
  const {
    scheme, setScheme, concepts, addConcept, confirmConcept, removeConcept, addTeachEntry, teachLog, groups, activeGroupId,
  } = useStore();
  const [editing, setEditing] = useState(false);
  const [fullPhil, setFullPhil] = useState(false);
  const [teach, setTeach] = useState("");
  const [busy, setBusy] = useState(false);
  const [reply, setReply] = useState<{ summary: string; question?: string } | null>(null);
  const [listening, setListening] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const group = groups.find((g) => g.id === activeGroupId) ?? groups[0];
  const structure = getStructure(group?.structureId ?? "3-4");
  const counts = useMemo(() => {
    const s = structure.slots;
    return {
      dl: s.filter((x) => x.level === "front").length,
      lb: s.filter((x) => x.level === "second").length,
      db: s.filter((x) => x.level === "deep").length,
    };
  }, [structure]);

  if (!hydrated) return <div className="px-8 py-10 text-dim">Loading…</div>;

  const confirmed = concepts.filter((c) => c.confirmed);
  const pending = concepts.filter((c) => !c.confirmed);
  const byKind = (k: ConceptKind) => confirmed.filter((c) => c.kind === k);
  const situational = confirmed.filter((c) => c.kind === "adjustment" && (c.category === "Situational Rules" || c.category === "Special Situations"));
  const recent = [...concepts].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5);

  const submitTeach = async () => {
    const input = teach.trim();
    if (!input || busy) return;
    setBusy(true);
    try {
      const res = await ai.teach(input, { scheme, concepts, players: [], groups, activeGroupId, overrides: {} });
      const ids = res.concepts.map((c) =>
        addConcept({ ...c, source: "teach", confirmed: false, createdAt: Date.now() }),
      );
      addTeachEntry({ input, conceptIds: ids, question: res.question });
      setReply({ summary: res.summary, question: res.question });
      setTeach("");
    } finally {
      setBusy(false);
    }
  };

  const startVoice = () => {
    const w = window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike; SpeechRecognition?: new () => SpeechRecognitionLike };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) {
      setReply({ summary: "Voice input isn't available in this browser — type it instead." });
      return;
    }
    const rec = new Ctor();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.onresult = (e) => {
      const text = Array.from(e.results).map((r) => r[0].transcript).join(" ");
      setTeach((t) => (t ? `${t} ${text}` : text));
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    setListening(true);
    rec.start();
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
    <div className="px-6 py-8 max-w-7xl mx-auto">
      <div className="mb-6 flex flex-wrap items-center gap-3 justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">My Scheme</h1>
          <p className="text-dim mt-0.5">This is your defensive identity. CounterScheme helps you build, adjust and master it.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setEditing((e) => !e)}
            className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition ${
              editing ? "border-grass bg-grass/10 text-grass" : "border-line bg-white text-ink hover:border-dim"
            }`}
          >
            {editing ? <Check size={15} /> : <Pencil size={15} />} {editing ? "Done" : "Edit Scheme"}
          </button>
          <Link
            href="/scheme/concepts?new=1"
            className="inline-flex items-center gap-2 rounded-lg bg-grass px-4 py-2 text-sm font-semibold text-white transition hover:bg-grass-deep"
          >
            <Plus size={15} /> Add Concept
          </Link>
        </div>
      </div>

      {/* Identity strip */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`${card} grid md:grid-cols-[1fr_1.6fr_1fr] divide-y md:divide-y-0 md:divide-x divide-line mb-5`}>
        <div className="p-6">
          <div className="display uppercase text-[11px] font-bold tracking-[0.15em] text-dim mb-3">Base Defense</div>
          {editing ? (
            <>
              <input
                value={scheme.structureName}
                onChange={(e) => setScheme({ structureName: e.target.value })}
                className="w-full rounded-lg border border-line bg-white px-3 py-2 text-2xl font-extrabold"
              />
              <p className="mt-2 text-xs text-dim">Depth chart structure: {structure.name} (change it under My Team → Depth Chart)</p>
            </>
          ) : (
            <>
              <div className="text-4xl font-extrabold tracking-tight">{scheme.structureName}</div>
              <div className="mt-2 text-lg font-semibold text-ink/80">
                {counts.dl} DL · {counts.lb} LB · {counts.db} DB
              </div>
              <span className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-grass/10 px-3 py-1.5 text-xs font-bold text-grass">
                <Shield size={13} /> {byKind("front").length > 1 ? "Multiple Fronts" : "Single Front"}
              </span>
            </>
          )}
        </div>
        <div className="p-6">
          <div className="display uppercase text-[11px] font-bold tracking-[0.15em] text-dim mb-3 flex items-center gap-2">
            <Layers size={13} /> Defensive Philosophy
          </div>
          {editing ? (
            <>
              <input
                value={scheme.philosophyTitle}
                onChange={(e) => setScheme({ philosophyTitle: e.target.value })}
                placeholder="Three words that define you"
                className="w-full rounded-lg border border-line bg-white px-3 py-2 text-xl font-extrabold mb-2"
              />
              <textarea
                rows={4}
                value={scheme.philosophy}
                onChange={(e) => setScheme({ philosophy: e.target.value })}
                className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm leading-relaxed resize-y"
              />
            </>
          ) : (
            <>
              <div className="text-2xl font-extrabold tracking-tight">{scheme.philosophyTitle}</div>
              <p className={`mt-2 text-[15px] leading-relaxed text-ink/80 ${fullPhil ? "" : "line-clamp-3"}`}>{scheme.philosophy}</p>
              <button onClick={() => setFullPhil((v) => !v)} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-grass hover:underline">
                {fullPhil ? "Show less" : "View Full Philosophy"} <ChevronRight size={14} />
              </button>
            </>
          )}
        </div>
        <div className="p-6">
          <div className="display uppercase text-[11px] font-bold tracking-[0.15em] text-dim mb-3 flex items-center gap-1.5">
            Scheme Summary <Info size={12} className="text-dim/70" />
          </div>
          <div className="flex flex-col text-sm">
            {[
              { icon: Shield, label: "Fronts", n: byKind("front").length, href: "/scheme/concepts?kind=front" },
              { icon: Layers, label: "Coverages", n: byKind("coverage").length, href: "/scheme/concepts?kind=coverage" },
              { icon: Zap, label: "Pressures / Blitzes", n: byKind("pressure").length, href: "/scheme/concepts?kind=pressure" },
              { icon: SlidersHorizontal, label: "Adjustments", n: byKind("adjustment").length, href: "/scheme/concepts?kind=adjustment" },
              { icon: Clock, label: "Situational Packages", n: situational.length, href: "/scheme/concepts?kind=adjustment&cat=Situational" },
            ].map(({ icon: Icon, label, n, href }) => (
              <Link key={label} href={href} className="flex items-center gap-2.5 py-2 border-b border-line/60 last:border-0 hover:text-grass">
                <Icon size={15} className="text-dim" />
                <span className="text-ink/80">{label}</span>
                <span className="ml-auto font-extrabold tabular-nums">{n}</span>
              </Link>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Four columns */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 mb-5">
        {COLUMNS.map(({ kind, title, sub, icon: Icon, color }, i) => {
          const list = byKind(kind);
          // Adjustments column lists categories like the mock; others list concepts.
          const rows: { label: string; href: string; hint?: string }[] =
            kind === "adjustment"
              ? ADJUSTMENT_CATEGORIES.map((cat) => ({
                  label: cat,
                  href: `/scheme/concepts?kind=adjustment&cat=${encodeURIComponent(cat)}`,
                  hint: String(list.filter((c) => c.category === cat).length),
                }))
              : kind === "pressure"
                ? PRESSURE_GROUPS.map((g) => ({
                    label: g,
                    href: `/scheme/concepts?kind=pressure&cat=${encodeURIComponent(g)}`,
                    hint: String(list.filter((c) => c.group === g).length),
                  }))
                : list.slice(0, 6).map((c) => ({
                    label: c.isBase ? `${c.name} (Base)` : c.name,
                    href: `/scheme/concepts?kind=${kind}&id=${c.id}`,
                  }));
          return (
            <motion.div key={kind} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 + i * 0.05 }} className={`${card} p-5 flex flex-col`}>
              <div className="flex items-start gap-3 mb-4">
                <span className={`grid size-10 shrink-0 place-items-center rounded-full text-white ${color}`}>
                  <Icon size={18} />
                </span>
                <div>
                  <div className="display uppercase text-[13px] font-extrabold tracking-wide">{title}</div>
                  <p className="text-xs text-dim leading-snug mt-0.5">{sub}</p>
                </div>
              </div>
              <div className="flex flex-col gap-1.5 flex-1">
                {rows.map((r) => (
                  <Link
                    key={r.label}
                    href={r.href}
                    className="flex items-center justify-between rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold hover:border-grass hover:text-grass transition"
                  >
                    <span className="truncate">{r.label}</span>
                    <span className="flex items-center gap-2 text-dim">
                      {r.hint && <span className="text-xs tabular-nums font-normal">{r.hint}</span>}
                      <ChevronRight size={14} />
                    </span>
                  </Link>
                ))}
                {rows.length === 0 && (
                  <div className="rounded-lg border border-dashed border-line px-3 py-4 text-center text-xs text-dim">
                    Nothing saved yet — teach one below.
                  </div>
                )}
              </div>
              <Link href={`/scheme/concepts?kind=${kind}`} className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-grass hover:underline">
                Manage {title} <ChevronRight size={14} />
              </Link>
            </motion.div>
          );
        })}
      </div>

      {/* Teach + Recently added */}
      <div className={`${card} grid lg:grid-cols-[1.6fr_1fr] divide-y lg:divide-y-0 lg:divide-x divide-line`}>
        <div className="p-6">
          <div className="flex items-start gap-3 mb-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-navy text-white font-extrabold text-sm">CS</span>
            <div>
              <div className="text-lg font-extrabold">Teach CounterScheme</div>
              <p className="text-sm text-dim">Tell CounterScheme something about your defense. We&apos;ll learn it, save it, and use it to help you win.</p>
            </div>
          </div>
          <div className="rounded-xl border border-line bg-white p-3">
            <textarea
              rows={3}
              value={teach}
              onChange={(e) => setTeach(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submitTeach(); }}
              placeholder={"Example: Against 12 personnel (2 TE), we check to Over front.\nOn 3rd and long, we play Cover 1 Robber."}
              className="w-full resize-y bg-transparent text-[15px] leading-relaxed placeholder:text-dim/60 focus:outline-none"
            />
            <div className="mt-2 flex items-center gap-2">
              <button
                onClick={startVoice}
                className={`grid size-10 place-items-center rounded-lg border transition ${listening ? "border-red-400 bg-red-50 text-red-500" : "border-line text-dim hover:text-ink"}`}
                aria-label="Dictate"
              >
                <Mic size={16} />
              </button>
              <button
                onClick={() => fileRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-lg border border-line px-3.5 py-2 text-sm font-semibold text-ink hover:border-dim"
              >
                <Upload size={15} /> Upload Note
              </button>
              <input ref={fileRef} type="file" accept=".txt,.md,.csv,text/plain" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
              <button
                onClick={submitTeach}
                disabled={!teach.trim() || busy}
                className="ml-auto inline-flex items-center gap-2 rounded-lg bg-grass px-5 py-2.5 text-sm font-bold text-white hover:bg-grass-deep disabled:opacity-50"
              >
                <Send size={15} /> {busy ? "Filing…" : "Send"}
              </button>
            </div>
          </div>
          {reply && (
            <div className="mt-3 rounded-lg border border-grass/30 bg-grass/5 px-4 py-3 text-sm">
              <div className="font-semibold">{reply.summary}</div>
              {reply.question && <div className="mt-1 text-dim">{reply.question}</div>}
            </div>
          )}
          <p className="mt-3 text-[11px] text-dim">
            Engine: {AI_LABEL}. Nothing is saved until you confirm it on the right. Ctrl+Enter to send.
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
    </div>
  );
}

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
};
