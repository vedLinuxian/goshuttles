"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { adminCollectCashAndIssueInvoice } from "@/app/actions/invoice-actions";
import { adminGenerateInvoiceAction } from "@/app/actions/invoice-actions";

/** Admin confirms cash collection from the boarding passes / tickets page */
export async function adminTicketCollectCashAction(bookingId: string) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return { success: false, error: "Admin access required." };
  }
  if (!bookingId) return { success: false, error: "Booking ID required." };

  const result = await adminCollectCashAndIssueInvoice(bookingId, "Cash confirmed via Boarding Passes page by admin.");
  if (!result.success) return { success: false, error: result.error };

  revalidatePath("/admin/tickets");
  revalidatePath("/admin/bookings");
  revalidatePath("/admin/finance/invoices");
  return { success: true };
}

/** Admin generates invoice for any booking from tickets page */
export async function adminTicketGenerateInvoiceAction(bookingId: string, status: string) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return { success: false, error: "Admin access required." };
  }
  const result = await adminGenerateInvoiceAction(bookingId, status);
  if (!result.success) return { success: false, error: result.error };

  revalidatePath("/admin/tickets");
  revalidatePath("/admin/finance/invoices");
  return { success: true };
}
