import { db } from "./db";
import type { Prisma } from "@/generated/prisma/client";

export type AdminTripListParams = {
  page?: number;
  pageSize?: number;
  q?: string;
  status?: string;
  date?: string;
  readiness?: "READY" | "AT_RISK" | "NO_DRIVER" | "PAYMENT_REVIEW" | "TICKET_GAP";
};

function dateRange(date?: string) {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return undefined;
  const start = new Date(`${date}T00:00:00`);
  if (Number.isNaN(start.getTime())) return undefined;
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { gte: start, lt: end };
}

function readinessWhere(readiness?: AdminTripListParams["readiness"]): Prisma.TripWhereInput | undefined {
  if (!readiness) return undefined;

  const noDriver: Prisma.TripWhereInput = { driver: null };
  const paymentReview: Prisma.TripWhereInput = {
    bookings: { some: { paymentVerification: { status: "PENDING" } } },
  };
  const ticketGap: Prisma.TripWhereInput = {
    bookings: {
      some: {
        status: { in: ["CONFIRMED", "COMPLETED"] },
        ticket: null,
      },
    },
  };
  const ready: Prisma.TripWhereInput = {
    manifestLocked: false,
    driver: {
      is: {
        isActive: true,
        driverProfile: { is: { kycStatus: "APPROVED" } },
      },
    },
    bookings: {
      none: {
        OR: [
          { status: "PENDING", paymentMode: "CASH" },
          { paymentVerification: { status: "PENDING" } },
          { status: { in: ["CONFIRMED", "COMPLETED"] }, ticket: null },
        ],
      },
    },
    seats: { none: { status: { in: ["AVAILABLE", "LOCKED"] } } },
  };

  if (readiness === "NO_DRIVER") return noDriver;
  if (readiness === "PAYMENT_REVIEW") return paymentReview;
  if (readiness === "TICKET_GAP") return ticketGap;
  if (readiness === "READY") return ready;

  return {
    AND: [
      { NOT: noDriver },
      { NOT: paymentReview },
      { NOT: ticketGap },
      { NOT: ready },
    ],
  };
}

