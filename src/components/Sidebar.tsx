"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Calendar,
  Dumbbell,
  BarChart3,
  Settings,
  Shield,
} from "lucide-react";

const nav = [
  { href: "/", label: "Home", icon: Home },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/practice", label: "Practice", icon: Dumbbell },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 shrink-0 border-r border-line bg-black/40 backdrop-blur flex flex-col sticky top-0 h-screen">
      <Link href="/" className="flex items-center gap-2.5 px-5 py-6">
        <span className="display text-3xl font-bold leading-none">
          <span className="text-grass">P</span>
          <span className="text-ink">B</span>
        </span>
        <span className="display text-[13px] font-semibold leading-tight text-ink">
          Program
          <br />
          Builder <span className="text-grass">AI</span>
        </span>
      </Link>

      <nav className="flex flex-col gap-1 px-3 mt-2">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] transition-colors ${
                active
                  ? "bg-grass/10 text-grass border border-grass/30"
                  : "text-dim hover:text-ink hover:bg-white/5 border border-transparent"
              }`}
            >
              <Icon size={18} strokeWidth={2} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-line px-5 py-4 flex items-center gap-3">
        <span className="grid size-9 place-items-center rounded-full bg-grass/15 border border-grass/30 text-grass">
          <Shield size={16} />
        </span>
        <div className="leading-tight">
          <div className="text-sm font-semibold text-ink">Wildcats Football</div>
          <div className="text-xs text-dim">Coach Carver</div>
        </div>
      </div>
    </aside>
  );
}
