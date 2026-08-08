"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { cancelTrip, getTripDetail } from "@/app/actions/trip-actions";
import Link from "next/link";
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Car,
  Users,
  Loader2,
  Play,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Radio,
} from "lucide-react";
import { Card, Badge, Button, Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui";
import { RealtimeGpsTracker } from "@/components/tracking/RealtimeGpsTracker";
import { TripStartValidationModal } from "@/components/trips/TripStartValidationModal";
import { TripCompleteModal } from "@/components/trips/TripCompleteModal";

type SeatData = {
  id: string;
  seatNumber: string;
  seatType: string;
  price: string;
  status: string;
  lockedAt: string | null;
};

type BookingData = {
  id: string;
  status: string;
  totalAmount: string;
  paymentMode: string;
  paymentStatus: string;
  guestName: string | null;
  createdAt: string;
  user: { id: string; name: string | null; phone: string | null } | null;
  seat: { id: string; seatNumber: string; seatType: string; price: string; status: string };
  ticket: { ticketNumber: string; status: string } | null;
};

type Availability = {
  totalSeats: number;
  bookedSeats: number;
  availableSeats: number;
  lockedSeats: number;
};

type TripData = {
  id: string;
  tripSequence: number;
  status: string;
  startTime: string;
  actualStartTime: string | null;
  actualEndTime: string | null;
  manifestLocked: boolean;
  isCancelled: boolean;
  cancellationReason: string | null;
  currentLat: number | null;
  currentLong: number | null;
  lastLocationUpdate: string | null;
  source: { id: string; name: string };
  destination: { id: string; name: string };
  vehicle: { id: string; regNumber: string; modelName: string; vehicleType: string };
  driver: { id: string; name: string | null; phone: string | null } | null;
  availability: Availability;
  seats: SeatData[];
  bookings: BookingData[];
};

const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: "Scheduled",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export default function DriverTripDetailPage() {
  const { id } = useParams<{ id: string }>();
  const tripId = id;
  const router = useRouter();

  const [trip, setTrip] = useState<TripData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [showCancelInput, setShowCancelInput] = useState(false);

  // Modals
  const [showStartModal, setShowStartModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);

  const fetchTrip = useCallback(async () => {
    const result = await getTripDetail(tripId);
    if (result.success && result.data) {
      setTrip(result.data as unknown as TripData);
      setError(null);
    } else {
      setError(result.error ?? "Failed to load trip.");
    }
    setLoading(false);
  }, [tripId]);

  useEffect(() => {
    let active = true;
    getTripDetail(tripId).then((result) => {
      if (!active) return;
      if (result.success && result.data) {
        setTrip(result.data as unknown as TripData);
        setError(null);
      } else {
        setError(result.error ?? "Failed to load trip.");
      }
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [tripId]);

  const handleCancel = async () => {
    const reason = cancelReason.trim() || undefined;
    if (!confirm(reason ? `Cancel with reason: "${reason}"?` : "Cancel this trip? This will release all seats.")) return;
    setActionLoading("cancel");
    setActionError(null);
    const res = await cancelTrip(tripId, reason);
    if (res.success) {
      setShowCancelInput(false);
      setCancelReason("");
      await fetchTrip();
    } else {
      setActionError(res.error ?? "Failed to cancel trip.");
    }
    setActionLoading(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
      </div>
    );
  }

  if (error || !trip) {
    return (
      <Card variant="glass" className="text-center py-16 p-8 space-y-3 max-w-md mx-auto border-slate-800">
        <AlertTriangle className="h-10 w-10 mx-auto text-rose-400" />
        <h2 className="text-xl font-extrabold text-white">Trip Not Found</h2>
        <p className="text-xs text-slate-400">{error ?? "The trip you're looking for doesn't exist."}</p>
        <Link href="/driver/trips">
          <Button variant="secondary" size="sm" className="mt-2 font-bold text-amber-400">
            ← Back to My Trips
          </Button>
        </Link>
      </Card>
    );
  }

  const canStart = trip.status === "SCHEDULED";
  const canComplete = trip.status === "IN_PROGRESS";
  const canCancel = trip.status === "SCHEDULED" || trip.status === "IN_PROGRESS";
  const isTerminal = trip.status === "COMPLETED" || trip.status === "CANCELLED";

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <Link
        href="/driver/trips"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to My Trips
      </Link>

      {actionError && (
        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold">
          {actionError}
        </div>
      )}

      {/* Header card */}
      <Card variant="glass" className="p-6 space-y-4 border-slate-800 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
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

            <h1 className="text-2xl font-extrabold text-white flex items-center gap-2 mt-1">
              <MapPin className="h-5 w-5 text-amber-400 shrink-0" />
              {trip.source.name} → {trip.destination.name}
            </h1>

            <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-slate-300">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-amber-400" />
                {new Date(trip.startTime).toLocaleString("en-IN", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </span>
              <span className="flex items-center gap-1.5">
                <Car className="h-4 w-4 text-amber-400" />
                {trip.vehicle.regNumber} ({trip.vehicle.modelName})
              </span>
              {trip.driver && (
                <span className="flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-amber-400" />
                  {trip.driver.name ?? "Assigned Driver"}
                </span>
              )}
            </div>
          </div>

          {!isTerminal && (
            <div className="flex items-center gap-2 shrink-0">
              {canStart && (
                <Button
                  onClick={() => setShowStartModal(true)}
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs gap-1.5 shadow-md glow-emerald cursor-pointer"
                >
                  <Play className="h-4 w-4 fill-slate-950" />
                  Depart &amp; Start Trip
                </Button>
              )}

              {canComplete && (
                <Button
                  onClick={() => setShowCompleteModal(true)}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs gap-1.5 shadow-md glow-amber cursor-pointer"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Complete Trip
                </Button>
              )}

              {canCancel && !showCancelInput && (
                <Button
                  onClick={() => setShowCancelInput(true)}
                  disabled={!!actionLoading}
                  variant="destructive"
                  className="text-xs gap-1.5 font-bold"
                >
                  <XCircle className="h-4 w-4" /> Cancel
                </Button>
              )}
            </div>
          )}
        </div>

        {showCancelInput && canCancel && (
          <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl flex flex-col sm:flex-row items-center gap-3">
            <input
              type="text"
              placeholder="Reason for cancellation (optional)"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 outline-none"
            />
            <Button
              onClick={handleCancel}
              disabled={!!actionLoading}
              variant="destructive"
              className="text-xs font-bold w-full sm:w-auto"
            >
              {actionLoading === "cancel" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm Cancel"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setShowCancelInput(false);
                setCancelReason("");
              }}
              className="text-xs text-slate-400 hover:text-white"
            >
              Dismiss
            </Button>
          </div>
        )}
      </Card>

      {/* Real-time GPS Tracker & Driver Phone Broadcast Module */}
      <RealtimeGpsTracker
        tripId={trip.id}
        sourceName={trip.source.name}
        destName={trip.destination.name}
        initialLat={trip.currentLat}
        initialLong={trip.currentLong}
        lastLocationUpdate={trip.lastLocationUpdate}
        status={trip.status}
        isDriver={true}
        driverName={trip.driver?.name}
        vehicleModel={trip.vehicle.modelName}
        regNumber={trip.vehicle.regNumber}
      />

      {/* Seat Map Section */}
      <Card variant="glass" className="p-6 space-y-4 border-slate-800 shadow-2xl">
        <h2 className="text-lg font-extrabold text-white">Shuttle Seat Manifest Grid</h2>
        <p className="text-xs text-slate-400">
          {trip.availability.bookedSeats}/{trip.availability.totalSeats} booked ·{" "}
          {trip.availability.availableSeats} available
          {trip.availability.lockedSeats > 0 ? ` · ${trip.availability.lockedSeats} locked` : ""}
        </p>

        <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden mb-6 border border-slate-800">
          <div
            className={`h-full rounded-full transition-all ${
              trip.availability.bookedSeats === trip.availability.totalSeats
                ? "bg-emerald-500"
                : trip.availability.bookedSeats > 0
                ? "bg-amber-400"
                : "bg-slate-700"
            }`}
            style={{
              width: `${trip.availability.totalSeats > 0 ? Math.round((trip.availability.bookedSeats / trip.availability.totalSeats) * 100) : 0}%`,
            }}
          />
        </div>

        <div className="bg-slate-950/90 rounded-3xl p-6 max-w-sm mx-auto border border-slate-800/80">
          <div className="w-full bg-slate-900 rounded-2xl py-2 px-3 mb-6 text-center text-xs text-amber-400 font-extrabold border border-slate-800">
            DRIVER CABIN &amp; FRONT WINDSHIELD
          </div>

          <div className="grid grid-cols-3 gap-3">
            {trip.seats.map((seat) => {
              const isAvailable = seat.status === "AVAILABLE";
              const isLocked = seat.status === "LOCKED";
              const isBooked = seat.status === "BOOKED";

              return (
                <div
                  key={seat.id}
                  className={`
                    h-16 rounded-2xl border flex flex-col items-center justify-center text-xs font-extrabold transition-all shadow-md p-1
                    ${isAvailable ? "bg-slate-900/80 border-slate-800 text-slate-400" : ""}
                    ${isLocked ? "bg-amber-950/90 border-amber-500/50 text-amber-300" : ""}
                    ${isBooked ? "bg-emerald-600/90 border-emerald-400/50 text-white" : ""}
                  `}
                >
                  <span className="font-mono text-sm">{seat.seatNumber}</span>
                  <span className="text-[9px] font-semibold opacity-90">₹{seat.price}</span>
                  <span className="text-[8px] uppercase tracking-wider">{seat.status}</span>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Booking List Section */}
      <Card variant="glass" className="p-6 space-y-4 border-slate-800 shadow-2xl">
        <h2 className="text-lg font-extrabold text-white border-b border-slate-800/80 pb-3">
          Passenger Manifest Bookings ({trip.bookings.length})
        </h2>

        {trip.bookings.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs">
            No bookings recorded yet for this trip.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Seat</TableHead>
                <TableHead>Passenger</TableHead>
                <TableHead>Ticket Ref</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Payment Status</TableHead>
                <TableHead>Booking Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trip.bookings.map((b) => (
                <TableRow key={b.id} className="hover:bg-slate-800/50 transition-colors">
                  <TableCell>
                    <Badge variant="outline" className="font-mono font-bold text-amber-400 border-amber-500/30">
                      {b.seat.seatNumber}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-bold text-white">
                    {b.guestName || b.user?.name || "Passenger"}
                    {b.user?.phone && <div className="text-xs text-slate-400 font-mono">{b.user.phone}</div>}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-slate-300">
                    {b.ticket ? `#${b.ticket.ticketNumber}` : "—"}
                  </TableCell>
                  <TableCell className="font-extrabold text-emerald-400">
                    ₹{b.totalAmount}
                  </TableCell>
                  <TableCell>
                    <Badge variant={b.paymentStatus === "COLLECTED" ? "success" : "warning"}>
                      {b.paymentStatus}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={b.status === "CONFIRMED" || b.status === "COMPLETED" ? "success" : b.status === "CANCELLED" ? "destructive" : "warning"}>
                      {b.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Validation Modal */}
      {showStartModal && (
        <TripStartValidationModal
          tripId={trip.id}
          isOpen={showStartModal}
          isAdmin={false}
          onClose={() => setShowStartModal(false)}
          onSuccess={() => fetchTrip()}
        />
      )}

      {/* Complete Modal */}
      {showCompleteModal && (
        <TripCompleteModal
          tripId={trip.id}
          isOpen={showCompleteModal}
          isAdmin={false}
          sourceName={trip.source.name}
          destName={trip.destination.name}
          onClose={() => setShowCompleteModal(false)}
          onSuccess={() => fetchTrip()}
        />
      )}
    </div>
  );
}
