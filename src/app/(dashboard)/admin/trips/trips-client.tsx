"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  CalendarDays,
  CircleAlert,
  ExternalLink,
  Plus,
  Route,
  Search,
  Ticket,
  Users,
  Wallet,
  XCircle,
  Pencil,
  Play,
  CheckCircle2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Navigation,
  Radio,
  Clock,
} from "lucide-react";
import { Badge, Button, Card, Select } from "@/components/ui";
import SearchBar from "@/components/ui/search-bar";
import PaginationControls from "@/components/ui/pagination";
import { TripStartValidationModal } from "@/components/trips/TripStartValidationModal";
import { TripCompleteModal } from "@/components/trips/TripCompleteModal";
import { useRouter } from "next/navigation";

type Trip = {
  id: string;
  startTime: string;
  status: string;
  manifestLocked: boolean;
  tripSequence: number;
  source: string;
  destination: string;
  readiness: string;
  alerts: string[];
  driver: { id: string; name: string | null; phone: string; isActive: boolean; kycStatus: string; isAvailable: boolean } | null;
  vehicle: { id: string; regNumber: string; modelName: string; capacity: number; isActive: boolean };
  seats: { total: number; available: number; locked: number; booked: number };
  bookings: { pending: number; confirmed: number; completed: number; cancelled: number; noShow: number };
  payments: { gross: number; collected: number; pendingCash: number; pendingOnline: number; paymentProofs: number };
  tickets: { issued: number; used: number; gaps: number };
};

type Props = {
  trips: Trip[];
  page: number;
  pageSize: number;
  totalPages: number;
  totalCount: number;
  summary: { today: number; inProgress: number; scheduled: number; cancelled: number; pendingPayments: number; ticketGaps: number };
  filters: { q: string; status: string; date: string; readiness: string };
};

type SortField = "startTime" | "sequence" | "source" | "driver" | "occupancy" | "collected" | "revenue" | "status";
type SortOrder = "asc" | "desc";

const readinessFilters = [
  ["", "All trips"],
  ["READY", "Ready"],
  ["AT_RISK", "At risk"],
  ["NO_DRIVER", "Driver missing"],
  ["PAYMENT_REVIEW", "Payment review"],
  ["TICKET_GAP", "Ticket gaps"],
] as const;

