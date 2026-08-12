"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Route,
  PlusCircle,
  MapPin,
  Calendar,
  Users,
  Search,
  Filter,
  X,
  Play,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Car,
  Ticket,
  ChevronRight,
  Loader2,
  Trash2,
  Archive,
} from "lucide-react";
import {
  Card,
  Badge,
  Button,
  Select,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui";
import SearchBar from "@/components/ui/search-bar";
import PaginationControls from "@/components/ui/pagination";
import { formatIST, isPastScheduledTime } from "@/lib/date-utils";
import { cancelTrip } from "@/app/actions/trip-actions";

export type SerializedTrip = {
  id: string;
  tripSequence: number;
  status: string;
  startTime: string;
  isCancelled: boolean;
  cancellationReason: string | null;
  rejectionReason: string | null;
  source: { id: string; name: string };
  destination: { id: string; name: string };
  vehicle: { id: string; regNumber: string; modelName: string };
  bookedSeats: number;
  totalSeats: number;
  bookingCount: number;
};

interface DriverTripsClientProps {
  trips: SerializedTrip[];
  page: number;
  pageSize: number;
  totalPages: number;
  totalCount: number;
  statusFilter: string;
  q: string;
  countsByStatus: Record<string, number>;
}

const STATUS_LABELS: Record<string, string> = {
  PENDING_APPROVAL: "Pending Approval",
  SCHEDULED: "Scheduled",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  CANCELLED: "Expired / Cancelled",
  REJECTED: "Declined",
};

export function DriverTripsClient({
  trips,
  page,
  pageSize,
  totalPages,
  totalCount,
  statusFilter,
  q,
  countsByStatus,
}: DriverTripsClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [cancelModalTrip, setCancelModalTrip] = useState<SerializedTrip | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const handleCancelSubmit = () => {
    if (!cancelModalTrip) return;
    setFeedback(null);
    startTransition(async () => {
      const res = await cancelTrip(cancelModalTrip.id, cancelReason.trim() || "Cancelled by driver");
      if (res.success) {
        setFeedback({ type: "success", message: "Trip successfully cancelled/archived." });
        setCancelModalTrip(null);
        setCancelReason("");
        router.refresh();
      } else {
        setFeedback({ type: "error", message: res.error || "Failed to cancel trip." });
      }
    });
  };

  const hasActiveFilters = Boolean(statusFilter || q || pageSize !== 10);

  return (
    <div className="mx-auto max-w-[1450px] space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-black tracking-tight text-white sm:text-3xl">
            <Route className="h-7 w-7 text-amber-400" /> My Shuttle Trips Manifest
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            All schedules are synchronized in Indian Standard Time (IST UTC+05:30). Past unstarted trips are automatically archived.
          </p>
        </div>
        <Link href="/driver/trips/new">
          <Button className="bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-extrabold gap-2 shadow-md glow-amber cursor-pointer">
            <PlusCircle className="h-4 w-4" /> Schedule New Trip
          </Button>
        </Link>
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

      {/* Filter & Search Bar */}
      <form
        method="get"
        className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_180px_130px_auto]"
      >
        <SearchBar placeholder="Search route (Ayodhya, Lucknow), vehicle..." className="min-w-0" debounceMs={0} navigateOnChange={false} />
        <Select name="status" defaultValue={statusFilter}>
          <option value="">All Statuses ({totalCount})</option>
          <option value="SCHEDULED">🗓️ Scheduled ({countsByStatus["SCHEDULED"] ?? 0})</option>
          <option value="IN_PROGRESS">⚡ In Progress ({countsByStatus["IN_PROGRESS"] ?? 0})</option>
          <option value="COMPLETED">🏁 Completed ({countsByStatus["COMPLETED"] ?? 0})</option>
          <option value="CANCELLED">📦 Expired / Cancelled ({countsByStatus["CANCELLED"] ?? 0})</option>
          <option value="PENDING_APPROVAL">⏳ Pending Approval ({countsByStatus["PENDING_APPROVAL"] ?? 0})</option>
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
              href="/driver/trips"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 px-3 text-xs font-bold text-slate-400 hover:bg-slate-800 hover:text-white"
              title="Reset filters"
            >
              <X className="h-4 w-4" />
            </Link>
          )}
        </div>
      </form>

      {/* Trips CRUD Table View */}
      {trips.length === 0 ? (
        <Card variant="glass" className="p-12 text-center sm:p-16 border-slate-800 bg-slate-900/60">
          <MapPin className="mx-auto h-12 w-12 text-amber-500/50" />
          <h2 className="mt-4 text-lg font-bold text-white">No trips found matching filter</h2>
          <p className="mt-1 text-xs text-slate-400">Schedule your shuttle runs or adjust the filter parameters above.</p>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left">
              <thead className="border-b border-slate-800 bg-slate-950/50">
                <tr>
                  <th className="px-5 py-3.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">Seq &amp; Route</th>
                  <th className="px-5 py-3.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">Scheduled Departure (IST)</th>
                  <th className="px-5 py-3.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">Vehicle / Fleet</th>
                  <th className="px-5 py-3.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">Occupancy &amp; Seats</th>
                  <th className="px-5 py-3.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">Status</th>
                  <th className="px-5 py-3.5 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400">Manage &amp; Roster Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {trips.map((t) => {
                  const isExpired = t.isCancelled && t.cancellationReason?.toLowerCase().includes("expired");
                  const occupancyPct = t.totalSeats > 0 ? Math.round((t.bookedSeats / t.totalSeats) * 100) : 0;
                  const isScheduled = t.status === "SCHEDULED";
                  const isInProgress = t.status === "IN_PROGRESS";

                  return (
                    <tr key={t.id} className="transition-colors hover:bg-slate-800/30">
                      {/* Seq & Route */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 font-bold">
                            #{t.tripSequence}
                          </span>
                        </div>
                        <p className="font-extrabold text-sm text-white flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                          {t.source.name} → {t.destination.name}
                        </p>
                      </td>

                      {/* Scheduled Departure (IST) */}
                      <td className="px-5 py-4">
                        <p className="font-bold text-xs text-white flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                          {formatIST(t.startTime, "datetime")}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Indian Standard Time (IST)</p>
                      </td>

                      {/* Vehicle */}
                      <td className="px-5 py-4">
                        <p className="font-mono text-xs font-bold text-slate-200">{t.vehicle.regNumber}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{t.vehicle.modelName}</p>
                      </td>

                      {/* Occupancy */}
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-300 mb-1">
                          <span>{t.bookedSeats}/{t.totalSeats} seats</span>
                          <span className="text-amber-400">{occupancyPct}%</span>
                        </div>
                        <div className="w-28 h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              occupancyPct >= 80 ? "bg-emerald-400" : occupancyPct >= 40 ? "bg-amber-400" : "bg-slate-600"
                            }`}
                            style={{ width: `${occupancyPct}%` }}
                          />
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        {isExpired ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700">
                            <Archive className="h-3 w-3" /> EXPIRED &amp; ARCHIVED
                          </span>
                        ) : (
                          <Badge
                            variant={
                              t.status === "COMPLETED"
                                ? "success"
                                : t.status === "IN_PROGRESS"
                                ? "info"
                                : t.status === "SCHEDULED"
                                ? "warning"
                                : t.status === "CANCELLED" || t.status === "REJECTED"
                                ? "destructive"
                                : "secondary"
                            }
                          >
                            {STATUS_LABELS[t.status] ?? t.status}
                          </Badge>
                        )}
                        {t.cancellationReason && !isExpired && (
                          <p className="text-[10px] text-rose-400 mt-1 truncate max-w-[150px]">{t.cancellationReason}</p>
                        )}
                      </td>

                      {/* Manage & Roster Actions */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Walk-up Cash Booking */}
                          {isScheduled && (
                            <Link
                              href={`/driver/offline-book?tripId=${t.id}`}
                              className="px-2.5 py-1 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 text-[11px] font-extrabold flex items-center gap-1 transition-all"
                              title="Walk-up Cash Booking"
                            >
                              + Walk-up
                            </Link>
                          )}

                          {/* View Roster & Manifest */}
                          <Link
                            href={`/driver/trips/${t.id}`}
                            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-extrabold flex items-center gap-1 transition-all"
                          >
                            Manifest &amp; Roster →
                          </Link>

                          {/* Cancel / Archive Action */}
                          {(isScheduled || t.status === "PENDING_APPROVAL") && (
                            <button
                              type="button"
                              onClick={() => setCancelModalTrip(t)}
                              className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors"
                              title="Cancel / Archive Trip"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
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

      {/* Cancel Modal */}
      <Dialog open={Boolean(cancelModalTrip)} onOpenChange={(open) => !open && setCancelModalTrip(null)}>
        <DialogContent className="sm:max-w-md bg-[#0c101c] border-rose-500/30 text-white rounded-3xl p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-rose-400 font-extrabold flex items-center gap-2">
              <XCircle className="h-5 w-5" /> Cancel Shuttle Trip
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-sm mt-1">
              Are you sure you want to cancel trip <strong className="text-white">#{cancelModalTrip?.tripSequence}</strong> ({cancelModalTrip?.source.name} → {cancelModalTrip?.destination.name})?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 my-2">
            <label className="text-xs font-bold text-slate-300">Cancellation Reason (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Vehicle breakdown, severe weather..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-rose-500/50"
            />
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button variant="secondary" onClick={() => setCancelModalTrip(null)} disabled={isPending}>
              Dismiss
            </Button>
            <Button
              variant="destructive"
              className="font-extrabold gap-2"
              onClick={handleCancelSubmit}
              disabled={isPending}
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm Trip Cancellation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
