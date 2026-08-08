import { auth } from "@/auth";
import { db } from "@/lib/db";
import { TicketStatus, Prisma } from "@/generated/prisma/client";
import { redirect } from "next/navigation";
import { z } from "zod";
import { AdminTicketsClient } from "./tickets-client";

const statusSchema = z.enum(["ISSUED", "USED", "CANCELLED", "NO_SHOW"]);

export default async function AdminTicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login");

  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const pageSize = [20, 50, 100].includes(Number(params.pageSize)) ? Number(params.pageSize) : 20;
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const rawStatus = typeof params.status === "string" ? params.status : "";
  const date = typeof params.date === "string" ? params.date : "";
  const route = typeof params.route === "string" ? params.route.trim() : "";
  const paymentStatus = typeof params.paymentStatus === "string" ? params.paymentStatus : "";
  const driver = typeof params.driver === "string" ? params.driver.trim() : "";
  const tripId = typeof params.tripId === "string" ? params.tripId : "";
  const parsedStatus = statusSchema.safeParse(rawStatus);

  const filters: Prisma.TicketWhereInput[] = [];
  if (parsedStatus.success) filters.push({ status: parsedStatus.data as TicketStatus });
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const start = new Date(`${date}T00:00:00`);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    if (!Number.isNaN(start.getTime())) filters.push({ tripDate: { gte: start, lt: end } });
  }
  if (route) {
    filters.push({
      OR: [
        { source: { contains: route, mode: "insensitive" } },
        { destination: { contains: route, mode: "insensitive" } },
      ],
    });
  }
  if (paymentStatus) {
    filters.push({ booking: { paymentStatus: paymentStatus as never } });
  }
  if (driver || tripId) {
    filters.push({
      booking: {
        trip: {
          ...(driver ? { driverId: driver } : {}),
          ...(tripId ? { id: tripId } : {}),
        },
      },
    });
  }
  if (q) {
    filters.push({
      OR: [
        { ticketNumber: { contains: q, mode: "insensitive" } },
        { passengerName: { contains: q, mode: "insensitive" } },
        { passengerPhone: { contains: q, mode: "insensitive" } },
        { booking: { user: { name: { contains: q, mode: "insensitive" } } } },
      ],
    });
  }
  const where: Prisma.TicketWhereInput = filters.length ? { AND: filters } : {};

  const [tickets, totalCount, issuedCount, usedCount, cancelledCount] = await Promise.all([
    db.ticket.findMany({
      where,
      include: {
        booking: {
          select: {
            id: true,
            status: true,
            paymentMode: true,
            paymentStatus: true,
            user: { select: { name: true, phone: true } },
            trip: {
              select: {
                startTime: true,
                driver: { select: { name: true } },
              },
            },
            seat: { select: { seatNumber: true } },
          },
        },
      },
      orderBy: { issuedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.ticket.count({ where }),
    db.ticket.count({ where: { AND: [where, { status: "ISSUED" }] } }),
    db.ticket.count({ where: { AND: [where, { status: "USED" }] } }),
    db.ticket.count({ where: { AND: [where, { status: { in: ["CANCELLED", "NO_SHOW"] } }] } }),
  ]);

  const totalPages = Math.ceil(totalCount / pageSize);

  const serializedTickets = tickets.map((t: typeof tickets[number] & { usedAt?: Date | null }) => ({
    id: t.id,
    ticketNumber: t.ticketNumber,
    passengerName: t.passengerName,
    passengerPhone: t.passengerPhone,
    source: t.source,
    destination: t.destination,
    seatNumber: t.seatNumber,
    tripDate: t.tripDate.toISOString(),
    issuedAt: t.issuedAt.toISOString(),
    usedAt: t.usedAt ? new Date(t.usedAt).toISOString() : null,
    status: t.status,
    booking: {
      id: t.booking.id,
      status: t.booking.status,
      paymentMode: t.booking.paymentMode,
      paymentStatus: t.booking.paymentStatus,
      user: t.booking.user,
      trip: {
        startTime: t.booking.trip.startTime.toISOString(),
        driver: t.booking.trip.driver,
      },
      seat: t.booking.seat,
    },
  }));

  return (
    <AdminTicketsClient
      tickets={serializedTickets}
      page={page}
      pageSize={pageSize}
      totalPages={totalPages}
      totalCount={totalCount}
      issuedCount={issuedCount}
      usedCount={usedCount}
      cancelledCount={cancelledCount}
      filters={{
        q,
        status: parsedStatus.success ? parsedStatus.data : "",
        date,
        route,
        paymentStatus,
      }}
    />
  );
}
