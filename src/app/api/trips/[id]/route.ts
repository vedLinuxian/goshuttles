import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { rateLimit, getClientIp, RATE_LIMIT_ROUTES } from "@/lib/rate-limit";
import { z } from "zod";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // ---------- Rate limit ----------
  const ip = getClientIp(req);
  const { headers, limited } = await rateLimit(ip, RATE_LIMIT_ROUTES.TRIPS_ID);
  if (limited) return limited;

  try {
    const { id } = await params;

    if (!z.string().uuid().safeParse(id).success) {
      return NextResponse.json(
        { error: "Invalid trip ID" },
        { status: 400, headers },
      );
    }

    const trip = await db.trip.findFirst({
      where: {
        id,
        isCancelled: false,
        status: "SCHEDULED",
        startTime: { gt: new Date() },
      },
      include: {
        source: { select: { id: true, name: true } },
        destination: { select: { id: true, name: true } },
        vehicle: {
          select: {
            id: true,
            regNumber: true,
            modelName: true,
            vehicleType: true,
            capacity: true,
          },
        },
        driver: {
            select: { name: true },
        },
        seats: {
          orderBy: { seatNumber: "asc" },
          select: {
            id: true,
            seatNumber: true,
            seatType: true,
            price: true,
            status: true,
          },
        },
      },
    });

    if (!trip) {
      return NextResponse.json(
        { error: "Trip not found" },
        { status: 404, headers },
      );
    }

    // Compute seat counts
    const totalSeats = trip.seats.length;
    const bookedSeats = trip.seats.filter((s) => s.status === "BOOKED").length;
    const availableSeats = trip.seats.filter((s) => s.status === "AVAILABLE").length;
    const lockedSeats = trip.seats.filter((s) => s.status === "LOCKED").length;

    const data = {
      ...trip,
      totalSeats,
      bookedSeats,
      availableSeats,
      lockedSeats,
      occupancyPercent: totalSeats > 0 ? Math.round((bookedSeats / totalSeats) * 100) : 0,
    };

    return NextResponse.json({ data }, { headers });
  } catch (error) {
    console.error("[GET /api/trips/[id]]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers },
    );
  }
}
