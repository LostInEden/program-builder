"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import {
  Home, LayoutGrid, ListOrdered, User, Ambulance, Star, ShieldCheck, Settings,
  BookOpen, Layers, SpellCheck, CalendarDays, Dumbbell, Binoculars, ClipboardList,
} from "lucide-react";

type Item = { href: string; label: string; icon: React.ComponentType<{ size?: number; strokeWidth?: number }> };
type Section = { title: string | null; items: Item[] };

const TEAM: Section[] = [
  { title: null, items: [{ href: "/team", label: "Overview", icon: Home }] },
  {
    title: "Team",
    items: [
      { href: "/team?view=depth", label: "Depth Chart", icon: LayoutGrid },
      { href: "/team?view=roster", label: "Roster", icon: ListOrdered },
      { href: "/team?view=profiles", label: "Player Profiles", icon: User },
      { href: "/team?view=injuries", label: "Injuries", icon: Ambulance },
      { href: "/team?view=watchlist", label: "Watch List", icon: Star },
    ],
  },
  { title: "Analysis", items: [{ href: "/analysis", label: "Defensive Analysis", icon: ShieldCheck }] },
  { title: "Account", items: [{ href: "/settings", label: "Settings", icon: Settings }] },
];

const SCHEME: Section[] = [
  { title: null, items: [{ href: "/scheme", label: "Overview", icon: Home }] },
  {
    title: "Scheme",
    items: [
      { href: "/scheme/playbook", label: "Playbook", icon: BookOpen },
      { href: "/scheme/coverages", label: "Coverage Library", icon: Layers },
      { href: "/scheme/terminology", label: "Terminology", icon: SpellCheck },
    ],
  },
  { title: "Analysis", items: [{ href: "/analysis", label: "Defensive Analysis", icon: ShieldCheck }] },
  { title: "Account", items: [{ href: "/settings", label: "Settings", icon: Settings }] },
];

const SCOUT: Section[] = [
  { title: null, items: [{ href: "/scout", label: "Opponent Scout", icon: Binoculars }] },
  {
    title: "Plan",
    items: [
      { href: "/gameplan", label: "Game Plans", icon: ClipboardList },
      { href: "/team?view=schedule", label: "Season Schedule", icon: CalendarDays },
    ],
  },
  { title: "Analysis", items: [{ href: "/analysis", label: "Defensive Analysis", icon: ShieldCheck }] },
  { title: "Account", items: [{ href: "/settings", label: "Settings", icon: Settings }] },
];

const GENERAL: Section[] = [
  { title: null, items: [{ href: "/", label: "Home", icon: Home }] },
  {
    title: "Program",
    items: [
      { href: "/calendar", label: "Calendar", icon: CalendarDays },
      { href: "/practice", label: "Practice", icon: Dumbbell },
    ],
  },
  { title: "Analysis", items: [{ href: "/analysis", label: "Defensive Analysis", icon: ShieldCheck }] },
  { title: "Account", items: [{ href: "/settings", label: "Settings", icon: Settings }] },
];

function sectionsFor(pathname: string): Section[] {
  if (pathname.startsWith("/team")) return TEAM;
  if (pathname.startsWith("/scheme") || pathname.startsWith("/analysis")) return SCHEME;
  if (pathname.startsWith("/scout") || pathname.startsWith("/gameplan")) return SCOUT;
  return GENERAL;
}

function SideNavInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Full-screen surfaces run without the rail.
  if (pathname.startsWith("/scheme/playbook")) return null;

  const view = searchParams.get("view");
  const current = view ? `${pathname}?view=${view}` : pathname;
  const sections = sectionsFor(pathname);

  return (
    <aside className="w-56 shrink-0 border-r border-line bg-white hidden lg:flex flex-col sticky top-[61px] h-[calc(100vh-61px)]">
      <nav className="flex flex-col px-3 pt-4 gap-0.5 overflow-y-auto">
        {sections.map((sec, si) => (
          <div key={si} className="mb-2">
            {sec.title && (
              <div className="display uppercase text-[10px] font-bold tracking-[0.15em] text-dim/80 px-3 pt-3 pb-1.5">
                {sec.title}
              </div>
            )}
            {sec.items.map(({ href, label, icon: Icon }) => {
              const active = current === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-[14px] font-medium transition-colors ${
                    active ? "bg-grass/10 text-grass" : "text-dim hover:text-ink hover:bg-slate-50"
                  }`}
                >
                  <Icon size={17} strokeWidth={2} />
                  {label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="mt-auto border-t border-line px-4 py-4 flex items-center gap-3">
        <span className="grid size-9 place-items-center rounded-full bg-navy text-white text-[11px] font-bold">
          DH
        </span>
        <div className="leading-tight">
          <div className="text-sm font-semibold text-ink">Demo High School</div>
          <div className="text-xs text-dim">Varsity Defense · 2026</div>
        </div>
      </div>
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
