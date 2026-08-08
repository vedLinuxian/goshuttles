import { auth } from "@/auth";
import { redirect } from "next/navigation";
import {
  getRoutePopularity,
  getPaymentBreakdown,
  getDriverPerformance,
  getDailyBookings,
  getRevenueStats,
  getTripStats,
} from "@/lib/analytics-queries";
import { AnalyticsCharts } from "./analytics-charts";
import { DateRangeSelector } from "./date-range-selector";
import { ExportCSVButton } from "./export-csv";
import {
  BarChart3,
  TrendingUp,
  Wallet,
  Users,
  CheckCircle,
  Route,
} from "lucide-react";
import {
  Card, Badge,
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell
} from "@/components/ui";

interface Props {
  searchParams: Promise<{
    from?: string;
    to?: string;
  }>;
}

export default async function AdminAnalyticsPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login");

  const params = await searchParams;

  // Default: this month
  const now = new Date();
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1);
  const defaultTo = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const from = params.from ? new Date(params.from) : defaultFrom;
  const to = params.to ? new Date(params.to) : defaultTo;

  // Ensure valid range
  from.setHours(0, 0, 0, 0);
  to.setHours(23, 59, 59, 999);

  const [
    revenueStats,
    tripStats,
    routePopularity,
    paymentBreakdown,
    driverPerformance,
    dailyBookings,
  ] = await Promise.all([
    getRevenueStats(from, to),
    getTripStats(from, to),
    getRoutePopularity(from, to),
    getPaymentBreakdown(from, to),
    getDriverPerformance(from, to),
    getDailyBookings(30),
  ]);

  // Format date strings for the client
  const fromStr = from.toISOString().slice(0, 10);
  const toStr = to.toISOString().slice(0, 10);

  // Payment breakdown for pie chart
  const paymentPie = [
    { name: "CASH", value: paymentBreakdown.cash.count, amount: paymentBreakdown.cash.amount },
    { name: "ONLINE", value: paymentBreakdown.online.count, amount: paymentBreakdown.online.amount },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <BarChart3 className="h-7 w-7 text-amber-500" />
          Analytics &amp; Fleet Performance Insights
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Real-time platform revenue metrics, passenger load factor, and driver performance.
        </p>
      </div>

      {/* Date Range + Export */}
      <Card variant="glass" className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 border-slate-800">
        <DateRangeSelector defaultFrom={fromStr} defaultTo={toStr} />
        <div className="flex items-center gap-2">
          <ExportCSVButton
            data={{
              revenueStats,
              tripStats,
              routePopularity,
              paymentBreakdown,
              driverPerformance,
              dailyBookings,
            }}
          />
        </div>
      </Card>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          icon={TrendingUp}
          label="Gross Revenue"
          value={`₹${revenueStats.totalRevenue.toLocaleString("en-IN")}`}
          sub="Completed bookings"
          color="amber"
        />
        <StatCard
          icon={Wallet}
          label="Net Commission"
          value={`₹${revenueStats.totalCommission.toLocaleString("en-IN")}`}
          sub="Platform fee"
          color="emerald"
        />
        <StatCard
          icon={Users}
          label="Total Bookings"
          value={tripStats.total}
          sub="All statuses"
          color="blue"
        />
        <StatCard
          icon={CheckCircle}
          label="Completed Trips"
          value={tripStats.completed}
          sub="Successful runs"
          color="purple"
        />
      </div>

      {/* Charts */}
      <AnalyticsCharts
        routePopularity={routePopularity.slice(0, 10)}
        paymentPie={paymentPie}
        dailyBookings={dailyBookings}
      />

      {/* Driver Performance Table */}
      <Card variant="glass" className="p-6 space-y-4 border-slate-800">
        <h2 className="text-lg font-extrabold text-white flex items-center gap-2 border-b border-slate-800/80 pb-3">
          <Route className="h-5 w-5 text-amber-500" />
          Driver Performance Matrix
        </h2>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Driver</TableHead>
              <TableHead>KYC Status</TableHead>
              <TableHead className="text-right">Trips Done</TableHead>
              <TableHead className="text-right">Avg Rating</TableHead>
              <TableHead className="text-right">Earnings</TableHead>
              <TableHead className="text-right">Wallet</TableHead>
              <TableHead className="text-center">Available</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {driverPerformance.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-slate-400 py-8">
                  No driver data available
                </TableCell>
              </TableRow>
            ) : (
              driverPerformance.map((d) => (
                <TableRow key={d.driverId} className="hover:bg-slate-800/50 transition-colors">
                  <TableCell className="font-bold text-white">{d.driverName}</TableCell>
                  <TableCell>
                    <Badge variant={d.kycStatus === "APPROVED" ? "success" : d.kycStatus === "PENDING" ? "warning" : "destructive"}>
                      {d.kycStatus}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-extrabold text-white">
                    {d.completedTrips}
                  </TableCell>
                  <TableCell className="text-right font-bold text-amber-400">
                    {d.avgDriverRating.toFixed(1)} ★
                  </TableCell>
                  <TableCell className="text-right font-extrabold text-emerald-400">
                    ₹{d.totalEarnings.toLocaleString("en-IN")}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-slate-300">
                    ₹{d.walletBalance.toLocaleString("en-IN")}
                  </TableCell>
                  <TableCell className="text-center">
                    <span
                      className={`inline-block w-2.5 h-2.5 rounded-full ${
                        d.isAvailable ? "bg-emerald-400 animate-pulse" : "bg-slate-700"
                      }`}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  sub: string;
  color: string;
}) {
  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    amber: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/30" },
    emerald: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30" },
    blue: { bg: "bg-sky-500/10", text: "text-sky-400", border: "border-sky-500/30" },
    purple: { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/30" },
  };

  const scheme = colorMap[color] || colorMap.amber;

  return (
    <Card variant="glass" className="p-5 flex items-center gap-4 card-hover border-slate-800">
      <div className={`p-3 rounded-2xl ${scheme.bg} ${scheme.text} border ${scheme.border}`}>
        <Icon className="h-6 w-6" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-slate-400">{label}</p>
        <p className="text-xl font-extrabold text-white mt-0.5 truncate">{value}</p>
        <p className="text-[11px] text-slate-500 mt-0.5">{sub}</p>
      </div>
    </Card>
  );
}
