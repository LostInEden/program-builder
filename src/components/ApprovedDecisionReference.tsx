"use client";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { decisionText } from "@/lib/meeting";
export default function ApprovedDecisionReference({ id }: { id: string }) {
  const plan = useStore(s => s.gamePlans.find(p => p.opponentId === id));
  if (!plan?.meeting) return null;
  return <section className="rounded-xl border border-line bg-card p-4 mb-5 print-card"><h2 className="font-bold">Final Plan — Practice Focus</h2><p className="mt-1 text-xs text-dim">Rep these opponent threats with the coach’s chosen answers. Linked uploaded snaps carry these answers into the rep pool; staff-added items remain reminders to script.</p>{plan.meeting.decisions.map(d => <div key={d.id} className="border-t border-line mt-3 pt-3 text-sm"><h3 className="font-bold">{d.title}</h3><p className="mt-1">{decisionText(d)}</p>{!d.playIds.length && <p className="text-xs text-dim mt-1">No uploaded snaps linked — choose the scout look with the staff.</p>}</div>)}{!plan.meeting.decisions.length && <p className="mt-3 text-sm text-dim">No approved decisions yet.</p>}<Link className="no-print inline-block mt-3 text-sm text-gold" href={`/gameplan?id=${id}&view=final`}>Review Final Plan →</Link></section>;
}
