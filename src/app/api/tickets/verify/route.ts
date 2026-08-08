import { auth } from "@/auth";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/notification-service";
import { verifyBoardingTicket } from "@/lib/ticket-service";
import { NextResponse } from "next/server";

// POST /api/tickets/verify — driver scans/enters a ticket number to mark boarding (ISSUED → USED).
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id || (session.user.role !== "DRIVER" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized — Driver or Admin access required." }, { status: 401 });
  }

  let body: { ticketNumber?: string; bookingId?: string; tripId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { ticketNumber, bookingId, tripId } = body ?? {};
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if ((!ticketNumber && !bookingId) || !tripId || !uuid.test(tripId) || (bookingId && !uuid.test(bookingId)) || (ticketNumber && !/^TKT-[0-9]{8}-[0-9]{6}$/.test(ticketNumber))) {
    return NextResponse.json(
      { error: "ticketNumber or bookingId, and tripId are required" },
      { status: 400 }
    );
  }

  try {
    const result = await verifyBoardingTicket({
      ticketNumber,
      bookingId,
      tripId,
      driverId: session.user.id,
      isAdmin: session.user.role === "ADMIN",
    });

    try {
      await logActivity(session.user.id, "VERIFY_TICKET", "ticket", result.ticket.id, {
        ticketNumber: result.ticket.ticketNumber,
      });
    } catch {
      // activity log failure is non-fatal
    }

    return NextResponse.json({
      success: true,
      alreadyUsed: result.alreadyUsed,
      ticket: {
        ticketNumber: result.ticket.ticketNumber,
        passengerName: result.ticket.passengerName,
        passengerPhone: result.ticket.passengerPhone,
        seatNumber: result.ticket.seatNumber,
        status: "USED",
        source: result.ticket.booking.trip.source.name,
        destination: result.ticket.booking.trip.destination.name,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to verify ticket";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
