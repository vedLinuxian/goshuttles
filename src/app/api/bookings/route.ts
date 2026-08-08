import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { rateLimit, getClientIp, RATE_LIMIT_ROUTES } from "@/lib/rate-limit";
import type { Prisma } from "@/generated/prisma/client";
import { bookingStatusSchema } from "@/lib/validators";

export async function GET(req: NextRequest) {
  // ---------- Rate limit ----------
  const ip = getClientIp(req);
  const { headers, limited } = await rateLimit(ip, RATE_LIMIT_ROUTES.BOOKINGS);
  if (limited) return limited;

  // ---------- Auth check ----------
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401, headers },
    );
  }

  try {
    const userId = session.user.id;

    // ---------- Parse query params ----------
    const { searchParams } = req.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10) || 20));
    const status = searchParams.get("status");

    // ---------- Build where clause ----------
    const where: Prisma.BookingWhereInput = {
      userId,
    };

    if (status) {
      const parsed = bookingStatusSchema.safeParse(status);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Invalid status. Must be one of: PENDING, CONFIRMED, CANCELLED, COMPLETED, NO_SHOW" },
          { status: 400, headers },
        );
      }
      where.status = parsed.data;
    }

    // ---------- Query ----------
    const [bookings, total] = await Promise.all([
      db.booking.findMany({
        where,
        include: {
          trip: {
            include: {
              source: { select: { id: true, name: true } },
              destination: { select: { id: true, name: true } },
              vehicle: {
                select: { id: true, regNumber: true, modelName: true, vehicleType: true },
              },
              driver: { select: { id: true, name: true, phone: true } },
            },
          },
          seat: {
            select: { id: true, seatNumber: true, seatType: true },
          },
          ticket: {
            select: { id: true, ticketNumber: true, status: true, qrCodeUrl: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.booking.count({ where }),
    ]);

    const pages = Math.ceil(total / limit);

    return NextResponse.json(
      { data: bookings, total, page, limit, pages },
      { headers },
    );
  } catch (error) {
    console.error("[GET /api/bookings]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers },
    );
  }
}
