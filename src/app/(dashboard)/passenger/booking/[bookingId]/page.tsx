import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getBookingById } from "@/lib/booking-service";
import { cancelBookingForm } from "@/app/actions/form-actions";
import { confirmPayment } from "./actions";
import Link from "next/link";
import { IndianRupee, XCircle, ArrowLeft, Ticket, CheckCircle2, Route, ShieldCheck, Banknote } from "lucide-react";
import { TicketActions } from "@/components/tickets/ticket-actions";

export default async function BookingDetailPage({ params }: { params: Promise<{ bookingId: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { bookingId } = await params;
  const booking = await getBookingById(bookingId);
  if (!booking || (booking.userId !== session.user.id && session.user.role !== "ADMIN")) redirect("/passenger/bookings");

  const canCancel = booking.status === "PENDING" || booking.status === "CONFIRMED";
  const isCancelled = booking.status === "CANCELLED";

  return (
    <div className="max-w-lg mx-auto space-y-6 pb-12">
      <Link
        href="/passenger/bookings"
        className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to My Bookings
      </Link>

      <div className="glass-card-dark rounded-3xl border border-slate-200 dark:border-slate-800/80 p-8 shadow-2xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800/80 pb-4">
          <div>
            <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-widest text-amber-600 dark:text-amber-400 mb-1">
              <Route className="h-3.5 w-3.5" />
              <span>GoShuttles Express Pass</span>
            </div>
            <h1 className="font-extrabold text-xl text-slate-900 dark:text-white">
              {booking.trip.source.name} → {booking.trip.destination.name}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {new Date(booking.trip.startTime).toLocaleString("en-IN", { dateStyle: "full", timeStyle: "short" })}
            </p>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-extrabold border ${
              booking.status === "CONFIRMED" || booking.status === "COMPLETED"
                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                : booking.status === "PENDING"
                ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30"
                : booking.status === "CANCELLED"
                ? "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"
            }`}
          >
            {booking.status}
          </span>
        </div>

        <div className="space-y-3 text-xs bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800/80">
          <div className="flex justify-between items-center">
            <span className="text-slate-500 dark:text-slate-400">Assigned Seat(s)</span>
            <span className="font-extrabold text-amber-600 dark:text-amber-400 text-sm">
              {booking.groupSeats && booking.groupSeats.length > 1
                ? `Seats ${booking.groupSeats.join(", ")} (${booking.groupSeats.length} Seats)`
                : `Seat ${booking.seat?.seatNumber || "N/A"}`}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500 dark:text-slate-400">Total Amount</span>
            <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">
              ₹{Number(booking.totalGroupFare || booking.totalAmount).toLocaleString("en-IN")}
              {booking.groupSeats && booking.groupSeats.length > 1 ? " (Group Total)" : ""}
            </span>
          </div>
          <div className="flex justify-between items-center"><span className="text-slate-500 dark:text-slate-400">Payment Mode</span><span className="font-semibold text-slate-800 dark:text-slate-200">{booking.paymentMode}</span></div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500 dark:text-slate-400">Payment Status</span>
            <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${booking.paymentStatus === "COLLECTED" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30" : "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30"}`}>
              {booking.paymentStatus}
            </span>
          </div>
          {booking.cancellationReason && (
            <div className="flex justify-between items-center border-t border-slate-200 dark:border-slate-800/80 pt-2"><span className="text-slate-500 dark:text-slate-400">Cancellation Reason</span><span className="text-rose-600 dark:text-rose-400 font-semibold">{booking.cancellationReason}</span></div>
          )}
        </div>

        {/* Passenger Roster Section with Age */}
        <div className="space-y-2 bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800/80">
          <p className="text-[10px] uppercase font-extrabold tracking-wider text-slate-500 dark:text-slate-400">
            Passenger Roster &amp; Age Details
          </p>
          {booking.groupRoster && booking.groupRoster.length > 0 ? (
            <div className="space-y-1.5 divide-y divide-slate-200 dark:divide-slate-800/60">
              {booking.groupRoster.map((g, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs pt-1.5 first:pt-0">
                  <div>
                    <span className="font-bold text-slate-900 dark:text-slate-100">{g.passengerName}</span>
                    {g.guestAge && (
                      <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold ml-1.5 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                        Age: {g.guestAge} yrs
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-amber-600 dark:text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                    Seat {g.seatNumber}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-900 dark:text-slate-100">
                {booking.guestName || booking.user?.name || "Passenger"}
                {booking.guestAge ? ` (Age: ${booking.guestAge} yrs)` : ""}
              </span>
              <span className="font-mono text-amber-600 dark:text-amber-400 font-bold">
                Seat {booking.seat?.seatNumber || "N/A"}
              </span>
            </div>
          )}
        </div>

        {booking.ticket && (
          <div className="border-t border-slate-200 dark:border-slate-800/80 pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Pass Reference</p>
                <p className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400 mt-0.5">#{booking.ticket.ticketNumber}</p>
              </div>
              <Link
                href={`/passenger/ticket/${booking.ticket.id}`}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-extrabold shadow-md glow-amber flex items-center gap-1.5 transition-all"
              >
                <Ticket className="h-3.5 w-3.5" /> View Digital Pass
              </Link>
            </div>
            <TicketActions ticketId={booking.ticket.id} />
          </div>
        )}

        {booking.paymentStatus === "PENDING" && booking.paymentMode === "CASH" && (session.user.role === "ADMIN" || session.user.role === "DRIVER") && (

          <div className="border-t border-slate-200 dark:border-slate-800/80 pt-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-extrabold text-amber-500">
              <Banknote className="h-4 w-4" />
              <span>Admin / Driver Action Required</span>
            </div>
            <p className="text-xs text-slate-400">
              Cash payment of <strong className="text-emerald-400">₹{Number(booking.totalGroupFare || booking.totalAmount).toLocaleString("en-IN")}</strong> is pending for this booking. Confirm cash collection below to issue official invoice and finalize ledger.
            </p>
            <form action={async () => {
              "use server";
              const { adminCollectCashAndIssueInvoice } = await import("@/app/actions/invoice-actions");
              await adminCollectCashAndIssueInvoice(bookingId, "Collected via booking detail page");
            }}>
              <button
                type="submit"
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 py-3 rounded-xl font-extrabold text-xs shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <Banknote className="h-4 w-4" /> Confirm Cash Collection &amp; Issue Invoice
              </button>
            </form>
          </div>
        )}

        {booking.status === "PENDING" && booking.paymentMode === "ONLINE" && booking.paymentStatus === "PENDING" && (
          <form action={confirmPayment.bind(null, bookingId)} className="border-t border-slate-800/80 pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-300">UTR / Transaction Reference</label>
              {booking.paymentVerification && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  booking.paymentVerification.status === "VERIFIED"
                    ? "bg-emerald-500/15 text-emerald-400"
                    : booking.paymentVerification.status === "REJECTED"
                    ? "bg-rose-500/15 text-rose-400"
                    : "bg-amber-500/15 text-amber-400"
                }`}>
                  Proof: {booking.paymentVerification.status}
                </span>
              )}
            </div>
            <input name="utr" required minLength={4} maxLength={50} defaultValue={booking.paymentVerification?.utrNumber || ""} className="w-full border border-slate-700/80 bg-slate-900/90 text-slate-100 rounded-xl px-3 py-2.5 text-xs focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none" placeholder="e.g., UPI12345678" />
            <label className="block text-xs font-bold text-slate-300">Payment Screenshot URL (Optional)</label>
            <input name="screenshotUrl" type="text" defaultValue={booking.paymentVerification?.screenshotUrl || ""} className="w-full border border-slate-700/80 bg-slate-900/90 text-slate-100 rounded-xl px-3 py-2.5 text-xs focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none" placeholder="e.g., https://example.com/screenshot.jpg" />
            {booking.paymentVerification?.rejectionReason && (
              <p className="text-xs text-rose-400 font-semibold">Rejection Note: {booking.paymentVerification.rejectionReason}</p>
            )}
            <button type="submit" className="w-full bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 py-2.5 rounded-xl font-extrabold text-xs shadow-md glow-amber transition-all cursor-pointer">
              {booking.paymentVerification ? "Update Payment Proof" : "Submit Payment Proof"}
            </button>
          </form>
        )}

        {/* Cancel Booking */}
        {canCancel && !isCancelled && (
          <div className="border-t border-slate-800/80 pt-4">
            <details className="group">
              <summary className="cursor-pointer text-rose-400 text-xs font-bold hover:text-rose-300 inline-flex items-center gap-1.5 transition-colors">
                <XCircle className="h-4 w-4" /> Cancel Booking
              </summary>
              <form action={cancelBookingForm} className="mt-3 space-y-3 bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
                <input type="hidden" name="bookingId" value={bookingId} />
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">Reason for cancellation</label>
                  <input name="reason" placeholder="Optional reason" maxLength={500} className="w-full border border-slate-700 bg-slate-950 text-slate-100 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-rose-500 outline-none" />
                </div>
                <button type="submit" className="w-full bg-rose-600 hover:bg-rose-500 text-white py-2 rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer">
                  Confirm Cancellation
                </button>
              </form>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}
