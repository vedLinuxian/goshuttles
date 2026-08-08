export type PrintableTicketData = {
  id: string;
  ticketNumber: string;
  status: "ISSUED" | "USED" | "CANCELLED" | "NO_SHOW";
  passengerName: string;
  passengerPhone: string | null;
  source: string;
  destination: string;
  departureAt: string;
  issuedAt: string;
  usedAt: string | null;
  updatedAt: string;
  seatNumber: string;
  ticketPrice: string;
  paymentMode: "CASH" | "ONLINE";
  paymentStatus: "PENDING" | "COLLECTED";
  driverName: string;
  driverPhone: string | null;
  vehicleRegistration: string;
  vehicleModel: string;
  qrValue: string;
};

export function toPrintableTicketData(ticket: {
  id: string;
  ticketNumber: string;
  status: "ISSUED" | "USED" | "CANCELLED" | "NO_SHOW";
  passengerName: string;
  passengerPhone: string | null;
  tripDate: Date;
  source: string;
  destination: string;
  seatNumber: string;
  ticketPrice: unknown;
  issuedAt: Date;
  usedAt?: Date | null;
  updatedAt?: Date | null;
  booking: {
    paymentMode: "CASH" | "ONLINE";
    paymentStatus: "PENDING" | "COLLECTED";
    user: { phone: string } | null;
    trip: {
      driver: { id: string; name: string | null; phone: string } | null;
      vehicle: { regNumber: string; modelName: string } | null;
    };
  };
}): PrintableTicketData {
  return {
    id: ticket.id,
    ticketNumber: ticket.ticketNumber,
    status: ticket.status,
    passengerName: ticket.passengerName,
    passengerPhone: ticket.passengerPhone || ticket.booking.user?.phone || null,
    source: ticket.source,
    destination: ticket.destination,
    departureAt: ticket.tripDate.toISOString(),
    issuedAt: ticket.issuedAt.toISOString(),
    usedAt: ticket.usedAt ? ticket.usedAt.toISOString() : null,
    updatedAt: ticket.updatedAt ? ticket.updatedAt.toISOString() : ticket.issuedAt.toISOString(),
    seatNumber: ticket.seatNumber,
    ticketPrice: String(ticket.ticketPrice),
    paymentMode: ticket.booking.paymentMode,
    paymentStatus: ticket.booking.paymentStatus,
    driverName: ticket.booking.trip.driver?.name || "Unassigned driver",
    driverPhone: ticket.booking.trip.driver?.phone || null,
    vehicleRegistration: ticket.booking.trip.vehicle?.regNumber || "Unassigned vehicle",
    vehicleModel: ticket.booking.trip.vehicle?.modelName || "",
    qrValue: `GOSHUTTLES:TICKET:${ticket.ticketNumber}:${ticket.id}`,
  };
}
