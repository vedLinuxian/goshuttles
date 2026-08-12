"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Ticket,
  Search,
  Filter,
  X,
  Banknote,
  CheckCircle2,
  UserCheck,
  Calendar,
  Clock,
  ArrowRight,
  Loader2,
  ExternalLink,
  ShieldCheck,
  Eye,
} from "lucide-react";
import { Badge, Button, Card, Select, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui";
import SearchBar from "@/components/ui/search-bar";
import PaginationControls from "@/components/ui/pagination";
import { confirmPassengerPaymentAction } from "@/app/(dashboard)/driver/dashboard/actions";
import { confirmPassengerBoardingAction } from "@/app/actions/boarding-actions";

export type DriverBookingItem = {
  id: string;
  guestName: string | null;
  guestPhone: string | null;
  user: { id: string; name: string | null; phone: string } | null;
  totalAmount: number;
  paymentMode: string;
  paymentStatus: string;
  status: string;
  createdAt: string;
  seat: { id: string; seatNumber: string } | null;
  trip: {
    id: string;
    sourceName: string;
    destName: string;
    startTime: string;
    status: string;
  };
  ticket: {
    id: string;
    ticketNumber: string;
    status: string;
    issuedAt: string;
    usedAt: string | null;
  } | null;
};

type Props = {
  bookings: DriverBookingItem[];
  page: number;
  pageSize: number;
  totalPages: number;
  totalCount: number;
  filters: { q: string; status: string; payment: string };
  stats: { pendingCashCount: number; totalCollectedCount: number; totalBookings: number };
};

export function DriverBookingsClient({
  bookings,
  page,
  pageSize,
  totalPages,
  totalCount,
  filters,
  stats,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [collectModal, setCollectModal] = useState<{ id: string; passengerName: string; amount: number } | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const handleCollectCashSubmit = () => {
    if (!collectModal) return;
    setFeedback(null);
    startTransition(async () => {
      try {
        await confirmPassengerPaymentAction(collectModal.id);
        setFeedback({ type: "success", message: "Cash payment confirmed! Paid invoice & boarding ticket generated." });
        setCollectModal(null);
        router.refresh();
      } catch (err) {
        setFeedback({ type: "error", message: err instanceof Error ? err.message : "Payment confirmation failed." });
      }
    });

  };

  const handleConfirmBoarding = (ticketId: string) => {
    setFeedback(null);
    startTransition(async () => {
      const res = await confirmPassengerBoardingAction(ticketId);
      if (!res.success) {
        setFeedback({ type: "error", message: res.error || "Boarding failed." });
      } else {
        setFeedback({ type: "success", message: `✅ Passenger ${res.passengerName || ""} successfully boarded!` });
        router.refresh();
      }
    });
  };

  const hasActiveFilters = Boolean(filters.q || filters.status || filters.payment);

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-black tracking-tight text-white sm:text-3xl">
            <Ticket className="h-7 w-7 text-amber-400" /> Passenger Bookings Control
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            View all passenger reservations, verify ticket boarding passes, and collect cash fares for your assigned shuttle trips.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          <Metric label="Total Reserved" value={stats.totalBookings} tone="text-amber-400" />
          <Metric label="Cash Pending" value={stats.pendingCashCount} tone="text-rose-400" />
          <Metric label="Paid / Collected" value={stats.totalCollectedCount} tone="text-emerald-400" />
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-between border ${
            feedback.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              : "bg-rose-500/10 border-rose-500/30 text-rose-400"
          }`}
        >
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-white font-mono text-xs">
            ✕
          </button>
        </div>
      )}

      {/* Advanced Filter Toolbar */}
      <form
        method="get"
        className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_170px_150px_130px_auto]"
      >
        <SearchBar placeholder="Search passenger name, phone, ticket ref, or seat..." className="min-w-0" debounceMs={0} navigateOnChange={false} />
        <Select name="status" defaultValue={filters.status}>
          <option value="">All Statuses</option>
          <option value="PENDING_CASH">⏳ Cash Pending</option>
          <option value="CONFIRMED">✅ Confirmed</option>
          <option value="COMPLETED">🏁 Completed</option>
          <option value="CANCELLED">✕ Cancelled</option>
        </Select>
        <Select name="payment" defaultValue={filters.payment}>
          <option value="">All Payment Modes</option>
          <option value="CASH">💵 CASH</option>
          <option value="ONLINE">💳 ONLINE</option>
        </Select>
        <Select name="pageSize" defaultValue={String(pageSize)}>
          <option value="10">10 / page</option>
          <option value="20">20 / page</option>
          <option value="50">50 / page</option>
        </Select>
        <div className="flex gap-2">
          <Button type="submit" className="h-11 w-full font-bold gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950">
            <Filter className="h-4 w-4" /> Filter
          </Button>
          {hasActiveFilters && (
            <Link
              href="/driver/bookings"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 px-3 text-xs font-bold text-slate-400 hover:bg-slate-800 hover:text-white"
              title="Reset filters"
            >
              <X className="h-4 w-4" />
            </Link>
          )}
        </div>
      </form>

      {/* Bookings Table */}
      {bookings.length === 0 ? (
        <Card variant="glass" className="p-12 text-center sm:p-16 border-slate-800 bg-slate-900/60">
          <Ticket className="mx-auto h-12 w-12 text-amber-500/50" />
          <h2 className="mt-4 text-lg font-bold text-white">No passenger bookings match this filter</h2>
          <p className="mt-1 text-xs text-slate-400">Bookings for your scheduled shuttle trips will appear here.</p>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left">
              <thead className="border-b border-slate-800 bg-slate-950/50">
                <tr>
                  <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">Passenger &amp; Contact</th>
                  <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">Route &amp; Departure</th>
                  <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">Seat &amp; Fare</th>
                  <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">Payment Status</th>
                  <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">Pass Status</th>
                  <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400">Boarding Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {bookings.map((b) => {
                  const passengerName = b.guestName || b.user?.name || "Passenger";
                  const passengerPhone = b.guestPhone || b.user?.phone || "No phone";
                  const isCashPending = b.paymentMode === "CASH" && b.paymentStatus === "PENDING";
                  const isIssued = b.ticket?.status === "ISSUED";
                  const isUsed = b.ticket?.status === "USED";

                  return (
                    <tr key={b.id} className={`transition-colors hover:bg-slate-800/30 ${isCashPending ? "bg-amber-500/5" : ""}`}>
                      <td className="px-5 py-4">
                        <p className="font-extrabold text-xs text-white">{passengerName}</p>
                        <p className="text-[11px] font-mono text-slate-400 mt-0.5">{passengerPhone}</p>
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-extrabold text-xs text-white">
                          {b.trip.sourceName} → {b.trip.destName}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-amber-500" />
                          {new Date(b.trip.startTime).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-mono text-xs font-black text-amber-400">Seat {b.seat?.seatNumber || "-"}</p>
                        <p className="text-[11px] font-extrabold text-emerald-400 mt-0.5">
                          ₹{b.totalAmount.toLocaleString("en-IN")}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-xs">
                        <div className="font-extrabold text-slate-300 mb-1">{b.paymentMode}</div>
                        {b.paymentStatus === "COLLECTED" ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                            ✅ COLLECTED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20">
                            ⏳ PENDING CASH
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        {b.ticket ? (
                          <div>
                            <p className="font-mono text-[11px] font-bold text-amber-400">#{b.ticket.ticketNumber}</p>
                            <span
                              className={`inline-block text-[10px] font-black px-2 py-0.5 rounded-md mt-1 border ${
                                isUsed
                                  ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                                  : isIssued
                                  ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                                  : "bg-slate-800 text-slate-400 border-slate-700"
                              }`}
                            >
                              {b.ticket.status}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-500 font-semibold">Pass not issued</span>
                        )}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Collect Cash Action */}
                          {isCashPending && (
                            <button
                              type="button"
                              onClick={() => setCollectModal({ id: b.id, passengerName, amount: b.totalAmount })}
                              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-extrabold flex items-center gap-1 transition-all shadow-md shadow-amber-500/20"
                            >
                              <Banknote className="h-3.5 w-3.5" /> Collect Cash
                            </button>
                          )}

                          {/* Confirm Boarding Action */}
                          {isIssued && b.ticket && (
                            <Button
                              size="sm"
                              disabled={isPending}
                              onClick={() => handleConfirmBoarding(b.ticket!.id)}
                              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-[11px] h-8 px-3 rounded-xl gap-1 shadow-md"
                            >
                              {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><UserCheck className="h-3.5 w-3.5" /> Board</>}
                            </Button>
                          )}

                          {b.ticket && (
                            <Link
                              href={`/passenger/ticket/${b.ticket.id}`}
                              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                              title="View Digital Pass"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <PaginationControls page={page} totalPages={totalPages} total={totalCount} pageSize={pageSize} />

      {/* Collect Cash Dialog */}
      <Dialog open={Boolean(collectModal)} onOpenChange={(open) => !open && setCollectModal(null)}>
        <DialogContent className="sm:max-w-md bg-[#0c101c] border-amber-500/30 text-white rounded-3xl p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-amber-400 font-extrabold flex items-center gap-2">
              <Banknote className="h-5 w-5" /> Collect Passenger Cash Fare
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-sm mt-1">
              Confirm that you have physically collected <strong className="text-emerald-400">₹{collectModal?.amount}</strong> cash from passenger{" "}
              <strong className="text-white">{collectModal?.passengerName}</strong>.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 mt-4">
            <Button variant="secondary" onClick={() => setCollectModal(null)} disabled={isPending}>
              Cancel
            </Button>
            <Button
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold gap-2"
              onClick={handleCollectCashSubmit}
              disabled={isPending}
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm Cash Collected"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-sm">
      <p className={`text-2xl font-black ${tone}`}>{value}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
    </div>
  );
}
