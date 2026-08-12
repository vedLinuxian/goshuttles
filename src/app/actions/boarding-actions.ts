"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

/** Driver or Admin confirms passenger boarding for a specific ticket */
export async function confirmPassengerBoardingAction(ticketId: string) {
  const session = await auth();
  if (!session?.user?.id || (session.user.role !== "DRIVER" && session.user.role !== "ADMIN")) {
    return { success: false, error: "Unauthorized boarding controller." };
  }
  if (!ticketId) return { success: false, error: "Ticket ID is required." };

  try {
    const ticket = await db.ticket.findUnique({
      where: { id: ticketId },
      include: {
        booking: {
          include: {
            trip: { include: { source: true, destination: true } },
            seat: true,
          },
        },
      },
    });

    if (!ticket) return { success: false, error: "Boarding pass not found." };

    if (session.user.role === "DRIVER" && ticket.booking.trip.driverId !== session.user.id) {
      return { success: false, error: "This boarding pass does not belong to your assigned trip." };
    }

    if (ticket.status === "USED") {
      return { success: true, message: "Passenger is already boarded." };
    }
    if (ticket.status === "CANCELLED") {
      return { success: false, error: "Cannot board a cancelled ticket." };
    }

    // Mark as USED
    const now = new Date();
    await db.ticket.update({
      where: { id: ticketId },
      data: { status: "USED", usedAt: now },
    });

    // Notify passenger
    if (ticket.booking.userId) {
      await db.notification.create({
        data: {
          userId: ticket.booking.userId,
          title: "Boarding Confirmed ✓",
          message: `Your boarding for ${ticket.booking.trip.source.name} → ${ticket.booking.trip.destination.name} (Seat ${ticket.seatNumber}) has been verified by driver. Have a safe journey!`,
          category: "TRIP",
        },
      });
    }

    // Audit log
    await db.activityLog.create({
      data: {
        userId: session.user.id,
        action: "BOARDING_VERIFIED",
        targetType: "ticket",
        targetId: ticketId,
        metadata: { ticketNumber: ticket.ticketNumber, tripId: ticket.booking.tripId },
      },
    });

    revalidatePath("/driver/dashboard");
    revalidatePath("/driver/trips");
    revalidatePath(`/driver/trips/${ticket.booking.tripId}`);
    revalidatePath("/admin/trips");
    revalidatePath(`/admin/trips/${ticket.booking.tripId}`);
    revalidatePath("/admin/tickets");

    return { success: true, ticketNumber: ticket.ticketNumber, passengerName: ticket.passengerName };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Boarding verification failed." };
  }
}

/** Quick Lookup & Boarding Verification by Ticket Number (e.g. TKT-20260812-123456) */
export async function verifyTicketByNumberAction(ticketQuery: string, tripId: string) {
  const session = await auth();
  if (!session?.user?.id || (session.user.role !== "DRIVER" && session.user.role !== "ADMIN")) {
    return { success: false, error: "Unauthorized boarding controller." };
  }
  if (!ticketQuery || !tripId) return { success: false, error: "Ticket reference and trip ID are required." };

  const cleanQuery = ticketQuery.trim().toUpperCase();

  const ticket = await db.ticket.findFirst({
    where: {
      booking: { tripId },
      OR: [
        { ticketNumber: { contains: cleanQuery, mode: "insensitive" } },
        { passengerName: { contains: cleanQuery, mode: "insensitive" } },
        { passengerPhone: { contains: cleanQuery, mode: "insensitive" } },
        { seatNumber: { equals: cleanQuery } },
      ],
    },
  });

  if (!ticket) {
    return { success: false, error: `No matching pass found for "${ticketQuery}" on this trip.` };
  }

  return confirmPassengerBoardingAction(ticket.id);
}

/** Mark passenger as No-Show */
export async function markPassengerNoShowAction(ticketId: string) {
  const session = await auth();
  if (!session?.user?.id || (session.user.role !== "DRIVER" && session.user.role !== "ADMIN")) {
    return { success: false, error: "Unauthorized." };
  }
  if (!ticketId) return { success: false, error: "Ticket ID is required." };

  try {
    const ticket = await db.ticket.findUnique({
      where: { id: ticketId },
      include: { booking: true },
    });
    if (!ticket) return { success: false, error: "Ticket not found." };

    await db.$transaction([
      db.ticket.update({ where: { id: ticketId }, data: { status: "NO_SHOW" } }),
      db.booking.update({ where: { id: ticket.bookingId }, data: { status: "NO_SHOW" } }),
    ]);

    revalidatePath("/driver/dashboard");
    revalidatePath("/driver/trips");
    revalidatePath("/admin/trips");
    revalidatePath("/admin/tickets");

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to mark no-show." };
  }
}
