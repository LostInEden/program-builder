"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Search, Upload, Plus, Pencil, X, ChevronRight, ArrowUp, ArrowDown, Check, Dumbbell, CalendarDays, LayoutGrid } from "lucide-react";
import { useStore, useHydrated, slotLabelOf } from "@/lib/store";
import { getStructure, structures, type Concept } from "@/lib/football";
import DepthChartCanvas from "@/components/DepthChartCanvas";
import RosterImport from "@/components/RosterImport";
import WeightRoomImport from "@/components/WeightRoomImport";

// Which roster positions are eligible for a depth-chart spot, by the slot's
// standardized concept. The "show all" toggle bypasses this.
const CONCEPT_POS: Record<Concept, string[]> = {
  "Edge rusher": ["DE", "EDGE", "OLB", "DL", "LB"],
  "Interior DL": ["DT", "NT", "DL", "DE"],
  "Off-ball LB": ["LB", "MLB", "ILB", "OLB"],
  "Slot / Nickel": ["NB", "CB", "S", "SS", "FS", "DB"],
  "Corner": ["CB", "DB"],
  "Strong safety": ["SS", "S", "DB"],
  "Free safety": ["FS", "S", "DB"],
  "Hybrid / Overhang": ["LB", "S", "SS", "DB", "DE"],
};

