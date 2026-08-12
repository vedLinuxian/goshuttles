import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { driverCollectCashAction, rejectPassengerPaymentAction } from "./pending-actions";
import PaginationControls from "@/components/ui/pagination";
import SearchBar from "@/components/ui/search-bar";
import {
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Banknote,
  AlertTriangle,
  Clock,
  CreditCard,
} from "lucide-react";
import { Card, Badge, Button, Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui";

const PAGE_SIZE = 10;

export default async function PendingBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "DRIVER") redirect("/login");

  const driverId = session.user.id!;
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const q = (params.q as string) || "";

  const where: Prisma.BookingWhereInput = {
    trip: { driverId, startTime: { gte: new Date() } },
    status: "PENDING",
  };
  if (q) {
    where.OR = [
      { guestName: { contains: q, mode: "insensitive" } },
      { user: { name: { contains: q, mode: "insensitive" } } },
      { trip: { source: { name: { contains: q, mode: "insensitive" } } } },
      { trip: { destination: { name: { contains: q, mode: "insensitive" } } } },
    ];
  }

  const [bookings, totalCount, cashCount, onlineCount] = await Promise.all([
    db.booking.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, phone: true } },
        trip: { include: { source: true, destination: true } },
        seat: true,
        paymentVerification: true,
      },
      orderBy: [{ paymentMode: "asc" }, { trip: { startTime: "asc" } }, { createdAt: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.booking.count({ where }),
    db.booking.count({ where: { ...where, paymentMode: "CASH" } }),
    db.booking.count({ where: { ...where, paymentMode: "ONLINE" } }),
  ]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <ClipboardCheck className="h-6 w-6 text-amber-400" />
          Cash Collection &amp; Payment Approvals
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Collect physical cash from passengers to issue their boarding tickets. Online payments require admin verification.
        </p>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[#0c101c]/80 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pending</p>
            <p className="text-2xl font-black text-white mt-1">{totalCount}</p>
          </div>
          <div className="p-2.5 bg-amber-500/10 rounded-xl border border-amber-500/20">
            <Clock className="h-5 w-5 text-amber-400" />
          </div>
        </div>
        <div className="bg-[#0c101c]/80 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Cash to Collect</p>
            <p className="text-2xl font-black text-emerald-400 mt-1">{cashCount}</p>
          </div>
          <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
            <Banknote className="h-5 w-5 text-emerald-400" />
          </div>
        </div>
        <div className="bg-[#0c101c]/80 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Online (Admin)</p>
            <p className="text-2xl font-black text-indigo-400 mt-1">{onlineCount}</p>
          </div>
          <div className="p-2.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
            <CreditCard className="h-5 w-5 text-indigo-400" />
          </div>
        </div>
      </div>

      {/* Cash collection notice */}
      {cashCount > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30">
          <Banknote className="h-5 w-5 text-amber-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-extrabold text-amber-300">{cashCount} cash booking{cashCount > 1 ? "s" : ""} awaiting collection</p>
            <p className="text-xs text-amber-400/80 mt-0.5">
              Collect physical cash from passengers before departure and tap <strong>"Collect Cash"</strong> to issue their boarding ticket and record the transaction in your wallet.
            </p>
          </div>
        </div>
      )}

      <SearchBar placeholder="Search by passenger or route..." />

      {bookings.length === 0 ? (
        <Card variant="glass" className="text-center py-16 p-8 space-y-3 border-slate-800">
          <ClipboardCheck className="h-10 w-10 mx-auto text-amber-500/40" />
          <p className="text-white font-extrabold text-lg">No pending booking approvals</p>
          <p className="text-xs text-slate-400">All passenger seat bookings are up to date.</p>
        </Card>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden lg:block">
            <Card variant="glass" className="overflow-hidden border-slate-800 p-0">
              <Table>
                <TableHeader className="bg-slate-900/80">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs font-bold text-slate-300">Passenger</TableHead>
                    <TableHead className="text-xs font-bold text-slate-300">Route</TableHead>
                    <TableHead className="text-xs font-bold text-slate-300">Seat</TableHead>
                    <TableHead className="text-xs font-bold text-slate-300">Amount</TableHead>
                    <TableHead className="text-xs font-bold text-slate-300">Payment Mode</TableHead>
                    <TableHead className="text-xs font-bold text-slate-300">UTR / Proof</TableHead>
                    <TableHead className="text-right text-xs font-bold text-slate-300">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-slate-800/60">
                  {bookings.map((b) => (
                    <TableRow key={b.id} className="hover:bg-slate-800/40 transition-colors">
                      <TableCell className="font-bold text-white text-xs">
                        {b.guestName || b.user?.name || "Guest"}
                        {b.user?.phone && (
                          <div className="text-[10px] text-slate-400 font-mono">{b.user.phone}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-slate-300">
                        {b.trip.source.name} → {b.trip.destination.name}
                        <div className="text-[10px] text-slate-500">
                          {new Date(b.trip.startTime).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono font-bold text-amber-400 border-amber-500/30">
                          Seat {b.seat?.seatNumber}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-extrabold text-emerald-400 text-sm">
                        ₹{Number(b.totalAmount).toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={b.paymentMode === "CASH" ? "warning" : "secondary"}
                          className="font-bold text-xs"
                        >
                          {b.paymentMode === "CASH" ? "💵 CASH" : "🔒 ONLINE"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {b.paymentVerification ? (
                          <div>
                            <p className="font-mono font-bold text-amber-400">{b.paymentVerification.utrNumber || "N/A"}</p>
                            {b.paymentVerification.screenshotUrl && (
                              <a
                                href={b.paymentVerification.screenshotUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-amber-400 underline hover:text-amber-300 font-semibold inline-flex items-center gap-1"
                              >
                                Screenshot <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-500 text-xs">Cash on Board</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {b.paymentMode === "CASH" ? (
                            <form action={driverCollectCashAction.bind(null, b.id)}>
                              <Button
                                type="submit"
                                size="sm"
                                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs gap-1.5 h-8 rounded-lg cursor-pointer"
                              >
                                <Banknote className="h-3.5 w-3.5" /> Collect Cash
                              </Button>
                            </form>
                          ) : (
                            <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/20">
                              Admin verification required
                            </span>
                          )}
                          <form action={rejectPassengerPaymentAction.bind(null, b.id, "Rejected by driver")}>
                            <Button
                              type="submit"
                              size="sm"
                              variant="secondary"
                              className="text-rose-400 hover:bg-rose-950/40 border border-slate-700 text-xs gap-1 h-8 cursor-pointer"
                            >
                              <XCircle className="h-3.5 w-3.5" /> Reject
                            </Button>
                          </form>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>

          {/* Mobile Cards */}
          <div className="grid gap-4 lg:hidden">
            {bookings.map((b) => (
              <Card key={b.id} variant="glass" className="p-4 border-slate-800 bg-[#0c101c]/80 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-white text-sm">{b.guestName || b.user?.name || "Guest"}</p>
                    {b.user?.phone && <p className="font-mono text-[10px] text-slate-400">{b.user.phone}</p>}
                  </div>
                  <Badge
                    variant={b.paymentMode === "CASH" ? "warning" : "secondary"}
                    className="font-bold text-[10px] shrink-0"
                  >
                    {b.paymentMode}
                  </Badge>
                </div>

                <div className="text-xs space-y-1">
                  <p className="text-slate-300 font-semibold">
                    {b.trip.source.name} → {b.trip.destination.name}
                  </p>
                  <p className="text-slate-500">
                    {new Date(b.trip.startTime).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })} · Seat {b.seat?.seatNumber}
                  </p>
                  <p className="text-emerald-400 font-extrabold text-sm">₹{Number(b.totalAmount).toLocaleString("en-IN")}</p>
                </div>

                <div className="flex gap-2 pt-2 border-t border-slate-800">
                  {b.paymentMode === "CASH" ? (
                    <form action={driverCollectCashAction.bind(null, b.id)} className="flex-1">
                      <Button
                        type="submit"
                        size="sm"
                        className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs gap-1.5 h-8"
                      >
                        <Banknote className="h-3.5 w-3.5" /> Collect Cash &amp; Issue Ticket
                      </Button>
                    </form>
                  ) : (
                    <p className="flex-1 text-center text-[10px] font-bold text-indigo-400 bg-indigo-500/10 rounded-lg px-2 py-2 border border-indigo-500/20">
                      Admin verification required
                    </p>
                  )}
                  <form action={rejectPassengerPaymentAction.bind(null, b.id, "Rejected by driver")}>
                    <Button type="submit" size="sm" variant="secondary" className="text-rose-400 border-slate-700 text-xs h-8">
                      <XCircle className="h-3.5 w-3.5" />
                    </Button>
                  </form>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      <PaginationControls page={page} totalPages={totalPages} total={totalCount} pageSize={PAGE_SIZE} />
    </div>
  );
}
