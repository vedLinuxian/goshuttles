import { auth } from "@/auth";
import { getTicketById } from "@/lib/ticket-service";
import { toPrintableTicketData } from "@/lib/ticket-view-model";
import { ticketHtml } from "@/lib/ticket-html";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import QRCode from "qrcode";
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
  const qrDataUrl = await QRCode.toDataURL(printable.qrValue, { errorCorrectionLevel: "H", margin: 1, width: 640 });
  const html = ticketHtml(printable, qrDataUrl);

  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | undefined;
  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: process.env.CHROMIUM_PATH || (await chromium.executablePath()),
      headless: true,
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });
    return new NextResponse(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${printable.ticketNumber}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.warn("[GET /api/tickets/[ticketId]/pdf] Puppeteer PDF fallback to HTML print document:", error);
    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "private, no-store",
      },
    });
  } finally {
    await browser?.close();
  }
}
