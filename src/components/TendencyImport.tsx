"use client";

// Tendency-report upload: a play-by-play CSV/Excel export (Hudl-style) →
// computed tendencies. Code does the math; the coach maps the columns once.

import { useMemo, useState } from "react";
import Papa from "papaparse";
import { X, Upload, Check } from "lucide-react";
import { DOWNS, DISTANCES, emptyGrid, type Opponent } from "@/lib/store";

type Field = "down" | "distance" | "personnel" | "formation" | "playType" | "concept" | "yards" | "skip";
const FIELDS: { key: Field; label: string; aliases: string[] }[] = [
  { key: "down", label: "Down", aliases: ["dn", "down"] },
  { key: "distance", label: "Distance", aliases: ["dist", "distance", "to go", "togo", "yds to go"] },
  { key: "personnel", label: "Personnel", aliases: ["personnel", "pers", "off personnel", "grouping"] },
  { key: "formation", label: "Formation", aliases: ["formation", "form", "off form", "set"] },
  { key: "playType", label: "Play type (Run/Pass)", aliases: ["play type", "type", "run/pass", "run pass", "playtype", "r/p"] },
  { key: "concept", label: "Play / Concept", aliases: ["play", "concept", "play name", "off play", "scheme"] },
  { key: "yards", label: "Gain", aliases: ["gn/ls", "gain", "yards", "gn", "result"] },
];

const bucket = (dist: number) => (dist <= 3 ? DISTANCES[0] : dist <= 6 ? DISTANCES[1] : DISTANCES[2]);
const uid = () => Math.random().toString(36).slice(2, 9);

export function computeTendencies(rows: Record<string, string>[], map: Record<Field, string | null>): Partial<Opponent> {
  const get = (r: Record<string, string>, f: Field) => (map[f] ? (r[map[f]!] ?? "").trim() : "");
  const isRun = (r: Record<string, string>) => {
    const t = get(r, "playType").toLowerCase();
    if (/^r|run|rush/.test(t)) return true;
    if (/^p|pass|throw/.test(t)) return false;
    const c = get(r, "concept").toLowerCase();
    return /zone|power|counter|trap|iso|sweep|toss|dive|draw|read|option|qb/.test(c) && !/screen|rpo pass/.test(c);
  };
  const plays = rows.filter((r) => Object.values(r).some((v) => v && v.trim()));
  if (!plays.length) return {};
  const runs = plays.filter(isRun).length;
  const first = plays.filter((r) => /^1/.test(get(r, "down")));
  const firstRuns = first.filter(isRun).length;
  const rpo = plays.filter((r) => /rpo/i.test(get(r, "concept"))).length;

  // down × distance grid
  const grid = emptyGrid();
  const tally: Record<string, { run: number; n: number }> = {};
  for (const r of plays) {
    const d = get(r, "down").replace(/\D/g, "");
    const dist = parseInt(get(r, "distance"), 10);
    if (!d || Number.isNaN(dist)) continue;
    const key = `${d}|${bucket(dist)}`;
    tally[key] ??= { run: 0, n: 0 };
    tally[key].n++;
    if (isRun(r)) tally[key].run++;
  }
  for (const down of DOWNS) {
    for (const dist of DISTANCES) {
      const t = tally[`${down.replace(/\D/g, "")}|${dist}`];
      grid[down][dist] = t && t.n >= 3 ? Math.round((t.run / t.n) * 100) : null;
    }
  }

  const count = (f: Field) => {
    const m = new Map<string, { n: number; run: number }>();
    for (const r of plays) {
      const v = get(r, f);
      if (!v) continue;
      const e = m.get(v) ?? { n: 0, run: 0 };
      e.n++;
      if (isRun(r)) e.run++;
      m.set(v, e);
    }
    return [...m.entries()].sort((a, b) => b[1].n - a[1].n);
  };
  const personnel = count("personnel");
  const formations = count("formation");
  const concepts = count("concept");
  const top = concepts[0];

  return {
    playsImported: plays.length,
    runRate: Math.round((runs / plays.length) * 100),
    firstDownRun: first.length >= 5 ? Math.round((firstRuns / first.length) * 100) : null,
    rpoRate: rpo ? Math.round((rpo / plays.length) * 100) : null,
    signatureConcept: top ? top[0] : "",
    signatureRate: top ? Math.round((top[1].n / plays.length) * 100) : null,
    personnelUsage: personnel.slice(0, 6).map(([group, e]) => ({ id: uid(), group, pct: Math.round((e.n / plays.length) * 100) })),
    downDistance: grid,
    formations: formations.slice(0, 8).map(([name, e]) => ({
      id: uid(), name, snapsPct: Math.round((e.n / plays.length) * 100), runPct: Math.round((e.run / e.n) * 100),
    })),
    concepts: concepts.slice(0, 10).map(([name, e]) => ({
      id: uid(), name, type: e.run / e.n >= 0.5 ? ("Run" as const) : ("Pass" as const), freq: e.n,
    })),
  };
}

