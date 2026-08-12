import { db } from "./db";
import { getPricingConfig } from "./pricing-service";
import { issueTicket } from "./ticket-service";
import { dispatchSystemEvent } from "./notification-service";
import crypto from "node:crypto";

// ============================================================
// 1. bookSeat — passenger self-service booking
//    CASH  → seat held as BOOKED until the driver collects cash at boarding (ticket issued on collection)
//    ONLINE → seat LOCKED for a 5-min checkout window (ticket issued after UTR verification)
// ============================================================

export async function bookSeat(
  userId: string,
  tripId: string,
  seatNumber: string,
  paymentMode: "CASH" | "ONLINE"
) {
  if (!userId || !tripId || !seatNumber) {
    throw new Error("Invalid booking input parameters.");
  }

  const config = await getPricingConfig();
  const lockTimeoutMinutes = config.seatLockTimeout || 5;

  return db.$transaction(async (tx) => {
    const seat = await tx.tripSeat.findFirst({
      where: { tripId, seatNumber },
      include: { trip: true },
    });
    if (!seat) throw new Error("Seat not found");

    const price = Number(seat.price);
    if (isNaN(price) || price <= 0) {
      throw new Error("Invalid or negative seat price.");
    }

    const trip = seat.trip;
    const now = new Date();
    const manifestLockThreshold = new Date(now.getTime() + 5 * 60 * 1000);

    if (trip.manifestLocked) throw new Error("Trip manifest is locked; no further bookings allowed.");
    if (trip.startTime <= manifestLockThreshold) {
      throw new Error("Trip manifest is locked 5 minutes prior to departure.");
    }
    if (trip.isCancelled || trip.status === "CANCELLED") throw new Error("Trip is cancelled");
    if (trip.status !== "SCHEDULED") throw new Error("Trip is not bookable");

    // Atomic claim — the only source of truth for taking the seat.
    // CASH holds the seat as BOOKED (no expiry); ONLINE locks it for the checkout window.
    const claimResult = await tx.tripSeat.updateMany({
      where: {
        id: seat.id,
        OR: [
          { status: "AVAILABLE" },
          {
            status: "LOCKED",
            lockedAt: { lt: new Date(now.getTime() - lockTimeoutMinutes * 60 * 1000) },
          },
        ],
      },
      data:
        paymentMode === "CASH"
          ? { status: "BOOKED", lockedAt: null, bookedByUserId: userId }
          : { status: "LOCKED", lockedAt: now, bookedByUserId: userId },
    });

    if (claimResult.count === 0) {
      throw new Error("Seat was just claimed by another user. Please select another seat.");
    }

    const commissionRate = Number(config.commissionRate);
    const commissionAmount = price * (commissionRate / 100);

    // BUG-001 FIX: Archive any previous cancelled booking for this seat before creating a new one.
    // This preserves history in a separate step while allowing re-booking.
    const previousBooking = await tx.booking.findUnique({ where: { seatId: seat.id } });
    if (previousBooking && previousBooking.status === "CANCELLED") {
      // Soft-archive: rename the old booking's seatId link by nullifying it
      // We cannot delete (references tickets/ledger), so we detach the unique seat link.
      // Use a raw update bypassing the unique constraint temporarily:
      await tx.$executeRaw`UPDATE "bookings" SET "seat_id" = NULL WHERE "id" = ${previousBooking.id}`;
    }
    const booking = await tx.booking.create({
      data: {
        tripId,
        seatId: seat.id,
        userId,
        totalAmount: price,
        commissionAmount,
        paymentMode,
        paymentStatus: "PENDING",
        status: "PENDING",
      },
    });

    return booking;
  });
}

