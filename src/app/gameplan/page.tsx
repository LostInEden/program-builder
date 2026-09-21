"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import GuidedGamePlan from "@/components/GuidedGamePlan";
import LegacyGamePlan from "@/components/LegacyGamePlan";
function PlanRoute() {
  const search = useSearchParams();
  return search.get("view") === "legacy" ? <LegacyGamePlan /> : <GuidedGamePlan />;
}
export default function GamePlanPage() {
  return <Suspense fallback={<div className="p-8 text-dim">Loading…</div>}><PlanRoute /></Suspense>;
}
