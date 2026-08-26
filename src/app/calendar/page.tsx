"use client";

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { seasonStart, seasonEnd } from "@/lib/data";
import { useStore, useHydrated, type ScheduleWeek } from "@/lib/store";

type EventKind = "practice" | "film" | "meeting" | "game" | "team";
type CalEvent = { time: string; title: string; kind: EventKind };

const kindStyle: Record<EventKind, string> = {
  practice: "border-grass/50 bg-grass/10 text-grass",
  film: "border-sky/50 bg-sky/10 text-sky",
  meeting: "border-mind/50 bg-mind/10 text-mind",
  team: "border-line bg-white/5 text-dim",
  game: "border-ember/60 bg-ember/15 text-ember",
};

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const inSeason = (d: Date) => {
  const s = iso(d);
  return s >= seasonStart && s <= seasonEnd;
};

// Weekly rhythm + game schedule → events for any date. Deterministic, no stored state.
function eventsFor(d: Date, games: ScheduleWeek[]): CalEvent[] {
  const events: CalEvent[] = [];
  const game = games.find((g) => g.opponent && g.date === iso(d));
  if (game) {
    events.push({
      time: "7:00 PM",
      title: `${game.homeAway === "home" ? "vs" : "@"} ${game.opponent}${game.result ? ` · ${game.result}` : ""}`,
      kind: "game",
    });
  }
  if (!inSeason(d)) return events;

  const dow = d.getDay(); // 0 = Sunday
  const gameThisWeek = games.some((g) => {
    if (!g.opponent) return false;
    const gd = new Date(g.date + "T12:00:00");
    const diff = (gd.getTime() - d.getTime()) / 86400000;
    return diff >= 0 && diff < 7 - ((dow + 6) % 7);
  });

  switch (dow) {
    case 1: // Monday
      events.push({ time: "3:30 PM", title: "Film — opponent breakdown", kind: "film" });
      events.push({ time: "4:30 PM", title: "Practice — install day", kind: "practice" });
      break;
    case 2:
      events.push({ time: "4:30 PM", title: "Practice — pads, run fits", kind: "practice" });
      break;
    case 3:
      events.push({ time: "4:30 PM", title: "Practice — 3rd down & pressures", kind: "practice" });
      events.push({ time: "6:30 PM", title: "Coaches meeting", kind: "meeting" });
      break;
    case 4:
      events.push({ time: "4:30 PM", title: "Walkthrough + special teams", kind: "practice" });
      break;
    case 5:
      if (gameThisWeek && !game) events.push({ time: "3:00 PM", title: "Team dinner", kind: "team" });
      break;
    case 0:
      events.push({ time: "2:00 PM", title: "Film grade + self scout", kind: "film" });
      break;
  }
  return events;
}

