"use client";

// Tendency-report upload: the opponent's play-by-play CSV (Hudl-style) → one
// stored Play per snap. The coach maps the columns once; CounterScheme does all
// of the math from the snaps afterwards, so no tendency here is hand-typed.

import { useMemo, useState } from "react";
import Papa from "papaparse";
import { X, Upload, Check } from "lucide-react";
import type { Opponent } from "@/lib/store";
import { PLAY_FIELDS, guessMapping, rowsToPlays, headlineFromPlays, computeTells, type PlayField, type PlayMapping } from "@/lib/tendencies";

export default function TendencyImport({ onApply, onClose }: { onApply: (patch: Partial<Opponent>) => void; onClose: () => void }) {
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [map, setMap] = useState<PlayMapping>({});
  const [error, setError] = useState<string | null>(null);

  const onFile = (f: File | undefined) => {
    if (!f) return;
    if (/\.xlsx?$/i.test(f.name)) {
      setError("Excel files: save as CSV first (File → Save As → CSV). Hudl and MaxPreps both export CSV directly.");
      return;
    }
    Papa.parse<Record<string, string>>(f, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const hs = (res.meta.fields ?? []).filter((h) => h && h.trim());
        setHeaders(hs);
        setRows(res.data);
        setMap(guessMapping(hs));
        setError(null);
      },
      error: (e) => setError(e.message),
    });
  };

  const plays = useMemo(() => (rows.length ? rowsToPlays(rows, map) : []), [rows, map]);
  const patch = useMemo(() => (plays.length ? headlineFromPlays(plays) : null), [plays]);
  const tells = useMemo(() => (plays.length ? computeTells(plays) : null), [plays]);
  const ready = plays.length > 0 && (!!map.playType || !!map.play || !!map.result);
  const unmapped = headers.filter((h) => !Object.values(map).includes(h));
  const skipped = rows.length - plays.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 p-4" onClick={onClose}>
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-line bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 flex items-center gap-3 border-b border-line bg-white px-5 py-4">
          <Upload size={18} className="text-grass" />
          <div>
            <div className="font-extrabold">Upload Play-by-Play Report</div>
            <div className="text-xs text-dim">Hudl play-by-play CSV — one row per snap. Every column comes across; sparse tagging is fine.</div>
          </div>
          <button onClick={onClose} className="ml-auto text-dim hover:text-ink" aria-label="Close"><X size={18} /></button>
        </div>
        <div className="p-5">
          {rows.length === 0 ? (
            <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line px-6 py-10 text-center cursor-pointer hover:border-grass">
              <Upload size={22} className="text-dim" />
              <span className="text-sm font-semibold">Choose a CSV file</span>
              <span className="text-xs text-dim">Export the whole playlist from Hudl. Play Type, Down, Distance, Formation and Play carry the most weight — anything else you tag makes the report sharper.</span>
              <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
            </label>
          ) : (
            <>
              <div className="text-sm font-semibold mb-2">
                {plays.length} offensive snaps from {rows.length} rows{skipped > 0 ? ` (${skipped} skipped — defense, kicking, or blank)` : ""}. Check the columns:
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {PLAY_FIELDS.map((f) => (
                  <label key={f.key} className="text-xs text-dim">
                    {f.label}
                    <select
                      value={map[f.key] ?? ""}
                      onChange={(e) => setMap({ ...map, [f.key as PlayField]: e.target.value || null })}
                      className="mt-1 w-full rounded-md border border-line bg-white px-2 py-1.5 text-sm"
                    >
                      <option value="">— not in file —</option>
                      {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </label>
                ))}
              </div>
              {unmapped.length > 0 && (
                <p className="mt-3 text-xs text-dim">
                  Kept with each play as extra tagging: {unmapped.join(", ")}
                </p>
              )}
              {patch && ready && (
                <div className="mt-4 rounded-lg border border-line bg-slate-50 px-4 py-3 text-sm">
                  <div className="font-semibold mb-1">Preview</div>
                  <div className="text-dim">
                    {patch.runRate}% run · {patch.firstDownRun != null ? `${patch.firstDownRun}% run on 1st down · ` : ""}
                    {patch.formations?.length ?? 0} formations · {patch.concepts?.length ?? 0} play names
                    {patch.signatureConcept ? ` · most-called: ${patch.signatureConcept} (${patch.signatureRate}%)` : ""}
                  </div>
                  {tells && (
                    <div className="mt-2 text-dim">
                      {tells.actionable.length} tendencies worth building an answer for, {tells.interesting.length} more worth a look.
                    </div>
                  )}
                </div>
              )}
            </>
          )}
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        </div>
        <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-line bg-white px-5 py-3">
          {rows.length > 0 && <span className="mr-auto text-xs text-dim">Applying replaces this opponent&apos;s plays and recomputes every tendency.</span>}
          <button onClick={onClose} className="rounded-lg border border-line px-4 py-2 text-sm font-semibold text-dim hover:text-ink">Cancel</button>
          <button
            disabled={!patch || !ready}
            onClick={() => { if (patch) { onApply(patch); onClose(); } }}
            className="inline-flex items-center gap-2 rounded-lg bg-grass px-4 py-2 text-sm font-bold text-white hover:bg-grass-deep disabled:opacity-50"
          >
            <Check size={15} /> Apply to opponent
          </button>
        </div>
      </div>
    </div>
  );
}
