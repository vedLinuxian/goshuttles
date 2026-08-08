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
            Total Earnings
          </div>
          <p className="text-2xl font-extrabold text-emerald-400">₹{earnings.totalEarnings}</p>
        </Card>

        <Card variant="glass" className="p-5 border-slate-800">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-1">
            <TrendingDown className="h-4 w-4 text-rose-400" />
            Commission Deductions
          </div>
          <p className="text-2xl font-extrabold text-rose-400">₹{earnings.totalDeductions}</p>
        </Card>

        <Card variant="glass" className="p-5 border-slate-800">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-1">
            <Wallet className="h-4 w-4 text-amber-400" />
            Net Wallet Balance
          </div>
          <p className="text-2xl font-extrabold text-amber-400">₹{earnings.netEarnings}</p>
        </Card>
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
