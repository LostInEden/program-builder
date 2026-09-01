"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Plus, X, ChevronRight, Star, BookOpen, Download, ArrowRight, CheckCircle2 } from "lucide-react";
import {
  useStore, useHydrated, ADJUSTMENT_CATEGORIES, PRESSURE_GROUPS,
  type Concept, type ConceptKind, type Responsibility,
} from "@/lib/store";
import { COVERAGES } from "@/lib/coverages";

const card = "rounded-xl border border-line bg-card shadow-sm";
const cardHead = "display uppercase text-xs font-bold tracking-[0.15em] text-ink px-5 py-3.5 border-b border-line flex items-center gap-3";
const input = "rounded-md border border-line bg-white px-2.5 py-1.5 text-sm focus:outline-none focus:border-grass";
const uid = () => Math.random().toString(36).slice(2, 9);

const KIND_LABEL: Record<ConceptKind, string> = { front: "Fronts", coverage: "Coverages", pressure: "Pressures", adjustment: "Adjustments" };

function ConceptsInner() {
  const hydrated = useHydrated();
  const router = useRouter();
  const sp = useSearchParams();
  const kindParam = (sp.get("kind") as ConceptKind | null) ?? "front";
  const cat = sp.get("cat");
  const id = sp.get("id");
  const isNew = sp.get("new") === "1";

  const { concepts, addConcept, updateConcept, removeConcept, confirmConcept } = useStore();
  const [newKind, setNewKind] = useState<ConceptKind>(kindParam);
  const [newName, setNewName] = useState("");

  useEffect(() => setNewKind(kindParam), [kindParam]);

  if (!hydrated) return <div className="px-8 py-10 text-dim">Loading…</div>;

  const list = concepts
    .filter((c) => c.kind === kindParam)
    .filter((c) => !cat || (kindParam === "adjustment" ? (cat === "Situational" ? c.category === "Situational Rules" || c.category === "Special Situations" : c.category === cat) : c.group === cat))
    .sort((a, b) => Number(!!b.isBase) - Number(!!a.isBase) || a.name.localeCompare(b.name));
  const selected = concepts.find((c) => c.id === id) ?? null;
  const go = (q: string) => router.push(`/scheme/concepts?${q}`);

  const create = () => {
    const name = newName.trim();
    if (!name) return;
    const cid = addConcept({
      kind: newKind, name,
      category: newKind === "adjustment" ? ((cat as Concept["category"]) ?? "vs Formations") : undefined,
      group: newKind === "pressure" ? ((cat as Concept["group"]) ?? "Pressure Packages") : undefined,
    });
    setNewName("");
    go(`kind=${newKind}&id=${cid}`);
  };

  return (
    <div className="px-6 py-8 max-w-7xl mx-auto">
      <Link href="/scheme" className="inline-flex items-center gap-1.5 text-sm text-dim hover:text-ink mb-3">
        <ArrowLeft size={15} /> My Scheme
      </Link>
      <div className="mb-5 flex flex-wrap items-center gap-3 justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Manage {KIND_LABEL[kindParam]}</h1>
          <p className="text-dim mt-0.5">Every concept here is part of your saved defensive model — the analysis and game plans read from it.</p>
        </div>
        <div className="flex gap-1 rounded-lg border border-line bg-white p-1">
          {(Object.keys(KIND_LABEL) as ConceptKind[]).map((k) => (
            <button
              key={k}
              onClick={() => go(`kind=${k}`)}
              className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${kindParam === k && !isNew ? "bg-grass text-white" : "text-dim hover:text-ink"}`}
            >
              {KIND_LABEL[k]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[300px_1fr] items-start">
        {/* list */}
        <div className="flex flex-col gap-3">
          <div className={`${card} p-3`}>
            <div className="display uppercase text-[10px] font-bold tracking-[0.15em] text-dim mb-2">New {KIND_LABEL[newKind].replace(/s$/, "")}</div>
            <div className="flex gap-1.5">
              <select value={newKind} onChange={(e) => setNewKind(e.target.value as ConceptKind)} className={`${input} w-28`}>
                {(Object.keys(KIND_LABEL) as ConceptKind[]).map((k) => (
                  <option key={k} value={k}>{KIND_LABEL[k].replace(/s$/, "")}</option>
                ))}
              </select>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && create()}
                placeholder="Name"
                className={`${input} flex-1 min-w-0`}
                autoFocus={isNew}
              />
              <button onClick={create} className="grid size-9 shrink-0 place-items-center rounded-lg bg-grass text-white hover:bg-grass-deep" aria-label="Add">
                <Plus size={16} />
              </button>
            </div>
          </div>

          {(kindParam === "adjustment" || kindParam === "pressure") && (
            <div className="flex flex-wrap gap-1.5">
              <button onClick={() => go(`kind=${kindParam}`)} className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${!cat ? "border-grass bg-grass/10 text-grass" : "border-line text-dim"}`}>All</button>
              {(kindParam === "adjustment" ? ADJUSTMENT_CATEGORIES : PRESSURE_GROUPS).map((c) => (
                <button key={c} onClick={() => go(`kind=${kindParam}&cat=${encodeURIComponent(c)}`)} className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${cat === c ? "border-grass bg-grass/10 text-grass" : "border-line text-dim"}`}>
                  {c}
                </button>
              ))}
            </div>
          )}

          <div className={`${card} overflow-hidden`}>
            {list.map((c) => (
              <button
                key={c.id}
                onClick={() => go(`kind=${kindParam}${cat ? `&cat=${encodeURIComponent(cat)}` : ""}&id=${c.id}`)}
                className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm border-b border-line/60 last:border-0 transition ${
                  selected?.id === c.id ? "bg-grass/10 text-grass font-bold" : "hover:bg-slate-50 font-semibold"
                }`}
              >
                {c.isBase && <Star size={12} className="fill-amber-400 text-amber-400 shrink-0" />}
                <span className="truncate">{c.kind === "adjustment" && c.trigger ? `${c.trigger} = ${c.result}` : c.name}</span>
                {!c.confirmed && <span className="ml-auto rounded-full bg-ember/10 px-1.5 py-0.5 text-[10px] font-bold text-ember shrink-0">confirm</span>}
                <ChevronRight size={14} className="ml-auto text-dim shrink-0" />
              </button>
            ))}
            {list.length === 0 && <div className="px-4 py-6 text-center text-sm text-dim">Nothing here yet.</div>}
          </div>
        </div>

        {/* editor */}
        {selected ? (
          <Editor key={selected.id} c={selected} onChange={(p) => updateConcept(selected.id, p)} onRemove={() => { removeConcept(selected.id); go(`kind=${kindParam}`); }} onConfirm={() => confirmConcept(selected.id)} />
        ) : (
          <div className={`${card} px-6 py-14 text-center text-dim text-sm`}>Select a concept to edit it, or add a new one.</div>
        )}
      </div>
    </div>
  );
}

function Editor({ c, onChange, onRemove, onConfirm }: { c: Concept; onChange: (p: Partial<Concept>) => void; onRemove: () => void; onConfirm: () => void }) {
  const lib = COVERAGES.find((x) => x.id === c.libraryId);
  const setResp = (rows: Responsibility[]) => onChange({ responsibilities: rows });
  const importFromLibrary = () => {
    if (!lib) return;
    setResp(lib.roles.map((r) => ({
      id: uid(),
      role: r.position,
      job: [r.alignment ? `Align: ${r.alignment}` : null, r.key ? `Key: ${r.key}` : null, ...r.rules].filter(Boolean).join(" "),
    })));
  };

  return (
    <div className="flex flex-col gap-4 min-w-0">
      {!c.confirmed && (
        <div className="rounded-xl border border-ember/40 bg-ember/5 px-4 py-3 flex items-center gap-3 text-sm">
          <span className="font-semibold text-ember">Added from Teach — review and confirm.</span>
          <button onClick={onConfirm} className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700">
            <CheckCircle2 size={14} /> Confirm
          </button>
        </div>
      )}

      <div className={card}>
        <div className={cardHead}>
          {KIND_LABEL[c.kind].replace(/s$/, "")}
          <label className="ml-auto normal-case tracking-normal inline-flex items-center gap-1.5 text-xs font-semibold text-dim">
            <input type="checkbox" checked={!!c.isBase} onChange={(e) => onChange({ isBase: e.target.checked })} className="accent-grass" />
            Base {c.kind}
          </label>
          <button onClick={() => { if (window.confirm(`Remove ${c.name}?`)) onRemove(); }} className="text-dim hover:text-red-500" aria-label="Remove">
            <X size={15} />
          </button>
        </div>
        <div className="p-5 grid gap-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_200px]">
            <label className="text-xs text-dim">
              Name
              <input value={c.name} onChange={(e) => onChange({ name: e.target.value })} className={`${input} mt-1 w-full text-lg font-extrabold`} />
            </label>
            {c.kind === "adjustment" && (
              <label className="text-xs text-dim">
                Category
                <select value={c.category ?? "vs Formations"} onChange={(e) => onChange({ category: e.target.value as Concept["category"] })} className={`${input} mt-1 w-full`}>
                  {ADJUSTMENT_CATEGORIES.map((x) => <option key={x}>{x}</option>)}
                </select>
              </label>
            )}
            {c.kind === "pressure" && (
              <label className="text-xs text-dim">
                Group
                <select value={c.group ?? "Pressure Packages"} onChange={(e) => onChange({ group: e.target.value as Concept["group"] })} className={`${input} mt-1 w-full`}>
                  {PRESSURE_GROUPS.map((x) => <option key={x}>{x}</option>)}
                </select>
              </label>
            )}
            {c.kind === "coverage" && (
              <label className="text-xs text-dim">
                Coverage Library match
                <select value={c.libraryId ?? ""} onChange={(e) => onChange({ libraryId: e.target.value || undefined })} className={`${input} mt-1 w-full`}>
                  <option value="">— none —</option>
                  {COVERAGES.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                </select>
              </label>
            )}
          </div>

          {c.kind === "adjustment" && (
            <div className="rounded-xl border border-line bg-slate-50 p-3">
              <div className="display uppercase text-[10px] font-bold tracking-[0.15em] text-dim mb-2">Trigger → Action → Result</div>
              <div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr_auto_1fr] items-center">
                <input value={c.trigger ?? ""} placeholder="What you see (TE + 2 strong)" onChange={(e) => onChange({ trigger: e.target.value })} className={`${input} font-semibold`} />
                <ArrowRight size={14} className="text-dim mx-auto" />
                <input value={c.action ?? ""} placeholder="What you do (Change front)" onChange={(e) => onChange({ action: e.target.value })} className={input} />
                <ArrowRight size={14} className="text-dim mx-auto" />
                <input value={c.result ?? ""} placeholder="The call (Over)" onChange={(e) => onChange({ result: e.target.value })} className={`${input} font-bold text-grass`} />
              </div>
            </div>
          )}

          <label className="text-xs text-dim">
            Summary
            <textarea rows={2} value={c.summary} onChange={(e) => onChange({ summary: e.target.value })} placeholder="One or two sentences in your words." className={`${input} mt-1 w-full resize-y`} />
          </label>
        </div>
      </div>

      {c.kind !== "adjustment" && (
        <div className={card}>
          <div className={cardHead}>
            Responsibilities
            <div className="ml-auto normal-case tracking-normal flex gap-2">
              {lib && (
                <button onClick={importFromLibrary} className="inline-flex items-center gap-1 rounded-lg border border-grass/50 px-2.5 py-1 text-xs font-semibold text-grass hover:bg-grass hover:text-white">
                  <Download size={12} /> Pull from Library ({lib.roles.length})
                </button>
              )}
              <button onClick={() => setResp([...c.responsibilities, { id: uid(), role: "", job: "" }])} className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1 text-xs font-semibold text-dim hover:text-ink">
                <Plus size={12} /> Add
              </button>
            </div>
          </div>
          <div className="p-3 flex flex-col gap-1.5">
            {c.responsibilities.map((r) => (
              <div key={r.id} className="grid grid-cols-[110px_1fr_auto] gap-2 items-start">
                <input value={r.role} placeholder="Position" onChange={(e) => setResp(c.responsibilities.map((x) => (x.id === r.id ? { ...x, role: e.target.value } : x)))} className={`${input} font-bold`} />
                <textarea rows={1} value={r.job} placeholder="What he does — alignment, key, rules" onChange={(e) => setResp(c.responsibilities.map((x) => (x.id === r.id ? { ...x, job: e.target.value } : x)))} className={`${input} resize-y`} />
                <button onClick={() => setResp(c.responsibilities.filter((x) => x.id !== r.id))} className="mt-2 text-dim hover:text-red-500" aria-label="Remove"><X size={14} /></button>
              </div>
            ))}
            {c.responsibilities.length === 0 && (
              <div className="px-2 py-4 text-center text-xs text-dim">
                No responsibilities yet.{lib ? " Pull the library rules in, then edit them to your terms." : ""}
              </div>
            )}
          </div>
        </div>
      )}

      {lib && (
        <div className={`${card} p-4 text-sm flex items-center gap-3`}>
          <BookOpen size={16} className="text-grass shrink-0" />
          <span className="text-dim">Knowledge base: <span className="font-semibold text-ink">{lib.name}</span> — {lib.summary}</span>
          <Link href="/scheme/coverages" className="ml-auto text-xs font-bold text-grass hover:underline whitespace-nowrap">Open library</Link>
        </div>
      )}

      <div className={card}>
        <div className={cardHead}>Notes</div>
        <div className="p-4">
          <textarea rows={3} value={c.notes} onChange={(e) => onChange({ notes: e.target.value })} placeholder="Coaching points, when you call it, what breaks it…" className={`${input} w-full resize-y`} />
        </div>
        {c.kind !== "adjustment" && (
          <div className="border-t border-line px-4 py-2.5 text-xs text-dim">
            Need a picture? Draw it in the{" "}
            <Link href="/scheme/playbook" className="font-semibold text-grass hover:underline">Diagram tool</Link>.
          </div>
        )}
      </div>
    </div>
  );
}

export default function ConceptsPage() {
  return (
    <Suspense fallback={<div className="px-8 py-10 text-dim">Loading…</div>}>
      <ConceptsInner />
    </Suspense>
  );
}
