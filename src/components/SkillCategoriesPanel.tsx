"use client";

import { useMemo, useState } from "react";
import { X, Plus, RotateCcw, Lightbulb, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { POSITION_TYPES, SKILL_SCALE, suggestCategories, type PositionType } from "@/lib/skills";

const input =
  "rounded-md border border-line bg-white px-2.5 py-1.5 text-sm focus:outline-none focus:border-grass";

const slugify = (label: string) =>
  label.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `cat-${Date.now()}`;

/**
 * Skill Categories (Q10, Q23) — what each position type gets graded on. Five
 * or so per position; the coach adds, renames or removes anything he doesn't
 * ask his players to do.
 */
export default function SkillCategoriesPanel({
  onClose,
  focus,
}: {
  onClose: () => void;
  focus?: PositionType;
}) {
  const skillCategories = useStore((s) => s.skillCategories);
  const concepts = useStore((s) => s.concepts);
  const addSkillCategory = useStore((s) => s.addSkillCategory);
  const removeSkillCategory = useStore((s) => s.removeSkillCategory);
  const renameSkillCategory = useStore((s) => s.renameSkillCategory);
  const resetSkillCategories = useStore((s) => s.resetSkillCategories);
  const [adding, setAdding] = useState<Record<string, string>>({});

  const suggestions = useMemo(() => suggestCategories(skillCategories, concepts), [skillCategories, concepts]);
  const types = focus ? POSITION_TYPES.filter((t) => t.key === focus) : POSITION_TYPES;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-6" onClick={onClose}>
      <div
        className="w-full max-w-3xl rounded-2xl border border-line bg-card p-6 max-h-[88vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-2 flex items-center justify-between">
          <h2 className="display text-2xl font-bold">Skill Categories</h2>
          <button onClick={onClose} className="text-dim hover:text-ink" aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <p className="mb-5 text-sm text-dim">
          What each position gets graded on, 1–5. If your defense never asks a player to do it, take it off the list —
          nobody should grade man coverage on a team that plays zone.
        </p>

        <div className="mb-5 flex flex-wrap gap-2 text-xs text-dim">
          {SKILL_SCALE.map((s) => (
            <span key={s.value} className="rounded-full border border-line bg-slate-50 px-2.5 py-1">
              <b className="text-ink">{s.value}</b> {s.label}
            </span>
          ))}
        </div>

        <div className="flex flex-col gap-5">
          {types.map((t) => {
            const cats = skillCategories[t.key] ?? [];
            const forType = suggestions.filter((s) => s.type === t.key);
            return (
              <div key={t.key} className="rounded-xl border border-line bg-white p-4">
                <div className="mb-3 flex flex-wrap items-center gap-3">
                  <div>
                    <div className="display uppercase text-xs font-bold tracking-[0.15em] text-ink">{t.label}</div>
                    <div className="text-xs text-dim">{t.blurb}</div>
                  </div>
                  <button
                    onClick={() => resetSkillCategories(t.key)}
                    className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-dim hover:text-ink hover:border-dim"
                  >
                    <RotateCcw size={12} /> Reset
                  </button>
                </div>

                <div className="flex flex-col gap-2">
                  {cats.map((c) => (
                    <div key={c.id} className="flex items-center gap-2">
                      <input
                        value={c.label}
                        onChange={(e) => renameSkillCategory(t.key, c.id, e.target.value)}
                        className={`${input} flex-1`}
                      />
                      <button
                        onClick={() => removeSkillCategory(t.key, c.id)}
                        className="text-red-500/70 hover:text-red-600"
                        aria-label={`Remove ${c.label}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                  {cats.length === 0 && (
                    <div className="text-sm text-dim">No categories — add the ones you actually coach.</div>
                  )}
                  <div className="flex items-center gap-2">
                    <input
                      value={adding[t.key] ?? ""}
                      onChange={(e) => setAdding((a) => ({ ...a, [t.key]: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key !== "Enter") return;
                        const label = (adding[t.key] ?? "").trim();
                        if (!label) return;
                        addSkillCategory(t.key, { id: slugify(label), label });
                        setAdding((a) => ({ ...a, [t.key]: "" }));
                      }}
                      placeholder="Add a category…"
                      className={`${input} flex-1 border-dashed`}
                    />
                    <button
                      onClick={() => {
                        const label = (adding[t.key] ?? "").trim();
                        if (!label) return;
                        addSkillCategory(t.key, { id: slugify(label), label });
                        setAdding((a) => ({ ...a, [t.key]: "" }));
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-grass/50 px-3 py-1.5 text-xs font-semibold text-grass hover:bg-grass hover:text-white"
                    >
                      <Plus size={13} /> Add
                    </button>
                  </div>
                </div>

                {forType.length > 0 && (
                  <div className="mt-3 rounded-lg border border-grass/30 bg-grass/5 p-3">
                    <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-grass">
                      <Lightbulb size={13} /> From your scheme
                    </div>
                    <div className="flex flex-col gap-2">
                      {forType.map((s) => (
                        <div key={s.category.id} className="flex flex-wrap items-center gap-2 text-sm">
                          <button
                            onClick={() => addSkillCategory(s.type, s.category)}
                            className="inline-flex items-center gap-1 rounded-full border border-grass/50 bg-white px-3 py-1 text-xs font-semibold text-grass hover:bg-grass hover:text-white"
                          >
                            <Plus size={12} /> {s.category.label}
                          </button>
                          <span className="text-xs text-dim">{s.reason}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <p className="mt-5 text-xs text-dim">
          Grades already entered under a category you remove are kept — put the category back and they reappear.
        </p>
      </div>
    </div>
  );
}
