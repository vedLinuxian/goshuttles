import type { PrintableTicketData } from "./ticket-view-model";

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] || character);
}

function date(value: string) {
  return escapeHtml(new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }));
}

export function ticketHtml(ticket: PrintableTicketData, qrDataUrl: string) {
  const seatDisplay = ticket.groupSeats && ticket.groupSeats.length > 1
    ? `Seats ${escapeHtml(ticket.groupSeats.join(", "))} (${ticket.groupSeats.length} Seats)`
    : `Seat ${escapeHtml(ticket.seatNumber)}`;

  const fareDisplay = ticket.totalGroupFare
    ? `₹${escapeHtml(Number(ticket.totalGroupFare).toLocaleString("en-IN"))} (Group Total)`
    : `₹${escapeHtml(Number(ticket.ticketPrice).toLocaleString("en-IN"))}`;

  const rosterDisplay = ticket.groupRoster && ticket.groupRoster.length > 1
    ? escapeHtml(ticket.groupRoster.map((g) => `${g.passengerName} (${g.seatNumber})`).join(", "))
    : `${escapeHtml(ticket.passengerName)}${ticket.passengerPhone ? ` · ${escapeHtml(ticket.passengerPhone)}` : ""}`;

  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(ticket.ticketNumber)}</title><style>
@page{size:A4;margin:12mm}*{box-sizing:border-box}body{margin:0;background:#fff;color:#111827;font-family:Arial,Helvetica,sans-serif}.ticket{max-width:720px;margin:0 auto;border:1px solid #cbd5e1;border-radius:18px;overflow:hidden}.header{background:#0f172a;color:#fff;padding:28px}.brand{color:#f59e0b;font-size:14px;font-weight:800;letter-spacing:.18em;text-transform:uppercase}.sub{color:#cbd5e1;font-size:10px;letter-spacing:.12em;text-transform:uppercase;margin-top:6px}.row{display:flex;justify-content:space-between;gap:18px}.label{font-size:9px;color:#64748b;text-transform:uppercase;letter-spacing:.12em;font-weight:700}.value{font-size:13px;font-weight:700;margin-top:5px;overflow-wrap:anywhere}.header .label{color:#94a3b8}.header .value{color:#fff}.body{padding:28px}.route{display:grid;grid-template-columns:1fr auto 1fr;gap:16px;align-items:center;border:1px solid #cbd5e1;border-radius:14px;padding:18px}.route .value{font-size:20px}.center{text-align:center;color:#d97706;font-size:24px}.right{text-align:right}.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-top:14px}.card{border:1px solid #e2e8f0;border-radius:10px;padding:12px}.qr{text-align:center;margin:24px auto 0;padding:18px;border:1px solid #cbd5e1;border-radius:14px;max-width:260px}.qr img{width:180px;height:180px}.footer{border-top:1px solid #e2e8f0;padding:15px;text-align:center;color:#64748b;font-size:10px}.status{display:inline-block;border:1px solid #f59e0b;border-radius:999px;padding:5px 10px;color:#b45309;font-size:10px;font-weight:800;text-transform:uppercase}.mono{font-family:monospace}@media print{.ticket{break-inside:avoid}}
</style></head><body><main class="ticket"><header class="header"><div class="row"><div><div class="brand">GoShuttles Express</div><div class="sub">Digital boarding pass</div></div><span class="status">${escapeHtml(ticket.status.replace("_", " "))}</span></div><div class="row" style="margin-top:28px"><div><div class="label">Ticket number</div><div class="value mono">${escapeHtml(ticket.ticketNumber)}</div></div><div style="text-align:right"><div class="label">Issued</div><div class="value">${date(ticket.issuedAt)}</div></div></div></header><section class="body"><div class="route"><div><div class="label">From</div><div class="value">${escapeHtml(ticket.source)}</div></div><div class="center">→</div><div class="right"><div class="label">To</div><div class="value">${escapeHtml(ticket.destination)}</div></div></div><div class="grid"><div class="card"><div class="label">Departure</div><div class="value">${date(ticket.departureAt)}</div></div><div class="card"><div class="label">Seat(s)</div><div class="value">${seatDisplay}</div></div><div class="card"><div class="label">Passenger Roster</div><div class="value">${rosterDisplay}</div></div><div class="card"><div class="label">Fare / Payment</div><div class="value">${fareDisplay} · ${escapeHtml(ticket.paymentMode)} ${escapeHtml(ticket.paymentStatus)}</div></div><div class="card"><div class="label">Driver</div><div class="value">${escapeHtml(ticket.driverName)}${ticket.driverPhone ? ` · ${escapeHtml(ticket.driverPhone)}` : ""}</div></div><div class="card"><div class="label">Vehicle</div><div class="value">${escapeHtml(ticket.vehicleRegistration)} · ${escapeHtml(ticket.vehicleModel)}</div></div></div><div class="qr"><img src="${qrDataUrl}" alt="Ticket QR code"><div class="value mono">${escapeHtml(ticket.ticketNumber)}</div><div style="font-size:10px;color:#64748b;margin-top:4px">Show this QR code at boarding</div></div></section><footer class="footer">Non-transferable ticket. Driver verifies the ticket against the assigned trip manifest.</footer></main></body></html>`;
}
