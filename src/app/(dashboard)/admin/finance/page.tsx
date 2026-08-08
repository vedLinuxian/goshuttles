import { auth } from "@/auth";
import { redirect } from "next/navigation";
import {
  getDriverSettlements,
  getCommissionSummary,
  getDriverWalletTransactions,
} from "@/lib/analytics-queries";
import { db } from "@/lib/db";
import { IndianRupee, Wallet, Calendar, Filter, ArrowLeftRight } from "lucide-react";
import { SettleButton } from "./settle-button";
import Link from "next/link";
import {
  Card, Badge, Button,
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell
} from "@/components/ui";

interface Props {
  searchParams: Promise<{
    page?: string;
    status?: string;
    driverId?: string;
  }>;
}

export default async function AdminFinancePage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login");

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page || "1", 10) || 1);
  const statusFilter = (params.status === "SETTLED" ? "SETTLED" : params.status === "PENDING" ? "PENDING" : undefined) as "PENDING" | "SETTLED" | undefined;
  const selectedDriverId = params.driverId || undefined;

  const [settlementsData, commissionSummary, walletTransactions, driverInfo] = await Promise.all([
    getDriverSettlements(page, 15, statusFilter),
    getCommissionSummary(),
    selectedDriverId ? getDriverWalletTransactions(selectedDriverId, 50) : Promise.resolve([]),
    selectedDriverId
      ? db.user.findUnique({
          where: { id: selectedDriverId },
          select: { id: true, name: true, phone: true, driverProfile: { select: { walletBalance: true, totalEarnings: true } } },
        })
      : Promise.resolve(null),
  ]);

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <Wallet className="h-7 w-7 text-amber-500" />
          Finance &amp; Driver Settlements
        </h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">
          Driver cash settlements, commission tracking, and wallet ledger audit.
        </p>
      </div>

      {/* Commission Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Card variant="glass" className="p-5 flex items-center gap-4 border-[var(--border)] bg-[var(--card)]">
          <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/30">
            <IndianRupee className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-[var(--muted-foreground)]">Total Commission Earned</p>
            <p className="text-2xl font-extrabold text-[var(--foreground)] mt-0.5">
              ₹{commissionSummary.totalCommission.toLocaleString("en-IN")}
            </p>
            <p className="text-[11px] text-[var(--muted-foreground)] opacity-80 mt-0.5">Lifetime platform earnings</p>
          </div>
        </Card>

        <Card variant="glass" className="p-5 flex items-center gap-4 border-[var(--border)] bg-[var(--card)]">
          <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/30">
            <Calendar className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-[var(--muted-foreground)]">Commission This Month</p>
            <p className="text-2xl font-extrabold text-[var(--foreground)] mt-0.5">
              ₹{commissionSummary.thisMonthCommission.toLocaleString("en-IN")}
            </p>
            <p className="text-[11px] text-[var(--muted-foreground)] opacity-80 mt-0.5">
              {new Date().toLocaleString("en-IN", { month: "long", year: "numeric" })}
            </p>
          </div>
        </Card>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-2 bg-[var(--muted)]/60 border border-[var(--border)] rounded-2xl p-1.5 w-fit">
        <Filter className="h-4 w-4 text-amber-500 ml-2" />
        <Link
          href="/admin/finance"
          className={`px-4 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
            !statusFilter
              ? "bg-amber-500 text-slate-950 shadow-md glow-amber"
              : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          }`}
        >
          All
        </Link>
        <Link
          href="/admin/finance?status=PENDING"
          className={`px-4 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
            statusFilter === "PENDING"
              ? "bg-amber-500 text-slate-950 shadow-md glow-amber"
              : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          }`}
        >
          Pending
        </Link>
        <Link
          href="/admin/finance?status=SETTLED"
          className={`px-4 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
            statusFilter === "SETTLED"
              ? "bg-amber-500 text-slate-950 shadow-md glow-amber"
              : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          }`}
        >
          Settled
        </Link>
      </div>

      {/* Settlements Table */}
      <Card variant="glass" className="p-6 space-y-4 border-[var(--border)] bg-[var(--card)]">
        <h2 className="text-lg font-extrabold text-[var(--foreground)] flex items-center gap-2 border-b border-[var(--border)] pb-3">
          <ArrowLeftRight className="h-5 w-5 text-amber-500" />
          Driver Settlements
          <span className="text-xs font-normal text-[var(--muted-foreground)]">
            ({settlementsData.total} total)
          </span>
        </h2>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Driver</TableHead>
              <TableHead>Period</TableHead>
              <TableHead className="text-right">Cash Collected</TableHead>
              <TableHead className="text-right">Commission Due</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-center">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {settlementsData.settlements.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-slate-400 py-8">
                  No settlements found
                </TableCell>
              </TableRow>
            ) : (
              settlementsData.settlements.map((s) => (
                <TableRow key={s.id} className="hover:bg-slate-800/50 transition-colors">
                  <TableCell>
                    <Link
                      href={`/admin/finance?driverId=${s.driver.id}${
                        statusFilter ? `&status=${statusFilter}` : ""
                      }`}
                      className="font-bold text-white hover:text-amber-400 transition-colors"
                    >
                      {s.driver.name || "Unknown"}
                    </Link>
                    <p className="text-xs text-slate-400 font-mono">{s.driver.phone}</p>
                  </TableCell>
                  <TableCell className="text-xs text-slate-300">
                    {new Date(s.periodStart).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                    })}{" "}
                    →{" "}
                    {new Date(s.periodEnd).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </TableCell>
                  <TableCell className="text-right font-bold text-white">
                    ₹{s.totalCashCollected.toLocaleString("en-IN")}
                  </TableCell>
                  <TableCell className="text-right font-extrabold text-rose-400">
                    ₹{s.commissionDue.toLocaleString("en-IN")}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={s.status === "SETTLED" ? "success" : "warning"}>
                      {s.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <SettleButton
                      settlementId={s.id}
                      status={s.status}
                      currentPage={page}
                      currentStatus={statusFilter}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        {settlementsData.totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <p className="text-xs text-slate-400">
              Page {settlementsData.page} of {settlementsData.totalPages}
            </p>
            <div className="flex items-center gap-2">
              {page > 1 && (
                <Link
                  href={`/admin/finance?page=${page - 1}${
                    statusFilter ? `&status=${statusFilter}` : ""
                  }`}
                  className="px-3 py-1.5 text-xs font-bold bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-200 rounded-xl transition-colors"
                >
                  ← Previous
                </Link>
              )}
              {page < settlementsData.totalPages && (
                <Link
                  href={`/admin/finance?page=${page + 1}${
                    statusFilter ? `&status=${statusFilter}` : ""
                  }`}
                  className="px-3 py-1.5 text-xs font-bold bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-200 rounded-xl transition-colors"
                >
                  Next →
                </Link>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Driver Wallet Transaction Log */}
      {selectedDriverId && driverInfo && (
        <Card variant="glass" className="p-6 space-y-4 border-slate-800">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div>
              <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
                <Wallet className="h-5 w-5 text-amber-400" />
                Wallet Transactions: {driverInfo.name || "Unknown"}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Balance: ₹
                {Number(driverInfo.driverProfile?.walletBalance || 0).toLocaleString(
                  "en-IN"
                )}{" "}
                • Total Earnings: ₹
                {Number(driverInfo.driverProfile?.totalEarnings || 0).toLocaleString(
                  "en-IN"
                )}
              </p>
            </div>
            <Link
              href={`/admin/finance${
                statusFilter ? `?status=${statusFilter}` : ""
              }`}
              className="text-xs font-bold text-amber-400 hover:underline"
            >
              Close ×
            </Link>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {walletTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-slate-400 py-6">
                    No transactions found
                  </TableCell>
                </TableRow>
              ) : (
                walletTransactions.map((tx) => (
                  <TableRow key={tx.id} className="hover:bg-slate-800/50">
                    <TableCell className="text-xs text-slate-400 font-mono">
                      {new Date(tx.createdAt).toLocaleString("en-IN", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          tx.transactionType === "TRIP_EARNING"
                            ? "success"
                            : tx.transactionType === "SETTLEMENT"
                            ? "info"
                            : "warning"
                        }
                      >
                        {tx.transactionType}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-300 max-w-xs truncate">
                      {tx.description}
                    </TableCell>
                    <TableCell
                      className={`text-right font-extrabold ${
                        Number(tx.amount) >= 0
                          ? "text-emerald-400"
                          : "text-rose-400"
                      }`}
                    >
                      {Number(tx.amount) >= 0 ? "+" : ""}₹
                      {Math.abs(Number(tx.amount)).toLocaleString("en-IN")}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
