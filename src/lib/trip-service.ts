import { db } from "./db";
import type { Prisma, TripStatus } from "@/generated/prisma/client";

const SEATS_CONFIG = [
  { number: "F1", type: "FRONT" as const, price: 250 },
  { number: "M1", type: "MIDDLE" as const, price: 250 },
  { number: "M2", type: "MIDDLE" as const, price: 250 },
  { number: "M3", type: "MIDDLE" as const, price: 250 },
  { number: "B1", type: "BACK" as const, price: 250 },
  { number: "B2", type: "BACK" as const, price: 250 },
];

export async function createTrip(
  driverId: string,
  vehicleId: string,
  sourceId: string,
  destinationId: string,
  startTime: Date
) {
  if (sourceId === destinationId) {
    throw new Error("Source and destination cannot be identical");
  }

  if (isNaN(startTime.getTime()) || startTime.getTime() <= Date.now()) {
    throw new Error("Trip departure time must be in the future");
  }

  const vehicle = await db.vehicle.findUnique({ where: { id: vehicleId } });
  if (!vehicle || !vehicle.isActive) {
    throw new Error("Selected vehicle is not active or available");
  }

  const todayCount = await db.trip.count({
    where: {
      sourceId,
      destinationId,
      startTime: {
        gte: new Date(startTime.getFullYear(), startTime.getMonth(), startTime.getDate()),
        lt: new Date(startTime.getFullYear(), startTime.getMonth(), startTime.getDate() + 1),
      },
    },
  });

  const trip = await db.trip.create({
    data: {
      driverId,
      vehicleId,
      sourceId,
      destinationId,
      startTime,
      tripSequence: todayCount + 1,
      seats: {
        create: SEATS_CONFIG.map((s) => ({
          seatNumber: s.number,
          seatType: s.type,
          price: s.price,
        })),
      },
    },
    include: {
      seats: true,
      source: true,
      destination: true,
    },
  });

  return trip;
}

export async function getTripWithAvailability(tripId: string) {
  const trip = await db.trip.findUnique({
    where: { id: tripId },
    include: {
      source: true,
      destination: true,
      driver: { select: { id: true, name: true, phone: true } },
      vehicle: true,
      seats: { orderBy: { seatNumber: "asc" } },
      bookings: {
        where: { status: { in: ["CONFIRMED", "COMPLETED"] } },
        select: { totalAmount: true },
      },
    },
  });
  if (!trip) throw new Error("Trip not found");

  const totalSeats = trip.seats.length;
  const bookedSeats = trip.seats.filter((s) => s.status === "BOOKED").length;
  const availableSeats = trip.seats.filter((s) => s.status === "AVAILABLE").length;

  return {
    ...trip,
    availability: {
      totalSeats,
      bookedSeats,
      availableSeats,
      occupancyPercent: totalSeats > 0 ? Math.round((bookedSeats / totalSeats) * 100) : 0,
    },
  };
}

export async function searchAvailableTrips(
  sourceId?: string,
  destId?: string,
  date?: string,
  minSeats: number = 1
) {
  const now = new Date();
  const lockCutoff = new Date(now.getTime() + 5 * 60 * 1000);

  const where: Prisma.TripWhereInput = {
    status: "SCHEDULED",
    manifestLocked: false,
    isCancelled: false,
    startTime: { gt: lockCutoff },
  };

  if (sourceId) where.sourceId = sourceId;
  if (destId) where.destinationId = destId;
  if (date) {
    const tripDate = new Date(date);
    where.startTime = {
      gte: new Date(tripDate.getFullYear(), tripDate.getMonth(), tripDate.getDate()),
      lt: new Date(tripDate.getFullYear(), tripDate.getMonth(), tripDate.getDate() + 1),
    };
  }

  where.seats = { some: { status: "AVAILABLE" } };

  const trips = await db.trip.findMany({
    where,
    include: {
      source: true,
      destination: true,
      driver: { select: { id: true, name: true } },
      vehicle: true,
      seats: true,
    },
    orderBy: [{ startTime: "asc" }, { id: "asc" }],
    take: 100,
  });

  return trips
    .map((trip) => {
      const available = trip.seats.filter((s) => s.status === "AVAILABLE").length;
      const booked = trip.seats.filter((s) => s.status === "BOOKED").length;
      return { ...trip, availableSeats: available, bookedSeats: booked, totalSeats: trip.seats.length };
    })
    .filter((trip) => trip.availableSeats >= minSeats);
}

