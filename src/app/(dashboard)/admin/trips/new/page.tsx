import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { AdminScheduleTripForm } from "./schedule-trip-form";

export default async function ScheduleTripPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login");

  const [vehicles, locations, drivers] = await Promise.all([
    db.vehicle.findMany({
      where: { isActive: true },
      select: {
        id: true,
        regNumber: true,
        modelName: true,
        capacity: true,
        ownerId: true,
        owner: {
          select: { id: true, name: true, phone: true, role: true },
        },
      },
      orderBy: { regNumber: "asc" },
    }),
    db.location.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.user.findMany({
      where: { role: "DRIVER", isActive: true },
      select: { id: true, name: true, phone: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <AdminScheduleTripForm
      vehicles={vehicles}
      locations={locations}
      drivers={drivers}
    />
  );
}