export default function TeamPage() {
  const hydrated = useHydrated();
  const {
    players, groups, activeGroupId, overrides, opponent,
    setActiveGroup, setSlotPlayers, setGroupStructure, addGroup, addPlayer,
    setSlotOverride, setOpponent, seasonSchedule, updateScheduleWeek,
  } = useStore();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [wrOpen, setWrOpen] = useState(false);
  const [editingOpp, setEditingOpp] = useState(false);
  const [view, setView] = useState<"depth" | "weights" | "schedule">("depth");
  const [showAllPlayers, setShowAllPlayers] = useState(false);

  const group = groups.find((g) => g.id === activeGroupId) ?? groups[0];
  const structure = getStructure(group?.structureId ?? "3-4");
  const byId = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    const sorted = [...players].sort((a, b) => (a.jersey ?? 999) - (b.jersey ?? 999));
    if (!t) return sorted;
    return sorted.filter(
      (p) =>
        p.name.toLowerCase().includes(t) ||
        String(p.jersey ?? "").includes(t) ||
        p.positions.some((pos) => pos.toLowerCase().includes(t)),
    );
  }, [players, q]);

  if (!hydrated) return <div className="px-8 py-10 display text-dim">Loading…</div>;

  const slotIds = selectedSlot !== null ? (group.slots[selectedSlot] ?? []) : [];
  const move = (i: number, dir: -1 | 1) => {
    if (selectedSlot === null) return;
    const next = [...slotIds];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    setSlotPlayers(group.id, selectedSlot, next);
  };

  return (
    <div className="px-6 py-8 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="display text-4xl font-bold">My Team</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setImportOpen(true)}
            className="display inline-flex items-center gap-2 rounded-full border border-grass/50 px-4 py-2 text-sm font-semibold text-grass transition hover:bg-grass hover:text-pitch"
          >
            <Upload size={15} /> Import roster
          </button>
          <button
            onClick={() => addPlayer()}
            className="display inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-semibold text-dim transition hover:text-ink hover:border-dim"
          >
            <Plus size={15} /> Add player
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[300px_1fr] items-start">
        {/* Roster panel */}
        <div className="rounded-xl border border-line bg-card/80 flex flex-col max-h-[78vh]">
          <div className="p-3 border-b border-line">
            <div className="flex items-center gap-2 rounded-lg border border-line bg-black/25 px-3 py-2">
              <Search size={15} className="text-dim shrink-0" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Name, number, or position"
                className="w-full bg-transparent text-sm outline-none placeholder:text-dim"
              />
            </div>
          </div>
          <div className="overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card">
                <tr className="display text-[11px] tracking-widest text-dim border-b border-line">
                  <th className="text-left px-3 py-2">#</th>
                  <th className="text-left px-3 py-2">Name</th>
                  <th className="text-left px-3 py-2">Class</th>
                  <th className="text-left px-3 py-2">Pos</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-b border-line/50 last:border-0 hover:bg-white/4">
                    <td className="px-3 py-2 tabular-nums text-dim">{p.jersey ?? "—"}</td>
                    <td className="px-3 py-2">
                      <Link href={`/team/player?id=${p.id}`} className="font-semibold text-sky hover:underline">
                        {p.name}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-dim">{p.cls || "—"}</td>
                    <td className="px-3 py-2 text-dim">{p.positions.join("/") || "—"}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-dim">
                      No players match &ldquo;{q}&rdquo;
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Depth chart + groups + schedule */}
        <div className="flex flex-col gap-5 min-w-0">
          {/* View tabs */}
          <div className="flex gap-1.5 rounded-full border border-line bg-card p-1 self-start">
            {([
              { id: "depth", label: "Depth Chart", icon: LayoutGrid },
              { id: "weights", label: "Weight Room", icon: Dumbbell },
              { id: "schedule", label: "Season Schedule", icon: CalendarDays },
            ] as const).map((t) => (
              <button
                key={t.id}
                onClick={() => setView(t.id)}
                className={`display inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                  view === t.id ? "bg-grass text-pitch" : "text-dim hover:text-ink"
                }`}
              >
                <t.icon size={13} /> {t.label}
              </button>
            ))}
          </div>

          {view === "weights" && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <div className="mb-2 flex items-center justify-between">
                <div className="display text-xs font-semibold tracking-[0.2em] text-dim">
                  Weight Room — syncs to player profiles
                </div>
                <button
                  onClick={() => setWrOpen(true)}
                  className="display inline-flex items-center gap-1.5 rounded-full border border-grass/50 px-4 py-1.5 text-xs font-semibold text-grass transition hover:bg-grass hover:text-pitch"
                >
                  <Upload size={13} /> Upload weight room data
                </button>
              </div>
              <div className="rounded-xl border border-line bg-card/80 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-175">
                    <thead>
                      <tr className="display text-xs tracking-widest text-dim border-b border-line bg-black/30">
                        <th className="text-left px-4 py-2.5">#</th>
                        <th className="text-left px-4 py-2.5">Player</th>
                        <th className="text-right px-4 py-2.5">Wt</th>
                        <th className="text-right px-4 py-2.5">Squat</th>
                        <th className="text-right px-4 py-2.5">Bench</th>
                        <th className="text-right px-4 py-2.5">Clean</th>
                        <th className="text-right px-4 py-2.5">Vert</th>
                        <th className="text-right px-4 py-2.5">40</th>
                        <th className="text-right px-4 py-2.5">5-10-5</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...players]
                        .sort((a, b) => (a.jersey ?? 999) - (b.jersey ?? 999))
                        .map((pl) => (
                          <tr key={pl.id} className="border-b border-line/50 last:border-0 hover:bg-white/4">
                            <td className="px-4 py-2 tabular-nums text-dim">{pl.jersey ?? "—"}</td>
                            <td className="px-4 py-2">
                              <Link href={`/team/player?id=${pl.id}`} className="font-semibold text-sky hover:underline">
                                {pl.name}
                              </Link>
                            </td>
                            <td className="px-4 py-2 text-right tabular-nums">{pl.weightLb ?? "—"}</td>
                            <td className="px-4 py-2 text-right tabular-nums">{pl.squat ?? "—"}</td>
                            <td className="px-4 py-2 text-right tabular-nums">{pl.bench ?? "—"}</td>
                            <td className="px-4 py-2 text-right tabular-nums">{pl.clean ?? "—"}</td>
                            <td className="px-4 py-2 text-right tabular-nums">{pl.vertical ?? "—"}</td>
                            <td className="px-4 py-2 text-right tabular-nums">{pl.forty ?? "—"}</td>
                            <td className="px-4 py-2 text-right tabular-nums">{pl.shuttle ?? "—"}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {view === "schedule" && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <div className="display text-xs font-semibold tracking-[0.2em] text-dim mb-2">
                Season Schedule — 10 games + bye over 11 weeks
              </div>
              <div className="rounded-xl border border-line bg-card/80 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="display text-xs tracking-widest text-dim border-b border-line bg-black/30">
                      <th className="text-left px-4 py-2.5">Wk</th>
                      <th className="text-left px-4 py-2.5">Date</th>
                      <th className="text-left px-4 py-2.5">Opponent</th>
                      <th className="text-left px-4 py-2.5">H/A</th>
                      <th className="text-left px-4 py-2.5">Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {seasonSchedule.map((w) => (
                      <tr key={w.week} className={`border-b border-line/50 last:border-0 ${w.opponent === null ? "bg-white/3" : ""}`}>
                        <td className="px-4 py-2 display font-bold text-grass tabular-nums">{w.week}</td>
                        <td className="px-4 py-2">
                          <input
                            type="date"
                            value={w.date}
                            onChange={(e) => updateScheduleWeek(w.week, { date: e.target.value })}
                            className="rounded-lg border border-transparent bg-transparent px-1 py-1 tabular-nums hover:border-line focus:border-grass focus:outline-none"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            value={w.opponent ?? ""}
                            placeholder="BYE"
                            onChange={(e) => updateScheduleWeek(w.week, { opponent: e.target.value || null })}
                            className={`w-full rounded-lg border border-transparent bg-transparent px-1 py-1 hover:border-line focus:border-grass focus:outline-none ${
                              w.opponent === null ? "display font-bold placeholder:text-ember" : "font-semibold"
                            }`}
                          />
                        </td>
                        <td className="px-4 py-2">
                          {w.opponent !== null && (
                            <button
                              onClick={() => updateScheduleWeek(w.week, { homeAway: w.homeAway === "home" ? "away" : "home" })}
                              className={`rounded-full border px-2.5 py-0.5 text-xs ${
                                w.homeAway === "home" ? "border-grass/40 bg-grass/10 text-grass" : "border-line text-dim"
                              }`}
                            >
                              {w.homeAway === "home" ? "Home" : "Away"}
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-2">
                          {w.opponent !== null && (
                            <input
                              value={w.result ?? ""}
                              placeholder="—"
                              onChange={(e) => updateScheduleWeek(w.week, { result: e.target.value || undefined })}
                              className="w-24 rounded-lg border border-transparent bg-transparent px-1 py-1 text-dim tabular-nums hover:border-line focus:border-grass focus:outline-none"
                            />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs text-dim">Clear an opponent to mark a bye week. The calendar follows this schedule.</p>
            </motion.div>
          )}

          {view === "depth" && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <div className="mb-2 flex items-center justify-between">
              <div className="display text-xs font-semibold tracking-[0.2em] text-dim">
                Depth Chart — {group.name} ({structure.name})
              </div>
              <button
                onClick={() => {
                  setEditing((e) => !e);
                  setSelectedSlot(null);
                }}
                className={`display inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-xs font-semibold transition ${
                  editing
                    ? "border-ember bg-ember/15 text-ember"
                    : "border-line text-dim hover:text-ink hover:border-dim"
                }`}
              >
                {editing ? <Check size={13} /> : <Pencil size={13} />}
                {editing ? "Save & close" : "Edit depth chart"}
              </button>
            </div>

            <DepthChartCanvas
              structureId={group.structureId}
              slots={group.slots}
              players={players}
              overrides={overrides}
              onSlotClick={editing ? (i) => setSelectedSlot(i) : undefined}
              selectedSlot={selectedSlot}
            />

            {editing && (
              <div className="mt-3 rounded-xl border border-ember/40 bg-ember/5 p-4">
                <div className="flex flex-wrap items-center gap-3 text-sm mb-1">
                  <label className="text-dim">Structure:</label>
                  <select
                    value={group.structureId}
                    onChange={(e) => {
                      setGroupStructure(group.id, e.target.value);
                      setSelectedSlot(null);
                    }}
                    className="rounded-lg border border-line bg-black/25 px-3 py-1.5"
                  >
                    {structures.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  {selectedSlot === null && (
                    <span className="text-dim">Click a position on the field to assign, reorder, or rename it.</span>
                  )}
                </div>

                {selectedSlot !== null && (
                  <div className="mt-2 grid gap-4 sm:grid-cols-[220px_1fr]">
                    <div>
                      <label className="block text-xs text-dim mb-1">
                        Position name (your terminology)
                      </label>
                      <input
                        value={slotLabelOf(overrides, group.structureId, selectedSlot)}
                        onChange={(e) =>
                          setSlotOverride(group.structureId, selectedSlot, { label: e.target.value })
                        }
                        className="display w-full rounded-lg border border-line bg-black/25 px-3 py-2 text-xl font-bold text-ember"
                      />
                      <p className="mt-1 text-xs text-dim">
                        Renaming applies everywhere this structure is used.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs text-dim mb-1">
                        Depth order — first is the starter
                      </label>
                      <div className="flex flex-col gap-1.5">
                        {slotIds.map((id, i) => {
                          const pl = byId.get(id);
                          return (
                            <div
                              key={id}
                              className="flex items-center gap-2 rounded-lg border border-line bg-black/25 px-3 py-1.5 text-sm"
                            >
                              <span className={`display font-bold w-6 ${i === 0 ? "text-grass" : "text-dim"}`}>
                                {i + 1}
                              </span>
                              <span className="flex-1">
                                #{pl?.jersey ?? "—"} {pl?.name ?? "?"}
                                {i === 0 && <span className="ml-2 text-[11px] text-grass">starter</span>}
                              </span>
                              <button onClick={() => move(i, -1)} className="text-dim hover:text-ink" aria-label="Move up">
                                <ArrowUp size={14} />
                              </button>
                              <button onClick={() => move(i, 1)} className="text-dim hover:text-ink" aria-label="Move down">
                                <ArrowDown size={14} />
                              </button>
                              <button
                                onClick={() =>
                                  setSlotPlayers(group.id, selectedSlot, slotIds.filter((x) => x !== id))
                                }
                                className="text-red-400/80 hover:text-red-400"
                                aria-label="Remove"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          );
                        })}
                        {(() => {
                          const concept =
                            overrides[group.structureId]?.[selectedSlot]?.concept ??
                            structure.slots[selectedSlot].concept;
                          const allowed = CONCEPT_POS[concept] ?? [];
                          const eligible = [...players]
                            .filter((p) => !slotIds.includes(p.id))
                            .filter(
                              (p) =>
                                showAllPlayers ||
                                p.positions.length === 0 ||
                                p.positions.some((pos) => allowed.includes(pos.toUpperCase())),
                            )
                            .sort((a, b) => (a.jersey ?? 999) - (b.jersey ?? 999));
                          return (
                            <>
                              <select
                                value=""
                                onChange={(e) => {
                                  if (e.target.value)
                                    setSlotPlayers(group.id, selectedSlot, [...slotIds, e.target.value]);
                                }}
                                className="rounded-lg border border-dashed border-line bg-black/25 px-3 py-2 text-sm text-dim"
                              >
                                <option value="">
                                  + Add player… ({eligible.length} {showAllPlayers ? "on roster" : `eligible ${concept.toLowerCase()}s`})
                                </option>
                                {eligible.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    #{p.jersey ?? "—"} {p.name} ({p.positions.join("/") || "?"})
                                  </option>
                                ))}
                              </select>
                              <label className="flex items-center gap-1.5 text-xs text-dim">
                                <input
                                  type="checkbox"
                                  checked={showAllPlayers}
                                  onChange={(e) => setShowAllPlayers(e.target.checked)}
                                />
                                Show entire roster
                              </label>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
          )}

          {/* Personnel groups */}
          {view === "depth" && (
          <div>
            <div className="display text-xs font-semibold tracking-[0.2em] text-dim mb-2">
              Personnel Groups
            </div>
            <div className="flex flex-wrap gap-2">
              {groups.map((g) => (
                <button
                  key={g.id}
                  onClick={() => {
                    setActiveGroup(g.id);
                    setSelectedSlot(null);
                  }}
                  className={`display rounded-full border px-4 py-2 text-sm font-semibold transition ${
                    g.id === group.id
                      ? "border-grass bg-grass/15 text-grass"
                      : "border-line text-dim hover:text-ink hover:border-dim"
                  }`}
                >
                  {g.name}
                  <span className="ml-2 text-xs font-normal opacity-70">
                    {Object.values(g.slots).filter((ids) => ids.length > 0).length}/
                    {getStructure(g.structureId).slots.length}
                  </span>
                </button>
              ))}
              <button
                onClick={() => {
                  const name = window.prompt("Package name (your terminology):");
                  if (name?.trim()) addGroup(name.trim());
                }}
                className="display rounded-full border border-dashed border-line px-4 py-2 text-sm text-dim hover:text-ink hover:border-dim"
              >
                + Custom
              </button>
            </div>
          </div>
          )}

          {/* Schedule */}
          <div className="rounded-xl border border-line bg-card/80 px-5 py-4 flex flex-wrap items-center gap-4">
            <span className="grid size-10 place-items-center rounded-full bg-red-500/15 text-red-400 display font-bold">
              {opponent.name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
            </span>
            {editingOpp ? (
              <div className="flex flex-wrap items-center gap-2">
                <input
                  value={opponent.name}
                  onChange={(e) => setOpponent({ name: e.target.value })}
                  className="rounded-lg border border-line bg-black/25 px-3 py-1.5 display text-lg font-bold w-44"
                />
                <input
                  value={opponent.kickoff}
                  onChange={(e) => setOpponent({ kickoff: e.target.value })}
                  className="rounded-lg border border-line bg-black/25 px-3 py-1.5 text-sm w-44"
                />
              </div>
            ) : (
              <div className="leading-tight">
                <div className="display text-lg font-bold">This Week: vs {opponent.name}</div>
                <div className="text-sm text-dim">{opponent.kickoff}</div>
              </div>
            )}
            <button
              onClick={() => setEditingOpp((e) => !e)}
              className="text-dim hover:text-ink"
              aria-label="Edit opponent"
            >
              {editingOpp ? <Check size={16} /> : <Pencil size={15} />}
            </button>
            <Link
              href="/calendar"
              className="ml-auto display inline-flex items-center gap-1.5 rounded-full border border-line px-4 py-2 text-sm font-semibold text-dim transition hover:text-ink hover:border-dim"
            >
              View full schedule <ChevronRight size={15} />
            </Link>
          </div>
        </div>
      </div>

      {importOpen && <RosterImport onClose={() => setImportOpen(false)} />}
      {wrOpen && <WeightRoomImport onClose={() => setWrOpen(false)} />}
    </div>
  );
}
