import Link from "next/link";
export default function PlanNavigation({ id, active }: { id: string; active: "Plan" | "Call Sheet" | "Practice Script" }) {
  return <nav aria-label="Game Plan sections" className="no-print mb-5 flex flex-wrap gap-2">{[["Plan", "/gameplan"], ["Call Sheet", "/callsheet"], ["Practice Script", "/practice"]].map(([label, path]) => <Link key={label} href={`${path}?id=${encodeURIComponent(id)}`} aria-current={active === label ? "page" : undefined} className={`rounded-lg border px-4 py-2 text-sm font-bold ${active === label ? "bg-grass border-grass text-white" : "border-line text-dim hover:text-ink"}`}>{label}</Link>)}</nav>;
}
