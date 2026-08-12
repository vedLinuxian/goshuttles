import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getDriverEarnings } from "@/lib/finance-service";
import PaginationControls from "@/components/ui/pagination";
import { IndianRupee, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { Card, Badge, Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui";

const PAGE_SIZE = 10;

export default async function EarningsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "DRIVER") redirect("/login");

  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const period = (params.period as string) || "month";

  const earnings = await getDriverEarnings(session.user.id!, period, page, PAGE_SIZE);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <Wallet className="h-6 w-6 text-amber-400" />
          Driver Earnings &amp; Wallet Ledger
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Detailed breakdown of trip revenue payouts and commission deductions.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card variant="glass" className="p-5 border-slate-800">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-1">
            <TrendingUp className="h-4 w-4 text-emerald-400" />
            Total Gross Earnings
          </div>
          <p className="text-2xl font-extrabold text-emerald-400">₹{earnings.totalEarnings}</p>
          <p className="text-[10px] text-slate-500 mt-1">Cumulative revenue across all collected trips</p>
        </Card>

        <Card variant="glass" className="p-5 border-slate-800">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-1">
            <TrendingDown className="h-4 w-4 text-rose-400" />
            Platform Commission
          </div>
          <p className="text-2xl font-extrabold text-rose-400">₹{earnings.totalDeductions}</p>
          <p className="text-[10px] text-slate-500 mt-1">Total commission owed / deducted by platform</p>
        </Card>

        <Card
          variant="glass"
          className={`p-5 border ${
            Number(earnings.netEarnings) < 0
              ? "border-rose-500/30 bg-rose-500/5"
              : "border-slate-800"
          }`}
        >
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-1">
            <Wallet className="h-4 w-4 text-amber-400" />
            Commission Settlement Ledger
          </div>
          <p className={`text-2xl font-extrabold ${
            Number(earnings.netEarnings) < 0 ? "text-rose-400" : "text-amber-400"
          }`}>
            {Number(earnings.netEarnings) < 0 ? "-" : "+"}₹{Math.abs(Number(earnings.netEarnings)).toFixed(2)}
          </p>
          {Number(earnings.netEarnings) < 0 && (
            <p className="text-[10px] text-rose-400 mt-1 font-semibold">
              ⚠ ₹{Math.abs(Number(earnings.netEarnings)).toFixed(2)} Platform fee owed (Cash collected)
            </p>
          )}
          {Number(earnings.netEarnings) >= 0 && (
            <p className="text-[10px] text-slate-500 mt-1">Net payout balance available</p>
          )}

        </Card>
      </div>

      {/* Wallet semantics explanation */}
      <div className="flex items-start gap-3 p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400">
        <IndianRupee className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
        <div className="space-y-1">
          <p className="font-bold text-slate-300">How your wallet works</p>
          <p><span className="text-emerald-400 font-semibold">CASH bookings:</span> You collect full fare from passengers. Platform debits its commission from your wallet balance. A negative balance means you owe that commission to GoShuttles.</p>
          <p><span className="text-indigo-400 font-semibold">ONLINE bookings:</span> Platform collects the fare, credits your net share (fare minus commission) to your wallet.</p>
        </div>
      </div>


      <Card variant="glass" className="overflow-hidden border-slate-800 p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Transaction Type</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {earnings.transactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-slate-400 py-6">
                  No earnings transactions recorded yet.
                </TableCell>
              </TableRow>
            ) : (
              earnings.transactions.map((t) => (
                <TableRow key={t.id} className="hover:bg-slate-800/50 transition-colors">
                  <TableCell className="text-xs text-slate-400 font-mono">
                    {new Date(t.createdAt).toLocaleDateString("en-IN")}
                  </TableCell>
                  <TableCell>
                    <Badge variant={Number(t.amount) >= 0 ? "success" : "destructive"}>
                      {t.transactionType}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-slate-200">
                    {t.description}
                  </TableCell>
                  <TableCell className={`text-right font-extrabold ${Number(t.amount) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {Number(t.amount) >= 0 ? "+" : "-"}₹{Math.abs(Number(t.amount))}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <PaginationControls
        page={page}
        totalPages={earnings.totalPages || 1}
        total={earnings.totalCount || earnings.transactions.length}
        pageSize={PAGE_SIZE}
      />
    </div>
  );
}
