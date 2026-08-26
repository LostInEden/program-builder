"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowLeft, Search } from "lucide-react";
import {
  COVERAGES,
  COVERAGE_FAMILIES,
  RECEIVER_NUMBERING,
  MASTER_RULE_FIELDS,
  MASTER_RULE_EXAMPLE,
  type Coverage,
  type CoverageRole,
} from "@/lib/coverages";

function RoleCard({ role }: { role: CoverageRole }) {
  const facts: [string, string][] = [];
  if (role.alignment) facts.push(["Alignment", role.alignment]);
  if (role.help) facts.push(["Help", role.help]);
  if (role.leverage) facts.push(["Leverage", role.leverage]);
  if (role.key) facts.push(["Key", role.key]);
  return (
    <div className="rounded-xl border border-line bg-card/80 overflow-hidden">
      <div className="display text-xs font-semibold tracking-[0.2em] text-grass px-5 py-3 bg-black/30 border-b border-line uppercase">
        {role.position}
      </div>
      <div className="px-5 py-3.5 flex flex-col gap-2.5 text-sm">
        {facts.map(([label, value]) => (
          <div key={label} className="grid grid-cols-[86px_1fr] gap-3">
            <span className="display text-[11px] font-semibold tracking-widest text-dim uppercase pt-0.5">
              {label}
            </span>
            <span>{value}</span>
          </div>
        ))}
        {role.rules.length > 0 && (
          <div className="grid grid-cols-[86px_1fr] gap-3">
            <span className="display text-[11px] font-semibold tracking-widest text-dim uppercase pt-0.5">
              Rules
            </span>
            <ul className="flex flex-col gap-1.5">
              {role.rules.map((r, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-grass shrink-0 mt-[3px]">▸</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function CoverageDetail({ coverage }: { coverage: Coverage }) {
  return (
    <motion.div
      key={coverage.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-4"
    >
      <div>
        <div className="display text-xs font-semibold tracking-[0.2em] text-dim mb-1 uppercase">
          {coverage.family}
        </div>
        <h2 className="display text-3xl font-bold">{coverage.name}</h2>
        <p className="text-dim mt-1">{coverage.summary}</p>
      </div>
      {coverage.roles.map((role) => (
        <RoleCard key={role.position} role={role} />
      ))}
    </motion.div>
  );
}

function MasterRulePanel() {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4">
      <div>
        <div className="display text-xs font-semibold tracking-[0.2em] text-dim mb-1 uppercase">Reference</div>
        <h2 className="display text-3xl font-bold">Master Software Rule</h2>
        <p className="text-dim mt-1">
          Every coverage responsibility should contain the same information — this is the checklist every
          assignment in the library is written against.
        </p>
      </div>

      <div className="rounded-xl border border-line bg-card/80 overflow-hidden">
        <div className="display text-xs font-semibold tracking-[0.2em] text-grass px-5 py-3 bg-black/30 border-b border-line uppercase">
          Receiver numbering
        </div>
        <table className="w-full text-sm">
          <tbody>
            {RECEIVER_NUMBERING.map((r) => (
              <tr key={r.label} className="border-b border-line/60 last:border-0">
                <td className="px-5 py-2 display font-bold text-grass w-14">{r.label}</td>
                <td className="px-5 py-2 text-dim">{r.meaning}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border border-line bg-card/80 overflow-hidden">
        <div className="display text-xs font-semibold tracking-[0.2em] text-grass px-5 py-3 bg-black/30 border-b border-line uppercase">
          The 13 questions
        </div>
        <table className="w-full text-sm">
          <tbody>
            {MASTER_RULE_FIELDS.map((f) => (
              <tr key={f.field} className="border-b border-line/60 last:border-0">
                <td className="px-5 py-2 display font-bold text-grass whitespace-nowrap">{f.field}</td>
                <td className="px-5 py-2 text-dim">{f.question}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border border-line bg-card/80 overflow-hidden">
        <div className="display text-xs font-semibold tracking-[0.2em] text-grass px-5 py-3 bg-black/30 border-b border-line uppercase">
          {MASTER_RULE_EXAMPLE.title}
        </div>
        <table className="w-full text-sm">
          <tbody>
            {MASTER_RULE_EXAMPLE.rows.map(([field, value]) => (
              <tr key={field} className="border-b border-line/60 last:border-0">
                <td className="px-5 py-2 display font-bold text-grass whitespace-nowrap">{field}</td>
                <td className="px-5 py-2 text-dim">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="px-5 py-3.5 text-sm border-t border-line bg-black/20">
          <span className="display text-[11px] font-semibold tracking-widest text-dim uppercase mr-2">
            Core rule
          </span>
          {MASTER_RULE_EXAMPLE.core}
        </p>
      </div>
    </motion.div>
  );
}

const MASTER_ID = "__master__";

export default function CoveragesPage() {
  const [selectedId, setSelectedId] = useState<string>(COVERAGES[0].id);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COVERAGES;
    return COVERAGES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.summary.toLowerCase().includes(q) ||
        c.family.toLowerCase().includes(q) ||
        c.roles.some((r) => r.position.toLowerCase().includes(q))
    );
  }, [query]);

  const selected = COVERAGES.find((c) => c.id === selectedId);

  return (
    <div className="px-8 py-10 max-w-6xl mx-auto">
      <Link href="/scheme" className="inline-flex items-center gap-1.5 text-sm text-dim hover:text-ink mb-4">
        <ArrowLeft size={15} /> My Scheme
      </Link>

      <h1 className="display text-4xl font-bold mb-2">Coverage Library</h1>
      <p className="text-dim mb-6 max-w-2xl">
        Match coverage, defined the same way for every defender: Alignment → Help → Leverage → Initial Key →
        Release Rule → Communication → Match/Pass → Next Threat. A reference, not a playbook — your calls and
        diagrams live in the Playbook.
      </p>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr] items-start">
        <div className="lg:sticky lg:top-6 flex flex-col gap-3">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-dim" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search coverages"
              className="w-full rounded-lg border border-line bg-black/25 pl-9 pr-3 py-2 text-sm placeholder:text-dim/60"
            />
          </div>

          <div className="rounded-xl border border-line bg-card/80 overflow-hidden max-h-[70vh] overflow-y-auto">
            {COVERAGE_FAMILIES.map((family) => {
              const items = filtered.filter((c) => c.family === family);
              if (items.length === 0) return null;
              return (
                <div key={family}>
                  <div className="display text-[10px] font-semibold tracking-[0.2em] text-dim px-4 py-2 bg-black/30 border-b border-line uppercase sticky top-0">
                    {family}
                  </div>
                  {items.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedId(c.id)}
                      className={`block w-full text-left px-4 py-2 text-sm border-b border-line/40 last:border-b-line transition ${
                        selectedId === c.id
                          ? "bg-grass/10 text-grass font-semibold"
                          : "text-ink hover:bg-white/5"
                      }`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              );
            })}
            <button
              onClick={() => setSelectedId(MASTER_ID)}
              className={`block w-full text-left px-4 py-2.5 text-sm transition display font-semibold ${
                selectedId === MASTER_ID ? "bg-ember/10 text-ember" : "text-dim hover:bg-white/5 hover:text-ink"
              }`}
            >
              Master Software Rule
            </button>
          </div>
        </div>

        <div>
          {selectedId === MASTER_ID ? (
            <MasterRulePanel />
          ) : selected ? (
            <CoverageDetail coverage={selected} />
          ) : null}
        </div>
      </div>
    </div>
  );
}
