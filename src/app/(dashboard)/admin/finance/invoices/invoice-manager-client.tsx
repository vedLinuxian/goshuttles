"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Receipt,
  CheckCircle2,
  XCircle,
  Clock,
  Ban,
  Banknote,
  FileText,
  Loader2,
  Download,
  RefreshCw,
  AlertTriangle,
  CreditCard,
  Sparkles,
  Search,
} from "lucide-react";
import {
  Card,
  Button,
  Badge,
  Select,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Input,
  Label,
} from "@/components/ui";
import PaginationControls from "@/components/ui/pagination";
import { adminGenerateInvoiceAction, adminVoidInvoiceAction, adminCollectCashAndIssueInvoice } from "@/app/actions/invoice-actions";

type InvoiceStatus = "PAID" | "UNPAID" | "VOID" | "EXPIRED" | "PARTIALLY_PAID";

interface InvoiceItem {
  id: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  baseAmount: number;
  taxAmount: number;
  totalAmount: number;
  notes: string | null;
  issuedAt: string;
  paidAt: string | null;
  expiresAt: string | null;
  bookingId: string;
  booking: {
    id: string;
    paymentMode: string;
    paymentStatus: string;
    status: string;
    passengerName: string;
    passengerPhone: string | null;
    seatNumber: string;
    ticketNumber: string | null;
    source: string;
    destination: string;
    startTime: string;
    driverName: string | null;
  };
  issuedBy: { name: string; role: string };
}

interface PendingBookingItem {
  id: string;
  passengerName: string;
  passengerPhone: string | null;
  seatNumber: string;
  totalAmount: number;
  paymentMode: string;
  source: string;
  destination: string;
  startTime: string;
  driverName: string | null;
}

interface Props {
  invoices: InvoiceItem[];
  pendingBookings: PendingBookingItem[];
  page: number;
  totalPages: number;
  totalCount: number;
  stats: { paidCount: number; unpaidCount: number; expiredCount: number; voidCount: number };
  filters: { status: string; q: string };
}

type ModalState =
  | { type: "GENERATE"; bookingId: string; passengerName: string; totalAmount: number }
  | { type: "VOID"; invoiceId: string; invoiceNumber: string }
  | { type: "COLLECT_CASH"; bookingId: string; passengerName: string; totalAmount: number }
  | null;

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; icon: React.ReactNode; badgeClass: string }> = {
  PAID: {
    label: "PAID",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    badgeClass: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  },
  UNPAID: {
    label: "UNPAID",
    icon: <Clock className="h-3.5 w-3.5" />,
    badgeClass: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  },
  PARTIALLY_PAID: {
    label: "PARTIAL",
    icon: <CreditCard className="h-3.5 w-3.5" />,
    badgeClass: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
  },
  EXPIRED: {
    label: "EXPIRED",
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
    badgeClass: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  },
  VOID: {
    label: "VOID",
    icon: <Ban className="h-3.5 w-3.5" />,
    badgeClass: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  },
};

