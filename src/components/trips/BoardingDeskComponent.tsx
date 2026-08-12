"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  UserCheck,
  UserX,
  Ticket,
  Search,
  CheckCircle2,
  Clock,
  Loader2,
  QrCode,
  Users,
  AlertTriangle,
  Banknote,
} from "lucide-react";
import { Badge, Button, Input } from "@/components/ui";
import {
  confirmPassengerBoardingAction,
  verifyTicketByNumberAction,
  markPassengerNoShowAction,
} from "@/app/actions/boarding-actions";

export type BoardingManifestItem = {
  ticketId: string | null;
  ticketNumber: string | null;
  bookingId: string;
  passengerName: string;
  passengerPhone: string | null;
  seatNumber: string;
  paymentMode: string;
  paymentStatus: string;
  bookingStatus: string;
  ticketStatus: string | null; // ISSUED, USED, NO_SHOW, CANCELLED
  usedAt: string | null;
};

interface Props {
  tripId: string;
  manifest: BoardingManifestItem[];
  title?: string;
  compact?: boolean;
}

export function BoardingDeskComponent({
  tripId,
  manifest,
  title = "Boarding Control & Verification Desk",
  compact = false,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ISSUED" | "USED" | "NO_SHOW">("ALL");
  const [quickInput, setQuickInput] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Quick ticket lookup submit
  const handleQuickBoarding = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickInput.trim()) return;
    setFeedback(null);

    startTransition(async () => {
      const res = await verifyTicketByNumberAction(quickInput, tripId);
      if (!res.success) {
        setFeedback({ type: "error", text: res.error || "Pass verification failed." });
      } else {
        setFeedback({
          type: "success",
          text: `✅ Boarded! Pass #${res.ticketNumber} verified for ${res.passengerName}.`,
        });
        setQuickInput("");
        router.refresh();
      }
    });
  };

  // Single passenger boarding tap
  const handleBoardingTap = (ticketId: string | null) => {
    if (!ticketId) {
      setFeedback({ type: "error", text: "Ticket not issued yet. Please collect payment first." });
      return;
    }
    setFeedback(null);

    startTransition(async () => {
      const res = await confirmPassengerBoardingAction(ticketId);
      if (!res.success) {
        setFeedback({ type: "error", text: res.error || "Boarding failed." });
      } else {
        setFeedback({
          type: "success",
          text: `✅ Passenger ${res.passengerName || ""} successfully boarded!`,
        });
        router.refresh();
      }
    });
  };

  // Mark No-Show tap
  const handleNoShowTap = (ticketId: string | null) => {
    if (!ticketId) return;
    if (!confirm("Mark this passenger as No-Show?")) return;
    setFeedback(null);

    startTransition(async () => {
      const res = await markPassengerNoShowAction(ticketId);
      if (!res.success) {
        setFeedback({ type: "error", text: res.error || "Action failed." });
      } else {
        setFeedback({ type: "success", text: "Passenger marked as No-Show." });
        router.refresh();
      }
    });
  };

  // Filter & Search manifest
  const filteredManifest = useMemo(() => {
    return manifest.filter((item) => {
      // Status filter
      if (statusFilter === "ISSUED" && item.ticketStatus !== "ISSUED") return false;
      if (statusFilter === "USED" && item.ticketStatus !== "USED") return false;
      if (statusFilter === "NO_SHOW" && item.ticketStatus !== "NO_SHOW") return false;

      // Text search query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.passengerName.toLowerCase().includes(q) ||
        (item.passengerPhone && item.passengerPhone.includes(q)) ||
        item.seatNumber.toLowerCase().includes(q) ||
        (item.ticketNumber && item.ticketNumber.toLowerCase().includes(q))
      );
    });
  }, [manifest, statusFilter, searchQuery]);

  const totalCount = manifest.length;
  const boardedCount = manifest.filter((m) => m.ticketStatus === "USED").length;
  const pendingBoardingCount = manifest.filter((m) => m.ticketStatus === "ISSUED").length;
  const noShowCount = manifest.filter((m) => m.ticketStatus === "NO_SHOW").length;

  return (
    <div className="bg-[#0c101c]/90 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl p-5 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-base font-extrabold text-white flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-amber-500" />
            {title}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Verify digital passes and confirm passenger boarding before departure.
          </p>
        </div>

        {/* Boarding Counter KPIs */}
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-extrabold text-xs">
            ✓ {boardedCount} Boarded
          </span>
          <span className="px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 font-extrabold text-xs">
            ⏳ {pendingBoardingCount} Pending
          </span>
          {noShowCount > 0 && (
            <span className="px-3 py-1 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 font-extrabold text-xs">
              ✕ {noShowCount} No-Show
            </span>
          )}
        </div>
      </div>

      {/* Quick Lookup Input Bar */}
      <form onSubmit={handleQuickBoarding} className="flex gap-2">
        <div className="relative flex-1">
          <QrCode className="absolute left-3.5 top-3 h-4 w-4 text-amber-500" />
          <input
            value={quickInput}
            onChange={(e) => setQuickInput(e.target.value)}
            placeholder="Scan or type Pass Ref (#TKT...), Seat (e.g. F1), or Name..."
            className="w-full h-10 pl-10 pr-3 rounded-xl border border-slate-800 bg-slate-900 text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          />
        </div>
        <Button
          type="submit"
          disabled={isPending || !quickInput.trim()}
          className="h-10 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg gap-1.5 shrink-0"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <UserCheck className="h-4 w-4" /> Verify Pass
            </>
          )}
        </Button>
      </form>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-3 rounded-2xl text-xs font-bold flex items-center justify-between border ${
            feedback.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              : "bg-rose-500/10 border-rose-500/30 text-rose-400"
          }`}
        >
          <span>{feedback.text}</span>
          <button
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-white font-mono text-xs ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Roster Filter Nav + Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex gap-1.5 overflow-x-auto p-1 bg-slate-900/80 rounded-xl border border-slate-800">
          {[
            { key: "ALL", label: `All (${totalCount})` },
            { key: "ISSUED", label: `Needs Boarding (${pendingBoardingCount})` },
            { key: "USED", label: `Boarded (${boardedCount})` },
            { key: "NO_SHOW", label: `No-Show (${noShowCount})` },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setStatusFilter(tab.key as typeof statusFilter)}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all shrink-0 ${
                statusFilter === tab.key
                  ? "bg-amber-500 text-slate-950 shadow-md"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-56">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search passenger..."
            className="w-full h-8 pl-9 pr-3 rounded-lg border border-slate-800 bg-slate-900/90 text-white text-[11px] focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* Manifest List */}
      {filteredManifest.length === 0 ? (
        <div className="py-8 text-center bg-slate-900/30 rounded-2xl border border-slate-800/60">
          <Users className="h-8 w-8 text-slate-600 mx-auto" />
          <p className="text-xs font-bold text-slate-400 mt-2">No passengers match this filter</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-800/60 rounded-2xl border border-slate-800 bg-slate-950/40 overflow-hidden">
          {filteredManifest.map((item) => {
            const isBoarded = item.ticketStatus === "USED";
            const isNoShow = item.ticketStatus === "NO_SHOW";
            const isPendingCash = item.paymentStatus === "PENDING";

            return (
              <div
                key={item.bookingId}
                className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-3 transition-colors ${
                  isBoarded
                    ? "bg-emerald-500/5 hover:bg-emerald-500/10"
                    : isNoShow
                    ? "bg-rose-500/5 opacity-60"
                    : "hover:bg-slate-900/40"
                }`}
              >
                {/* Left info */}
                <div className="flex items-center gap-3">
                  <div
                    className={`w-11 h-11 rounded-2xl flex flex-col items-center justify-center font-black border text-xs shrink-0 ${
                      isBoarded
                        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                        : isNoShow
                        ? "bg-rose-500/20 text-rose-400 border-rose-500/40"
                        : "bg-amber-500/15 text-amber-400 border-amber-500/30"
                    }`}
                  >
                    <span className="text-[10px] text-slate-400 uppercase font-extrabold leading-none">Seat</span>
                    <span className="text-sm font-mono leading-none mt-0.5">{item.seatNumber}</span>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-extrabold text-sm text-white">{item.passengerName}</p>
                      {isPendingCash && (
                        <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30 flex items-center gap-1">
                          <Banknote className="h-3 w-3" /> Cash Pending
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 mt-1">
                      {item.passengerPhone && (
                        <span className="font-mono text-slate-300">{item.passengerPhone}</span>
                      )}
                      {item.ticketNumber && (
                        <span className="font-mono text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded">
                          #{item.ticketNumber}
                        </span>
                      )}
                      {item.usedAt && (
                        <span className="text-emerald-400 font-semibold">
                          Boarded {new Date(item.usedAt).toLocaleTimeString("en-IN", { timeStyle: "short" })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Actions */}
                <div className="flex items-center justify-end gap-2 shrink-0">
                  {/* Status Badge */}
                  {isBoarded && (
                    <Badge variant="success" className="px-3 py-1 text-xs font-black gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" /> BOARDED
                    </Badge>
                  )}
                  {isNoShow && (
                    <Badge variant="destructive" className="px-3 py-1 text-xs font-black">
                      NO-SHOW
                    </Badge>
                  )}

                  {/* Boarding Action Button */}
                  {!isBoarded && !isNoShow && (
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        disabled={isPending || !item.ticketId}
                        onClick={() => handleBoardingTap(item.ticketId)}
                        className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs h-9 px-3.5 rounded-xl shadow-lg gap-1.5 cursor-pointer"
                      >
                        {isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <>
                            <UserCheck className="h-3.5 w-3.5" /> Confirm Boarding
                          </>
                        )}
                      </Button>

                      {item.ticketId && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isPending}
                          onClick={() => handleNoShowTap(item.ticketId)}
                          className="border-slate-800 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 text-xs h-9 px-2.5 rounded-xl"
                          title="Mark No-Show"
                        >
                          <UserX className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
