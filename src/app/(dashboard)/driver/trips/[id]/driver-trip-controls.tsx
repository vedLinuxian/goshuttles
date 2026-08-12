"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Play, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui";
import { TripStartValidationModal } from "@/components/trips/TripStartValidationModal";
import { TripCompleteModal } from "@/components/trips/TripCompleteModal";
import { cancelTrip } from "@/app/actions/trip-actions";

interface DriverTripControlsProps {
  tripId: string;
  status: string;
  sequence: number;
  sourceName: string;
  destName: string;
}

export function DriverTripControls({
  tripId,
  status,
  sequence,
  sourceName,
  destName,
}: DriverTripControlsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showStartModal, setShowStartModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showCancelInput, setShowCancelInput] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const canStart = status === "SCHEDULED";
  const canComplete = status === "IN_PROGRESS";
  const canCancel = status === "SCHEDULED" || status === "IN_PROGRESS";
  const isTerminal = status === "COMPLETED" || status === "CANCELLED";

  if (isTerminal) return null;

  const handleCancelSubmit = () => {
    setErrorMsg(null);
    startTransition(async () => {
      const res = await cancelTrip(tripId, cancelReason.trim() || undefined);
      if (res.success) {
        setShowCancelInput(false);
        router.refresh();
      } else {
        setErrorMsg(res.error || "Failed to cancel trip.");
      }
    });
  };

  return (
    <div className="space-y-3">
      {errorMsg && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold">
          {errorMsg}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {canStart && (
          <Button
            onClick={() => setShowStartModal(true)}
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs gap-1.5 shadow-md glow-emerald cursor-pointer"
          >
            <Play className="h-4 w-4 fill-slate-950" />
            Depart &amp; Start Trip
          </Button>
        )}

        {canComplete && (
          <Button
            onClick={() => setShowCompleteModal(true)}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs gap-1.5 shadow-md glow-amber cursor-pointer"
          >
            <CheckCircle2 className="h-4 w-4" />
            Complete Trip
          </Button>
        )}

        {canCancel && !showCancelInput && (
          <Button
            onClick={() => setShowCancelInput(true)}
            variant="destructive"
            className="text-xs gap-1.5 font-bold cursor-pointer"
          >
            <XCircle className="h-4 w-4" /> Cancel Trip
          </Button>
        )}
      </div>

      {showCancelInput && canCancel && (
        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl flex flex-col sm:flex-row items-center gap-3 mt-2">
          <input
            type="text"
            placeholder="Reason for cancellation (optional)"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 outline-none w-full"
          />
          <Button
            onClick={handleCancelSubmit}
            disabled={isPending}
            variant="destructive"
            className="text-xs font-bold w-full sm:w-auto shrink-0"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm Cancel"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setShowCancelInput(false);
              setCancelReason("");
            }}
            className="text-xs text-slate-400 hover:text-white shrink-0"
          >
            Dismiss
          </Button>
        </div>
      )}

      {showStartModal && (
        <TripStartValidationModal
          tripId={tripId}
          isOpen={showStartModal}
          isAdmin={false}
          onClose={() => setShowStartModal(false)}
          onSuccess={() => router.refresh()}
        />
      )}

      {showCompleteModal && (
        <TripCompleteModal
          tripId={tripId}
          isOpen={showCompleteModal}
          isAdmin={false}
          sourceName={sourceName}
          destName={destName}
          onClose={() => setShowCompleteModal(false)}
          onSuccess={() => router.refresh()}
        />
      )}
    </div>
  );
}