export default function TendencyImport({ onApply, onClose }: { onApply: (patch: Partial<Opponent>) => void; onClose: () => void }) {
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [map, setMap] = useState<Record<Field, string | null>>({ down: null, distance: null, personnel: null, formation: null, playType: null, concept: null, yards: null, skip: null });
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
        const hs = res.meta.fields ?? [];
        setHeaders(hs);
        setRows(res.data);
        const guess = { ...map };
        for (const fld of FIELDS) {
          const hit = hs.find((h) => fld.aliases.some((a) => h.toLowerCase().replace(/[_\-]/g, " ").trim() === a || h.toLowerCase().includes(a)));
          if (hit) guess[fld.key] = hit;
        }
        setMap(guess);
        setError(null);
      },
      error: (e) => setError(e.message),
    });
  };

  const preview = useMemo(() => (rows.length ? computeTendencies(rows, map) : null), [rows, map]);
  const ready = !!map.down && !!map.distance && (!!map.playType || !!map.concept);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 p-4" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-2xl border border-line bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-line px-5 py-4">
          <Upload size={18} className="text-grass" />
          <div>
            <div className="font-extrabold">Upload Tendency Report</div>
            <div className="text-xs text-dim">Play-by-play CSV (Hudl, MaxPreps, or your own sheet). One row per play.</div>
          </div>
          <button onClick={onClose} className="ml-auto text-dim hover:text-ink" aria-label="Close"><X size={18} /></button>
        </div>
        <div className="p-5">
          {rows.length === 0 ? (
            <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line px-6 py-10 text-center cursor-pointer hover:border-grass">
              <Upload size={22} className="text-dim" />
              <span className="text-sm font-semibold">Choose a CSV file</span>
              <span className="text-xs text-dim">Needs at least Down, Distance, and Play Type (or a play name). Personnel, Formation, and Gain make it better.</span>
              <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
            </label>
          ) : (
            <>
              <div className="text-sm font-semibold mb-2">{rows.length} plays found. Map the columns:</div>
              <div className="grid gap-2 sm:grid-cols-2">
                {FIELDS.map((f) => (
                  <label key={f.key} className="text-xs text-dim">
                    {f.label}
                    <select value={map[f.key] ?? ""} onChange={(e) => setMap({ ...map, [f.key]: e.target.value || null })} className="mt-1 w-full rounded-md border border-line bg-white px-2 py-1.5 text-sm">
                      <option value="">— not in file —</option>
                      {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </label>
                ))}
              </div>
              {preview && ready && (
                <div className="mt-4 rounded-lg border border-line bg-slate-50 px-4 py-3 text-sm">
                  <div className="font-semibold mb-1">Preview</div>
                  <div className="text-dim">
                    {preview.runRate}% run · {preview.firstDownRun != null ? `${preview.firstDownRun}% run on 1st down · ` : ""}
                    {preview.personnelUsage?.length ? `${preview.personnelUsage.length} personnel groupings · ` : ""}
                    {preview.formations?.length ?? 0} formations · {preview.concepts?.length ?? 0} concepts
                    {preview.signatureConcept ? ` · top: ${preview.signatureConcept} (${preview.signatureRate}%)` : ""}
                  </div>
                </div>
              )}
            </>
          )}
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-line px-5 py-3">
          <button onClick={onClose} className="rounded-lg border border-line px-4 py-2 text-sm font-semibold text-dim hover:text-ink">Cancel</button>
          <button
            disabled={!preview || !ready}
            onClick={() => { if (preview) { onApply(preview); onClose(); } }}
            className="inline-flex items-center gap-2 rounded-lg bg-grass px-4 py-2 text-sm font-bold text-white hover:bg-grass-deep disabled:opacity-50"
          >
            <Check size={15} /> Apply to opponent
          </button>
        </div>
      </div>
    </div>
  );
}
