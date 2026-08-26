"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useStore, slotLabelOf } from "@/lib/store";
import { getStructure, offensivePresets } from "@/lib/football";
import PlayCanvas from "@/components/PlayCanvas";

// Full-screen play editor — big canvas, big targets (Hudl-style authoring view).
export default function PlayEditor({ callId, onClose }: { callId: string; onClose: () => void }) {
  const { calls, updateCall, groups, activeGroupId, players, overrides, formationTemplates, saveFormationTemplate } = useStore();
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [selectedOff, setSelectedOff] = useState<string | null>(null);

  const call = calls.find((c) => c.id === callId);
  const group = groups.find((g) => g.id === activeGroupId) ?? groups[0];
  const structure = getStructure(group.structureId);
  const label = (i: number) => slotLabelOf(overrides, group.structureId, i);
  const byId = new Map(players.map((p) => [p.id, p]));

  // Lock background scroll while open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  if (!call) return null;
  const selOffMarker = call.offLook.find((m) => m.id === selectedOff) ?? null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-pitch stadium-bg">
      {/* Top metadata bar */}
      <div className="flex flex-wrap items-center gap-3 border-b border-line bg-black/40 px-5 py-3">
        <input
          value={call.name}
          onChange={(e) => updateCall(call.id, { name: e.target.value })}
          className="display rounded-lg border border-line bg-black/25 px-3 py-2 text-2xl font-bold w-56"
          placeholder="Play name"
        />
        <div>
          <label className="block text-[10px] text-dim">Offensive formation</label>
          <input
            value={call.offForm}
            onChange={(e) => updateCall(call.id, { offForm: e.target.value })}
            placeholder="Trips Right"
            className="rounded-lg border border-line bg-black/25 px-3 py-1.5 text-sm w-44"
          />
        </div>
        <div>
          <label className="block text-[10px] text-dim">Concept</label>
          <input
            value={call.offConcept}
            onChange={(e) => updateCall(call.id, { offConcept: e.target.value })}
            placeholder="Inside zone"
            className="rounded-lg border border-line bg-black/25 px-3 py-1.5 text-sm w-40"
          />
        </div>
        <div>
          <label className="block text-[10px] text-dim">Load formation</label>
          <select
            value=""
            onChange={(e) => {
              if (!e.target.value) return;
              const look = offensivePresets[e.target.value] ?? formationTemplates[e.target.value];
              if (look) updateCall(call.id, { offLook: look.map((m) => ({ ...m })) });
            }}
            className="rounded-lg border border-line bg-black/25 px-3 py-1.5 text-sm w-40"
          >
            <option value="">Choose…</option>
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
        </div>
        <button
          onClick={() => {
            const name = call.offForm.trim() || window.prompt("Formation name to save this look as:")?.trim();
            if (name) {
              saveFormationTemplate(name, call.offLook);
              if (!call.offForm.trim()) updateCall(call.id, { offForm: name });
            }
          }}
          className="self-end rounded-lg border border-grass/40 px-3 py-1.5 text-sm text-grass hover:bg-grass/10"
          title="Save this offensive look under the formation name"
        >
          Save formation
        </button>
        <span className="text-sm text-dim">{group.name} · {structure.name} · saves automatically</span>
        <button
          onClick={onClose}
          className="ml-auto display inline-flex items-center gap-2 rounded-full bg-grass px-6 py-2.5 text-sm font-bold text-pitch transition hover:brightness-110"
        >
          <X size={16} /> Done
        </button>
      </div>

      {/* Body */}
      <div className="flex min-h-0 flex-1 gap-4 p-4">
        <div className="flex min-w-0 flex-1 flex-col">
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
            large
          />
        </div>

        {/* Right rail */}
        <div className="w-80 shrink-0 overflow-y-auto rounded-xl border border-line bg-card/80 p-5">
          {selOffMarker ? (
            <>
              <div className="display text-sm font-semibold tracking-[0.2em] text-dim mb-3">Offensive player</div>
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
                  className="display w-24 rounded-lg border border-line bg-black/25 px-3 py-2.5 text-2xl font-bold text-red-400"
                />
                <button
                  onClick={() => {
                    updateCall(call.id, {
                      offLook: call.offLook.filter((m) => m.id !== selOffMarker.id),
                      lines: call.lines.filter((l) => l.anchor !== `off:${selOffMarker.id}`),
                    });
                    setSelectedOff(null);
                  }}
                  className="rounded-full border border-red-500/40 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10"
                >
                  Remove
                </button>
              </div>
              <p className="text-sm text-dim">
                Double-click a defender to draw a block from this player. Drag to reposition.
              </p>
            </>
          ) : selectedSlot !== null ? (
            <>
              <div className="display text-sm font-semibold tracking-[0.2em] text-dim mb-3">Assignment</div>
              <div className="mb-2 flex items-baseline gap-2">
                <span className="display text-3xl font-bold text-ember">{label(selectedSlot)}</span>
                {(group.slots[selectedSlot] ?? [])[0] && (
                  <span className="text-sm text-dim">
                    #{byId.get(group.slots[selectedSlot][0])?.jersey} {byId.get(group.slots[selectedSlot][0])?.name}
                  </span>
                )}
              </div>
              <textarea
                rows={6}
                value={call.assignments[selectedSlot] ?? ""}
                onChange={(e) =>
                  updateCall(call.id, { assignments: { ...call.assignments, [selectedSlot]: e.target.value } })
                }
                placeholder="Responsibility on this call — gap, leverage, drop, rules…"
                className="w-full rounded-lg border border-line bg-black/25 px-3 py-2.5 text-base resize-y"
              />
            </>
          ) : (
            <>
              <div className="display text-sm font-semibold tracking-[0.2em] text-dim mb-3">How to draw</div>
              <ol className="flex flex-col gap-2.5 text-sm text-dim list-decimal pl-4">
                <li>Pick a line style — Route, Block, Motion, or Pitch.</li>
                <li>Click the player the line starts from.</li>
                <li>Click each point of the path, or hold and drag to draw freehand.</li>
                <li>Double-click (or press Enter) to finish.</li>
                <li><span className="text-ink">Block shortcut:</span> in Select, click an O player, then double-click the defender he blocks.</li>
                <li>Click any line to edit it — drag the dots, double-click a dot to remove it.</li>
              </ol>
            </>
          )}

          <div className="display text-sm font-semibold tracking-[0.2em] text-dim mt-6 mb-2">Assignments</div>
          <div className="flex flex-col gap-1.5">
            {structure.slots.map((slot, i) =>
              call.assignments[i] ? (
                <button
                  key={i}
                  onClick={() => { setSelectedSlot(i); setSelectedOff(null); }}
                  className="rounded-lg border border-line bg-black/20 px-3 py-2 text-left text-sm hover:border-sky/40"
                >
                  <span className="display font-bold text-sky mr-2">{label(i)}</span>
                  <span className="text-dim">{call.assignments[i]}</span>
                </button>
              ) : null,
            )}
          </div>

          <div className="mt-5">
            <label className="block text-xs text-dim mb-1">Call notes</label>
            <textarea
              rows={3}
              value={call.notes}
              onChange={(e) => updateCall(call.id, { notes: e.target.value })}
              className="w-full rounded-lg border border-line bg-black/25 px-3 py-2 text-sm resize-y"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
