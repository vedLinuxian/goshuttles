import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import Link from "next/link";
import PaginationControls from "@/components/ui/pagination";
import SearchBar from "@/components/ui/search-bar";
import { Ticket, Search, ArrowRight } from "lucide-react";
import { PassengerBookingsClient, type PassengerBookingItem } from "./passenger-bookings-client";

const PAGE_SIZE = 10;

export default async function MyBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = session.user.id!;
  const params = await searchParams;
  const now = new Date();

  const page = Math.max(1, Number(params.page) || 1);
  const q = (params.q as string) || "";
  const statusFilter = (params.status as string) || "";
  const sortField = (params.sort as string) || "startTime";
  const sortOrder = ((params.order as string) || "desc") as "asc" | "desc";

  const routeFilter: Prisma.TripWhereInput = {};
  if (q) {
    routeFilter.OR = [
      { source: { name: { contains: q, mode: "insensitive" } } },
      { destination: { name: { contains: q, mode: "insensitive" } } },
    ];
  }

  const where: Prisma.BookingWhereInput = {
    userId,
    ...(q ? {
      OR: [
        { guestName: { contains: q, mode: "insensitive" } },
        { trip: routeFilter },
      ],
    } : {}),
  };

  if (statusFilter === "upcoming") {
    where.status = { in: ["PENDING", "CONFIRMED"] };
    where.trip = { ...routeFilter, startTime: { gt: now } };
  } else if (statusFilter === "past") {
    where.NOT = {
      AND: [
        { status: { in: ["PENDING", "CONFIRMED"] } },
        { trip: { startTime: { gt: now } } },
      ],
    };
  } else if (["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED", "NO_SHOW"].includes(statusFilter)) {
    where.status = statusFilter as Prisma.BookingWhereInput["status"];
  }

  // Dynamic order by
  let orderBy: Prisma.BookingOrderByWithRelationInput = { createdAt: "desc" };
  if (sortField === "startTime") {
    orderBy = { trip: { startTime: sortOrder } };
  } else if (sortField === "totalAmount") {
    orderBy = { totalAmount: sortOrder };
  } else if (sortField === "status") {
    orderBy = { status: sortOrder };
  } else if (sortField === "createdAt") {
    orderBy = { createdAt: sortOrder };
  }

  const [bookings, totalCount] = await Promise.all([
    db.booking.findMany({
      where,
      include: {
        trip: {
          include: { source: true, destination: true, vehicle: true, driver: true },
        },
        seat: true,
        ticket: true,
      },
      orderBy,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.booking.count({ where }),
  ]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // Counts for filter badges
  const [upcomingCount, pastCount] = await Promise.all([
    db.booking.count({
      where: {
        userId,
        status: { in: ["PENDING", "CONFIRMED"] },
        trip: { startTime: { gt: now } },
      },
    }),
    db.booking.count({
      where: {
        userId,
        NOT: {
          AND: [
            { status: { in: ["PENDING", "CONFIRMED"] } },
            { trip: { startTime: { gt: now } } },
          ],
        },
      },
    }),
  ]);

  const bookingItems: PassengerBookingItem[] = bookings.map((b) => ({
    id: b.id,
    status: b.status,
    paymentMode: b.paymentMode,
    paymentStatus: b.paymentStatus,
    totalAmount: String(b.totalAmount),
    createdAt: b.createdAt.toISOString(),
    guestName: b.guestName || "Passenger",
    seatNumber: b.seat?.seatNumber || b.seatId || "Unassigned",
    trip: {
      id: b.trip.id,
      startTime: b.trip.startTime.toISOString(),
      source: b.trip.source.name,
      destination: b.trip.destination.name,
      driverName: b.trip.driver?.name || null,
    },
    ticket: b.ticket
      ? {
          id: b.ticket.id,
          ticketNumber: b.ticket.ticketNumber,
          status: b.ticket.status,
        }
      : null,
  }));

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <Ticket className="h-6 w-6 text-amber-400" />
            My Shuttle Bookings
          </h1>
          <p className="text-sm text-slate-400">
            Track and manage your daily intercity shuttle reservations with live boarding passes &amp; tracking.
          </p>
        </div>
        <Link
          href="/passenger/discover"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 rounded-xl font-extrabold text-xs shadow-md glow-amber transition-all"
        >
          <Search className="h-3.5 w-3.5" />
          Book New Shuttle
        </Link>
      </div>

      {/* Search + Status Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <SearchBar
          placeholder="Search by route or passenger name..."
          className="flex-1"
        />
        <div className="flex gap-2">
          <FilterLink active={statusFilter === ""} href="?">
            All ({totalCount})
          </FilterLink>
          <FilterLink active={statusFilter === "upcoming"} href="?status=upcoming">
            Upcoming ({upcomingCount})
          </FilterLink>
          <FilterLink active={statusFilter === "past"} href="?status=past">
            Past ({pastCount})
          </FilterLink>
        </div>
      </div>

      {/* Empty State vs Table View */}
      {bookings.length === 0 ? (
        <div className="glass-card-dark rounded-3xl border border-slate-800/80 shadow-2xl p-12 text-center space-y-4 glow-amber">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
            <Ticket className="h-7 w-7 text-amber-400" />
          </div>
          <div>
            <p className="text-lg font-extrabold text-white">
              {totalCount === 0 ? "No bookings yet" : "No matching bookings"}
            </p>
            <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
              {totalCount === 0
                ? "You haven't made any shuttle reservations. Browse available trips to get started."
                : "No bookings match your current filters. Try adjusting your search."}
            </p>
          </div>
          <Link
            href="/passenger/discover"
            className="inline-flex items-center gap-2 text-xs font-bold text-amber-400 hover:text-amber-300"
          >
            Discover trips
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      ) : (
        <PassengerBookingsClient
          bookings={bookingItems}
          sortField={sortField}
          sortOrder={sortOrder}
        />
      )}

      {/* Pagination */}
      <PaginationControls
        page={page}
        totalPages={totalPages}
        total={totalCount}
        pageSize={PAGE_SIZE}
      />
    </div>
  );
}

function FilterLink({
  active,
  href,
  children,
}: {
  active: boolean;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
        active
          ? "bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 shadow-md glow-amber"
          : "bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800"
      }`}
    >
      {children}
    </Link>
  );
}