// Monday-first month grid covering every week that touches the month.
function monthGrid(year: number, month: number): Date[][] {
  const first = new Date(year, month, 1);
  const start = new Date(first);
  start.setDate(1 - ((first.getDay() + 6) % 7));
  const weeks: Date[][] = [];
  const cur = new Date(start);
  do {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
    weeks.push(week);
  } while (cur.getMonth() === month || weeks.length < 4);
  return weeks;
}

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function CalendarPage() {
  const hydrated = useHydrated();
  const games = useStore((s) => s.seasonSchedule);
  const today = useMemo(() => new Date(), []);
  const [view, setView] = useState<"month" | "week">("month");
  const [cursor, setCursor] = useState(() => new Date());

  const weeks = useMemo(() => monthGrid(cursor.getFullYear(), cursor.getMonth()), [cursor]);
  const weekOf = useMemo(() => {
    const start = new Date(cursor);
    start.setDate(cursor.getDate() - ((cursor.getDay() + 6) % 7));
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [cursor]);

  if (!hydrated) return <div className="px-8 py-10 display text-dim">Loading…</div>;

  const nav = (dir: -1 | 1) => {
    const next = new Date(cursor);
    if (view === "month") next.setMonth(cursor.getMonth() + dir, 1);
    else next.setDate(cursor.getDate() + dir * 7);
    setCursor(next);
  };

  const label =
    view === "month"
      ? `${MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`
      : `Week of ${MONTHS[weekOf[0].getMonth()].slice(0, 3)} ${weekOf[0].getDate()}–${
          MONTHS[weekOf[6].getMonth()].slice(0, 3)} ${weekOf[6].getDate()}`;

  return (
    <div className="px-6 py-8 max-w-7xl mx-auto">
      <PageHeader
        eyebrow="Calendar"
        title="Season Calendar"
        sub="Practices, film, meetings, and game days — generated from the weekly rhythm and the season schedule."
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <button onClick={() => nav(-1)} aria-label="Previous" className="grid size-9 place-items-center rounded-lg border border-line text-dim hover:text-ink hover:border-dim">
            <ChevronLeft size={16} />
          </button>
          <button onClick={() => nav(1)} aria-label="Next" className="grid size-9 place-items-center rounded-lg border border-line text-dim hover:text-ink hover:border-dim">
            <ChevronRight size={16} />
          </button>
        </div>
        <span className="display text-2xl font-bold min-w-56">{label}</span>
        <button
          onClick={() => setCursor(new Date())}
          className="rounded-full border border-line px-3.5 py-1.5 text-xs text-dim hover:text-ink hover:border-dim"
        >
          Today
        </button>
        <div className="ml-auto flex gap-1 rounded-full border border-line bg-card p-1">
          {(["month", "week"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`display rounded-full px-4 py-1.5 text-xs font-semibold capitalize transition ${
                view === v ? "bg-grass text-pitch" : "text-dim hover:text-ink"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {view === "month" ? (
        <motion.div
          key={label}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-xl border border-line bg-card/60 overflow-hidden"
        >
          <div className="grid grid-cols-7 border-b border-line bg-black/30">
            {DOW.map((d) => (
              <div key={d} className="display px-3 py-2 text-[11px] font-semibold tracking-widest text-dim">
                {d}
              </div>
            ))}
          </div>
          {weeks.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7 border-b border-line/60 last:border-0">
              {week.map((d) => {
                const isCurMonth = d.getMonth() === cursor.getMonth();
                const isToday = iso(d) === iso(today);
                const events = eventsFor(d, games);
                const shown = events.slice(0, 3);
                return (
                  <button
                    key={iso(d)}
                    onClick={() => {
                      setCursor(new Date(d));
                      setView("week");
                    }}
                    className={`relative flex min-h-28 flex-col gap-1 border-r border-line/60 p-1.5 pb-6 text-left align-top transition last:border-r-0 hover:bg-white/4 ${
                      isCurMonth ? "" : "opacity-40"
                    } ${isToday ? "bg-grass/5" : ""}`}
                  >
                    {shown.map((e, i) => (
                      <span
                        key={i}
                        className={`block truncate rounded border-l-2 px-1.5 py-1 text-[11px] leading-tight ${kindStyle[e.kind]}`}
                        title={`${e.time} ${e.title}`}
                      >
                        {e.title}
                      </span>
                    ))}
                    {events.length > 3 && (
                      <span className="display px-1 text-[10px] font-semibold tracking-wider text-dim">
                        + {events.length - 3} more
                      </span>
                    )}
                    <span
                      className={`absolute bottom-1.5 right-2 text-xs tabular-nums ${
                        isToday
                          ? "grid size-5 place-items-center rounded-full bg-grass font-bold text-pitch"
                          : "text-dim"
                      }`}
                    >
                      {d.getDate()}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </motion.div>
      ) : (
        <motion.div
          key={label}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid gap-3 md:grid-cols-2 xl:grid-cols-7 xl:gap-2"
        >
          {weekOf.map((d) => {
            const events = eventsFor(d, games);
            const isToday = iso(d) === iso(today);
            const hasGame = events.some((e) => e.kind === "game");
            return (
              <div
                key={iso(d)}
                className={`rounded-xl border p-4 min-h-44 ${
                  hasGame ? "border-ember/50 bg-ember/5" : isToday ? "border-grass/50 bg-grass/5" : "border-line bg-card/80"
                }`}
              >
                <div className="flex items-baseline justify-between mb-3">
                  <span className="display text-lg font-bold">{DOW[(d.getDay() + 6) % 7]}</span>
                  <span className={`text-xs tabular-nums ${isToday ? "text-grass font-bold" : "text-dim"}`}>
                    {MONTHS[d.getMonth()].slice(0, 3)} {d.getDate()}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  {events.map((e, i) => (
                    <div key={i} className={`rounded-lg border px-2.5 py-2 text-xs leading-snug ${kindStyle[e.kind]}`}>
                      <div className="font-semibold tabular-nums">{e.time}</div>
                      <div className="mt-0.5">{e.title}</div>
                    </div>
                  ))}
                  {events.length === 0 && <span className="text-xs text-dim/60 italic">No events</span>}
                </div>
              </div>
            );
          })}
        </motion.div>
      )}

      <div className="mt-4 flex flex-wrap gap-4 text-xs text-dim">
        {(Object.keys(kindStyle) as EventKind[]).map((k) => (
          <span key={k} className="inline-flex items-center gap-1.5 capitalize">
            <span className={`inline-block size-2.5 rounded-sm border ${kindStyle[k]}`} /> {k}
          </span>
        ))}
      </div>
    </div>
  );
}
