"use client";

import { Download } from "lucide-react";

interface ExportData {
  revenueStats: { totalRevenue: number; totalCommission: number };
  tripStats: {
    scheduled: number;
    inProgress: number;
    completed: number;
    cancelled: number;
    total: number;
  };
  routePopularity: Array<{
    source: string;
    destination: string;
    trips: number;
    bookings: number;
  }>;
  paymentBreakdown: {
    cash: { count: number; amount: number };
    online: { count: number; amount: number };
  };
  driverPerformance: Array<{
    driverName: string;
    kycStatus: string;
    completedTrips: number;
    avgDriverRating: number;
    totalEarnings: number;
    walletBalance: number;
    isAvailable: boolean;
  }>;
  dailyBookings: Array<{ date: string; count: number }>;
}

function toCSV(
  headers: string[],
  rows: string[][],
  sectionTitle?: string
): string {
  const lines: string[] = [];
  if (sectionTitle) {
    lines.push(`# ${sectionTitle}`);
  }
  lines.push(headers.join(","));
  rows.forEach((row) => lines.push(row.map(escapeCsv).join(",")));
  return lines.join("\n");
}

function escapeCsv(val: string): string {
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

export function ExportCSVButton({ data }: { data: ExportData }) {
  function handleExport() {
    const sections: string[] = [];

    // Overview
    sections.push(
      toCSV(
        ["Metric", "Value"],
        [
          ["Total Revenue", `₹${data.revenueStats.totalRevenue}`],
          ["Total Commission", `₹${data.revenueStats.totalCommission}`],
          ["Scheduled Trips", String(data.tripStats.scheduled)],
          ["In Progress Trips", String(data.tripStats.inProgress)],
          ["Completed Trips", String(data.tripStats.completed)],
          ["Cancelled Trips", String(data.tripStats.cancelled)],
          ["Total Trips", String(data.tripStats.total)],
        ],
        "Overview"
      )
    );

    // Payment breakdown
    sections.push(
      toCSV(
        ["Mode", "Count", "Amount"],
        [
          ["CASH", String(data.paymentBreakdown.cash.count), `₹${data.paymentBreakdown.cash.amount}`],
          ["ONLINE", String(data.paymentBreakdown.online.count), `₹${data.paymentBreakdown.online.amount}`],
        ],
        "Payment Breakdown"
      )
    );

    // Route popularity
    sections.push(
      toCSV(
        ["Route", "Trips", "Bookings"],
        data.routePopularity.map((r) => [
          `${r.source} → ${r.destination}`,
          String(r.trips),
          String(r.bookings),
        ]),
        "Route Popularity"
      )
    );

    // Driver performance
    sections.push(
      toCSV(
        ["Driver", "KYC", "Completed Trips", "Avg Rating", "Total Earnings", "Wallet", "Available"],
        data.driverPerformance.map((d) => [
          d.driverName,
          d.kycStatus,
          String(d.completedTrips),
          d.avgDriverRating.toFixed(1),
          `₹${d.totalEarnings}`,
          `₹${d.walletBalance}`,
          d.isAvailable ? "Yes" : "No",
        ]),
        "Driver Performance"
      )
    );

    // Daily bookings
    sections.push(
      toCSV(
        ["Date", "Bookings"],
        data.dailyBookings.map((d) => [d.date, String(d.count)]),
        "Daily Bookings Trend"
      )
    );

    const blob = new Blob([sections.join("\n\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      onClick={handleExport}
      className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-2 transition-colors"
    >
      <Download className="h-4 w-4" />
      Export CSV
    </button>
  );
}
