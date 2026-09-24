"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { useHydrated, useStore } from "@/lib/store";
import { SECTIONS, inSection } from "@/components/SideNav";

function SectionTabsInner() {
  const pathname = usePathname();
  const search = useSearchParams();
  const hydrated = useHydrated();
  const lastOpponentId = useStore((s) => s.lastOpponentId);
  const opponentHref = (href: string) => {
    if (!href.startsWith("/scouting") && href !== "/matchup") return href;
    const id = (["/matchup", "/scouting"].includes(pathname) ? search.get("id") : null) || lastOpponentId;
    return id ? `${href}${href.includes("?") ? "&" : "?"}id=${encodeURIComponent(id)}` : href;
  };
  const program = useStore((s) => s.program);
  const players = useStore((s) => s.players.length);
  const pending = useStore((s) => s.concepts.filter((c) => !c.confirmed).length);
  const [open, setOpen] = useState<string | null>(null);
  const nav = useRef<HTMLElement>(null);
  const location = `${pathname}?${search.toString()}`;
  // A new route starts with its menus closed, including browser back/forward.
  const [openedAt, setOpenedAt] = useState(location);
  const visibleOpen = openedAt === location ? open : null;

  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (!nav.current?.contains(event.target as Node)) setOpen(null);
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, []);

  const current = (href: string) => {
    const [path, query] = href.split("?");
    if (path === "/scheme/concepts") return pathname === path;

    return pathname === path && (query
      ? [...new URLSearchParams(query)].every(([k, v]) => search.get(k) === v)
      : !search.has("view") && !search.has("kind"));
  };
  const tabClass = "flex items-center gap-1.5 border-b-2 border-transparent px-2 xl:px-3 h-11 text-[13px] font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-grass";

  return (
    <nav ref={nav} aria-label="Main navigation" className="hidden min-[900px]:flex items-center border-t border-line px-4 bg-slate-brand"
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(null); }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && visibleOpen) {
          nav.current?.querySelector<HTMLButtonElement>(`button[aria-expanded="true"]`)?.focus();
          setOpen(null);
        }
      }}>
      <div className="hidden xl:block w-44 shrink-0 mr-3 pr-4 border-r border-line text-sm truncate" title={hydrated ? `${program.name} · ${program.level || "Varsity"} Defense · ${new Date().getFullYear()}` : undefined}>{hydrated ? program.name : ""}</div>
      <div className="flex items-center gap-0.5">
        {SECTIONS.filter((section) => section.href !== "/analysis").map((section, index) => {
          const active = inSection(pathname, section);
          const expanded = visibleOpen === section.href;
          const badge = hydrated ? section.badge?.({ players, pending }) : null;
          const label = <><span>{section.label}</span>{badge && <span className="rounded-full bg-slate-200/70 px-1.5 text-[10px]">{badge}</span>}</>;
          return (
            <div className="relative" key={section.href}>
              {section.children ? <>
                <button type="button" aria-expanded={expanded} aria-controls={`section-menu-${index}`}
                  className={`${tabClass} ${active || expanded ? "border-b-grass text-grass" : "text-dim hover:bg-slate-50 hover:text-ink"}`}
                  onClick={() => { setOpenedAt(location); setOpen(expanded ? null : section.href); }}>
                  {label}<ChevronDown size={14} className={expanded ? "rotate-180" : ""} />
                </button>
                {expanded && <div id={`section-menu-${index}`} className="absolute left-0 top-full z-50 mt-0 w-60 rounded-b-lg border border-line bg-panel p-2 shadow-xl">
                  {[{ href: section.href, label: "Overview" }, ...section.children].map((child) => <Link
                    key={child.href} href={opponentHref(child.href)} aria-current={current(child.href) ? "page" : undefined}
                    onClick={() => setOpen(null)}
                    className={`block rounded-lg px-3 py-2.5 text-sm focus-visible:outline-2 focus-visible:outline-grass ${current(child.href) ? "bg-slate-100 text-grass font-semibold" : "text-dim hover:bg-slate-50 hover:text-ink"}`}>
                    {child.label}
                  </Link>)}
                </div>}
              </> : <Link href={section.href} aria-current={active ? "page" : undefined} onClick={() => setOpen(null)} className={`${tabClass} ${active ? "border-b-grass text-grass" : "text-dim hover:bg-slate-50 hover:text-ink"}`}>{label}</Link>}
            </div>
          );
        })}
        <Link href="/settings" aria-current={pathname === "/settings" ? "page" : undefined} onClick={() => setOpen(null)} className={`${tabClass} ${pathname === "/settings" ? "border-b-grass text-grass" : "text-dim hover:bg-slate-50 hover:text-ink"}`}>Settings</Link>
      </div>

    </nav>
  );
}

export default function SectionTabs() {
  return <Suspense fallback={null}><SectionTabsInner /></Suspense>;
}