export async function finalizePassengerBooking(params: {
  userId: string;
  tripId: string;
  seatNumber: string;
  paymentMode: "CASH" | "ONLINE";
  guestName: string;
  guestAge?: number;
  guestGender?: string;
  utrNumber?: string;
}) {
  return db.$transaction(async (tx) => {
    const booking = await tx.booking.findFirst({
      where: {
        tripId: params.tripId,
        userId: params.userId,
        status: "PENDING",
        seat: { seatNumber: params.seatNumber, status: "LOCKED", bookedByUserId: params.userId },
      },
      include: {
        seat: true,
        trip: { include: { source: true, destination: true } },
      },
    });
    if (!booking) throw new Error("Your seat hold expired. Please select the seat again.");
    const config = await tx.pricingConfig.findFirst();
    const lockTimeoutMinutes = config?.seatLockTimeout ?? 5;
    if (!booking.seat.lockedAt || booking.seat.lockedAt.getTime() <= Date.now() - lockTimeoutMinutes * 60 * 1000) {
      throw new Error("Your seat hold expired. Please select the seat again.");
    }

    if (params.paymentMode === "ONLINE" && !params.utrNumber) {
      throw new Error("Payment reference is required.");
    }

    await tx.tripSeat.update({
      where: { id: booking.seatId },
      data: {
        status: params.paymentMode === "CASH" ? "BOOKED" : "LOCKED",
        lockedAt: params.paymentMode === "CASH" ? null : booking.seat.lockedAt,
        guestName: `${params.guestName} (${params.userId})`,
      },
    });

    const updated = await tx.booking.update({
      where: { id: booking.id },
      data: {
        paymentMode: params.paymentMode,
        guestName: params.guestName,
        guestAge: params.guestAge ?? 25,
        guestGender: params.guestGender ?? "Other",
        status: "CONFIRMED",
      },
    });

    if (params.paymentMode === "ONLINE") {
      const cleanUtr = params.utrNumber?.trim();
      if (!cleanUtr) {
        throw new Error("12-digit UTR / Payment reference number is mandatory for ONLINE payments.");
      }
      const existingUtr = await tx.paymentVerification.findFirst({
        where: {
          utrNumber: cleanUtr,
          bookingId: { not: booking.id },
          booking: { userId: { not: params.userId } },
        },
      });
      if (existingUtr) {
        throw new Error("This UTR / Payment Reference Number has already been submitted for another user's booking.");
      }

      await tx.paymentVerification.upsert({
        where: { bookingId: booking.id },
        update: {
          utrNumber: cleanUtr,
          status: "PENDING",
          verifiedById: null,
          verifiedAt: null,
          rejectionReason: null,
        },
        create: { bookingId: booking.id, utrNumber: cleanUtr, status: "PENDING" },
      });
    }

    // TICKET GATE:
    // - ONLINE bookings: issue a provisional "ISSUED" ticket immediately (passenger has paid; pending admin UTR verification)
    // - CASH bookings: DO NOT issue ticket here. Ticket is issued ONLY when the driver/admin physically
    //   confirms cash collection via confirmBookingPayment(). This prevents fraudulent boarding.
    if (params.paymentMode === "ONLINE") {
      await issueTicket(tx, {
        bookingId: booking.id,
        passengerName: params.guestName,
        passengerPhone: null,
        tripDate: booking.trip.startTime,
        source: booking.trip.source.name,
        destination: booking.trip.destination.name,
        seatNumber: booking.seat.seatNumber,
        ticketPrice: Number(booking.totalAmount),
        status: "ISSUED",
      });
    }

    return updated;
  });

}

// ============================================================
// 2. offlineBook — driver walk-up booking for a guest
// ============================================================

