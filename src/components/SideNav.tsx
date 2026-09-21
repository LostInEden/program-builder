"use client";

// The one navigation (Shopify-style): top-level sections down the left, and
// the section you're in opens its pages underneath it. Nothing up top.

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import {
  Home, Users, Shield, Binoculars, ClipboardList, ShieldCheck, Settings,
} from "lucide-react";
import { useStore, useHydrated, initialsOf } from "@/lib/store";

type Icon = React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
type Child = { href: string; label: string };
type Section = {
  href: string;
  label: string;
  icon: Icon;
  /** Paths (prefixes) that count as "inside" this section. */
  match: string[];
  children?: Child[];
  badge?: (s: BadgeState) => string | null;
};
type BadgeState = { pending: number; players: number };

export const SECTIONS: Section[] = [
  { href: "/", label: "Home", icon: Home, match: ["/"] },
  {
    href: "/team",
    label: "My Team",
    icon: Users,
    match: ["/team"],
    children: [
      { href: "/team?view=depth", label: "Depth Chart" },
      { href: "/team?view=roster", label: "Roster" },
      { href: "/team?view=schedule", label: "Schedule" },
    ],
  },
  {
    href: "/scheme",
    label: "My Scheme",
    icon: Shield,
    match: ["/scheme", "/analysis"],
    badge: (s) => (s.pending ? `${s.pending} to confirm` : null),
    children: [
      { href: "/scheme/concepts?kind=front", label: "Scheme Library" },
      { href: "/analysis", label: "Defensive Analysis" },
      { href: "/scheme/self-scout", label: "Self scout" },
    ],
  },
  {
    href: "/matchup",
    label: "Opponent Matchup",
    icon: Binoculars,
    match: ["/matchup", "/scout", "/scouting"],
    // Q43: the scouting report is the long half of the matchup — what they do.
    children: [
      { href: "/scouting", label: "Scouting Report" },
      { href: "/scouting?view=personnel", label: "Personnel" },
      { href: "/scouting?view=situations", label: "Situational Tendencies" },
    ],
  },
  {
    href: "/gameplan",
    label: "Game Plans",
    icon: ClipboardList,
    match: ["/gameplan", "/callsheet", "/practice"],
    // Q45: the game-day sheet is the plan you can hold in your hand. Q46: the
    // practice script is optional, so it lives under the plan, not beside it.
    children: [
      { href: "/callsheet", label: "Call Sheet" },
      { href: "/practice", label: "Practice Script" },
    ],
  },
  { href: "/analysis", label: "Defensive Analysis", icon: ShieldCheck, match: ["/analysis"] },
];

function inSection(pathname: string, sec: Section) {
  return sec.match.some((m) => (m === "/" ? pathname === "/" : pathname === m || pathname.startsWith(m + "/")));
}

function ProgramCard() {
  const hydrated = useHydrated();
  const program = useStore((s) => s.program);
  const season = new Date().getFullYear();
  return (
    <div className="border-t border-line px-4 py-3.5 flex items-center gap-3">
      <span className="grid size-9 place-items-center rounded-full bg-navy text-white text-[11px] font-bold">
        {hydrated ? initialsOf(program.name) : ""}
      </span>
      <div className="leading-tight min-w-0">
        <div className="text-sm font-semibold text-ink truncate">{hydrated ? program.name : ""}</div>
        <div className="text-xs text-dim truncate">{hydrated ? `${program.level || "Varsity"} Defense · ${season}` : ""}</div>
      </div>
    </div>
  );
}

function SideNavInner() {
  const pathname = usePathname();
  const sp = useSearchParams();
  const hydrated = useHydrated();
  const pending = useStore((s) => s.concepts.filter((c) => !c.confirmed).length);
  const players = useStore((s) => s.players.length);
  if (pathname.startsWith("/scheme/playbook") || pathname.startsWith("/chat")) return null;

  const isCurrentChild = (href: string) => {
    if (!href.includes("?")) return pathname === href;
    const [p, q] = href.split("?");
    if (pathname !== p) return false;
    return [...new URLSearchParams(q).entries()].every(([k, v]) => sp.get(k) === v);
  };
  const badges: BadgeState = { pending: hydrated ? pending : 0, players: hydrated ? players : 0 };

  return (
    <aside className="w-60 shrink-0 border-r border-line theme-navigation hidden lg:flex flex-col sticky top-[61px] h-[calc(100vh-61px)]">
      <nav className="flex-1 overflow-y-auto px-3 pt-3">
        {SECTIONS.map((sec) => {
          const active = inSection(pathname, sec);
          const onOverview = active && pathname === sec.href && (sec.children ? !sec.children.some((c) => isCurrentChild(c.href)) : true);
          const badge = sec.badge?.(badges);
          return (
            <div key={sec.href} className="mb-0.5">
              <Link
                href={sec.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-[14px] font-semibold transition-colors ${
                  active ? "bg-slate-100 text-ink" : "text-ink/80 hover:bg-slate-50 hover:text-ink"
                }`}
              >
                <sec.icon size={17} strokeWidth={2} className={active ? "text-grass" : "text-dim"} />
                <span className="flex-1">{sec.label}</span>
                {badge && (
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${
                    sec.href === "/scheme" ? "bg-ember/10 text-ember" : "bg-slate-200/70 text-dim"
                  }`}>{badge}</span>
                )}
              </Link>
              {active && sec.children && (
                <div className="mt-0.5 mb-1.5 flex flex-col">
                  <Link
                    href={sec.href}
                    className={`ml-5 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors ${
                      onOverview ? "bg-grass/10 text-grass" : "text-dim hover:text-ink hover:bg-slate-50"
                    }`}
                  >
                    Overview
                  </Link>
                  {sec.children.map((c) => {
                    const cur = isCurrentChild(c.href);
                    return (
                      <Link
                        key={c.href}
                        href={c.href}
                        className={`ml-5 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors ${
                          cur ? "bg-grass/10 text-grass" : "text-dim hover:text-ink hover:bg-slate-50"
                        }`}
                      >
                        {c.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="px-3 pb-2">
        <Link
          href="/settings"
          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-[14px] font-semibold transition-colors ${
            pathname.startsWith("/settings") ? "bg-slate-100 text-ink" : "text-ink/80 hover:bg-slate-50"
          }`}
        >
          <Settings size={17} strokeWidth={2} className={pathname.startsWith("/settings") ? "text-grass" : "text-dim"} />
          Settings
        </Link>
      </div>
      <ProgramCard />
    </aside>
  );
}

export default function SideNav() {
  return (
    <Suspense fallback={null}>
      <SideNavInner />
    </Suspense>
  );
}
