"use client";

import { useRef, useState } from "react";
import Papa from "papaparse";
import { X, Upload } from "lucide-react";
import { useStore, type Player } from "@/lib/store";

type Field = keyof Pick<
  Player,
  "jersey" | "name" | "cls" | "heightIn" | "weightLb" | "squat" | "bench" | "clean" | "vertical" | "broad" | "forty" | "flying10" | "shuttle"
> | "positions" | "skip";

const FIELD_OPTIONS: { value: Field; label: string }[] = [
  { value: "skip", label: "— skip —" },
  { value: "jersey", label: "Jersey #" },
  { value: "name", label: "Name" },
  { value: "cls", label: "Class" },
  { value: "positions", label: "Position(s)" },
  { value: "heightIn", label: "Height (in)" },
  { value: "weightLb", label: "Weight (lb)" },
  { value: "squat", label: "Squat" },
  { value: "bench", label: "Bench" },
  { value: "clean", label: "Power clean" },
  { value: "vertical", label: "Vertical" },
  { value: "broad", label: "Broad jump" },
  { value: "forty", label: "40-yd" },
  { value: "flying10", label: "Flying 10" },
  { value: "shuttle", label: "5-10-5" },
];

const aliases: [RegExp, Field][] = [
  [/^(#|no|num|jersey)/i, "jersey"],
  [/name/i, "name"],
  [/(class|year|grad)/i, "cls"],
  [/pos/i, "positions"],
  [/height|ht/i, "heightIn"],
  [/weight|wt/i, "weightLb"],
  [/squat/i, "squat"],
  [/bench/i, "bench"],
  [/clean/i, "clean"],
  [/vert/i, "vertical"],
  [/broad/i, "broad"],
  [/40|forty/i, "forty"],
  [/fly/i, "flying10"],
  [/shuttle|5-?10-?5|agil/i, "shuttle"],
];

function guessField(header: string): Field {
  for (const [re, f] of aliases) if (re.test(header)) return f;
  return "skip";
}

const num = (v: string) => {
  const n = parseFloat(String(v).replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : null;
};

export default function RosterImport({ onClose }: { onClose: () => void }) {
  const importPlayers = useStore((s) => s.importPlayers);
  const fileRef = useRef<HTMLInputElement>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Field[]>([]);
  const [done, setDone] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [source, setSource] = useState<"csv" | "pdf">("csv");

  const load = (hdrs: string[], data: string[][]) => {
    setHeaders(hdrs);
    setRows(data);
    setMapping(hdrs.map(guessField));
  };

  const onFile = async (file: File) => {
    setProblem(null);
    if (/\.pdf$/i.test(file.name) || file.type === "application/pdf") {
      setSource("pdf");
      setBusy(true);
      try {
        const { readPdfRoster } = await import("@/lib/pdfRoster");
        const { headers: hdrs, rows: parsed } = await readPdfRoster(file);
        if (!parsed.length) {
          setProblem(
            "Nothing that looks like a roster came out of that PDF — it may be a scan (a picture of a page) rather than text. Save the roster as a CSV and upload that instead.",
          );
        } else {
          load(hdrs, parsed);
        }
      } catch {
        setProblem("That PDF couldn't be read. Save the roster as a CSV and upload that instead.");
      } finally {
        setBusy(false);
      }
      return;
    }
    setSource("csv");
    Papa.parse<string[]>(file, {
      skipEmptyLines: true,
      complete: (res) => {
        const data = res.data as string[][];
        if (!data.length) {
          setProblem("That file came back empty.");
          return;
        }
        load(data[0], data.slice(1));
      },
    });
  };

  const doImport = () => {
    const parsed = rows.map((r) => {
      const p: Partial<Player> = {};
      mapping.forEach((field, i) => {
        const v = (r[i] ?? "").trim();
        if (field === "skip" || !v) return;
        if (field === "name" || field === "cls") p[field] = v;
        else if (field === "positions") p.positions = v.split(/[\/,;]/).map((x) => x.trim().toUpperCase()).filter(Boolean);
        else if (field === "jersey") p.jersey = num(v);
        else p[field] = num(v);
      });
      return p;
    });
    setDone(importPlayers(parsed));
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-6" onClick={onClose}>
      <div
        className="w-full max-w-2xl rounded-2xl border border-line bg-card p-6 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="display text-2xl font-bold">Import Roster</h2>
          <button onClick={onClose} className="text-dim hover:text-ink" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {done !== null ? (
          <div className="text-center py-10">
            <div className="display text-4xl font-bold text-grass mb-2">{done}</div>
            <p className="text-dim mb-6">players imported. Blanks were left blank — nothing is required.</p>
            <button
              onClick={onClose}
              className="display rounded-full bg-grass px-6 py-2.5 text-sm font-bold text-white"
            >
              Done
            </button>
          </div>
        ) : headers.length === 0 ? (
          <>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              className="grid w-full place-items-center gap-3 rounded-xl border-2 border-dashed border-line py-14 text-dim transition hover:border-grass/50 hover:text-ink disabled:opacity-60"
            >
              <Upload size={28} className="text-grass" />
              <span>{busy ? "Reading the PDF…" : "Choose a CSV, spreadsheet export, or PDF roster"}</span>
              <span className="text-xs">Hudl, MaxPreps, or your own sheet — you&apos;ll map the columns next</span>
            </button>
            {problem && (
              <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {problem}
              </p>
            )}
          </>
        ) : (
          <>
            <p className="mb-4 text-sm text-dim">
              {source === "pdf"
                ? `Read ${rows.length} player rows out of the PDF. Check the matches below — anything that came out wrong can be fixed after the import.`
                : `Match each spreadsheet column to a Program Builder field. ${rows.length} rows found.`}
            </p>
            <div className="flex flex-col gap-2 mb-5">
              {headers.map((h, i) => (
                <div key={i} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-sm">
                  <span className="truncate rounded-lg border border-line bg-slate-50 px-3 py-2 font-mono text-xs">
                    {h}
                    <span className="ml-2 text-dim">{rows[0]?.[i] ? `e.g. ${rows[0][i]}` : ""}</span>
                  </span>
                  <span className="text-dim">→</span>
                  <select
                    value={mapping[i]}
                    onChange={(e) =>
                      setMapping((m) => m.map((f, j) => (j === i ? (e.target.value as Field) : f)))
                    }
                    className="rounded-lg border border-line bg-slate-50 px-3 py-2"
                  >
                    {FIELD_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            <button
              onClick={doImport}
              disabled={!mapping.includes("name")}
              className="display w-full rounded-full bg-grass px-6 py-3 text-sm font-bold text-white disabled:opacity-40"
            >
              {mapping.includes("name") ? `Import ${rows.length} players` : "Map a Name column to continue"}
            </button>
          </>
        )}

        <input
          ref={fileRef}
          type="file"
          accept=".csv,.txt,.tsv,.pdf,application/pdf"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
        />
      </div>
    </div>
  );
}
