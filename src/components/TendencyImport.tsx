"use client";

// Tendency-report upload: the opponent's play-by-play CSV (tagged) → one
// stored Play per snap. The coach maps the columns once; CounterScheme does all
// of the math from the snaps afterwards, so no tendency here is hand-typed.

import {readScoutWorkbook,sheetFromRows,type ScoutSheet} from "@/lib/scoutSheet";
import { useMemo, useState } from "react";
import Papa from "papaparse";
import { X, Upload, Check } from "lucide-react";
import { appendScoutImport } from "@/lib/livingScout";
import { useStore } from "@/lib/store";
import type { Opponent } from "@/lib/store";
import { PLAY_FIELDS, guessMapping, rowsToPlays, headlineFromPlays, computeTells, type PlayField, type PlayMapping } from "@/lib/tendencies";

export default function TendencyImport({ opponent, onApply, onClose }: { opponent: Opponent; onApply: (patch: Partial<Opponent>) => void; onClose: () => void }) {
  const [sheets,setSheets]=useState<ScoutSheet[]>([]);
  const [sheetIndex,setSheetIndex]=useState(0);
  const [loading,setLoading]=useState(false);
  const [fileName,setFileName]=useState("");
  const [game,setGame]=useState("");
  const [gameDate,setGameDate]=useState("");
  const [saving,setSaving]=useState(false);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [map, setMap] = useState<PlayMapping>({});
  const [error, setError] = useState<string | null>(null);

  const selectSheet=(sheet:ScoutSheet,index:number)=>{setSheetIndex(index);setHeaders(sheet.headers);setRows(sheet.rows);setMap(guessMapping(sheet.headers));setError(null);};
  const onFile = async (f: File | undefined) => {
    if (!f) return;
    setLoading(true);setError(null);setRows([]);setSheets([]);
    try {
      if(f.size>10*1024*1024)throw new Error('Use a spreadsheet under 10 MB.');
      let parsed:ScoutSheet[];
      if(/\.xlsx$/i.test(f.name))parsed=await readScoutWorkbook(await f.arrayBuffer());
      else if(/\.(csv|tsv)$/i.test(f.name)){
        const result=Papa.parse<string[]>(await f.text(),{skipEmptyLines:'greedy'});
        if(result.errors.length)throw new Error(`Could not read this sheet: ${result.errors[0].message}`);
        parsed=[sheetFromRows(f.name,result.data)];
      }else throw new Error('Choose an Excel (.xlsx), CSV or TSV sheet. For older .xls files, save as .xlsx first.');
      setFileName(f.name);setSheets(parsed);selectSheet(parsed[0],0);
    }catch(e){setError(e instanceof Error?e.message:'Could not read the sheet.');}finally{setLoading(false);}
  };

  const plays = useMemo(() => (rows.length ? rowsToPlays(rows, map) : []), [rows, map]);
  const patch = useMemo(() => (plays.length ? headlineFromPlays(plays) : null), [plays]);
  const tells = useMemo(() => (plays.length ? computeTells(plays) : null), [plays]);
  const ready = rows.length > 0 && !loading;
  const unmapped = headers.filter((h) => !Object.values(map).includes(h));
  const skipped = rows.length - plays.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 p-4" onClick={onClose}>
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-line bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 flex items-center gap-3 border-b border-line bg-white px-5 py-4">
          <Upload size={18} className="text-grass" />
          <div>
            <div className="font-extrabold">Upload Tagged Spreadsheet</div>
            <div className="text-xs text-dim">Excel (.xlsx), CSV or TSV — every tag is preserved, including custom columns. One row per snap.</div>
          </div>
          <button onClick={onClose} className="ml-auto text-dim hover:text-ink" aria-label="Close"><X size={18} /></button>
        </div>
        <div className="p-5">
          {rows.length === 0 ? (
            <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line px-6 py-10 text-center cursor-pointer hover:border-grass">
              <Upload size={22} className="text-dim" />
              <span className="text-sm font-semibold">{loading?'Reading sheet…':'Choose spreadsheet'}</span>
              <span className="text-xs text-dim">Upload your complete tagged play-by-play spreadsheet. Play Type, Down, Distance, Formation and Play carry the most weight — anything else you tag makes the report sharper.</span>
              <input type="file" disabled={loading} accept=".xlsx,.csv,.tsv" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
            </label>
          ) : (
            <>
              {sheets.length>1&&<label className="block text-sm mb-3">Worksheet<select aria-label="Worksheet" className="ml-2 rounded border border-line bg-panel p-2" value={sheetIndex} onChange={e=>selectSheet(sheets[Number(e.target.value)],Number(e.target.value))}>{sheets.map((sheet,i)=><option key={i} value={i}>{sheet.name} ({sheet.rows.length} rows)</option>)}</select></label>}
              <p className="text-xs text-dim mb-2">{fileName} · {headers.length} columns · all {rows.length} source rows retained. Import each worksheet separately.</p>
              <div className="flex gap-2 mb-3"><input aria-label="Game label" placeholder="Game / playlist (optional)" value={game} onChange={e=>setGame(e.target.value)} className="rounded border border-line bg-panel p-2"/><input aria-label="Game date" type="date" value={gameDate} onChange={e=>setGameDate(e.target.value)} className="rounded border border-line bg-panel p-2"/></div>
              <div className="text-sm font-semibold mb-2">
                {plays.length} offensive snaps from {rows.length} rows{skipped > 0 ? ` (${skipped} excluded from offensive tendencies; retained in source sheet)` : ""}. Check the columns:
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
              <details className="mt-3"><summary className="text-sm font-semibold cursor-pointer">Preview all tags ({headers.length} columns)</summary><div className="overflow-auto max-h-64 mt-2"><table className="text-xs whitespace-nowrap"><thead><tr>{headers.map(h=><th key={h} className="text-left border border-line p-2">{h}</th>)}</tr></thead><tbody>{rows.slice(0,5).map((row,i)=><tr key={i}>{headers.map(h=><td key={h} className="border border-line p-2">{row[h]||'—'}</td>)}</tr>)}</tbody></table></div><p className="text-xs text-dim">First five rows shown. Original values and custom tags are stored even when they are not mapped to a tendency field.</p></details>
              {patch && ready && (
                <div className="mt-4 rounded-lg border border-line bg-slate-50 px-4 py-3 text-sm">
                  <div className="font-semibold mb-1">Preview</div>
                  <div className="text-dim">
                    {patch.runRate==null?"Run/pass not tagged":`${patch.runRate}% run`} · {patch.firstDownRun != null ? `${patch.firstDownRun}% run on 1st down · ` : ""}
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
          {rows.length > 0 && <span className="mr-auto text-xs text-dim">Adds snaps to the cumulative scout. Previous games and coach edits are preserved.</span>}
          <button onClick={onClose} className="rounded-lg border border-line px-4 py-2 text-sm font-semibold text-dim hover:text-ink">Cancel</button>
          <button
            disabled={!ready || saving}
            onClick={async () => {
              if(!ready||saving)return;setSaving(true);setError(null);
              try {
                const bytes=new TextEncoder().encode(JSON.stringify(rows));
                const fingerprint=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(b=>b.toString(16).padStart(2,'0')).join('');
                const current=useStore.getState().opponents.find(o=>o.id===opponent.id);
                if(!current)throw new Error('Opponent no longer available.');
                onApply(appendScoutImport(current,plays,{id:crypto.randomUUID(),name:fileName,game:game.trim()||undefined,gameDate:gameDate||undefined,fingerprint,createdAt:Date.now(),sheet:{name:sheets[sheetIndex].name,headers,rows},mapping:map}));onClose();
              }catch(e){setError(e instanceof Error?e.message:'Could not import report.');}finally{setSaving(false);}
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-grass px-4 py-2 text-sm font-bold text-white hover:bg-grass-deep disabled:opacity-50"
          >
            <Check size={15} /> Import tagged sheet
          </button>
        </div>
      </div>
    </div>
  );
}
