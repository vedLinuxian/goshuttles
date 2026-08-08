import { db } from "./db";
import { BookingStatus, Prisma } from "@/generated/prisma/client";

// ============================================================
// REUSABLE ANALYTICS AGGREGATION QUERIES
// ============================================================

export async function getRevenueStats(from?: Date, to?: Date) {
  const where = {
    status: "COMPLETED" as const,
    ...(from || to ? {
      createdAt: {
        ...(from ? { gte: from } : {}),
        ...(to ? { lte: to } : {}),
      },
    } : {}),
  };

  const [total, totalCommission] = await Promise.all([
    db.booking.aggregate({ _sum: { totalAmount: true }, where }),
    db.booking.aggregate({ _sum: { commissionAmount: true }, where }),
  ]);

  return {
    totalRevenue: total._sum.totalAmount ? Number(total._sum.totalAmount) : 0,
    totalCommission: totalCommission._sum.commissionAmount ? Number(totalCommission._sum.commissionAmount) : 0,
  };
}

export async function getTripStats(from?: Date, to?: Date) {
  const where = {
    ...(from || to ? {
      startTime: {
        ...(from ? { gte: from } : {}),
        ...(to ? { lte: to } : {}),
      },
    } : {}),
  };

  const [scheduled, inProgress, completed, cancelled, total] = await Promise.all([
    db.trip.count({ where: { ...where, status: "SCHEDULED" } }),
    db.trip.count({ where: { ...where, status: "IN_PROGRESS" } }),
    db.trip.count({ where: { ...where, status: "COMPLETED" } }),
    db.trip.count({ where: { ...where, status: "CANCELLED" } }),
    db.trip.count({ where }),
  ]);

  return { scheduled, inProgress, completed, cancelled, total };
}

export async function getActiveDriversCount() {
  return db.driverProfile.count({ where: { isAvailable: true } });
}

export async function getTotalPassengersCount() {
  return db.user.count({ where: { role: "CUSTOMER" } });
}

export async function getOccupancyRate() {
  // Efficient SQL aggregation — avoids pulling all seats into Node.js memory
  const result = await db.$queryRaw<[{ avg_occupancy: string | null }]>`
    SELECT
      AVG(
        CASE WHEN total_seats > 0
          THEN CAST(booked_seats AS FLOAT) / total_seats
          ELSE 0
        END
      ) AS avg_occupancy
    FROM (
      SELECT
        t.id,
        COUNT(ts.id)                                         AS total_seats,
        COUNT(CASE WHEN ts.status = 'BOOKED' THEN 1 END)    AS booked_seats
      FROM trips t
      JOIN trip_seats ts ON ts.trip_id = t.id
      WHERE t.status IN ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED')
      GROUP BY t.id
    ) sub
  `;

  const avg = result[0]?.avg_occupancy;
  if (avg === null || avg === undefined) return 0;
  return Math.round(Number(avg) * 10000) / 100; // percentage to 2 decimal places
}

export async function getDriverPerformance(from?: Date, to?: Date) {
  const drivers = await db.driverProfile.findMany({
    select: {
      userId: true,
      kycStatus: true,
      rating: true,
      walletBalance: true,
      isAvailable: true,
      user: {
        select: {
          id: true,
          name: true,
          assignedTrips: {
            where: {
              status: "COMPLETED" as const,
              ...(from || to ? {
                startTime: {
                  ...(from ? { gte: from } : {}),
                  ...(to ? { lte: to } : {}),
                },
              } : {}),
            },
            select: {
              id: true,
              bookings: {
                where: { status: "COMPLETED" as const },
                select: { totalAmount: true, commissionAmount: true },
              },
            },
          },
          reviewsAsDriver: {
            select: { driverRating: true },
          },
        },
      },
    },
  });

  return drivers
    .map((dp) => {
      const completedTrips = dp.user.assignedTrips.length;
      const totalEarnings = dp.user.assignedTrips.reduce(
        (sum, t) =>
          sum +
          t.bookings.reduce(
            (bs, b) => bs + Number(b.totalAmount) - Number(b.commissionAmount),
            0
          ),
        0
      );

      const ratings = dp.user.reviewsAsDriver
        .map((r) => r.driverRating)
        .filter((r): r is number => r !== null);
      const avgRating =
        ratings.length > 0
          ? ratings.reduce((s, r) => s + r, 0) / ratings.length
          : 0;

      return {
        driverId: dp.user.id,
        driverName: dp.user.name || "Unknown",
        kycStatus: dp.kycStatus,
        rating: Number(dp.rating),
        avgDriverRating: Math.round(avgRating * 10) / 10,
        completedTrips,
        totalEarnings: Math.round(totalEarnings * 100) / 100,
        walletBalance: Number(dp.walletBalance),
        isAvailable: dp.isAvailable,
      };
    })
    .sort((a, b) => b.completedTrips - a.completedTrips);
}

