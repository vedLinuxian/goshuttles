import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getAdminInvoices } from "@/lib/invoice-service";
import { db } from "@/lib/db";
import InvoiceManagerClient from "./invoice-manager-client";

const PAGE_SIZE = 20;

interface Props {
  searchParams: Promise<{ page?: string; status?: string; q?: string }>;
}

export default async function AdminInvoicesPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login");

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page || "1", 10));
  const status = params.status || "";
  const q = params.q || "";

  const { invoices: rawInvoices, totalCount, totalPages } = await getAdminInvoices({
    status: status || undefined,
    page,
    pageSize: PAGE_SIZE,
  });

  // Count by status for KPI cards
  const [paidCount, unpaidCount, expiredCount, voidCount] = await Promise.all([
    db.invoice.count({ where: { status: "PAID" } }),
    db.invoice.count({ where: { status: "UNPAID" } }),
    db.invoice.count({ where: { status: "EXPIRED" } }),
    db.invoice.count({ where: { status: "VOID" } }),
  ]);

  // Serialize all Decimals and Dates to primitives for RSC → Client boundary
  const invoices = rawInvoices.map((inv) => ({
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    status: inv.status,
    baseAmount: Number(inv.baseAmount),
    taxAmount: Number(inv.taxAmount),
    totalAmount: Number(inv.totalAmount),
    notes: inv.notes ?? null,
    issuedAt: inv.issuedAt.toISOString(),
    paidAt: inv.paidAt?.toISOString() ?? null,
    expiresAt: inv.expiresAt?.toISOString() ?? null,
    bookingId: inv.bookingId,
    booking: {
      id: inv.booking.id,
      paymentMode: inv.booking.paymentMode,
      paymentStatus: inv.booking.paymentStatus,
      status: inv.booking.status,
      passengerName: inv.booking.user?.name ?? inv.booking.guestName ?? "Guest",
      passengerPhone: inv.booking.user?.phone ?? null,
      seatNumber: inv.booking.seat?.seatNumber ?? "N/A",
      ticketNumber: inv.booking.ticket?.ticketNumber ?? null,
      source: inv.booking.trip.source.name,
      destination: inv.booking.trip.destination.name,
      startTime: inv.booking.trip.startTime.toISOString(),
      driverName: inv.booking.trip.driver?.name ?? null,


    },
    issuedBy: {
      name: inv.issuedBy.name ?? "System",
      role: inv.issuedBy.role,
    },
  }));

  // Also get all PENDING cash bookings without invoices for admin to generate from
  const pendingCashBookings = await db.booking.findMany({
    where: {
      paymentMode: "CASH",
      paymentStatus: "PENDING",
      status: "PENDING",
      invoice: null,
    },
    include: {
      trip: { include: { source: true, destination: true, driver: true } },
      seat: true,
      user: { select: { name: true, phone: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const pendingBookings = pendingCashBookings.map((b) => ({
    id: b.id,
    passengerName: b.user?.name ?? b.guestName ?? "Guest",
    passengerPhone: b.user?.phone ?? null,
    seatNumber: b.seat?.seatNumber ?? "N/A",
    totalAmount: Number(b.totalAmount),
    paymentMode: b.paymentMode,
    source: b.trip.source.name,
    destination: b.trip.destination.name,
    startTime: b.trip.startTime.toISOString(),
    driverName: b.trip.driver?.name ?? null,
  }));

  return (
    <InvoiceManagerClient
      invoices={invoices}
      pendingBookings={pendingBookings}
      page={page}
      totalPages={totalPages}
      totalCount={totalCount}
      stats={{ paidCount, unpaidCount, expiredCount, voidCount }}
      filters={{ status, q }}
    />
  );
}