export function AdminTripsClient({ trips, page, pageSize, totalPages, totalCount, summary, filters }: Props) {
  const router = useRouter();
  const [sortField, setSortField] = useState<SortField>("startTime");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  // Modal states
  const [startModalTripId, setStartModalTripId] = useState<string | null>(null);
  const [completeModalTrip, setCompleteModalTrip] = useState<Trip | null>(null);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const sortedTrips = useMemo(() => {
    return [...trips].sort((a, b) => {
      let aVal: number | string = 0;
      let bVal: number | string = 0;

      switch (sortField) {
        case "startTime":
          aVal = new Date(a.startTime).getTime();
          bVal = new Date(b.startTime).getTime();
          break;
        case "sequence":
          aVal = a.tripSequence;
          bVal = b.tripSequence;
          break;
        case "source":
          aVal = a.source.toLowerCase();
          bVal = b.source.toLowerCase();
          break;
        case "driver":
          aVal = (a.driver?.name || "zzz").toLowerCase();
          bVal = (b.driver?.name || "zzz").toLowerCase();
          break;
        case "occupancy":
          aVal = a.seats.total > 0 ? (a.seats.booked / a.seats.total) * 100 : 0;
          bVal = b.seats.total > 0 ? (b.seats.booked / b.seats.total) * 100 : 0;
          break;
        case "collected":
          aVal = a.payments.collected;
          bVal = b.payments.collected;
          break;
        case "revenue":
          aVal = a.payments.gross;
          bVal = b.payments.gross;
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
  }, [trips, sortField, sortOrder]);

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 opacity-40 ml-1 inline" />;
    return sortOrder === "asc" ? (
      <ArrowUp className="h-3 w-3 text-amber-500 ml-1 inline font-bold" />
    ) : (
      <ArrowDown className="h-3 w-3 text-amber-500 ml-1 inline font-bold" />
    );
  };

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 pb-12">
      <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-500">
            <Route className="h-4 w-4" /> Dispatch operations
          </div>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">Trip control center</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">Manage departures, readiness exceptions, payments, manifests, and revenue from one responsive workspace.</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Link href="/admin/trips/new"><Button className="w-full font-bold gap-1.5"><Plus className="h-4 w-4" /> Schedule trip</Button></Link>
          <Link href="/admin/trips/approvals"><Button variant="secondary" className="w-full font-bold gap-1.5"><CircleAlert className="h-4 w-4 text-amber-400" /> Approvals</Button></Link>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Metric label="Today" value={summary.today} icon={CalendarDays} />
        <Metric label="In progress" value={summary.inProgress} icon={Route} tone="text-emerald-500" />
        <Metric label="Scheduled" value={summary.scheduled} icon={Users} />
        <Metric label="Payment review" value={summary.pendingPayments} icon={Wallet} tone="text-amber-500" />
        <Metric label="Ticket gaps" value={summary.ticketGaps} icon={Ticket} tone="text-rose-500" />
        <Metric label="Cancelled" value={summary.cancelled} icon={XCircle} tone="text-slate-500" />
      </div>

      <nav aria-label="Trip readiness filters" className="flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
        {readinessFilters.map(([value, label]) => (
          <Link
            key={value || "all"}
            href={value ? `/admin/trips?readiness=${value}` : "/admin/trips"}
            className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-bold transition-colors ${filters.readiness === value ? "bg-amber-500 text-slate-950 shadow-md glow-amber" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400"}`}
            aria-current={filters.readiness === value ? "page" : undefined}
          >
            {label}
          </Link>
        ))}
      </nav>

      {/* Filter Toolbar */}
      <form method="get" className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_170px_180px_150px_auto]">
        <SearchBar placeholder="Search route, driver, or registration..." className="min-w-0" debounceMs={0} navigateOnChange={false} />
        <input name="date" type="date" defaultValue={filters.date} aria-label="Filter by departure date" className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" />
        <Select name="status" defaultValue={filters.status} aria-label="Filter by trip status">
          <option value="">All trip statuses</option>
          <option value="SCHEDULED">Scheduled</option>
          <option value="IN_PROGRESS">In progress</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </Select>
        <Select name="pageSize" defaultValue={String(pageSize)} aria-label="Trips per page">
          <option value="20">20 per page</option>
          <option value="50">50 per page</option>
          <option value="100">100 per page</option>
        </Select>
        {filters.readiness && <input type="hidden" name="readiness" value={filters.readiness} />}
        <Button type="submit" className="h-11 w-full sm:col-span-2 lg:col-span-1 font-bold gap-2"><Search className="h-4 w-4" /> Apply filters</Button>
      </form>

      {trips.length === 0 ? (
        <Card variant="glass" className="p-12 text-center sm:p-16">
          <Route className="mx-auto h-12 w-12 text-amber-500/50" />
          <h2 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">No trips match this board</h2>
          <p className="mt-1 text-sm text-slate-500">Change the filters or schedule a new departure.</p>
        </Card>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/60 xl:block">
            {/* Sortable Header Columns */}
            <div className="grid grid-cols-[1.35fr_1.25fr_1.2fr_0.8fr_0.9fr_0.8fr_0.75fr_1.2fr] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-400">
              <button type="button" onClick={() => handleSort("startTime")} className="text-left font-bold hover:text-amber-400 transition-colors flex items-center">
                Departure {renderSortIcon("startTime")}
              </button>
              <button type="button" onClick={() => handleSort("source")} className="text-left font-bold hover:text-amber-400 transition-colors flex items-center">
                Route {renderSortIcon("source")}
              </button>
              <button type="button" onClick={() => handleSort("driver")} className="text-left font-bold hover:text-amber-400 transition-colors flex items-center">
                Driver / Vehicle {renderSortIcon("driver")}
              </button>
              <button type="button" onClick={() => handleSort("occupancy")} className="text-left font-bold hover:text-amber-400 transition-colors flex items-center">
                Seats {renderSortIcon("occupancy")}
              </button>
              <button type="button" onClick={() => handleSort("collected")} className="text-left font-bold hover:text-amber-400 transition-colors flex items-center">
                Payments {renderSortIcon("collected")}
              </button>
              <span>Tickets</span>
              <button type="button" onClick={() => handleSort("revenue")} className="text-left font-bold hover:text-amber-400 transition-colors flex items-center">
                Revenue {renderSortIcon("revenue")}
              </button>
              <span className="text-right">Actions</span>
            </div>

            <div className="divide-y divide-slate-200 dark:divide-slate-800/60">
              {sortedTrips.map((trip) => (
                <TripRow
                  key={trip.id}
                  trip={trip}
                  onStartClick={() => setStartModalTripId(trip.id)}
                  onCompleteClick={() => setCompleteModalTrip(trip)}
                />
              ))}
            </div>
          </div>

          <div className="grid gap-3 xl:hidden">
            {sortedTrips.map((trip) => (
              <TripCard
                key={trip.id}
                trip={trip}
                onStartClick={() => setStartModalTripId(trip.id)}
                onCompleteClick={() => setCompleteModalTrip(trip)}
              />
            ))}
          </div>
        </>
      )}

      <PaginationControls page={page} totalPages={totalPages} total={totalCount} pageSize={pageSize} />

      {/* Validation Modal for Starting Trip */}
      {startModalTripId && (
        <TripStartValidationModal
          tripId={startModalTripId}
          isOpen={!!startModalTripId}
          isAdmin={true}
          onClose={() => setStartModalTripId(null)}
          onSuccess={() => router.refresh()}
        />
      )}

      {/* Completion Modal */}
      {completeModalTrip && (
        <TripCompleteModal
          tripId={completeModalTrip.id}
          isOpen={!!completeModalTrip}
          isAdmin={true}
          sourceName={completeModalTrip.source}
          destName={completeModalTrip.destination}
          onClose={() => setCompleteModalTrip(null)}
          onSuccess={() => router.refresh()}
        />
      )}
    </div>
  );
}

function TripRow({
  trip,
  onStartClick,
  onCompleteClick,
}: {
  trip: Trip;
  onStartClick: () => void;
  onCompleteClick: () => void;
}) {
  return (
    <article className="grid grid-cols-[1.35fr_1.25fr_1.2fr_0.8fr_0.9fr_0.8fr_0.75fr_1.2fr] gap-4 px-5 py-4 text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/30 items-center">
      <Departure trip={trip} />
      <RouteCell trip={trip} />
      <DriverCell trip={trip} />
      <SeatCell trip={trip} />
      <PaymentCell trip={trip} />
      <TicketCell trip={trip} />
      <RevenueCell trip={trip} />
      <IconTripActions trip={trip} onStartClick={onStartClick} onCompleteClick={onCompleteClick} />
    </article>
  );
}

function TripCard({
  trip,
  onStartClick,
  onCompleteClick,
}: {
  trip: Trip;
  onStartClick: () => void;
  onCompleteClick: () => void;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={trip.readiness} />
            <Badge variant={trip.status === "IN_PROGRESS" ? "success" : trip.status === "CANCELLED" ? "destructive" : "outline"}>
              {trip.status.replace("_", " ")}
            </Badge>
          </div>
          <p className="mt-2 text-base font-black text-slate-900 dark:text-white">{trip.source} → {trip.destination}</p>
        </div>
        <span className="shrink-0 rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500 dark:bg-slate-800">#{trip.tripSequence}</span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 border-y border-slate-200 py-3 text-xs dark:border-slate-800 sm:grid-cols-4">
        <InfoStat label="Departure" value={new Date(trip.startTime).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })} />
        <InfoStat label="Seats" value={`${trip.seats.booked}/${trip.seats.total} booked`} />
        <InfoStat label="Collected" value={`₹${trip.payments.collected.toLocaleString("en-IN")}`} />
        <InfoStat label="Tickets" value={`${trip.tickets.issued}/${trip.bookings.confirmed + trip.bookings.completed}`} />
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-bold text-slate-800 dark:text-slate-200">{trip.driver?.name || "Driver missing"}</p>
          <p className="truncate text-[10px] text-slate-500">{trip.vehicle.regNumber} · {trip.vehicle.modelName}</p>
        </div>
        <IconTripActions trip={trip} onStartClick={onStartClick} onCompleteClick={onCompleteClick} />
      </div>
      {trip.alerts.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {trip.alerts.slice(0, 3).map((alert) => (
            <span key={alert} className="rounded-md bg-rose-500/10 px-2 py-1 text-[9px] font-bold text-rose-500">{alert.replaceAll("_", " ")}</span>
          ))}
        </div>
      )}
    </article>
  );
}

