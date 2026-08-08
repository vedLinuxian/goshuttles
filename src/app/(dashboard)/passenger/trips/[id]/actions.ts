"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { bookSeat, finalizePassengerBooking } from "@/lib/booking-service";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const tripIdSchema = z.string().uuid();
const seatNumberSchema = z.string().regex(/^[FMB][0-9]{1,2}$/);

export async function lockSeatAction(tripId: string, seatNumber: string) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Authentication required." };

  const parsed = z.object({ tripId: tripIdSchema, seatNumber: seatNumberSchema }).safeParse({ tripId, seatNumber });
  if (!parsed.success) return { success: false, error: "Invalid seat selection." };

  try {
    const booking = await bookSeat(session.user.id, tripId, seatNumber, "ONLINE");
    const [seat, config] = await Promise.all([
      db.tripSeat.findUnique({ where: { id: booking.seatId }, select: { lockedAt: true } }),
      db.pricingConfig.findFirst({ select: { seatLockTimeout: true } }),
    ]);
    if (!seat?.lockedAt) return { success: false, error: "Seat lock could not be confirmed." };
    const lockedUntil = new Date(seat.lockedAt.getTime() + (config?.seatLockTimeout ?? 5) * 60 * 1000).toISOString();
    revalidatePath(`/passenger/trips/${tripId}`);
    return { success: true, seatId: booking.seatId, lockedUntil };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to lock seat." };
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
}) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Authentication required." };

  const parsed = z.object({
    tripId: tripIdSchema,
    seatNumber: seatNumberSchema,
    paymentMode: z.enum(["CASH", "ONLINE"]),
    passengerName: z.string().trim().min(2).max(100),
    passengerPhone: z.string().trim().min(10).max(15),
    guestAge: z.number().int().min(1).max(120).optional(),
    guestGender: z.string().max(20).optional(),
    utrNumber: z.string().trim().min(4).max(50).optional(),
  }).refine((data) => data.paymentMode !== "ONLINE" || Boolean(data.utrNumber && data.utrNumber.trim().length >= 6), {
    message: "A valid 12-digit UTR / Payment reference number is mandatory for ONLINE payments.",
    path: ["utrNumber"],
  }).safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message || "Invalid booking details." };

  try {
    const booking = await finalizePassengerBooking({
      userId: session.user.id,
      tripId: parsed.data.tripId,
      seatNumber: parsed.data.seatNumber,
      paymentMode: parsed.data.paymentMode,
      guestName: parsed.data.passengerName,
      guestAge: parsed.data.guestAge,
      guestGender: parsed.data.guestGender,
      utrNumber: parsed.data.utrNumber,
    });

    revalidatePath("/passenger/dashboard");
    revalidatePath("/passenger/bookings");
    revalidatePath("/admin/tickets");
    return { success: true, bookingId: booking.id, ticketId: null };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Booking creation failed." };
  }
}
