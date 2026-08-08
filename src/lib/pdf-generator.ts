import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import type { PrintableTicketData } from "./ticket-view-model";

export async function generateTicketPdfBuffer(ticket: PrintableTicketData): Promise<Buffer> {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  // Generate high-resolution QR code PNG Data URL
  const qrDataUrl = await QRCode.toDataURL(ticket.qrValue, {
    errorCorrectionLevel: "H",
    margin: 1,
    width: 400,
    color: {
      dark: "#0f172a",
      light: "#ffffff",
    },
  });

  // Primary Header Banner (Midnight Slate #0f172a)
  doc.setFillColor(15, 23, 42);
  doc.rect(10, 10, 190, 42, "F");

  // Gold Accent Top Bar
  doc.setFillColor(245, 158, 11);
  doc.rect(10, 10, 190, 3, "F");

  // Brand Name
  doc.setTextColor(245, 158, 11);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("GOSHUTTLES EXPRESS", 18, 26);

  // Subtitle
  doc.setTextColor(203, 213, 225);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("OFFICIAL INTERCITY BOARDING PASS", 18, 33);

  // Status Badge Pill
  doc.setFillColor(245, 158, 11);
  doc.roundedRect(145, 20, 45, 10, 2, 2, "F");
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(ticket.status.replace("_", " "), 167.5, 26.5, { align: "center" });

  // Pass Reference Number
  doc.setTextColor(148, 163, 184);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("PASS REFERENCE NUMBER", 18, 44);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(ticket.ticketNumber, 18, 49);

  // Issued Date
  doc.setTextColor(148, 163, 184);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("ISSUED AT", 130, 44);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.text(formatDate(ticket.issuedAt), 130, 49);

  // Route Section Container
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(10, 56, 190, 32, 4, 4, "FD");

  // Source & Destination
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("DEPARTURE STATION", 18, 65);
  doc.text("DESTINATION HUB", 125, 65);

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(ticket.source, 18, 75);
  doc.text(ticket.destination, 125, 75);

  // Route Arrow Connector
  doc.setTextColor(217, 119, 6);
  doc.setFontSize(16);
  doc.text("-->", 92, 74);

  // Departure Time Banner
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`SCHEDULED DEPARTURE: ${formatDate(ticket.departureAt)}`, 18, 83);

  // Key Details Grid Cards (2 Columns)
  let y = 94;

  // Seat(s) & Fare Cards
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(10, y, 92, 28, 3, 3, "F");

  doc.setTextColor(100, 116, 139);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("ASSIGNED SEAT(S)", 16, y + 8);

  const seatText = ticket.groupSeats && ticket.groupSeats.length > 1
    ? `Seats ${ticket.groupSeats.join(", ")} (${ticket.groupSeats.length} Seats)`
    : `Seat ${ticket.seatNumber}`;

  doc.setTextColor(217, 119, 6);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(seatText, 16, y + 19);

  // Fare Card
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(108, y, 92, 28, 3, 3, "F");

  doc.setTextColor(100, 116, 139);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL FARE & PAYMENT", 114, y + 8);

  const fareText = ticket.totalGroupFare
    ? `Rs.${Number(ticket.totalGroupFare).toLocaleString("en-IN")} (Group Total)`
    : `Rs.${Number(ticket.ticketPrice).toLocaleString("en-IN")}`;

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(`${fareText} · ${ticket.paymentMode}`, 114, y + 19);

  y += 34;

  // Driver & Vehicle Cards
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(10, y, 92, 26, 3, 3, "F");

  doc.setTextColor(100, 116, 139);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("ASSIGNED SHUTTLE DRIVER", 16, y + 8);

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(`${ticket.driverName}${ticket.driverPhone ? ` (${ticket.driverPhone})` : ""}`, 16, y + 18);

  // Vehicle Card
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(108, y, 92, 26, 3, 3, "F");

  doc.setTextColor(100, 116, 139);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("ASSIGNED VEHICLE", 114, y + 8);

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(`${ticket.vehicleRegistration} · ${ticket.vehicleModel}`, 114, y + 18);

  y += 32;

  // Passenger Roster & Age Table
  const roster = ticket.groupRoster || [
    { seatNumber: ticket.seatNumber, passengerName: ticket.passengerName, guestAge: null, guestGender: null }
  ];

  const tableHeight = Math.max(38, 16 + roster.length * 9);
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(10, y, 190, tableHeight, 3, 3, "FD");

  // Table Header
  doc.setFillColor(15, 23, 42);
  doc.rect(10, y, 190, 10, "F");
  doc.setTextColor(245, 158, 11);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("PASSENGER ROSTER & AGE DETAILS", 16, y + 7);
  doc.text("SEAT ASSIGNMENT", 155, y + 7);

  let rosterY = y + 17;
  for (const item of roster) {
    const ageLabel = item.guestAge ? ` (Age: ${item.guestAge} yrs${item.guestGender ? `, ${item.guestGender}` : ""})` : "";
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(`* ${item.passengerName}${ageLabel}`, 18, rosterY);

    doc.setTextColor(217, 119, 6);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(`Seat ${item.seatNumber}`, 160, rosterY);

    rosterY += 9;
  }

  y += tableHeight + 8;

  // QR Code Box Container
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(10, y, 190, 52, 4, 4, "FD");

  // QR Code Image
  doc.addImage(qrDataUrl, "PNG", 18, y + 4, 44, 44);

  // QR Text Details
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("DIGITAL BOARDING QR VERIFICATION", 68, y + 16);

  doc.setTextColor(100, 116, 139);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.text("Show this QR code to your shuttle driver upon boarding.", 68, y + 24);
  doc.text("Verified against GoShuttles live dispatch manifest.", 68, y + 30);

  doc.setTextColor(217, 119, 6);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(`PASS ID: #${ticket.ticketNumber}`, 68, y + 39);

  // Footer Note
  doc.setTextColor(148, 163, 184);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.text("GoShuttles Intercity Express Network · Non-transferable boarding ticket.", 100, 285, { align: "center" });

  const arrayBuffer = doc.output("arraybuffer");
  return Buffer.from(arrayBuffer);
}

function formatDate(val: string) {
  return new Date(val).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}
