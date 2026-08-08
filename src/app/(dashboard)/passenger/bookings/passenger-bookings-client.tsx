"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Ticket,
  MapPin,
  CalendarDays,
  IndianRupee,
  ExternalLink,
  Navigation,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  User,
  ShieldCheck
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  SortableHeader
} from "@/components/ui";

export type PassengerBookingItem = {
  id: string;
  status: string;
  paymentMode: string;
  paymentStatus: string;
  totalAmount: string;
  createdAt: string;
  guestName: string;
  seatNumber: string;
  trip: {
    id: string;
    startTime: string;
    source: string;
    destination: string;
    driverName: string | null;
  };
  ticket: {
    id: string;
    ticketNumber: string;
    status: string;
  } | null;
};

interface PassengerBookingsClientProps {
  bookings: PassengerBookingItem[];
  sortField?: string;
  sortOrder?: "asc" | "desc";
}

export function PassengerBookingsClient({
  bookings,
  sortField = "startTime",
  sortOrder = "desc",
}: PassengerBookingsClientProps) {
  const [clientSortField, setClientSortField] = useState(sortField);
  const [clientSortOrder, setClientSortOrder] = useState<"asc" | "desc">(sortOrder);

  const handleSort = (field: string) => {
    if (clientSortField === field) {
      setClientSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setClientSortField(field);
      setClientSortOrder("desc");
    }
  };

  const sortedBookings = [...bookings].sort((a, b) => {
    const factor = clientSortOrder === "asc" ? 1 : -1;
    if (clientSortField === "startTime") {
      return (new Date(a.trip.startTime).getTime() - new Date(b.trip.startTime).getTime()) * factor;
    }
    if (clientSortField === "totalAmount") {
      return (Number(a.totalAmount) - Number(b.totalAmount)) * factor;
    }
    if (clientSortField === "status") {
      return a.status.localeCompare(b.status) * factor;
    }
    if (clientSortField === "route") {
      return `${a.trip.source}-${a.trip.destination}`.localeCompare(`${b.trip.source}-${b.trip.destination}`) * factor;
    }
    if (clientSortField === "seatNumber") {
      return a.seatNumber.localeCompare(b.seatNumber) * factor;
    }
    if (clientSortField === "createdAt") {
      return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * factor;
    }
    return 0;
  });

  return (
    <Card variant="glass" className="border-amber-500/20 bg-slate-950/80 backdrop-blur-xl shadow-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-slate-900/90 border-b border-slate-800">
            <TableRow className="hover:bg-transparent">
              <SortableHeader
                field="startTime"
                title="Departure & Date"
                currentSortField={clientSortField}
                currentSortOrder={clientSortOrder}
                onSort={handleSort}
              />
              <SortableHeader
                field="route"
                title="Corridor Route"
                currentSortField={clientSortField}
                currentSortOrder={clientSortOrder}
                onSort={handleSort}
              />
              <SortableHeader
                field="seatNumber"
                title="Seat"
                currentSortField={clientSortField}
                currentSortOrder={clientSortOrder}
                onSort={handleSort}
              />
              <SortableHeader
                field="totalAmount"
                title="Fare"
                currentSortField={clientSortField}
                currentSortOrder={clientSortOrder}
                onSort={handleSort}
              />
              <SortableHeader
                field="status"
                title="Status"
                currentSortField={clientSortField}
                currentSortOrder={clientSortOrder}
                onSort={handleSort}
              />
              <SortableHeader
                field="createdAt"
                title="Booked On"
                currentSortField={clientSortField}
                currentSortOrder={clientSortOrder}
                onSort={handleSort}
              />
              <TableCell className="text-right text-xs font-bold text-slate-300">Actions</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-slate-800/60">
            {sortedBookings.map((b) => {
              const formattedDate = new Date(b.trip.startTime).toLocaleString("en-IN", {
                weekday: "short",
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              });
              const bookedOn = new Date(b.createdAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
              });
              const isConfirmedOrCompleted = ["CONFIRMED", "COMPLETED"].includes(b.status);
              const hasTicket = Boolean(b.ticket && ["ISSUED", "USED"].includes(b.ticket.status));

              return (
                <TableRow key={b.id} className="hover:bg-slate-900/60 transition-colors">
                  {/* Departure Date & Time */}
                  <TableCell className="py-3.5">
                    <div className="space-y-0.5">
                      <span className="text-xs font-extrabold text-white flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                        {formattedDate}
                      </span>
                      {b.trip.driverName && (
                        <span className="text-[10px] text-slate-400 block pl-5">
                          Driver: {b.trip.driverName}
                        </span>
                      )}
                    </div>
                  </TableCell>

                  {/* Corridor Route */}
                  <TableCell className="py-3.5">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                      <span className="text-xs font-extrabold text-white">
                        {b.trip.source} <span className="text-amber-400">➔</span> {b.trip.destination}
                      </span>
                    </div>
                  </TableCell>

                  {/* Seat */}
                  <TableCell className="py-3.5">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-extrabold">
                      <User className="h-3 w-3" /> {b.seatNumber}
                    </span>
                  </TableCell>

                  {/* Fare & Payment */}
                  <TableCell className="py-3.5">
                    <div className="space-y-0.5">
                      <span className="text-xs font-black text-emerald-400 block">
                        ₹{Number(b.totalAmount).toLocaleString("en-IN")}
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        {b.paymentMode === "CASH" ? "Cash" : "Online"} •{" "}
                        {b.paymentStatus === "COLLECTED" ? "Paid" : "Pending"}
                      </span>
                    </div>
                  </TableCell>

                  {/* Status Badge */}
                  <TableCell className="py-3.5">
                    <StatusBadge status={b.status} />
                  </TableCell>

                  {/* Booked Date */}
                  <TableCell className="py-3.5 text-xs text-slate-400">
                    {bookedOn}
                  </TableCell>

                  {/* Action Buttons */}
                  <TableCell className="py-3.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {isConfirmedOrCompleted && hasTicket ? (
                        <Link
                          href={`/passenger/ticket/${b.ticket!.id}`}
                          className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 rounded-xl text-xs font-extrabold shadow-md glow-amber transition-all flex items-center gap-1.5"
                        >
                          <Ticket className="h-3.5 w-3.5" />
                          Boarding Pass
                        </Link>
                      ) : (
                        <Link
                          href={`/passenger/booking/${b.id}`}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-400 border border-slate-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                        >
                          Details
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      )}

                      {isConfirmedOrCompleted && (
                        <Link
                          href={`/passenger/tracking?tripId=${b.trip.id}`}
                          className="p-1.5 bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-slate-800 rounded-xl text-xs font-bold transition-all"
                          title="Track Shuttle Live"
                        >
                          <Navigation className="h-3.5 w-3.5" />
                        </Link>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const badgeMap: Record<string, { label: string; style: string }> = {
    CONFIRMED: { label: "CONFIRMED", style: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
    COMPLETED: { label: "COMPLETED", style: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
    CANCELLED: { label: "CANCELLED", style: "bg-rose-500/15 text-rose-400 border-rose-500/30" },
    PENDING: { label: "PENDING LOCK", style: "bg-amber-500/15 text-amber-400 border-amber-500/30 animate-pulse" },
    NO_SHOW: { label: "NO SHOW", style: "bg-slate-800 text-slate-400 border-slate-700" },
  };

  const current = badgeMap[status] || { label: status, style: "bg-slate-800 text-slate-400 border-slate-700" };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${current.style}`}>
      {current.label}
    </span>
  );
}
