import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { ScheduleTripForm } from "@/app/(dashboard)/admin/trips/new/schedule-trip-form";

export default async function DriverNewTripPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "DRIVER") redirect("/login");

  const [vehicles, locations, drivers] = await Promise.all([
    db.vehicle.findMany({
      where: {
        isActive: true,
        OR: [{ ownerId: session.user.id }, { owner: { role: "ADMIN" } }],
      },
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
      where: { id: session.user.id },
      select: { id: true, name: true, phone: true },
    }),
  ]);

  return (
    <ScheduleTripForm
      vehicles={vehicles}
      locations={locations}
      drivers={drivers}
      isDriverView={true}
      backLink="/driver/trips"
      redirectPath="/driver/trips"
      noticeText="Note: Driver-created trip schedules require Admin Approval before going live for passenger bookings."
    />
  );
}
