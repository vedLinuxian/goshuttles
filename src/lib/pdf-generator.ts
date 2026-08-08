import { jsPDF } from "jspdf";
import type { PrintableTicketData } from "./ticket-view-model";

export function generateTicketPdfBuffer(ticket: PrintableTicketData): Buffer {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  // Header Box (Dark Slate background)
  doc.setFillColor(15, 23, 42); // #0f172a
  doc.rect(15, 15, 180, 38, "F");

  // Title
  doc.setTextColor(245, 158, 11); // Amber
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("GOSHUTTLES EXPRESS", 22, 28);

  doc.setTextColor(203, 213, 225); // Slate 300
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("OFFICIAL DIGITAL BOARDING PASS", 22, 35);

  // Status Badge
  doc.setTextColor(245, 158, 11);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(`STATUS: ${ticket.status}`, 140, 28);

  // Ticket Number & Date
  doc.setTextColor(148, 163, 184);
  doc.setFontSize(8);
  doc.text("TICKET NUMBER", 22, 45);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(ticket.ticketNumber, 22, 50);

  // Route Container
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(15, 58, 180, 28, 3, 3, "FD");

  doc.setTextColor(100, 116, 139);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("FROM", 22, 66);
  doc.text("TO", 120, 66);

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(ticket.source, 22, 77);
  doc.text(ticket.destination, 120, 77);

  // Details Grid Box
  let y = 94;
  doc.setFontSize(9);

  // Seats & Fare
  const seatText = ticket.groupSeats && ticket.groupSeats.length > 1
    ? `Seats ${ticket.groupSeats.join(", ")} (${ticket.groupSeats.length} Seats)`
    : `Seat ${ticket.seatNumber}`;

  const fareText = ticket.totalGroupFare
    ? `Rs.${Number(ticket.totalGroupFare).toLocaleString("en-IN")} (Group Total)`
    : `Rs.${Number(ticket.ticketPrice).toLocaleString("en-IN")}`;

  doc.setTextColor(100, 116, 139);
  doc.setFont("helvetica", "normal");
  doc.text("ASSIGNED SEAT(S):", 22, y);
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.text(seatText, 70, y);

  y += 10;
  doc.setTextColor(100, 116, 139);
  doc.setFont("helvetica", "normal");
  doc.text("TOTAL FARE / PAYMENT:", 22, y);
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.text(`${fareText} · ${ticket.paymentMode} (${ticket.paymentStatus})`, 70, y);

  y += 10;
  doc.setTextColor(100, 116, 139);
  doc.setFont("helvetica", "normal");
  doc.text("DEPARTURE TIME:", 22, y);
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.text(new Date(ticket.departureAt).toLocaleString("en-IN", { dateStyle: "full", timeStyle: "short" }), 70, y);

  y += 10;
  doc.setTextColor(100, 116, 139);
  doc.setFont("helvetica", "normal");
  doc.text("DRIVER & VEHICLE:", 22, y);
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.text(`${ticket.driverName} · ${ticket.vehicleRegistration} (${ticket.vehicleModel})`, 70, y);

  // Roster Box
  y += 15;
  const roster = ticket.groupRoster || [
    { seatNumber: ticket.seatNumber, passengerName: ticket.passengerName, guestAge: null }
  ];
  const boxHeight = Math.max(35, 18 + roster.length * 8);

  doc.setFillColor(241, 245, 249);
  doc.roundedRect(15, y, 180, boxHeight, 3, 3, "F");

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("PASSENGER ROSTER & AGE DETAILS", 22, y + 10);

  doc.setFontSize(9);

  let rosterY = y + 18;
  for (const item of roster) {
    const ageStr = item.guestAge ? ` (Age: ${item.guestAge} yrs)` : "";
    doc.setTextColor(51, 65, 85);
    doc.setFont("helvetica", "normal");
    doc.text(`* ${item.passengerName}${ageStr}`, 25, rosterY);
    
    doc.setTextColor(217, 119, 6); // Amber
    doc.setFont("helvetica", "bold");
    doc.text(`Seat ${item.seatNumber}`, 155, rosterY);
    rosterY += 8;
  }

  // Footer note
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(148, 163, 184);
  doc.text("Show this boarding pass to your shuttle driver at departure. Non-transferable ticket.", 22, 275);
  doc.text("Powered by GoShuttles Intercity Express Network.", 22, 280);

  const arrayBuffer = doc.output("arraybuffer");
  return Buffer.from(arrayBuffer);
}
