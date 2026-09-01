"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "motion/react";
import {
  Search, Upload, Plus, Pencil, X, ChevronRight, ArrowUp, ArrowDown, Check,
  Star, Users, ClipboardCheck, Ambulance, UserPlus, LayoutGrid,
} from "lucide-react";
import { useStore, useHydrated, slotLabelOf, fmtHeight, overallRating, type Player } from "@/lib/store";
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

function Stars({ value, onChange }: { value: number | null | undefined; onChange?: (v: number | null) => void }) {
  const v = value ?? 0;
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(v === i ? null : i)}
          className={onChange ? "cursor-pointer" : "cursor-default"}
          aria-label={`Rate ${i}`}
        >
          <Star
            size={13}
            className={i <= v ? "fill-amber-400 text-amber-400" : "text-slate-300"}
          />
        </button>
      ))}
    </span>
  );
}

const card = "rounded-xl border border-line bg-card shadow-sm";
const cardHead = "display uppercase text-xs font-bold tracking-[0.15em] text-ink px-5 py-3.5 border-b border-line flex items-center gap-3";
const th = "display uppercase text-[11px] tracking-widest text-dim font-semibold";

function RosterRows({
  players, watchList, onRate, limit,
}: {
  players: Player[];
  watchList: string[];
  onRate: (id: string, v: number | null) => void;
  limit?: number;
}) {
  const shown = limit ? players.slice(0, limit) : players;
  return (
    <table className="w-full text-sm min-w-175">
      <thead>
        <tr className="border-b border-line bg-slate-50">
          <th className={`${th} text-left px-4 py-2.5`}>#</th>
          <th className={`${th} text-left px-4 py-2.5`}>Name</th>
          <th className={`${th} text-left px-4 py-2.5`}>Pos</th>
          <th className={`${th} text-left px-4 py-2.5`}>Class</th>
          <th className={`${th} text-right px-4 py-2.5`}>Ht</th>
          <th className={`${th} text-right px-4 py-2.5`}>Wt</th>
          <th className={`${th} text-right px-4 py-2.5`}>40 Yard</th>
          <th className={`${th} text-right px-4 py-2.5`}>Bench</th>
          <th className={`${th} text-right px-4 py-2.5`}>Squat</th>
          <th className={`${th} text-right px-4 py-2.5`}>Vert</th>
          <th className={`${th} text-left px-4 py-2.5`}>Rating</th>
        </tr>
      </thead>
      <tbody>
        {shown.map((p) => (
          <tr key={p.id} className="border-b border-line/60 last:border-0 hover:bg-slate-50">
            <td className="px-4 py-2.5 tabular-nums text-dim">{p.jersey ?? "—"}</td>
            <td className="px-4 py-2.5">
              <Link href={`/team/player?id=${p.id}`} className="font-semibold text-grass hover:underline">
                {p.name}
              </Link>
              {watchList.includes(p.id) && (
                <Star size={11} className="inline ml-1.5 -mt-0.5 fill-amber-400 text-amber-400" />
              )}
            </td>
            <td className="px-4 py-2.5 text-dim">{p.positions.join("/") || "—"}</td>
            <td className="px-4 py-2.5 text-dim">{p.cls || "—"}</td>
            <td className="px-4 py-2.5 text-right tabular-nums">{fmtHeight(p.heightIn)}</td>
            <td className="px-4 py-2.5 text-right tabular-nums">{p.weightLb ?? "—"}</td>
            <td className="px-4 py-2.5 text-right tabular-nums">{p.forty?.toFixed(2) ?? "—"}</td>
            <td className="px-4 py-2.5 text-right tabular-nums">{p.bench ?? "—"}</td>
            <td className="px-4 py-2.5 text-right tabular-nums">{p.squat ?? "—"}</td>
            <td className="px-4 py-2.5 text-right tabular-nums">{p.vertical ? `${p.vertical}"` : "—"}</td>
            <td className="px-4 py-2.5">
              <Stars value={overallRating(p)} onChange={(v) => onRate(p.id, v)} />
            </td>
          </tr>
        ))}
        {shown.length === 0 && (
          <tr>
            <td colSpan={11} className="px-4 py-8 text-center text-dim">No players.</td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

function TeamPageInner() {
  const hydrated = useHydrated();
  const router = useRouter();
  const searchParams = useSearchParams();
  const view = searchParams.get("view") ?? "overview";

  const {
    players, groups, activeGroupId, overrides, watchList, activity,
    setActiveGroup, setSlotPlayers, setGroupStructure, addGroup, addPlayer, updatePlayer,
    setSlotOverride, seasonSchedule, updateScheduleWeek, toggleWatch,
  } = useStore();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [wrOpen, setWrOpen] = useState(false);
  const [showAllPlayers, setShowAllPlayers] = useState(false);

  const group = groups.find((g) => g.id === activeGroupId) ?? groups[0];
  const structure = getStructure(group?.structureId ?? "3-4");
  const byId = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);

  const sorted = useMemo(
    () => [...players].sort((a, b) => (a.jersey ?? 999) - (b.jersey ?? 999)),
    [players],
  );
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return sorted;
    return sorted.filter(
      (p) =>
        p.name.toLowerCase().includes(t) ||
        String(p.jersey ?? "").includes(t) ||
        p.positions.some((pos) => pos.toLowerCase().includes(t)),
    );
  }, [sorted, q]);

  if (!hydrated) return <div className="px-8 py-10 text-dim">Loading…</div>;

  const injured = players.filter((p) => p.status !== "Healthy");
  const filledSlots = Object.values(group.slots).filter((ids) => ids.length > 0).length;
  const onRate = (id: string, v: number | null) => updatePlayer(id, { rating: v });

  const slotIds = selectedSlot !== null ? (group.slots[selectedSlot] ?? []) : [];
  const move = (i: number, dir: -1 | 1) => {
    if (selectedSlot === null) return;
    const next = [...slotIds];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    setSlotPlayers(group.id, selectedSlot, next);
  };

  const titleFor: Record<string, [string, string]> = {
    overview: ["My Team", "Manage your roster, depth chart, and team information."],
    depth: ["Depth Chart", "Assign, reorder, and rename positions on the field."],
    roster: ["Roster", "Every player with measurables and ratings."],
    profiles: ["Player Profiles", "Open a player to edit identity, measurables, and evaluation."],
    injuries: ["Injuries", "Availability status for every player."],
    watchlist: ["Watch List", "Players you're keeping an eye on."],
    weights: ["Weight Room", "Testing numbers — syncs to player profiles."],
    schedule: ["Season Schedule", "10 games + bye over 11 weeks. The calendar follows this."],
  };
  const [title, sub] = titleFor[view] ?? titleFor.overview;

  const depthEditor = (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <div className="mb-2 flex items-center justify-between">
        <div className="display uppercase text-xs font-bold tracking-[0.15em] text-dim">
          {group.name} ({structure.name})
        </div>
        <button
          onClick={() => { setEditing((e) => !e); setSelectedSlot(null); }}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-4 py-1.5 text-xs font-semibold transition ${
            editing ? "border-ember bg-ember/10 text-ember" : "border-line text-dim hover:text-ink hover:border-dim"
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
              onChange={(e) => { setGroupStructure(group.id, e.target.value); setSelectedSlot(null); }}
              className="rounded-lg border border-line bg-white px-3 py-1.5"
            >
              {structures.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            {selectedSlot === null && (
              <span className="text-dim">Click a position on the field to assign, reorder, or rename it.</span>
            )}
          </div>

          {selectedSlot !== null && (
            <div className="mt-2 grid gap-4 sm:grid-cols-[220px_1fr]">
              <div>
                <label className="block text-xs text-dim mb-1">Position name (your terminology)</label>
                <input
                  value={slotLabelOf(overrides, group.structureId, selectedSlot)}
                  onChange={(e) => setSlotOverride(group.structureId, selectedSlot, { label: e.target.value })}
                  className="w-full rounded-lg border border-line bg-white px-3 py-2 text-xl font-bold text-ember"
                />
                <p className="mt-1 text-xs text-dim">Renaming applies everywhere this structure is used.</p>
              </div>

              <div>
                <label className="block text-xs text-dim mb-1">Depth order — first is the starter</label>
                <div className="flex flex-col gap-1.5">
                  {slotIds.map((id, i) => {
                    const pl = byId.get(id);
                    return (
                      <div key={id} className="flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-1.5 text-sm">
                        <span className={`font-bold w-6 ${i === 0 ? "text-grass" : "text-dim"}`}>{i + 1}</span>
                        <span className="flex-1">
                          #{pl?.jersey ?? "—"} {pl?.name ?? "?"}
                          {i === 0 && <span className="ml-2 text-[11px] text-grass font-semibold">starter</span>}
                        </span>
                        <button onClick={() => move(i, -1)} className="text-dim hover:text-ink" aria-label="Move up"><ArrowUp size={14} /></button>
                        <button onClick={() => move(i, 1)} className="text-dim hover:text-ink" aria-label="Move down"><ArrowDown size={14} /></button>
                        <button
                          onClick={() => setSlotPlayers(group.id, selectedSlot, slotIds.filter((x) => x !== id))}
                          className="text-red-500/80 hover:text-red-600" aria-label="Remove"
                        ><X size={14} /></button>
                      </div>
                    );
                  })}
                  {(() => {
                    const concept =
                      overrides[group.structureId]?.[selectedSlot]?.concept ?? structure.slots[selectedSlot].concept;
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
                            if (e.target.value) setSlotPlayers(group.id, selectedSlot, [...slotIds, e.target.value]);
                          }}
                          className="rounded-lg border border-dashed border-line bg-white px-3 py-2 text-sm text-dim"
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
                          <input type="checkbox" checked={showAllPlayers} onChange={(e) => setShowAllPlayers(e.target.checked)} />
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

      <div className="mt-4">
        <div className="display uppercase text-xs font-bold tracking-[0.15em] text-dim mb-2">Personnel Groups</div>
        <div className="flex flex-wrap gap-2">
          {groups.map((g) => (
            <button
              key={g.id}
              onClick={() => { setActiveGroup(g.id); setSelectedSlot(null); }}
              className={`rounded-lg border px-4 py-2 text-sm font-semibold transition ${
                g.id === group.id ? "border-grass bg-grass/10 text-grass" : "border-line text-dim hover:text-ink hover:border-dim"
              }`}
            >
              {g.name}
              <span className="ml-2 text-xs font-normal opacity-70">
                {Object.values(g.slots).filter((ids) => ids.length > 0).length}/{getStructure(g.structureId).slots.length}
              </span>
            </button>
          ))}
          <button
            onClick={() => {
              const name = window.prompt("Package name (your terminology):");
              if (name?.trim()) addGroup(name.trim());
            }}
            className="rounded-lg border border-dashed border-line px-4 py-2 text-sm text-dim hover:text-ink hover:border-dim"
          >
            + Custom
          </button>
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="px-6 py-8 max-w-7xl mx-auto">
      <div className="mb-6 flex flex-wrap items-center gap-3 justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>
          <p className="text-dim mt-0.5">{sub}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setImportOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:border-dim"
          >
            <Upload size={15} /> Import Roster
          </button>
          <button
            onClick={() => { const id = addPlayer(); router.push(`/team/player?id=${id}`); }}
            className="inline-flex items-center gap-2 rounded-lg bg-grass px-4 py-2 text-sm font-semibold text-white transition hover:bg-grass-deep"
          >
            <Plus size={15} /> Add Player
          </button>
        </div>
      </div>

      {view === "overview" && (
        <div className="grid gap-5 xl:grid-cols-[1fr_300px] items-start">
          <div className="flex flex-col gap-5 min-w-0">
            {/* Depth chart card */}
            <div className={card}>
              <div className={cardHead}>
                Depth Chart
                <div className="ml-auto flex items-center gap-2 normal-case tracking-normal font-normal">
                  <span className="text-sm text-dim">Base Defense:</span>
                  <select
                    value={group.structureId}
                    onChange={(e) => setGroupStructure(group.id, e.target.value)}
                    className="rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-semibold"
                  >
                    {structures.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="p-4">
                <DepthChartCanvas
                  structureId={group.structureId}
                  slots={group.slots}
                  players={players}
                  overrides={overrides}
                />
                <div className="mt-2 text-center text-sm text-dim">
                  {structure.name} · {group.name} —{" "}
                  <Link href="/team?view=depth" className="text-grass font-semibold hover:underline">
                    edit depth chart
                  </Link>
                </div>
              </div>
            </div>

            {/* Roster card */}
            <div className={card}>
              <div className={cardHead}>
                Roster ({players.length})
                <div className="ml-auto flex items-center gap-2 normal-case tracking-normal font-normal">
                  <div className="relative">
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-dim" />
                    <input
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      placeholder="Search roster..."
                      className="w-44 rounded-lg border border-line bg-pitch pl-8 pr-3 py-1.5 text-sm placeholder:text-dim/70 focus:outline-none focus:border-grass"
                    />
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <RosterRows players={filtered} watchList={watchList} onRate={onRate} limit={8} />
              </div>
              <div className="border-t border-line px-5 py-3 text-center">
                <Link href="/team?view=roster" className="inline-flex items-center gap-1 text-sm font-semibold text-grass hover:underline">
                  View Full Roster <ChevronRight size={14} />
                </Link>
              </div>
            </div>
          </div>

          {/* Right rail */}
          <div className="flex flex-col gap-5">
            <div className={card}>
              <div className={cardHead}>Team Summary</div>
              <div className="px-5 py-2 text-sm">
                {[
                  { icon: Users, label: "Total Players", value: players.length, href: "/team?view=roster" },
                  { icon: ClipboardCheck, label: "Positions Filled", value: `${filledSlots} / ${structure.slots.length}`, href: "/team?view=depth" },
                  { icon: Ambulance, label: "Injuries", value: injured.length, href: "/team?view=injuries" },
                  { icon: Star, label: "Watch List", value: watchList.length, href: "/team?view=watchlist" },
                ].map(({ icon: Icon, label, value, href }) => (
                  <Link key={label} href={href} className="flex items-center gap-3 py-2.5 border-b border-line/60 last:border-0 hover:text-grass">
                    <Icon size={16} className="text-dim" />
                    <span className="text-dim">{label}</span>
                    <span className="ml-auto font-bold tabular-nums text-ink">{value}</span>
                  </Link>
                ))}
              </div>
            </div>

            <div className={card}>
              <div className={cardHead}>Quick Actions</div>
              <div className="px-2 py-2">
                {[
                  { icon: UserPlus, label: "Add New Player", onClick: () => { const id = addPlayer(); router.push(`/team/player?id=${id}`); } },
                  { icon: LayoutGrid, label: "Create Depth Chart", onClick: () => router.push("/team?view=depth") },
                  { icon: Upload, label: "Import Roster", onClick: () => setImportOpen(true) },
                  { icon: Star, label: "Manage Watch List", onClick: () => router.push("/team?view=watchlist") },
                ].map(({ icon: Icon, label, onClick }) => (
                  <button
                    key={label}
                    onClick={onClick}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-ink hover:bg-slate-50"
                  >
                    <Icon size={16} className="text-grass" />
                    {label}
                    <ChevronRight size={14} className="ml-auto text-dim" />
                  </button>
                ))}
              </div>
            </div>

            <div className={card}>
              <div className={cardHead}>Recent Updates</div>
              <div className="px-5 py-2 text-sm">
                {activity.length === 0 && <div className="py-3 text-dim">No updates yet.</div>}
                {activity.slice(0, 5).map((a) => (
                  <div key={a.id} className="py-2.5 border-b border-line/60 last:border-0 flex gap-2.5">
                    <span className="mt-1.5 size-2 shrink-0 rounded-full bg-grass" />
                    <div className="leading-tight">
                      <div className="font-semibold">{a.text}</div>
                      {a.sub && <div className="text-xs text-dim mt-0.5">{a.sub}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {view === "depth" && depthEditor}

      {view === "roster" && (
        <div className={card}>
          <div className={cardHead}>
            All Players
            <div className="ml-auto normal-case tracking-normal font-normal relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-dim" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search roster..."
                className="w-52 rounded-lg border border-line bg-pitch pl-8 pr-3 py-1.5 text-sm placeholder:text-dim/70 focus:outline-none focus:border-grass"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <RosterRows players={filtered} watchList={watchList} onRate={onRate} />
          </div>
        </div>
      )}

      {view === "profiles" && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((p) => (
            <Link key={p.id} href={`/team/player?id=${p.id}`} className={`${card} p-4 flex items-center gap-3 hover:border-grass transition`}>
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-navy text-white font-bold text-sm tabular-nums">
                {p.jersey ?? "—"}
              </span>
              <div className="min-w-0">
                <div className="font-bold truncate">{p.name}</div>
                <div className="text-xs text-dim">
                  {p.positions.join("/") || "No position"} · {p.cls || "—"} · {p.status}
                </div>
                <Stars value={overallRating(p)} />
              </div>
              <ChevronRight size={15} className="ml-auto text-dim" />
            </Link>
          ))}
        </div>
      )}

      {view === "injuries" && (
        <div className={card}>
          <div className={cardHead}>Availability</div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-slate-50">
                <th className={`${th} text-left px-4 py-2.5`}>#</th>
                <th className={`${th} text-left px-4 py-2.5`}>Name</th>
                <th className={`${th} text-left px-4 py-2.5`}>Pos</th>
                <th className={`${th} text-left px-4 py-2.5`}>Status</th>
              </tr>
            </thead>
            <tbody>
              {[...sorted].sort((a, b) => (a.status === "Healthy" ? 1 : 0) - (b.status === "Healthy" ? 1 : 0)).map((p) => (
                <tr key={p.id} className="border-b border-line/60 last:border-0">
                  <td className="px-4 py-2 tabular-nums text-dim">{p.jersey ?? "—"}</td>
                  <td className="px-4 py-2">
                    <Link href={`/team/player?id=${p.id}`} className="font-semibold text-grass hover:underline">{p.name}</Link>
                  </td>
                  <td className="px-4 py-2 text-dim">{p.positions.join("/") || "—"}</td>
                  <td className="px-4 py-2">
                    <select
                      value={p.status}
                      onChange={(e) => updatePlayer(p.id, { status: e.target.value as Player["status"] })}
                      className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${
                        p.status === "Healthy"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : p.status === "Limited"
                            ? "border-amber-200 bg-amber-50 text-amber-700"
                            : "border-red-200 bg-red-50 text-red-600"
                      }`}
                    >
                      <option>Healthy</option>
                      <option>Limited</option>
                      <option>Out</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {view === "watchlist" && (
        <div className={card}>
          <div className={cardHead}>Watch List ({watchList.length})</div>
          <div className="px-5 py-3 text-sm text-dim border-b border-line">
            Star a player here or from their profile to keep them on this list.
          </div>
          <table className="w-full text-sm">
            <tbody>
              {sorted.map((p) => {
                const on = watchList.includes(p.id);
                return (
                  <tr key={p.id} className={`border-b border-line/60 last:border-0 ${on ? "" : "opacity-70"}`}>
                    <td className="px-4 py-2 w-10">
                      <button onClick={() => toggleWatch(p.id)} aria-label="Toggle watch">
                        <Star size={16} className={on ? "fill-amber-400 text-amber-400" : "text-slate-300 hover:text-amber-400"} />
                      </button>
                    </td>
                    <td className="px-4 py-2 tabular-nums text-dim w-12">{p.jersey ?? "—"}</td>
                    <td className="px-4 py-2">
                      <Link href={`/team/player?id=${p.id}`} className="font-semibold text-grass hover:underline">{p.name}</Link>
                    </td>
                    <td className="px-4 py-2 text-dim">{p.positions.join("/") || "—"}</td>
                    <td className="px-4 py-2 text-dim">{p.cls || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {view === "weights" && (
        <div className={card}>
          <div className={cardHead}>
            Weight Room
            <button
              onClick={() => setWrOpen(true)}
              className="ml-auto normal-case tracking-normal inline-flex items-center gap-1.5 rounded-lg border border-grass/50 px-3.5 py-1.5 text-xs font-semibold text-grass transition hover:bg-grass hover:text-white"
            >
              <Upload size={13} /> Upload weight room data
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-175">
              <thead>
                <tr className="border-b border-line bg-slate-50">
                  {["#", "Player", "Wt", "Squat", "Bench", "Clean", "Vert", "40", "5-10-5"].map((h, i) => (
                    <th key={h} className={`${th} px-4 py-2.5 ${i < 2 ? "text-left" : "text-right"}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((pl) => (
                  <tr key={pl.id} className="border-b border-line/60 last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-2 tabular-nums text-dim">{pl.jersey ?? "—"}</td>
                    <td className="px-4 py-2">
                      <Link href={`/team/player?id=${pl.id}`} className="font-semibold text-grass hover:underline">{pl.name}</Link>
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
      )}

      {view === "schedule" && (
        <div className={card}>
          <div className={cardHead}>Season Schedule</div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-slate-50">
                {["Wk", "Date", "Opponent", "H/A", "Result"].map((h) => (
                  <th key={h} className={`${th} text-left px-4 py-2.5`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {seasonSchedule.map((w) => (
                <tr key={w.week} className={`border-b border-line/60 last:border-0 ${w.opponent === null ? "bg-slate-50" : ""}`}>
                  <td className="px-4 py-2 font-bold text-grass tabular-nums">{w.week}</td>
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
                        w.opponent === null ? "font-bold placeholder:text-ember" : "font-semibold"
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
          <p className="px-5 py-3 text-xs text-dim border-t border-line">
            Clear an opponent to mark a bye week. The calendar follows this schedule.
          </p>
        </div>
      )}

      {importOpen && <RosterImport onClose={() => setImportOpen(false)} />}
      {wrOpen && <WeightRoomImport onClose={() => setWrOpen(false)} />}
    </div>
  );
}

export default function TeamPage() {
  return (
    <Suspense fallback={<div className="px-8 py-10 text-dim">Loading…</div>}>
      <TeamPageInner />
    </Suspense>
  );
}