export async function getAdminTripList(params: AdminTripListParams = {}) {
  const page = Math.max(1, params.page || 1);
  const pageSize = Math.min(100, Math.max(10, params.pageSize || 20));
  const where: Prisma.TripWhereInput = {};
  if (["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"].includes(params.status || "")) where.status = params.status as Prisma.TripWhereInput["status"];
  const range = dateRange(params.date);
  if (range) where.startTime = range;
  if (params.q) where.OR = [{ source: { name: { contains: params.q, mode: "insensitive" } } }, { destination: { name: { contains: params.q, mode: "insensitive" } } }, { driver: { name: { contains: params.q, mode: "insensitive" } } }, { vehicle: { regNumber: { contains: params.q, mode: "insensitive" } } }];
  const readiness = readinessWhere(params.readiness);
  if (readiness) where.AND = [readiness];

  const [trips, total] = await Promise.all([
    db.trip.findMany({
      where,
      include: {
        source: true,
        destination: true,
        driver: { select: { id: true, name: true, phone: true, isActive: true, driverProfile: { select: { kycStatus: true, isAvailable: true } } } },
        vehicle: { select: { id: true, regNumber: true, modelName: true, capacity: true, isActive: true } },
        seats: { select: { status: true, price: true } },
        bookings: { select: { id: true, status: true, paymentMode: true, paymentStatus: true, totalAmount: true, ticket: { select: { status: true } }, paymentVerification: { select: { status: true } } } },
      },
      orderBy: [{ startTime: "asc" }, { tripSequence: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.trip.count({ where }),
  ]);

  const mapped = trips.map((trip) => {
    const seats = { total: trip.seats.length, available: 0, locked: 0, booked: 0 };
    for (const seat of trip.seats) seats[seat.status.toLowerCase() as "available" | "locked" | "booked"]++;
    const bookings = { pending: 0, confirmed: 0, completed: 0, cancelled: 0, noShow: 0 };
    let gross = 0; let collected = 0; let pendingCash = 0; let pendingOnline = 0; let paymentProofs = 0; let ticketsIssued = 0; let ticketsUsed = 0; let ticketGaps = 0;
    for (const booking of trip.bookings) {
      const key = booking.status === "NO_SHOW" ? "noShow" : booking.status.toLowerCase() as keyof typeof bookings;
      bookings[key]++;
      const activeFinancialBooking = ["PENDING", "CONFIRMED", "COMPLETED"].includes(booking.status);
      if (activeFinancialBooking) gross += Number(booking.totalAmount);
      if (activeFinancialBooking && booking.paymentStatus === "COLLECTED") collected += Number(booking.totalAmount);
      if (booking.status === "PENDING" && booking.paymentMode === "CASH") pendingCash += Number(booking.totalAmount);
      if (booking.status === "PENDING" && booking.paymentMode === "ONLINE" && booking.paymentVerification?.status === "PENDING") pendingOnline += Number(booking.totalAmount);
      if (booking.paymentVerification?.status === "PENDING") paymentProofs++;
      if (booking.ticket?.status === "ISSUED") ticketsIssued++;
      if (booking.ticket?.status === "USED") ticketsUsed++;
      if (["CONFIRMED", "COMPLETED"].includes(booking.status) && !booking.ticket) ticketGaps++;
    }
    const alerts: string[] = [];
    if (!trip.driver) alerts.push("NO_DRIVER");
    if (trip.driver && (!trip.driver.isActive || trip.driver.driverProfile?.kycStatus !== "APPROVED")) alerts.push("DRIVER_NOT_READY");
    if (paymentProofs > 0) alerts.push("PAYMENT_REVIEW");
    if (pendingCash > 0) alerts.push("CASH_PENDING");
    if (ticketGaps > 0) alerts.push("TICKET_GAP");
    if (trip.status === "SCHEDULED" && seats.booked < seats.total && !trip.adminOverrideStart) alerts.push("LOW_OCCUPANCY");
    if (trip.manifestLocked) alerts.push("MANIFEST_LOCKED");
    const readiness = alerts.length === 0 ? "READY" : alerts.includes("NO_DRIVER") ? "NO_DRIVER" : alerts.includes("PAYMENT_REVIEW") ? "PAYMENT_REVIEW" : alerts.includes("TICKET_GAP") ? "TICKET_GAP" : "AT_RISK";
    return { id: trip.id, startTime: trip.startTime.toISOString(), status: trip.status, manifestLocked: trip.manifestLocked, tripSequence: trip.tripSequence, source: trip.source.name, destination: trip.destination.name, driver: trip.driver ? { id: trip.driver.id, name: trip.driver.name, phone: trip.driver.phone, isActive: trip.driver.isActive, kycStatus: trip.driver.driverProfile?.kycStatus || "PENDING", isAvailable: trip.driver.driverProfile?.isAvailable ?? false } : null, vehicle: trip.vehicle, seats, bookings, payments: { gross, collected, pendingCash, pendingOnline, paymentProofs }, tickets: { issued: ticketsIssued, used: ticketsUsed, gaps: ticketGaps }, alerts, readiness };
  });

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  return { trips: mapped, total, page: safePage, pageSize, totalPages };
}

export async function getAdminTripSummary() {
  const [today, inProgress, scheduled, cancelled, pendingPayments, ticketGaps] = await Promise.all([
    db.trip.count({ where: { startTime: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } } }),
    db.trip.count({ where: { status: "IN_PROGRESS" } }),
    db.trip.count({ where: { status: "SCHEDULED", startTime: { gt: new Date() } } }),
    db.trip.count({ where: { status: "CANCELLED" } }),
    db.paymentVerification.count({ where: { status: "PENDING" } }),
    db.booking.count({ where: { status: { in: ["CONFIRMED", "COMPLETED"] }, ticket: null } }),
  ]);
  return { today, inProgress, scheduled, cancelled, pendingPayments, ticketGaps };
}
