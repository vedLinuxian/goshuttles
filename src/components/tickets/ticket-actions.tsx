"use client";

import { useState } from "react";
import { Printer, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui";

export function TicketActions({ ticketId }: { ticketId: string }) {
  const [downloading, setDownloading] = useState(false);

  async function downloadPdf() {
    try {
      setDownloading(true);
      const response = await fetch(`/api/tickets/${ticketId}/pdf`);
      if (!response.ok) {
        window.open(`/api/tickets/${ticketId}/pdf`, "_blank");
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `GoShuttles-Pass-${ticketId}.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      window.open(`/api/tickets/${ticketId}/pdf`, "_blank");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="no-print flex w-full flex-wrap sm:flex-nowrap gap-3">
      <Button
        type="button"
        variant="outline"
        onClick={() => window.print()}
        className="w-full sm:w-auto gap-2 font-bold cursor-pointer border-slate-700 hover:bg-slate-800 text-slate-200"
      >
        <Printer className="h-4 w-4" />
        Print Pass
      </Button>

      <Button
        type="button"
        disabled={downloading}
        onClick={downloadPdf}
        className="w-full sm:flex-1 gap-2 font-extrabold shadow-md glow-amber cursor-pointer bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950"
      >
        {downloading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Generating PDF...
          </>
        ) : (
          <>
            <Download className="h-4 w-4" />
            Download PDF
          </>
        )}
      </Button>
    </div>
  );
}
