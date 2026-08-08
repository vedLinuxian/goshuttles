"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { submitPaymentProofSchema } from "@/lib/validators";
import { redirect } from "next/navigation";

export async function confirmPayment(bookingId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const utrNumber = (formData.get("utr") as string || "").trim();
  const screenshotUrl = (formData.get("screenshotUrl") as string || "").trim();

  const parsed = submitPaymentProofSchema.safeParse({
    bookingId,
    utrNumber,
    screenshotUrl,
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message || "Invalid payment proof submission.");
  }

  // Verify booking ownership
  const booking = await db.booking.findUnique({ where: { id: bookingId } });
  if (!booking || booking.userId !== session.user.id) {
    throw new Error("You do not own this booking");
  }
  if (parsed.data.utrNumber) {
    const existingUtr = await db.paymentVerification.findFirst({
      where: { utrNumber: parsed.data.utrNumber, bookingId: { not: bookingId } },
    });
    if (existingUtr) {
      throw new Error("This UTR / Payment Reference Number has already been submitted for another booking.");
    }
  }

  await db.paymentVerification.upsert({
    where: { bookingId },
    create: {
      bookingId,
      utrNumber: parsed.data.utrNumber,
      screenshotUrl: parsed.data.screenshotUrl || null,
      status: "PENDING",
    },
    update: {
      utrNumber: parsed.data.utrNumber,
      screenshotUrl: parsed.data.screenshotUrl || null,
      status: "PENDING",
      rejectionReason: null,
    },
  });

  redirect(`/passenger/booking/${bookingId}`);
}

