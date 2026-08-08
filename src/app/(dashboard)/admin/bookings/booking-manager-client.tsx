"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  ExternalLink,
  Search,
  Ticket,
  XCircle,
  CheckCircle2,
  AlertTriangle,
  UserX,
  RefreshCw,
  Phone,
  User,
  CreditCard,
  FilterX,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  Select,
  Input,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  SortableHeader,
} from "@/components/ui";
import SearchBar from "@/components/ui/search-bar";
import PaginationControls from "@/components/ui/pagination";
import { cancelAdminBooking, confirmAdminCashPayment, markAdminBookingNoShow } from "./actions";

export type BookingItem = {
  id: string;
  status: string;
  paymentMode: string;
  paymentStatus: string;
  totalAmount: string;
  createdAt: string;
  cancellationReason: string | null;
  passengerName: string;
  passengerPhone: string | null;
  guestRoster?: Array<{ name: string; seatNumber: string }>;
  trip: {
    id: string;
    startTime: string;
    source: string;
    destination: string;
    driverId: string | null;
    driverName: string | null;
  };
  seatNumber: string;
  ticket: { id: string; ticketNumber: string; status: string } | null;
  paymentVerification: { id: string; utrNumber: string | null; status: string } | null;
};

type Props = {
  bookings: BookingItem[];
  drivers: { id: string; name: string | null }[];
  page: number;
  totalPages: number;
  totalCount: number;
  stats: Record<string, number>;
  filters: { status: string; paymentMode: string; driverId: string; tripId: string; date: string; q: string };
};

type ActionModalState =
  | { type: "CONFIRM_CASH"; booking: BookingItem }
  | { type: "CANCEL"; booking: BookingItem }
  | { type: "NO_SHOW"; booking: BookingItem }
  | null;

