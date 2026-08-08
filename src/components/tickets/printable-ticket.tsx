import { QRCodeSVG } from "qrcode.react";
import type { PrintableTicketData } from "@/lib/ticket-view-model";

export function PrintableTicket({ ticket }: { ticket: PrintableTicketData }) {
  const statusClass =
    ticket.status === "ISSUED"
      ? "ticket-status-issued"
      : ticket.status === "USED"
      ? "ticket-status-used"
      : "ticket-status-closed";

  return (
    <article className="ticket-print-surface mx-auto w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#070b14] text-slate-900 dark:text-slate-100 shadow-2xl">
      <header className="ticket-print-section border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-600 dark:text-amber-400">GoShuttles Express</p>
            <p className="mt-1 text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400">Digital Boarding Pass</p>
          </div>
          <span className={`ticket-status rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-wider ${statusClass}`}>
            {ticket.status.replace("_", " ")}
          </span>
        </div>
        <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-slate-500">Pass Reference</p>
            <p className="mt-1 font-mono text-lg font-black text-amber-600 dark:text-amber-400">{ticket.ticketNumber}</p>
          </div>
          <div className="text-right space-y-0.5">
            <p className="text-[10px] uppercase tracking-widest text-slate-500">Issued At: {formatDate(ticket.issuedAt)}</p>
            {ticket.usedAt && (
              <p className="text-[10px] uppercase tracking-widest text-emerald-600 dark:text-emerald-400 font-bold">
                Boarded At: {formatDate(ticket.usedAt)}
              </p>
            )}
          </div>
        </div>
      </header>

      <section className="ticket-print-section space-y-6 p-6">
        <div className="ticket-route grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 p-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">From</p>
            <p className="mt-1 break-words text-lg font-black text-slate-900 dark:text-white">{ticket.source}</p>
          </div>
          <div className="text-amber-500 font-bold">→</div>
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">To</p>
            <p className="mt-1 break-words text-lg font-black text-slate-900 dark:text-white">{ticket.destination}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Info label="Scheduled Departure" value={formatDate(ticket.departureAt)} />
          <Info
            label="Seat(s)"
            value={ticket.groupSeats && ticket.groupSeats.length > 1 ? `Seats ${ticket.groupSeats.join(", ")} (${ticket.groupSeats.length} Seats)` : `Seat ${ticket.seatNumber}`}
            accent
          />
          <Info
            label="Fare"
            value={ticket.totalGroupFare ? `₹${Number(ticket.totalGroupFare).toLocaleString("en-IN")}` : `₹${Number(ticket.ticketPrice).toLocaleString("en-IN")}`}
          />
          <Info label="Payment" value={`${ticket.paymentMode} · ${ticket.paymentStatus}`} />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/70 p-3">
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-1">Passenger Roster &amp; Age</p>
            {ticket.groupRoster && ticket.groupRoster.length > 0 ? (
              <div className="space-y-1">
                {ticket.groupRoster.map((g, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {g.passengerName} {g.guestAge ? `(${g.guestAge} yrs)` : ""}
                    </span>
                    <span className="font-mono text-amber-600 dark:text-amber-400 font-bold">
                      Seat {g.seatNumber}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {ticket.passengerName} {ticket.passengerPhone ? `· ${ticket.passengerPhone}` : ""}
              </p>
            )}
          </div>
          <Info label="Driver" value={`${ticket.driverName}${ticket.driverPhone ? ` · ${ticket.driverPhone}` : ""}`} />
          <Info label="Vehicle" value={`${ticket.vehicleRegistration} · ${ticket.vehicleModel}`} />
          <Info label="Pass Reference ID" value={ticket.ticketNumber} mono />
        </div>

        <div className="ticket-qr flex flex-col items-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-white p-5 text-slate-950">
          <QRCodeSVG value={ticket.qrValue} size={180} level="H" includeMargin />
          <p className="mt-3 font-mono text-[10px] font-black tracking-widest">{ticket.ticketNumber}</p>
          <p className="mt-1 text-[10px] text-slate-600">Scan this QR code at shuttle boarding</p>
        </div>
      </section>

      <footer className="ticket-print-section border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-6 py-4 text-center text-[10px] text-slate-500 dark:text-slate-400">
        Non-transferable digital boarding pass. Driver verifies this pass against the live trip manifest.
      </footer>
    </article>
  );
}

function Info({ label, value, accent = false, mono = false }: { label: string; value: string; accent?: boolean; mono?: boolean }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/70 p-3">
      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`mt-1 break-words text-xs font-bold ${accent ? "text-amber-600 dark:text-amber-400" : "text-slate-800 dark:text-slate-200"} ${mono ? "font-mono" : ""}`}>
        {value}
      </p>
    </div>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}
