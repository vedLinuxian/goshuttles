import { db } from "@/lib/db";
import { getPricingConfig } from "@/lib/pricing-service";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 10;

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const config = await getPricingConfig();
  const lockTimeoutMinutes = config.seatLockTimeout || 5;
  const threshold = new Date(Date.now() - lockTimeoutMinutes * 60 * 1000);

  // Find ALL pending bookings (both guest and authenticated users) where the seat lock has expired
  // and there is NO active payment verification awaiting approval
  // Previously this only cleaned `userId: null` (guest bookings) — a critical oversight
  const expired = await db.booking.findMany({
    where: {
      status: "PENDING",
      seat: {
        status: "LOCKED",
        lockedAt: { lt: threshold },
      },
      // Exclude bookings with active (PENDING or VERIFIED) payment verifications
      // — those are ONLINE bookings whose UTR is being reviewed and should stay locked
      paymentVerification: {
        none: {
          status: { in: ["PENDING", "VERIFIED"] },
        },
      },
    },
    select: { id: true, seatId: true, userId: true, paymentMode: true },
  });

  let count = 0;
  for (const booking of expired) {
    try {
      await db.$transaction(async (tx) => {
        // Re-read inside tx to avoid race with concurrent confirm/cancel
        const current = await tx.booking.findUnique({
          where: { id: booking.id },
          select: { status: true, seatId: true },
        });
        if (!current || current.status !== "PENDING") return;

        await tx.booking.update({
          where: { id: booking.id },
          data: {
            status: "CANCELLED",
            cancellationReason: "Auto-released: Payment not collected within timeout",
            cancelledAt: new Date(),
          },
        });

        if (booking.seatId) {
          await tx.tripSeat.updateMany({
            where: {
              id: booking.seatId,
              // Only release if the seat is still LOCKED or BOOKED (not re-taken by another user)
              status: { in: ["LOCKED", "BOOKED"] },
            },
            data: {
              status: "AVAILABLE",
              lockedAt: null,
              bookedByUserId: null,
              guestName: null,
            },
          });
        }
      });
      count++;
    } catch {
      // Skip bookings already acted on concurrently
      continue;
    }
  }

  return NextResponse.json({ cleaned: count, checkedBookings: expired.length });
}
