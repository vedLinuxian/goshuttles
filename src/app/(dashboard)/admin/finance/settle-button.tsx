"use client";

import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { settleAction } from "./actions";
import { useState } from "react";

interface Props {
  settlementId: string;
  status: string;
  currentPage: number;
  currentStatus?: string;
}

export function SettleButton({ settlementId, status, currentPage, currentStatus }: Props) {
  const router = useRouter();
  const [settling, setSettling] = useState(false);

  if (status !== "PENDING") return null;

  async function handleSettle() {
    if (settling) return;
    setSettling(true);
    try {
      await settleAction(settlementId);
    } catch {
      // silently fail, revalidation handles UI
    }
    setSettling(false);
    // Refresh the page
    const params = new URLSearchParams();
    if (currentPage > 1) params.set("page", String(currentPage));
    if (currentStatus) params.set("status", currentStatus);
    router.push(`/admin/finance?${params.toString()}`);
    router.refresh();
  }

  return (
    <button
      onClick={handleSettle}
      disabled={settling}
      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-slate-950 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
    >
      <CheckCircle2 className="h-3.5 w-3.5" />
      {settling ? "..." : "Settle"}
    </button>
  );
}
