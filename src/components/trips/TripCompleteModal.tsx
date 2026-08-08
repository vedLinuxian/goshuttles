"use client";

import { useState } from "react";
import { completeTrip } from "@/app/actions/trip-actions";
import { completeAdminTrip } from "@/app/actions/admin-trip-actions";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  IndianRupee,
  AlertTriangle,
  Ticket,
} from "lucide-react";
import { Button, Alert, AlertDescription } from "@/components/ui";

type Props = {
  tripId: string;
  isOpen: boolean;
  isAdmin: boolean;
  sourceName?: string;
  destName?: string;
  onClose: () => void;
  onSuccess: () => void;
};

export function TripCompleteModal({
  tripId,
  isOpen,
  isAdmin,
  sourceName,
  destName,
  onClose,
  onSuccess,
}: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleComplete = async () => {
    setSubmitting(true);
    setError(null);
    try {
      if (isAdmin) {
        await completeAdminTrip(tripId);
      } else {
        const res = await completeTrip(tripId);
        if (!res.success) {
          throw new Error(res.error ?? "Failed to complete trip.");
        }
      }
      onSuccess();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to complete trip.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md bg-[var(--card)] border border-[var(--border)] rounded-3xl shadow-2xl overflow-hidden space-y-0">
        {/* Header */}
        <div className="p-5 bg-[var(--card)]/95 border-b border-[var(--border)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-[var(--foreground)]">Complete Shuttle Trip</h3>
              <p className="text-[11px] text-[var(--muted-foreground)]">Finalize manifest &amp; driver wallet settlement</p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={submitting}
            className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] p-1 rounded-xl hover:bg-[var(--muted)] transition-colors"
          >
            <XCircle className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 text-xs">
          <p className="text-[var(--foreground)] font-medium leading-relaxed">
            Completing this trip for <span className="font-extrabold text-amber-400">{sourceName || "Source"} → {destName || "Destination"}</span> will perform the following actions:
          </p>

          <div className="space-y-2 font-semibold">
            <div className="p-3 bg-[var(--muted)] rounded-xl border border-[var(--border)] flex items-center gap-2 text-[var(--foreground)]">
              <Ticket className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>All confirmed passenger tickets will be marked as <strong className="text-emerald-400">USED</strong>.</span>
            </div>

            <div className="p-3 bg-[var(--muted)] rounded-xl border border-[var(--border)] flex items-center gap-2 text-[var(--foreground)]">
              <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
              <span>Any unpaid pending bookings will be marked <strong className="text-amber-400">NO-SHOW</strong> and seats released.</span>
            </div>

            <div className="p-3 bg-[var(--muted)] rounded-xl border border-[var(--border)] flex items-center gap-2 text-[var(--foreground)]">
              <IndianRupee className="h-4 w-4 text-amber-400 shrink-0" />
              <span>Driver cash collection &amp; platform commission will be settled to driver wallet.</span>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[var(--card)]/95 border-t border-[var(--border)] flex items-center justify-end gap-3">
          <Button variant="ghost" onClick={onClose} disabled={submitting} className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
            Cancel
          </Button>

          <Button
            onClick={handleComplete}
            disabled={submitting}
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs gap-2 shadow-md glow-emerald cursor-pointer"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Confirm Trip Completion
          </Button>
        </div>
      </div>
    </div>
  );
}
