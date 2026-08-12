import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MapPin, Calendar, Car, Users, Route } from "lucide-react";
import { Card, Badge } from "@/components/ui";
import { RealtimeGpsTracker } from "@/components/tracking/RealtimeGpsTracker";
import { BoardingDeskComponent } from "@/components/trips/BoardingDeskComponent";
import { DriverTripControls } from "./driver-trip-controls";
import { formatIST } from "@/lib/date-utils";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: "Scheduled",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled / Expired",
  PENDING_APPROVAL: "Pending Approval",
  REJECTED: "Declined",
};

export default async function DriverTripDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id: tripId } = await params;

  const trip = await db.trip.findUnique({
    where: { id: tripId },
    include: {
      source: true,
      destination: true,
      vehicle: true,
      driver: { select: { id: true, name: true, phone: true } },
      seats: { orderBy: { seatNumber: "asc" } },
      bookings: {
        include: {
          user: { select: { id: true, name: true, phone: true } },
          seat: true,
          ticket: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!trip) {
    redirect("/driver/trips");
  }

  const isAuthorized =
    session.user.role === "ADMIN" ||
    session.user.isImpersonating ||
    (session.user.role === "DRIVER" && (trip.driverId === session.user.id || !trip.driverId));

  if (!isAuthorized) {
    redirect("/driver/trips");
  }

  const totalSeats = trip.seats.length;
  const bookedSeats = trip.seats.filter((s) => s.status === "BOOKED").length;
  const availableSeats = trip.seats.filter((s) => s.status === "AVAILABLE").length;
  const lockedSeats = trip.seats.filter((s) => s.status === "LOCKED").length;

  const boardingManifest = trip.bookings.map((b) => ({
    ticketId: b.ticket?.id ?? null,
    ticketNumber: b.ticket?.ticketNumber ?? null,
    bookingId: b.id,
    passengerName: b.guestName || b.user?.name || "Passenger",
    passengerPhone: b.user?.phone || null,
    seatNumber: b.seat?.seatNumber ?? "N/A",
    paymentMode: b.paymentMode,
    paymentStatus: b.paymentStatus,
    bookingStatus: b.status,
    ticketStatus: b.ticket?.status ?? null,
    usedAt: b.ticket?.usedAt ? new Date(b.ticket.usedAt).toISOString() : null,
  }));

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <Link
        href="/driver/trips"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to My Trips
      </Link>

      {/* Header card */}
      <Card variant="glass" className="p-6 space-y-4 border-slate-800 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 font-bold">
                #{trip.tripSequence}
              </span>
              <Badge
                variant={
                  trip.status === "COMPLETED"
                    ? "success"
                    : trip.status === "IN_PROGRESS"
                    ? "info"
                    : trip.status === "CANCELLED"
                    ? "destructive"
                    : "warning"
                }
              >
                {STATUS_LABELS[trip.status] ?? trip.status}
              </Badge>
            </div>

            <h1 className="text-2xl font-extrabold text-white flex items-center gap-2 mt-1">
              <MapPin className="h-5 w-5 text-amber-400 shrink-0" />
              {trip.source.name} → {trip.destination.name}
            </h1>

            <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-slate-300">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-amber-400" />
                {formatIST(trip.startTime, "datetime")}
              </span>
              <span className="flex items-center gap-1.5">
                <Car className="h-4 w-4 text-amber-400" />
                {trip.vehicle.regNumber} ({trip.vehicle.modelName})
              </span>
              {trip.driver && (
                <span className="flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-amber-400" />
                  {trip.driver.name ?? "Assigned Driver"}
                </span>
              )}
            </div>
          </div>

          <DriverTripControls
            tripId={trip.id}
            status={trip.status}
            sequence={trip.tripSequence}
            sourceName={trip.source.name}
            destName={trip.destination.name}
          />
        </div>

        {trip.cancellationReason && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold">
            Trip Cancellation Note: {trip.cancellationReason}
          </div>
        )}
      </Card>

      {/* Real-time GPS Tracker */}
      <RealtimeGpsTracker
        tripId={trip.id}
        sourceName={trip.source.name}
        destName={trip.destination.name}
        initialLat={trip.currentLat ? Number(trip.currentLat) : null}
        initialLong={trip.currentLong ? Number(trip.currentLong) : null}

        lastLocationUpdate={trip.lastLocationUpdate ? trip.lastLocationUpdate.toISOString() : null}
        status={trip.status}
        isDriver={true}
        driverName={trip.driver?.name}
        vehicleModel={trip.vehicle.modelName}
        regNumber={trip.vehicle.regNumber}
      />

      {/* Seat Grid Map */}
      <Card variant="glass" className="p-6 space-y-4 border-slate-800 shadow-2xl">
        <h2 className="text-lg font-extrabold text-white">Shuttle Seat Manifest Grid</h2>
        <p className="text-xs text-slate-400">
          {bookedSeats}/{totalSeats} booked · {availableSeats} available
          {lockedSeats > 0 ? ` · ${lockedSeats} locked` : ""}
        </p>

        <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden mb-6 border border-slate-800">
          <div
            className={`h-full rounded-full transition-all ${
              bookedSeats === totalSeats
                ? "bg-emerald-500"
                : bookedSeats > 0
                ? "bg-amber-400"
                : "bg-slate-700"
            }`}
            style={{
              width: `${totalSeats > 0 ? Math.round((bookedSeats / totalSeats) * 100) : 0}%`,
            }}
          />
        </div>

        <div className="bg-slate-950/90 rounded-3xl p-6 max-w-sm mx-auto border border-slate-800/80">
          <div className="w-full bg-slate-900 rounded-2xl py-2 px-3 mb-6 text-center text-xs text-amber-400 font-extrabold border border-slate-800">
            DRIVER CABIN &amp; FRONT WINDSHIELD
          </div>

          <div className="grid grid-cols-3 gap-3">
            {trip.seats.map((seat) => {
              const isAvailable = seat.status === "AVAILABLE";
              const isLocked = seat.status === "LOCKED";
              const isBooked = seat.status === "BOOKED";

              return (
                <div
                  key={seat.id}
                  className={`
                    h-16 rounded-2xl border flex flex-col items-center justify-center text-xs font-extrabold transition-all shadow-md p-1
                    ${isAvailable ? "bg-slate-900/80 border-slate-800 text-slate-400" : ""}
                    ${isLocked ? "bg-amber-950/90 border-amber-500/50 text-amber-300" : ""}
                    ${isBooked ? "bg-emerald-600/90 border-emerald-400/50 text-white" : ""}
                  `}
                >
                  <span className="font-mono text-sm">{seat.seatNumber}</span>
                  <span className="text-[9px] font-semibold opacity-90">₹{seat.price.toString()}</span>
                  <span className="text-[8px] uppercase tracking-wider">{seat.status}</span>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Interactive Boarding & Passenger Verification Control Desk */}
      <BoardingDeskComponent tripId={trip.id} manifest={boardingManifest} />
    </div>
  );
}