function Departure({ trip }: { trip: Trip }) {
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <StatusBadge status={trip.readiness} />
        <Badge variant={trip.status === "IN_PROGRESS" ? "success" : trip.status === "CANCELLED" ? "destructive" : "outline"}>
          {trip.status.replace("_", " ")}
        </Badge>
      </div>
      <p className="mt-2 flex items-center gap-1 text-xs font-bold text-slate-800 dark:text-white">
        <CalendarDays className="h-3.5 w-3.5 text-amber-500" />
        {new Date(trip.startTime).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
      </p>
      <p className="mt-1 text-[10px] text-slate-500">
        Sequence #{trip.tripSequence}{trip.manifestLocked ? " · Manifest locked" : ""}
      </p>
    </div>
  );
}

function RouteCell({ trip }: { trip: Trip }) {
  return (
    <div>
      <p className="text-sm font-black text-slate-900 dark:text-white">{trip.source} → {trip.destination}</p>
      <div className="mt-2 flex flex-wrap gap-1">
        {trip.alerts.slice(0, 3).map((alert) => (
          <span key={alert} className="rounded-md bg-rose-500/10 px-2 py-1 text-[9px] font-bold text-rose-500">{alert.replaceAll("_", " ")}</span>
        ))}
      </div>
    </div>
  );
}

