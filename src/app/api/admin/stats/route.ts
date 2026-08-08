import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { rateLimit, getClientIp, RATE_LIMIT_ROUTES } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  // ---------- Rate limit ----------
  const ip = getClientIp(req);
  const { headers, limited } = await rateLimit(ip, RATE_LIMIT_ROUTES.ADMIN_STATS);
  if (limited) return limited;

  // ---------- Auth check ----------
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401, headers },
    );
  }

  if (session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Forbidden: admin access only" },
      { status: 403, headers },
    );
  }

  try {
    // ---------- Fetch KPIs in parallel ----------
    const [
      revenueResult,
      tripsCount,
      driversCount,
      passengersCount,
      allTripsForOccupancy,
    ] = await Promise.all([
      // Total revenue from confirmed/completed bookings (commission = platform revenue)
      db.booking.aggregate({
        _sum: { commissionAmount: true },
        where: { status: { in: ["CONFIRMED", "COMPLETED"] } },
      }),
      // Total trips
      db.trip.count(),
      // Total drivers
      db.user.count({ where: { role: "DRIVER", isActive: true } }),
      // Total passengers (customers)
      db.user.count({ where: { role: "CUSTOMER", isActive: true } }),
      // All trips with seat counts for occupancy calculation
      db.trip.findMany({
        where: { status: { in: ["SCHEDULED", "IN_PROGRESS", "COMPLETED"] } },
        select: {
          seats: { select: { status: true } },
        },
      }),
    ]);

    // Compute average occupancy
    let occupancy = 0;
    if (allTripsForOccupancy.length > 0) {
      const totalOccupancySum = allTripsForOccupancy.reduce((sum, trip) => {
        const total = trip.seats.length;
        const booked = trip.seats.filter((s) => s.status === "BOOKED").length;
        return total > 0 ? sum + (booked / total) * 100 : sum;
      }, 0);
      occupancy = Math.round((totalOccupancySum / allTripsForOccupancy.length) * 100) / 100;
    }

    const revenue = Number(revenueResult._sum.commissionAmount || 0);

    return NextResponse.json(
      {
        revenue,
        trips: tripsCount,
        drivers: driversCount,
        passengers: passengersCount,
        occupancy,
      },
      { headers },
    );
  } catch (error) {
    console.error("[GET /api/admin/stats]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers },
    );
  }
}
