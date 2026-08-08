"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
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
    <div className="no-print flex w-full flex-wrap gap-3">
      <Button
        type="button"
        disabled={downloading}
        onClick={downloadPdf}
        className="w-full gap-2 font-extrabold shadow-md glow-amber cursor-pointer"
      >
        {downloading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Generating Pass PDF...
          </>
        ) : (
          <>
            <Download className="h-4 w-4" />
            Download Pass PDF
          </>
        )}
      </Button>
    </div>
  );
}
