import { auth } from "@/auth";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { redirect } from "next/navigation";
import { BookingManagerClient } from "./booking-manager-client";
import { groupBookings } from "@/lib/booking-grouping";
import { z } from "zod";

const PAGE_SIZE = 20;
const statusSchema = z.enum(["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"]);
const paymentModeSchema = z.enum(["CASH", "ONLINE"]);

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login");

  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const rawStatus = typeof params.status === "string" ? params.status : "";
  const rawPaymentMode = typeof params.paymentMode === "string" ? params.paymentMode : "";
  const driverId = typeof params.driverId === "string" ? params.driverId : "";
  const tripId = typeof params.tripId === "string" ? params.tripId : "";
  const date = typeof params.date === "string" ? params.date : "";
  const sortField = typeof params.sort === "string" ? params.sort : "startTime";
  const sortOrder = (params.order as "asc" | "desc") || "desc";
  const status = statusSchema.safeParse(rawStatus);
  const paymentMode = paymentModeSchema.safeParse(rawPaymentMode);

  const where: Prisma.BookingWhereInput = {};
  if (status.success) where.status = status.data;
  if (paymentMode.success) where.paymentMode = paymentMode.data;
  if (driverId) where.trip = { ...(where.trip as Prisma.TripWhereInput || {}), driverId };
  if (tripId) where.trip = { ...(where.trip as Prisma.TripWhereInput || {}), id: tripId };
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const start = new Date(`${date}T00:00:00`);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    where.trip = { ...(where.trip as Prisma.TripWhereInput || {}), startTime: { gte: start, lt: end } };
  }
  if (q) {
    where.OR = [
      { id: { contains: q, mode: "insensitive" } },
      { guestName: { contains: q, mode: "insensitive" } },
      { user: { name: { contains: q, mode: "insensitive" } } },
      { user: { phone: { contains: q, mode: "insensitive" } } },
      { trip: { source: { name: { contains: q, mode: "insensitive" } } } },
      { trip: { destination: { name: { contains: q, mode: "insensitive" } } } },
      { ticket: { ticketNumber: { contains: q, mode: "insensitive" } } },
    ];
  }

  let orderBy: Prisma.BookingOrderByWithRelationInput[] = [{ trip: { startTime: sortOrder } }, { createdAt: "desc" }];
  if (sortField === "passenger") {
    orderBy = [{ guestName: sortOrder }];
  } else if (sortField === "totalAmount") {
    orderBy = [{ totalAmount: sortOrder }];
  } else if (sortField === "status") {
    orderBy = [{ status: sortOrder }];
  }

  const [bookings, totalCount, pendingCash, pendingOnline, confirmed, completed, cancelled, noShow, drivers] = await Promise.all([
    db.booking.findMany({
      where,
      include: {
        user: { select: { name: true, phone: true } },
        trip: {
          select: {
            id: true,
            startTime: true,
            source: { select: { name: true } },
            destination: { select: { name: true } },
            driver: { select: { id: true, name: true } },
          },
        },
        seat: { select: { seatNumber: true, status: true } },
        ticket: { select: { id: true, ticketNumber: true, status: true } },
        paymentVerification: { select: { id: true, utrNumber: true, status: true } },
      },
      orderBy,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.booking.count({ where }),
    db.booking.count({ where: { status: "PENDING", paymentMode: "CASH" } }),
    db.booking.count({ where: { status: "PENDING", paymentMode: "ONLINE" } }),
    db.booking.count({ where: { status: "CONFIRMED" } }),
    db.booking.count({ where: { status: "COMPLETED" } }),
    db.booking.count({ where: { status: "CANCELLED" } }),
    db.booking.count({ where: { status: "NO_SHOW" } }),
    db.user.findMany({ where: { role: "DRIVER", isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const rawAdminBookings = bookings.map((booking) => ({
    id: booking.id,
    userId: booking.userId,
    status: booking.status,
    paymentMode: booking.paymentMode,
    paymentStatus: booking.paymentStatus,
    totalAmount: booking.totalAmount.toString(),
    createdAt: booking.createdAt.toISOString(),
    cancellationReason: booking.cancellationReason,
    passengerName: booking.user?.name || booking.guestName || "Guest",
    passengerPhone: booking.user?.phone || null,
    trip: {
      id: booking.trip.id,
      startTime: booking.trip.startTime.toISOString(),
      source: booking.trip.source.name,
      destination: booking.trip.destination.name,
      driverId: booking.trip.driver?.id || null,
      driverName: booking.trip.driver?.name || "Unassigned",
    },
    seatNumber: booking.seat?.seatNumber || "-",
    ticket: booking.ticket,
    paymentVerification: booking.paymentVerification,
  }));

  const groupedAdminBookings = groupBookings(rawAdminBookings).map((g) => ({
    id: g.id,
    bookingIds: g.bookingIds,
    status: g.status,
    paymentMode: g.paymentMode,
    paymentStatus: g.paymentStatus,
    totalAmount: g.totalAmount,
    createdAt: g.createdAt,
    cancellationReason: g.cancellationReason,
    passengerName: g.passengerName,
    passengerPhone: g.passengerPhone,
    guestRoster: g.guestRoster,
    trip: g.trip,
    seatNumber: g.seatNumberDisplay,
    ticket: g.ticket,
    paymentVerification: g.paymentVerification,
  }));

  return (
    <BookingManagerClient
      bookings={groupedAdminBookings}
      drivers={drivers}
      page={page}
      totalPages={Math.ceil(totalCount / PAGE_SIZE)}
      totalCount={groupedAdminBookings.length}
      stats={{ pendingCash, pendingOnline, confirmed, completed, cancelled, noShow }}
      filters={{ status: rawStatus, paymentMode: rawPaymentMode, driverId, tripId, date, q }}
    />
  );
}
