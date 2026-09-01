"use client";

// Opponent Scout became Opponent Matchup — keep the old URL working.
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ScoutRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/matchup");
  }, [router]);
  return <div className="px-8 py-10 text-dim">Redirecting to Opponent Matchup…</div>;
}
