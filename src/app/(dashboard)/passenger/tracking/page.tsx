import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import {
  MapPin,
  Navigation,
  Clock,
  Ticket,
  Route,
  IndianRupee,
  Wifi,
  WifiOff,
  User,
  ArrowRight,
} from "lucide-react";
import { Card, Badge, Button } from "@/components/ui";
import { RealtimeGpsTracker } from "@/components/tracking/RealtimeGpsTracker";

export default async function LiveTrackingPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = session.user.id!;
  const now = new Date();

  // Active trips (IN_PROGRESS)
  const activeBookings = await db.booking.findMany({
    where: {
      userId,
      status: "CONFIRMED",
      trip: {
        status: "IN_PROGRESS",
      },
    },
    include: {
      trip: {
        include: {
          source: true,
          destination: true,
          vehicle: true,
          driver: { select: { id: true, name: true, phone: true } },
        },
      },
      seat: true,
      ticket: true,
    },
    orderBy: { trip: { startTime: "desc" } },
  });

  // Upcoming SCHEDULED trips
  const upcomingBookings = await db.booking.findMany({
    where: {
      userId,
      status: "CONFIRMED",
      trip: {
        status: "SCHEDULED",
        startTime: { gt: now },
      },
    },
    include: {
      trip: {
        include: {
          source: true,
          destination: true,
          vehicle: true,
          driver: { select: { id: true, name: true, phone: true } },
        },
      },
      seat: true,
      ticket: true,
    },
    orderBy: { trip: { startTime: "asc" } },
  });

  const hasActiveTrips = activeBookings.length > 0;
  const hasUpcoming = upcomingBookings.length > 0;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <Navigation className="h-6 w-6 text-amber-400" />
          Live Ride Tracking &amp; GPS Telemetry
        </h1>
        <p className="text-sm text-slate-400">
          Track active shuttle trips in real time and view upcoming departures.
        </p>
      </div>

      {!hasActiveTrips && !hasUpcoming ? (
        <Card variant="glass" className="p-12 text-center space-y-4 border-slate-800">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
            <Navigation className="h-7 w-7 text-amber-400" />
          </div>
          <div>
            <p className="text-lg font-extrabold text-white">No active or upcoming rides</p>
            <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
              You don&apos;t have any active or upcoming shuttle reservations right now. Book a trip to see live tracking here.
            </p>
          </div>
          <Link href="/passenger/discover">
            <Button className="bg-amber-500 text-slate-950 font-extrabold text-xs gap-2 shadow-md glow-amber">
              Find Available Shuttles <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Active Trips Section */}
          {hasActiveTrips && (
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                </span>
                <h2 className="text-base font-extrabold text-white">
                  Live Shuttle En-Route ({activeBookings.length})
                </h2>
              </div>

              <div className="space-y-4">
                {activeBookings.map((b) => (
                  <ActiveTripCard key={b.id} booking={b} now={now} />
                ))}
              </div>
            </section>
          )}

          {/* Upcoming Trips Section */}
          {hasUpcoming && (
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-400 animate-pulse" />
                <h2 className="text-base font-extrabold text-white">
                  Upcoming Departures ({upcomingBookings.length})
                </h2>
              </div>

              <div className="space-y-4">
                {upcomingBookings.map((b) => (
                  <UpcomingTripCard key={b.id} booking={b} now={now} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

type BookingWithTrip = Awaited<
  ReturnType<
    typeof db.booking.findMany<{
      where: { userId: string };
      include: {
        trip: {
          include: {
            source: true;
            destination: true;
            vehicle: true;
            driver: { select: { id: true; name: true; phone: true } };
          };
        };
        seat: true;
        ticket: true;
      };
    }>
  >
>[number];

function ActiveTripCard({ booking: b, now }: { booking: BookingWithTrip; now: Date }) {
  const trip = b.trip;

  return (
    <Card variant="glass" className="overflow-hidden border-slate-800 p-0 shadow-2xl space-y-0">
      {/* Real-time Map Tracker */}
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
        vehicleModel={trip.vehicle?.modelName}
        regNumber={trip.vehicle?.regNumber}
      />

      {/* Details */}
      <div className="p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-white text-lg">
                {trip.source.name} → {trip.destination.name}
              </h3>
              <Badge variant="info" className="text-[10px]">
                IN PROGRESS
              </Badge>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Departed{" "}
              {trip.actualStartTime
                ? new Date(trip.actualStartTime).toLocaleTimeString("en-IN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : new Date(trip.startTime).toLocaleTimeString("en-IN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {b.ticket && (
              <Link href={`/passenger/ticket/${b.ticket.id}`}>
                <Button className="bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-extrabold text-xs gap-1.5 shadow-md glow-amber">
                  <Ticket className="h-3.5 w-3.5" />
                  Boarding Pass
                </Button>
              </Link>
            )}
            <Link href={`/passenger/booking/${b.id}`}>
              <Button variant="secondary" className="border border-slate-700 text-slate-200 text-xs font-bold gap-1">
                Booking Details
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-300 bg-slate-900/80 rounded-2xl p-3.5 border border-slate-800">
          <span className="flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 text-amber-400" />
            Seat <span className="font-extrabold text-amber-400">{b.seat?.seatNumber || "-"}</span>
          </span>
          <span className="text-slate-700">|</span>
          <span className="flex items-center gap-1.5">
            <Route className="h-3.5 w-3.5 text-amber-400" />
            {trip.vehicle?.modelName || "SUV"} • {trip.vehicle?.regNumber || ""}
          </span>
          <span className="text-slate-700">|</span>
          <span className="flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 text-amber-400" />
            Driver: {trip.driver?.name || "Assigned Driver"}
          </span>
        </div>
      </div>
    </Card>
  );
}

function UpcomingTripCard({ booking: b, now }: { booking: BookingWithTrip; now: Date }) {
  const trip = b.trip;
  const departureTime = new Date(trip.startTime);
  const timeUntilDeparture = departureTime.getTime() - now.getTime();
  const minutesUntil = Math.floor(timeUntilDeparture / 60000);
  const hoursUntil = Math.floor(minutesUntil / 60);
  const remainingMinutes = minutesUntil % 60;

  const timeLabel =
    hoursUntil > 0
      ? `${hoursUntil}h ${remainingMinutes}m`
      : `${minutesUntil}m`;

  return (
    <Card variant="glass" className="p-5 border-slate-800 hover:border-amber-500/40 transition-all card-hover">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-4 min-w-0">
          <div className="hidden sm:flex w-10 h-10 shrink-0 rounded-2xl bg-amber-500/10 border border-amber-500/30 items-center justify-center">
            <Clock className="h-5 w-5 text-amber-400" />
          </div>

          <div className="space-y-1.5 min-w-0">
            <h3 className="font-extrabold text-white text-base">
              {trip.source.name} → {trip.destination.name}
            </h3>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-amber-400" />
                {departureTime.toLocaleString("en-IN", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </span>
              <span className="flex items-center gap-1">
                <User className="h-3.5 w-3.5 text-slate-400" />
                Seat <span className="font-bold text-amber-400">{b.seat?.seatNumber || "-"}</span>
              </span>
              <span className="flex items-center gap-1">
                <IndianRupee className="h-3.5 w-3.5 text-slate-400" />
                <span className="font-bold text-emerald-400">
                  ₹{Number(b.totalAmount).toLocaleString("en-IN")}
                </span>
              </span>
            </div>
            <p className="text-[10px] text-slate-400">
              Driver: {trip.driver?.name || "TBD"} • {trip.vehicle?.modelName || "SUV"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <p className="text-[10px] font-bold text-slate-400">Departs in</p>
            <p className="text-lg font-extrabold text-amber-400">{timeLabel}</p>
          </div>
          <div className="w-px h-10 bg-slate-800" />
          {b.ticket ? (
            <Link href={`/passenger/ticket/${b.ticket.id}`}>
              <Button className="bg-amber-500 text-slate-950 font-extrabold text-xs gap-1.5 shadow-md glow-amber">
                <Ticket className="h-3.5 w-3.5" /> Boarding Pass
              </Button>
            </Link>
          ) : (
            <Link href={`/passenger/booking/${b.id}`}>
              <Button variant="secondary" className="border border-slate-700 text-slate-200 text-xs font-bold gap-1">
                View Booking <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          )}
        </div>
      </div>
    </Card>
  );
}
