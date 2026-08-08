import { Card } from "@/components/ui";
import { MessageSquare } from "lucide-react";

export default function ComplaintsPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <MessageSquare className="h-6 w-6 text-amber-400" />
          Help &amp; Support Center
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Reach out to GoShuttles customer support for booking assistance or trip concerns.
        </p>
      </div>

      <Card variant="glass" className="p-12 text-center space-y-3 border-slate-800">
        <MessageSquare className="h-12 w-12 mx-auto text-amber-500/40" />
        <p className="text-lg font-extrabold text-white">GoShuttles 24/7 Support Desk</p>
        <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
          Need help with a booking or lost item? Contact our support helpline or log a ticket with your booking reference.
        </p>
      </Card>
    </div>
  );
}
