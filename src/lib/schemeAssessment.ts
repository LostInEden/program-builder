import type { Concept, Player } from './store';
import type { Finding } from './analyze';

type Starter = { label: string; unit: 'DL' | 'LB' | 'DB'; player: Player };
type Profile = { match: RegExp; strength: string; weakness: string; improve: string };
const profiles: Profile[] = [
  { match: /\b(tite|mint)\b/i, strength: 'Interior alignment can close B-gap entry points and make inside runs work laterally when the nose and ends control their assignments.', weakness: 'Wide runs and quick perimeter throws can stress the edges. Condensed interior spacing does not establish who owns force or the quarterback.', improve: 'Identify force, cutback and quarterback responsibility. Rep outside zone and read plays with the coverage support included.' },
  { match: /\b(bear|46)\b/i, strength: 'Covering the center and guards can obstruct interior combination blocks and give the offense immediate interior problems.', weakness: 'Spread formations can pull support away from the box; perimeter space and isolated coverage matchups still need answers.', improve: 'Write the spread and motion check, then walk through perimeter runs with the actual secondary support.' },
  { match: /\b(okie|eagle|over|under)\b/i, strength: 'A declared front can coordinate first-level gap control with linebacker fits. An Over/Under shift can change where the offense faces a down lineman; an odd front can keep both edges involved in the run fit. Confirm which techniques your named front actually uses.', weakness: 'Zone combinations can displace an interior defender; pullers can create an extra gap; split flow can test the backside edge. Motion can move the strength away from the called front. The name alone does not establish who handles those changes.', improve: 'Document each gap, force, spill/box and cutback player. Walk the front against a tight end, an extra gap and a change of strength.' },
  { match: /cover\s*0\b/i, strength: 'Man assignments can free additional rushers when all eligible receivers and the quarterback are accounted for.', weakness: 'No deep safety help increases the cost of a lost matchup. Picks, motion and quarterback escapes can create explosive plays.', improve: 'Declare motion and bunch rules, leverage and rush-lane responsibility; verify each isolated matchup before using the call.' },
  { match: /cover\s*1\b|\brobber\b|\bman\b/i, strength: 'Man distribution can contest routes while a declared help player supports a chosen area.', weakness: 'Crossers and bunch releases stress communication. Help cannot protect every isolated receiver at once.', improve: 'Specify where help is available, how defenders handle rubs and who owns a scrambling quarterback.' },
  { match: /cover\s*3\b/i, strength: 'Three-deep structure can protect deep zones while the underneath defenders distribute shorter threats. Match rules can address vertical releases when explicitly coached.', weakness: 'Seams and flood combinations can stretch the distribution. Trips and motion need clear handoffs; match rules do not remove one-on-one demands.', improve: 'Rep four verticals, flood and trips. Name the seam carrier, flat player and post help after each release.' },
  { match: /quarters|cover\s*4\b/i, strength: 'Split-field reads can connect safety support to receiver releases and provide flexible answers on each side.', weakness: 'Play-action, conflicting run/pass keys and trips can stress safety decisions and backside coverage.', improve: 'Specify safety run/pass keys and the trips check. Test who carries each vertical without abandoning the assigned run fit.' },
  { match: /tampa|cover\s*2\b|\bcloud\b/i, strength: 'A two-high call can divide deep support and define underneath leverage when its distribution is clearly assigned.', weakness: 'Sideline windows and the middle seam can stress the space between defenders. Tampa-style middle running adds a specific demand on the underneath defender.', improve: 'Name the seam runner and sideline leverage, then rep seam and high-low combinations with run action.' },
];