export async function getRoutePopularity(from?: Date, to?: Date) {
  const statusFilter: BookingStatus[] = ["CONFIRMED", "COMPLETED"];
  const where: Prisma.TripWhereInput = {};
  if (from || to) {
    where.startTime = {
      ...(from ? { gte: from } : {}),
      ...(to ? { lte: to } : {}),
    };
  }

  const trips = await db.trip.findMany({
    where,
    select: {
      id: true,
      source: { select: { name: true } },
      destination: { select: { name: true } },
      bookings: {
        where: { status: { in: statusFilter } },
        select: { id: true },
      },
    },
  });

  const routeMap = new Map<string, { source: string; destination: string; trips: number; bookings: number }>();

  for (const trip of trips) {
    const key = `${trip.source.name} → ${trip.destination.name}`;
    const existing = routeMap.get(key);
    if (existing) {
      existing.trips += 1;
      existing.bookings += trip.bookings.length;
    } else {
      routeMap.set(key, {
        source: trip.source.name,
        destination: trip.destination.name,
        trips: 1,
        bookings: trip.bookings.length,
      });
    }
  }

  return Array.from(routeMap.values()).sort((a, b) => b.bookings - a.bookings);
}

export async function getDailyBookings(days: number = 30) {
  const from = new Date();
  from.setDate(from.getDate() - days);
  from.setHours(0, 0, 0, 0);

  const bookings = await db.booking.findMany({
    where: { createdAt: { gte: from } },
    select: { createdAt: true },
  });

  // Build a map of date -> count
  const dayMap = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    const d = new Date(from);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    dayMap.set(key, 0);
  }

  for (const b of bookings) {
    const key = b.createdAt.toISOString().slice(0, 10);
    dayMap.set(key, (dayMap.get(key) || 0) + 1);
  }

  return Array.from(dayMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));
}

export async function getRevenueByDay(days: number = 7) {
  const from = new Date();
  from.setDate(from.getDate() - days);
  from.setHours(0, 0, 0, 0);

  const bookings = await db.booking.findMany({
    where: {
      createdAt: { gte: from },
      status: "COMPLETED" as const,
    },
    select: { totalAmount: true, createdAt: true },
  });

  const dayMap = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    const d = new Date(from);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    dayMap.set(key, 0);
  }

  for (const b of bookings) {
    const key = b.createdAt.toISOString().slice(0, 10);
    dayMap.set(key, (dayMap.get(key) || 0) + Number(b.totalAmount));
  }

  return Array.from(dayMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, revenue]) => ({ date, revenue }));
}

export async function getPaymentBreakdown(from?: Date, to?: Date) {
  const statusFilter = ["CONFIRMED", "COMPLETED"] as BookingStatus[];
  const whereBase: Prisma.BookingWhereInput = {
    status: { in: statusFilter },
  };
  if (from || to) {
    whereBase.createdAt = {
      ...(from ? { gte: from } : {}),
      ...(to ? { lte: to } : {}),
    };
  }

  const [cashCount, onlineCount, cashAmount, onlineAmount] = await Promise.all([
    db.booking.count({ where: { ...whereBase, paymentMode: "CASH" } }),
    db.booking.count({ where: { ...whereBase, paymentMode: "ONLINE" } }),
    db.booking.aggregate({ _sum: { totalAmount: true }, where: { ...whereBase, paymentMode: "CASH" } }),
    db.booking.aggregate({ _sum: { totalAmount: true }, where: { ...whereBase, paymentMode: "ONLINE" } }),
  ]);

  const cashSum = cashAmount._sum?.totalAmount;
  const onlineSum = onlineAmount._sum?.totalAmount;

  return {
    cash: { count: cashCount, amount: cashSum ? Number(cashSum) : 0 },
    online: { count: onlineCount, amount: onlineSum ? Number(onlineSum) : 0 },
  };
}

