"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui";

export function TicketQRCode({ value, ticketNumber, ticketId }: { value: string; ticketNumber: string; ticketId: string }) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
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
      anchor.download = `GoShuttles-Pass-${ticketNumber}.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      window.open(`/api/tickets/${ticketId}/pdf`, "_blank");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex flex-col items-center space-y-6">
      {/* High-density QR code container */}
      <div className="bg-white p-5 rounded-3xl shadow-2xl border-2 border-amber-500/50 glow-amber flex flex-col items-center justify-center relative group">
        <QRCodeSVG value={value} size={160} level="H" includeMargin />
        <div className="text-[10px] font-mono font-extrabold text-slate-950 mt-2 tracking-widest uppercase">
          SECURITY REF: {ticketNumber}
        </div>
      </div>

      {/* Barcode Graphics */}
      <div className="w-full flex flex-col items-center space-y-1 bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
        <p className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">JET-PASS SYSTEM BARCODE</p>
        <svg className="w-full h-12 text-slate-200" viewBox="0 0 200 40">
          <g fill="currentColor">
            <rect x="10" y="5" width="3" height="30" />
            <rect x="15" y="5" width="1" height="30" />
            <rect x="18" y="5" width="4" height="30" />
            <rect x="24" y="5" width="2" height="30" />
            <rect x="28" y="5" width="1" height="30" />
            <rect x="32" y="5" width="5" height="30" />
            <rect x="39" y="5" width="2" height="30" />
            <rect x="43" y="5" width="1" height="30" />
            <rect x="47" y="5" width="3" height="30" />
            <rect x="52" y="5" width="4" height="30" />
            <rect x="58" y="5" width="1" height="30" />
            <rect x="62" y="5" width="2" height="30" />
            <rect x="66" y="5" width="6" height="30" />
            <rect x="74" y="5" width="2" height="30" />
            <rect x="78" y="5" width="1" height="30" />
            <rect x="82" y="5" width="3" height="30" />
            <rect x="87" y="5" width="2" height="30" />
            <rect x="91" y="5" width="4" height="30" />
            <rect x="97" y="5" width="1" height="30" />
            <rect x="100" y="5" width="3" height="30" />
            <rect x="105" y="5" width="2" height="30" />
            <rect x="110" y="5" width="5" height="30" />
            <rect x="117" y="5" width="1" height="30" />
            <rect x="120" y="5" width="3" height="30" />
            <rect x="125" y="5" width="2" height="30" />
            <rect x="130" y="5" width="4" height="30" />
            <rect x="136" y="5" width="1" height="30" />
            <rect x="140" y="5" width="3" height="30" />
            <rect x="145" y="5" width="2" height="30" />
            <rect x="150" y="5" width="5" height="30" />
            <rect x="157" y="5" width="2" height="30" />
            <rect x="161" y="5" width="1" height="30" />
            <rect x="164" y="5" width="4" height="30" />
            <rect x="170" y="5" width="2" height="30" />
            <rect x="174" y="5" width="1" height="30" />
            <rect x="177" y="5" width="3" height="30" />
            <rect x="182" y="5" width="2" height="30" />
            <rect x="186" y="5" width="4" height="30" />
          </g>
        </svg>
        <span className="text-[10px] font-mono text-slate-400 tracking-wider">*GOSHUTTLES-{ticketNumber}*</span>
      </div>

      {/* Action Buttons */}
      <div className="no-print flex items-center gap-3 w-full">
        <Button
          onClick={handleDownload}
          disabled={downloading}
          className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 shadow-lg glow-amber transition-all cursor-pointer"
        >
          {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4 text-slate-950" />}
          {downloading ? "Generating Pass PDF..." : "Download Pass PDF"}
        </Button>
      </div>
    </div>
  );
}