export async function offlineBook(
  driverId: string,
  tripId: string,
  seatNumber: string | undefined,
  guestPhone: string,
  guestName: string,
  paymentCollected: boolean = false,
  paymentMode: "CASH" | "ONLINE" = "CASH"
) {
  if (!driverId || !tripId || !guestName || !guestPhone) {
    throw new Error("Driver ID, trip ID, guest name, and guest phone are required.");
  }

  const config = await getPricingConfig();
  const lockTimeoutMinutes = config.seatLockTimeout || 5;

  return db.$transaction(async (tx) => {
    let seat;
    if (seatNumber) {
      seat = await tx.tripSeat.findFirst({
        where: { tripId, seatNumber },
        include: { trip: { include: { source: true, destination: true } } },
      });
      if (!seat) throw new Error("Seat not found");
    } else {
      seat = await tx.tripSeat.findFirst({
        where: { tripId, status: "AVAILABLE" },
        orderBy: { seatNumber: "asc" },
        include: { trip: { include: { source: true, destination: true } } },
      });
      if (!seat) throw new Error("No available seats on this shuttle");
    }

    const price = Number(seat.price);
    if (isNaN(price) || price <= 0) {
      throw new Error("Invalid or negative seat price.");
    }

    const now = new Date();

    // Authorization: the driver must own the trip they are booking against.
    if (seat.trip.driverId !== driverId) {
      throw new Error("You are not the driver for this trip.");
    }

    const manifestLockThreshold = new Date(now.getTime() + 5 * 60 * 1000);

    if (seat.trip.manifestLocked) throw new Error("Trip manifest is locked; no further bookings allowed.");
    if (seat.trip.startTime <= manifestLockThreshold) {
      throw new Error("Trip manifest is locked 5 minutes prior to departure.");
    }
    if (seat.trip.isCancelled || seat.trip.status === "CANCELLED") throw new Error("Trip is cancelled");
    if (seat.trip.status !== "SCHEDULED") {
      throw new Error("Trip is not bookable");
    }

    // Atomic claim — single source of truth.
    const claimResult = await tx.tripSeat.updateMany({
      where: {
        id: seat.id,
        OR: [
          { status: "AVAILABLE" },
          {
            status: "LOCKED",
            lockedAt: { lt: new Date(now.getTime() - lockTimeoutMinutes * 60 * 1000) },
          },
        ],
      },
      data: paymentCollected
        ? { status: "BOOKED", guestName: `${guestName} (${guestPhone})`, lockedAt: null, bookedByUserId: driverId }
        : { status: "LOCKED", guestName: `${guestName} (${guestPhone})`, lockedAt: now, bookedByUserId: driverId },
    });

    if (claimResult.count === 0) {
      throw new Error(`Seat ${seat.seatNumber} could not be reserved.`);
    }

    const commissionRate = Number(config.commissionRate);
    const commissionAmount = price * (commissionRate / 100);
    const fullGuestDetails = `${guestName} (${guestPhone})`;

    // BUG-001 FIX: Archive any previous cancelled booking for this seat before creating a new one.
    // This preserves history in a separate step while allowing re-booking.
    const previousBooking = await tx.booking.findUnique({ where: { seatId: seat.id } });
    if (previousBooking && previousBooking.status === "CANCELLED") {
      // Soft-archive: rename the old booking's seatId link by nullifying it
      // We cannot delete (references tickets/ledger), so we detach the unique seat link.
      // Use a raw update bypassing the unique constraint temporarily:
      await tx.$executeRaw`UPDATE "bookings" SET "seat_id" = NULL WHERE "id" = ${previousBooking.id}`;
    }
    const booking = await tx.booking.create({
      data: {
        tripId,
        seatId: seat.id,
        totalAmount: price,
        commissionAmount,
        paymentMode,
        paymentStatus: paymentCollected ? "COLLECTED" : "PENDING",
        status: paymentCollected ? "CONFIRMED" : "PENDING",
        collectedByDriver: paymentCollected,
        guestName: fullGuestDetails,
      },
    });

    // If payment collected upfront, issue ticket, record PlatformLedger, and debit platform commission from driver wallet.
    if (paymentCollected) {
      const netEarnings = price - commissionAmount;

      await issueTicket(tx, {
        bookingId: booking.id,
        passengerName: guestName,
        passengerPhone: guestPhone,
        tripDate: seat.trip.startTime,
        source: seat.trip.source.name,
        destination: seat.trip.destination.name,
        seatNumber: seat.seatNumber,
        ticketPrice: price,
        status: "ISSUED",
      });

      await tx.$executeRaw`
        INSERT INTO "platform_ledgers"
          ("id", "booking_id", "gross_fare", "commission_rate", "commission_earned", "net_driver_share", "payment_mode")
        VALUES
          (${crypto.randomUUID()}, ${booking.id}, ${price}, ${Number(config.commissionRate)}, ${commissionAmount}, ${netEarnings}, ${paymentMode})
        ON CONFLICT ("booking_id") DO UPDATE SET
          "gross_fare" = EXCLUDED."gross_fare",
          "commission_rate" = EXCLUDED."commission_rate",
          "commission_earned" = EXCLUDED."commission_earned",
          "net_driver_share" = EXCLUDED."net_driver_share",
          "payment_mode" = EXCLUDED."payment_mode"
      `;

      if (paymentMode === "CASH") {
        await tx.walletTransaction.create({
          data: {
            driverId,
            amount: -commissionAmount,
            transactionType: "COMMISSION_DEBIT",
            description: `Platform commission due for offline CASH booking #${booking.id.slice(0, 8)}`,
            referenceId: booking.id,
          },
        });

        await tx.driverProfile.updateMany({
          where: { userId: driverId },
          data: {
            totalEarnings: { increment: netEarnings },
            walletBalance: { decrement: commissionAmount },
          },
        });
      } else {
        await tx.walletTransaction.create({
          data: {
            driverId,
            amount: netEarnings,
            transactionType: "TRIP_EARNING",
            description: `Offline ONLINE booking confirmed for seat ${seat.seatNumber}`,
            referenceId: booking.id,
          },
        });

        await tx.driverProfile.updateMany({
          where: { userId: driverId },
          data: {
            totalEarnings: { increment: netEarnings },
            walletBalance: { increment: netEarnings },
          },
        });
      }
    }

    return booking;
  });
}

