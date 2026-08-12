import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { DriverBookingsClient } from "./driver-bookings-client";

export const dynamic = "force-dynamic";

export default async function DriverBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "DRIVER") redirect("/login");

  const params = await searchParams;
  const driverId = session.user.id!;
  const page = Math.max(1, Number(params.page) || 1);
  const pageSize = Math.min(100, Math.max(10, Number(params.pageSize) || 20));
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const statusFilter = typeof params.status === "string" ? params.status.trim() : "";
  const paymentFilter = typeof params.payment === "string" ? params.payment.trim() : "";

  const where: any = {
    trip: { driverId },
  };

  if (statusFilter === "PENDING_CASH") {
    where.paymentMode = "CASH";
    where.paymentStatus = "PENDING";
  } else if (statusFilter === "CONFIRMED") {
    where.status = "CONFIRMED";
  } else if (statusFilter === "COMPLETED") {
    where.status = "COMPLETED";
  } else if (statusFilter === "CANCELLED") {
    where.status = "CANCELLED";
  }

  if (paymentFilter === "CASH") {
    where.paymentMode = "CASH";
  } else if (paymentFilter === "ONLINE") {
    where.paymentMode = "ONLINE";
  }

  if (q) {
    where.OR = [
      { guestName: { contains: q, mode: "insensitive" } },
      { user: { name: { contains: q, mode: "insensitive" } } },
      { user: { phone: { contains: q, mode: "insensitive" } } },
      { ticket: { ticketNumber: { contains: q, mode: "insensitive" } } },
      { trip: { source: { name: { contains: q, mode: "insensitive" } } } },
      { trip: { destination: { name: { contains: q, mode: "insensitive" } } } },
    ];
  }


  const [bookings, totalCount, pendingCashCount, totalCollectedCount] = await Promise.all([
    db.booking.findMany({
      where,
      include: {
        trip: { include: { source: true, destination: true } },
        seat: true,
        user: { select: { id: true, name: true, phone: true } },
        ticket: true,
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.booking.count({ where }),
    db.booking.count({ where: { trip: { driverId }, paymentMode: "CASH", paymentStatus: "PENDING" } }),
    db.booking.count({ where: { trip: { driverId }, paymentStatus: "COLLECTED" } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const serialized = bookings.map((b) => ({
    id: b.id,
    guestName: b.guestName,
    guestPhone: b.user?.phone ?? null,
    user: b.user ? { id: b.user.id, name: b.user.name, phone: b.user.phone } : null,

    totalAmount: Number(b.totalAmount),
    paymentMode: b.paymentMode,
    paymentStatus: b.paymentStatus,
    status: b.status,
    createdAt: b.createdAt.toISOString(),
    seat: b.seat ? { id: b.seat.id, seatNumber: b.seat.seatNumber } : null,
    trip: {
      id: b.trip.id,
      sourceName: b.trip.source.name,
      destName: b.trip.destination.name,
      startTime: b.trip.startTime.toISOString(),
      status: b.trip.status,
    },
    ticket: b.ticket
      ? {
          id: b.ticket.id,
          ticketNumber: b.ticket.ticketNumber,
          status: b.ticket.status,
          issuedAt: b.ticket.issuedAt.toISOString(),
          usedAt: b.ticket.usedAt?.toISOString() ?? null,
        }
      : null,
  }));

  return (
    <DriverBookingsClient
      bookings={serialized}
      page={page}
      totalPages={totalPages}
      totalCount={totalCount}
      pageSize={pageSize}
      filters={{ q, status: statusFilter, payment: paymentFilter }}
      stats={{ pendingCashCount, totalCollectedCount, totalBookings: totalCount }}
    />
  );
}
