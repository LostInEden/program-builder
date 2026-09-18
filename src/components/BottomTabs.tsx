"use client";

// Phones only (Q4, Q21). Below `lg` the sidebar is hidden, so this is how a
// coach gets around from the couch: the chat first, then the plan, the
// opponent and his team. Nothing else — a phone is for quick check-ins, not
// for building a game plan.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageSquare, ClipboardList, Binoculars, Users } from "lucide-react";

const TABS = [
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/gameplan", label: "Plan", icon: ClipboardList },
  { href: "/matchup", label: "Opponent", icon: Binoculars },
  { href: "/team", label: "Team", icon: Users },
];

export default function BottomTabs() {
  const pathname = usePathname();
  if (pathname.startsWith("/scheme/playbook")) return null;
  return (
    <nav className="min-[900px]:hidden fixed bottom-0 inset-x-0 z-50 border-t border-line theme-navigation pb-[env(safe-area-inset-bottom)]">
      <div className="grid grid-cols-4">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold ${
                active ? "text-grass" : "text-dim"
              }`}
            >
              <Icon size={19} strokeWidth={2} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
