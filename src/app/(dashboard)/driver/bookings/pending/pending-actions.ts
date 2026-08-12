"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { cancelBooking, rejectPaymentVerificationService } from "@/lib/booking-service";
import { issueInvoice } from "@/lib/invoice-service";
import { confirmBookingPayment } from "@/lib/booking-service";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

/** Driver collects physical cash → confirms booking, issues ticket + PAID invoice atomically */
export async function driverCollectCashAction(bookingId: string) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "DRIVER") redirect("/login");

  if (!bookingId) throw new Error("Booking ID is required");

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      paymentMode: true,
      paymentStatus: true,
      status: true,
      trip: { select: { driverId: true } },
    },
  });

  if (!booking) throw new Error("Booking not found.");
  if (booking.trip.driverId !== session.user.id)
    throw new Error("This booking does not belong to your trip.");
  if (booking.paymentMode !== "CASH")
    throw new Error("Only cash bookings can be collected here.");
  if (booking.paymentStatus === "COLLECTED")
    throw new Error("Cash already collected for this booking.");

  // Confirm payment → ticket is issued inside confirmBookingPayment for CASH
  await confirmBookingPayment(bookingId, session.user.id, "DRIVER");

  // Issue PAID invoice
  await issueInvoice({
    bookingId,
    issuedById: session.user.id,
    forceStatus: "PAID",
    notes: "Cash collected at boarding by driver.",
  });

  await db.activityLog.create({
    data: {
      userId: session.user.id,
      action: "DRIVER_COLLECT_CASH",
      targetType: "booking",
      targetId: bookingId,
      metadata: {},
    },
  });

  revalidatePath("/driver/bookings/pending");
  revalidatePath("/driver/trips");
  revalidatePath("/driver/dashboard");
  revalidatePath("/admin/bookings");
  revalidatePath("/admin/tickets");
  revalidatePath("/admin/finance/invoices");
}

/** Driver rejects a passenger booking (cash or online proof rejection) */
export async function rejectPassengerPaymentAction(bookingId: string, reason?: string) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "DRIVER") redirect("/login");

  if (!bookingId) throw new Error("Booking ID is required");

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: {
      trip: { select: { driverId: true } },
      paymentVerification: { select: { id: true } },
    },
  });

  if (!booking || booking.trip.driverId !== session.user.id) {
    throw new Error("This booking does not belong to your trip");
  }

  if (booking.paymentVerification) {
    await rejectPaymentVerificationService(booking.paymentVerification.id, session.user.id, "DRIVER", reason);
  } else {
    await cancelBooking(bookingId, reason || "Cash booking rejected by driver", session.user.id, "DRIVER");
  }

  revalidatePath("/driver/dashboard");
  revalidatePath("/driver/bookings/pending");
  revalidatePath("/admin/bookings");
  revalidatePath("/admin/tickets");
}
