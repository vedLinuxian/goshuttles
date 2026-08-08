"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import { Card } from "@/components/ui";
import { useTheme } from "@/components/theme/theme-provider";
import type { PieLabelRenderProps } from "recharts/types/polar/Pie";
import type { NameType, Payload, ValueType } from "recharts/types/component/DefaultTooltipContent";

interface RouteStat {
  source: string;
  destination: string;
  trips: number;
  bookings: number;
}

interface PaymentSlice {
  name: string;
  value: number;
  amount: number;
}

interface DailyBooking {
  date: string;
  count: number;
}

interface Props {
  routePopularity: RouteStat[];
  paymentPie: PaymentSlice[];
  dailyBookings: DailyBooking[];
}

const PIE_COLORS = ["#f59e0b", "#3b82f6"];

export function AnalyticsCharts({ routePopularity, paymentPie, dailyBookings }: Props) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const routeData = routePopularity.map((r) => ({
    name: `${r.source} → ${r.destination}`,
    bookings: r.bookings,
    trips: r.trips,
  }));

  const dailyData = dailyBookings.map((d) => ({
    ...d,
    label: new Date(d.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
  }));

  const strokeColor = isDark ? "#94a3b8" : "#64748b";
  const gridColor = isDark ? "#1e293b" : "#e2e8f0";
  const tooltipBg = isDark ? "#0f172a" : "#ffffff";
  const tooltipBorder = isDark ? "#334155" : "#cbd5e1";
  const tooltipText = isDark ? "#f8fafc" : "#0f172a";

  return (
    <div className="space-y-8">
      {/* Daily Booking Trend – Line Chart */}
      <Card variant="glass" className="p-6 border-[var(--border)] bg-[var(--card)]">
        <h2 className="text-lg font-extrabold text-[var(--foreground)] mb-1 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
          Daily Booking Trend
        </h2>
        <p className="text-xs text-[var(--muted-foreground)] mb-6">Passenger bookings per day (last 30 days)</p>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={dailyData}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
              <XAxis
                dataKey="label"
                stroke={strokeColor}
                fontSize={11}
                interval="preserveStartEnd"
              />
              <YAxis stroke={strokeColor} fontSize={12} allowDecimals={false} />
              <Tooltip
                contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: "12px", color: tooltipText, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)" }}
                itemStyle={{ color: "#f59e0b", fontWeight: "bold" }}
                formatter={(value: ValueType | undefined) => [value ?? "", "Bookings"]}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#f59e0b"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5, fill: "#f59e0b" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Route Popularity – Horizontal Bar Chart */}
        <Card variant="glass" className="p-6 border-[var(--border)] bg-[var(--card)]">
          <h2 className="text-lg font-extrabold text-[var(--foreground)] mb-1">Route Popularity</h2>
          <p className="text-xs text-[var(--muted-foreground)] mb-6">Total passenger bookings per route pair</p>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={routeData}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 90, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={gridColor} />
                <XAxis type="number" stroke={strokeColor} fontSize={12} allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke={strokeColor}
                  fontSize={11}
                  width={85}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: "12px", color: tooltipText, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)" }}
                  itemStyle={{ color: "#f59e0b", fontWeight: "bold" }}
                  formatter={(value: ValueType | undefined) => [value ?? "", "Bookings"]}
                />
                <Bar dataKey="bookings" fill="#f59e0b" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Payment Breakdown – Pie Chart */}
        <Card variant="glass" className="p-6 border-[var(--border)] bg-[var(--card)]">
          <h2 className="text-lg font-extrabold text-[var(--foreground)] mb-1">Payment Breakdown</h2>
          <p className="text-xs text-[var(--muted-foreground)] mb-6">CASH vs ONLINE bookings ratio</p>
          <div className="h-72 w-full flex items-center justify-center">
            {paymentPie.every((p) => p.value === 0) ? (
              <p className="text-[var(--muted-foreground)] text-sm">No data for this period</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentPie}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, percent }: PieLabelRenderProps) =>
                      `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                    }
                  >
                    {paymentPie.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: "12px", color: tooltipText, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)" }}
                    formatter={(
                      _value: ValueType | undefined,
                      _name: NameType | undefined,
                      item: Payload<ValueType, NameType>,
                    ) => {
                      const payload = item.payload as PaymentSlice | undefined;
                      if (!payload) return ["", ""];
                      return [
                        `${payload.value} bookings (₹${payload.amount.toLocaleString("en-IN")})`,
                        payload.name,
                      ];
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
