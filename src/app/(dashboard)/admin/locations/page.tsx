import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { getPricingConfig } from "@/lib/pricing-service";
import { LocationsClient, type LocationWithStats } from "./locations-client";

const PAGE_SIZE = 10;

export default async function AdminLocationsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/");

  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const q = (params.q as string) || "";
  const sortField = typeof params.sort === "string" ? params.sort : "name";
  const sortOrder = ((params.order as string) || "asc") as "asc" | "desc";

  const where: Prisma.LocationWhereInput = {};
  if (q) {
    where.name = { contains: q, mode: "insensitive" };
  }

  const [rawLocations, totalCount, rawConfig] = await Promise.all([
    db.location.findMany({
      where,
      include: {
        _count: {
          select: { tripsFrom: true, tripsTo: true },
        },
      },
      orderBy: { name: sortOrder },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.location.count({ where }),
    getPricingConfig(),
  ]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const locations: LocationWithStats[] = rawLocations.map((l) => ({
    id: l.id,
    name: l.name,
    activeTripsFrom: l._count.tripsFrom,
    activeTripsTo: l._count.tripsTo,
    totalTripsCount: l._count.tripsFrom + l._count.tripsTo,
  }));

  const pricingConfig = {
    id: rawConfig.id,
    surgeMultiplier: Number(rawConfig.surgeMultiplier),
    occupancyThreshold: Number(rawConfig.occupancyThreshold),
    commissionRate: Number(rawConfig.commissionRate),
    surgeEnabled: rawConfig.surgeEnabled,
    seatLockTimeout: rawConfig.seatLockTimeout,
  };

  return (
    <LocationsClient
      locations={locations}
      pricingConfig={pricingConfig}
      page={page}
      totalPages={totalPages}
      totalCount={totalCount}
      pageSize={PAGE_SIZE}
      sortField={sortField}
      sortOrder={sortOrder}
    />
  );
}