export async function getRecentBookings(limit: number = 10) {
  return db.booking.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { name: true, phone: true } },
      trip: { include: { source: true, destination: true } },
      seat: { select: { seatNumber: true, seatType: true } },
    },
  });
}

export async function getUpcomingTrips(hours: number = 24) {
  const now = new Date();
  const end = new Date(now.getTime() + hours * 60 * 60 * 1000);

  return db.trip.findMany({
    where: {
      startTime: { gte: now, lte: end },
      status: { in: ["SCHEDULED" as const] },
      isCancelled: false,
    },
    include: {
      source: { select: { name: true } },
      destination: { select: { name: true } },
      driver: { select: { name: true } },
      vehicle: { select: { regNumber: true, modelName: true } },
      _count: { select: { bookings: true, seats: true } },
    },
    orderBy: { startTime: "asc" },
    take: 20,
  });
}

export async function getDriverSettlements(
  page: number = 1,
  pageSize: number = 20,
  statusFilter?: "PENDING" | "SETTLED"
) {
  const where = statusFilter ? { status: statusFilter } : {};

  const [settlements, total] = await Promise.all([
    db.driverSettlement.findMany({
      where,
      include: {
        driver: {
          select: { id: true, name: true, phone: true },
        },
      },
      orderBy: { periodStart: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.driverSettlement.count({ where }),
  ]);

  return {
    settlements: settlements.map((s) => ({
      ...s,
      totalCashCollected: Number(s.totalCashCollected),
      commissionDue: Number(s.commissionDue),
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function settleDriverSettlement(settlementId: string) {
  return db.$transaction(async (tx) => {
    const settlement = await tx.driverSettlement.findUnique({
      where: { id: settlementId },
    });

    if (!settlement) {
      throw new Error("Settlement not found");
    }
    if (settlement.status !== "PENDING") {
      return settlement;
    }

    const updateRes = await tx.driverSettlement.updateMany({
      where: { id: settlementId, status: "PENDING" },
      data: { status: "SETTLED", settledAt: new Date() },
    });

    if (updateRes.count === 0) {
      return tx.driverSettlement.findUniqueOrThrow({ where: { id: settlementId } });
    }

    const existingTx = await tx.walletTransaction.findFirst({
      where: { driverId: settlement.driverId, referenceId: settlementId, transactionType: "SETTLEMENT" },
    });

    if (!existingTx) {
      const netSettlement = Number(settlement.totalCashCollected) - Number(settlement.commissionDue);
      await tx.walletTransaction.create({
        data: {
          driverId: settlement.driverId,
          amount: netSettlement,
          transactionType: "SETTLEMENT",
          description: `Settlement for period ${settlement.periodStart.toISOString().slice(0, 10)} → ${settlement.periodEnd.toISOString().slice(0, 10)}`,
          referenceId: settlementId,
        },
      });
    }

    return tx.driverSettlement.findUniqueOrThrow({ where: { id: settlementId } });
  });
}

export async function getDriverWalletTransactions(driverId: string, limit: number = 50) {
  return db.walletTransaction.findMany({
    where: { driverId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getCommissionSummary() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [allTime, thisMonth] = await Promise.all([
    db.$queryRaw<[{ total: number | null }]>`SELECT SUM("commission_earned")::float8 AS total FROM "platform_ledgers"`,
    db.$queryRaw<[{ total: number | null }]>`SELECT SUM("commission_earned")::float8 AS total FROM "platform_ledgers" WHERE "created_at" >= ${monthStart}`,
  ]);

  return {
    totalCommission: Number(allTime[0]?.total ?? 0),
    thisMonthCommission: Number(thisMonth[0]?.total ?? 0),
  };
}