export async function searchAvailableTripsPaginated(
  sourceId?: string,
  destId?: string,
  date?: string,
  q?: string,
  page: number = 1,
  pageSize: number = 9
) {
  const now = new Date();
  const lockCutoff = new Date(now.getTime() + 5 * 60 * 1000);
  const boundedPage = Math.max(1, Math.floor(page));
  const boundedPageSize = Math.min(100, Math.max(1, Math.floor(pageSize)));

  const where: Prisma.TripWhereInput = {
    status: "SCHEDULED",
    manifestLocked: false,
    isCancelled: false,
    startTime: { gt: lockCutoff },
    seats: { some: { status: "AVAILABLE" } },
  };

  if (sourceId) where.sourceId = sourceId;
  if (destId) where.destinationId = destId;
  if (date) {
    const tripDate = new Date(date);
    where.startTime = {
      gte: new Date(tripDate.getFullYear(), tripDate.getMonth(), tripDate.getDate()),
      lt: new Date(tripDate.getFullYear(), tripDate.getMonth(), tripDate.getDate() + 1),
    };
  }
  if (q) {
    where.OR = [
      { source: { name: { contains: q, mode: "insensitive" } } },
      { destination: { name: { contains: q, mode: "insensitive" } } },
      { driver: { name: { contains: q, mode: "insensitive" } } },
    ];
  }

  const [trips, totalCount] = await Promise.all([
    db.trip.findMany({
      where,
      include: {
        source: true,
        destination: true,
        driver: { select: { id: true, name: true } },
        vehicle: true,
        seats: true,
      },
      orderBy: [{ startTime: "asc" }, { id: "asc" }],
      skip: (boundedPage - 1) * boundedPageSize,
      take: boundedPageSize,
    }),
    db.trip.count({ where }),
  ]);

  const mapped = trips
    .map((trip) => {
      const available = trip.seats.filter((s) => s.status === "AVAILABLE").length;
      const booked = trip.seats.filter((s) => s.status === "BOOKED").length;
      return { ...trip, availableSeats: available, bookedSeats: booked, totalSeats: trip.seats.length };
    })
    .filter((trip) => trip.availableSeats >= 1);

  return { trips: mapped, totalCount, totalPages: Math.ceil(totalCount / boundedPageSize) };
}

export async function canStartTrip(tripId: string) {
  const trip = await db.trip.findUnique({
    where: { id: tripId },
    include: {
      seats: true,
      driver: { include: { driverProfile: true } },
      bookings: { where: { status: { in: ["CONFIRMED", "COMPLETED", "PENDING"] } } },
    },
  });
  if (!trip) throw new Error("Trip not found");

  const errors: string[] = [];
  const warnings: string[] = [];
  const totalSeats = trip.seats.length;
  const bookedSeats = trip.seats.filter((s) => s.status === "BOOKED").length;
  const lockedSeats = trip.seats.filter((s) => s.status === "LOCKED").length;

  if (trip.status !== "SCHEDULED") {
    errors.push(`Trip must be SCHEDULED (current status: ${trip.status})`);
  }

  if (!trip.driverId || !trip.driver) {
    errors.push("No driver partner assigned to this trip.");
  } else if (!trip.driver.isActive) {
    errors.push("Assigned driver account is inactive.");
  }

  if (lockedSeats > 0) {
    warnings.push(`${lockedSeats} seat(s) are currently locked in checkout. Auto-release will occur after timeout.`);
  }

  // Hard gate: 100% occupancy unless an admin override is approved.
  if (!trip.adminOverrideStart && bookedSeats < totalSeats) {
    errors.push(`Requires 100% occupancy before departure (${bookedSeats}/${totalSeats} booked). Request an Admin Override to depart with empty seats.`);
  }

  const uncollected = trip.bookings.filter((b) => b.paymentStatus === "PENDING").length;
  if (uncollected > 0) {
    warnings.push(`${uncollected} passenger payment(s) still pending (cash collected at boarding)`);
  }

  return {
    canStart: errors.length === 0,
    errors,
    warnings,
    bookedSeats,
    totalSeats,
    lockedSeats,
    emptySeats: totalSeats - bookedSeats,
    hasDriver: !!trip.driverId,
    driverName: trip.driver?.name ?? null,
    driverPhone: trip.driver?.phone ?? null,
    driverKyc: trip.driver?.driverProfile?.kycStatus ?? "NOT_SUBMITTED",
    adminOverrideStart: trip.adminOverrideStart,
    overrideReason: trip.overrideReason,
    collectedPayments: trip.bookings.filter((b) => b.paymentStatus === "COLLECTED").length,
    pendingPayments: uncollected,
  };
}

