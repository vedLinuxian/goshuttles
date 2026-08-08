import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import PaginationControls from "@/components/ui/pagination";
import SearchBar from "@/components/ui/search-bar";
import { PlusCircle, MapPin, Calendar, Users, Route } from "lucide-react";
import { Card, Badge, Button } from "@/components/ui";

const PAGE_SIZE = 10;

const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: "Scheduled",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

type SearchParams = {
  page?: string;
  status?: string;
  q?: string;
};

export default async function DriverTripsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "DRIVER") redirect("/login");

  const params = await searchParams;
  const currentPage = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const statusFilter = params.status ?? undefined;
  const q = params.q || "";

  const where: Record<string, unknown> = { driverId: session.user.id };
  if (statusFilter && ["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"].includes(statusFilter)) {
    where.status = statusFilter;
  }
  if (q) {
    where.OR = [
      { source: { name: { contains: q, mode: "insensitive" } } },
      { destination: { name: { contains: q, mode: "insensitive" } } },
      { vehicle: { regNumber: { contains: q, mode: "insensitive" } } },
    ];
  }

  const [trips, totalCount] = await Promise.all([
    db.trip.findMany({
      where,
      include: {
        source: true,
        destination: true,
        vehicle: true,
        seats: { select: { id: true, status: true } },
        _count: { select: { bookings: true } },
      },
      orderBy: { startTime: "asc" },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.trip.count({ where }),
  ]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const statusCounts = await db.trip.groupBy({
    by: ["status"],
    where: { driverId: session.user.id },
    _count: { id: true },
  });

  const countsByStatus: Record<string, number> = {};
  for (const sc of statusCounts) {
    countsByStatus[sc.status] = sc._count.id;
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Route className="h-6 w-6 text-amber-400" />
            My Shuttle Trips
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {totalCount} total trip{totalCount !== 1 ? "s" : ""} in your driver manifest
          </p>
        </div>
        <Link href="/driver/trips/new">
          <Button className="bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-extrabold gap-2 shadow-md glow-amber cursor-pointer">
            <PlusCircle className="h-4 w-4" />
            Schedule New Trip
          </Button>
        </Link>
      </div>

      {/* Status filter tabs */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-2 flex-wrap bg-slate-900/90 border border-slate-800 rounded-2xl p-1.5 w-fit">
          <Link
            href="/driver/trips"
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
              !statusFilter
                ? "bg-amber-500 text-slate-950 shadow-md glow-amber"
                : "text-slate-400 hover:text-white"
            }`}
          >
            All ({totalCount})
          </Link>
          {["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"].map((st) => (
            <Link
              key={st}
              href={`/driver/trips?status=${st}`}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                statusFilter === st
                  ? "bg-amber-500 text-slate-950 shadow-md glow-amber"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {STATUS_LABELS[st] ?? st} ({countsByStatus[st] ?? 0})
            </Link>
          ))}
        </div>
        <SearchBar placeholder="Search by route or vehicle..." className="sm:max-w-xs" />
      </div>

      {/* Trip list */}
      {trips.length === 0 ? (
        <Card variant="glass" className="text-center py-16 p-8 space-y-3 border-slate-800">
          <MapPin className="h-10 w-10 mx-auto text-amber-500/40" />
          <p className="text-white font-extrabold text-lg">No trips found</p>
          <p className="text-xs text-slate-400">
            {statusFilter
              ? `You have no ${STATUS_LABELS[statusFilter]?.toLowerCase() ?? statusFilter} trips.`
              : "Schedule your first trip to start taking bookings."}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {trips.map((trip) => {
            const bookedSeats = trip.seats.filter((s) => s.status === "BOOKED").length;
            const totalSeats = trip.seats.length;
            const occupancyPct =
              totalSeats > 0 ? Math.round((bookedSeats / totalSeats) * 100) : 0;

            return (
              <Link
                key={trip.id}
                href={`/driver/trips/${trip.id}`}
                className="block group"
              >
                <Card variant="glass" className="p-5 border-slate-800 hover:border-amber-500/50 hover:shadow-2xl transition-all card-hover">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                          #{trip.tripSequence}
                        </span>
                        <Badge
                          variant={
                            trip.status === "COMPLETED"
                              ? "success"
                              : trip.status === "IN_PROGRESS"
                              ? "info"
                              : trip.status === "CANCELLED"
                              ? "destructive"
                              : "warning"
                          }
                        >
                          {STATUS_LABELS[trip.status] ?? trip.status}
                        </Badge>
                      </div>

                      <h3 className="text-base font-extrabold text-white group-hover:text-amber-400 transition-colors flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-amber-400 shrink-0" />
                        {trip.source.name} → {trip.destination.name}
                      </h3>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-amber-400" />
                          {new Date(trip.startTime).toLocaleString("en-IN", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 text-amber-400" />
                          {bookedSeats}/{totalSeats} seats
                        </span>
                        <span className="text-slate-400 font-mono">
                          {trip.vehicle.regNumber} · {trip.vehicle.modelName}
                        </span>
                      </div>
                    </div>

                    <div className="hidden sm:flex flex-col items-end gap-1.5 min-w-[120px]">
                      <span className="text-xs font-bold text-amber-400">{occupancyPct}% occupancy</span>
                      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            occupancyPct >= 80
                              ? "bg-emerald-400"
                              : occupancyPct >= 40
                              ? "bg-amber-400"
                              : "bg-rose-400"
                          }`}
                          style={{ width: `${occupancyPct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      <PaginationControls
        page={currentPage}
        totalPages={totalPages}
        total={totalCount}
        pageSize={PAGE_SIZE}
      />
    </div>
  );
}
