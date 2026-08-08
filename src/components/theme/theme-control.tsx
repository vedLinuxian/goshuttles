"use client";

import { Activity } from "lucide-react";

export function ThemeControl() {
  return (
    <div className="inline-flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-400">
      <Activity className="h-3.5 w-3.5 animate-pulse text-emerald-400" />
      <span className="hidden sm:inline">LIVE TELEMETRY</span>
    </div>
  );
}
