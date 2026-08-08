import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { BookingWizard } from "./booking-wizard";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function PassengerTripPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const sParams = await searchParams;
  const seatNumberParam = (sParams.seat as string) || undefined;

  const trip = await db.trip.findUnique({
    where: { id },
    include: {
      source: true,
      destination: true,
      vehicle: true,
      driver: { select: { name: true } },
      seats: { orderBy: { seatNumber: "asc" } },
    },
  });

  if (!trip) redirect("/passenger/dashboard");

  const serializedTrip = {
    id: trip.id,
    startTime: trip.startTime,
    source: trip.source,
    destination: trip.destination,
    vehicle: trip.vehicle,
    driver: trip.driver,
    seats: trip.seats.map((s) => ({
      id: s.id,
      seatNumber: s.seatNumber,
      seatType: s.seatType,
      price: Number(s.price),
      status: s.status,
      lockedAt: s.lockedAt ? s.lockedAt.toISOString() : null,
      lockedUntil: s.lockedAt ? new Date(s.lockedAt.getTime() + 5 * 60 * 1000).toISOString() : null,
    })),
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <Link
        href="/passenger/discover"
        className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Available Shuttles
      </Link>

      <BookingWizard
        trip={serializedTrip}
        userId={session.user.id!}
        userName={session.user.name || "Passenger"}
        userPhone={session.user.phone || ""}
        initialSelectedSeatNumber={seatNumberParam}
      />
    </div>
  );
}
