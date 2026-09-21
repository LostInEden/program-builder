import type { GamePlan, MeetingAnswer, MeetingDecision, StaffMeeting } from "@/lib/store";

export const PLAN_CATEGORIES = ["Personnel", "Formations / Checks", "Run Plan", "Pass Plan", "Pressure Plan", "Situational", "Key Players", "Coaching Points"];
export const emptyMeeting = (): StaffMeeting => ({ decisions: [], conversations: {}, drafts: {} });
export const decisionText = (d: MeetingAnswer) => [d.call && `Call: ${d.call}`, d.check && `Check: ${d.check}`, d.fit && `Fit: ${d.fit}`, d.point && `Coaching point: ${d.point}`].filter(Boolean).join(" · ");
export const approveDecision = (meeting: StaffMeeting, decision: MeetingDecision): StaffMeeting => {
  const drafts = { ...meeting.drafts };
  delete drafts[decision.id];
  return { ...meeting, drafts, decisions: [...meeting.decisions.filter(d => d.id !== decision.id), decision] };
};
export const decisionGroups = (decisions: MeetingDecision[]) => PLAN_CATEGORIES.map(category => ({ category, decisions: decisions.filter(d => d.category === category) })).filter(g => g.decisions.length);
export function approvedPlan(plan?: GamePlan): GamePlan | undefined {
  if (!plan?.meeting) return plan;
  const items = plan.meeting.decisions.map(d => ({ id: d.id, text: d.title, sub: decisionText(d), source: "coach" as const }));
  return { ...plan, priorities: items, threats: [], concerns: [], adjustments: [], emphasis: [] };
}
