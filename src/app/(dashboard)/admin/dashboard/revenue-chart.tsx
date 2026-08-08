"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useTheme } from "@/components/theme/theme-provider";

interface Props {
  data: Array<{ date: string; revenue: number }>;
}

export function DashboardRevenueChart({ data }: Props) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const formatted = data.map((d) => ({
    ...d,
    label: new Date(d.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
  }));

  const strokeColor = isDark ? "#94a3b8" : "#64748b";
  const gridColor = isDark ? "#1e293b" : "#e2e8f0";
  const tooltipBg = isDark ? "#0f172a" : "#ffffff";
  const tooltipBorder = isDark ? "#334155" : "#cbd5e1";
  const tooltipText = isDark ? "#f8fafc" : "#0f172a";

  return (
    <div className="bg-[var(--card)] backdrop-blur-xl rounded-3xl border border-[var(--border)] shadow-xl p-6 transition-colors">
      <h2 className="text-lg font-extrabold text-[var(--foreground)] mb-1 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
        Revenue Trend (Last 7 Days)
      </h2>
      <p className="text-xs text-[var(--muted-foreground)] mb-6">Daily revenue from completed shuttle bookings</p>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={formatted}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="dashRevGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
            <XAxis dataKey="label" stroke={strokeColor} fontSize={12} />
            <YAxis
              stroke={strokeColor}
              fontSize={12}
              tickFormatter={(v: number) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
            />
            <Tooltip
              contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: "12px", color: tooltipText, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)" }}
              itemStyle={{ color: "#f59e0b", fontWeight: "bold" }}
              formatter={(value) => [`₹${Number(value).toLocaleString("en-IN")}`, "Revenue"]}
              labelFormatter={(label) => `Date: ${label}`}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#f59e0b"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#dashRevGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
