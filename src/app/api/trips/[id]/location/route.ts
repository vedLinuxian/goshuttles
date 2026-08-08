import { auth } from "@/auth";
import { db } from "@/lib/db";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tripId = id;
    if (!tripId) {
      return NextResponse.json({ error: "Trip ID missing" }, { status: 400 });
    }

    const session = await auth();
    if (!session?.user?.id || !session.user.isActive) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const trip = await db.trip.findUnique({
      where: { id: tripId },
      select: {
        id: true,
        driverId: true,
        currentLat: true,
        currentLong: true,
        lastLocationUpdate: true,
        status: true,
        bookings: {
          where: { userId: session.user.id, status: { not: "CANCELLED" } },
          select: { id: true },
          take: 1,
        },
      },
    });

    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    const isAdmin = session.user.role === "ADMIN";
    const isAssignedDriver = session.user.role === "DRIVER" && trip.driverId === session.user.id;
    const isPassenger = session.user.role === "CUSTOMER" && trip.bookings.length > 0;
    if (!isAdmin && !isAssignedDriver && !isPassenger) {
      return NextResponse.json({ error: "You are not authorized to view this trip location" }, { status: 403 });
    }

    return NextResponse.json({
      currentLat: trip.currentLat ? Number(trip.currentLat) : null,
      currentLong: trip.currentLong ? Number(trip.currentLong) : null,
      lastLocationUpdate: trip.lastLocationUpdate?.toISOString() ?? null,
      status: trip.status,
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch trip location" }, { status: 500 });
  }
}
