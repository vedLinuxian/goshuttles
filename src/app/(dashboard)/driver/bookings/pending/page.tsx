import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { confirmPassengerPaymentAction, rejectPassengerPaymentAction } from "@/app/(dashboard)/driver/dashboard/actions";
import PaginationControls from "@/components/ui/pagination";
import SearchBar from "@/components/ui/search-bar";
import { ClipboardCheck, CheckCircle2, XCircle, ExternalLink } from "lucide-react";
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

  const [bookings, totalCount] = await Promise.all([
    db.booking.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, phone: true } },
        trip: { include: { source: true, destination: true } },
        seat: true,
        paymentVerification: true,
      },
      orderBy: [{ trip: { startTime: "asc" } }, { createdAt: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.booking.count({ where }),
  ]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <ClipboardCheck className="h-6 w-6 text-amber-400" />
          Pending Booking Approvals &amp; Cash Proofs
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Review online payment proofs and confirm cash collections for passenger seats.
        </p>
      </div>

      <SearchBar placeholder="Search by passenger or route..." />

      {bookings.length === 0 ? (
        <Card variant="glass" className="text-center py-16 p-8 space-y-3 border-slate-800">
          <ClipboardCheck className="h-10 w-10 mx-auto text-amber-500/40" />
          <p className="text-white font-extrabold text-lg">No pending booking approvals</p>
          <p className="text-xs text-slate-400">All passenger seat bookings are up to date.</p>
        </Card>
      ) : (
        <Card variant="glass" className="overflow-hidden border-slate-800 p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Passenger</TableHead>
                <TableHead>Route</TableHead>
                <TableHead>Seat</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>UTR / Proof</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.map((b) => (
                <TableRow key={b.id} className="hover:bg-slate-800/50 transition-colors">
                  <TableCell className="font-bold text-white">
                    {b.guestName || b.user?.name || "Guest"}
                    {b.user?.phone && <div className="text-xs text-slate-400 font-mono">{b.user.phone}</div>}
                  </TableCell>
                  <TableCell className="text-xs font-semibold text-slate-300">
                    {b.trip.source.name} → {b.trip.destination.name}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono font-bold text-amber-400 border-amber-500/30">
                      Seat {b.seat?.seatNumber}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-extrabold text-emerald-400">
                    ₹{Number(b.totalAmount)}
                  </TableCell>
                  <TableCell className="text-xs font-bold text-slate-300">
                    {b.paymentMode}
                  </TableCell>
                  <TableCell className="text-xs">
                    {b.paymentVerification ? (
                      <div>
                        <p className="font-mono font-bold text-amber-400">{b.paymentVerification.utrNumber || "N/A"}</p>
                        {b.paymentVerification.screenshotUrl && (
                          <a href={b.paymentVerification.screenshotUrl} target="_blank" rel="noreferrer" className="text-amber-400 underline hover:text-amber-300 font-semibold inline-flex items-center gap-1">
                            Screenshot <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-500">Cash on Board</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {b.paymentMode === "CASH" ? (
                        <form action={confirmPassengerPaymentAction.bind(null, b.id)}>
                          <Button type="submit" size="sm" className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs gap-1 h-8">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Collect cash
                          </Button>
                        </form>
                      ) : (
                        <span className="text-[10px] font-bold text-indigo-400">Admin approval required</span>
                      )}
                      <form action={rejectPassengerPaymentAction.bind(null, b.id, "Rejected by driver")}>
                        <Button type="submit" size="sm" variant="secondary" className="text-rose-400 hover:bg-rose-950/40 border border-slate-700 text-xs gap-1 h-8">
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
      )}

      <PaginationControls
        page={page}
        totalPages={totalPages}
        total={totalCount}
        pageSize={PAGE_SIZE}
      />
    </div>
  );
}
