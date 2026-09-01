"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { ArrowLeft, Trash2, Star } from "lucide-react";
import { useStore, useHydrated, SKILLS, overallRating, type Player, type Evaluation } from "@/lib/store";

const numFields: { key: keyof Player; label: string; group: string; unit?: string }[] = [
  { key: "heightIn", label: "Height", group: "Body", unit: "in" },
  { key: "weightLb", label: "Weight", group: "Body", unit: "lb" },
  { key: "squat", label: "Squat", group: "Strength", unit: "lb" },
  { key: "bench", label: "Bench", group: "Strength", unit: "lb" },
  { key: "clean", label: "Power clean", group: "Strength", unit: "lb" },
  { key: "vertical", label: "Vertical jump", group: "Explosiveness", unit: "in" },
  { key: "broad", label: "Broad jump", group: "Explosiveness", unit: "in" },
  { key: "forty", label: "40-yard dash", group: "Speed / Agility", unit: "s" },
  { key: "flying10", label: "Flying 10", group: "Speed / Agility", unit: "s" },
  { key: "shuttle", label: "5-10-5", group: "Speed / Agility", unit: "s" },
];

const evalFields: { key: keyof Evaluation; label: string; rows?: number }[] = [
  { key: "skill", label: "Skill / technique" },
  { key: "iq", label: "Football IQ" },
  { key: "strengths", label: "Strengths" },
  { key: "limitations", label: "Limitations" },
  { key: "notes", label: "Notes", rows: 3 },
];

const groups = ["Body", "Strength", "Explosiveness", "Speed / Agility"];

export default function PlayerProfilePage() {
  return (
    <Suspense fallback={<div className="px-8 py-10 display text-dim">Loading…</div>}>
      <PlayerProfile />
    </Suspense>
  );
}

