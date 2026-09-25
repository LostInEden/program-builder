"use client";

import { Check, AlertTriangle, LoaderCircle } from "lucide-react";
import { useSaveStatus } from "@/lib/saveStatus";

export default function SaveIndicator() {
  const status = useSaveStatus(s => s.status);
  const failed = status === "error";
  return <span role="status" aria-live="polite" aria-atomic="true"
    className={`flex items-center gap-1 text-[11px] font-normal ${failed ? "text-red-700" : "text-dim"}`}>
    {status === "saved" && <Check size={13} aria-hidden="true" className="text-success" />}
    {status === "saving" && <LoaderCircle size={13} aria-hidden="true" className="animate-spin" />}
    {failed && <AlertTriangle size={13} aria-hidden="true" />}
    {failed ? "Not saved — keep this tab open" : status === "saved" ? "Saved on this device" : status === "saving" ? "Saving…" : "Autosaves on this device"}
  </span>;
}