// ============================================================
// 3. confirmBookingPayment — driver/admin confirms cash collection or UTR verification
//    Credits the driver NET earnings (price − commission) and issues the ticket.
// ============================================================

export async function confirmBookingPayment(
  bookingId: string,
  actorId: string,
  actorRole: "DRIVER" | "ADMIN",
  paymentVerificationId?: string,
) {
  if (!bookingId || !actorId) {
    throw new Error("Booking ID and actor ID are required.");
  }

  return db.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      include: {
        seat: true,
        paymentVerification: true,
        trip: { include: { source: true, destination: true } },
        user: true,
      },
    });
    if (!booking) throw new Error("Booking not found");

    const beneficiaryDriverId = booking.trip.driverId;
    if (!beneficiaryDriverId) throw new Error("Trip has no assigned driver.");
    if (actorRole === "DRIVER" && beneficiaryDriverId !== actorId) {
      throw new Error("You are not the driver for this trip.");
    }
    if (actorRole !== "DRIVER" && actorRole !== "ADMIN") {
      throw new Error("Unauthorized payment approver.");
    }

    if (
      (booking.status === "CONFIRMED" || booking.status === "COMPLETED") &&
      booking.paymentStatus === "COLLECTED"
    ) {
      return booking;
    }
    if (booking.status === "CANCELLED") {
      throw new Error("Cannot confirm payment for a cancelled booking.");
    }

    if (booking.paymentMode === "ONLINE") {
      const verification = booking.paymentVerification;
      if (!verification || (paymentVerificationId && verification.id !== paymentVerificationId)) {
        throw new Error("Payment proof does not belong to this booking.");
      }
      if (verification.status === "REJECTED") {
        throw new Error("This payment proof was rejected.");
      }
      if (actorRole === "DRIVER" && verification.status !== "VERIFIED") {
        throw new Error("Online payment must be verified by an administrator first.");
      }
      if (actorRole === "ADMIN" && verification.status === "PENDING") {
        await tx.paymentVerification.update({
          where: { id: verification.id },
          data: { status: "VERIFIED", verifiedById: actorId, verifiedAt: new Date() },
        });
      }
      if (actorRole === "ADMIN" && verification.status !== "PENDING" && verification.status !== "VERIFIED") {
        throw new Error("Payment proof is not eligible for approval.");
      }
    }

    const price = Number(booking.totalAmount);
    const commission = Number(booking.commissionAmount);
    if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(commission) || commission < 0) {
      throw new Error("Invalid booking amount.");
    }

    const updateResult = await tx.booking.updateMany({
      where: { id: bookingId, paymentStatus: "PENDING" },
      data: {
        status: "CONFIRMED",
        paymentStatus: "COLLECTED",
        collectedByDriver: true,
      },
    });
    if (updateResult.count === 0) {
      const rechecked = await tx.booking.findUnique({ where: { id: bookingId } });
      if (rechecked?.paymentStatus === "COLLECTED") return rechecked;
      throw new Error("Booking payment is already collected or ineligible.");
    }


    if (booking.seat) {
      await tx.tripSeat.updateMany({
        where: {
          id: booking.seat.id,
          status: "LOCKED",
          ...(booking.userId ? { bookedByUserId: booking.userId } : { guestName: booking.guestName }),
        },
        data: { status: "BOOKED", lockedAt: null },
      });
    }

    const passengerName = booking.user?.name || booking.guestName || "Passenger";
    await issueTicket(tx, {
      bookingId,
      passengerName,
      passengerPhone: booking.user?.phone || null,
      tripDate: booking.trip.startTime,
      source: booking.trip.source.name,
      destination: booking.trip.destination.name,
      seatNumber: booking.seat?.seatNumber || "N/A",
      ticketPrice: price,
      status: "ISSUED",
    });

    const netEarnings = price - commission;

    // Record immutable PlatformLedger entry
    const commissionRate = Number((await getPricingConfig()).commissionRate);
    await tx.$executeRaw`
      INSERT INTO "platform_ledgers"
        ("id", "booking_id", "gross_fare", "commission_rate", "commission_earned", "net_driver_share", "payment_mode")
      VALUES
        (${crypto.randomUUID()}, ${bookingId}, ${price}, ${commissionRate}, ${commission}, ${netEarnings}, ${booking.paymentMode})
      ON CONFLICT ("booking_id") DO UPDATE SET
        "gross_fare" = EXCLUDED."gross_fare",
        "commission_rate" = EXCLUDED."commission_rate",
        "commission_earned" = EXCLUDED."commission_earned",
        "net_driver_share" = EXCLUDED."net_driver_share",
        "payment_mode" = EXCLUDED."payment_mode"
    `;

    const existingTx = await tx.walletTransaction.findFirst({
      where: { driverId: beneficiaryDriverId, referenceId: bookingId },
    });

    if (!existingTx) {
      if (booking.paymentMode === "ONLINE") {
        // ONLINE: Platform holds 100% fare. Driver receives net earnings credit (+netEarnings).
        if (netEarnings > 0) {
          await tx.walletTransaction.create({
            data: {
              driverId: beneficiaryDriverId,
              amount: netEarnings,
              transactionType: "TRIP_EARNING",
              description: `Online payment confirmed for booking #${bookingId.slice(0, 8)}`,
              referenceId: bookingId,
            },
          });
          await tx.driverProfile.updateMany({
            where: { userId: beneficiaryDriverId },
            data: { totalEarnings: { increment: netEarnings }, walletBalance: { increment: netEarnings } },
          });
        }
      } else {
        // CASH: Driver holds 100% gross cash. Driver platform wallet receives commission debit (-commission).
        await tx.walletTransaction.create({
          data: {
            driverId: beneficiaryDriverId,
            amount: -commission,
            transactionType: "COMMISSION_DEBIT",
            description: `Platform commission due for CASH booking #${bookingId.slice(0, 8)}`,
            referenceId: bookingId,
          },
        });
        await tx.driverProfile.updateMany({
          where: { userId: beneficiaryDriverId },
          data: { totalEarnings: { increment: netEarnings }, walletBalance: { decrement: commission } },
        });
      }
    }

    // Notify passenger if registered user
    if (booking.userId) {
      await tx.notification.create({
        data: {
          userId: booking.userId,
          title: "Payment Confirmed & Pass Ready",
          message: `Payment of ₹${price} for ${booking.trip.source.name} → ${booking.trip.destination.name} (Seat ${booking.seat?.seatNumber || "N/A"}) is confirmed. Your digital pass is ready!`,
          category: "PAYMENT",
        },
      });
    }

    // Notify assigned driver if action was performed by admin
    if (beneficiaryDriverId && beneficiaryDriverId !== actorId) {
      await tx.notification.create({
        data: {
          userId: beneficiaryDriverId,
          title: "Payment Confirmed by Admin",
          message: `Payment of ₹${price} for Seat ${booking.seat?.seatNumber || "N/A"} (${booking.trip.source.name} → ${booking.trip.destination.name}) was confirmed by Admin.`,
          category: "PAYMENT",
        },
      });
    }


    return tx.booking.findUniqueOrThrow({ where: { id: bookingId } });
  });
}

