"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CheckCircle2, Loader2, Play, XCircle } from "lucide-react";
import { cancelAdminTrip, completeAdminTrip, startAdminTrip } from "@/app/actions/admin-trip-actions";
import { Button } from "@/components/ui";

export function TripActionsPanel({ tripId, status }: { tripId: string; status: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [reason, setReason] = useState("");
  const [showCancel, setShowCancel] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function run(action: () => Promise<unknown>, message: string) {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      try {
        await action();
        setSuccess(message);
        setReason("");
        setShowCancel(false);
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "The operation could not be completed.");
      }
    });
  }

  const canStart = status === "SCHEDULED";
  const canComplete = status === "IN_PROGRESS";
  const canCancel = status === "SCHEDULED" || status === "IN_PROGRESS";

  return (
    <section aria-labelledby="trip-actions-heading" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="trip-actions-heading" className="font-bold text-slate-900 dark:text-white">Lifecycle controls</h2>
          <p className="text-xs text-slate-500">Actions are validated server-side and refresh the operational record after completion.</p>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{status.replace("_", " ")}</span>
      </div>

      {(canStart || canComplete || canCancel) && (
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          {canStart && (
            <div className="flex min-w-0 flex-1 flex-col gap-2 sm:min-w-[280px]">
              <label htmlFor="start-reason" className="text-xs font-semibold text-slate-600 dark:text-slate-300">Departure override reason</label>
              <div className="flex gap-2">
                <input id="start-reason" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Why is this trip departing now?" className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
                <Button type="button" disabled={isPending || reason.trim().length < 3} onClick={() => run(() => startAdminTrip(tripId, reason), "Trip started.")}><Play className="h-4 w-4" /> Start</Button>
              </div>
            </div>
          )}
          {canComplete && <Button type="button" disabled={isPending} onClick={() => { if (window.confirm("Complete this trip and finalize its manifest?")) run(() => completeAdminTrip(tripId), "Trip completed."); }} className="sm:self-end"><CheckCircle2 className="h-4 w-4" /> Complete trip</Button>}
          {canCancel && !showCancel && <Button type="button" variant="destructive" disabled={isPending} onClick={() => setShowCancel(true)} className="sm:self-end"><XCircle className="h-4 w-4" /> Cancel trip</Button>}
        </div>
      )}

      {showCancel && (
        <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/5 p-3">
          <label htmlFor="cancel-reason" className="text-xs font-semibold text-rose-700 dark:text-rose-300">Cancellation reason</label>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input id="cancel-reason" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Explain why this trip is being cancelled" className="min-w-0 flex-1 rounded-xl border border-rose-500/30 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-rose-500/30 dark:bg-slate-950 dark:text-slate-100" />
            <div className="flex gap-2"><Button type="button" variant="destructive" disabled={isPending || reason.trim().length < 3} onClick={() => { if (window.confirm("Cancel this trip and release its seats?")) run(() => cancelAdminTrip(tripId, reason), "Trip cancelled."); }}>Confirm cancellation</Button><Button type="button" variant="ghost" disabled={isPending} onClick={() => { setShowCancel(false); setReason(""); }}>Keep trip</Button></div>
          </div>
        </div>
      )}

      {!canStart && !canComplete && !canCancel && <p className="mt-4 text-sm text-slate-500">This trip is in a terminal state and has no available lifecycle actions.</p>}
      {isPending && <p className="mt-3 flex items-center gap-2 text-xs font-semibold text-amber-600 dark:text-amber-400" role="status"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Updating trip record…</p>}
      {success && <p className="mt-3 text-xs font-semibold text-emerald-600 dark:text-emerald-400" role="status">{success}</p>}
      {error && <p className="mt-3 text-xs font-semibold text-rose-600 dark:text-rose-400" role="alert">{error}</p>}
    </section>
  );
}
