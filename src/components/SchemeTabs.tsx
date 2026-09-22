import Link from "next/link";

export default function SchemeTabs({ active = 'overview' }: { active?: 'overview' | 'library' | 'analysis' | 'art' }) {
  const tabs = [
    { href: '/scheme', label: 'Overview', key: 'overview' },
    { href: '/scheme/concepts?view=full-calls', label: 'Scheme Library', key: 'library' },
    { href: '/analysis', label: 'Defense Analysis', key: 'analysis' },
    { href: '/scheme/playbook', label: 'Play Art', key: 'art' },
  ];
  return <nav aria-label="My Scheme tabs" className="mb-5 flex flex-wrap gap-1 rounded-xl border border-line bg-card p-1">
    {tabs.map(item => <Link key={item.key} href={item.href} aria-current={active === item.key ? 'page' : undefined} className={`rounded-lg px-3 py-2 text-sm font-semibold ${active === item.key ? 'bg-grass text-white' : 'text-dim hover:text-ink'}`}>{item.label}</Link>)}
  </nav>;
}
