import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { autoArchiveExpiredTrips } from "@/lib/trip-service";
import { DriverTripsClient } from "./driver-trips-client";

export const dynamic = "force-dynamic";

type SearchParams = {
  page?: string;
  status?: string;
  q?: string;
  pageSize?: string;
};

export default async function DriverTripsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "DRIVER") redirect("/login");

  const driverId = session.user.id;

  // Auto-archive any past unstarted trips for this driver
  await autoArchiveExpiredTrips(driverId);

  const params = await searchParams;
  const currentPage = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const pageSize = Math.min(100, Math.max(10, parseInt(params.pageSize ?? "10", 10) || 10));
  const statusFilter = params.status ?? "";
  const q = (params.q ?? "").trim();

  const where: any = {
    OR: [{ driverId }, { requestedById: driverId }],
  };

  if (statusFilter && ["PENDING_APPROVAL", "SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "REJECTED"].includes(statusFilter)) {
    where.status = statusFilter;
  }

  if (q) {
    where.AND = [
      {
        OR: [
          { source: { name: { contains: q, mode: "insensitive" } } },
          { destination: { name: { contains: q, mode: "insensitive" } } },
          { vehicle: { regNumber: { contains: q, mode: "insensitive" } } },
          { vehicle: { modelName: { contains: q, mode: "insensitive" } } },
        ],
      },
    ];
  }

  const [trips, totalCount, statusCounts] = await Promise.all([
    db.trip.findMany({
      where,
      include: {
        source: true,
        destination: true,
        vehicle: true,
        seats: { select: { id: true, status: true } },
        _count: { select: { bookings: true } },
      },
      orderBy: { startTime: "desc" },
      skip: (currentPage - 1) * pageSize,
      take: pageSize,
    }),
    db.trip.count({ where }),
    db.trip.groupBy({
      by: ["status"],
      where: {
        OR: [{ driverId }, { requestedById: driverId }],
      },
      _count: { id: true },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const countsByStatus: Record<string, number> = {};
  for (const sc of statusCounts) {
    countsByStatus[sc.status] = sc._count.id;
  }

  const serializedTrips = trips.map((t) => ({
    id: t.id,
    tripSequence: t.tripSequence,
    status: t.status,
    startTime: t.startTime.toISOString(),
    isCancelled: t.isCancelled,
    cancellationReason: t.cancellationReason,
    rejectionReason: t.rejectionReason,
    source: { id: t.source.id, name: t.source.name },
    destination: { id: t.destination.id, name: t.destination.name },
    vehicle: { id: t.vehicle.id, regNumber: t.vehicle.regNumber, modelName: t.vehicle.modelName },
    bookedSeats: t.seats.filter((s) => s.status === "BOOKED").length,
    totalSeats: t.seats.length,
    bookingCount: t._count.bookings,
  }));

  return (
    <DriverTripsClient
      trips={serializedTrips}
      page={currentPage}
      pageSize={pageSize}
      totalPages={totalPages}
      totalCount={totalCount}
      statusFilter={statusFilter}
      q={q}
      countsByStatus={countsByStatus}
    />
  );
}