export function BookingManagerClient({ bookings, drivers, page, totalPages, totalCount, stats, filters }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeModal, setActiveModal] = useState<ActionModalState>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleRunAction = async () => {
    if (!activeModal) return;
    setErrorMessage(null);

    try {
      if (activeModal.type === "CONFIRM_CASH") {
        await confirmAdminCashPayment(activeModal.booking.id);
      } else if (activeModal.type === "CANCEL") {
        await cancelAdminBooking(activeModal.booking.id, cancelReason || "Cancelled by administrator");
      } else if (activeModal.type === "NO_SHOW") {
        await markAdminBookingNoShow(activeModal.booking.id);
      }

      setActiveModal(null);
      setCancelReason("");
      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Operational request failed. Please try again.");
    }
  };

  const hasActiveFilters = Boolean(
    filters.status || filters.paymentMode || filters.driverId || filters.tripId || filters.date || filters.q
  );

  return (
    <div className="mx-auto max-w-[1500px] space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[var(--foreground)] sm:text-3xl">
            Booking Operations &amp; Management
          </h1>
          <p className="mt-1 text-xs text-[var(--muted-foreground)] sm:text-sm">
            Control reservations, cash collections, online verifications, no-shows, and ticket issuances.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/tickets"
            className="inline-flex items-center gap-2 rounded-xl border border-amber-500/40 px-4 py-2.5 text-xs font-bold text-amber-600 transition-colors hover:bg-amber-500/10 dark:text-amber-400"
          >
            <Ticket className="h-4 w-4" /> Ticket Operations
          </Link>
        </div>
      </div>

      {/* Operations Metric Badges Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <MetricCard label="Cash pending" value={stats.pendingCash} tone="text-amber-500" borderTone="border-amber-500/20" />
        <MetricCard label="Online pending" value={stats.pendingOnline} tone="text-indigo-500" borderTone="border-indigo-500/20" />
        <MetricCard label="Confirmed" value={stats.confirmed} tone="text-emerald-500" borderTone="border-emerald-500/20" />
        <MetricCard label="Completed" value={stats.completed} tone="text-sky-500" borderTone="border-sky-500/20" />
        <MetricCard label="Cancelled" value={stats.cancelled} tone="text-rose-500" borderTone="border-rose-500/20" />
        <MetricCard label="No-show" value={stats.noShow} tone="text-slate-500" borderTone="border-slate-500/20" />
      </div>

      {/* Responsive Filter Panel */}
      <div className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <SearchBar placeholder="Search passenger name, phone, booking ID, or ticket..." className="flex-1" />
          {hasActiveFilters && (
            <Link
              href="/admin/bookings"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-rose-500 hover:underline shrink-0"
            >
              <FilterX className="h-3.5 w-3.5" /> Clear filters
            </Link>
          )}
        </div>

        <form method="get" className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
          <Select name="status" defaultValue={filters.status} className="w-full">
            <option value="">All booking statuses</option>
            <option value="PENDING">Pending</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="NO_SHOW">No-show</option>
          </Select>

          <Select name="paymentMode" defaultValue={filters.paymentMode} className="w-full">
            <option value="">All payment modes</option>
            <option value="CASH">Cash</option>
            <option value="ONLINE">Online</option>
          </Select>

          <Select name="driverId" defaultValue={filters.driverId} className="w-full">
            <option value="">All assigned drivers</option>
            {drivers.map((driver) => (
              <option key={driver.id} value={driver.id}>
                {driver.name || "Unnamed driver"}
              </option>
            ))}
          </Select>

          <input
            name="date"
            type="date"
            defaultValue={filters.date}
            className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--input)] px-3 text-xs text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-amber-500"
          />

          <Button type="submit" size="sm" className="h-11 w-full font-bold">
            <Search className="h-4 w-4" /> Filter Queue
          </Button>
        </form>
      </div>

      {/* Main Content Area */}
      {bookings.length === 0 ? (
        <Card variant="glass" className="p-12 text-center">
          <Ticket className="mx-auto h-12 w-12 text-amber-500/50" />
          <h2 className="mt-3 text-lg font-bold text-[var(--foreground)]">No bookings match the requested criteria</h2>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">Try adjusting your filters or clearing search terms.</p>
        </Card>
      ) : (
        <>
          {/* Desktop Table View (lg & up) */}
          <div className="hidden lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHeader field="passenger" title="Passenger" className="w-[200px]" />
                  <SortableHeader field="startTime" title="Trip / Schedule" className="w-[240px]" />
                  <SortableHeader field="seatNumber" title="Seat & Driver" className="w-[160px]" />
                  <SortableHeader field="totalAmount" title="Payment Detail" className="w-[180px]" />
                  <TableHead className="w-[150px]">Ticket</TableHead>
                  <SortableHeader field="status" title="Status" className="w-[120px]" />
                  <TableCell className="text-right text-xs font-bold">Actions</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell>
                      <p className="font-bold text-xs text-[var(--foreground)]">{booking.passengerName}</p>
                      <p className="mt-0.5 font-mono text-[10px] text-[var(--muted-foreground)]">
                        {booking.id.slice(0, 10)}... · {booking.passengerPhone || "No phone"}
                      </p>
                    </TableCell>
                    <TableCell>
                      <p className="text-xs font-semibold text-[var(--foreground)]">
                        {booking.trip.source} → {booking.trip.destination}
                      </p>
                      <p className="mt-1 flex items-center gap-1 text-[10px] text-[var(--muted-foreground)]">
                        <CalendarDays className="h-3 w-3 text-amber-500" />
                        {new Date(booking.trip.startTime).toLocaleString("en-IN", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </p>
                    </TableCell>
                    <TableCell>
                      <p className="text-xs font-bold text-amber-600 dark:text-amber-400">
                        Seat {booking.seatNumber}
                      </p>
                      <p className="mt-0.5 text-[10px] text-[var(--muted-foreground)]">{booking.trip.driverName}</p>
                    </TableCell>
                    <TableCell>
                      <p className="text-xs font-bold text-[var(--foreground)]">
                        {booking.paymentMode} · ₹{Number(booking.totalAmount).toLocaleString("en-IN")}
                      </p>
                      <p className="mt-0.5 text-[10px] text-[var(--muted-foreground)]">
                        {booking.paymentStatus}
                        {booking.paymentVerification?.utrNumber ? ` · UTR: ${booking.paymentVerification.utrNumber}` : ""}
                      </p>
                    </TableCell>
                    <TableCell>
                      {booking.ticket ? (
                        <Link
                          href={`/passenger/ticket/${booking.ticket.id}`}
                          className="font-mono text-[10px] font-bold text-amber-600 hover:underline dark:text-amber-400"
                        >
                          {booking.ticket.ticketNumber}
                          <span className="mt-0.5 block font-sans text-[var(--muted-foreground)]">
                            {booking.ticket.status}
                          </span>
                        </Link>
                      ) : (
                        <span className="text-[10px] text-[var(--muted-foreground)]">Not issued</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={booking.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <BookingActions booking={booking} onOpenModal={setActiveModal} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card List View (< lg) */}
          <div className="grid gap-4 lg:hidden">
            {bookings.map((booking) => (
              <BookingCard key={booking.id} booking={booking} onOpenModal={setActiveModal} />
            ))}
          </div>
        </>
      )}

      {/* Pagination Controls */}
      <PaginationControls page={page} totalPages={totalPages} total={totalCount} pageSize={20} />

      {/* Shadcn Native Action Modals */}
      <Dialog open={Boolean(activeModal)} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="sm:max-w-md">
          {activeModal?.type === "CONFIRM_CASH" && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-5 w-5" /> Confirm Cash Payment
                </DialogTitle>
                <DialogDescription>
                  Confirm cash collection of ₹{Number(activeModal.booking.totalAmount).toLocaleString("en-IN")} from passenger{" "}
                  <strong>{activeModal.booking.passengerName}</strong>. This will confirm the booking and generate the official ticket.
                </DialogDescription>
              </DialogHeader>
              {errorMessage && (
                <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-500">
                  {errorMessage}
                </div>
              )}
              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={() => setActiveModal(null)} disabled={isPending}>
                  Cancel
                </Button>
                <Button className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold" onClick={handleRunAction} disabled={isPending}>
                  {isPending ? "Processing..." : "Confirm Payment & Issue Ticket"}
                </Button>
              </DialogFooter>
            </>
          )}

          {activeModal?.type === "CANCEL" && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                  <XCircle className="h-5 w-5" /> Cancel Reservation
                </DialogTitle>
                <DialogDescription>
                  Are you sure you want to cancel booking <strong>#{activeModal.booking.id.slice(0, 8)}</strong> for{" "}
                  <strong>{activeModal.booking.passengerName}</strong>? This seat will be freed immediately.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2 py-2">
                <label className="text-xs font-bold text-[var(--foreground)]">Cancellation Reason (optional)</label>
                <Input
                  placeholder="e.g. Passenger requested cancellation / Invalid payment"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                />
              </div>
              {errorMessage && (
                <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-500">
                  {errorMessage}
                </div>
              )}
              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={() => setActiveModal(null)} disabled={isPending}>
                  Back
                </Button>
                <Button variant="destructive" className="font-bold" onClick={handleRunAction} disabled={isPending}>
                  {isPending ? "Cancelling..." : "Cancel Booking"}
                </Button>
              </DialogFooter>
            </>
          )}

          {activeModal?.type === "NO_SHOW" && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <UserX className="h-5 w-5 text-amber-500" /> Mark Booking as No-Show
                </DialogTitle>
                <DialogDescription>
                  Mark passenger <strong>{activeModal.booking.passengerName}</strong> as a no-show for trip{" "}
                  <strong>{activeModal.booking.trip.source} → {activeModal.booking.trip.destination}</strong>.
                </DialogDescription>
              </DialogHeader>
              {errorMessage && (
                <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-500">
                  {errorMessage}
                </div>
              )}
              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={() => setActiveModal(null)} disabled={isPending}>
                  Back
                </Button>
                <Button variant="secondary" className="font-bold" onClick={handleRunAction} disabled={isPending}>
                  {isPending ? "Updating..." : "Confirm No-Show"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MetricCard({
  label,
  value,
  tone,
  borderTone,
}: {
  label: string;
  value: number;
  tone: string;
  borderTone: string;
}) {
  return (
    <div className={`rounded-xl border ${borderTone} bg-[var(--card)] p-3.5 shadow-sm`}>
      <p className={`text-xl font-black ${tone}`}>{value}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">{label}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variant =
    status === "CONFIRMED" || status === "COMPLETED"
      ? "success"
      : status === "CANCELLED"
      ? "destructive"
      : status === "NO_SHOW"
      ? "secondary"
      : "warning";
  return <Badge variant={variant}>{status.replace("_", " ")}</Badge>;
}

function BookingActions({
  booking,
  onOpenModal,
}: {
  booking: BookingItem;
  onOpenModal: (modal: ActionModalState) => void;
}) {
  const isPendingCash = booking.status === "PENDING" && booking.paymentMode === "CASH";
  const canModify = ["PENDING", "CONFIRMED"].includes(booking.status);

  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      {isPendingCash && (
        <Button
          size="sm"
          className="h-8 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs gap-1"
          onClick={() => onOpenModal({ type: "CONFIRM_CASH", booking })}
        >
          <CheckCircle2 className="h-3.5 w-3.5" /> Cash Confirm
        </Button>
      )}

      {canModify && (
        <Button
          size="sm"
          variant="destructive"
          className="h-8 text-xs font-bold gap-1"
          onClick={() => onOpenModal({ type: "CANCEL", booking })}
        >
          <XCircle className="h-3.5 w-3.5" /> Cancel
        </Button>
      )}

      {canModify && (
        <Button
          size="sm"
          variant="secondary"
          className="h-8 text-xs font-bold"
          onClick={() => onOpenModal({ type: "NO_SHOW", booking })}
        >
          No-show
        </Button>
      )}

      <Link
        href={`/admin/tickets?q=${booking.ticket?.ticketNumber || booking.id}`}
        className="inline-flex h-8 items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--muted)]/50 px-2.5 text-xs font-bold text-[var(--foreground)] hover:text-amber-500 transition-colors"
      >
        <ExternalLink className="h-3.5 w-3.5" /> Details
      </Link>
    </div>
  );
}

function BookingCard({
  booking,
  onOpenModal,
}: {
  booking: BookingItem;
  onOpenModal: (modal: ActionModalState) => void;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm space-y-3">
      <div className="flex items-start justify-between gap-2 border-b border-[var(--border)] pb-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-black text-[var(--foreground)]">{booking.passengerName}</p>
            <StatusBadge status={booking.status} />
          </div>
          <p className="mt-0.5 font-mono text-[10px] text-[var(--muted-foreground)]">
            {booking.id.slice(0, 12)} · {booking.passengerPhone || "No phone"}
          </p>
        </div>
        <span className="shrink-0 rounded-lg bg-amber-500/10 px-2.5 py-1 text-xs font-black text-amber-600 dark:text-amber-400 border border-amber-500/20">
          Seat {booking.seatNumber}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <p className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase">Route &amp; Time</p>
          <p className="font-semibold text-[var(--foreground)] mt-0.5">
            {booking.trip.source} → {booking.trip.destination}
          </p>
          <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5">
            {new Date(booking.trip.startTime).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase">Payment &amp; Driver</p>
          <p className="font-bold text-[var(--foreground)] mt-0.5">
            {booking.paymentMode} · ₹{Number(booking.totalAmount).toLocaleString("en-IN")}
          </p>
          <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5">
            Driver: {booking.trip.driverName}
          </p>
        </div>
      </div>

      {booking.ticket && (
        <div className="rounded-xl bg-[var(--muted)]/40 p-2.5 text-xs flex items-center justify-between">
          <span className="text-[10px] font-bold text-[var(--muted-foreground)]">Issued Ticket:</span>
          <Link
            href={`/passenger/ticket/${booking.ticket.id}`}
            className="font-mono text-xs font-extrabold text-amber-600 hover:underline dark:text-amber-400"
          >
            {booking.ticket.ticketNumber} ({booking.ticket.status})
          </Link>
        </div>
      )}

      <div className="pt-1 flex items-center justify-end gap-2 border-t border-[var(--border)]">
        <BookingActions booking={booking} onOpenModal={onOpenModal} />
      </div>
    </div>
  );
}
