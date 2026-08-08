"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { cancelBooking, confirmBookingPayment } from "@/lib/booking-service";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const bookingIdSchema = z.string().uuid();
const reasonSchema = z.string().trim().max(500).optional();

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }
  return session.user.id;
}

function revalidateBookingSurfaces(bookingId: string) {
  revalidatePath("/admin/bookings");
  revalidatePath("/admin/tickets");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/trips/approvals");
  revalidatePath("/passenger/bookings");
  revalidatePath(`/passenger/booking/${bookingId}`);
}

export async function confirmAdminCashPayment(bookingId: string) {
  const adminId = await requireAdmin();
  if (!bookingIdSchema.safeParse(bookingId).success) throw new Error("Invalid booking ID.");

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    select: { paymentMode: true, status: true, tripId: true },
  });
  if (!booking) throw new Error("Booking not found.");
  if (booking.paymentMode !== "CASH") throw new Error("Only cash bookings can be confirmed here.");
  if (booking.status !== "PENDING") throw new Error("Booking is no longer pending.");

  await confirmBookingPayment(bookingId, adminId, "ADMIN");
  await db.activityLog.create({
    data: {
      userId: adminId,
      action: "ADMIN_CONFIRM_CASH_PAYMENT",
      targetType: "booking",
      targetId: bookingId,
      metadata: { tripId: booking.tripId },
    },
  });
  revalidateBookingSurfaces(bookingId);
  return { success: true };
}

export async function cancelAdminBooking(bookingId: string, reason?: string) {
  const adminId = await requireAdmin();
  if (!bookingIdSchema.safeParse(bookingId).success) throw new Error("Invalid booking ID.");
  const parsedReason = reasonSchema.parse(reason) || "Cancelled by admin";

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    select: { status: true, tripId: true },
  });
  if (!booking) throw new Error("Booking not found.");
  if (!["PENDING", "CONFIRMED"].includes(booking.status)) {
    throw new Error("Only pending or confirmed bookings can be cancelled.");
  }

  await cancelBooking(bookingId, parsedReason, adminId, "ADMIN");
  await db.activityLog.create({
    data: {
      userId: adminId,
      action: "ADMIN_CANCEL_BOOKING",
      targetType: "booking",
      targetId: bookingId,
      metadata: { tripId: booking.tripId, reason: parsedReason },
    },
  });
  revalidateBookingSurfaces(bookingId);
  return { success: true };
}

export async function markAdminBookingNoShow(bookingId: string, reason?: string) {
  const adminId = await requireAdmin();
  if (!bookingIdSchema.safeParse(bookingId).success) throw new Error("Invalid booking ID.");
  const parsedReason = reasonSchema.parse(reason) || "Marked no-show by admin";

  const result = await db.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      include: { seat: true, ticket: true },
    });
    if (!booking) throw new Error("Booking not found.");
    if (!["PENDING", "CONFIRMED"].includes(booking.status)) {
      throw new Error("Only pending or confirmed bookings can be marked no-show.");
    }

    const updated = await tx.booking.updateMany({
      where: { id: bookingId, status: { in: ["PENDING", "CONFIRMED"] } },
      data: { status: "NO_SHOW", cancellationReason: parsedReason, cancelledAt: new Date() },
    });
    if (updated.count === 0) throw new Error("Booking changed before it could be marked no-show.");

    if (booking.seat) {
      await tx.tripSeat.updateMany({
        where: {
          id: booking.seat.id,
          status: { in: ["LOCKED", "BOOKED"] },
          ...(booking.userId ? { bookedByUserId: booking.userId } : { guestName: booking.guestName }),
        },
        data: { status: "AVAILABLE", lockedAt: null, bookedByUserId: null, guestName: null },
      });
    }
    if (booking.ticket) {
      await tx.ticket.updateMany({
        where: { id: booking.ticket.id, status: { in: ["ISSUED", "USED"] } },
        data: { status: "NO_SHOW" },
      });
    }
    return { tripId: booking.tripId };
  });

  await db.activityLog.create({
    data: {
      userId: adminId,
      action: "ADMIN_MARK_BOOKING_NO_SHOW",
      targetType: "booking",
      targetId: bookingId,
      metadata: { tripId: result.tripId, reason: parsedReason },
    },
  });
  revalidateBookingSurfaces(bookingId);
  return { success: true };
}