// ============================================================
// 3b. rejectPaymentVerificationService — mark verification as REJECTED
// ============================================================

export async function rejectPaymentVerificationService(
  pvId: string,
  verifierId: string,
  verifierRole: "DRIVER" | "ADMIN",
  reason?: string,
) {
  if (!pvId || !verifierId) {
    throw new Error("Verification ID and Verifier ID are required.");
  }

  return db.$transaction(async (tx) => {
    const pv = await tx.paymentVerification.findUnique({
      where: { id: pvId },
      include: { booking: { include: { seat: true } } },
    });
    if (!pv) throw new Error("Payment verification record not found.");
    const assignedDriverId = await tx.trip.findUnique({
      where: { id: pv.booking.tripId },
      select: { driverId: true },
    });
    if (verifierRole === "DRIVER" && assignedDriverId?.driverId !== verifierId) {
      throw new Error("You are not assigned to this booking's trip.");
    }
    if (verifierRole !== "DRIVER" && verifierRole !== "ADMIN") {
      throw new Error("Unauthorized payment verifier.");
    }
    if (pv.status === "REJECTED") return pv;
    if (pv.status !== "PENDING") throw new Error("Only pending payment proofs can be rejected.");

    const updated = await tx.paymentVerification.update({
      where: { id: pvId },
      data: {
        status: "REJECTED",
        verifiedById: verifierId,
        verifiedAt: new Date(),
        rejectionReason: reason || "Payment proof rejected",
      },
    });

    await tx.booking.updateMany({
      where: { id: pv.bookingId, status: "PENDING" },
      data: {
        status: "CANCELLED",
        cancellationReason: reason || "Payment proof rejected",
        cancelledAt: new Date(),
      },
    });

    if (pv.booking.seat) {
      await tx.tripSeat.updateMany({
        where: {
          id: pv.booking.seat.id,
          status: "LOCKED",
          ...(pv.booking.userId ? { bookedByUserId: pv.booking.userId } : { guestName: pv.booking.guestName }),
        },
        data: { status: "AVAILABLE", lockedAt: null, bookedByUserId: null, guestName: null },
      });
    }

    return updated;
  });
}


