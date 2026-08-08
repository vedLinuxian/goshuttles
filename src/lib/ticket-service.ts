import { Prisma } from "@/generated/prisma/client";
import { db } from "./db";

type TransactionClient = Prisma.TransactionClient;

export function generateTicketNumber(date: Date = new Date()): string {
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
  const seq = Math.floor(100000 + Math.random() * 900000).toString();
  return `TKT-${dateStr}-${seq}`;
}

export interface IssueTicketParams {
  bookingId: string;
  passengerName: string;
  passengerPhone: string | null;
  tripDate: Date;
  source: string;
  destination: string;
  seatNumber: string;
  ticketPrice: number;
  status?: "ISSUED" | "USED";
}

export async function issueTicket(tx: TransactionClient, params: IssueTicketParams) {
  const existing = await tx.ticket.findUnique({ where: { bookingId: params.bookingId } });
  if (existing && existing.status !== "CANCELLED") return existing;

  let lastError: unknown;
  for (let attempt = 0; attempt < 5; attempt++) {
    const ticketNumber = generateTicketNumber(params.tripDate);
    try {
      if (existing) {
        return await tx.ticket.update({
          where: { id: existing.id },
          data: {
            ticketNumber,
            passengerName: params.passengerName,
            passengerPhone: params.passengerPhone,
            tripDate: params.tripDate,
            source: params.source,
            destination: params.destination,
            seatNumber: params.seatNumber,
            ticketPrice: params.ticketPrice,
            status: params.status ?? "ISSUED",
            issuedAt: new Date(),
          },
        });
      }

      return await tx.ticket.create({
        data: {
          bookingId: params.bookingId,
          ticketNumber,
          passengerName: params.passengerName,
          passengerPhone: params.passengerPhone,
          tripDate: params.tripDate,
          source: params.source,
          destination: params.destination,
          seatNumber: params.seatNumber,
          ticketPrice: params.ticketPrice,
          status: params.status ?? "ISSUED",
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        lastError = err;
        continue;
      }
      throw err;
    }
  }

  throw new Error(`Failed to issue a unique ticket. ${lastError instanceof Error ? lastError.message : ""}`);
}

export async function getTicketById(ticketId: string) {
  if (!ticketId) return null;
  const ticket = await db.ticket.findUnique({
    where: { id: ticketId },
    include: {
      booking: {
        include: {
          trip: { include: { source: true, destination: true, vehicle: true, driver: true } },
          seat: true,
          user: { select: { id: true, name: true, phone: true } },
        },
      },
    },
  });

  if (!ticket) return null;

  const companionBookings = await db.booking.findMany({
    where: {
      userId: ticket.booking.userId,
      tripId: ticket.booking.tripId,
      status: { in: ["PENDING", "CONFIRMED", "COMPLETED"] },
    },
    include: { seat: true },
    orderBy: { createdAt: "asc" },
  });

  const groupSeats = companionBookings.map((b) => b.seat?.seatNumber).filter(Boolean) as string[];
  const groupRoster = companionBookings.map((b) => ({
    seatNumber: b.seat?.seatNumber || "",
    passengerName: b.guestName || "Passenger",
  }));
  const totalGroupFare = companionBookings.reduce((sum, b) => sum + Number(b.totalAmount), 0);

  return {
    ...ticket,
    groupSeats: groupSeats.length > 0 ? groupSeats : [ticket.seatNumber],
    groupRoster,
    totalGroupFare: totalGroupFare > 0 ? totalGroupFare : Number(ticket.ticketPrice),
  };
}

export async function getPassengerTickets(userId: string) {
  if (!userId) return [];
  return db.ticket.findMany({
    where: { booking: { userId } },
    include: {
      booking: {
        include: {
          trip: { include: { source: true, destination: true } },
          seat: true,
        },
      },
    },
    orderBy: { issuedAt: "desc" },
  });
}

export interface VerifyBoardingTicketParams {
  ticketNumber?: string;
  bookingId?: string;
  tripId: string;
  driverId: string;
  isAdmin?: boolean;
}

export async function verifyBoardingTicket(params: VerifyBoardingTicketParams) {
  const { ticketNumber, bookingId, tripId, driverId, isAdmin } = params;
  if (!ticketNumber && !bookingId) {
    throw new Error("Either ticketNumber or bookingId is required.");
  }
  if (!tripId || !driverId) {
    throw new Error("Trip ID and User ID are required.");
  }

  return db.$transaction(async (tx) => {
    const ticket = await tx.ticket.findFirst({
      where: ticketNumber ? { ticketNumber } : { bookingId },
      include: {
        booking: {
          include: {
            trip: {
              include: { source: true, destination: true },
            },
            seat: true,
            user: { select: { id: true, name: true, phone: true } },
          },
        },
      },
    });

    if (!ticket) throw new Error("Boarding pass not found.");
    if (ticket.booking.trip.id !== tripId) {
      throw new Error("This boarding pass does not belong to the specified trip.");
    }
    if (!isAdmin && ticket.booking.trip.driverId !== driverId) {
      throw new Error("This boarding pass does not belong to your assigned trip.");
    }
    if (ticket.booking.trip.status !== "IN_PROGRESS") {
      throw new Error("Boarding passes can only be verified while the shuttle trip is IN_PROGRESS.");
    }
    if (ticket.booking.status !== "CONFIRMED" && ticket.booking.status !== "COMPLETED") {
      throw new Error("This booking is not eligible for boarding.");
    }
    if (ticket.status === "CANCELLED" || ticket.status === "NO_SHOW") {
      throw new Error(`Boarding pass is ${ticket.status} and cannot be verified.`);
    }

    if (ticket.status === "USED") {
      return { ticket, alreadyUsed: true };
    }

    const now = new Date();
    const update = await tx.ticket.updateMany({
      where: { id: ticket.id, status: "ISSUED" },
      data: { status: "USED", usedAt: now },
    });

    if (update.count === 0) {
      return { ticket, alreadyUsed: true };
    }

    return { ticket: { ...ticket, status: "USED" as const, usedAt: now }, alreadyUsed: false };
  });
}

