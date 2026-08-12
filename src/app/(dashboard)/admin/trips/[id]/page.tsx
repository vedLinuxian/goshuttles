import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CalendarDays, Edit3, Ticket, Users, Wallet } from "lucide-react";
import { Badge, Card } from "@/components/ui";
import { TripActionsPanel } from "./trip-actions-panel";
import { RealtimeGpsTracker } from "@/components/tracking/RealtimeGpsTracker";
import { BoardingDeskComponent } from "@/components/trips/BoardingDeskComponent";


export default async function AdminTripOperationsPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login");
  const { id } = await params;
  const trip = await db.trip.findUnique({
    where: { id },
    include: {
      source: true,
      destination: true,
      vehicle: true,
      driver: { select: { id: true, name: true, phone: true, isActive: true, driverProfile: { select: { kycStatus: true, isAvailable: true } } } },
      seats: { orderBy: { seatNumber: "asc" } },
      bookings: { include: { user: { select: { name: true, phone: true } }, seat: true, ticket: true, paymentVerification: true }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!trip) redirect("/admin/trips");

  const activeBookings = trip.bookings.filter((booking) => ["PENDING", "CONFIRMED", "COMPLETED"].includes(booking.status));
  const collected = trip.bookings.filter((booking) => booking.paymentStatus === "COLLECTED").reduce((sum, booking) => sum + Number(booking.totalAmount), 0);
  const gross = trip.bookings.reduce((sum, booking) => sum + Number(booking.totalAmount), 0);
  const ticketGaps = activeBookings.filter((booking) => ["CONFIRMED", "COMPLETED"].includes(booking.status) && !booking.ticket).length;

  const boardingManifest = trip.bookings.map((b) => ({
    ticketId: b.ticket?.id ?? null,
    ticketNumber: b.ticket?.ticketNumber ?? null,
    bookingId: b.id,
    passengerName: b.guestName || b.user?.name || "Guest",
    passengerPhone: b.user?.phone || null,
    seatNumber: b.seat?.seatNumber ?? "N/A",
    paymentMode: b.paymentMode,
    paymentStatus: b.paymentStatus,
    bookingStatus: b.status,
    ticketStatus: b.ticket?.status ?? null,
    usedAt: b.ticket?.usedAt ? new Date(b.ticket.usedAt).toISOString() : null,
  }));


  return (
    <div className="mx-auto max-w-[1400px] space-y-6 pb-12">
      <Link href="/admin/trips" className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Back to trip board
      </Link>
      
      <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={trip.status} />
            <Badge variant={trip.manifestLocked ? "warning" : "outline"}>
              {trip.manifestLocked ? "Manifest locked" : "Manifest open"}
            </Badge>
          </div>
          <h1 className="mt-3 text-3xl font-black text-slate-900 dark:text-white">
            {trip.source.name} → {trip.destination.name}
          </h1>
          <p className="mt-2 flex items-center gap-2 text-sm text-slate-500">
            <CalendarDays className="h-4 w-4 text-amber-500" /> {trip.startTime.toLocaleString("en-IN", { dateStyle: "full", timeStyle: "short" })}
          </p>
        </div>
        <Link href={`/admin/trips/${id}/edit`} className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-xs font-black text-slate-950 glow-amber">
          <Edit3 className="h-4 w-4" /> Controlled edit
        </Link>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Metric label="Booked seats" value={`${trip.seats.filter((seat) => seat.status === "BOOKED").length}/${trip.seats.length}`} icon={Users} />
        <Metric label="Open seats" value={trip.seats.filter((seat) => seat.status === "AVAILABLE").length} icon={Users} />
        <Metric label="Active bookings" value={activeBookings.length} icon={Ticket} />
        <Metric label="Collected" value={`₹${collected.toLocaleString("en-IN")}`} icon={Wallet} />
        <Metric label="Gross value" value={`₹${gross.toLocaleString("en-IN")}`} icon={Wallet} />
      </div>

      <TripActionsPanel tripId={trip.id} status={trip.status} />

      {/* Real-time Telemetry Map Tracker */}
      <RealtimeGpsTracker
        tripId={trip.id}
        sourceName={trip.source.name}
        destName={trip.destination.name}
        initialLat={trip.currentLat ? Number(trip.currentLat) : null}
        initialLong={trip.currentLong ? Number(trip.currentLong) : null}
        lastLocationUpdate={trip.lastLocationUpdate?.toISOString() ?? null}
        status={trip.status}
        isDriver={false}
        driverName={trip.driver?.name}
        vehicleModel={trip.vehicle.modelName}
        regNumber={trip.vehicle.regNumber}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <Card variant="glass" className="space-y-4 p-5">
          <h2 className="font-bold text-slate-900 dark:text-white">Dispatch readiness</h2>
          <Info label="Driver" value={`${trip.driver?.name || "Unassigned"}${trip.driver?.phone ? ` · ${trip.driver.phone}` : ""}`} />
          <Info label="Driver state" value={trip.driver ? `${trip.driver.isActive ? "Active" : "Inactive"} · ${trip.driver.driverProfile?.kycStatus || "KYC pending"} · ${trip.driver.driverProfile?.isAvailable ? "Available" : "Unavailable"}` : "Assign a driver before departure"} />
          <Info label="Vehicle" value={`${trip.vehicle.regNumber} · ${trip.vehicle.modelName} · ${trip.vehicle.capacity} seats`} />
          <Info label="Payment risk" value={`${trip.bookings.filter((booking) => booking.paymentMode === "CASH" && booking.paymentStatus === "PENDING").length} cash pending · ${trip.bookings.filter((booking) => booking.paymentVerification?.status === "PENDING").length} proofs pending`} />
          <Info label="Ticket readiness" value={`${activeBookings.filter((booking) => booking.ticket).length}/${activeBookings.length} tickets issued · ${ticketGaps} gaps`} />
        </Card>

        <Card variant="glass" className="overflow-hidden p-0">
          <div className="border-b border-slate-200 p-5 dark:border-slate-800">
            <h2 className="font-bold text-slate-900 dark:text-white">Seat and manifest operations</h2>
          </div>
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {trip.seats.map((seat) => {
              const booking = trip.bookings.find((item) => item.seatId === seat.id);
              return (
                <div key={seat.id} className="flex items-center justify-between gap-4 p-4">
                  <div>
                    <p className="text-xs font-black text-slate-900 dark:text-white">Seat {seat.seatNumber}</p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      {booking?.guestName || booking?.user?.name || "Available"}
                      {booking?.user?.phone ? ` · ${booking.user.phone}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <StatusBadge status={seat.status} />
                    <p className="mt-1 text-[10px] text-slate-500">
                      {booking ? `${booking.status} · ${booking.paymentStatus}` : `₹${Number(seat.price).toLocaleString("en-IN")}`}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Interactive Boarding & Verification Control Desk */}
      <BoardingDeskComponent tripId={trip.id} manifest={boardingManifest} />

    </div>
  );
}

function Metric({ label, value, icon: Icon }: { label: string; value: string | number; icon: typeof Users }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
      <Icon className="h-4 w-4 text-amber-500" />
      <p className="mt-2 text-xl font-black text-slate-900 dark:text-white">{value}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-3 text-xs last:border-0 dark:border-slate-800">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-bold text-slate-900 dark:text-white">{value}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variant = status === "COMPLETED" || status === "BOOKED" || status === "CONFIRMED" ? "success" : status === "CANCELLED" || status === "NO_SHOW" ? "destructive" : status === "IN_PROGRESS" ? "info" : "warning";
  return <Badge variant={variant}>{status.replace("_", " ")}</Badge>;
}
