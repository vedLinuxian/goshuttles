import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { approvePaymentVerification, rejectPaymentVerification, approveTripOverride, approveDriverTripRequestAction, rejectDriverTripRequestAction } from "./actions";
import { ShieldCheck, CheckCircle2, XCircle, AlertCircle, FileCheck, Route, Clock, UserCheck } from "lucide-react";
import { Card, Button, Badge } from "@/components/ui";

export default async function AdminApprovalsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login");

  const pendingTripRequests = await db.trip.findMany({
    where: {
      OR: [
        { status: "PENDING_APPROVAL" as const },
        { approvalStatus: "PENDING" as const },
      ],
    },
    include: {
      source: true,
      destination: true,
      driver: { include: { driverProfile: true } },
      requestedBy: true,
      vehicle: true,
      seats: true,
    },
    orderBy: { startTime: "desc" },
  });

  const pendingPayments = await db.paymentVerification.findMany({
    where: { status: "PENDING" },
    include: {
      booking: {
        include: {
          user: true,
          trip: { include: { source: true, destination: true, driver: true } },
          seat: true,
        },
      },
    },
    orderBy: { booking: { createdAt: "desc" } },
  });

  const scheduledTripsNeedingOverride = await db.trip.findMany({
    where: {
      status: "SCHEDULED",
      adminOverrideStart: false,
    },
    include: {
      source: true,
      destination: true,
      driver: true,
      vehicle: true,
      seats: true,
    },
    orderBy: { startTime: "asc" },
  });

  const partialTrips = scheduledTripsNeedingOverride.map((t) => {
    const bookedCount = t.seats.filter((s) => s.status === "BOOKED").length;
    return { ...t, bookedCount, totalSeats: t.seats.length };
  }).filter((t) => t.bookedCount < t.totalSeats && t.bookedCount > 0);

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <ShieldCheck className="h-7 w-7 text-amber-500" />
          Pending Admin Approvals
        </h1>
        <p className="text-sm text-slate-400 mt-1">Review driver-scheduled trip requests, passenger payment proofs, and early departure overrides.</p>
      </div>

      {/* Driver Trip Departure Requests Section */}
      <Card variant="glass" className="p-6 space-y-4 border-slate-800 shadow-2xl glow-amber">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Route className="h-5 w-5 text-amber-400" />
            Driver Trip Schedule Requests ({pendingTripRequests.length})
          </h2>
          <Badge variant={pendingTripRequests.length > 0 ? "warning" : "outline"} className="text-xs">
            {pendingTripRequests.length > 0 ? "Requires Approval" : "All Clear"}
          </Badge>
        </div>

        {pendingTripRequests.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-sm">
            No driver trip schedule requests awaiting approval.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingTripRequests.map((req) => (
              <div key={req.id} className="p-5 rounded-2xl border border-slate-800 bg-slate-900/80 space-y-4 shadow-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      Request #{req.tripSequence || 1}
                    </span>
                    <h3 className="text-base font-extrabold text-white mt-1">
                      {req.source.name} → {req.destination.name}
                    </h3>
                  </div>
                  <Badge variant="warning" className="text-[10px] font-bold">
                    PENDING APPROVAL
                  </Badge>
                </div>

                <div className="text-xs space-y-1.5 bg-slate-950/80 p-3.5 rounded-xl border border-slate-800/80 text-slate-300">
                  <p className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-amber-400" />
                    <span className="text-slate-400">Departure:</span>
                    <span className="font-bold text-white">
                      {new Date(req.startTime).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                    </span>
                  </p>
                  <p className="flex items-center gap-2">
                    <UserCheck className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-slate-400">Requested By:</span>
                    <span className="font-semibold text-slate-200">
                      {req.requestedBy?.name || req.driver?.name || "Driver"} ({req.driver?.phone || "No phone"})
                    </span>
                  </p>
                  <p className="text-slate-400">
                    Vehicle: <span className="font-mono text-slate-200">{req.vehicle.regNumber} ({req.vehicle.modelName} - {req.seats.length} Seats)</span>
                  </p>
                  <p className="text-slate-400">
                    Driver KYC: <span className="font-semibold text-emerald-400">{req.driver?.driverProfile?.kycStatus || "APPROVED"}</span>
                  </p>
                </div>

                <div className="flex gap-2 pt-1">
                  <form action={approveDriverTripRequestAction.bind(null, req.id)} className="flex-1">
                    <Button type="submit" size="sm" className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold gap-1 cursor-pointer">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Approve Departure
                    </Button>
                  </form>
                  <form action={rejectDriverTripRequestAction} className="flex-1 flex gap-1">
                    <input type="hidden" name="tripId" value={req.id} />
                    <input type="text" name="reason" placeholder="Reason to reject..." defaultValue="Driver schedule conflict" className="w-full px-2.5 py-1 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white" />
                    <Button type="submit" variant="secondary" size="sm" className="gap-1 text-rose-400 hover:bg-rose-950/40 border border-slate-700 cursor-pointer">
                      <XCircle className="h-3.5 w-3.5" /> Decline
                    </Button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Payment Proof Verifications Section */}
      <Card variant="glass" className="p-6 space-y-4 border-slate-800">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-amber-400" />
            Online Payment Proofs ({pendingPayments.length})
          </h2>
          <Badge variant="warning" className="text-xs">
            Action Required
          </Badge>
        </div>

        {pendingPayments.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-sm">
            No pending payment verifications at this time.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingPayments.map((pv) => (
              <div key={pv.id} className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-white">{pv.booking.user?.name || pv.booking.guestName || "Passenger"}</p>
                    <p className="text-xs text-slate-400">{pv.booking.user?.phone || "No phone"}</p>
                  </div>
                  <span className="text-base font-bold text-emerald-400">₹{Number(pv.booking.totalAmount)}</span>
                </div>

                <div className="text-xs space-y-1 bg-slate-950 p-3 rounded-lg border border-slate-800 text-slate-300">
                  <p><span className="text-slate-500">Route:</span> <span className="font-medium">{pv.booking.trip.source.name} → {pv.booking.trip.destination.name}</span></p>
                  <p><span className="text-slate-500">Seat:</span> <span className="font-semibold">{pv.booking.seat?.seatNumber}</span></p>
                  <p><span className="text-slate-500">UTR / Ref Number:</span> <span className="font-mono font-bold text-slate-200">{pv.utrNumber || "N/A"}</span></p>
                  {pv.screenshotUrl && (
                    <p><span className="text-slate-500">Screenshot:</span> <a href={pv.screenshotUrl} target="_blank" rel="noreferrer" className="text-amber-400 font-semibold underline hover:text-amber-300">View Proof Image</a></p>
                  )}
                  <p><span className="text-slate-500">Driver:</span> <span>{pv.booking.trip.driver?.name || "Unassigned"}</span></p>
                </div>

                <div className="flex gap-2 pt-1">
                  <form action={approvePaymentVerification.bind(null, pv.id, pv.booking.id)} className="flex-1">
                    <Button type="submit" size="sm" className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Approve Payment
                    </Button>
                  </form>
                  <form action={rejectPaymentVerification.bind(null, pv.id, "Invalid UTR or transaction missing")} className="flex-1">
                    <Button type="submit" variant="secondary" size="sm" className="w-full gap-1 text-rose-400 hover:bg-rose-950/40 border border-slate-700">
                      <XCircle className="h-3.5 w-3.5" /> Reject
                    </Button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Partial Occupancy Trip Start Overrides */}
      <Card variant="glass" className="p-6 space-y-4 border-slate-800">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-400" />
            Partial Occupancy Departure Overrides ({partialTrips.length})
          </h2>
          <span className="text-xs text-slate-400">Allows shuttle to depart before 100% full</span>
        </div>

        {partialTrips.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm">
            All scheduled trips either have 100% occupancy or zero bookings.
          </div>
        ) : (
          <div className="space-y-3">
            {partialTrips.map((t) => (
              <div key={t.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl border border-slate-800 bg-slate-900/60 gap-4">
                <div>
                  <p className="font-semibold text-white">{t.source.name} → {t.destination.name}</p>
                  <p className="text-xs text-slate-400">
                    Departure: {new Date(t.startTime).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })} • Driver: {t.driver?.name || "TBD"} ({t.vehicle?.modelName})
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="warning" className="text-xs font-semibold">
                      Occupancy: {t.bookedCount}/{t.totalSeats} seats
                    </Badge>
                  </div>
                </div>

                <form action={approveTripOverride.bind(null, t.id, "Approved by admin for partial departure")}>
                  <Button type="submit" size="sm" className="gap-1 font-bold">
                    <CheckCircle2 className="h-4 w-4" /> Grant Early Start Override
                  </Button>
                </form>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