// ============================================================
// 4. cancelBooking — release the seat, cancel the ticket, reverse any driver credit
// ============================================================

export async function cancelBooking(
  bookingId: string,
  reason?: string,
  requestingUserId?: string,
  requestingUserRole?: string
) {
  if (!bookingId) throw new Error("Booking ID is required.");

  return db.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      include: { seat: true, ticket: true, trip: { select: { driverId: true } } },
    });
    if (!booking) throw new Error("Booking not found");

    // Authorization: every cancellation must have an explicit actor.
    if (!requestingUserId) {
      throw new Error("An authenticated cancellation actor is required.");
    }
    if (requestingUserRole !== "ADMIN") {
      const isOwner = booking.userId === requestingUserId;
      const isAssignedDriver = booking.trip.driverId === requestingUserId;
      if (!isOwner && !isAssignedDriver) {
        throw new Error("You are not authorized to cancel this booking.");
      }
    }

    if (booking.status === "CANCELLED") {
      throw new Error("This booking is already cancelled.");
    }
    if (booking.status === "COMPLETED") {
      throw new Error("Cannot cancel a completed booking.");
    }

    const wasCollected = booking.paymentStatus === "COLLECTED";
    const price = Number(booking.totalAmount);
    const commission = Number(booking.commissionAmount);

    const updateResult = await tx.booking.updateMany({
      where: {
        id: bookingId,
        status: { notIn: ["CANCELLED", "COMPLETED"] },
      },
      data: {
        status: "CANCELLED",
        cancellationReason: reason || "Passenger requested cancellation",
        cancelledAt: new Date(),
      },
    });

    if (updateResult.count === 0) {
      throw new Error("Booking could not be cancelled or is already finalized.");
    }

    // Conditional seat release — only if still reserved (avoids clobbering a re-booked seat)
    if (booking.seat) {
      await tx.tripSeat.updateMany({
        where: {
          id: booking.seat.id,
          status: { in: ["LOCKED", "BOOKED"] },
          ...(booking.userId ? { bookedByUserId: booking.userId } : { guestName: booking.guestName }),
        },
        data: {
          status: "AVAILABLE",
          lockedAt: null,
          bookedByUserId: null,
          guestName: null,
        },
      });
    }

    if (booking.ticket) {
      await tx.ticket.updateMany({
        where: { id: booking.ticket.id, status: { in: ["ISSUED", "USED"] } },
        data: { status: "CANCELLED" },
      });
    }

    // Reverse the financial entry created when payment was collected.
    if (wasCollected && booking.trip.driverId) {
      const reversalAmount = booking.paymentMode === "CASH" ? commission : price - commission;
      const existingReversal = await tx.walletTransaction.findFirst({
        where: {
          driverId: booking.trip.driverId,
          referenceId: bookingId,
          transactionType: "ADJUSTMENT",
        },
      });
      if (!existingReversal && reversalAmount > 0) {
        await tx.walletTransaction.create({
          data: {
            driverId: booking.trip.driverId,
            amount: booking.paymentMode === "CASH" ? reversalAmount : -reversalAmount,
            transactionType: "ADJUSTMENT",
            description: `Reversal: booking #${bookingId.slice(0, 8)} cancelled`,
            referenceId: bookingId,
          },
        });
        await tx.driverProfile.updateMany({
          where: { userId: booking.trip.driverId },
          data: booking.paymentMode === "CASH"
            ? { walletBalance: { increment: reversalAmount } }
            : {
                totalEarnings: { decrement: reversalAmount },
                walletBalance: { decrement: reversalAmount },
              },
        });
      }

      if (booking.paymentMode === "ONLINE") {
        await tx.refundRecord.create({
          data: {
            bookingId: bookingId,
            refundAmount: booking.totalAmount,
            reason: `Passenger refund for cancelled booking: ${reason || "Cancelled by passenger"}`,
            status: "COMPLETED",
          },
        });
      }
    }

    return tx.booking.findUniqueOrThrow({ where: { id: bookingId } });
  });
}

