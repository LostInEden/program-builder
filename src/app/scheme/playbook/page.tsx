"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowLeft, Plus, Copy, Trash2, X } from "lucide-react";
import { useStore, useHydrated, slotLabelOf, type PlaybookSection } from "@/lib/store";
import {
  getStructure,
  offensivePresets,
  ROUTE_COLORS,
  type LineKind,
  type LineStyle,
} from "@/lib/football";
import { recognizeFormation, formationLabel } from "@/lib/recognize";
import StudioCanvas, { type Selection } from "@/components/StudioCanvas";

const SECTIONS: PlaybookSection[] = ["Fronts", "Coverages", "Pressures", "Checks & Adjustments"];
const PTYPES = ["Quarterback", "Running Back", "Fullback", "Wide Receiver", "Tight End", "Offensive Line", "Other"];

export default function PlaybookPage() {
  const hydrated = useHydrated();
  const {
    calls, activeCallId, setActiveCall, addCall, updateCall, duplicateCall, deleteCall,
    groups, activeGroupId, players, overrides, strengthRule, formationTerms,
    formationTemplates, saveFormationTemplate,
  } = useStore();
  const [section, setSection] = useState<PlaybookSection>("Fronts");
  const [selection, setSelection] = useState<Selection>(null);

  if (!hydrated) return <div className="px-8 py-10 display text-dim">Loading…</div>;

  const group = groups.find((g) => g.id === activeGroupId) ?? groups[0];
  const structure = getStructure(group.structureId);
  const byId = new Map(players.map((p) => [p.id, p]));
  const sectionCalls = calls.filter((c) => c.section === section);
  const call = calls.find((c) => c.id === activeCallId && c.section === section) ?? sectionCalls[0] ?? null;
  const label = (i: number) => slotLabelOf(overrides, group.structureId, i);
  const rec = call ? recognizeFormation(call.offLook, strengthRule) : null;

  const selOff = call && selection?.kind === "off" ? call.offLook.find((m) => m.id === selection.id) : null;
  const selLine = call && selection?.kind === "line" ? call.lines.find((l) => l.id === selection.id) : null;
  const selText = call && selection?.kind === "text" ? (call.texts ?? []).find((t) => t.id === selection.id) : null;
  const selDef = selection?.kind === "def" ? selection.slot : null;

  return (
    <div className="px-6 py-6 max-w-[1700px] mx-auto">
      <Link href="/scheme" className="inline-flex items-center gap-1.5 text-sm text-dim hover:text-ink mb-3">
        <ArrowLeft size={15} /> My Scheme
      </Link>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="display text-4xl font-bold">Playbook</h1>
        <Link
          href="/scheme/playbook/print"
          className="display rounded-full border border-line px-4 py-1.5 text-xs font-semibold text-dim transition hover:text-ink hover:border-dim"
        >
          Print / PDF
        </Link>
        <span className="text-xs text-dim">{group.name} ({structure.name}) · saves automatically</span>
        <div className="ml-auto flex gap-1.5 rounded-full border border-line bg-card p-1">
          {SECTIONS.map((s) => (
            <button
              key={s}
              onClick={() => { setSection(s); setSelection(null); }}
              className={`display rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                s === section ? "bg-sky text-pitch" : "text-dim hover:text-ink"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[210px_minmax(0,1fr)_290px] items-start">
        {/* Call list */}
        <div className="rounded-xl border border-line bg-card/80 p-3 flex flex-col gap-1.5">
          {sectionCalls.map((c) => (
            <button
              key={c.id}
              onClick={() => { setActiveCall(c.id); setSelection(null); }}
              className={`rounded-lg px-3 py-2.5 text-left text-sm transition ${
                call?.id === c.id
                  ? "bg-sky/15 border border-sky/40 font-semibold"
                  : "border border-transparent text-dim hover:text-ink hover:bg-white/5"
              }`}
            >
              {c.name}
            </button>
          ))}
          {sectionCalls.length === 0 && (
            <p className="px-3 py-4 text-sm text-dim">No calls in {section} yet.</p>
          )}
          <button
            onClick={() => addCall(section)}
            className="mt-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-line px-3 py-2.5 text-sm text-dim transition hover:text-ink hover:border-dim"
          >
            <Plus size={14} /> New call
          </button>
        </div>

        {/* Editor */}
        <div className="min-w-0">
          {call ? (
            <motion.div key={call.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <input
                  value={call.name}
                  onChange={(e) => updateCall(call.id, { name: e.target.value })}
                  className="display rounded-lg border border-line bg-black/25 px-3 py-1.5 text-2xl font-bold min-w-0 w-52"
                />
                <button
                  onClick={() => duplicateCall(call.id)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs text-dim hover:text-ink"
                >
                  <Copy size={13} /> Duplicate
                </button>
                <button
                  onClick={() => deleteCall(call.id)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-red-500/40 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10"
                >
                  <Trash2 size={13} /> Delete
                </button>
                <div className="ml-auto flex flex-wrap items-center gap-2 text-xs">
                  <select
                    value=""
                    onChange={(e) => {
                      if (!e.target.value) return;
                      const look = offensivePresets[e.target.value] ?? formationTemplates[e.target.value];
                      if (look) updateCall(call.id, { offLook: look.map((m) => ({ ...m })), offForm: call.offForm || e.target.value });
                      setSelection(null);
                    }}
                    className="rounded-lg border border-line bg-black/25 px-2.5 py-1.5"
                  >
                    <option value="">Load formation…</option>
                    {Object.keys(formationTemplates).length > 0 && (
                      <optgroup label="Your formations">
                        {Object.keys(formationTemplates).map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </optgroup>
                    )}
                    <optgroup label="Built-in">
                      {Object.keys(offensivePresets).map((n) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </optgroup>
                  </select>
                  <button
                    onClick={() => {
                      const name = call.offForm.trim() || window.prompt("Formation name to save this look as:")?.trim();
                      if (name) {
                        saveFormationTemplate(name, call.offLook);
                        if (!call.offForm.trim()) updateCall(call.id, { offForm: name });
                      }
                    }}
                    title="Save this offensive look under the formation name — never draw it twice"
                    className="rounded-lg border border-grass/40 px-2.5 py-1.5 text-grass hover:bg-grass/10"
                  >
                    Save as formation
                  </button>
                </div>
              </div>

              <StudioCanvas
                call={call}
                structureId={group.structureId}
                groupSlots={group.slots}
                players={players}
                labelFor={label}
                selection={selection}
                onSelect={setSelection}
              />

              {rec && (
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-line bg-card/80 px-4 py-2.5 text-sm">
                  <span className="display text-xs font-semibold tracking-[0.15em] text-dim">Recognized</span>
                  <span className="display text-lg font-bold text-grass">{formationLabel(rec, formationTerms)}</span>
                  {rec.strengthSide && (
                    <span className="rounded-full border border-ember/40 bg-ember/10 px-2.5 py-0.5 text-xs text-ember">
                      Strength: {rec.strengthSide} ({strengthRule})
                    </span>
                  )}
                  <span className="text-xs text-dim">{rec.detail}</span>
                  <button
                    onClick={() => updateCall(call.id, { offForm: formationLabel(rec, formationTerms) })}
                    className="ml-auto rounded-full border border-grass/50 px-3 py-1 text-xs text-grass transition hover:bg-grass hover:text-pitch"
                  >
                    Use as formation name
                  </button>
                </div>
              )}

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs text-dim mb-1">Offensive formation</label>
                  <input
                    value={call.offForm}
                    onChange={(e) => updateCall(call.id, { offForm: e.target.value })}
                    placeholder="Trips Right"
                    className="w-full rounded-lg border border-line bg-black/25 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-dim mb-1">Run / pass concept</label>
                  <input
                    value={call.offConcept}
                    onChange={(e) => updateCall(call.id, { offConcept: e.target.value })}
                    placeholder="Inside zone"
                    className="w-full rounded-lg border border-line bg-black/25 px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="grid place-items-center rounded-xl border border-dashed border-line py-24 text-dim">
              Create a call to start building.
            </div>
          )}
        </div>

        {/* Inspector */}
        <div className="rounded-xl border border-line bg-card/80 p-4">
          {call && selOff ? (
            <>
              <div className="display text-xs font-semibold tracking-[0.2em] text-dim mb-3">Offensive player</div>
              <div className="mb-3 flex items-center gap-2">
                <span className="grid size-9 place-items-center rounded-full bg-ink text-xs font-bold text-pitch">{selOff.label}</span>
                <div className="text-sm font-bold">{selOff.label} {selOff.ptype ? `(${selOff.ptype})` : ""}</div>
              </div>
              <Field label="Type">
                <select
                  value={selOff.ptype ?? ""}
                  onChange={(e) => updateCall(call.id, { offLook: call.offLook.map((m) => (m.id === selOff.id ? { ...m, ptype: e.target.value || undefined } : m)) })}
                  className="w-full rounded-lg border border-line bg-black/25 px-2.5 py-1.5 text-sm"
                >
                  <option value="">—</option>
                  {PTYPES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Label">
                  <input
                    value={selOff.label}
                    onChange={(e) => updateCall(call.id, { offLook: call.offLook.map((m) => (m.id === selOff.id ? { ...m, label: e.target.value.slice(0, 3) } : m)) })}
                    className="w-full rounded-lg border border-line bg-black/25 px-2.5 py-1.5 text-sm"
                  />
                </Field>
                <Field label="Jersey">
                  <input
                    value={selOff.jersey ?? ""}
                    onChange={(e) => updateCall(call.id, { offLook: call.offLook.map((m) => (m.id === selOff.id ? { ...m, jersey: e.target.value } : m)) })}
                    placeholder="—"
                    className="w-full rounded-lg border border-line bg-black/25 px-2.5 py-1.5 text-sm"
                  />
                </Field>
              </div>
              <label className="mt-1 flex items-center gap-2 text-sm text-ink/85">
                <input
                  type="checkbox"
                  checked={selOff.showLabel ?? true}
                  onChange={(e) => updateCall(call.id, { offLook: call.offLook.map((m) => (m.id === selOff.id ? { ...m, showLabel: e.target.checked } : m)) })}
                />
                Show Label
              </label>
              <button
                onClick={() => {
                  updateCall(call.id, {
                    offLook: call.offLook.filter((m) => m.id !== selOff.id),
                    lines: call.lines.filter((l) => l.anchor !== `off:${selOff.id}`),
                  });
                  setSelection(null);
                }}
                className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-red-500/40 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10"
              >
                <X size={13} /> Remove player
              </button>
            </>
          ) : call && selLine ? (
            <>
              <div className="display text-xs font-semibold tracking-[0.2em] text-dim mb-3">Line</div>
              <Field label="Type">
                <select
                  value={selLine.kind}
                  onChange={(e) => updateCall(call.id, { lines: call.lines.map((l) => (l.id === selLine.id ? { ...l, kind: e.target.value as LineKind } : l)) })}
                  className="w-full rounded-lg border border-line bg-black/25 px-2.5 py-1.5 text-sm capitalize"
                >
                  {(["route", "block", "motion", "pitch"] as LineKind[]).map((k) => <option key={k} value={k}>{k}</option>)}
                </select>
              </Field>
              <Field label="Color">
                <div className="flex gap-1.5">
                  {ROUTE_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => updateCall(call.id, { lines: call.lines.map((l) => (l.id === selLine.id ? { ...l, color: c === ROUTE_COLORS[0] ? undefined : c } : l)) })}
                      className={`size-6 rounded-full border border-line ${(selLine.color ?? ROUTE_COLORS[0]) === c ? "ring-2 ring-grass ring-offset-1 ring-offset-card" : ""}`}
                      style={{ backgroundColor: c }}
                      aria-label={c}
                    />
                  ))}
                </div>
              </Field>
              <Field label="Style">
                <select
                  value={selLine.style ?? "solid"}
                  onChange={(e) => updateCall(call.id, { lines: call.lines.map((l) => (l.id === selLine.id ? { ...l, style: e.target.value as LineStyle } : l)) })}
                  className="w-full rounded-lg border border-line bg-black/25 px-2.5 py-1.5 text-sm capitalize"
                >
                  {["solid", "dashed", "dotted"].map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
              <label className="mt-1 flex items-center gap-2 text-sm text-ink/85">
                <input
                  type="checkbox"
                  checked={selLine.showArrow ?? selLine.kind !== "block"}
                  onChange={(e) => updateCall(call.id, { lines: call.lines.map((l) => (l.id === selLine.id ? { ...l, showArrow: e.target.checked } : l)) })}
                />
                Show Arrow
              </label>
              <label className="mt-1 flex items-center gap-2 text-sm text-ink/85">
                <input
                  type="checkbox"
                  checked={selLine.smooth ?? false}
                  onChange={(e) => updateCall(call.id, { lines: call.lines.map((l) => (l.id === selLine.id ? { ...l, smooth: e.target.checked } : l)) })}
                />
                Curved
              </label>
            </>
          ) : call && selDef !== null ? (
            <>
              <div className="display text-xs font-semibold tracking-[0.2em] text-dim mb-3">Assignment</div>
              <div className="mb-2 flex items-baseline gap-2">
                <span className="display text-2xl font-bold text-ember">{label(selDef)}</span>
                {(group.slots[selDef] ?? [])[0] && (
                  <span className="text-sm text-dim">
                    #{byId.get(group.slots[selDef][0])?.jersey} {byId.get(group.slots[selDef][0])?.name}
                  </span>
                )}
              </div>
              <textarea
                rows={5}
                value={call.assignments[selDef] ?? ""}
                onChange={(e) => updateCall(call.id, { assignments: { ...call.assignments, [selDef]: e.target.value } })}
                placeholder="Responsibility on this call — gap, leverage, drop, rules…"
                className="w-full rounded-lg border border-line bg-black/25 px-3 py-2 text-sm resize-y"
              />
            </>
          ) : call && selText ? (
            <>
              <div className="display text-xs font-semibold tracking-[0.2em] text-dim mb-3">Text</div>
              <textarea
                rows={3}
                value={selText.text}
                onChange={(e) => updateCall(call.id, { texts: (call.texts ?? []).map((t) => (t.id === selText.id ? { ...t, text: e.target.value } : t)) })}
                className="w-full rounded-lg border border-line bg-black/25 px-2.5 py-1.5 text-sm resize-y"
              />
            </>
          ) : (
            <p className="text-sm text-dim">
              Select a player, line, zone, or text on the field to edit it — or select a defender to write their
              assignment.
            </p>
          )}

          {call && (
            <>
              <div className="display text-xs font-semibold tracking-[0.2em] text-dim mt-5 mb-2">All assignments</div>
              <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1">
                {structure.slots.map((slot, i) =>
                  call.assignments[i] ? (
                    <button
                      key={i}
                      onClick={() => setSelection({ kind: "def", slot: i })}
                      className="rounded-lg border border-line bg-black/20 px-3 py-2 text-left text-xs hover:border-sky/40"
                    >
                      <span className="display font-bold text-sky mr-2">{label(i)}</span>
                      <span className="text-dim">{call.assignments[i]}</span>
                    </button>
                  ) : null,
                )}
              </div>
              <div className="mt-4">
                <label className="block text-xs text-dim mb-1">Call notes</label>
                <textarea
                  rows={3}
                  value={call.notes}
                  onChange={(e) => updateCall(call.id, { notes: e.target.value })}
                  className="w-full rounded-lg border border-line bg-black/25 px-3 py-2 text-xs resize-y"
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <label className="block text-[11px] font-semibold text-dim mb-1">{label}</label>
      {children}
    </div>
  );
}
