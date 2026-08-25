"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowLeft, CheckCircle2, AlertCircle, AlertTriangle } from "lucide-react";
import { useStore, useHydrated, slotLabelOf } from "@/lib/store";
import { getStructure } from "@/lib/football";

type Status = "Sound" | "Needs Review" | "Potential Conflict";

type Finding = {
  check: string;
  status: Status;
  detail: string;
  affected?: string[]; // position labels / call names this finding points at
};

const statusMeta: Record<Status, { icon: typeof CheckCircle2; cls: string; chip: string }> = {
  Sound: { icon: CheckCircle2, cls: "text-grass", chip: "border-grass/40 bg-grass/10 text-grass" },
  "Needs Review": { icon: AlertCircle, cls: "text-ember", chip: "border-ember/40 bg-ember/10 text-ember" },
  "Potential Conflict": { icon: AlertTriangle, cls: "text-red-400", chip: "border-red-500/40 bg-red-500/10 text-red-400" },
};

export default function SoundCheckPage() {
  const hydrated = useHydrated();
  const { groups, activeGroupId, players, scheme, calls, overrides } = useStore();
  if (!hydrated) return <div className="px-8 py-10 display text-dim">Loading…</div>;

  const group = groups.find((g) => g.id === activeGroupId) ?? groups[0];
  const structure = getStructure(group.structureId);
  const byId = new Map(players.map((p) => [p.id, p]));
  const label = (i: number) => slotLabelOf(overrides, group.structureId, i);

  const findings: Finding[] = [];

  // 1. Run gaps / box numbers
  const frontIdx = structure.slots.map((s, i) => (s.level === "front" ? i : -1)).filter((i) => i >= 0);
  const secondIdx = structure.slots.map((s, i) => (s.level === "second" ? i : -1)).filter((i) => i >= 0);
  const boxCount = frontIdx.length + secondIdx.length;
  const gaps = 8; // A A B B C C D D vs a 2-back / TE-flex look
  if (boxCount >= 7) {
    findings.push({
      check: "Run gaps / gap numbers",
      status: "Sound",
      detail: `${frontIdx.length} down (${frontIdx.map(label).join(", ")}) + ${secondIdx.length} second-level (${secondIdx.map(label).join(", ")}) = ${boxCount} potential fitters for ${gaps} gaps. Post-snap, secondary force players account for the edges.`,
    });
  } else {
    findings.push({
      check: "Run gaps / gap numbers",
      status: "Needs Review",
      detail: `${structure.name} puts ${boxCount} defenders near the box for ${gaps} gaps — a safety must trigger as an extra fitter, or a gap is intentionally traded for coverage. Confirm this matches your philosophy.`,
      affected: [...frontIdx, ...secondIdx].map(label),
    });
  }

  // 2. Numbers vs stated philosophy
  const wantsRunFirst = /run/i.test(scheme.philosophy);
  if (wantsRunFirst && boxCount < 7) {
    findings.push({
      check: "Defensive numbers vs philosophy",
      status: "Needs Review",
      detail: `Your philosophy says stop the run first, but ${group.name} (${structure.name}) is a light box. That can be an intentional tradeoff — flag, not a fault.`,
    });
  } else {
    findings.push({
      check: "Defensive numbers vs philosophy",
      status: "Sound",
      detail: wantsRunFirst
        ? `Run-first philosophy and ${boxCount} box-capable defenders in ${group.name} are consistent.`
        : `No numbers mismatch detected against the stated philosophy.`,
    });
  }

  // 3. Coverage responsibilities
  const deepIdx = structure.slots.map((s, i) => (s.level === "deep" ? i : -1)).filter((i) => i >= 0);
  findings.push({
    check: "Coverage responsibilities",
    status: deepIdx.length >= 3 ? "Sound" : "Needs Review",
    detail:
      deepIdx.length >= 3
        ? `${deepIdx.length} secondary players available (${deepIdx.map(label).join(", ")}) — 5 immediate threats can be matched with a rotation.`
        : `Only ${deepIdx.length} secondary players in this structure; verify who carries #2 vertical and who owns the post.`,
    affected: deepIdx.length >= 3 ? undefined : deepIdx.map(label),
  });

  // 4. Personnel conflicts in the depth chart (starters only — backups may repeat)
  const starterEntries = Object.entries(group.slots)
    .filter(([, ids]) => ids.length > 0)
    .map(([k, ids]) => ({ slot: Number(k), id: ids[0] }));
  const starterIds = starterEntries.map((e) => e.id);
  const dupeIds = [...new Set(starterIds.filter((id, i) => starterIds.indexOf(id) !== i))];
  const unavailable = starterEntries
    .map((e) => ({ ...e, pl: byId.get(e.id) }))
    .filter((e) => e.pl && e.pl.status !== "Healthy");
  const openIdx = structure.slots
    .map((_, i) => i)
    .filter((i) => !(group.slots[i]?.length > 0));

  if (dupeIds.length) {
    const details = dupeIds.map((id) => {
      const spots = starterEntries.filter((e) => e.id === id).map((e) => label(e.slot));
      return `${byId.get(id)?.name} is the starter at ${spots.join(" and ")}`;
    });
    findings.push({
      check: "Conflict / weak points",
      status: "Potential Conflict",
      detail: `${details.join("; ")}. One body can't own two spots on the same snap.`,
      affected: dupeIds.flatMap((id) => starterEntries.filter((e) => e.id === id).map((e) => label(e.slot))),
    });
  } else if (unavailable.length) {
    findings.push({
      check: "Conflict / weak points",
      status: "Needs Review",
      detail: `${unavailable.map((e) => `#${e.pl!.jersey} ${e.pl!.name} (${e.pl!.status}) at ${label(e.slot)}`).join(", ")} — check availability before game day.`,
      affected: unavailable.map((e) => label(e.slot)),
    });
  } else if (openIdx.length > 0) {
    findings.push({
      check: "Conflict / weak points",
      status: "Needs Review",
      detail: `${openIdx.length} position${openIdx.length > 1 ? "s" : ""} in ${group.name} unassigned: ${openIdx.map(label).join(", ")}. Fill the depth chart so pressure paths and coverage rules have real bodies behind them.`,
      affected: openIdx.map(label),
    });
  } else {
    findings.push({
      check: "Conflict / weak points",
      status: "Sound",
      detail: `No duplicate starters, no unavailable starters, all ${structure.slots.length} spots filled in ${group.name}.`,
    });
  }

  // 5. Pre/post-snap rules coverage in the playbook
  const checkCalls = calls.filter((c) => c.section === "Checks & Adjustments");
  findings.push({
    check: "Pre/post-snap rules",
    status: checkCalls.length > 0 ? "Sound" : "Needs Review",
    detail:
      checkCalls.length > 0
        ? `${checkCalls.length} check/adjustment call${checkCalls.length > 1 ? "s" : ""} stored: ${checkCalls.map((c) => c.name).join(", ")}.`
        : `No checks or adjustments stored yet — motion and unbalanced sets currently have no automatic answer in the playbook.`,
    affected: checkCalls.length > 0 ? undefined : ["Checks & Adjustments"],
  });

  const worst: Status = findings.some((f) => f.status === "Potential Conflict")
    ? "Potential Conflict"
    : findings.some((f) => f.status === "Needs Review")
      ? "Needs Review"
      : "Sound";

  return (
    <div className="px-8 py-10 max-w-3xl mx-auto">
      <Link href="/scheme" className="inline-flex items-center gap-1.5 text-sm text-dim hover:text-ink mb-4">
        <ArrowLeft size={15} /> My Scheme
      </Link>

      <div className="mb-6 flex flex-wrap items-center gap-4">
        <h1 className="display text-4xl font-bold">Sound Check</h1>
        <span className={`display rounded-full border px-4 py-1.5 text-sm font-semibold ${statusMeta[worst].chip}`}>
          {worst}
        </span>
        <span className="text-sm text-dim">
          Evaluating {group.name} ({structure.name}) against your stated philosophy
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {findings.map((f, i) => {
          const M = statusMeta[f.status];
          return (
            <motion.div
              key={f.check}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="rounded-xl border border-line bg-card/80 p-5 flex gap-4"
            >
              <M.icon size={22} className={`${M.cls} shrink-0 mt-0.5`} />
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="display text-lg font-bold">{f.check}</span>
                  <span className={`rounded-full border px-2.5 py-0.5 text-[11px] ${M.chip}`}>{f.status}</span>
                </div>
                <p className="text-sm text-dim leading-relaxed">{f.detail}</p>
                {f.affected && f.affected.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {[...new Set(f.affected)].map((a) => (
                      <span key={a} className={`display rounded-full border px-2 py-0.5 text-[11px] font-bold ${M.chip}`}>
                        {a}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      <p className="mt-6 text-sm text-dim">
        Sound Check offers considerations, not corrections. An intentional weakness created by your philosophy is
        yours to keep — it will be flagged, never changed.
      </p>
    </div>
  );
}