// ============================================================
// 5. releaseExpiredLocks — release seats whose LOCKED hold has expired,
//    but protect seats whose booking has a UTR awaiting verification.
// ============================================================

export async function releaseExpiredLocks() {
  const config = await getPricingConfig();
  const lockTimeoutMinutes = config.seatLockTimeout || 5;
  const expiryTime = new Date(Date.now() - lockTimeoutMinutes * 60 * 1000);
  const now = new Date();

  return db.$transaction(async (tx) => {
    const expiredSeats = await tx.tripSeat.findMany({
      where: {
        status: "LOCKED",
        lockedAt: { lt: expiryTime },
        OR: [
          { booking: null },
          {
            booking: {
              status: "CANCELLED",
            },
          },
          {
            booking: {
              paymentVerification: null,
            },
          },
          {
            booking: {
              paymentVerification: { status: "REJECTED" },
            },
          },
        ],
      },
      select: { id: true },
    });

    const expiredSeatIds = expiredSeats.map((seat) => seat.id);
    if (expiredSeatIds.length === 0) return 0;

    const releaseResult = await tx.tripSeat.updateMany({
      where: {
        id: { in: expiredSeatIds },
        status: "LOCKED",
        lockedAt: { lt: expiryTime },
      },
      data: {
        status: "AVAILABLE",
        lockedAt: null,
        bookedByUserId: null,
        guestName: null,
      },
    });

    await tx.booking.updateMany({
      where: { seatId: { in: expiredSeatIds }, status: "PENDING" },
      data: {
        status: "CANCELLED",
        cancellationReason: "Seat lock expired (auto-released)",
        cancelledAt: now,
      },
    });

    return releaseResult.count;
  });
}