export async function updateTripGpsLocation(tripId: string, lat: number, lng: number) {
  if (!tripId || typeof lat !== "number" || typeof lng !== "number") {
    throw new Error("Invalid GPS coordinates or trip ID.");
  }
  return db.trip.update({
    where: { id: tripId },
    data: {
      currentLat: lat,
      currentLong: lng,
      lastLocationUpdate: new Date(),
    },
  });
}


export async function startTrip(tripId: string) {
  return db.$transaction(async (tx) => {
    const trip = await tx.trip.findUnique({
      where: { id: tripId },
      include: { seats: true },
    });
    if (!trip) throw new Error("Trip not found");
    if (trip.status !== "SCHEDULED") {
      throw new Error(`Cannot start a trip with status "${trip.status}".`);
    }
    if (trip.startTime > new Date()) {
      throw new Error("A trip cannot start before its scheduled departure time.");
    }

    // Enforce the occupancy gate atomically (100% booked unless an admin override is approved).
    const totalSeats = trip.seats.length;
    const bookedSeats = trip.seats.filter((s) => s.status === "BOOKED").length;
    if (!trip.adminOverrideStart && bookedSeats < totalSeats) {
      throw new Error(
        `Trip requires 100% occupancy before departure (booked ${bookedSeats}/${totalSeats}). Request an admin override to depart with empty seats.`
      );
    }

    const startResult = await tx.trip.updateMany({
      where: { id: tripId, status: "SCHEDULED" },
      data: {
        status: "IN_PROGRESS",
        manifestLocked: true,
        actualStartTime: new Date(),
      },
    });

    if (startResult.count === 0) {
      throw new Error("Trip could not be started or was already updated concurrently.");
    }

    return tx.trip.findUniqueOrThrow({ where: { id: tripId } });
  });
}

export async function completeTrip(tripId: string) {
  return db.$transaction(async (tx) => {
    const trip = await tx.trip.findUnique({
      where: { id: tripId },
      include: {
        bookings: { where: { status: { in: ["CONFIRMED", "PENDING", "COMPLETED"] } } },
        driver: true,
      },
    });
    if (!trip) throw new Error("Trip not found");
    if (trip.status !== "IN_PROGRESS") {
      throw new Error(`Cannot complete a trip with status "${trip.status}".`);
    }

    const completeResult = await tx.trip.updateMany({
      where: { id: tripId, status: "IN_PROGRESS" },
      data: {
        status: "COMPLETED",
        actualEndTime: new Date(),
      },
    });

    if (completeResult.count === 0) {
      throw new Error("Trip could not be completed or was already completed concurrently.");
    }

    const updatedTrip = await tx.trip.findUniqueOrThrow({ where: { id: tripId } });

    // Confirmed bookings → COMPLETED
    await tx.booking.updateMany({
      where: { tripId, status: "CONFIRMED" },
      data: { status: "COMPLETED" },
    });

    // Remaining PENDING bookings → NO_SHOW (held seat, never paid/boarded); release their seats
    const noShowBookings = trip.bookings.filter((b) => b.status === "PENDING");
    await tx.booking.updateMany({
      where: { tripId, status: "PENDING" },
      data: {
        status: "NO_SHOW",
        cancellationReason: "No-show: payment not collected before trip completion",
        cancelledAt: new Date(),
      },
    });
    if (noShowBookings.length > 0) {
      await tx.tripSeat.updateMany({
        where: { id: { in: noShowBookings.map((b) => b.seatId) }, status: { in: ["LOCKED", "BOOKED"] } },
        data: { status: "AVAILABLE", lockedAt: null, bookedByUserId: null, guestName: null },
      });
    }

    // Tickets for no-show bookings → NO_SHOW
    await tx.ticket.updateMany({
      where: { booking: { tripId, status: "NO_SHOW" }, status: { in: ["ISSUED", "USED"] } },
      data: { status: "NO_SHOW" },
    });

    // Tickets for completed bookings → USED
    await tx.ticket.updateMany({
      where: { booking: { tripId, status: "COMPLETED" }, status: "ISSUED" },
      data: { status: "USED" },
    });

    return updatedTrip;
  });
}