function DriverCell({ trip }: { trip: Trip }) {
  return (
    <div>
      <p className="text-xs font-bold text-slate-800 dark:text-white">{trip.driver?.name || "Driver missing"}</p>
      <p className="mt-1 text-[10px] text-slate-500">{trip.vehicle.regNumber} · {trip.vehicle.modelName}</p>
      <p className="mt-1 text-[10px] text-slate-500">{trip.driver ? `${trip.driver.kycStatus} · ${trip.driver.isAvailable ? "Available" : "Unavailable"}` : "Assign before departure"}</p>
    </div>
  );
}

function SeatCell({ trip }: { trip: Trip }) {
  const percent = trip.seats.total ? (trip.seats.booked / trip.seats.total) * 100 : 0;
  return (
    <div>
      <p className="text-sm font-black text-slate-900 dark:text-white">{trip.seats.booked}/{trip.seats.total}</p>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${percent}%` }} />
      </div>
      <p className="mt-1 text-[10px] text-slate-500">{trip.seats.available} open · {trip.seats.locked} locked</p>
    </div>
  );
}

function PaymentCell({ trip }: { trip: Trip }) {
  return (
    <div>
      <p className="text-xs font-bold text-slate-800 dark:text-white">₹{trip.payments.collected.toLocaleString("en-IN")}</p>
      <p className="mt-1 text-[10px] text-amber-500">₹{(trip.payments.pendingCash + trip.payments.pendingOnline).toLocaleString("en-IN")} outstanding</p>
      <p className="mt-1 text-[10px] text-slate-500">{trip.payments.paymentProofs} proofs</p>
    </div>
  );
}

function TicketCell({ trip }: { trip: Trip }) {
  return (
    <div>
      <p className="text-xs font-bold text-slate-800 dark:text-white">{trip.tickets.issued}/{trip.bookings.confirmed + trip.bookings.completed}</p>
      <p className="mt-1 text-[10px] text-emerald-500">{trip.tickets.used} boarded</p>
      <p className="mt-1 text-[10px] text-rose-500">{trip.tickets.gaps} gaps</p>
    </div>
  );
}

function RevenueCell({ trip }: { trip: Trip }) {
  return (
    <div>
      <p className="text-xs font-black text-slate-900 dark:text-white">₹{trip.payments.gross.toLocaleString("en-IN")}</p>
      <p className="mt-1 text-[10px] text-slate-500">gross value</p>
    </div>
  );
}

function InfoStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 font-bold text-slate-800 dark:text-slate-200">{value}</p>
    </div>
  );
}

/** Icon-Only Action Buttons Component */
function IconTripActions({
  trip,
  onStartClick,
  onCompleteClick,
}: {
  trip: Trip;
  onStartClick: () => void;
  onCompleteClick: () => void;
}) {
  const canStart = trip.status === "SCHEDULED";
  const canComplete = trip.status === "IN_PROGRESS";

  return (
    <div className="flex items-center justify-end gap-1.5">
      {canStart && (
        <button
          type="button"
          onClick={onStartClick}
          title="Validate & Depart Trip"
          aria-label="Validate and start trip"
          className="p-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-slate-950 border border-emerald-500/30 transition-all group"
        >
          <Play className="h-4 w-4 group-hover:scale-110 transition-transform fill-current" />
        </button>
      )}

      {canComplete && (
        <button
          type="button"
          onClick={onCompleteClick}
          title="Complete Trip"
          aria-label="Complete trip"
          className="p-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-slate-950 border border-emerald-500/30 transition-all group"
        >
          <CheckCircle2 className="h-4 w-4 group-hover:scale-110 transition-transform" />
        </button>
      )}

      <Link
        href={`/admin/trips/${trip.id}`}
        title="Manage Trip Operations & Telemetry"
        aria-label={`Manage trip ${trip.source} to ${trip.destination}`}
        className="p-2 rounded-xl bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-slate-950 border border-amber-500/30 transition-all group"
      >
        <ExternalLink className="h-4 w-4 group-hover:scale-110 transition-transform" />
      </Link>

      <Link
        href={`/admin/trips/${trip.id}/edit`}
        title="Edit Trip Schedule & Seat Prices"
        aria-label="Edit trip"
        className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-all group"
      >
        <Pencil className="h-4 w-4 group-hover:scale-110 transition-transform" />
      </Link>

      <Link
        href={`/admin/bookings?tripId=${trip.id}`}
        title="View Passenger Bookings"
        aria-label={`Open bookings for ${trip.source} to ${trip.destination}`}
        className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-all group"
      >
        <Users className="h-4 w-4 group-hover:scale-110 transition-transform" />
      </Link>

      <Link
        href={`/admin/tickets?tripId=${trip.id}`}
        title="View Issued Passenger Tickets"
        aria-label={`Open tickets for ${trip.source} to ${trip.destination}`}
        className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-all group"
      >
        <Ticket className="h-4 w-4 group-hover:scale-110 transition-transform" />
      </Link>
    </div>
  );
}

function Metric({ label, value, icon: Icon, tone = "text-slate-700 dark:text-white" }: { label: string; value: number; icon: typeof Route; tone?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
      <Icon className={`h-4 w-4 ${tone}`} />
      <p className={`mt-3 text-2xl font-black ${tone}`}>{value}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const tone = status === "READY" ? "success" : status === "NO_DRIVER" ? "destructive" : status === "PAYMENT_REVIEW" || status === "TICKET_GAP" ? "warning" : "secondary";
  return <Badge variant={tone}>{status.replace("_", " ")}</Badge>;
}
