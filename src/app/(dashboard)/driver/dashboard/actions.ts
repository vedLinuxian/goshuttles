"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { cancelBooking, confirmBookingPayment, rejectPaymentVerificationService } from "@/lib/booking-service";
import { startTrip, completeTrip } from "@/lib/trip-service";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function confirmPassengerPaymentAction(bookingId: string) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "DRIVER") redirect("/login");

  if (!bookingId) throw new Error("Booking ID is required");

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: { trip: { select: { driverId: true } } },
  });
  if (!booking || booking.trip.driverId !== session.user.id) {
    throw new Error("This booking does not belong to your trip");
  }

  await confirmBookingPayment(bookingId, session.user.id, "DRIVER");
  revalidatePath("/driver/dashboard");
  revalidatePath("/driver/bookings/pending");
  revalidatePath("/admin/tickets");
}

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

export async function handleStartTripAction(tripId: string) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "DRIVER") redirect("/login");

  const trip = await db.trip.findUnique({ where: { id: tripId }, select: { driverId: true } });
  if (!trip || trip.driverId !== session.user.id) {
    throw new Error("You do not own this trip");
  }

  await startTrip(tripId);
  revalidatePath("/driver/dashboard");
}

export async function handleCompleteTripAction(tripId: string) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "DRIVER") redirect("/login");

  const trip = await db.trip.findUnique({ where: { id: tripId }, select: { driverId: true } });
  if (!trip || trip.driverId !== session.user.id) {
    throw new Error("You do not own this trip");
  }

  await completeTrip(tripId);
  revalidatePath("/driver/dashboard");
}
