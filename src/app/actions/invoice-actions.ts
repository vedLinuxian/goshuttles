"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { issueInvoice, voidInvoice } from "@/lib/invoice-service";
import { revalidatePath } from "next/cache";

function revalidateInvoiceSurfaces(bookingId: string) {
  revalidatePath("/admin/bookings");
  revalidatePath("/admin/finance");
  revalidatePath("/driver/trips");
  revalidatePath("/passenger/invoices");
  revalidatePath(`/passenger/booking/${bookingId}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Admin: generate or update invoice with explicit status label
// ─────────────────────────────────────────────────────────────────────────────
export async function adminGenerateInvoiceAction(
  bookingId: string,
  forceStatus?: string,
  notes?: string,
) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return { success: false, error: "Admin privileges required." };
  }
  if (!bookingId) return { success: false, error: "Booking ID is required." };

  try {
    const invoice = await issueInvoice({
      bookingId,
      issuedById: session.user.id,
      forceStatus,
      notes,
    });

    await db.activityLog.create({
      data: {
        userId: session.user.id,
        action: "ADMIN_GENERATE_INVOICE",
        targetType: "booking",
        targetId: bookingId,
        metadata: { invoiceNumber: invoice.invoiceNumber, status: forceStatus ?? invoice.status },
      },
    });

    revalidateInvoiceSurfaces(bookingId);
    return { success: true, invoice };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to generate invoice." };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Admin: void an existing invoice
// ─────────────────────────────────────────────────────────────────────────────
export async function adminVoidInvoiceAction(invoiceId: string) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return { success: false, error: "Admin privileges required." };
  }
  if (!invoiceId) return { success: false, error: "Invoice ID is required." };

  try {
    const inv = await db.invoice.findUnique({
      where: { id: invoiceId },
      select: { bookingId: true, invoiceNumber: true },
    });
    if (!inv) return { success: false, error: "Invoice not found." };

    const voided = await voidInvoice(invoiceId, session.user.id);

    await db.activityLog.create({
      data: {
        userId: session.user.id,
        action: "ADMIN_VOID_INVOICE",
        targetType: "booking",
        targetId: inv.bookingId,
        metadata: { invoiceNumber: inv.invoiceNumber },
      },
    });

    revalidateInvoiceSurfaces(inv.bookingId);
    return { success: true, invoice: voided };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to void invoice." };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Driver: confirm cash collection → issues ticket + invoice atomically
// ─────────────────────────────────────────────────────────────────────────────
export async function driverCollectCashAction(bookingId: string) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "DRIVER") {
    return { success: false, error: "Driver login required." };
  }
  if (!bookingId) return { success: false, error: "Booking ID is required." };

  try {
    // Verify this booking belongs to driver's trip
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

    if (!booking) return { success: false, error: "Booking not found." };
    if (booking.trip.driverId !== session.user.id)
      return { success: false, error: "This booking does not belong to your trip." };
    if (booking.paymentMode !== "CASH")
      return { success: false, error: "Only cash bookings can be collected here." };
    if (booking.paymentStatus === "COLLECTED")
      return { success: false, error: "Cash already collected for this booking." };

    // confirmBookingPayment handles: ticket issuance + wallet debit + ledger entry
    const { confirmBookingPayment } = await import("@/lib/booking-service");
    await confirmBookingPayment(bookingId, session.user.id, "DRIVER");

    // Issue invoice as PAID
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
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Cash collection failed." };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Admin cash confirm: confirms + issues ticket + invoice
// ─────────────────────────────────────────────────────────────────────────────
export async function adminCollectCashAndIssueInvoice(bookingId: string, notes?: string) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return { success: false, error: "Admin privileges required." };
  }
  if (!bookingId) return { success: false, error: "Booking ID is required." };

  try {
    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      select: { paymentMode: true, paymentStatus: true, status: true },
    });
    if (!booking) return { success: false, error: "Booking not found." };
    if (booking.paymentMode !== "CASH") return { success: false, error: "Only CASH bookings can be confirmed here." };
    if (booking.paymentStatus === "COLLECTED") return { success: false, error: "Already collected." };

    const { confirmBookingPayment } = await import("@/lib/booking-service");
    await confirmBookingPayment(bookingId, session.user.id, "ADMIN");

    // Auto-generate PAID invoice
    const invoice = await issueInvoice({
      bookingId,
      issuedById: session.user.id,
      forceStatus: "PAID",
      notes: notes ?? "Cash confirmed and collected by admin.",
    });

    await db.activityLog.create({
      data: {
        userId: session.user.id,
        action: "ADMIN_CONFIRM_CASH_AND_INVOICE",
        targetType: "booking",
        targetId: bookingId,
        metadata: { invoiceNumber: invoice.invoiceNumber },
      },
    });

    revalidatePath("/admin/bookings");
    revalidatePath("/admin/tickets");
    revalidatePath("/admin/finance");
    return { success: true, invoice };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Confirmation failed." };
  }
}
