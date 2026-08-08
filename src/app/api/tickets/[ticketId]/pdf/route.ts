import { auth } from "@/auth";
import { getTicketById } from "@/lib/ticket-service";
import { toPrintableTicketData } from "@/lib/ticket-view-model";
import { generateTicketPdfBuffer } from "@/lib/pdf-generator";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const { ticketId } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(ticketId)) {
    return NextResponse.json({ error: "Invalid ticket ID" }, { status: 400 });
  }
  const ticket = await getTicketById(ticketId);
  if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

  const isOwner = ticket.booking.userId === session.user.id;
  const isAssignedDriver = ticket.booking.trip.driverId === session.user.id;
  const isAdmin = session.user.role === "ADMIN";
  if (!isOwner && !isAssignedDriver && !isAdmin) {
    return NextResponse.json({ error: "Forbidden — You do not have permission to access this boarding pass." }, { status: 403 });
  }

  const printable = toPrintableTicketData(ticket);
  const pdfBuffer = await generateTicketPdfBuffer(printable);

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="GoShuttles-Pass-${printable.ticketNumber}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
