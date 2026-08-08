import { auth } from "@/auth";
import { Card, CardContent, CardHeader, CardTitle, Badge } from "@/components/ui";
import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import {
  getRevenueStats,
  getActiveDriversCount,
  getTotalPassengersCount,
  getOccupancyRate,
  getRevenueByDay,
  getRecentBookings,
  getUpcomingTrips,
} from "@/lib/analytics-queries";
import { DashboardRevenueChart } from "./revenue-chart";
import {
  Wallet,
  TrendingUp,
  Route,
  Users,
  UserCheck,
  BarChart2,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Car,
  Link2,
} from "lucide-react";

export const revalidate = 30; // ISR: refresh every 30s without blocking page loads

export default async function AdminDashboardPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login");

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const [
    revenueStats,
    todayTrips,
    activeDrivers,
    totalPassengers,
    occupancyRate,
    revenueByDay,
    recentBookings,
    upcomingTrips,
    pendingPaymentCount,
    pendingKycCount,
    openTicketCount,
    pendingSettlementCount,
    fleetReadyCount,
    fleetTotalCount,
  ] = await Promise.all([
    getRevenueStats(),
    db.trip.count({ where: { startTime: { gte: todayStart, lte: todayEnd } } }),
    getActiveDriversCount(),
    getTotalPassengersCount(),
    getOccupancyRate(),
    getRevenueByDay(14),
    getRecentBookings(8),
    getUpcomingTrips(48),
    db.paymentVerification.count({ where: { status: "PENDING" } }),
    db.driverProfile.count({ where: { kycStatus: "PENDING" } }),
    db.complaint.count({ where: { status: "OPEN" } }),
    db.driverSettlement.count({ where: { status: "PENDING" } }),
    db.vehicle.count({ where: { isActive: true, trips: { some: { startTime: { gte: todayStart, lte: todayEnd }, driverId: { not: null } } } } }),
    db.vehicle.count({ where: { isActive: true } }),
  ]);

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--foreground)] tracking-tight">Admin Operations Control</h1>
          <p className="text-xs sm:text-sm text-[var(--muted-foreground)] mt-1">
            {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {pendingPaymentCount > 0 && (
            <Link
              href="/admin/trips/approvals"
              className="flex items-center gap-2 px-3.5 py-2 bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-semibold rounded-xl hover:bg-amber-500/20 transition-colors"
            >
              <AlertTriangle className="h-4 w-4" />
              <span>{pendingPaymentCount} Pending Payments</span>
            </Link>
          )}
          {pendingKycCount > 0 && (
            <Link
              href="/admin/drivers"
              className="flex items-center gap-2 px-3.5 py-2 bg-blue-500/10 border border-blue-500/30 text-blue-600 dark:text-blue-400 text-xs font-semibold rounded-xl hover:bg-blue-500/20 transition-colors"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>{pendingKycCount} KYC Pending</span>
            </Link>
          )}
        </div>
      </div>

      {/* KPI Cards Row (6 Grid) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KpiCard
          label="Total Revenue"
          value={`₹${(revenueStats.totalRevenue / 1000).toFixed(1)}k`}
          sub="all-time tickets"
          icon={Wallet}
          color="bg-amber-500/20 text-amber-500"
        />
        <KpiCard
          label="Commission"
          value={`₹${(revenueStats.totalCommission / 1000).toFixed(1)}k`}
          sub="platform share"
          icon={TrendingUp}
          color="bg-emerald-500/20 text-emerald-500"
        />
        <KpiCard
          label="Today's Trips"
          value={String(todayTrips)}
          sub="scheduled & active"
          icon={Route}
          color="bg-indigo-500/20 text-indigo-500"
        />
        <KpiCard
          label="Active Drivers"
          value={String(activeDrivers)}
          sub="available on-duty"
          icon={Users}
          color="bg-blue-500/20 text-blue-500"
        />
        <KpiCard
          label="Passengers"
          value={String(totalPassengers)}
          sub="registered customers"
          icon={UserCheck}
          color="bg-rose-500/20 text-rose-500"
        />
        <KpiCard
          label="Avg Occupancy"
          value={`${occupancyRate}%`}
          sub="across all shuttles"
          icon={BarChart2}
          color="bg-green-500/20 text-green-500"
        />
      </div>

      {/* Alert Banner Row */}
      {(pendingPaymentCount > 0 || pendingKycCount > 0) && (
        <div className="flex flex-wrap gap-4">
          {pendingPaymentCount > 0 && (
            <div className="flex-1 min-w-[280px] bg-amber-500/10 border border-amber-500/30 backdrop-blur-xl rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-amber-700 dark:text-amber-300">
                    {pendingPaymentCount} payment proof{pendingPaymentCount !== 1 ? "s" : ""} awaiting verification
                  </p>
                  <p className="text-xs text-[var(--muted-foreground)] mt-0.5">Online UTR submissions waiting for admin approval</p>
                </div>
              </div>
              <Link
                href="/admin/trips/approvals"
                className="shrink-0 flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-300 border border-amber-500/40 px-3.5 py-2 rounded-xl hover:bg-amber-500/20 transition-colors"
              >
                Review <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}
          {pendingKycCount > 0 && (
            <div className="flex-1 min-w-[280px] bg-blue-500/10 border border-blue-500/30 backdrop-blur-xl rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-600 dark:text-blue-400">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-blue-700 dark:text-blue-300">
                    {pendingKycCount} driver profile{pendingKycCount !== 1 ? "s" : ""} awaiting KYC approval
                  </p>
                  <p className="text-xs text-[var(--muted-foreground)] mt-0.5">New registration licenses and documents to inspect</p>
                </div>
              </div>
              <Link
                href="/admin/drivers"
                className="shrink-0 flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-300 border border-blue-500/40 px-3.5 py-2 rounded-xl hover:bg-blue-500/20 transition-colors"
              >
                Review <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}
        </div>
      )}

      <section aria-labelledby="operations-queue" className="space-y-3">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-500">Operations queue</p>
            <h2 id="operations-queue" className="mt-1 text-xl font-bold text-[var(--foreground)]">Work that needs an owner</h2>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">Prioritised exceptions across payments, people, fleet and finance.</p>
          </div>
          <Link href="/admin/trips" className="hidden text-sm font-semibold text-amber-600 hover:text-amber-500 sm:inline-flex">Open dispatch →</Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <QueueCard href="/admin/trips/approvals" label="Payment review" value={pendingPaymentCount} detail="proofs awaiting verification" variant="warning" />
          <QueueCard href="/admin/drivers" label="KYC review" value={pendingKycCount} detail="driver profiles to inspect" variant="info" />
          <QueueCard href="/admin/tickets" label="Customer tickets" value={openTicketCount} detail="open support issues" variant="danger" />
          <QueueCard href="/admin/finance" label="Finance exceptions" value={pendingSettlementCount} detail="settlements awaiting action" variant="success" />
        </div>
      </section>

      <section aria-labelledby="readiness" className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card variant="glass">
          <CardHeader className="flex-row items-start justify-between space-y-0">
            <div><CardTitle id="readiness" className="text-base">Fleet &amp; driver readiness</CardTitle><p className="mt-1 text-sm text-[var(--muted-foreground)]">Today’s assigned vehicles with an active driver.</p></div>
            <Badge variant={fleetReadyCount === fleetTotalCount ? "success" : "warning"}>{fleetReadyCount}/{fleetTotalCount || 0} ready</Badge>
          </CardHeader>
          <CardContent>
            <div className="h-2 overflow-hidden rounded-full bg-[var(--muted)]" role="progressbar" aria-valuenow={fleetTotalCount ? Math.round((fleetReadyCount / fleetTotalCount) * 100) : 0} aria-valuemin={0} aria-valuemax={100} aria-label="Fleet readiness">
              <div className="h-full rounded-full bg-emerald-500 transition-[width] motion-reduce:transition-none" style={{ width: `${fleetTotalCount ? Math.min(100, Math.round((fleetReadyCount / fleetTotalCount) * 100)) : 0}%` }} />
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-[var(--muted-foreground)]"><span>{fleetTotalCount} active vehicles</span><span aria-hidden="true">·</span><span>{activeDrivers} available drivers</span><span aria-hidden="true">·</span><Link href="/admin/assign" className="font-semibold text-amber-600 hover:underline">Resolve assignments</Link></div>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardHeader><CardTitle className="text-base">At-a-glance controls</CardTitle><p className="text-sm text-[var(--muted-foreground)]">Jump directly into bounded worklists.</p></CardHeader>
          <CardContent className="grid grid-cols-2 gap-2 pt-0"><Link className="rounded-lg border border-[var(--border)] p-3 text-sm font-semibold hover:border-amber-400" href="/admin/bookings">Bookings</Link><Link className="rounded-lg border border-[var(--border)] p-3 text-sm font-semibold hover:border-amber-400" href="/admin/trips">Trips</Link><Link className="rounded-lg border border-[var(--border)] p-3 text-sm font-semibold hover:border-amber-400" href="/admin/vehicles">Fleet</Link><Link className="rounded-lg border border-[var(--border)] p-3 text-sm font-semibold hover:border-amber-400" href="/admin/analytics">Analytics</Link></CardContent>
        </Card>
      </section>

      {/* Revenue Trend Chart Container */}
      <div className="bg-[var(--card)] border border-[var(--border)] backdrop-blur-xl rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-[var(--foreground)]">Revenue Performance Trend</h2>
            <p className="text-xs text-[var(--muted-foreground)] mt-0.5">Daily breakdown for the last 14 days</p>
          </div>
        </div>
        <DashboardRevenueChart data={revenueByDay} />
      </div>

      {/* Main Data Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Bookings */}
        <div className="bg-[var(--card)] border border-[var(--border)] backdrop-blur-xl rounded-2xl overflow-hidden shadow-xl flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
            <h2 className="text-sm font-bold text-[var(--foreground)]">Recent Passenger Bookings</h2>
            <Link href="/admin/bookings" className="text-xs text-[var(--muted-foreground)] hover:text-amber-500 transition-colors flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--muted)]/50">
                  <th className="px-6 py-3 text-[11px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Passenger</th>
                  <th className="px-6 py-3 text-[11px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Route</th>
                  <th className="px-6 py-3 text-[11px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider text-right">Fare</th>
                  <th className="px-6 py-3 text-[11px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {recentBookings.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center text-[var(--muted-foreground)] py-10 text-xs">
                      No recent bookings found
                    </td>
                  </tr>
                ) : (
                  recentBookings.map((b) => (
                    <tr key={b.id} className="hover:bg-[var(--muted)]/40 transition-colors">
                      <td className="px-6 py-3.5 text-xs font-bold text-[var(--foreground)]">
                        {b.user?.name || b.guestName || "Passenger"}
                      </td>
                      <td className="px-6 py-3.5 text-xs text-[var(--muted-foreground)]">
                        {b.trip.source.name} → {b.trip.destination.name}
                      </td>
                      <td className="px-6 py-3.5 text-xs font-black text-[var(--foreground)] text-right">
                        ₹{Number(b.totalAmount)}
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <BookingStatusBadge status={b.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Upcoming Trips */}
        <div className="bg-[var(--card)] border border-[var(--border)] backdrop-blur-xl rounded-2xl overflow-hidden shadow-xl flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
            <h2 className="text-sm font-bold text-[var(--foreground)]">
              Upcoming Dispatch Schedule <span className="text-[var(--muted-foreground)] font-normal">(48h)</span>
            </h2>
            <Link href="/admin/trips" className="text-xs text-[var(--muted-foreground)] hover:text-amber-500 transition-colors flex items-center gap-1">
              All trips <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-[var(--border)] max-h-[380px] overflow-y-auto flex-1">
            {upcomingTrips.length === 0 ? (
              <p className="text-center text-[var(--muted-foreground)] py-10 text-xs">No upcoming trips scheduled in next 48 hours</p>
            ) : (
              upcomingTrips.map((trip) => {
                const fillPct = trip._count.seats > 0 ? Math.round((trip._count.bookings / trip._count.seats) * 100) : 0;
                return (
                  <div key={trip.id} className="flex items-center justify-between px-6 py-3.5 hover:bg-[var(--muted)]/40 transition-colors">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[var(--foreground)] truncate">
                        {trip.source.name} → {trip.destination.name}
                      </p>
                      <p className="text-[11px] text-[var(--muted-foreground)] mt-0.5 truncate">
                        {trip.driver?.name || "Unassigned"} • {trip.vehicle?.regNumber || "N/A"}
                      </p>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <p className="text-xs font-bold text-[var(--foreground)]">
                        {trip.startTime.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                      <div className="flex items-center gap-2 justify-end mt-1">
                        <div className="w-16 h-1.5 bg-[var(--muted)] rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              fillPct >= 80 ? "bg-emerald-400" : fillPct >= 50 ? "bg-amber-400" : "bg-slate-500"
                            }`}
                            style={{ width: `${fillPct}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-mono text-[var(--muted-foreground)]">
                          {trip._count.bookings}/{trip._count.seats}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Quick Action Navigation Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <QuickActionCard href="/admin/trips" label="Manage Trips" desc="Full route dispatch schedule" icon={Route} color="amber" />
        <QuickActionCard href="/admin/vehicles" label="Fleet Registry" desc="Add and manage vehicle inventory" icon={Car} color="indigo" />
        <QuickActionCard href="/admin/drivers" label="Driver Profiles" desc="Verify driver KYC &amp; performance" icon={Users} color="blue" />
        <QuickActionCard href="/admin/assign" label="Vehicle Assignment" desc="Link shuttle vehicles to drivers" icon={Link2} color="emerald" />
      </div>
    </div>
  );
}

function QueueCard({ href, label, value, detail, variant }: { href: string; label: string; value: number; detail: string; variant: "warning" | "info" | "danger" | "success" }) {
  const colors = { warning: "border-amber-500/30 bg-amber-500/5", info: "border-sky-500/30 bg-sky-500/5", danger: "border-rose-500/30 bg-rose-500/5", success: "border-emerald-500/30 bg-emerald-500/5" };
  return <Link href={href} className={`group rounded-2xl border p-4 transition-colors hover:border-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${colors[variant]}`}><div className="flex items-start justify-between gap-3"><span className="text-sm font-bold text-[var(--foreground)]">{label}</span><ArrowRight className="h-4 w-4 text-[var(--muted-foreground)] transition-transform group-hover:translate-x-1 motion-reduce:transition-none" /></div><p className="mt-5 text-3xl font-black text-[var(--foreground)]">{value}</p><p className="mt-1 text-xs text-[var(--muted-foreground)]">{detail}</p></Link>;
}

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  return (
    <div className="relative overflow-hidden bg-[var(--card)] border border-[var(--border)] backdrop-blur-xl rounded-2xl p-5 hover:border-amber-500/50 transition-all duration-200 shadow-md">
      <div className={`absolute top-4 right-4 p-2 rounded-xl ${color}`}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-[11px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-2">{label}</p>
      <p className="text-2xl font-black text-[var(--foreground)] leading-none tracking-tight">{value}</p>
      <p className="text-[10px] text-[var(--muted-foreground)] mt-2 font-medium">{sub}</p>
    </div>
  );
}

function QuickActionCard({
  href,
  label,
  desc,
  icon: Icon,
  color,
}: {
  href: string;
  label: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  color: "amber" | "indigo" | "blue" | "emerald";
}) {
  const styles = {
    amber: "bg-amber-500/5 border-amber-500/20 hover:border-amber-500/40 text-amber-600 dark:text-amber-400",
    indigo: "bg-indigo-500/5 border-indigo-500/20 hover:border-indigo-500/40 text-indigo-600 dark:text-indigo-400",
    blue: "bg-blue-500/5 border-blue-500/20 hover:border-blue-500/40 text-blue-600 dark:text-blue-400",
    emerald: "bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40 text-emerald-600 dark:text-emerald-400",
  };

  return (
    <Link
      href={href}
      className={`block rounded-2xl border p-5 transition-all duration-200 shadow-md ${styles[color]}`}
    >
      <Icon className="h-5 w-5 mb-3" />
      <p className="text-xs font-bold text-[var(--foreground)]">{label}</p>
      <p className="text-[11px] text-[var(--muted-foreground)] mt-1 leading-snug">{desc}</p>
    </Link>
  );
}

function BookingStatusBadge({ status }: { status: string }) {
  const variant = status === "CONFIRMED" || status === "COMPLETED" ? "success" : status === "CANCELLED" ? "destructive" : status === "NO_SHOW" ? "secondary" : "warning";
  return <Badge variant={variant}>{status.replace("_", " ")}</Badge>;
}
