"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { bookSeat, finalizePassengerBooking } from "@/lib/booking-service";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const tripIdSchema = z.string().uuid();
const seatNumberSchema = z.string().regex(/^[FMB][0-9]{1,2}$/);

export async function lockSeatAction(tripId: string, seatNumbersInput: string) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Authentication required." };

  const seatNumbers = seatNumbersInput
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (seatNumbers.length === 0) return { success: false, error: "No seats selected." };

  for (const s of seatNumbers) {
    if (!seatNumberSchema.safeParse(s).success) {
      return { success: false, error: `Invalid seat number: ${s}` };
    }
  }

  try {
    const bookings = await Promise.all(
      seatNumbers.map((seatNum) => bookSeat(session.user.id, tripId, seatNum, "ONLINE"))
    );

    const firstBooking = bookings[0];
    const [seat, config] = await Promise.all([
      db.tripSeat.findUnique({ where: { id: firstBooking.seatId }, select: { lockedAt: true } }),
      db.pricingConfig.findFirst({ select: { seatLockTimeout: true } }),
    ]);
    if (!seat?.lockedAt) return { success: false, error: "Seat lock could not be confirmed." };
    const lockedUntil = new Date(seat.lockedAt.getTime() + (config?.seatLockTimeout ?? 5) * 60 * 1000).toISOString();
    revalidatePath(`/passenger/trips/${tripId}`);
    return { success: true, seatId: firstBooking.seatId, lockedUntil };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to lock seats." };
  }
}

export async function createBookingAction(input: {
  tripId: string;
  seatNumber: string;
  paymentMode: "CASH" | "ONLINE";
  passengerName: string;
  passengerPhone: string;
  guestAge?: number;
  guestGender?: string;
  utrNumber?: string;
  passengers?: Array<{
    seatNumber: string;
    passengerName: string;
    guestAge?: number;
    guestGender?: string;
  }>;
}) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Authentication required." };

  if (input.paymentMode === "ONLINE" && (!input.utrNumber || input.utrNumber.trim().length < 4)) {
    return { success: false, error: "A valid 12-digit UTR / Payment reference number is mandatory for ONLINE payments." };
  }

  const roster = input.passengers && input.passengers.length > 0
    ? input.passengers
    : input.seatNumber.split(",").map((s) => ({
        seatNumber: s.trim(),
        passengerName: input.passengerName,
        guestAge: input.guestAge,
        guestGender: input.guestGender,
      })).filter((p) => p.seatNumber.length > 0);

  try {
    const createdBookings = await Promise.all(
      roster.map((p) =>
        finalizePassengerBooking({
          userId: session.user.id,
          tripId: input.tripId,
          seatNumber: p.seatNumber,
          paymentMode: input.paymentMode,
          guestName: p.passengerName || input.passengerName,
          guestAge: p.guestAge || input.guestAge,
          guestGender: p.guestGender || input.guestGender,
          utrNumber: input.utrNumber,
        })
      )
    );

    revalidatePath("/passenger/dashboard");
    revalidatePath("/passenger/bookings");
    revalidatePath("/admin/tickets");
    return { success: true, bookingId: createdBookings[0].id, ticketId: null };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Booking creation failed." };
  }
}
