"use client";

import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { useStore, useHydrated, type PlaybookSection } from "@/lib/store";
import PlayCardSVG from "@/components/PlayCardSVG";

const SECTIONS: PlaybookSection[] = ["Fronts", "Coverages", "Pressures", "Checks & Adjustments"];

export default function PlaybookPrintPage() {
  const hydrated = useHydrated();
  const { calls, groups, activeGroupId, overrides, defStyle } = useStore();
  if (!hydrated) return <div className="px-8 py-10 display text-dim">Loading…</div>;

  const group = groups.find((g) => g.id === activeGroupId) ?? groups[0];

  return (
    <div className="px-8 py-8 max-w-5xl mx-auto print-root">
      <style>{`
        @media print {
          aside, .no-print { display: none !important; }
          body { background: #fff !important; }
          .print-root { max-width: none !important; padding: 0 !important; }
          .print-card { break-inside: avoid; }
          .print-section { break-before: page; }
          .print-section:first-of-type { break-before: auto; }
        }
      `}</style>

      <div className="no-print mb-6 flex flex-wrap items-center gap-3">
        <Link href="/scheme/playbook" className="inline-flex items-center gap-1.5 text-sm text-dim hover:text-ink">
          <ArrowLeft size={15} /> Playbook
        </Link>
        <h1 className="display text-3xl font-bold">Print Playbook</h1>
        <span className="text-sm text-dim">8 cards per page · use your browser&apos;s &ldquo;Save as PDF&rdquo;</span>
        <button
          onClick={() => window.print()}
          className="ml-auto display inline-flex items-center gap-2 rounded-full bg-grass px-6 py-2.5 text-sm font-bold text-pitch transition hover:brightness-110"
        >
          <Printer size={16} /> Print / PDF
        </button>
      </div>

      {SECTIONS.map((section) => {
        const sectionCalls = calls.filter((c) => c.section === section);
        if (!sectionCalls.length) return null;
        return (
          <section key={section} className="print-section mb-8">
            <h2 className="display text-lg font-bold mb-3 rounded bg-white px-3 py-1.5 text-gray-900 print:bg-transparent">
              {section} — {group.name}
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {sectionCalls.map((c) => (
                <div key={c.id} className="print-card rounded bg-white p-2 text-gray-900">
                  <div className="flex items-baseline justify-between px-1 pb-1">
                    <span className="display text-sm font-bold">{c.name}</span>
                    <span className="text-[11px] text-gray-500">
                      {[c.offForm, c.offConcept].filter(Boolean).join(" · ")}
                    </span>
                  </div>
                  <PlayCardSVG call={c} structureId={group.structureId} overrides={overrides} defStyle={defStyle} />
                  {c.notes && <p className="px-1 pt-1 text-[11px] text-gray-600">{c.notes}</p>}
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
