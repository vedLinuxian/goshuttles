import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { rateLimit, getClientIp, RATE_LIMIT_ROUTES } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  // ---------- Rate limit ----------
  const ip = getClientIp(req);
  const { headers, limited } = await rateLimit(ip, RATE_LIMIT_ROUTES.DRIVER_STATS);
  if (limited) return limited;

  // ---------- Auth check ----------
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401, headers },
    );
  }

  if (session.user.role !== "DRIVER") {
    return NextResponse.json(
      { error: "Forbidden: driver access only" },
      { status: 403, headers },
    );
  }

  try {
    const driverId = session.user.id;

    const [profile, tripsCount, pendingSettlementsCount] = await Promise.all([
      db.driverProfile.findUnique({
        where: { userId: driverId },
        select: {
          rating: true,
          totalEarnings: true,
          walletBalance: true,
        },
      }),
      db.trip.count({
        where: { driverId },
      }),
      db.driverSettlement.count({
        where: { driverId, status: "PENDING" },
      }),
    ]);

    const earnings = Number(profile?.totalEarnings || 0);
    const rating = Number(profile?.rating || 5.0);

    return NextResponse.json(
      {
        earnings,
        trips: tripsCount,
        rating,
        pendingSettlements: pendingSettlementsCount,
      },
      { headers },
    );
  } catch (error) {
    console.error("[GET /api/driver/stats]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers },
    );
  }
}
