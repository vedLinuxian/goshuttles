"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { confirmBookingPayment, rejectPaymentVerificationService } from "@/lib/booking-service";
import { verifyPaymentProofSchema, rejectPaymentProofSchema } from "@/lib/validators";
import { revalidatePath } from "next/cache";

export async function approvePaymentVerification(pvId: string, bookingId: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") throw new Error("Unauthorized");

  const parsed = verifyPaymentProofSchema.safeParse({ pvId, bookingId });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message || "Invalid input");
  }

  const verification = await db.paymentVerification.findUnique({
    where: { id: pvId },
    select: { bookingId: true, status: true },
  });
  if (!verification || verification.bookingId !== bookingId) {
    throw new Error("Payment proof does not belong to this booking.");
  }
  if (verification.status !== "PENDING") {
    throw new Error("Payment proof is no longer pending.");
  }
  await confirmBookingPayment(bookingId, session.user.id!, "ADMIN", pvId);
  revalidatePath("/admin/trips/approvals");
  revalidatePath("/admin/tickets");
}

export async function rejectPaymentVerification(pvId: string, reason: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") throw new Error("Unauthorized");

  const parsed = rejectPaymentProofSchema.safeParse({ pvId, reason });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message || "Invalid input");
  }

  await rejectPaymentVerificationService(pvId, session.user.id!, "ADMIN", parsed.data.reason);
  revalidatePath("/admin/trips/approvals");
  revalidatePath("/admin/tickets");
}

export async function approveTripOverride(tripId: string, reason: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") throw new Error("Unauthorized");

  if (!tripId) throw new Error("Trip ID is required");

  await db.trip.update({
    where: { id: tripId },
    data: {
      adminOverrideStart: true,
      overrideApprovedById: session.user.id,
      overrideApprovedAt: new Date(),
      overrideReason: reason || "Admin override approved for partial occupancy",
    },
  });

  revalidatePath("/admin/trips/approvals");
}

export async function approveDriverTripRequestAction(tripId: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") throw new Error("Unauthorized");
  const { approveTripRequest } = await import("@/lib/trip-service");
  await approveTripRequest(tripId, session.user.id);
  revalidatePath("/admin/trips/approvals");
  revalidatePath("/admin/trips");
  revalidatePath("/driver/trips");
}

export async function rejectDriverTripRequestAction(formData: FormData) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") throw new Error("Unauthorized");
  const tripId = formData.get("tripId") as string;
  const reason = (formData.get("reason") as string) || "Declined by operator";
  if (!tripId) throw new Error("Trip ID is required");
  const { rejectTripRequest } = await import("@/lib/trip-service");
  await rejectTripRequest(tripId, session.user.id, reason);
  revalidatePath("/admin/trips/approvals");
  revalidatePath("/admin/trips");
  revalidatePath("/driver/trips");
}

