import { auth } from "@/auth";
import { db } from "@/lib/db";
import { PublicRideSearch } from "@/components/home/public-ride-search";
import Link from "next/link";
import { ArrowLeft, Route } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DiscoverShuttlesPage() {
  const session = await auth();
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const tomorrowDate = new Date(`${today}T00:00:00`);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrow = tomorrowDate.toISOString().slice(0, 10);

  const [locations, upcomingTrips] = await Promise.all([
    db.location.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.trip.findMany({
      where: {
        status: "SCHEDULED",
        startTime: { gt: now },
        manifestLocked: false,
        isCancelled: false,
        driverId: { not: null },
        vehicle: { is: { isActive: true } },
        seats: { some: { status: "AVAILABLE" } },
      },
      include: {
        source: { select: { name: true } },
        destination: { select: { name: true } },
        seats: { select: { price: true, status: true } },
      },
      orderBy: { startTime: "asc" },
      take: 40,
    }),
  ]);

  const initialRides = upcomingTrips.map((trip) => {
    const prices = trip.seats.map((seat) => Number(seat.price)).filter(Number.isFinite);
    return {
      id: trip.id,
      startTime: trip.startTime.toISOString(),
      source: trip.source,
      destination: trip.destination,
      availableSeats: trip.seats.filter((seat) => seat.status === "AVAILABLE").length,
      totalSeats: trip.seats.length,
      lowestFare: prices.length ? Math.min(...prices) : 0,
    };
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"><ArrowLeft className="h-4 w-4" /> Back to home</Link>
        <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">Live departures</span>
      </div>
      <div className="flex items-start gap-3 border-b border-[var(--border)] pb-5"><div className="rounded-xl bg-amber-500/10 p-3 text-amber-500"><Route className="h-5 w-5" /></div><div><h1 className="text-2xl font-black tracking-tight text-[var(--foreground)]">Find your next ride</h1><p className="mt-1 text-sm text-[var(--muted-foreground)]">Compare scheduled departures, fares, and open seats.</p></div></div>
      <PublicRideSearch locations={locations} initialRides={initialRides} isLoggedIn={!!session?.user} today={today} tomorrow={tomorrow} />
    </div>
  );
}
