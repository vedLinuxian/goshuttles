"use client";

import { useRouter } from "next/navigation";
import { useState, useCallback } from "react";
import { CalendarDays } from "lucide-react";
import { Button, Input } from "@/components/ui";

interface Props {
  defaultFrom: string;
  defaultTo: string;
}

export function DateRangeSelector({ defaultFrom, defaultTo }: Props) {
  const router = useRouter();
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);

  const apply = useCallback(() => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    router.push(`/admin/analytics?${params.toString()}`);
  }, [from, to, router]);

  const presets = [
    { label: "This Month", from: defaultFrom, to: defaultTo },
    { label: "Last 7 Days", from: daysAgo(7), to: today() },
    { label: "Last 30 Days", from: daysAgo(30), to: today() },
    { label: "Last 90 Days", from: daysAgo(90), to: today() },
  ];

  function applyPreset(presetFrom: string, presetTo: string) {
    setFrom(presetFrom);
    setTo(presetTo);
    const params = new URLSearchParams();
    params.set("from", presetFrom);
    params.set("to", presetTo);
    router.push(`/admin/analytics?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <CalendarDays className="h-5 w-5 text-amber-400" />
      <div className="flex items-center gap-2">
        <Input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="w-36 h-9 text-xs"
        />
        <span className="text-slate-400 text-xs">→</span>
        <Input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="w-36 h-9 text-xs"
        />
        <Button
          onClick={apply}
          size="sm"
          className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs h-9 px-3.5 shadow-md glow-amber cursor-pointer"
        >
          Apply
        </Button>
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        {presets.map((p) => (
          <button
            key={p.label}
            onClick={() => applyPreset(p.from, p.to)}
            className="px-3 py-1.5 text-xs font-bold text-slate-300 bg-slate-900 border border-slate-800 hover:border-amber-500/40 hover:text-amber-400 rounded-xl transition-all cursor-pointer"
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}
