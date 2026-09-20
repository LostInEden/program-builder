"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { ArrowLeft, Trash2, Star, SlidersHorizontal, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useStore, useHydrated, type Player, type Evaluation } from "@/lib/store";
import { categoriesFor, gradeTrend, SKILL_SCALE, TREND_COPY } from "@/lib/skills";
import SkillCategoriesPanel from "@/components/SkillCategoriesPanel";

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
  const skillCategories = useStore((s) => s.skillCategories);
  const seasonSchedule = useStore((s) => s.seasonSchedule);
  const setWeeklyGrade = useStore((s) => s.setWeeklyGrade);
  const clearWeeklyGrade = useStore((s) => s.clearWeeklyGrade);
  const [catsOpen, setCatsOpen] = useState(false);

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

  const { categories, guessed } = categoriesFor(skillCategories, player.positions);
  const trend = gradeTrend(player.weeklyGrades);
  const gradeFor = (week: number) => player.weeklyGrades?.find((g) => g.week === week);
  const TrendIcon = trend?.trend === "improving" ? TrendingUp : trend?.trend === "struggling" ? TrendingDown : Minus;

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
          </div>
        </div>

        {/* Football skills — position-specific categories (Q10) */}
        <div className="rounded-xl border border-line bg-card/80 p-5 mb-5">
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <div className="display uppercase text-xs font-semibold tracking-[0.2em] text-dim">Football Skills</div>
            {trend && (
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                  trend.trend === "improving"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : trend.trend === "struggling"
                      ? "border-amber-200 bg-amber-50 text-amber-700"
                      : "border-line bg-slate-50 text-dim"
                }`}
                title={`Weeks ${trend.weeks.join(", ")} · ${trend.avg}/5 average`}
              >
                <TrendIcon size={12} /> {TREND_COPY[trend.trend]}
              </span>
            )}
            <button
              onClick={() => setCatsOpen(true)}
              className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-dim hover:text-ink hover:border-dim"
            >
              <SlidersHorizontal size={13} /> Edit categories
            </button>
          </div>
          {guessed && (
            <p className="mb-3 text-xs text-dim">
              No defensive position on file for {player.name} — every category is shown. Set his position above and the
              list narrows to what he actually does.
            </p>
          )}
          <div className="grid gap-2 sm:grid-cols-2">
            {categories.map((s) => {
              const v = player.skills?.[s.id] ?? null;
              return (
                <div key={s.id} className="flex items-center justify-between gap-3 rounded-lg border border-line bg-slate-50 px-3 py-2 text-sm">
                  <span className="font-semibold">{s.label}</span>
                  <span className="inline-flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => updatePlayer(id, { skills: { ...player.skills, [s.id]: v === i ? null : i } })}
                        aria-label={`${s.label} ${i} — ${SKILL_SCALE[i - 1].label}`}
                        title={`${i} · ${SKILL_SCALE[i - 1].label}`}
                      >
                        <Star size={16} className={v != null && i <= v ? "fill-amber-400 text-amber-400" : "text-slate-300 hover:text-amber-300"} />
                      </button>
                    ))}
                  </span>
                </div>
              );
            })}
            {categories.length === 0 && (
              <div className="text-sm text-dim">No categories saved for this position yet — add them above.</div>
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-dim">
            {SKILL_SCALE.map((s) => (
              <span key={s.value} className="rounded-full border border-line bg-white px-2 py-0.5">
                <b className="text-ink">{s.value}</b> {s.label}
              </span>
            ))}
          </div>
          <p className="mt-2 text-xs text-dim">
            These say what this player can reasonably be asked to do in your defense. Athletic testing stays separate,
            below.
          </p>
        </div>

        {/* Weekly game grades (Q10) — optional, one row per week */}
        <div className="rounded-xl border border-line bg-card/80 p-5 mb-5">
          <div className="display uppercase text-xs font-semibold tracking-[0.2em] text-dim mb-1">Weekly Game Grades</div>
          <p className="mb-3 text-xs text-dim">
            One overall grade and a short note per game — whatever the position coach already writes down. Optional, and
            it never moves anybody on the depth chart.
          </p>
          <div className="flex flex-col gap-1.5">
            {seasonSchedule
              .filter((w) => w.opponent)
              .map((w) => {
                const g = gradeFor(w.week);
                return (
                  <div key={w.week} className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="w-28 shrink-0 text-dim">
                      Wk {w.week} <span className="text-xs">{w.opponent}</span>
                    </span>
                    <span className="inline-flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() =>
                            g?.grade === i ? clearWeeklyGrade(id, w.week) : setWeeklyGrade(id, w.week, { grade: i })
                          }
                          aria-label={`Week ${w.week} grade ${i}`}
                          title={`${i} · ${SKILL_SCALE[i - 1].label}`}
                        >
                          <Star
                            size={15}
                            className={g?.grade && i <= g.grade ? "fill-amber-400 text-amber-400" : "text-slate-300 hover:text-amber-300"}
                          />
                        </button>
                      ))}
                    </span>
                    <input
                      value={g?.note ?? ""}
                      onChange={(e) => setWeeklyGrade(id, w.week, { note: e.target.value })}
                      placeholder="Note (optional)"
                      className="flex-1 min-w-40 rounded-lg border border-line bg-slate-50 px-3 py-1.5 text-sm"
                    />
                  </div>
                );
              })}
          </div>
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

      {catsOpen && <SkillCategoriesPanel onClose={() => setCatsOpen(false)} />}
    </div>
  );
}
