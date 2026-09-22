"use client";

import { useState } from "react";
import TalkTypeInput from "@/components/TalkTypeInput";

/** Review the coach's own words; never present these notes as AI-extracted facts. */
export default function CoachObservation({ action, context, onSave }: { action: string; context: string; onSave: (note: string) => boolean }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [review, setReview] = useState(false);
  const [status, setStatus] = useState("");
  return <div className="my-3">
    <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="rounded-lg border border-line px-3 py-2 text-sm font-semibold text-gold">{open ? 'Close' : action}</button>
    {status && <p role="status" className="mt-2 text-sm text-dim">{status}</p>}
    {open && <div className="mt-3 max-w-2xl rounded-xl border border-line bg-card p-4">
      <p className="mb-3 text-sm font-bold">{context}</p>
      {review ? <><h3 className="font-semibold">Review your coaching note</h3><p className="my-3 whitespace-pre-wrap text-sm">{text}</p><p className="mb-3 text-xs text-dim">Saved as your observation, not an AI interpretation or a measured tendency.</p>
        <div className="flex gap-2"><button type="button" onClick={() => { if (onSave(text.trim())) { setText(''); setReview(false); setOpen(false); setStatus('Coaching note saved.'); } else setStatus('This item is no longer available. Nothing was saved.'); }} className="rounded-lg bg-grass px-3 py-2 text-sm font-bold text-white">Save Note</button><button type="button" onClick={() => setReview(false)} className="px-3 text-sm text-gold">Correct Something</button></div>
      </> : <><TalkTypeInput value={text} onChange={setText} label="What did you notice?" /><button type="button" disabled={!text.trim()} onClick={() => { setReview(true); setStatus(''); }} className="mt-3 rounded-lg bg-grass px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Review Note</button></>}
      <button type="button" onClick={() => { setText(''); setReview(false); setOpen(false); setStatus(''); }} className="mt-3 text-xs text-dim">Discard draft</button>
    </div>}
  </div>;
}