// ============================================================
// 6. Read helpers
// ============================================================

export async function getBookingById(bookingId: string) {
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: {
      trip: { include: { source: true, destination: true, vehicle: true, driver: true } },
      seat: true,
      ticket: true,
      paymentVerification: true,
      user: {
        select: {
          id: true,
          name: true,
          phone: true,
          passengerProfile: { select: { age: true, gender: true } },
        },
      },
    },
  });

  if (!booking) return null;

  const companionBookings = await db.booking.findMany({
    where: {
      userId: booking.userId,
      tripId: booking.tripId,
      status: { in: ["PENDING", "CONFIRMED", "COMPLETED"] },
    },
    include: {
      seat: true,
      user: { select: { name: true, passengerProfile: { select: { age: true, gender: true } } } },
    },
    orderBy: { createdAt: "asc" },
  });

  const groupSeats = companionBookings.map((b) => b.seat?.seatNumber).filter(Boolean) as string[];
  const groupRoster = companionBookings.map((b) => ({
    seatNumber: b.seat?.seatNumber || "",
    passengerName: b.guestName || b.user?.name || "Passenger",
    guestAge: b.guestAge || b.user?.passengerProfile?.age || null,
    guestGender: b.guestGender || b.user?.passengerProfile?.gender || null,
  }));
  const totalGroupFare = companionBookings.reduce((sum, b) => sum + Number(b.totalAmount), 0);

  return {
    ...booking,
    groupSeats: groupSeats.length > 0 ? groupSeats : [booking.seat?.seatNumber || "Unassigned"],
    groupRoster,
    totalGroupFare: totalGroupFare > 0 ? totalGroupFare : Number(booking.totalAmount),
  };
}

export async function getPassengerBookings(userId: string) {
  return db.booking.findMany({
    where: { userId },
    include: {
      trip: { include: { source: true, destination: true, vehicle: true, driver: true } },
      seat: true,
      ticket: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getDriverPendingBookings(
  driverId: string,
  page: number = 1,
  pageSize: number = 20
) {
  const skip = (page - 1) * pageSize;

  const [bookings, totalCount] = await Promise.all([
    db.booking.findMany({
      where: {
        trip: { driverId, startTime: { gte: new Date() } },
        status: "PENDING",
      },
      include: {
        user: { select: { id: true, name: true, phone: true } },
        trip: { include: { source: true, destination: true } },
        seat: true,
        paymentVerification: true,
      },
      orderBy: [{ trip: { startTime: "asc" } }, { createdAt: "asc" }],
      skip,
      take: pageSize,
    }),
    db.booking.count({
      where: {
        trip: { driverId, startTime: { gte: new Date() } },
        status: "PENDING",
      },
    }),
  ]);

  return { bookings, totalCount, totalPages: Math.ceil(totalCount / pageSize) };
}
