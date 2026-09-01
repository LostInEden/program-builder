"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Users, Shield, Binoculars, ClipboardList, BarChart3, Search, Bell, ChevronDown } from "lucide-react";
import { useStore, useHydrated } from "@/lib/store";

const NAV = [
  { href: "/team", label: "My Team", icon: Users },
  { href: "/scheme", label: "My Scheme", icon: Shield },
  { href: "/scout", label: "Opponent Scout", icon: Binoculars },
  { href: "/gameplan", label: "Game Plans", icon: ClipboardList },
  { href: "/reports", label: "Reports", icon: BarChart3 },
];

export default function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const hydrated = useHydrated();
  const players = useStore((s) => s.players);
  const activity = useStore((s) => s.activity);
  const [q, setQ] = useState("");
  const [bellOpen, setBellOpen] = useState(false);

  const matches = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return [];
    return players
      .filter((p) => p.name.toLowerCase().includes(t) || String(p.jersey ?? "").startsWith(t))
      .slice(0, 6);
  }, [q, players]);

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-white">
      <div className="flex items-center gap-6 px-5 h-[60px]">
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <span className="grid size-9 place-items-center rounded-xl bg-navy text-white font-extrabold text-sm">
            CS
          </span>
          <span className="display text-xl font-extrabold tracking-tight text-navy">CounterScheme</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1 h-full">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={`relative flex items-center gap-2 px-4 h-[60px] text-[15px] font-semibold transition-colors ${
                  active ? "text-grass" : "text-dim hover:text-ink"
                }`}
              >
                <Icon size={17} strokeWidth={2.1} />
                {label}
                {active && <span className="absolute inset-x-3 bottom-0 h-[3px] rounded-t bg-grass" />}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <div className="relative hidden lg:block">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-dim" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onBlur={() => setTimeout(() => setQ(""), 200)}
              placeholder="Search players, teams,..."
              className="w-60 rounded-lg border border-line bg-pitch pl-9 pr-3 py-2 text-sm placeholder:text-dim/70 focus:outline-none focus:border-grass"
            />
            {hydrated && matches.length > 0 && (
              <div className="absolute top-full mt-1 w-full rounded-xl border border-line bg-white shadow-lg overflow-hidden">
                {matches.map((p) => (
                  <button
                    key={p.id}
                    onMouseDown={() => {
                      setQ("");
                      router.push(`/team/player?id=${p.id}`);
                    }}
                    className="block w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
                  >
                    <span className="text-dim tabular-nums mr-2">#{p.jersey ?? "—"}</span>
                    <span className="font-semibold">{p.name}</span>
                    <span className="text-dim ml-2 text-xs">{p.positions.join("/")}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => setBellOpen((o) => !o)}
              className="grid size-9 place-items-center rounded-full text-dim hover:text-ink hover:bg-slate-100"
              aria-label="Recent updates"
            >
              <Bell size={18} />
              {hydrated && activity.length > 0 && (
                <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-grass" />
              )}
            </button>
            {bellOpen && (
              <div className="absolute right-0 top-full mt-1 w-72 rounded-xl border border-line bg-white shadow-lg overflow-hidden">
                <div className="display uppercase text-[10px] font-bold tracking-[0.15em] text-dim px-4 py-2.5 border-b border-line">
                  Recent updates
                </div>
                {hydrated && activity.length === 0 && (
                  <div className="px-4 py-4 text-sm text-dim">No updates yet.</div>
                )}
                {hydrated &&
                  activity.slice(0, 8).map((a) => (
                    <div key={a.id} className="px-4 py-2.5 border-b border-line/60 last:border-0">
                      <div className="text-sm font-semibold">{a.text}</div>
                      {a.sub && <div className="text-xs text-dim">{a.sub}</div>}
                    </div>
                  ))}
              </div>
            )}
          </div>

          <button className="flex items-center gap-2 rounded-full border border-line pl-1.5 pr-3 py-1.5 hover:border-dim">
            <span className="grid size-7 place-items-center rounded-full bg-navy text-white text-[11px] font-bold">
              CL
            </span>
            <span className="text-sm font-semibold hidden sm:block">Coach Linville</span>
            <ChevronDown size={14} className="text-dim" />
          </button>
        </div>
      </div>
    </header>
  );
}
