import Link from 'next/link';
const tools={
 scheme:[['Scheme Library','/scheme/concepts?view=full-calls','Build and reference complete defenses and saved components.'],['Defense Analysis','/analysis','Review supported concerns in your saved defense.'],['Play Art','/scheme/playbook','Draw and edit football diagrams.']],
 matchup:[['Scouting Report','/scouting','Study formations, concepts and scouting evidence.'],['Personnel','/scouting?view=personnel','Review their personnel and key players.'],['Situational Tendencies','/scouting?view=situations','Study down, distance and field-position tendencies.']],
 gameplan:[['Call Sheet','/callsheet','Take approved calls to game day.'],['Practice Script','/practice','Prepare practice looks and scripts.'],['Self Scout','/scheme/self-scout','Review your own defensive tendencies.']],
};
export default function SectionTools({section,opponentId}:{section:keyof typeof tools;opponentId?:string}){
 return <section aria-label="Section tools" className="no-print mb-5 grid gap-3 sm:grid-cols-3">{tools[section].map(([label,path,description])=>{
  const href=opponentId&&path!=='/scheme/self-scout'?`${path}${path.includes('?')?'&':'?'}id=${encodeURIComponent(opponentId)}`:path;
  return <Link key={path} href={href} className="rounded-xl border border-line bg-card p-4 hover:border-grass focus-visible:outline-2 focus-visible:outline-grass"><h2 className="font-bold">{label} <span className="text-grass" aria-hidden>→</span></h2><p className="mt-1 text-sm text-dim">{description}</p></Link>;
 })}</section>;
}
