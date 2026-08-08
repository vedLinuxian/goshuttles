import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import { Search, Ticket, ExternalLink, MapPin, Clock, CheckCircle2, Wallet, ArrowRight, Shield } from "lucide-react";
import { groupBookings } from "@/lib/booking-grouping";

export const dynamic = "force-dynamic";

export default async function PassengerDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = session.user.id!;
  const now = new Date();

  // Compute time-of-day greeting
  const currentHour = now.getHours();
  let timeGreeting = "Good morning";
  if (currentHour >= 12 && currentHour < 17) timeGreeting = "Good afternoon";
  else if (currentHour >= 17) timeGreeting = "Good evening";

  const [totalBookings, completedTrips, totalSpent, upcomingCount, locations, recentBookings, availableTrips] =
    await Promise.all([
      db.booking.count({ where: { userId } }),
      db.booking.count({ where: { userId, status: "COMPLETED" } }),
      db.booking.aggregate({
        _sum: { totalAmount: true },
        where: { userId, status: { in: ["CONFIRMED", "COMPLETED"] }, paymentStatus: "COLLECTED" },
      }),
      db.booking.count({
        where: { userId, status: { in: ["PENDING", "CONFIRMED"] }, trip: { startTime: { gt: now } } },
      }),
      db.location.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
      db.booking.findMany({
        where: { userId },
        include: {
          trip: { include: { source: true, destination: true } },
          seat: { select: { seatNumber: true } },
          ticket: { select: { id: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      db.trip.findMany({
        where: { status: "SCHEDULED", startTime: { gt: now }, manifestLocked: false, isCancelled: false },
        include: {
          source: true,
          destination: true,
          _count: { select: { seats: true } },
          seats: { where: { status: "AVAILABLE" }, select: { price: true } },
        },
        orderBy: { startTime: "asc" },
        take: 8,
      }),
    ]);

  const statusMap: Record<string, { label: string; cls: string }> = {
    CONFIRMED: { label: "Confirmed", cls: "badge-success" },
    COMPLETED: { label: "Completed", cls: "badge-success" },
    PENDING: { label: "Pending", cls: "badge-warning" },
    CANCELLED: { label: "Cancelled", cls: "badge-danger" },
    NO_SHOW: { label: "No Show", cls: "badge-muted" },
  };

  const rawRecentBookings = recentBookings.map((b) => ({
    id: b.id,
    userId: b.userId,
    status: b.status,
    paymentMode: "CASH" as const,
    paymentStatus: "PENDING" as const,
    totalAmount: String(b.totalAmount),
    createdAt: b.createdAt.toISOString(),
    guestName: b.guestName || "Passenger",
    seatNumber: b.seat?.seatNumber || "Unassigned",
    trip: {
      id: b.trip.id,
      startTime: b.trip.startTime.toISOString(),
      source: b.trip.source.name,
      destination: b.trip.destination.name,
    },
    ticket: b.ticket ? { id: b.ticket.id, ticketNumber: "PASS", status: "ISSUED" } : null,
  }));

  const groupedRecentBookings = groupBookings(rawRecentBookings);

  return (
    <div className="max-w-[1200px] mx-auto space-y-6 pb-10">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900/80 via-slate-900/40 to-slate-950/80 border border-slate-800/80 p-6 rounded-2xl backdrop-blur-xl shadow-xl">
        <div>
          <h1 className="text-xl font-extrabold text-white tracking-tight">
            {timeGreeting}, {session.user.name?.split(" ")[0] || "Passenger"}! 👋
          </h1>
          <p className="text-xs text-slate-400 mt-1">Where would you like to travel with GoShuttles today?</p>
        </div>
        <Link
          href="/passenger/discover"
          className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl transition-all shadow-lg shadow-amber-500/10 flex items-center justify-center gap-2"
        >
          <Search className="h-4 w-4" /> Book Shuttle Ride
        </Link>
      </div>

      {/* KPI Cards (4 Grid) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Trips</p>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <Ticket className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-white mt-2">{groupedRecentBookings.length || totalBookings}</p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Completed Trips</p>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-white mt-2">{completedTrips}</p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Upcoming Rides</p>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-white mt-2">{upcomingCount}</p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Spent</p>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-white mt-2">
            ₹{Number(totalSpent._sum.totalAmount ?? 0).toLocaleString("en-IN")}
          </p>
        </div>
      </div>

      {/* Main Grid: Left 2/3 + Right 1/3 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Bookings Card */}
          <div className="bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl rounded-2xl overflow-hidden shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-950/40">
              <h2 className="text-sm font-semibold text-white">Your Recent Bookings</h2>
              <Link href="/passenger/bookings" className="text-xs text-slate-400 hover:text-white transition-colors flex items-center gap-1">
                All bookings <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {groupedRecentBookings.length === 0 ? (
              <div className="p-10 text-center">
                <Ticket className="h-10 w-10 text-slate-600 mx-auto mb-3" />
                <p className="text-sm font-semibold text-white">No active bookings yet</p>
                <p className="text-xs text-slate-400 mt-1">
                  Ready to travel? <Link href="/passenger/discover" className="text-amber-400 hover:underline">Explore scheduled shuttles</Link>
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/40">
                {groupedRecentBookings.map((b) => {
                  const st = statusMap[b.status] ?? { label: b.status, cls: "badge-muted" };
                  return (
                    <div key={b.id} className="flex items-center justify-between px-6 py-4 hover:bg-slate-800/30 transition-colors gap-4">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate">
                          {b.trip.source} → {b.trip.destination}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Seats <span className="font-mono text-amber-400 font-bold">{b.seatNumberDisplay}</span> &nbsp;·&nbsp; ₹{b.totalAmount} &nbsp;·&nbsp;
                          {new Date(b.trip.startTime).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`badge ${st.cls}`}>{st.label}</span>
                        {b.ticket ? (
                          <Link
                            href={`/passenger/ticket/${b.ticket.id}`}
                            className="px-3 py-1.5 text-xs font-semibold border border-slate-700 rounded-xl text-slate-200 hover:bg-slate-800 transition-colors flex items-center gap-1.5"
                          >
                            <Ticket className="h-3.5 w-3.5" /> Pass
                          </Link>
                        ) : (
                          <Link
                            href={`/passenger/booking/${b.id}`}
                            className="px-3 py-1.5 text-xs font-semibold border border-slate-700 rounded-xl text-slate-200 hover:bg-slate-800 transition-colors flex items-center gap-1.5"
                          >
                            <ExternalLink className="h-3.5 w-3.5" /> Details
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Available Shuttles Grid */}
          <div className="bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl rounded-2xl overflow-hidden shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-950/40">
              <h2 className="text-sm font-semibold text-white">Upcoming Express Shuttles</h2>
              <Link href="/passenger/discover" className="text-xs text-slate-400 hover:text-white transition-colors flex items-center gap-1">
                Search all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {availableTrips.length === 0 ? (
              <p className="text-center text-slate-500 py-10 text-xs">No scheduled shuttles available right now</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 divide-slate-800/40">
                {availableTrips.map((trip, i) => {
                  const availSeats = trip.seats.length;
                  const minPrice = trip.seats.length > 0 ? Math.min(...trip.seats.map((s) => Number(s.price))) : 0;
                  return (
                    <Link
                      key={trip.id}
                      href={`/passenger/trips/${trip.id}`}
                      className={`p-5 hover:bg-slate-800/30 transition-colors border-b border-slate-800/40 ${
                        i % 2 === 0 ? "sm:border-r" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-xs font-bold text-white">
                          {trip.source.name} → {trip.destination.name}
                        </p>
                        <p className="text-xs font-extrabold text-amber-400">₹{minPrice}</p>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {new Date(trip.startTime).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
                        &nbsp;·&nbsp;
                        <span className={availSeats <= 2 ? "text-rose-400 font-semibold" : "text-emerald-400"}>
                          {availSeats} seat{availSeats !== 1 ? "s" : ""} available
                        </span>
                      </p>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Quick Search Widget */}
          <div className="bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl rounded-2xl overflow-hidden shadow-xl p-5">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <Search className="h-4 w-4 text-amber-400" /> Express Search
            </h3>
            <form action="/passenger/discover" className="space-y-4">
              <div>
                <label className="form-label">Departure Terminal</label>
                <select name="source_id" className="form-input">
                  <option value="">Any Origin</option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">Destination Terminal</label>
                <select name="dest_id" className="form-input">
                  <option value="">Any Destination</option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">Travel Date</label>
                <input type="date" name="date" className="form-input" />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl transition-all shadow-lg shadow-amber-500/10 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Search className="h-4 w-4" /> Find Available Seats
              </button>
            </form>
          </div>

          {/* Account Quick Links */}
          <div className="bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl rounded-2xl overflow-hidden shadow-xl">
            <div className="px-5 py-4 border-b border-slate-800/80 bg-slate-950/40">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Passenger Shortcuts</h3>
            </div>
            <div className="divide-y divide-slate-800/40">
              {[
                { href: "/passenger/tracking", label: "Live Ride Tracking", icon: MapPin },
                { href: "/passenger/bookings", label: "All My Bookings", icon: Ticket },
                { href: "/passenger/invoices", label: "Invoices & Receipts", icon: Wallet },
                { href: "/passenger/complaints", label: "Help & Support", icon: Shield },
              ].map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-800/30 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-4 w-4 text-slate-400 group-hover:text-amber-400 transition-colors" />
                    <span className="text-xs font-medium text-slate-200">{label}</span>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-500 group-hover:text-white transition-colors" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
