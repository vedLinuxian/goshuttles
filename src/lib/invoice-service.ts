/**
 * invoice-service.ts
 * Immutable financial document service for GoShuttles.
 *
 * RULES:
 * - Drivers can generate an invoice ONLY when booking.paymentStatus === "COLLECTED"
 * - Passengers can view invoices only when status === "PAID"
 * - Admin can generate an invoice for ANY booking at ANY time with any label
 * - Invoice numbers are immutable once issued
 * - Voiding an invoice is admin-only and is a soft operation (status → VOID)
 */

import { db } from "./db";
import { Prisma } from "@/generated/prisma/client";
import crypto from "node:crypto";

type TransactionClient = Prisma.TransactionClient;

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

function generateInvoiceNumber(): string {
  const ts = new Date();
  const dateStr = `${ts.getFullYear()}${String(ts.getMonth() + 1).padStart(2, "0")}${String(ts.getDate()).padStart(2, "0")}`;
  const seq = Math.floor(10000 + Math.random() * 90000).toString();
  return `INV-${dateStr}-${seq}`;
}

/** Derive the correct InvoiceStatus from booking state */
function deriveInvoiceStatus(
  paymentStatus: string,
  bookingStatus: string,
  forceStatus?: string,
): "PAID" | "UNPAID" | "VOID" | "EXPIRED" | "PARTIALLY_PAID" {
  if (forceStatus && ["PAID", "UNPAID", "VOID", "EXPIRED", "PARTIALLY_PAID"].includes(forceStatus)) {
    return forceStatus as "PAID" | "UNPAID" | "VOID" | "EXPIRED" | "PARTIALLY_PAID";
  }
  if (bookingStatus === "CANCELLED" || bookingStatus === "NO_SHOW") return "VOID";
  if (paymentStatus === "COLLECTED") return "PAID";
  return "UNPAID";
}

// ──────────────────────────────────────────────────────────────────────────────
// Core: issue or regenerate invoice
// ──────────────────────────────────────────────────────────────────────────────

export interface IssueInvoiceParams {
  bookingId: string;
  issuedById: string;
  /** Admin override: force a specific status label */
  forceStatus?: string;
  /** Optional notes printed on the invoice */
  notes?: string;
  /** Optional expiry for UNPAID invoices (default: 24 h from now) */
  expiresInHours?: number;
}

export async function issueInvoice(params: IssueInvoiceParams) {
  const { bookingId, issuedById, forceStatus, notes, expiresInHours = 24 } = params;

  if (!bookingId || !issuedById) throw new Error("bookingId and issuedById are required.");

  return db.$transaction(async (tx: TransactionClient) => {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      include: {
        trip: { include: { source: true, destination: true } },
        ticket: true,
        invoice: true,
      },
    });

    if (!booking) throw new Error("Booking not found.");

    const baseAmount = Number(booking.totalAmount);
    // No GST for now; extend later if needed
    const taxAmount = 0;
    const totalAmount = baseAmount + taxAmount;

    const status = deriveInvoiceStatus(booking.paymentStatus, booking.status, forceStatus);

    const paidAt =
      status === "PAID" && booking.paymentStatus === "COLLECTED"
        ? new Date()
        : null;

    const expiresAt =
      status === "UNPAID"
        ? new Date(Date.now() + expiresInHours * 60 * 60 * 1000)
        : null;

    if (booking.invoice) {
      // Update existing invoice — only admin can change status; others get idempotent update
      return tx.invoice.update({
        where: { id: booking.invoice.id },
        data: {
          status,
          notes: notes ?? booking.invoice.notes,
          paidAt: status === "PAID" ? (booking.invoice.paidAt ?? paidAt) : null,
          expiresAt,
          issuedById,
        },
      });
    }

    // First issuance
    let lastError: unknown;
    for (let attempt = 0; attempt < 5; attempt++) {
      const invoiceNumber = generateInvoiceNumber();
      try {
        return await tx.invoice.create({
          data: {
            id: crypto.randomUUID(),
            bookingId,
            issuedById,
            invoiceNumber,
            status,
            baseAmount,
            taxAmount,
            totalAmount,
            notes,
            paidAt,
            expiresAt,
          },
        });
      } catch (err) {
        if (err instanceof Error && err.message.includes("Unique constraint")) {
          lastError = err;
          continue;
        }
        throw err;
      }
    }
    throw new Error(`Failed to generate unique invoice number. ${lastError instanceof Error ? lastError.message : ""}`);
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// Void invoice (admin only)
// ──────────────────────────────────────────────────────────────────────────────

export async function voidInvoice(invoiceId: string, adminId: string) {
  if (!invoiceId || !adminId) throw new Error("invoiceId and adminId required.");
  const inv = await db.invoice.findUnique({ where: { id: invoiceId } });
  if (!inv) throw new Error("Invoice not found.");
  if (inv.status === "VOID") return inv; // idempotent

  return db.invoice.update({
    where: { id: invoiceId },
    data: { status: "VOID", issuedById: adminId },
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// Auto-expire UNPAID invoices (called by cron job)
// ──────────────────────────────────────────────────────────────────────────────

export async function expireUnpaidInvoices() {
  const now = new Date();
  const result = await db.invoice.updateMany({
    where: { status: "UNPAID", expiresAt: { lt: now } },
    data: { status: "EXPIRED" },
  });
  return result.count;
}

// ──────────────────────────────────────────────────────────────────────────────
// Read helpers
// ──────────────────────────────────────────────────────────────────────────────

export async function getInvoiceByBookingId(bookingId: string) {
  return db.invoice.findUnique({
    where: { bookingId },
    include: {
      booking: {
        include: {
          trip: { include: { source: true, destination: true, vehicle: true, driver: true } },
          seat: true,
          ticket: true,
          user: { select: { id: true, name: true, phone: true, email: true } },
        },
      },
      issuedBy: { select: { id: true, name: true, role: true } },
    },
  });
}

export async function getAdminInvoices(params: {
  status?: string;
  page?: number;
  pageSize?: number;
}) {
  const { status, page = 1, pageSize = 20 } = params;
  const where = status ? { status: status as "PAID" | "UNPAID" | "VOID" | "EXPIRED" | "PARTIALLY_PAID" } : {};
  const [invoices, totalCount] = await Promise.all([
    db.invoice.findMany({
      where,
      include: {
        booking: {
          include: {
            trip: { include: { source: true, destination: true, driver: { select: { name: true } } } },
            user: { select: { name: true, phone: true } },
            seat: true,
            ticket: true,
          },
        },
        issuedBy: { select: { name: true, role: true } },
      },
      orderBy: { issuedAt: "desc" },

      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.invoice.count({ where }),
  ]);
  return { invoices, totalCount, totalPages: Math.ceil(totalCount / pageSize) };
}