function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.UNPAID;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-extrabold ${cfg.badgeClass}`}
    >
      {cfg.icon} {cfg.label}
    </span>
  );
}

export default function InvoiceManagerClient({
  invoices,
  pendingBookings,
  page,
  totalPages,
  totalCount,
  stats,
  filters,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [modal, setModal] = useState<ModalState>(null);
  const [genStatus, setGenStatus] = useState<InvoiceStatus>("PAID");
  const [genNotes, setGenNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleAction = async () => {
    if (!modal) return;
    setError(null);
    setSuccess(null);

    try {
      if (modal.type === "GENERATE") {
        const res = await adminGenerateInvoiceAction(modal.bookingId, genStatus, genNotes || undefined);
        if (!res.success) throw new Error(res.error);
        setSuccess(`Invoice generated: ${(res.invoice as { invoiceNumber?: string })?.invoiceNumber ?? ""}`);
      } else if (modal.type === "VOID") {
        const res = await adminVoidInvoiceAction(modal.invoiceId);
        if (!res.success) throw new Error(res.error);
        setSuccess("Invoice voided successfully.");
      } else if (modal.type === "COLLECT_CASH") {
        const res = await adminCollectCashAndIssueInvoice(modal.bookingId, genNotes || "Cash confirmed by admin.");
        if (!res.success) throw new Error(res.error);
        setSuccess(`Cash collected. Invoice: ${(res.invoice as { invoiceNumber?: string })?.invoiceNumber ?? ""}`);
      }

      startTransition(() => router.refresh());
      setTimeout(() => {
        setModal(null);
        setSuccess(null);
        setGenNotes("");
        setGenStatus("PAID");
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Operation failed.");
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Receipt className="h-7 w-7 text-amber-500 shrink-0" />
            Invoice &amp; Payment Register
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Generate, void, and manage all financial invoices with status labels. Admin can generate for any booking at any time.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.refresh()}
          className="border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-slate-300 text-xs font-semibold self-start sm:self-auto h-10"
        >
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Paid", value: stats.paidCount, icon: <CheckCircle2 className="h-5 w-5" />, cls: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
          { label: "Unpaid", value: stats.unpaidCount, icon: <Clock className="h-5 w-5" />, cls: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
          { label: "Expired", value: stats.expiredCount, icon: <AlertTriangle className="h-5 w-5" />, cls: "text-rose-400 bg-rose-500/10 border-rose-500/20" },
          { label: "Void", value: stats.voidCount, icon: <Ban className="h-5 w-5" />, cls: "text-slate-400 bg-slate-500/10 border-slate-500/20" },
        ].map((kpi) => (
          <Card key={kpi.label} variant="glass" className="p-4 border-slate-800 bg-[#0c101c]/80 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{kpi.label}</p>
              <p className={`text-2xl font-black mt-1 ${kpi.cls.split(" ")[0]}`}>{kpi.value}</p>
            </div>
            <div className={`p-3 rounded-2xl border ${kpi.cls}`}>{kpi.icon}</div>
          </Card>
        ))}
      </div>

      {/* Pending Cash Bookings — Generate Invoice Panel */}
      {pendingBookings.length > 0 && (
        <Card variant="glass" className="border-amber-500/30 bg-amber-500/5 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Banknote className="h-5 w-5 text-amber-400" />
            <h2 className="font-extrabold text-amber-300 text-sm">
              {pendingBookings.length} CASH booking{pendingBookings.length > 1 ? "s" : ""} pending cash collection &amp; invoice
            </h2>
          </div>
          <div className="grid gap-3">
            {pendingBookings.map((b) => (
              <div
                key={b.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-[#0c101c]/60 border border-amber-500/20"
              >
                <div className="text-xs">
                  <p className="font-bold text-white">{b.passengerName}</p>
                  <p className="text-slate-400 mt-0.5">
                    {b.source} → {b.destination} · Seat {b.seatNumber} ·{" "}
                    {new Date(b.startTime).toLocaleDateString("en-IN", { dateStyle: "short" })}
                  </p>
                  <p className="text-emerald-400 font-extrabold mt-0.5">
                    ₹{b.totalAmount.toLocaleString("en-IN")} CASH
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    size="sm"
                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs h-8 gap-1"
                    disabled={isPending}
                    onClick={() => {
                      setError(null);
                      setSuccess(null);
                      setGenNotes("Cash collected and confirmed by admin.");
                      setModal({ type: "COLLECT_CASH", bookingId: b.id, passengerName: b.passengerName, totalAmount: b.totalAmount });
                    }}
                  >
                    <Banknote className="h-3.5 w-3.5" /> Collect &amp; Invoice
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-slate-700 text-slate-300 text-xs h-8 gap-1"
                    disabled={isPending}
                    onClick={() => {
                      setError(null);
                      setSuccess(null);
                      setGenStatus("UNPAID");
                      setGenNotes("");
                      setModal({ type: "GENERATE", bookingId: b.id, passengerName: b.passengerName, totalAmount: b.totalAmount });
                    }}
                  >
                    <FileText className="h-3.5 w-3.5" /> Generate (Draft)
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 bg-[#0c101c]/90 p-4 border border-slate-800 rounded-2xl">
        <form method="get" className="flex flex-col sm:flex-row gap-2 w-full">
          <input
            name="q"
            defaultValue={filters.q}
            placeholder="Search invoice number..."
            className="flex-1 h-10 px-3 rounded-xl border border-slate-800 bg-slate-900 text-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          />
          <Select name="status" defaultValue={filters.status} className="w-full sm:w-48 text-xs font-bold bg-slate-900 border-slate-800 text-white h-10">
            <option value="">All statuses</option>
            <option value="PAID">Paid</option>
            <option value="UNPAID">Unpaid</option>
            <option value="PARTIALLY_PAID">Partially Paid</option>
            <option value="EXPIRED">Expired</option>
            <option value="VOID">Void</option>
          </Select>
          <Button type="submit" size="sm" className="h-10 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs px-4">
            <Search className="h-3.5 w-3.5 mr-1" /> Filter
          </Button>
        </form>
      </div>

      {/* Invoice Table */}
      {invoices.length === 0 ? (
        <Card variant="glass" className="p-12 text-center border-slate-800">
          <Receipt className="h-10 w-10 mx-auto text-amber-500/40" />
          <p className="font-extrabold text-white mt-3">No invoices found</p>
          <p className="text-xs text-slate-400 mt-1">Invoices are generated automatically when cash is collected or you generate them manually.</p>
        </Card>
      ) : (
        <Card variant="glass" className="overflow-hidden border-slate-800 bg-[#0c101c]/80 p-0 shadow-xl">
          <Table>
            <TableHeader className="bg-slate-900/80 border-b border-slate-800">
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-[11px] font-bold text-slate-300 uppercase">Invoice</TableHead>
                <TableHead className="text-[11px] font-bold text-slate-300 uppercase">Passenger &amp; Route</TableHead>
                <TableHead className="text-[11px] font-bold text-slate-300 uppercase">Amount</TableHead>
                <TableHead className="text-[11px] font-bold text-slate-300 uppercase">Status</TableHead>
                <TableHead className="text-[11px] font-bold text-slate-300 uppercase">Payment</TableHead>
                <TableHead className="text-[11px] font-bold text-slate-300 uppercase">Issued</TableHead>
                <TableHead className="text-right text-[11px] font-bold text-slate-300 uppercase">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-slate-800/60">
              {invoices.map((inv) => (
                <TableRow key={inv.id} className="hover:bg-slate-900/30 transition-colors">
                  <TableCell className="py-3.5">
                    <p className="font-mono font-extrabold text-amber-400 text-xs">{inv.invoiceNumber}</p>
                    {inv.booking.ticketNumber && (
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">TKT: {inv.booking.ticketNumber}</p>
                    )}
                  </TableCell>
                  <TableCell className="py-3.5">
                    <p className="text-xs font-bold text-white">{inv.booking.passengerName}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {inv.booking.source} → {inv.booking.destination}
                    </p>
                    <p className="text-[10px] text-slate-500">Seat {inv.booking.seatNumber}</p>
                  </TableCell>
                  <TableCell className="py-3.5">
                    <p className="text-sm font-extrabold text-white">₹{inv.totalAmount.toLocaleString("en-IN")}</p>
                    {inv.taxAmount > 0 && (
                      <p className="text-[10px] text-slate-500">+₹{inv.taxAmount} tax</p>
                    )}
                  </TableCell>
                  <TableCell className="py-3.5">
                    <InvoiceStatusBadge status={inv.status} />
                    {inv.paidAt && (
                      <p className="text-[10px] text-emerald-400 mt-1">
                        Paid {new Date(inv.paidAt).toLocaleDateString("en-IN")}
                      </p>
                    )}
                    {inv.expiresAt && inv.status === "UNPAID" && (
                      <p className="text-[10px] text-amber-400 mt-1">
                        Exp: {new Date(inv.expiresAt).toLocaleDateString("en-IN")}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="py-3.5">
                    <span className={`text-[11px] font-bold ${inv.booking.paymentMode === "CASH" ? "text-amber-400" : "text-indigo-400"}`}>
                      {inv.booking.paymentMode}
                    </span>
                    <p className="text-[10px] text-slate-500 mt-0.5">{inv.booking.paymentStatus}</p>
                  </TableCell>
                  <TableCell className="py-3.5 text-xs text-slate-400">
                    {new Date(inv.issuedAt).toLocaleDateString("en-IN", { dateStyle: "short" })}
                    <p className="text-[10px] text-slate-500 mt-0.5">by {inv.issuedBy.name}</p>
                  </TableCell>
                  <TableCell className="text-right py-3.5">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isPending}
                        onClick={() => {
                          setError(null);
                          setSuccess(null);
                          setGenStatus(inv.status === "PAID" ? "PAID" : "UNPAID");
                          setGenNotes(inv.notes ?? "");
                          setModal({ type: "GENERATE", bookingId: inv.bookingId, passengerName: inv.booking.passengerName, totalAmount: inv.totalAmount });
                        }}
                        className="h-7 px-2 text-[11px] border-slate-700 text-slate-300 font-bold"
                        title="Regenerate / update invoice"
                      >
                        <Sparkles className="h-3 w-3 mr-1" /> Update
                      </Button>
                      {inv.status !== "VOID" && (
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={isPending}
                          onClick={() => {
                            setError(null);
                            setSuccess(null);
                            setModal({ type: "VOID", invoiceId: inv.id, invoiceNumber: inv.invoiceNumber });
                          }}
                          className="h-7 px-2 text-[11px] text-rose-400 hover:bg-rose-950/30 border border-slate-700"
                          title="Void invoice"
                        >
                          <Ban className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <PaginationControls page={page} totalPages={totalPages} total={totalCount} pageSize={20} />

      {/* Modal */}
      <Dialog open={Boolean(modal)} onOpenChange={(open) => !open && setModal(null)}>
        <DialogContent className="sm:max-w-md bg-[#0c101c] border-amber-500/30 text-white rounded-3xl p-6 shadow-2xl z-[99999]">
          {/* Generate / Update Invoice */}
          {(modal?.type === "GENERATE") && (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle className="text-amber-400 font-extrabold flex items-center gap-2">
                  <Receipt className="h-5 w-5" /> Generate Invoice
                </DialogTitle>
                <DialogDescription className="text-slate-400 text-xs">
                  For booking by <strong className="text-white">{modal.passengerName}</strong> — ₹{modal.totalAmount.toLocaleString("en-IN")}
                </DialogDescription>
              </DialogHeader>

              {error && <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold">{error}</div>}
              {success && <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">{success}</div>}

              <div className="space-y-3">
                <div>
                  <Label className="text-xs font-bold text-slate-300">Invoice Status Label *</Label>
                  <Select
                    value={genStatus}
                    onChange={(e) => setGenStatus(e.target.value as InvoiceStatus)}
                    className="mt-1 bg-slate-900 border-slate-800 text-white text-sm font-bold"
                  >
                    <option value="PAID">✅ PAID — Cash / Online collected</option>
                    <option value="UNPAID">⏳ UNPAID — Pending collection</option>
                    <option value="PARTIALLY_PAID">🔷 PARTIALLY_PAID</option>
                    <option value="EXPIRED">❌ EXPIRED — Payment window closed</option>
                    <option value="VOID">🚫 VOID — Invoice cancelled</option>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-bold text-slate-300">Notes (optional)</Label>
                  <Input
                    value={genNotes}
                    onChange={(e) => setGenNotes(e.target.value)}
                    placeholder="e.g. Cash collected at boarding..."
                    className="mt-1 bg-slate-900 border-slate-800 text-white text-xs"
                  />
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button variant="secondary" onClick={() => setModal(null)} disabled={isPending}>Cancel</Button>
                <Button
                  onClick={handleAction}
                  disabled={isPending}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold"
                >
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Receipt className="h-4 w-4 mr-1" /> Generate Invoice</>}
                </Button>
              </DialogFooter>
            </div>
          )}

          {/* Collect Cash + Invoice */}
          {modal?.type === "COLLECT_CASH" && (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle className="text-emerald-400 font-extrabold flex items-center gap-2">
                  <Banknote className="h-5 w-5" /> Collect Cash &amp; Issue Invoice
                </DialogTitle>
                <DialogDescription className="text-slate-400 text-xs">
                  Confirm physical cash collection of <strong className="text-emerald-400">₹{modal.totalAmount.toLocaleString("en-IN")}</strong> from <strong className="text-white">{modal.passengerName}</strong>. This will confirm the booking, generate a boarding ticket, and issue a PAID invoice.
                </DialogDescription>
              </DialogHeader>

              {error && <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold">{error}</div>}
              {success && <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">{success}</div>}

              <div>
                <Label className="text-xs font-bold text-slate-300">Notes (optional)</Label>
                <Input
                  value={genNotes}
                  onChange={(e) => setGenNotes(e.target.value)}
                  placeholder="e.g. Cash collected at admin counter..."
                  className="mt-1 bg-slate-900 border-slate-800 text-white text-xs"
                />
              </div>

              <DialogFooter className="gap-2">
                <Button variant="secondary" onClick={() => setModal(null)} disabled={isPending}>Cancel</Button>
                <Button
                  onClick={handleAction}
                  disabled={isPending}
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold"
                >
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><CheckCircle2 className="h-4 w-4 mr-1" /> Confirm Cash &amp; Issue Ticket</>}
                </Button>
              </DialogFooter>
            </div>
          )}

          {/* Void Invoice */}
          {modal?.type === "VOID" && (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle className="text-rose-400 font-extrabold flex items-center gap-2">
                  <Ban className="h-5 w-5" /> Void Invoice
                </DialogTitle>
                <DialogDescription className="text-slate-400 text-xs">
                  Are you sure you want to void invoice <strong className="text-rose-300">{modal.invoiceNumber}</strong>? The booking will remain intact. This action is recorded in the audit log.
                </DialogDescription>
              </DialogHeader>

              {error && <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold">{error}</div>}
              {success && <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">{success}</div>}

              <DialogFooter className="gap-2">
                <Button variant="secondary" onClick={() => setModal(null)} disabled={isPending}>Cancel</Button>
                <Button variant="destructive" onClick={handleAction} disabled={isPending} className="font-extrabold">
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Void Invoice"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
