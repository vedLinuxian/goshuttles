import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { rateLimit, getClientIp, RATE_LIMIT_ROUTES } from "@/lib/rate-limit";
import { tripStatusSchema } from "@/lib/validators";
import type { Prisma } from "@/generated/prisma/client";
import { z } from "zod";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const passengerSchema = z.coerce.number().int().min(1).max(6);
const departureWindowSchema = z.enum(["ANY", "MORNING", "AFTERNOON", "EVENING"]);

export async function GET(req: NextRequest) {
  let headers = new Headers();

  try {
    const ip = getClientIp(req);
    const result = await rateLimit(ip, RATE_LIMIT_ROUTES.TRIPS);
    headers = result.headers;
    if (result.limited) return result.limited;
  } catch (err) {
    console.warn("[GET /api/trips] Rate limiter warning (non-fatal):", err);
  }

  try {
    const { searchParams } = req.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10) || 20));
    const source = searchParams.get("source")?.trim();
    const destination = searchParams.get("destination")?.trim();
    const date = searchParams.get("date")?.trim();
    const status = searchParams.get("status")?.trim();
    const passengerParam = searchParams.get("passengers");
    const passengerResult = passengerParam === null
      ? { success: true as const, data: 1 }
      : passengerSchema.safeParse(passengerParam);
    const windowParam = searchParams.get("window") || "ANY";
    const windowResult = departureWindowSchema.safeParse(windowParam);

    if (!passengerResult.success) {
      return NextResponse.json({ error: "Passengers must be a whole number between 1 and 6." }, { status: 400, headers });
    }
    if (!windowResult.success) {
      return NextResponse.json({ error: "Departure window is invalid." }, { status: 400, headers });
    }

    const parsedStatus = status ? tripStatusSchema.safeParse(status) : null;
    const tripStatus = parsedStatus?.success ? parsedStatus.data : "SCHEDULED";
    const publicSearch = tripStatus === "SCHEDULED";
    const passengers = passengerResult.data;
    const departureWindow = windowResult.data;
    const now = new Date();
    const where: Prisma.TripWhereInput = {
      isCancelled: false,
      status: tripStatus,
    };

    if (publicSearch) {
      where.manifestLocked = false;
      where.driverId = { not: null };
      where.vehicle = { is: { isActive: true } };
      where.seats = { some: { status: "AVAILABLE" } };
    }

    if (source) {
      const isUuid = z.string().uuid().safeParse(source).success;
      if (isUuid) {
        where.sourceId = source;
      } else {
        where.source = { name: { contains: source, mode: "insensitive" } };
      }
    }

    if (destination) {
      const isUuid = z.string().uuid().safeParse(destination).success;
      if (isUuid) {
        where.destinationId = destination;
      } else {
        where.destination = { name: { contains: destination, mode: "insensitive" } };
      }
    }

    if (date) {
      if (!dateSchema.safeParse(date).success) {
        return NextResponse.json({ error: "Date must use YYYY-MM-DD format." }, { status: 400, headers });
      }
      const parts = date.split("-").map((s) => parseInt(s, 10));
      const dayStart = new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0);
      const dayEnd = new Date(parts[0], parts[1] - 1, parts[2] + 1, 0, 0, 0, 0);
      if (Number.isNaN(dayStart.getTime())) {
        return NextResponse.json({ error: "Date is invalid." }, { status: 400, headers });
      }
      where.startTime = publicSearch
        ? { gte: dayStart > now ? dayStart : (now < dayEnd ? now : dayStart), lt: dayEnd }
        : { gte: dayStart, lt: dayEnd };
    } else {
      where.startTime = publicSearch
        ? { gt: now }
        : { gte: new Date(now.getTime() - 4 * 60 * 60 * 1000) };
    }

    const trips = await db.trip.findMany({
      where,
      include: {
        source: { select: { id: true, name: true } },
        destination: { select: { id: true, name: true } },
        seats: {
          select: { id: true, seatNumber: true, seatType: true, price: true, status: true },
          orderBy: { seatNumber: "asc" },
        },
      },
      orderBy: [{ startTime: "asc" }, { id: "asc" }],
    });

    const eligibleTrips = trips
      .map((trip) => {
        const totalSeats = trip.seats.length;
        const bookedSeats = trip.seats.filter((seat) => seat.status === "BOOKED").length;
        const lockedSeats = trip.seats.filter((seat) => seat.status === "LOCKED").length;
        const availableSeats = trip.seats.filter((seat) => seat.status === "AVAILABLE").length;
        return {
          ...trip,
          seats: trip.seats.map((seat) => ({ ...seat, price: Number(seat.price) })),
          totalSeats,
          bookedSeats,
          availableSeats,
          lockedSeats,
        };
      })
      .filter((trip) => !publicSearch || trip.availableSeats >= passengers)
      .filter((trip) => {
        if (!publicSearch || departureWindow === "ANY") return true;
        const hour = trip.startTime.getHours();
        if (departureWindow === "MORNING") return hour >= 5 && hour < 12;
        if (departureWindow === "AFTERNOON") return hour >= 12 && hour < 17;
        return hour >= 17 || hour < 5;
      });

    const total = eligibleTrips.length;
    const data = eligibleTrips.slice((page - 1) * limit, page * limit);
    const pages = Math.ceil(total / limit);

    return NextResponse.json(
      { data, total, page, limit, pages },
      { headers },
    );
  } catch (error) {
    console.error("[GET /api/trips] Exception:", error);
    return NextResponse.json(
      { error: "Failed to load trip departures.", data: [], total: 0, page: 1, limit: 20, pages: 0 },
      { status: 500, headers },
    );
  }
}
