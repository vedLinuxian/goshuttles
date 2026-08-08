import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { DriversClient } from "./drivers-client";

const PAGE_SIZE = 10;

export default async function AdminDriversPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/");

  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const q = (params.q as string) || "";

  const where: Prisma.UserWhereInput = { role: "DRIVER" };
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { phone: { contains: q, mode: "insensitive" } },
    ];
  }

  const [drivers, totalCount] = await Promise.all([
    db.user.findMany({
      where,
      include: { driverProfile: true, _count: { select: { assignedTrips: true, vehicles: true } } },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.user.count({ where }),
  ]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const serializedDrivers = drivers.map((driver) => ({
    ...driver,
    driverProfile: driver.driverProfile
      ? {
          ...driver.driverProfile,
          rating: Number(driver.driverProfile.rating),
          walletBalance: Number(driver.driverProfile.walletBalance),
          totalEarnings: Number(driver.driverProfile.totalEarnings),
        }
      : null,
  }));

  return (
    <DriversClient
      drivers={serializedDrivers}
      page={page}
      totalPages={totalPages}
      totalCount={totalCount}
      pageSize={PAGE_SIZE}
    />
  );
}
