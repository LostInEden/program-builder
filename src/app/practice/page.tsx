"use client";

// Honest placeholder. Steps 5 and 6 of Plan Status point here; the practice
// emphasis + scout card build fills this page in next.

import Link from "next/link";
import { ClipboardList, ArrowLeft } from "lucide-react";

const card = "rounded-xl border border-line bg-card shadow-sm";

export default function PracticePage() {
  return (
    <div className="px-6 py-8 max-w-3xl mx-auto">
      <Link href="/gameplan" className="inline-flex items-center gap-1.5 text-sm text-dim hover:text-ink mb-3">
        <ArrowLeft size={15} /> Game Plans
      </Link>
      <h1 className="text-3xl font-extrabold tracking-tight mb-1">Practice</h1>
      <p className="text-dim mb-5">Practice emphasis and scout cards for the week.</p>
      <div className={`${card} px-6 py-14 text-center`}>
        <ClipboardList size={34} className="mx-auto text-dim mb-3" />
        <div className="text-lg font-bold mb-1">Practice emphasis and scout cards are being built next</div>
        <p className="text-sm text-dim max-w-lg mx-auto">
          This is where the game plan turns into reps: the opponent plays worth practicing, why each one matters, and printable
          scout cards for Monday, Tuesday and Wednesday. Nothing here yet — the Practice Emphasis on your game plan is the working
          list until it lands.
        </p>
        <Link href="/gameplan" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-grass px-4 py-2 text-sm font-semibold text-white hover:bg-grass-deep">
          Back to the Game Plan
        </Link>
      </div>
    </div>
  );
}
