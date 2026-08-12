import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { confirmPassengerPaymentAction, handleStartTripAction, handleCompleteTripAction } from "./actions";
import Link from "next/link";
import { Play, CheckSquare, Plus, Ticket, Route, Wallet, CreditCard, Star, ShieldCheck, Clock, Users } from "lucide-react";
import { BoardingDeskComponent } from "@/components/trips/BoardingDeskComponent";


export const dynamic = "force-dynamic";

export default async function DriverDashboardPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "DRIVER") redirect("/login");
  const driverId = session.user.id!;
  
  // Fix date mutation bug: compute start of today without mutating current time
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const tripInclude = {
    source: true,
    destination: true,
    vehicle: true,
    seats: { orderBy: { seatNumber: "asc" } },
    bookings: {
      where: { status: { in: ["PENDING", "CONFIRMED", "COMPLETED", "NO_SHOW"] } },
      include: { user: { select: { name: true, phone: true } }, seat: true, ticket: true },
      orderBy: { createdAt: "asc" },
    },
  } satisfies Prisma.TripInclude;


  const [inProgressTrip, nextScheduledTrip, driverProfile, totalTrips] = await Promise.all([
    db.trip.findFirst({
      where: { driverId, status: "IN_PROGRESS" },
      include: tripInclude,
      orderBy: { startTime: "asc" },
    }),
    db.trip.findFirst({
      where: { driverId, status: "SCHEDULED", startTime: { gt: now }, manifestLocked: false, isCancelled: false },
      include: tripInclude,
      orderBy: { startTime: "asc" },
    }),
    db.driverProfile.findUnique({ where: { userId: driverId } }),
    db.trip.count({ where: { driverId, status: "COMPLETED" } }),
  ]);

  const activeTrip = inProgressTrip ?? nextScheduledTrip;

  const bookedSeats = activeTrip?.seats.filter((s) => s.status === "BOOKED").length ?? 0;
  const totalSeats = activeTrip?.seats.length ?? 0;
  const pendingPayments = activeTrip?.bookings.filter((b) => b.paymentStatus === "PENDING") ?? [];

  const boardingManifest = activeTrip?.bookings.map((b) => ({
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
  })) ?? [];


  return (
    <div className="max-w-[1200px] mx-auto space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-extrabold text-white tracking-tight">Driver Control Center</h1>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                driverProfile?.kycStatus === "APPROVED"
                  ? "bg-emerald-950/60 border-emerald-800 text-emerald-400"
                  : "bg-amber-950/60 border-amber-800 text-amber-400"
              }`}
            >
              {driverProfile?.kycStatus === "APPROVED" ? "✓ KYC Approved" : "⚠ KYC Pending"}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Welcome back, {session.user.name}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/driver/trips/new"
            className="px-4 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-200 text-xs font-semibold rounded-xl transition-colors flex items-center gap-2"
          >
            <Plus className="h-4 w-4" /> Schedule Trip
          </Link>
          <Link
            href="/driver/offline-book"
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold rounded-xl transition-colors flex items-center gap-2 shadow-lg shadow-amber-500/10"
          >
            <Ticket className="h-4 w-4" /> Offline Booking
          </Link>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Completed Trips</p>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <Route className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-white mt-2">{totalTrips}</p>
          <p className="text-[10px] text-slate-500 mt-1 font-medium">Completed shuttle runs</p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Net Share</p>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-400 mt-2">
            ₹{Number(driverProfile?.totalEarnings ?? 0).toFixed(2)}
          </p>
          <p className="text-[10px] text-slate-500 mt-1 font-medium">Your 95% share after platform fee</p>
        </div>

        <div className={`bg-slate-900/60 border rounded-2xl p-5 shadow-lg ${Number(driverProfile?.walletBalance ?? 0) < 0 ? "border-rose-500/30 bg-rose-500/5" : "border-slate-800/80"}`}>
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Commission Settlement</p>
            <div className={`p-2 rounded-xl ${Number(driverProfile?.walletBalance ?? 0) < 0 ? "bg-rose-500/10 text-rose-400" : "bg-emerald-500/10 text-emerald-400"}`}>
              <CreditCard className="h-4 w-4" />
            </div>
          </div>
          <p className={`text-2xl font-black mt-2 ${Number(driverProfile?.walletBalance ?? 0) < 0 ? "text-rose-400" : "text-emerald-400"}`}>
            {Number(driverProfile?.walletBalance ?? 0) < 0 ? "-" : "+"}₹{Math.abs(Number(driverProfile?.walletBalance ?? 0)).toFixed(2)}
          </p>
          {Number(driverProfile?.walletBalance ?? 0) < 0 ? (
            <p className="text-[10px] text-rose-400 mt-1 font-bold">
              ⚠ ₹{Math.abs(Number(driverProfile?.walletBalance ?? 0)).toFixed(2)} Platform Fee Owed (Cash collected)
            </p>
          ) : (
            <p className="text-[10px] text-emerald-400 mt-1 font-medium">Net available payout balance</p>
          )}
        </div>


        <div className="bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Driver Rating</p>
            <div className="p-2 rounded-xl bg-yellow-500/10 text-yellow-400">
              <Star className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-white mt-2">
            {Number(driverProfile?.rating ?? 5).toFixed(1)} <span className="text-sm font-normal text-yellow-400">★</span>
          </p>
          <p className="text-[10px] text-slate-500 mt-1 font-medium">Passenger satisfaction score</p>
        </div>
      </div>


      {!activeTrip ? (
        /* No Active Trip Card */
        <div className="bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl rounded-2xl p-12 text-center shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-4">
            <Route className="h-8 w-8" />
          </div>
          <h2 className="text-lg font-extrabold text-white">No Active Shuttle Scheduled</h2>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            You currently have no scheduled or in-progress trips. Schedule a new trip to start accepting passenger reservations.
          </p>
          <Link
            href="/driver/trips/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl transition-colors mt-6 shadow-lg shadow-amber-500/10"
          >
            <Plus className="h-4 w-4" /> Schedule a Trip Now
          </Link>
        </div>
      ) : (
        /* Active Dispatch Deck & Boarding Desk */
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Main Active Trip Deck */}
          <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl rounded-2xl overflow-hidden shadow-xl flex flex-col">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 border-b border-slate-800/80 gap-4 bg-slate-950/40">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span
                    className={`badge ${
                      activeTrip.status === "IN_PROGRESS"
                        ? "badge-success"
                        : "badge-warning"
                    }`}
                  >
                    {activeTrip.status === "IN_PROGRESS" ? "● Live In-Progress" : "◌ Scheduled Departure"}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">Sequence #{activeTrip.tripSequence}</span>
                </div>
                <h2 className="text-lg font-extrabold text-white">
                  {activeTrip.source.name} → {activeTrip.destination.name}
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  {new Date(activeTrip.startTime).toLocaleString("en-IN", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                  &nbsp;•&nbsp;
                  <span className="font-mono text-slate-300">{activeTrip.vehicle?.regNumber}</span>
                  &nbsp;•&nbsp;
                  <span className="font-bold text-amber-400">{bookedSeats}/{totalSeats} Seats Reserved</span>
                </p>
              </div>

              <div className="flex items-center gap-3">
                {activeTrip.status === "SCHEDULED" && (
                  <form action={handleStartTripAction.bind(null, activeTrip.id)}>
                    <button
                      type="submit"
                      className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-amber-500/10 cursor-pointer"
                    >
                      <Play className="h-4 w-4" /> Start Departure
                    </button>
                  </form>
                )}
                {activeTrip.status === "IN_PROGRESS" && (
                  <form action={handleCompleteTripAction.bind(null, activeTrip.id)}>
                    <button
                      type="submit"
                      className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/10 cursor-pointer"
                    >
                      <CheckSquare className="h-4 w-4" /> Complete Trip
                    </button>
                  </form>
                )}
              </div>
            </div>

            {/* Live Interactive Seat Map */}
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Shuttle Cabin Manifest Grid</h3>
                <span className="text-[11px] text-slate-500">6-Seater Layout</span>
              </div>

              <div className="space-y-4 max-w-sm mx-auto bg-slate-950/60 p-6 rounded-2xl border border-slate-800/80">
                {(["FRONT", "MIDDLE", "BACK"] as const).map((type) => {
                  const typeLabel = { FRONT: "Front Cockpit", MIDDLE: "Middle Cabin", BACK: "Rear Cabin" }[type];
                  const typeSeats = activeTrip.seats.filter((s) => s.seatType === type);
                  return (
                    <div key={type}>
                      <p className="text-[10px] text-center text-slate-500 font-semibold uppercase tracking-widest mb-2">{typeLabel}</p>
                      <div className="flex justify-center gap-3">
                        {typeSeats.map((s) => {
                          const booking = activeTrip.bookings.find((b) => b.seatId === s.id);
                          const isPaid = s.status === "BOOKED" && booking?.paymentStatus === "COLLECTED";
                          const isPendingCash = s.status === "BOOKED" && booking?.paymentStatus === "PENDING";
                          const isLocked = s.status === "LOCKED";

                          let seatStyles = "bg-slate-900 border-slate-800 text-slate-500";
                          if (isPaid) seatStyles = "bg-emerald-950/80 border-emerald-700/80 text-emerald-400 shadow-md shadow-emerald-950/40";
                          else if (isPendingCash) seatStyles = "bg-amber-950/80 border-amber-700/80 text-amber-400 shadow-md shadow-amber-950/40";
                          else if (isLocked) seatStyles = "bg-slate-800/80 border-slate-700 text-slate-400";

                          return (
                            <div
                              key={s.id}
                              title={`Seat ${s.seatNumber}: ${booking?.guestName || booking?.user?.name || s.status}`}
                              className={`w-16 h-16 rounded-xl flex flex-col items-center justify-center text-[10px] font-semibold border transition-all ${seatStyles}`}
                            >
                              <span className="text-xs font-mono font-extrabold">{s.seatNumber}</span>
                              <span className="truncate max-w-[56px] text-center leading-tight mt-0.5 font-medium">
                                {booking?.guestName?.split(" ")[0] || booking?.user?.name?.split(" ")[0] || s.status.toLowerCase()}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex justify-center gap-6 mt-5 text-[11px] text-slate-400 font-medium">
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-slate-900 border border-slate-800" /> Available
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-amber-950 border border-amber-700" /> Cash Pending
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-emerald-950 border border-emerald-700" /> Confirmed / Paid
                </span>
              </div>
            </div>
          </div>

          {/* Right Action Panel */}
          <div className="space-y-6">
            {/* Cash Collections Needed */}
            <div className="bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl rounded-2xl overflow-hidden shadow-xl">
              <div className="px-5 py-4 border-b border-slate-800/80 bg-slate-950/40 flex items-center justify-between">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Cash Collection Desk</h3>
                <span className="text-xs font-bold text-amber-400">{pendingPayments.length} Pending</span>
              </div>
              <div className="divide-y divide-slate-800/40">
                {pendingPayments.length === 0 ? (
                  <p className="text-center text-slate-500 py-6 text-xs">All passenger payments collected</p>
                ) : (
                  pendingPayments.map((b) => (
                    <div key={b.id} className="flex items-center justify-between p-4 gap-3 hover:bg-slate-800/20 transition-colors">
                      <div>
                        <p className="text-xs font-semibold text-white">{b.guestName || b.user?.name || "Passenger"}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Seat {b.seat?.seatNumber} · <span className="font-bold text-white">₹{Number(b.totalAmount)}</span>
                        </p>
                      </div>
                      <form action={confirmPassengerPaymentAction.bind(null, b.id)}>
                        <button
                          type="submit"
                          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-[11px] rounded-lg transition-colors cursor-pointer"
                        >
                          Collect Cash
                        </button>
                      </form>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Passenger Manifest */}
            <div className="bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl rounded-2xl overflow-hidden shadow-xl">
              <div className="px-5 py-4 border-b border-slate-800/80 bg-slate-950/40">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Passenger Manifest ({activeTrip.bookings.length})</h3>
              </div>
              <div className="divide-y divide-slate-800/40 max-h-[300px] overflow-y-auto">
                {activeTrip.bookings.length === 0 ? (
                  <p className="text-center text-slate-500 py-6 text-xs">No passengers booked yet</p>
                ) : (
                  activeTrip.bookings.map((b) => (
                    <div key={b.id} className="flex items-center justify-between p-3.5 hover:bg-slate-800/20 transition-colors">
                      <div>
                        <p className="text-xs font-medium text-slate-200">{b.guestName || b.user?.name || "Passenger"}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">Seat {b.seat?.seatNumber} • {b.paymentMode}</p>
                      </div>
                      <span className={`badge ${b.paymentStatus === "COLLECTED" ? "badge-success" : "badge-warning"}`}>
                        {b.paymentStatus === "COLLECTED" ? "Paid" : "Pending"}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Dedicated Boarding Control & Verification Desk */}
        <BoardingDeskComponent tripId={activeTrip.id} manifest={boardingManifest} />
      </div>
      )}
    </div>
  );
}


