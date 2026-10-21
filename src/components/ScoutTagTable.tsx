'use client';
import {useState} from 'react';
import type {ScoutSheet} from '@/lib/scoutSheet';

export default function ScoutTagTable({sheet}:{sheet:ScoutSheet}) {
 const [page,setPage]=useState(0);const size=25,start=page*size;
 return <div className="mt-2"><div className="flex gap-3 items-center mb-2"><button disabled={!page} onClick={()=>setPage(p=>p-1)} className="underline disabled:opacity-40">Previous rows</button><span>{Math.min(start+1,sheet.rows.length)}–{Math.min(start+size,sheet.rows.length)} of {sheet.rows.length}</span><button disabled={start+size>=sheet.rows.length} onClick={()=>setPage(p=>p+1)} className="underline disabled:opacity-40">Next rows</button></div><div className="overflow-auto max-h-80"><table className="text-xs whitespace-nowrap"><thead><tr>{sheet.headers.map(h=><th key={h} className="border border-line text-left p-2">{h}</th>)}</tr></thead><tbody>{sheet.rows.slice(start,start+size).map((row,i)=><tr key={start+i}>{sheet.headers.map(h=><td key={h} className="border border-line p-2">{row[h]||'—'}</td>)}</tr>)}</tbody></table></div></div>;
}