export function assessScheme(concepts: Concept[], starters: Starter[]): Finding[] {
  return concepts.filter(c => c.confirmed && c.status !== 'backPocket').map(c => {
    const profile = c.kind === 'front' ? profiles.slice(0, 3).find(p => p.match.test(c.name)) : c.kind === 'coverage' ? profiles.slice(3).find(p => p.match.test(c.name)) : undefined;
    const roles = c.responsibilities.filter(r => r.role?.trim() && r.job?.trim());
    const demands: [Starter['unit'], string, string][] = c.kind === 'front'
      ? [['DL', 'blockDestruction', 'block destruction'], ['DL', 'runFit', 'gap control'], ['LB', 'runFit', 'run fits']]
      : c.kind === 'coverage'
        ? [['DB', 'coverage', 'coverage'], ['DB', 'leverage', 'leverage / eyes'], ['LB', 'coverage', 'underneath coverage']]
        : c.kind === 'pressure'
          ? [['DL', 'passRush', 'pass rush'], ['LB', 'runFit', 'replacement fits'], ['DB', 'coverage', 'coverage behind pressure']]
          : [['LB', 'iq', 'recognition'], ['DB', 'iq', 'communication / recognition']];
    const evidence: string[] = [];
    const weak: string[] = [];
    let rated = 0, expected = 0;
    for (const [unit, key, skill] of demands) {
      const people = starters.filter(s => s.unit === unit);
      if (!people.length) evidence.push(`${unit}: no assigned starter available to assess ${skill}.`);
      for (const s of people) {
        expected++;
        const value = s.player.skills?.[key];
        if (typeof value !== 'number' || !Number.isFinite(value) || value < 1 || value > 5) {
          evidence.push(`${s.label} · ${s.player.name}: ${skill} not rated.`); continue;
        }
        rated++;
        const note = `${s.label} · ${s.player.name}: ${skill} ${value}/5`;
        evidence.push(`${note} — ${value <= 2 ? 'development need for this demand' : value >= 4 ? 'a supporting strength' : 'functional rating; verify against the matchup'}.`);
        if (value <= 2) weak.push(note);
      }
    }
    const strength = profile?.strength ?? (c.kind === 'pressure'
      ? 'Coordinating rush origin and coverage can challenge protection while keeping defined answers behind the rush.'
      : c.kind === 'adjustment' ? 'A clear trigger, action and result can keep the defense coordinated when the offensive picture changes.'
      : 'Explicit role assignments let the staff check how this call distributes run and pass responsibilities.');
    const weakness = profile?.weakness ?? (c.kind === 'pressure'
      ? 'Vacated rush gaps, hot throws and screens can attack the spaces a pressure leaves. A pressure name does not identify the replacement defender.'
      : c.kind === 'adjustment' ? 'Late or conflicting communication can leave two players making different checks. A trigger without an action is not an executable answer.'
      : 'This custom call has no recognized family profile. Its specific strengths and vulnerabilities require review of the saved rules and film.');
    return {
      id: `scheme-${c.id}`, check: `${c.name} — scheme & personnel`,
      status: weak.length ? 'Potential Conflict' : 'Needs Review',
      detail: weak.length ? `${weak.length} rated demands need attention. Review the matchup and supporting help.` : `${roles.length} role assignments saved; ${rated}/${expected} player-skill checks rated. Soundness still needs assignment and film review.`,
      affected: [c.name, c.kind],
      why: roles.length ? 'Saved rules provide evidence to review, but their presence does not prove every gap, receiver and adjustment is covered. Confirm the complete distribution against formations and motion.' : 'No complete role-and-job assignments are saved. The system cannot verify gap ownership or coverage distribution from a call name or diagram alone.',
      strengths: [strength], weaknesses: [weakness, ...weak.map(w => `${w}: could limit execution if this player is asked to perform that job without help.`)],
      personnel: evidence,
      improvements: [profile?.improve ?? 'Write the assignment for every affected defender, identify the space left behind, and rep the offensive answer to this call.', ...(roles.length ? ['Review the saved assignments together for duplicate jobs and unassigned threats.'] : ['Add per-position responsibilities in Scheme Library.']), ...(rated < expected ? ['Grade the missing starter skills before deciding whether this call fits the personnel.'] : []), ...(weak.length ? ['Prioritize the named skill deficits in practice and evaluate help or a reduced assignment against the opponent.'] : [])],
      breakdown: roles.map(r => `${r.role}: ${r.job}`),
      basis: `General coaching considerations${profile ? ' inferred from the call name' : ''}, saved responsibilities and current depth-chart ratings. These are demands to validate, not a simulated play result. Ratings use the coach’s 1–5 scale.`,
    };
  });
}
