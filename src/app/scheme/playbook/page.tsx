"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowLeft, Plus, Copy, Trash2, X, Maximize2 } from "lucide-react";
import PlayEditor from "@/components/PlayEditor";
import { useStore, useHydrated, slotLabelOf, type PlaybookSection } from "@/lib/store";
import { getStructure, offensivePresets, LOS_Y } from "@/lib/football";
import { recognizeFormation, formationLabel } from "@/lib/recognize";
import PlayCanvas from "@/components/PlayCanvas";

const SECTIONS: PlaybookSection[] = ["Fronts", "Coverages", "Pressures", "Checks & Adjustments"];

export default function PlaybookPage() {
  const hydrated = useHydrated();
  const {
    calls, activeCallId, setActiveCall, addCall, updateCall, duplicateCall, deleteCall,
    groups, activeGroupId, players, overrides, strengthRule, formationTerms,
  } = useStore();
  const [section, setSection] = useState<PlaybookSection>("Fronts");
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [selectedOff, setSelectedOff] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);

  if (!hydrated) return <div className="px-8 py-10 display text-dim">Loading…</div>;

  const group = groups.find((g) => g.id === activeGroupId) ?? groups[0];
  const structure = getStructure(group.structureId);
  const byId = new Map(players.map((p) => [p.id, p]));
  const sectionCalls = calls.filter((c) => c.section === section);
  const call = calls.find((c) => c.id === activeCallId && c.section === section) ?? sectionCalls[0] ?? null;
  const label = (i: number) => slotLabelOf(overrides, group.structureId, i);
  const rec = call ? recognizeFormation(call.offLook, strengthRule) : null;
  const selOffMarker = call?.offLook.find((m) => m.id === selectedOff) ?? null;

  return (
    <div className="px-6 py-8 max-w-7xl mx-auto">
      <Link href="/scheme" className="inline-flex items-center gap-1.5 text-sm text-dim hover:text-ink mb-4">
        <ArrowLeft size={15} /> My Scheme
      </Link>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <h1 className="display text-4xl font-bold">Playbook</h1>
        <div className="ml-auto flex gap-1.5 rounded-full border border-line bg-card p-1">
          {SECTIONS.map((s) => (
            <button
              key={s}
              onClick={() => { setSection(s); setSelectedSlot(null); setSelectedOff(null); }}
              className={`display rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                s === section ? "bg-sky text-pitch" : "text-dim hover:text-ink"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[220px_1fr_280px] items-start">
        {/* Call list */}
        <div className="rounded-xl border border-line bg-card/80 p-3 flex flex-col gap-1.5">
          {sectionCalls.map((c) => (
            <button
              key={c.id}
              onClick={() => { setActiveCall(c.id); setSelectedSlot(null); setSelectedOff(null); }}
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

        {/* Canvas */}
        <div className="min-w-0">
          {call ? (
            <motion.div key={call.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <input
                  value={call.name}
                  onChange={(e) => updateCall(call.id, { name: e.target.value })}
                  className="display rounded-lg border border-line bg-black/25 px-3 py-1.5 text-2xl font-bold min-w-0 w-52"
                />
                <button
                  onClick={() => setEditorOpen(true)}
                  className="display inline-flex items-center gap-1.5 rounded-full bg-grass px-4 py-1.5 text-xs font-bold text-pitch transition hover:brightness-110"
                >
                  <Maximize2 size={13} /> Full Screen
                </button>
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
                <span className="ml-auto text-xs text-dim">
                  {group.name} ({structure.name}) · saves automatically
                </span>
              </div>

              {/* Offensive look controls */}
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                <span className="text-dim">Offensive look:</span>
                <select
                  value=""
                  onChange={(e) => {
                    if (!e.target.value) return;
                    updateCall(call.id, {
                      offLook: offensivePresets[e.target.value].map((m) => ({ ...m })),
                    });
                    setSelectedOff(null);
                  }}
                  className="rounded-lg border border-line bg-black/25 px-2.5 py-1.5"
                >
                  <option value="">Load preset…</option>
                  {Object.keys(offensivePresets).map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
                <button
                  onClick={() =>
                    updateCall(call.id, {
                      offLook: [
                        ...call.offLook,
                        { id: Math.random().toString(36).slice(2, 8), label: "?", x: 50, y: LOS_Y + 14 },
                      ],
                    })
                  }
                  className="rounded-lg border border-line px-2.5 py-1.5 text-dim hover:text-ink"
                >
                  + Add player
                </button>
              </div>

              <PlayCanvas
                call={call}
                structureId={group.structureId}
                groupSlots={group.slots}
                players={players}
                labelFor={label}
                selectedSlot={selectedSlot}
                onSelectSlot={setSelectedSlot}
                selectedOff={selectedOff}
                onSelectOff={setSelectedOff}
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

        {/* Assignment / selection panel */}
        <div className="rounded-xl border border-line bg-card/80 p-4">
          {call && selOffMarker ? (
            <>
              <div className="display text-xs font-semibold tracking-[0.2em] text-dim mb-3">
                Offensive player
              </div>
              <div className="flex items-center gap-2 mb-3">
                <input
                  value={selOffMarker.label}
                  onChange={(e) =>
                    updateCall(call.id, {
                      offLook: call.offLook.map((m) =>
                        m.id === selOffMarker.id ? { ...m, label: e.target.value.slice(0, 3) } : m,
                      ),
                    })
                  }
                  className="display w-20 rounded-lg border border-line bg-black/25 px-3 py-2 text-xl font-bold text-red-400"
                />
                <button
                  onClick={() => {
                    updateCall(call.id, {
                      offLook: call.offLook.filter((m) => m.id !== selOffMarker.id),
                      lines: call.lines.filter((l) => l.anchor !== `off:${selOffMarker.id}`),
                    });
                    setSelectedOff(null);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full border border-red-500/40 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10"
                >
                  <X size={13} /> Remove
                </button>
              </div>
              <p className="text-xs text-dim">
                Drag to reposition (Select tool). Draw a route, block, or motion from this player with the tools
                above the field.
              </p>
            </>
          ) : (
            <>
              <div className="display text-xs font-semibold tracking-[0.2em] text-dim mb-3">
                Assignments
              </div>
              {call && selectedSlot !== null ? (
                <>
                  <div className="mb-2 flex items-baseline gap-2">
                    <span className="display text-2xl font-bold text-ember">{label(selectedSlot)}</span>
                    {(group.slots[selectedSlot] ?? [])[0] && (
                      <span className="text-sm text-dim">
                        #{byId.get(group.slots[selectedSlot][0])?.jersey}{" "}
                        {byId.get(group.slots[selectedSlot][0])?.name}
                      </span>
                    )}
                  </div>
                  <textarea
                    rows={5}
                    value={call.assignments[selectedSlot] ?? ""}
                    onChange={(e) =>
                      updateCall(call.id, { assignments: { ...call.assignments, [selectedSlot]: e.target.value } })
                    }
                    placeholder="This position's responsibility on this call — gap, leverage, drop, rules…"
                    className="w-full rounded-lg border border-line bg-black/25 px-3 py-2 text-sm resize-y"
                  />
                </>
              ) : (
                <p className="text-sm text-dim mb-3">
                  Select a defender for their responsibility, or use the drawing tools to put routes, blocks,
                  motions, and zones on the field.
                </p>
              )}
            </>
          )}

          {call && (
            <>
              <div className="display text-xs font-semibold tracking-[0.2em] text-dim mt-4 mb-2">
                All assignments
              </div>
              <div className="flex flex-col gap-1.5 max-h-52 overflow-y-auto pr-1">
                {structure.slots.map((slot, i) =>
                  call.assignments[i] ? (
                    <button
                      key={i}
                      onClick={() => { setSelectedSlot(i); setSelectedOff(null); }}
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

      {editorOpen && call && <PlayEditor callId={call.id} onClose={() => setEditorOpen(false)} />}
    </div>
  );
}