function PlayerProfile() {
  const id = useSearchParams().get("id") ?? "";
  const hydrated = useHydrated();
  const router = useRouter();
  const player = useStore((s) => s.players.find((p) => p.id === id));
  const updatePlayer = useStore((s) => s.updatePlayer);
  const removePlayer = useStore((s) => s.removePlayer);
  const watchList = useStore((s) => s.watchList);
  const toggleWatch = useStore((s) => s.toggleWatch);

  if (!hydrated) return <div className="px-8 py-10 display text-dim">Loading…</div>;
  if (!player)
    return (
      <div className="px-8 py-10">
        <p className="text-dim">Player not found.</p>
        <Link href="/team" className="text-sky hover:underline">
          ← Back to My Team
        </Link>
      </div>
    );

  const setNum = (key: keyof Player, v: string) =>
    updatePlayer(id, { [key]: v === "" ? null : parseFloat(v) } as Partial<Player>);

  return (
    <div className="px-6 py-8 max-w-4xl mx-auto">
      <Link href="/team" className="inline-flex items-center gap-1.5 text-sm text-dim hover:text-ink mb-5">
        <ArrowLeft size={15} /> My Team
      </Link>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        {/* Identity */}
        <div className="rounded-xl border border-line bg-card/80 p-6 mb-5">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-xs text-dim mb-1">Jersey #</label>
              <input
                type="number"
                value={player.jersey ?? ""}
                onChange={(e) => setNum("jersey", e.target.value)}
                className="w-20 rounded-lg border border-line bg-slate-50 px-3 py-2 display text-2xl font-bold text-grass"
              />
            </div>
            <div className="flex-1 min-w-48">
              <label className="block text-xs text-dim mb-1">Name</label>
              <input
                value={player.name}
                onChange={(e) => updatePlayer(id, { name: e.target.value })}
                className="w-full rounded-lg border border-line bg-slate-50 px-3 py-2 display text-2xl font-bold"
              />
            </div>
            <div>
              <label className="block text-xs text-dim mb-1">Class</label>
              <input
                value={player.cls}
                onChange={(e) => updatePlayer(id, { cls: e.target.value })}
                placeholder="JR"
                className="w-20 rounded-lg border border-line bg-slate-50 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-xs text-dim mb-1">Positions (e.g. CB/WR)</label>
              <input
                value={player.positions.join("/")}
                onChange={(e) =>
                  updatePlayer(id, {
                    positions: e.target.value.split(/[\/,;]/).map((x) => x.trim().toUpperCase()).filter(Boolean),
                  })
                }
                className="w-32 rounded-lg border border-line bg-slate-50 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-xs text-dim mb-1">Status</label>
              <select
                value={player.status}
                onChange={(e) => updatePlayer(id, { status: e.target.value as Player["status"] })}
                className="rounded-lg border border-line bg-slate-50 px-3 py-2"
              >
                <option>Healthy</option>
                <option>Limited</option>
                <option>Out</option>
              </select>
            </div>
            <button
              onClick={() => toggleWatch(id)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-semibold ${
                watchList.includes(id) ? "border-amber-300 bg-amber-50 text-amber-700" : "border-line text-dim hover:text-ink"
              }`}
            >
              <Star size={15} className={watchList.includes(id) ? "fill-amber-400 text-amber-400" : ""} />
              {watchList.includes(id) ? "On Watch List" : "Watch"}
            </button>
          </div>
        </div>

        {/* Football skill ratings — what the analysis engine reasons with */}
        <div className="rounded-xl border border-line bg-card/80 p-5 mb-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="display uppercase text-xs font-semibold tracking-[0.2em] text-dim">Football Skills</div>
            <span className="ml-auto text-sm text-dim">
              Overall{" "}
              <span className="font-extrabold text-ink tabular-nums">{overallRating(player) ?? "—"}</span>
              <span className="text-xs">/5</span>
            </span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {SKILLS.map((s) => {
              const v = player.skills?.[s.key] ?? null;
              return (
                <div key={s.key} className="flex items-center justify-between gap-3 rounded-lg border border-line bg-slate-50 px-3 py-2 text-sm">
                  <span className="font-semibold">{s.label}</span>
                  <span className="inline-flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => updatePlayer(id, { skills: { ...player.skills, [s.key]: v === i ? null : i } })}
                        aria-label={`${s.label} ${i}`}
                      >
                        <Star size={16} className={v != null && i <= v ? "fill-amber-400 text-amber-400" : "text-slate-300 hover:text-amber-300"} />
                      </button>
                    ))}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-dim">
            1 = liability, 3 = solid starter, 5 = best on the field. These drive the personnel checks in Defensive Analysis and the matchups in Game Plans.
          </p>
        </div>

        {/* Measurables */}
        <div className="grid gap-5 sm:grid-cols-2 mb-5">
          {groups.map((g) => (
            <div key={g} className="rounded-xl border border-line bg-card/80 p-5">
              <div className="display uppercase text-xs font-semibold tracking-[0.2em] text-dim mb-3">{g}</div>
              <div className="flex flex-col gap-3">
                {numFields
                  .filter((f) => f.group === g)
                  .map((f) => (
                    <div key={f.key} className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-dim">{f.label}</span>
                      <span className="flex items-center gap-1.5">
                        <input
                          type="number"
                          step="0.01"
                          value={(player[f.key] as number | null) ?? ""}
                          onChange={(e) => setNum(f.key, e.target.value)}
                          placeholder="—"
                          className="w-24 rounded-lg border border-line bg-slate-50 px-2.5 py-1.5 text-right tabular-nums"
                        />
                        <span className="w-6 text-xs text-dim">{f.unit}</span>
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>

        {/* Football evaluation */}
        <div className="rounded-xl border border-line bg-card/80 p-5 mb-6">
          <div className="display uppercase text-xs font-semibold tracking-[0.2em] text-dim mb-3">
            Football Evaluation
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {evalFields.map((f) => (
              <div key={f.key} className={f.key === "notes" ? "sm:col-span-2" : ""}>
                <label className="block text-xs text-dim mb-1">{f.label}</label>
                <textarea
                  rows={f.rows ?? 2}
                  value={player.eval[f.key] ?? ""}
                  onChange={(e) => updatePlayer(id, { eval: { ...player.eval, [f.key]: e.target.value } })}
                  className="w-full rounded-lg border border-line bg-slate-50 px-3 py-2 text-sm resize-y"
                />
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-dim">
            Everything here becomes structured context for the coaching AI later — blanks are fine.
          </p>
        </div>

        <button
          onClick={() => {
            if (window.confirm(`Remove ${player.name} from the roster?`)) {
              removePlayer(id);
              router.push("/team");
            }
          }}
          className="inline-flex items-center gap-2 rounded-full border border-red-500/40 px-4 py-2 text-sm text-red-500 transition hover:bg-red-500/10"
        >
          <Trash2 size={15} /> Remove player
        </button>
      </motion.div>
    </div>
  );
}