export async function cancelTrip(tripId: string, reason?: string) {
  if (!tripId) throw new Error("Trip ID is required.");

  return db.$transaction(async (tx) => {
    const existing = await tx.trip.findUnique({
      where: { id: tripId },
      include: {
        bookings: {
          where: { status: { in: ["PENDING", "CONFIRMED"] } },
          select: { id: true, seatId: true, status: true, paymentStatus: true, totalAmount: true, commissionAmount: true },
        },
      },
    });
    if (!existing) throw new Error("Trip not found.");
    if (existing.status === "COMPLETED") {
      throw new Error("Cannot cancel a trip that is already completed.");
    }
    if (existing.status === "IN_PROGRESS") {
      throw new Error("Cannot cancel a trip that is already in progress.");
    }
    if (existing.status === "CANCELLED" || existing.isCancelled) {
      throw new Error("This trip is already cancelled.");
    }

    const trip = await tx.trip.update({
      where: { id: tripId },
      data: {
        status: "CANCELLED",
        isCancelled: true,
        cancellationReason: reason || "Cancelled by operator",
      },
    });

    const bookingIds = existing.bookings.map((booking) => booking.id);
    const seatIds = existing.bookings.map((booking) => booking.seatId);

    await tx.booking.updateMany({
      where: { id: { in: bookingIds }, status: { in: ["PENDING", "CONFIRMED"] } },
      data: {
        status: "CANCELLED",
        cancellationReason: reason || "Trip cancelled by operator",
        cancelledAt: new Date(),
      },
    });

    await tx.tripSeat.updateMany({
      where: { tripId, status: { in: ["LOCKED", "BOOKED"] } },
      data: { status: "AVAILABLE", lockedAt: null, bookedByUserId: null, guestName: null },
    });

    if (bookingIds.length > 0) {
      await tx.ticket.updateMany({
        where: { bookingId: { in: bookingIds }, status: { in: ["ISSUED", "USED"] } },
        data: { status: "CANCELLED" },
      });
    }

    // Reverse driver wallet credits for bookings that had already been collected
    if (existing.driverId) {
      const collectedBookings = existing.bookings.filter((b) => b.paymentStatus === "COLLECTED");
      let totalReversal = 0;
      if (collectedBookings.length > 0) {
        const bookingIds = collectedBookings.map((b) => b.id);
        const existingReversals = await tx.walletTransaction.findMany({
          where: {
            driverId: existing.driverId,
            referenceId: { in: bookingIds },
            transactionType: "ADJUSTMENT",
          },
          select: { referenceId: true },
        });
        const existingRefIds = new Set(existingReversals.map((r) => r.referenceId));

        // BUG-022 FIX: replace N individual creates with a single createMany
        const newTransactions = collectedBookings
          .filter(b => !existingRefIds.has(b.id) && (Number(b.totalAmount) - Number(b.commissionAmount)) > 0)
          .map(b => {
            const netEarnings = Number(b.totalAmount) - Number(b.commissionAmount);
            totalReversal += netEarnings;
            return {
              driverId: existing.driverId!,
              amount: -netEarnings,
              transactionType: "ADJUSTMENT",
              description: `Reversal: trip cancelled (booking #${b.id.slice(0, 8)})`,
              referenceId: b.id,
            };
          });
        if (newTransactions.length > 0) {
          await tx.walletTransaction.createMany({ data: newTransactions });
        }
      }
      if (totalReversal > 0) {
        await tx.driverProfile.updateMany({
          where: { userId: existing.driverId },
          data: {
            totalEarnings: { decrement: totalReversal },
            walletBalance: { decrement: totalReversal },
          },
        });
      }
    }

    return trip;
  });
}

export async function getDriverTrips(
  driverId: string,
  status?: string,
  page?: number,
  pageSize?: number,
  q?: string
) {
  const skip = page && pageSize ? (page - 1) * pageSize : undefined;
  const take = page && pageSize ? pageSize : undefined;

  const where: Prisma.TripWhereInput = {
    driverId,
    ...(status ? { status: status as TripStatus } : {}),
  };

  if (q) {
    where.OR = [
      { source: { name: { contains: q, mode: "insensitive" } } },
      { destination: { name: { contains: q, mode: "insensitive" } } },
      { vehicle: { regNumber: { contains: q, mode: "insensitive" } } },
    ];
  }

  const [trips, totalCount] = await Promise.all([
    db.trip.findMany({
      where,
      include: {
        source: true,
        destination: true,
        vehicle: true,
        _count: { select: { bookings: true } },
      },
      orderBy: { startTime: "asc" },
      skip,
      take,
    }),
    db.trip.count({ where }),
  ]);

  if (page && pageSize) {
    return { trips, totalCount, totalPages: Math.ceil(totalCount / pageSize) };
  }
  return trips;
}
