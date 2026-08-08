import { Card } from "@/components/ui";
import { FileText } from "lucide-react";

export default function InvoicesPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <FileText className="h-6 w-6 text-amber-400" />
          Passenger Invoices &amp; Receipts
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Download tax invoices and official fare receipts for your completed shuttle rides.
        </p>
      </div>

      <Card variant="glass" className="p-12 text-center space-y-3 border-slate-800">
        <FileText className="h-12 w-12 mx-auto text-amber-500/40" />
        <p className="text-lg font-extrabold text-white">Automated Invoicing Portal</p>
        <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
          GST invoices for completed bookings will be automatically generated and emailed to your registered address upon trip completion.
        </p>
      </Card>
    </div>
  );
}
