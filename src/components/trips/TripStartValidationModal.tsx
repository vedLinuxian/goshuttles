"use client";

import { useState, useEffect } from "react";
import { startTrip, adminOverrideStartTrip, checkTripStartValidationAction } from "@/app/actions/trip-actions";
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Play,
  ShieldAlert,
  Loader2,
  Users,
  Car,
  UserCheck,
  Clock,
  IndianRupee,
  Lock,
} from "lucide-react";
import { Button, Badge, Alert, AlertDescription } from "@/components/ui";

type ValidationData = {
  canStart: boolean;
  errors: string[];
  warnings: string[];
  bookedSeats: number;
  totalSeats: number;
  lockedSeats: number;
  emptySeats: number;
  hasDriver: boolean;
  driverName: string | null;
  driverPhone: string | null;
  driverKyc: string;
  adminOverrideStart: boolean;
  overrideReason: string | null;
  collectedPayments: number;
  pendingPayments: number;
};

type Props = {
  tripId: string;
  isOpen: boolean;
  isAdmin: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export function TripStartValidationModal({
  tripId,
  isOpen,
  isAdmin,
  onClose,
  onSuccess,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [valData, setValData] = useState<ValidationData | null>(null);
  const [overrideReason, setOverrideReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    checkTripStartValidationAction(tripId).then((res) => {
      if (cancelled) return;
      if (res.success && res.data) {
        setValData(res.data as ValidationData);
        setActionError(null);
      } else {
        setValData(null);
        setActionError(res.error ?? "Failed to run trip validation checks.");
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen, tripId]);

  if (!isOpen) return null;

  const handleNormalStart = async () => {
    setSubmitting(true);
    setActionError(null);
    const res = await startTrip(tripId);
    if (res.success) {
      onSuccess();
      onClose();
    } else {
      setActionError(res.error ?? "Failed to start trip.");
    }
    setSubmitting(false);
  };

  const handleAdminOverrideStart = async () => {
    if (!overrideReason.trim()) {
      setActionError("Please provide a reason for the Admin Override departure.");
      return;
    }
    setSubmitting(true);
    setActionError(null);
    const res = await adminOverrideStartTrip(tripId, overrideReason);
    if (res.success) {
      onSuccess();
      onClose();
    } else {
      setActionError(res.error ?? "Failed to override and start trip.");
    }
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-lg bg-[var(--card)] border border-[var(--border)] rounded-3xl shadow-2xl overflow-hidden space-y-0">
        {/* Header */}
        <div className="p-5 bg-[var(--card)]/95 border-b border-[var(--border)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold">
              <Play className="h-5 w-5 fill-amber-400" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-[var(--foreground)]">Pre-Departure Trip Validation</h3>
              <p className="text-[11px] text-[var(--muted-foreground)]">Verifying domain invariants &amp; passenger manifest</p>
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

        {/* Content Body */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {loading ? (
            <div className="py-12 text-center space-y-2">
              <Loader2 className="h-8 w-8 animate-spin text-amber-400 mx-auto" />
              <p className="text-xs font-semibold text-[var(--muted-foreground)]">Auditing trip manifest rules &amp; driver profile...</p>
            </div>
          ) : actionError && !valData ? (
            <Alert variant="destructive">
              <AlertDescription>{actionError}</AlertDescription>
            </Alert>
          ) : valData ? (
            <div className="space-y-4">
              {/* Readiness Status Header */}
              <div className="flex items-center justify-between p-3.5 bg-[var(--background)] rounded-2xl border border-[var(--border)]">
                <span className="text-xs font-extrabold text-[var(--foreground)]">Departure Readiness:</span>
                {valData.canStart ? (
                  <Badge variant="success" className="gap-1 font-extrabold text-xs">
                    <CheckCircle2 className="h-3.5 w-3.5" /> READY FOR DEPARTURE
                  </Badge>
                ) : (
                  <Badge variant="warning" className="gap-1 font-extrabold text-xs">
                    <AlertTriangle className="h-3.5 w-3.5" /> GATED / OVERRIDE NEEDED
                  </Badge>
                )}
              </div>

              {/* Invariant Diagnostic Checklist */}
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-3 bg-[var(--muted)] rounded-xl border border-[var(--border)]">
                  <span className="flex items-center gap-2 font-bold text-[var(--foreground)]">
                    <UserCheck className="h-4 w-4 text-amber-400" /> Driver Assigned &amp; Active
                  </span>
                  {valData.hasDriver ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" /> {valData.driverName || "Assigned"}
                    </span>
                  ) : (
                    <span className="text-rose-400 font-bold flex items-center gap-1">
                      <XCircle className="h-3.5 w-3.5" /> Unassigned
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between p-3 bg-[var(--muted)] rounded-xl border border-[var(--border)]">
                  <span className="flex items-center gap-2 font-bold text-[var(--foreground)]">
                    <Users className="h-4 w-4 text-amber-400" /> Seat Occupancy (100% Gate)
                  </span>
                  <span className={`font-bold flex items-center gap-1 ${valData.bookedSeats === valData.totalSeats ? "text-emerald-400" : "text-amber-400"}`}>
                    {valData.bookedSeats}/{valData.totalSeats} seats booked ({valData.emptySeats} empty)
                  </span>
                </div>

                {valData.lockedSeats > 0 && (
                  <div className="flex items-center justify-between p-3 bg-amber-950/30 border border-amber-500/30 rounded-xl text-amber-300">
                    <span className="flex items-center gap-2 font-bold">
                      <Lock className="h-4 w-4 text-amber-400" /> Active Checkout Locks
                    </span>
                    <span className="font-bold">{valData.lockedSeats} seat(s) locked</span>
                  </div>
                )}

                <div className="flex items-center justify-between p-3 bg-[var(--muted)] rounded-xl border border-[var(--border)]">
                  <span className="flex items-center gap-2 font-bold text-[var(--foreground)]">
                    <IndianRupee className="h-4 w-4 text-amber-400" /> Boarding Cash Payments
                  </span>
                  <span className="text-[var(--foreground)] font-semibold">
                    {valData.collectedPayments} collected · {valData.pendingPayments} pending
                  </span>
                </div>
              </div>

              {/* Errors Box */}
              {valData.errors.length > 0 && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl space-y-1 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-rose-400 uppercase tracking-wider">
                    <XCircle className="h-4 w-4" /> Departure Blocking Invariants ({valData.errors.length})
                  </div>
                  <ul className="list-disc list-inside text-rose-300 space-y-1 pl-1 pt-1">
                    {valData.errors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Warnings Box */}
              {valData.warnings.length > 0 && (
                <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-1 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-amber-400 uppercase tracking-wider">
                    <AlertTriangle className="h-4 w-4 text-amber-400" /> Departure Advisory Warnings
                  </div>
                  <ul className="list-disc list-inside text-amber-300 space-y-1 pl-1">
                    {valData.warnings.map((warn, idx) => (
                      <li key={idx}>{warn}</li>
                    ))}
                  </ul>
                </div>
              )}

              {actionError && (
                <Alert variant="destructive">
                  <AlertDescription>{actionError}</AlertDescription>
                </Alert>
              )}

              {/* Admin Override Action Section */}
              {isAdmin && !valData.canStart && valData.emptySeats > 0 && (
                <div className="p-4 bg-amber-950/30 border border-amber-500/40 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2 text-xs font-extrabold text-amber-400">
                    <ShieldAlert className="h-4 w-4" />
                    Admin Override Start Request
                  </div>
                  <p className="text-[11px] text-[var(--foreground)]">
                    As an Admin, you can override the 100% occupancy requirement and dispatch the shuttle with {valData.emptySeats} empty seat(s).
                  </p>
                  <input
                    type="text"
                    placeholder="Reason for early departure override (e.g. VIP dispatch schedule)"
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-amber-500 outline-none"
                  />
                  <Button
                    onClick={handleAdminOverrideStart}
                    disabled={submitting || !overrideReason.trim()}
                    className="w-full bg-amber-500 text-slate-950 font-extrabold text-xs gap-2 shadow-md glow-amber cursor-pointer"
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldAlert className="h-4 w-4" />}
                    Authorize Admin Override &amp; Depart Shuttle
                  </Button>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-[var(--card)]/95 border-t border-[var(--border)] flex items-center justify-end gap-3">
          <Button variant="ghost" onClick={onClose} disabled={submitting} className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
            Cancel
          </Button>

          {valData?.canStart && (
            <Button
              onClick={handleNormalStart}
              disabled={submitting}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs gap-2 shadow-md glow-emerald cursor-pointer"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 fill-slate-950" />}
              Confirm &amp; Depart Trip Now
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
