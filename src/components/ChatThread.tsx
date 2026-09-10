"use client";

// The one thread, rendered the same way in the desktop drawer and on the phone
// route. Context strip on top so the coach can see who we're talking about
// without scrolling, quick chips when the thread is empty, speech-to-text on
// the input, and every reply can carry links so it stays useful on a phone.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Send, Mic, Trash2 } from "lucide-react";
import { useHydrated } from "@/lib/store";
import { useChat, startDictation, QUICK_CHIPS } from "@/lib/useChat";

export default function ChatThread({
  page,
  onNavigate,
  className = "",
}: {
  page: string;
  onNavigate?: () => void;
  className?: string;
}) {
  const hydrated = useHydrated();
  const { thread, busy, contextLine, engineLine, send, clear } = useChat(page);
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [thread.length, busy]);

  const submit = async (value?: string) => {
    const v = (value ?? text).trim();
    if (!v || busy) return;
    setText("");
    await send(v, page);
  };

  const mic = () => {
    if (listening) return;
    const h = startDictation(
      (t) => setText((prev) => (prev ? `${prev} ${t}` : t)),
      () => setListening(false),
    );
    if (!h) {
      setNote("Voice input isn't available in this browser — type it instead.");
      return;
    }
    setNote(null);
    setListening(true);
  };

  return (
    <div className={`flex flex-col min-h-0 ${className}`}>
      {/* Context strip — what CounterScheme already knows (Q2). */}
      <div className="shrink-0 border-b border-line bg-pitch px-4 py-2 text-[12px] text-dim">
        {hydrated ? contextLine : "…"}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        {hydrated && thread.length === 0 && (
          <div className="rounded-xl border border-line bg-white p-4">
            <div className="text-sm font-bold">One conversation, all week.</div>
            <p className="mt-1 text-sm text-dim leading-relaxed">
              I already know your defense, your roster and this week&apos;s opponent. Teach me a rule, ask about
              them, ask why a plan item is the answer, or ask what we&apos;re repping.
            </p>
          </div>
        )}

        {hydrated &&
          thread.map((m) => (
            <div key={m.id} className={m.role === "coach" ? "flex justify-end" : "flex gap-2.5"}>
              {m.role === "counterscheme" && (
                <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-navy text-white text-[10px] font-extrabold">
                  CS
                </span>
              )}
              <div className={m.role === "coach" ? "max-w-[85%]" : "max-w-[92%] min-w-0"}>
                <div
                  className={`rounded-xl px-3.5 py-2.5 text-[14px] leading-relaxed whitespace-pre-wrap break-words ${
                    m.role === "coach" ? "bg-grass text-white" : "border border-line bg-white text-ink"
                  }`}
                >
                  {m.text}
                </div>
                {m.actions && m.actions.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {m.actions.map((a) => (
                      <Link
                        key={`${a.label}-${a.href}`}
                        href={a.href}
                        onClick={onNavigate}
                        className="rounded-lg border border-line bg-white px-2.5 py-1 text-[12px] font-semibold text-grass hover:border-grass"
                      >
                        {a.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

        {busy && (
          <div className="flex gap-2.5">
            <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-navy text-white text-[10px] font-extrabold">
              CS
            </span>
            <div className="rounded-xl border border-line bg-white px-3.5 py-2.5 text-[14px] text-dim">Thinking…</div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="shrink-0 border-t border-line bg-white px-3 pt-2.5 pb-3">
        <div className="mb-2 flex flex-wrap gap-1.5">
          {QUICK_CHIPS.map((c) => (
            <button
              key={c}
              onClick={() => (c === "Teach a rule" ? (setText("Against 12 personnel we check to "), inputRef.current?.focus()) : submit(c))}
              className="rounded-full border border-line bg-pitch px-3 py-1 text-[12px] font-semibold text-dim hover:border-grass hover:text-grass"
            >
              {c}
            </button>
          ))}
          {hydrated && thread.length > 0 && (
            <button
              onClick={clear}
              className="ml-auto inline-flex items-center gap-1 rounded-full px-2 py-1 text-[12px] text-dim hover:text-red-500"
            >
              <Trash2 size={12} /> Clear
            </button>
          )}
        </div>
        <div className="flex items-end gap-2 rounded-xl border border-line bg-white p-2">
          <textarea
            ref={inputRef}
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void submit();
              }
            }}
            placeholder="Ask about them, or teach me a rule…"
            className="flex-1 min-w-0 resize-none bg-transparent px-1.5 py-1.5 text-[15px] leading-snug placeholder:text-dim/60 focus:outline-none"
          />
          <button
            onClick={mic}
            aria-label="Dictate"
            className={`grid size-9 shrink-0 place-items-center rounded-lg border transition ${
              listening ? "border-red-400 bg-red-50 text-red-500" : "border-line text-dim hover:text-ink"
            }`}
          >
            <Mic size={16} />
          </button>
          <button
            onClick={() => void submit()}
            disabled={!text.trim() || busy}
            aria-label="Send"
            className="grid size-9 shrink-0 place-items-center rounded-lg bg-grass text-white hover:bg-grass-deep disabled:opacity-50"
          >
            <Send size={16} />
          </button>
        </div>
        {note && <p className="mt-1.5 text-[11px] text-red-500">{note}</p>}
        <p className="mt-1.5 text-[11px] text-dim">{engineLine}</p>
      </div>
    </div>
  );
}
