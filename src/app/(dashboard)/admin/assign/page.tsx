import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { AssignVehicleClient } from "./assign-client";

export default async function AssignVehiclePage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login");

  const [drivers, vehicles] = await Promise.all([
    db.user.findMany({
      where: { role: "DRIVER", isActive: true },
      include: {
        driverProfile: { select: { kycStatus: true, isAvailable: true, rating: true } },
        vehicles: { select: { id: true, regNumber: true, modelName: true, isActive: true } },
      },
      orderBy: { name: "asc" },
    }),
    db.vehicle.findMany({
      include: {
        owner: { select: { id: true, name: true, phone: true } },
      },
      orderBy: { regNumber: "asc" },
    }),
  ]);

  const serializedDrivers = drivers.map((driver) => ({
    ...driver,
    phone: driver.phone,
    driverProfile: driver.driverProfile
      ? {
          ...driver.driverProfile,
          kycStatus: driver.driverProfile.kycStatus,
          rating: Number(driver.driverProfile.rating),
        }
      : null,
  }));

  return <AssignVehicleClient drivers={serializedDrivers} vehicles={vehicles} />;
}
