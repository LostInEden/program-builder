import type { Opponent } from "@/lib/store";
import { computeTells, headlineFromPlays, playRows, tellSentence, keyPlayerUsage } from "@/lib/tendencies";

export function opponentOverview(o: Opponent) {
    const plays = o.plays ?? [];
    const counted = plays.length ? headlineFromPlays(plays) : null;
    const ranked = <T,>(rows: T[], value: (row: T) => number | null | undefined) =>
      rows.filter(row => value(row) != null && value(row)! > 0).sort((a, b) => (value(b) ?? -1) - (value(a) ?? -1));
    const personnel = ranked((counted?.personnelUsage ?? o.personnelUsage).filter(p => p.group.trim()), p => p.pct)[0];
    const formation = ranked((counted?.formations ?? o.formations).filter(f => f.name.trim()), f => f.snapsPct)[0];
    const concepts = plays.length
      ? playRows(plays).map(c => ({ ...c, freq: c.n, notes: `${c.n} tagged snaps` }))
      : o.concepts.filter(c => c.name.trim());
    const topConcept = (type: string) => ranked(concepts.filter(c => c.type === type), c => c.freq)[0];
    const run = topConcept("Run"), pass = topConcept("Pass");
    const players = o.keyPlayers.filter(p => p.name.trim() || p.jersey?.trim());
    const priorities: { title: string; detail: string; evidence: string; section: string; playIds?: string[] }[] = [];
    if (plays.length) {
      for (const tell of computeTells(plays).actionable.slice(0, 3)) priorities.push({
        title: `${tell.outcome} — ${tell.condition}`, detail: `${Math.round(tell.rate * 100)}% · ${tell.hits} of ${tell.n} tagged snaps`,
        evidence: tellSentence(tell), section: "tells", playIds: tell.playIds,
      });
    }
    for (const concept of [run, pass]) if (concept && !priorities.some(p => p.title.startsWith(`${concept.name} —`))) priorities.push({
      title: concept.name, detail: `${concept.type} concept${concept.freq != null ? ` · ${concept.freq} recorded snaps` : ""}`,
      evidence: concept.notes || "From the opponent’s saved scouting concepts.", section: "plays", playIds: plays.filter(p => p.play.trim().toLowerCase() === concept.name.toLowerCase()).map(p => p.id),
    });
    if (players[0]) priorities.push({ title: `${players[0].jersey ? `#${players[0].jersey} ` : ""}${players[0].name}`,
      detail: `${players[0].pos || "Player"} · Coach-identified key player`, evidence: players[0].notes || "Listed among the opponent’s key players.", section: "players" });
    if (priorities.length < 3 && formation) priorities.push({ title: formation.name, detail: `Top formation${formation.snapsPct != null ? ` · ${formation.snapsPct}% of snaps` : ""}`, evidence: formation.notes || "From the opponent’s formation breakdown.", section: "formations" });
    return { firstDownRun: counted ? counted.firstDownRun : o.firstDownRun, downDistance: counted?.downDistance ?? o.downDistance, personnel, formation, run, pass, players, priorities: priorities.slice(0, 5), runRate: counted ? counted.runRate : o.runRate, usage: keyPlayerUsage(plays).slice(0, 3) };
}
