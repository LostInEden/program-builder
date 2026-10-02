"use client";

// The phone screen (Q4, Q21). Same thread as the drawer — full height, thumb
// reachable, and nothing on it that a coach wouldn't want to read one-handed.

import { useEffect, useRef } from "react";
import ChatThread from "@/components/ChatThread";

export default function ChatPage() {
  const workspace = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const header = document.querySelector("body > header");
    const bottom = document.querySelector("body > nav");
    const fit = () => {
      const viewport = window.visualViewport?.height ?? window.innerHeight;
      const navigation = header?.getBoundingClientRect().height ?? 0;
      const footer = bottom?.getBoundingClientRect().height ?? 0;
      if (workspace.current) workspace.current.style.height = `${Math.max(0, viewport - navigation - footer)}px`;
    };
    const observer = new ResizeObserver(fit);
    if (header) observer.observe(header);
    if (bottom) observer.observe(bottom);
    window.addEventListener("resize", fit);
    window.visualViewport?.addEventListener("resize", fit);
    fit();
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", fit);
      window.visualViewport?.removeEventListener("resize", fit);
    };
  }, []);
  return (
    <div ref={workspace} className="flex flex-col h-[calc(100dvh-160px)] mx-auto w-full max-w-3xl lg:border-x border-line bg-pitch">
      <div className="shrink-0 flex items-center gap-3 border-b border-line bg-white px-4 py-3">
        <span className="grid size-9 place-items-center rounded-xl bg-navy text-white text-xs font-extrabold">CS</span>
        <div className="min-w-0">
          <div className="font-extrabold leading-tight">CounterScheme</div>
          <p className="text-xs text-dim leading-tight">Your team, your scheme, this week&apos;s opponent — already loaded.</p>
        </div>
      </div>
      <ChatThread page="/chat" className="flex-1 min-h-0" />
    </div>
  );
}
