"use client";

// The chat button in the top bar and the right-side drawer it opens (desktop
// and iPad). On a phone the same thread has its own full screen at /chat, so
// the button sends there instead of squeezing a drawer onto a 390px screen.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare, X } from "lucide-react";
import ChatThread from "@/components/ChatThread";

export default function ChatDrawer() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        onClick={() => (window.innerWidth < 1024 ? router.push("/chat") : setOpen((o) => !o))}
        className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
          open ? "border-grass bg-grass/10 text-grass" : "border-line text-ink hover:border-dim"
        }`}
        aria-label="Ask CounterScheme"
      >
        <MessageSquare size={16} />
        <span className="hidden xl:inline">Ask CounterScheme</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-[60] bg-navy/20" onClick={() => setOpen(false)} aria-hidden />
          <aside className="fixed right-0 top-0 z-[61] flex h-screen w-full max-w-[420px] flex-col border-l border-line bg-pitch shadow-2xl">
            <div className="flex shrink-0 items-center gap-3 border-b border-line bg-white px-4 h-[60px]">
              <span className="grid size-8 place-items-center rounded-lg bg-navy text-white text-[11px] font-extrabold">CS</span>
              <div className="font-extrabold">CounterScheme</div>
              <button
                onClick={() => setOpen(false)}
                className="ml-auto grid size-8 place-items-center rounded-lg text-dim hover:bg-slate-100 hover:text-ink"
                aria-label="Close chat"
              >
                <X size={18} />
              </button>
            </div>
            <ChatThread page="drawer" className="flex-1 min-h-0" onNavigate={() => setOpen(false)} />
          </aside>
        </>
      )}
    </>
  );
}
