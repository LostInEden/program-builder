"use client";

import { useEffect, useId, useRef, useState } from "react";
import { startDictation, type SpeechHandle } from "@/lib/useChat";

export default function TalkTypeInput({ value, onChange, label, disabled = false }: { value: string; onChange: (value: string) => void; label: string; disabled?: boolean }) {
  const id = useId();
  const input = useRef<HTMLTextAreaElement>(null);
  const speech = useRef<SpeechHandle | null>(null);
  const current = useRef(value);
  const accepting = useRef(false);
  const [listening, setListening] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => { current.current = value; }, [value]);
  const stop = () => { accepting.current = false; speech.current?.stop(); speech.current = null; setListening(false); };
  useEffect(() => () => { accepting.current = false; speech.current?.stop(); }, []);
  useEffect(() => { if (disabled) { accepting.current = false; speech.current?.stop(); speech.current = null; } }, [disabled]);
  const talk = () => {
    if (listening) { stop(); return; }
    setMessage(""); accepting.current = true;
    try {
      const handle = startDictation(text => {
        if (!accepting.current) return;
        const next = [current.current, text].filter(Boolean).join(" ");
        current.current = next; onChange(next);
      }, () => { accepting.current = false; speech.current = null; setListening(false); setMessage("Voice capture ended. Review your text, or use Type if no words appeared."); });
      speech.current = handle;
      if (handle) setListening(true);
      else { accepting.current = false; setMessage("Voice input is unavailable in this browser. You can type below."); }
    } catch { accepting.current = false; setListening(false); setMessage("Could not start voice input. Check microphone access or type below."); }
  };
  return <div className="space-y-2">
    <div className="flex gap-2">
      <button type="button" disabled={disabled} onClick={talk} aria-pressed={listening && !disabled} className="rounded-lg border border-line px-3 py-1.5 text-sm font-semibold text-gold disabled:opacity-50">{listening && !disabled ? 'Stop Talking' : 'Talk'}</button>
      <button type="button" disabled={disabled} onClick={() => { stop(); input.current?.focus(); }} className="rounded-lg border border-line px-3 py-1.5 text-sm font-semibold text-gold disabled:opacity-50">Type</button>
    </div>
    <label htmlFor={id} className="block text-sm font-semibold">{label}</label>
    <textarea ref={input} id={id} rows={3} value={value} disabled={disabled} onChange={e => { current.current = e.target.value; onChange(e.target.value); }} className="w-full rounded-lg border border-line bg-panel p-3 text-sm" />
    <p role="status" className="text-xs text-dim">{listening && !disabled ? 'Listening… Speech fills this draft; nothing is sent automatically.' : message || 'Talk or type, then review your words before continuing.'}</p>
  </div>;
}
