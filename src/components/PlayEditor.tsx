"use client";

import { useEffect, useMemo, useState } from "react";
import {
  X,
  Search,
  Check,
  Share2,
  LayoutGrid,
  Lightbulb,
  Tags,
  SlidersHorizontal,
  Star,
  Play,
  Settings2,
  Lock,
} from "lucide-react";
import { useStore, slotLabelOf, type Call } from "@/lib/store";
import {
  getStructure,
  structures,
  offensivePresets,
  FIELD_PRESETS,
  ROUTE_COLORS,
  type FieldPreset,
  type LineStyle,
  type LineKind,
} from "@/lib/football";
import StudioCanvas, { type Selection } from "@/components/StudioCanvas";
import PlayCardSVG from "@/components/PlayCardSVG";

const PTYPES = ["Quarterback", "Running Back", "Fullback", "Wide Receiver", "Tight End", "Offensive Line", "Other"];
const INSPECTOR_TABS = ["Object", "Notes", "Animation"] as const;

export default function PlayEditor({ callId, onClose }: { callId: string; onClose: () => void }) {
  const {
    calls, updateCall, groups, activeGroupId, players, overrides,
    formationTemplates, saveFormationTemplate, setGroupStructure,
  } = useStore();
  const [selection, setSelection] = useState<Selection>(null);
  const [tab, setTab] = useState<(typeof INSPECTOR_TABS)[number]>("Object");
  const [libTab, setLibTab] = useState<"Offense" | "Defense">("Offense");
  const [q, setQ] = useState("");
  const [gearOpen, setGearOpen] = useState(false);

  const call = calls.find((c) => c.id === callId);
  const group = groups.find((g) => g.id === activeGroupId) ?? groups[0];
  const structure = getStructure(group.structureId);
  const label = (i: number) => slotLabelOf(overrides, group.structureId, i);
  const byId = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  if (!call) return null;

  const formations = [
    ...Object.keys(formationTemplates).map((n) => ({ name: n, source: "Yours" })),
    ...Object.keys(offensivePresets).map((n) => ({ name: n, source: "Built-in" })),
  ].filter((f) => f.name.toLowerCase().includes(q.trim().toLowerCase()));

  const loadFormation = (name: string) => {
    const look = formationTemplates[name] ?? offensivePresets[name];
    if (look) updateCall(call.id, { offLook: look.map((m) => ({ ...m })), offForm: call.offForm || name });
  };

  const selOff = selection?.kind === "off" ? call.offLook.find((m) => m.id === selection.id) : null;
  const selLine = selection?.kind === "line" ? call.lines.find((l) => l.id === selection.id) : null;
  const selText = selection?.kind === "text" ? (call.texts ?? []).find((t) => t.id === selection.id) : null;
  const selDef = selection?.kind === "def" ? selection.slot : null;

  const playId = `PB-${group.name.replace(/\s+/g, "").toUpperCase()}-${call.name.replace(/\s+/g, "-").toUpperCase()}`;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-pitch stadium-bg text-ink">
      {/* Dark app bar */}
      <div className="flex h-12 shrink-0 items-center gap-6 bg-black/60 border-b border-line px-4 text-white">
        <span className="display text-xl font-bold"><span className="text-grass">P</span>B</span>
        {["Dashboard", "Team", "Scouting", "Playbooks"].map((n) => (
          <span key={n} className={`text-sm ${n === "Playbooks" ? "font-semibold border-b-2 border-grass pb-0.5" : "text-white/60"}`}>{n}</span>
        ))}
        <div className="ml-auto flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 text-sm text-white/60">
          <Search size={14} /> Search plays, tags…
        </div>
        <span className="grid size-8 place-items-center rounded-full bg-grass/20 text-grass text-xs font-bold">CC</span>
      </div>

      {/* Breadcrumb bar */}
      <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-line bg-card/80 px-5 py-2.5">
        <span className="text-sm text-dim">Playbook</span>
        <span className="text-dim/50">/</span>
        <span className="text-sm text-dim">{call.section}</span>
        <span className="text-dim/50">/</span>
        <input
          value={call.name}
          onChange={(e) => updateCall(call.id, { name: e.target.value })}
          className="rounded-md border border-transparent bg-transparent px-2 py-1 text-sm font-bold hover:border-line focus:border-grass focus:outline-none w-44"
        />
        <span className="inline-flex items-center gap-1.5 rounded-full bg-grass/10 px-2.5 py-1 text-xs font-medium text-grass">
          <Check size={12} /> Saved
        </span>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => navigator.clipboard?.writeText(window.location.origin + "/scheme/playbook").catch(() => {})}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm text-dim hover:text-ink hover:bg-white/5"
          >
            <Share2 size={14} /> Share
          </button>
          <button
            onClick={onClose}
            className="inline-flex items-center gap-1.5 rounded-lg bg-grass px-4 py-1.5 text-sm font-bold text-pitch hover:brightness-110"
          >
            Publish Play
          </button>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-dim hover:bg-white/5">
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex min-h-0 flex-1">
        {/* Icon rail */}
        <div className="flex w-14 shrink-0 flex-col items-center gap-1 border-r border-line bg-card/60 py-3">
          {[
            { icon: LayoutGrid, l: "Library", active: true },
            { icon: Lightbulb, l: "Concepts" },
            { icon: Tags, l: "Tags" },
            { icon: SlidersHorizontal, l: "Filters" },
          ].map(({ icon: I, l, active }) => (
            <span
              key={l}
              title={l}
              className={`flex flex-col items-center gap-0.5 rounded-lg px-2 py-2 text-[9px] font-medium ${
                active ? "bg-grass/15 text-grass" : "text-dim"
              }`}
            >
              <I size={17} />
              {l}
            </span>
          ))}
        </div>

        {/* Formation library */}
        <div className="flex w-60 shrink-0 flex-col border-r border-line bg-card/60">
          <div className="p-3 pb-2">
            <div className="display text-[11px] font-semibold tracking-widest text-dim mb-2">Formation Library</div>
            <div className="flex items-center gap-2 rounded-lg border border-line bg-black/25 px-2.5 py-1.5 mb-2">
              <Search size={13} className="text-dim" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search formations…" className="w-full bg-transparent text-sm outline-none placeholder:text-dim" />
            </div>
            <div className="flex rounded-lg bg-black/30 p-0.5 text-xs font-medium">
              {(["Offense", "Defense"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setLibTab(t)}
                  className={`flex-1 rounded-md py-1.5 ${libTab === t ? "bg-card shadow-sm text-ink" : "text-dim"}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
            {libTab === "Offense" ? (
              <>
                {["Yours", "Built-in"].map((src) => {
                  const items = formations.filter((f) => f.source === src);
                  if (!items.length) return null;
                  return (
                    <div key={src} className="mb-2">
                      <div className="px-1 py-1 text-[11px] font-semibold text-dim">
                        {src === "Yours" ? "Your formations" : "Built-in"} ({items.length})
                      </div>
                      {items.map((f) => (
                        <button
                          key={f.name}
                          onClick={() => loadFormation(f.name)}
                          className="group flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-ink/80 hover:bg-grass/10 hover:text-grass"
                        >
                          <span className="size-1.5 rounded-full bg-dim/40 group-hover:bg-grass" />
                          <span className="flex-1 truncate">{f.name}</span>
                          <Star size={12} className="text-dim opacity-0 group-hover:opacity-100" />
                        </button>
                      ))}
                    </div>
                  );
                })}
                <button
                  onClick={() => {
                    const name = window.prompt("Save current look as formation:", call.offForm)?.trim();
                    if (name) saveFormationTemplate(name, call.offLook);
                  }}
                  className="mt-1 w-full rounded-lg border border-dashed border-line px-2 py-1.5 text-sm text-dim hover:border-grass/50 hover:text-grass"
                >
                  + Save current as formation
                </button>
              </>
            ) : (
              <>
                <div className="px-1 py-1 text-[11px] font-semibold text-dim">Defensive structures</div>
                {structures.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      if (s.id !== group.structureId && window.confirm(`Switch ${group.name} to ${s.name}? Depth chart assignments for this package will reset.`))
                        setGroupStructure(group.id, s.id);
                    }}
                    className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm ${
                      s.id === group.structureId ? "bg-grass/10 font-semibold text-grass" : "text-ink/80 hover:bg-white/5"
                    }`}
                  >
                    <span className={`size-1.5 rounded-full ${s.id === group.structureId ? "bg-grass" : "bg-dim/40"}`} />
                    {s.name}
                  </button>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Canvas column */}
        <div className="flex min-w-0 flex-1 flex-col px-5 py-3">
          <div className="mb-2 flex items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-lg border border-line bg-card px-3 py-1.5 text-sm font-semibold">
              {call.offForm || "No formation"} {call.offConcept ? `· ${call.offConcept}` : ""}
            </span>
            <div className="relative ml-auto">
              <button
                onClick={() => setGearOpen((g) => !g)}
                className="rounded-lg border border-line bg-card p-2 text-dim hover:text-ink"
                aria-label="Field settings"
              >
                <Settings2 size={15} />
              </button>
              {gearOpen && (
                <div className="absolute right-0 top-10 z-10 w-52 rounded-xl border border-line bg-card p-3 shadow-xl">
                  <label className="block text-[11px] font-semibold text-dim mb-1">Field position</label>
                  <select
                    value={call.fieldPreset ?? "midfield"}
                    onChange={(e) => updateCall(call.id, { fieldPreset: e.target.value as FieldPreset })}
                    className="mb-3 w-full rounded-lg border border-line bg-black/25 px-2.5 py-1.5 text-sm"
                  >
                    {FIELD_PRESETS.map((p) => (
                      <option key={p.id} value={p.id}>{p.label}</option>
                    ))}
                  </select>
                  <label className="block text-[11px] font-semibold text-dim mb-1">Concept</label>
                  <input
                    value={call.offConcept}
                    onChange={(e) => updateCall(call.id, { offConcept: e.target.value })}
                    placeholder="Inside zone"
                    className="w-full rounded-lg border border-line bg-black/25 px-2.5 py-1.5 text-sm"
                  />
                </div>
              )}
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

          {/* Frames strip */}
          <div className="mt-3 flex items-center gap-3">
            <div>
              <div className="display text-[10px] font-semibold tracking-widest text-dim mb-1">Frames</div>
              <div className="flex gap-2">
                <div className="w-20 rounded-lg border-2 border-grass bg-white p-0.5">
                  <PlayCardSVG call={call} structureId={group.structureId} overrides={overrides} defStyle="letters" />
                </div>
                <button
                  disabled
                  title="Play animation — coming soon"
                  className="grid w-20 place-items-center rounded-lg border-2 border-dashed border-line text-[11px] text-dim"
                >
                  + Add Frame
                </button>
              </div>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <span className="display text-[10px] font-semibold tracking-widest text-dim">Animation</span>
              <button disabled title="Coming soon" className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-card px-3 py-1.5 text-sm text-dim/60">
                <Play size={13} /> Play
              </button>
              <span className="text-xs text-dim">1x · coming soon</span>
            </div>
          </div>
        </div>

        {/* Inspector */}
        <div className="flex w-72 shrink-0 flex-col border-l border-line bg-card/60">
          <div className="flex border-b border-line px-2">
            {INSPECTOR_TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3 py-2.5 text-sm font-medium ${tab === t ? "border-b-2 border-grass text-grass" : "text-dim"}`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {tab === "Object" && (
              <>
                {selOff ? (
                  <>
                    <div className="mb-3 flex items-center gap-2">
                      <span className="grid size-8 place-items-center rounded-full bg-ink text-xs font-bold text-pitch">{selOff.label}</span>
                      <div className="flex-1">
                        <div className="text-sm font-bold">{selOff.label} {selOff.ptype ? `(${selOff.ptype})` : ""}</div>
                        <div className="text-xs text-dim">{selOff.ptype ?? "Offensive player"}</div>
                      </div>
                      <Lock size={13} className="text-dim/50" />
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
                    <label className="mt-2 flex items-center gap-2 text-sm text-ink/85">
                      <input
                        type="checkbox"
                        checked={selOff.showLabel ?? true}
                        onChange={(e) => updateCall(call.id, { offLook: call.offLook.map((m) => (m.id === selOff.id ? { ...m, showLabel: e.target.checked } : m)) })}
                      />
                      Show Label
                    </label>
                  </>
                ) : selLine ? (
                  <>
                    <div className="mb-3 text-sm font-bold">Route</div>
                    <Field label="Type">
                      <select
                        value={selLine.kind}
                        onChange={(e) => updateCall(call.id, { lines: call.lines.map((l) => (l.id === selLine.id ? { ...l, kind: e.target.value as LineKind } : l)) })}
                        className="w-full rounded-lg border border-line bg-black/25 px-2.5 py-1.5 text-sm capitalize"
                      >
                        {(["route", "block", "motion", "pitch"] as LineKind[]).map((k) => <option key={k} value={k}>{k}</option>)}
                      </select>
                    </Field>
                    <Field label="Route Color">
                      <div className="flex gap-1.5">
                        {ROUTE_COLORS.map((c) => (
                          <button
                            key={c}
                            onClick={() => updateCall(call.id, { lines: call.lines.map((l) => (l.id === selLine.id ? { ...l, color: c } : l)) })}
                            className={`size-6 rounded-full ${selLine.color === c ? "ring-2 ring-grass ring-offset-1 ring-offset-card" : ""}`}
                            style={{ backgroundColor: c }}
                            aria-label={c}
                          />
                        ))}
                      </div>
                    </Field>
                    <Field label="Line Style">
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
                ) : selDef !== null ? (
                  <>
                    <div className="mb-3 flex items-center gap-2">
                      <span className="grid size-8 place-items-center rounded-full bg-ink text-xs font-bold text-pitch">{label(selDef)}</span>
                      <div>
                        <div className="text-sm font-bold">{label(selDef)}</div>
                        <div className="text-xs text-dim">
                          {(group.slots[selDef] ?? [])[0] ? `#${byId.get(group.slots[selDef][0])?.jersey} ${byId.get(group.slots[selDef][0])?.name}` : "Unassigned"}
                        </div>
                      </div>
                    </div>
                    <Field label="Assignment">
                      <textarea
                        rows={5}
                        value={call.assignments[selDef] ?? ""}
                        onChange={(e) => updateCall(call.id, { assignments: { ...call.assignments, [selDef]: e.target.value } })}
                        placeholder="Gap, leverage, drop, rules…"
                        className="w-full rounded-lg border border-line bg-black/25 px-2.5 py-1.5 text-sm resize-y"
                      />
                    </Field>
                    <p className="text-xs text-dim">Tip: select an O player, then double-click this defender to draw a block.</p>
                  </>
                ) : selText ? (
                  <>
                    <div className="mb-3 text-sm font-bold">Text</div>
                    <textarea
                      rows={3}
                      value={selText.text}
                      onChange={(e) => updateCall(call.id, { texts: (call.texts ?? []).map((t) => (t.id === selText.id ? { ...t, text: e.target.value } : t)) })}
                      className="w-full rounded-lg border border-line bg-black/25 px-2.5 py-1.5 text-sm resize-y"
                    />
                  </>
                ) : (
                  <p className="text-sm text-dim">Select a player, route, zone, or text on the field to edit its properties.</p>
                )}
              </>
            )}

            {tab === "Notes" && (
              <>
                <Field label="Play notes">
                  <textarea
                    rows={5}
                    value={call.notes}
                    onChange={(e) => updateCall(call.id, { notes: e.target.value })}
                    className="w-full rounded-lg border border-line bg-black/25 px-2.5 py-1.5 text-sm resize-y"
                  />
                </Field>
                <div className="display text-[11px] font-semibold tracking-widest text-dim mt-4 mb-2">Assignments</div>
                <div className="flex flex-col gap-1.5">
                  {structure.slots.map((slot, i) =>
                    call.assignments[i] ? (
                      <button
                        key={i}
                        onClick={() => { setSelection({ kind: "def", slot: i }); setTab("Object"); }}
                        className="rounded-lg border border-line bg-black/20 px-2.5 py-1.5 text-left text-xs hover:border-grass/40"
                      >
                        <span className="font-bold text-sky mr-1.5">{label(i)}</span>
                        <span className="text-dim">{call.assignments[i]}</span>
                      </button>
                    ) : null,
                  )}
                </div>
              </>
            )}

            {tab === "Animation" && (
              <div className="text-sm text-dim">
                <p className="font-medium text-ink/80 mb-1">Play animation</p>
                <p>Frame-by-frame animation is on the roadmap — draw the play now and it will animate here later.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div className="flex h-8 shrink-0 items-center gap-4 border-t border-line bg-card/80 px-5 text-xs text-dim">
        <span className="inline-flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-grass" /> Up to date · saves automatically</span>
        <span className="ml-auto font-mono">{playId}</span>
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
