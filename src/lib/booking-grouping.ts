export interface GroupedBooking<T = any> {
  id: string;
  bookingIds: string[];
  userId: string | null;
  tripId: string;
  status: string;
  paymentMode: string;
  paymentStatus: string;
  totalAmount: string;
  createdAt: string;
  seatNumbers: string[];
  seatNumberDisplay: string;
  passengerName: string;
  passengerPhone: string | null;
  guestRoster: Array<{ name: string; seatNumber: string }>;
  trip: {
    id: string;
    startTime: string;
    source: string;
    destination: string;
    driverId: string | null;
    driverName: string | null;
  };
  ticket: {
    id: string;
    ticketNumber: string;
    status: string;
  } | null;
  paymentVerification: {
    id: string;
    utrNumber: string | null;
    status: string;
  } | null;
  cancellationReason: string | null;
  rawBookings: T[];
}

export function groupBookings<T extends {
  id: string;
  userId?: string | null;
  status: string;
  paymentMode: string;
  paymentStatus: string;
  totalAmount: string | number;
  createdAt: string | Date;
  guestName?: string | null;
  cancellationReason?: string | null;
  seatNumber?: string;
  seat?: { seatNumber: string } | null;
  trip: {
    id: string;
    startTime: string | Date;
    source: { name: string } | string;
    destination: { name: string } | string;
    driverName?: string | null;
    driverId?: string | null;
    driver?: { id?: string; name?: string | null } | null;
  };
  ticket?: { id: string; ticketNumber: string; status: string } | null;
  paymentVerification?: { id: string; utrNumber: string | null; status: string } | null;
  user?: { name?: string | null; phone?: string | null } | null;
}>(bookings: T[]): GroupedBooking<T>[] {
  const groups: Map<string, T[]> = new Map();

  for (const b of bookings) {
    const uKey = b.userId || b.user?.phone || b.guestName || "anonymous";
    const tKey = b.trip?.id || "notrip";
    const dateObj = new Date(b.createdAt);
    const minuteBucket = Math.floor(dateObj.getTime() / (60 * 1000));
    
    // Group key combining user/guest, trip, paymentMode and 1-minute window
    const groupKey = `${uKey}_${tKey}_${b.paymentMode}_${minuteBucket}`;

    if (!groups.has(groupKey)) {
      groups.set(groupKey, []);
    }
    groups.get(groupKey)!.push(b);
  }

  const result: GroupedBooking<T>[] = [];

  for (const group of groups.values()) {
    const primary = group[0];
    const bookingIds = group.map((b) => b.id);
    const seatNumbers = group
      .map((b) => b.seat?.seatNumber || b.seatNumber || "")
      .filter(Boolean);

    const totalFareSum = group.reduce((sum, b) => sum + Number(b.totalAmount), 0);

    const guestRoster = group.map((b) => ({
      name: b.guestName || b.user?.name || "Passenger",
      seatNumber: b.seat?.seatNumber || b.seatNumber || "",
    }));

    const seatNumberDisplay = seatNumbers.length > 1
      ? `${seatNumbers.length} Seats (${seatNumbers.join(", ")})`
      : seatNumbers[0] || "Unassigned";

    const validTicket = group.find((b) => b.ticket)?.ticket || null;

    const sourceName = typeof primary.trip.source === "string" ? primary.trip.source : primary.trip.source.name;
    const destName = typeof primary.trip.destination === "string" ? primary.trip.destination : primary.trip.destination.name;
    const driverName = primary.trip.driverName ?? primary.trip.driver?.name ?? null;
    const driverId = primary.trip.driverId ?? primary.trip.driver?.id ?? null;

    result.push({
      id: primary.id,
      bookingIds,
      userId: primary.userId || null,
      tripId: primary.trip.id,
      status: primary.status,
      paymentMode: primary.paymentMode,
      paymentStatus: primary.paymentStatus,
      totalAmount: String(totalFareSum),
      createdAt: typeof primary.createdAt === "string" ? primary.createdAt : primary.createdAt.toISOString(),
      seatNumbers,
      seatNumberDisplay,
      passengerName: primary.user?.name || primary.guestName || "Passenger",
      passengerPhone: primary.user?.phone || null,
      guestRoster,
      trip: {
        id: primary.trip.id,
        startTime: typeof primary.trip.startTime === "string" ? primary.trip.startTime : primary.trip.startTime.toISOString(),
        source: sourceName,
        destination: destName,
        driverId: driverId ?? null,
        driverName: driverName ?? null,
      },
      ticket: validTicket,
      paymentVerification: primary.paymentVerification || null,
      cancellationReason: primary.cancellationReason || null,
      rawBookings: group,
    });
  }

  return result;
}
