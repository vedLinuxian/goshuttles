import { db } from "./db";
import { getPricingConfig } from "./pricing-service";
import { settleDriverSettlement } from "./analytics-queries";

export { settleDriverSettlement as settleDriverPayout };

export async function calculateCommission(totalAmount: number) {
  if (typeof totalAmount !== "number" || isNaN(totalAmount) || totalAmount < 0) {
    throw new Error("Total amount must be a non-negative number.");
  }
  const config = await getPricingConfig();
  const rate = Number(config.commissionRate);
  return {
    amount: totalAmount * (rate / 100),
    rate,
  };
}

export async function getDriverEarnings(
  driverId: string,
  period: string = "month",
  page?: number,
  pageSize?: number
) {
  const now = new Date();
  let startDate: Date;

  switch (period) {
    case "today":
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case "week":
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "year":
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  const requestedPage = Number.isFinite(page) && page && page > 0 ? Math.floor(page) : 1;
  const requestedPageSize = Number.isFinite(pageSize) && pageSize && pageSize > 0 ? Math.floor(pageSize) : 25;
  const boundedPageSize = Math.min(requestedPageSize, 100);
  const where = { driverId, createdAt: { gte: startDate } };

  const [summary, totalCount, transactions] = await Promise.all([
    db.$queryRaw<[{ total_credit: string | null; total_debit: string | null }]>`
      SELECT
        COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) AS total_credit,
        COALESCE(SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END), 0) AS total_debit
      FROM wallet_transactions
      WHERE driver_id = ${driverId} AND created_at >= ${startDate}
    `,
    db.walletTransaction.count({ where }),
    db.walletTransaction.findMany({
      where,
      select: {
        id: true,
        driverId: true,
        amount: true,
        transactionType: true,
        description: true,
        referenceId: true,
        createdAt: true,
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (requestedPage - 1) * boundedPageSize,
      take: boundedPageSize,
    }),
  ]);

  const totalEarnings = Number(summary[0]?.total_credit ?? 0);
  const totalDeductions = Number(summary[0]?.total_debit ?? 0);
  const totalPages = Math.ceil(totalCount / boundedPageSize);

  return {
    totalEarnings,
    totalDeductions,
    netEarnings: totalEarnings - totalDeductions,
    transactions,
    totalCount,
    totalPages,
  };
}

export async function getDashboardStats() {
  const [totalRevenue, totalCommission, activeTrips, totalBookings, recentBookings] = await Promise.all([
    db.booking.aggregate({
      _sum: { totalAmount: true },
      where: { status: { in: ["CONFIRMED", "COMPLETED"] } },
    }),
    db.booking.aggregate({
      _sum: { commissionAmount: true },
      where: { status: { in: ["CONFIRMED", "COMPLETED"] } },
    }),
    db.trip.count({ where: { status: { in: ["SCHEDULED", "IN_PROGRESS"] } } }),
    db.booking.count(),
    db.booking.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        totalAmount: true,
        status: true,
        createdAt: true,
        user: { select: { name: true } },
        trip: {
          select: {
            id: true,
            source: { select: { name: true } },
            destination: { select: { name: true } },
          },
        },
      },
    }),
  ]);

  return {
    totalRevenue: totalRevenue._sum.totalAmount ? Number(totalRevenue._sum.totalAmount) : 0,
    totalCommission: totalCommission._sum.commissionAmount ? Number(totalCommission._sum.commissionAmount) : 0,
    activeTrips,
    totalBookings,
    recentBookings,
  };
}

