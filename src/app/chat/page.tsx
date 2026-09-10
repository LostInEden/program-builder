"use client";

// The phone screen (Q4, Q21). Same thread as the drawer — full height, thumb
// reachable, and nothing on it that a coach wouldn't want to read one-handed.

import ChatThread from "@/components/ChatThread";

export default function ChatPage() {
  return (
    <div className="flex flex-col h-[calc(100vh-61px-4rem)] lg:h-[calc(100vh-61px)] mx-auto w-full max-w-3xl lg:border-x border-line bg-pitch">
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
