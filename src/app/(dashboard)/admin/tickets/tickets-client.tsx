"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Ticket,
  ExternalLink,
  Printer,
  Download,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  Filter,
  Users,
  CalendarDays,
} from "lucide-react";
import { Badge, Button, Card, Select } from "@/components/ui";
import SearchBar from "@/components/ui/search-bar";
import PaginationControls from "@/components/ui/pagination";

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
  const [sortField, setSortField] = useState<SortField>("issuedAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

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
        case "ticketNumber":
          aVal = a.ticketNumber;
          bVal = b.ticketNumber;
          break;
        case "passengerName":
          aVal = a.passengerName.toLowerCase();
          bVal = b.passengerName.toLowerCase();
          break;
        case "tripDate":
          aVal = new Date(a.tripDate).getTime();
          bVal = new Date(b.tripDate).getTime();
          break;
        case "issuedAt":
          aVal = new Date(a.issuedAt).getTime();
          bVal = new Date(b.issuedAt).getTime();
          break;
        case "seatNumber":
          aVal = a.seatNumber || a.booking.seat?.seatNumber || "";
          bVal = b.seatNumber || b.booking.seat?.seatNumber || "";
          break;
        case "status":
          aVal = a.status;
          bVal = b.status;
          break;
      }

      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  }, [tickets, sortField, sortOrder]);

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 opacity-40 ml-1 inline" />;
    return sortOrder === "asc" ? (
      <ArrowUp className="h-3 w-3 text-amber-500 ml-1 inline font-bold" />
    ) : (
      <ArrowDown className="h-3 w-3 text-amber-500 ml-1 inline font-bold" />
    );
  };

  const hasActiveFilters = Boolean(
    filters.q || filters.status || filters.date || filters.route || filters.paymentStatus
  );

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
                ? "bg-amber-500 text-slate-950 shadow-md glow-amber"
                : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            }`}
          >
            {label}
          </Link>
        ))}
      </nav>

      {/* Advanced Filter Toolbar */}
      <form
        method="get"
        className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_160px_160px_150px_120px_auto]"
      >
        <SearchBar
          placeholder="Search pass ref, passenger, or phone..."
          className="min-w-0"
          debounceMs={0}
          navigateOnChange={false}
        />
        <input
          name="route"
          defaultValue={filters.route}
          placeholder="Route or city..."
          aria-label="Filter by route or city"
          className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-900 outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />
        <input
          name="date"
          type="date"
          defaultValue={filters.date}
          aria-label="Filter by departure date"
          className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-900 outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />
        <Select name="paymentStatus" defaultValue={filters.paymentStatus} aria-label="Filter by payment status">
          <option value="">All Payments</option>
          <option value="COLLECTED">Collected</option>
          <option value="PENDING">Pending Cash/Proof</option>
        </Select>
        <Select name="pageSize" defaultValue={String(pageSize)} aria-label="Passes per page">
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
              className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 px-3 text-xs font-bold text-slate-600 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
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
          <p className="mt-1 text-sm text-slate-500">Boarding passes appear automatically after cash confirmation or online payment approval.</p>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left">
              <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/50">
                <tr>
                  <th className="px-5 py-3 text.left text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <button type="button" onClick={() => handleSort("ticketNumber")} className="hover:text-amber-500 font-bold transition-colors">
                      Pass Ref {renderSortIcon("ticketNumber")}
                    </button>
                  </th>
                  <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <button type="button" onClick={() => handleSort("passengerName")} className="hover:text-amber-500 font-bold transition-colors">
                      Passenger {renderSortIcon("passengerName")}
                    </button>
                  </th>
                  <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <button type="button" onClick={() => handleSort("tripDate")} className="hover:text-amber-500 font-bold transition-colors">
                      Route / Departure {renderSortIcon("tripDate")}
                    </button>
                  </th>
                  <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <button type="button" onClick={() => handleSort("seatNumber")} className="hover:text-amber-500 font-bold transition-colors">
                      Seat / Driver {renderSortIcon("seatNumber")}
                    </button>
                  </th>
                  <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Payment
                  </th>
                  <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <button type="button" onClick={() => handleSort("status")} className="hover:text-amber-500 font-bold transition-colors">
                      Status {renderSortIcon("status")}
                    </button>
                  </th>
                  <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                {sortedTickets.map((t) => (
                  <tr key={t.id} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/30">
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
                    <td className="px-5 py-4 text-xs text-slate-600 dark:text-slate-300">
                      <p className="font-bold">{t.booking.paymentMode}</p>
                      <p className="mt-1 text-[10px] text-amber-500">{t.booking.paymentStatus}</p>
                    </td>
                    <td className="px-5 py-4">
                      <PassStatusBadge status={t.status} />
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/passenger/booking/${t.booking.id}`}
                          title="View Passenger Booking Detail"
                          aria-label={`View booking for ${t.passengerName}`}
                          className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-all group"
                        >
                          <ExternalLink className="h-4 w-4 group-hover:scale-110 transition-transform" />
                        </Link>
                        <Link
                          href={`/passenger/ticket/${t.id}`}
                          title="View Digital Boarding Pass"
                          aria-label={`View pass ${t.ticketNumber}`}
                          className="p-2 rounded-xl bg-amber-500/10 hover:bg-amber-500 text-amber-500 hover:text-slate-950 border border-amber-500/30 transition-all group"
                        >
                          <Ticket className="h-4 w-4 group-hover:scale-110 transition-transform" />
                        </Link>
                        <a
                          href={`/api/tickets/${t.id}/pdf`}
                          download={`${t.ticketNumber}.pdf`}
                          title="Download Pass PDF"
                          aria-label={`Download PDF pass ${t.ticketNumber}`}
                          className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-all group"
                        >
                          <Download className="h-4 w-4 group-hover:scale-110 transition-transform" />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination Controls */}
      <PaginationControls page={page} totalPages={totalPages} total={totalCount} pageSize={pageSize} />
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
    status === "USED"
      ? "success"
      : status === "ISSUED"
      ? "warning"
      : status === "NO_SHOW"
      ? "secondary"
      : "destructive";
  return <Badge variant={variant}>{status.replace("_", " ")}</Badge>;
}
