"use client";

import { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Ticket,
  ExternalLink,
  Download,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  Filter,
  CalendarDays,
  Banknote,
  CheckCircle2,
  Loader2,
  Receipt,
} from "lucide-react";
import { Badge, Button, Card, Select, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui";
import SearchBar from "@/components/ui/search-bar";
import PaginationControls from "@/components/ui/pagination";
import { adminTicketCollectCashAction } from "./ticket-actions";

export type AdminTicketItem = {
  id: string;
  ticketNumber: string;
  passengerName: string;
  passengerPhone: string | null;
  source: string;
  destination: string;
  seatNumber: string;
  tripDate: string;
  issuedAt: string;
  usedAt: string | null;
  status: string;
  booking: {
    id: string;
    status: string;
    paymentMode: string;
    paymentStatus: string;
    user: { name: string | null; phone: string | null } | null;
    trip: {
      startTime: string;
      driver: { name: string | null } | null;
    };
    seat: { seatNumber: string } | null;
  };
};

type Props = {
  tickets: AdminTicketItem[];
  page: number;
  pageSize: number;
  totalPages: number;
  totalCount: number;
  issuedCount: number;
  usedCount: number;
  cancelledCount: number;
  filters: {
    q: string;
    status: string;
    date: string;
    route: string;
    paymentStatus: string;
  };
};

type SortField = "ticketNumber" | "passengerName" | "tripDate" | "issuedAt" | "seatNumber" | "status";
type SortOrder = "asc" | "desc";

type CollectModal = { bookingId: string; passengerName: string; amount?: number } | null;

export function AdminTicketsClient({
  tickets,
  page,
  pageSize,
  totalPages,
  totalCount,
  issuedCount,
  usedCount,
  cancelledCount,
  filters,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [sortField, setSortField] = useState<SortField>("issuedAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [collectModal, setCollectModal] = useState<CollectModal>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const sortedTickets = useMemo(() => {
    return [...tickets].sort((a, b) => {
      let aVal: number | string = 0;
      let bVal: number | string = 0;
      switch (sortField) {
        case "ticketNumber": aVal = a.ticketNumber; bVal = b.ticketNumber; break;
        case "passengerName": aVal = a.passengerName.toLowerCase(); bVal = b.passengerName.toLowerCase(); break;
        case "tripDate": aVal = new Date(a.tripDate).getTime(); bVal = new Date(b.tripDate).getTime(); break;
        case "issuedAt": aVal = new Date(a.issuedAt).getTime(); bVal = new Date(b.issuedAt).getTime(); break;
        case "seatNumber": aVal = a.seatNumber || a.booking.seat?.seatNumber || ""; bVal = b.seatNumber || b.booking.seat?.seatNumber || ""; break;
        case "status": aVal = a.status; bVal = b.status; break;
      }
      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  }, [tickets, sortField, sortOrder]);

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 opacity-40 ml-1 inline" />;
    return sortOrder === "asc"
      ? <ArrowUp className="h-3 w-3 text-amber-500 ml-1 inline" />
      : <ArrowDown className="h-3 w-3 text-amber-500 ml-1 inline" />;
  };

  const hasActiveFilters = Boolean(filters.q || filters.status || filters.date || filters.route || filters.paymentStatus);

  const handleCollectCash = () => {
    if (!collectModal) return;
    setActionError(null);
    setActionSuccess(null);
    startTransition(async () => {
      try {
        const res = await adminTicketCollectCashAction(collectModal.bookingId);
        if (!res.success) throw new Error(res.error);
        setActionSuccess("✅ Cash collected! Ticket confirmed & PAID invoice generated.");
        router.refresh();
        setTimeout(() => {
          setCollectModal(null);
          setActionSuccess(null);
        }, 1200);
      } catch (err) {
        setActionError(err instanceof Error ? err.message : "Collection failed.");
      }
    });
  };


  // Count pending cash bookings on this page
  const pendingCashCount = tickets.filter(
    (t) => t.booking.paymentMode === "CASH" && t.booking.paymentStatus === "PENDING"
  ).length;

  return (
    <div className="mx-auto max-w-[1500px] space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            <Ticket className="h-7 w-7 text-amber-500" /> Boarding Pass Control Center
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Monitor issued digital boarding passes, boarding status, payment verification, and passenger manifest vouchers.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          <Metric label="Issued Passes" value={issuedCount} tone="text-amber-500" />
          <Metric label="Boarded" value={usedCount} tone="text-emerald-500" />
          <Metric label="Closed / Cancelled" value={cancelledCount} tone="text-rose-500" />
        </div>
      </div>

      {/* Pending cash collection alert */}
      {pendingCashCount > 0 && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-2xl bg-amber-500/10 border border-amber-500/30">
          <Banknote className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-extrabold text-amber-300">
              {pendingCashCount} boarding pass{pendingCashCount > 1 ? "es" : ""} with uncollected cash on this page
            </p>
            <p className="text-xs text-amber-400/70 mt-0.5">
              Use the <strong>Collect Cash</strong> button (green) in the Actions column to confirm collection and generate a PAID invoice.
            </p>
          </div>
        </div>
      )}

      {/* Quick Status Filters */}
      <nav aria-label="Boarding pass status filters" className="flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
        {[
          ["", "All Passes"],
          ["ISSUED", "Needs Boarding"],
          ["USED", "Boarded"],
          ["CANCELLED", "Cancelled"],
          ["NO_SHOW", "No-Show"],
        ].map(([value, label]) => (
          <Link
            key={value || "all"}
            href={value ? `/admin/tickets?status=${value}` : "/admin/tickets"}
            className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-bold transition-colors ${
              filters.status === value
                ? "bg-amber-500 text-slate-950 shadow-md"
                : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            }`}
          >
            {label}
          </Link>
        ))}
        {/* Quick filter for pending cash */}
        <Link
          href="/admin/tickets?paymentStatus=PENDING"
          className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-bold transition-colors flex items-center gap-1.5 ${
            filters.paymentStatus === "PENDING"
              ? "bg-amber-500 text-slate-950"
              : "text-amber-500 hover:bg-amber-500/10 border border-amber-500/20"
          }`}
        >
          <Banknote className="h-3.5 w-3.5" /> Cash Pending
        </Link>
      </nav>

      {/* Advanced Filter Toolbar */}
      <form
        method="get"
        className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_160px_160px_150px_120px_auto]"
      >
        <SearchBar placeholder="Search pass ref, passenger, or phone..." className="min-w-0" debounceMs={0} navigateOnChange={false} />
        <input
          name="route"
          defaultValue={filters.route}
          placeholder="Route or city..."
          className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-900 outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />
        <input
          name="date"
          type="date"
          defaultValue={filters.date}
          className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-900 outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />
        <Select name="paymentStatus" defaultValue={filters.paymentStatus}>
          <option value="">All Payments</option>
          <option value="COLLECTED">✅ Collected</option>
          <option value="PENDING">⏳ Pending Cash/Proof</option>
        </Select>
        <Select name="pageSize" defaultValue={String(pageSize)}>
          <option value="20">20 / page</option>
          <option value="50">50 / page</option>
          <option value="100">100 / page</option>
        </Select>
        {filters.status && <input type="hidden" name="status" value={filters.status} />}
        <div className="flex gap-2">
          <Button type="submit" className="h-11 w-full font-bold gap-2">
            <Filter className="h-4 w-4" /> Filter
          </Button>
          {hasActiveFilters && (
            <Link
              href="/admin/tickets"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 px-3 text-xs font-bold text-slate-600 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              title="Reset filters"
            >
              <X className="h-4 w-4" />
            </Link>
          )}
        </div>
      </form>

      {/* Boarding Passes Table */}
      {tickets.length === 0 ? (
        <Card variant="glass" className="p-12 text-center sm:p-16">
          <Ticket className="mx-auto h-12 w-12 text-amber-500/50" />
          <h2 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">No boarding passes match this filter</h2>
          <p className="mt-1 text-sm text-slate-500">Boarding passes appear after cash confirmation or online payment approval.</p>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left">
              <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/50">
                <tr>
                  {[
                    { field: "ticketNumber" as SortField, label: "Pass Ref" },
                    { field: "passengerName" as SortField, label: "Passenger" },
                    { field: "tripDate" as SortField, label: "Route / Departure" },
                    { field: "seatNumber" as SortField, label: "Seat / Driver" },
                  ].map(({ field, label }) => (
                    <th key={field} className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      <button type="button" onClick={() => handleSort(field)} className="hover:text-amber-500 font-bold transition-colors">
                        {label} {renderSortIcon(field)}
                      </button>
                    </th>
                  ))}
                  <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Payment</th>
                  <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <button type="button" onClick={() => handleSort("status")} className="hover:text-amber-500 font-bold transition-colors">
                      Status {renderSortIcon("status")}
                    </button>
                  </th>
                  <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                {sortedTickets.map((t) => {
                  const isCashPending = t.booking.paymentMode === "CASH" && t.booking.paymentStatus === "PENDING";
                  return (
                    <tr key={t.id} className={`transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/30 ${isCashPending ? "bg-amber-500/3 dark:bg-amber-500/5" : ""}`}>
                      <td className="px-5 py-4">
                        <p className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400">{t.ticketNumber}</p>
                        <p className="mt-1 text-[10px] text-slate-500">
                          Issued: {new Date(t.issuedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                        </p>
                        {t.usedAt && (
                          <p className="mt-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                            Boarded: {new Date(t.usedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-xs font-bold text-slate-900 dark:text-white">{t.passengerName}</p>
                        <p className="mt-1 text-[11px] text-slate-500 font-mono">
                          {t.passengerPhone || t.booking.user?.phone || "No phone"}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-xs font-black text-slate-900 dark:text-white">{t.source} → {t.destination}</p>
                        <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-500">
                          <CalendarDays className="h-3 w-3 text-amber-500" />
                          {new Date(t.tripDate).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-xs font-black text-slate-900 dark:text-white">Seat {t.seatNumber || t.booking.seat?.seatNumber || "-"}</p>
                        <p className="mt-1 text-[11px] text-slate-500">{t.booking.trip.driver?.name || "Unassigned driver"}</p>
                      </td>
                      <td className="px-5 py-4 text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className={`font-extrabold ${t.booking.paymentMode === "CASH" ? "text-amber-500" : "text-indigo-400"}`}>
                            {t.booking.paymentMode}
                          </span>
                        </div>
                        <div className="mt-1">
                          {t.booking.paymentStatus === "PENDING" ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded-md border border-rose-500/20">
                              ⏳ PENDING
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-md border border-emerald-500/20">
                              ✅ COLLECTED
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <PassStatusBadge status={t.status} />
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* COLLECT CASH button — only for CASH + PENDING bookings */}
                          {isCashPending && (
                            <button
                              type="button"
                              title="Collect cash & confirm booking"
                              onClick={() => {
                                setActionError(null);
                                setActionSuccess(null);
                                setCollectModal({ bookingId: t.booking.id, passengerName: t.passengerName });
                              }}
                              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 text-[11px] font-extrabold transition-all shadow-md shadow-emerald-500/20"
                            >
                              <Banknote className="h-3.5 w-3.5" />
                              Collect Cash
                            </button>
                          )}

                          <Link
                            href={`/passenger/booking/${t.booking.id}`}
                            title="View Booking Detail"
                            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-all group"
                          >
                            <ExternalLink className="h-4 w-4 group-hover:scale-110 transition-transform" />
                          </Link>
                          <Link
                            href={`/passenger/ticket/${t.id}`}
                            title="View Digital Boarding Pass"
                            className="p-2 rounded-xl bg-amber-500/10 hover:bg-amber-500 text-amber-500 hover:text-slate-950 border border-amber-500/30 transition-all group"
                          >
                            <Ticket className="h-4 w-4 group-hover:scale-110 transition-transform" />
                          </Link>
                          <a
                            href={`/api/tickets/${t.id}/pdf`}
                            download={`${t.ticketNumber}.pdf`}
                            title="Download Pass PDF"
                            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-all group"
                          >
                            <Download className="h-4 w-4 group-hover:scale-110 transition-transform" />
                          </a>
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

      {/* Collect Cash Confirmation Dialog */}
      <Dialog open={Boolean(collectModal)} onOpenChange={(open) => !open && setCollectModal(null)}>
        <DialogContent className="sm:max-w-md bg-[#0c101c] border-emerald-500/30 text-white rounded-3xl p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-emerald-400 font-extrabold flex items-center gap-2 text-lg">
              <Banknote className="h-5 w-5" /> Confirm Cash Collection
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-sm mt-1">
              Confirm that you have physically received the cash fare from passenger{" "}
              <strong className="text-white">{collectModal?.passengerName}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="my-2 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-2 text-xs text-slate-300">
            <p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" /> Booking status → <strong className="text-white">CONFIRMED</strong></p>
            <p className="flex items-center gap-2"><Ticket className="h-4 w-4 text-amber-400 shrink-0" /> Boarding ticket → <strong className="text-white">CONFIRMED</strong></p>
            <p className="flex items-center gap-2"><Receipt className="h-4 w-4 text-indigo-400 shrink-0" /> PAID invoice → <strong className="text-white">Generated automatically</strong></p>
          </div>

          {actionError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold">
              {actionError}
            </div>
          )}
          {actionSuccess && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" /> {actionSuccess}
            </div>
          )}

          <DialogFooter className="gap-2 mt-2">
            <Button variant="secondary" onClick={() => setCollectModal(null)} disabled={isPending}>
              Cancel
            </Button>
            <Button
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold gap-2"
              onClick={handleCollectCash}
              disabled={isPending}
            >
              {isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Processing...</>
              ) : (
                <><CheckCircle2 className="h-4 w-4" /> Confirm Cash Collected</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
      <p className={`text-2xl font-black ${tone}`}>{value}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
    </div>
  );
}

function PassStatusBadge({ status }: { status: string }) {
  const variant =
    status === "USED" ? "success"
    : status === "ISSUED" ? "warning"
    : status === "NO_SHOW" ? "secondary"
    : "destructive";
  return <Badge variant={variant}>{status.replace("_", " ")}</Badge>;
}
