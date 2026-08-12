import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { DriverDetailClient } from "./driver-detail-client";

export default async function DriverDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login");

  const { id } = await params;
  const driver = await db.user.findUnique({
    where: { id, role: "DRIVER" },
    include: {
      driverProfile: true,
      vehicles: true,
      assignedTrips: {
        include: { source: true, destination: true },
        take: 5,
        orderBy: { startTime: "desc" },
      },
    },
  });

  if (!driver) redirect("/admin/drivers");

  const serializedDriver = {
    ...driver,
    driverProfile: driver.driverProfile
      ? {
          ...driver.driverProfile,
          rating: Number(driver.driverProfile.rating),
          walletBalance: Number(driver.driverProfile.walletBalance),
          totalEarnings: Number(driver.driverProfile.totalEarnings),
        }
      : null,
    assignedTrips: driver.assignedTrips.map((t) => ({
      ...t,
      startTime: t.startTime.toISOString(),
      actualStartTime: t.actualStartTime?.toISOString() ?? null,
      actualEndTime: t.actualEndTime?.toISOString() ?? null,
      overrideApprovedAt: t.overrideApprovedAt?.toISOString() ?? null,
      totalFare: Number(t.totalFare),
      currentLat: t.currentLat ? Number(t.currentLat) : null,
      currentLong: t.currentLong ? Number(t.currentLong) : null,
    })),
  };

  return <DriverDetailClient driver={serializedDriver} />;
}
