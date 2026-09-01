"use client";

// Sound Check grew into Defensive Analysis — keep the old URL working.
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SoundCheckRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/analysis");
  }, [router]);
  return <div className="px-8 py-10 text-dim">Sound Check is now Defensive Analysis — redirecting…</div>;
}
