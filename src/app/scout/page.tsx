"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Plus, X, ChevronRight, Binoculars, Upload } from "lucide-react";
import {
  useStore, useHydrated,
  type Opponent, type ScoutFormation, type ScoutConcept, type ScoutKeyPlayer,
} from "@/lib/store";

const card = "rounded-xl border border-line bg-card shadow-sm";
const cardHead = "display uppercase text-xs font-bold tracking-[0.15em] text-ink px-5 py-3.5 border-b border-line flex items-center gap-3";
const th = "display uppercase text-[11px] tracking-widest text-dim font-semibold";
const input = "rounded-md border border-line bg-white px-2.5 py-1.5 text-sm focus:outline-none focus:border-grass";
const uid = () => Math.random().toString(36).slice(2, 9);

function FormationsTable({ o, onChange }: { o: Opponent; onChange: (patch: Partial<Opponent>) => void }) {
  const rows = o.formations;
  const setRow = (id: string, patch: Partial<ScoutFormation>) =>
    onChange({ formations: rows.map((r) => (r.id === id ? { ...r, ...patch } : r)) });
  return (
    <div className={card}>
      <div className={cardHead}>
        Formations / Sets
        <button
          onClick={() => onChange({ formations: [...rows, { id: uid(), name: "" }] })}
          className="ml-auto normal-case tracking-normal inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1 text-xs font-semibold text-dim hover:text-ink"
        >
          <Plus size={12} /> Add
        </button>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line bg-slate-50">
            <th className={`${th} text-left px-4 py-2`}>Formation</th>
            <th className={`${th} text-right px-2 py-2 w-24`}>% of snaps</th>
            <th className={`${th} text-right px-2 py-2 w-20`}>Run %</th>
            <th className={`${th} text-left px-3 py-2`}>Notes</th>
            <th className="w-9" />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-line/60 last:border-0">
              <td className="px-3 py-1.5">
                <input value={r.name} placeholder="e.g. Trips Right" onChange={(e) => setRow(r.id, { name: e.target.value })} className={`${input} w-full font-semibold`} />
              </td>
              <td className="px-2 py-1.5">
                <input type="number" value={r.snapsPct ?? ""} placeholder="—" onChange={(e) => setRow(r.id, { snapsPct: e.target.value === "" ? null : Number(e.target.value) })} className={`${input} w-full text-right tabular-nums`} />
              </td>
              <td className="px-2 py-1.5">
                <input type="number" value={r.runPct ?? ""} placeholder="—" onChange={(e) => setRow(r.id, { runPct: e.target.value === "" ? null : Number(e.target.value) })} className={`${input} w-full text-right tabular-nums`} />
              </td>
              <td className="px-3 py-1.5">
                <input value={r.notes ?? ""} placeholder="Motion? Personnel?" onChange={(e) => setRow(r.id, { notes: e.target.value })} className={`${input} w-full`} />
              </td>
              <td className="px-2 py-1.5">
                <button onClick={() => onChange({ formations: rows.filter((x) => x.id !== r.id) })} className="text-dim hover:text-red-500" aria-label="Remove"><X size={14} /></button>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={5} className="px-4 py-5 text-center text-sm text-dim">What do they line up in most? Add their top formations.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function ConceptsTable({ o, onChange }: { o: Opponent; onChange: (patch: Partial<Opponent>) => void }) {
  const rows = o.concepts;
  const setRow = (id: string, patch: Partial<ScoutConcept>) =>
    onChange({ concepts: rows.map((r) => (r.id === id ? { ...r, ...patch } : r)) });
  return (
    <div className={card}>
      <div className={cardHead}>
        Run / Pass Concepts
        <button
          onClick={() => onChange({ concepts: [...rows, { id: uid(), name: "", type: "Run" }] })}
          className="ml-auto normal-case tracking-normal inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1 text-xs font-semibold text-dim hover:text-ink"
        >
          <Plus size={12} /> Add
        </button>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line bg-slate-50">
            <th className={`${th} text-left px-4 py-2`}>Concept</th>
            <th className={`${th} text-left px-2 py-2 w-24`}>Type</th>
            <th className={`${th} text-right px-2 py-2 w-24`}>Times seen</th>
            <th className={`${th} text-left px-3 py-2`}>Notes</th>
            <th className="w-9" />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-line/60 last:border-0">
              <td className="px-3 py-1.5">
                <input value={r.name} placeholder="e.g. Inside Zone, Four Verts" onChange={(e) => setRow(r.id, { name: e.target.value })} className={`${input} w-full font-semibold`} />
              </td>
              <td className="px-2 py-1.5">
                <select value={r.type} onChange={(e) => setRow(r.id, { type: e.target.value as ScoutConcept["type"] })} className={`${input} w-full`}>
                  <option>Run</option>
                  <option>Pass</option>
                </select>
              </td>
              <td className="px-2 py-1.5">
                <input type="number" value={r.freq ?? ""} placeholder="—" onChange={(e) => setRow(r.id, { freq: e.target.value === "" ? null : Number(e.target.value) })} className={`${input} w-full text-right tabular-nums`} />
              </td>
              <td className="px-3 py-1.5">
                <input value={r.notes ?? ""} placeholder="When do they run it?" onChange={(e) => setRow(r.id, { notes: e.target.value })} className={`${input} w-full`} />
              </td>
              <td className="px-2 py-1.5">
                <button onClick={() => onChange({ concepts: rows.filter((x) => x.id !== r.id) })} className="text-dim hover:text-red-500" aria-label="Remove"><X size={14} /></button>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={5} className="px-4 py-5 text-center text-sm text-dim">What do they actually do? Add their bread-and-butter plays.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function KeyPlayersTable({ o, onChange }: { o: Opponent; onChange: (patch: Partial<Opponent>) => void }) {
  const rows = o.keyPlayers;
  const setRow = (id: string, patch: Partial<ScoutKeyPlayer>) =>
    onChange({ keyPlayers: rows.map((r) => (r.id === id ? { ...r, ...patch } : r)) });
  return (
    <div className={card}>
      <div className={cardHead}>
        Key Players
        <button
          onClick={() => onChange({ keyPlayers: [...rows, { id: uid(), name: "" }] })}
          className="ml-auto normal-case tracking-normal inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1 text-xs font-semibold text-dim hover:text-ink"
        >
          <Plus size={12} /> Add
        </button>
      </div>
      <table className="w-full text-sm">
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-line/60 last:border-0">
              <td className="px-3 py-1.5 w-16">
                <input value={r.jersey ?? ""} placeholder="#" onChange={(e) => setRow(r.id, { jersey: e.target.value })} className={`${input} w-full text-center tabular-nums`} />
              </td>
              <td className="px-2 py-1.5">
                <input value={r.name} placeholder="Name" onChange={(e) => setRow(r.id, { name: e.target.value })} className={`${input} w-full font-semibold`} />
              </td>
              <td className="px-2 py-1.5 w-20">
                <input value={r.pos ?? ""} placeholder="Pos" onChange={(e) => setRow(r.id, { pos: e.target.value })} className={`${input} w-full`} />
              </td>
              <td className="px-2 py-1.5">
                <input value={r.notes ?? ""} placeholder="Why he matters / how to handle him" onChange={(e) => setRow(r.id, { notes: e.target.value })} className={`${input} w-full`} />
              </td>
              <td className="px-2 py-1.5 w-9">
                <button onClick={() => onChange({ keyPlayers: rows.filter((x) => x.id !== r.id) })} className="text-dim hover:text-red-500" aria-label="Remove"><X size={14} /></button>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={5} className="px-4 py-5 text-center text-sm text-dim">Who wins games for them?</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function ScoutPage() {
  const hydrated = useHydrated();
  const { opponents, addOpponent, updateOpponent, removeOpponent, seasonSchedule } = useStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (!hydrated) return <div className="px-8 py-10 text-dim">Loading…</div>;

  const selected = opponents.find((o) => o.id === selectedId) ?? opponents[0] ?? null;
  const onChange = (patch: Partial<Opponent>) => selected && updateOpponent(selected.id, patch);

  return (
    <div className="px-6 py-8 max-w-7xl mx-auto">
      <div className="mb-6 flex flex-wrap items-center gap-3 justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Opponent Scout</h1>
          <p className="text-dim mt-0.5">
            Organize who they are — formations, tendencies, and the people who beat you. Game Plans combines this
            with your team and scheme.
          </p>
        </div>
        <button
          onClick={() => {
            const name = window.prompt("Opponent name:");
            if (name?.trim()) setSelectedId(addOpponent(name));
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-grass px-4 py-2 text-sm font-semibold text-white transition hover:bg-grass-deep"
        >
          <Plus size={15} /> Add Opponent
        </button>
      </div>

      {opponents.length === 0 ? (
        <div className={`${card} px-6 py-14 text-center`}>
          <Binoculars size={34} className="mx-auto text-dim mb-3" />
          <div className="text-lg font-bold mb-1">No opponents scouted yet</div>
          <p className="text-sm text-dim max-w-md mx-auto mb-4">
            Add an opponent and enter what you know from film or a tendency report — formations, run/pass concepts,
            situational habits, key players. On the schedule:{" "}
            {seasonSchedule.filter((w) => w.opponent).slice(0, 3).map((w) => w.opponent).join(", ")}…
          </p>
          <button
            onClick={() => {
              const name = window.prompt("Opponent name:");
              if (name?.trim()) setSelectedId(addOpponent(name));
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-grass px-4 py-2 text-sm font-semibold text-white hover:bg-grass-deep"
          >
            <Plus size={15} /> Add your first opponent
          </button>
          <p className="mt-4 text-xs text-dim inline-flex items-center gap-1.5">
            <Upload size={12} /> CSV / Excel tendency-report upload is coming — manual entry works today.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[240px_1fr] items-start">
          {/* Opponent list */}
          <div className={`${card} overflow-hidden lg:sticky lg:top-[81px]`}>
            {opponents.map((o) => (
              <button
                key={o.id}
                onClick={() => setSelectedId(o.id)}
                className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm border-b border-line/60 last:border-0 transition ${
                  selected?.id === o.id ? "bg-grass/10 text-grass font-bold" : "hover:bg-slate-50 font-semibold"
                }`}
              >
                {o.name}
                {o.week && <span className="ml-auto text-xs text-dim font-normal">Wk {o.week}</span>}
              </button>
            ))}
          </div>

          {selected && (
            <motion.div key={selected.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4 min-w-0">
              <div className={`${card} p-4 flex flex-wrap items-center gap-3`}>
                <input
                  value={selected.name}
                  onChange={(e) => onChange({ name: e.target.value })}
                  className="text-xl font-extrabold rounded-lg border border-transparent bg-transparent px-2 py-1 hover:border-line focus:border-grass focus:outline-none"
                />
                <label className="flex items-center gap-2 text-sm text-dim">
                  Week
                  <select
                    value={selected.week ?? ""}
                    onChange={(e) => onChange({ week: e.target.value === "" ? null : Number(e.target.value) })}
                    className={`${input} w-40`}
                  >
                    <option value="">—</option>
                    {seasonSchedule.filter((w) => w.opponent).map((w) => (
                      <option key={w.week} value={w.week}>Wk {w.week} · {w.opponent}</option>
                    ))}
                  </select>
                </label>
                <div className="ml-auto flex items-center gap-2">
                  <Link
                    href="/gameplan"
                    className="inline-flex items-center gap-1 rounded-lg border border-grass/50 px-3.5 py-1.5 text-sm font-semibold text-grass hover:bg-grass hover:text-white transition"
                  >
                    Build game plan <ChevronRight size={14} />
                  </Link>
                  <button
                    onClick={() => {
                      if (window.confirm(`Remove ${selected.name} and their game plan?`)) {
                        removeOpponent(selected.id);
                        setSelectedId(null);
                      }
                    }}
                    className="text-dim hover:text-red-500"
                    aria-label="Remove opponent"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              <div className={card}>
                <div className={cardHead}>Personnel</div>
                <div className="p-4">
                  <input
                    value={selected.personnel}
                    onChange={(e) => onChange({ personnel: e.target.value })}
                    placeholder='e.g. "Mostly 11 personnel; heavy 12 near the goal line"'
                    className={`${input} w-full`}
                  />
                </div>
              </div>

              <FormationsTable o={selected} onChange={onChange} />
              <ConceptsTable o={selected} onChange={onChange} />

              <div className="grid gap-4 md:grid-cols-2">
                <div className={card}>
                  <div className={cardHead}>Down &amp; Distance</div>
                  <div className="p-4">
                    <textarea
                      rows={3}
                      value={selected.downDistance}
                      onChange={(e) => onChange({ downDistance: e.target.value })}
                      placeholder='e.g. "3rd & long = screen or draw; 2nd & short they take a shot"'
                      className={`${input} w-full resize-y`}
                    />
                  </div>
                </div>
                <div className={card}>
                  <div className={cardHead}>Red Zone</div>
                  <div className="p-4">
                    <textarea
                      rows={3}
                      value={selected.redZone}
                      onChange={(e) => onChange({ redZone: e.target.value })}
                      placeholder='e.g. "Fade to the big receiver; QB power inside the 5"'
                      className={`${input} w-full resize-y`}
                    />
                  </div>
                </div>
              </div>

              <KeyPlayersTable o={selected} onChange={onChange} />

              <div className={card}>
                <div className={cardHead}>Scouting Notes</div>
                <div className="p-4">
                  <textarea
                    rows={4}
                    value={selected.notes}
                    onChange={(e) => onChange({ notes: e.target.value })}
                    placeholder="Anything else — coaching tendencies, tempo, trick plays they carry…"
                    className={`${input} w-full resize-y`}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}
