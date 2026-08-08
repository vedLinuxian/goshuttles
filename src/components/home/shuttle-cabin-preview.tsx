"use client";

import { useState } from "react";
import { Zap, Shield, CheckCircle, Info } from "lucide-react";
import { Badge, Card } from "@/components/ui";

type Seat = {
  id: string;
  name: string;
  type: "FRONT" | "MIDDLE" | "BACK";
  price: number;
  status: "AVAILABLE" | "LOCKED" | "BOOKED";
  label: string;
};

const INITIAL_SEATS: Seat[] = [
  { id: "F1", name: "F1", type: "FRONT", price: 350, status: "AVAILABLE", label: "Front Co-Driver Seat (Extra Legroom)" },
  { id: "M1", name: "M1", type: "MIDDLE", price: 300, status: "LOCKED", label: "Middle Left Window Seat" },
  { id: "M2", name: "M2", type: "MIDDLE", price: 300, status: "AVAILABLE", label: "Middle Aisle Seat" },
  { id: "M3", name: "M3", type: "MIDDLE", price: 300, status: "BOOKED", label: "Middle Right Window Seat" },
  { id: "B1", name: "B1", type: "BACK", price: 270, status: "AVAILABLE", label: "Back Row Left" },
  { id: "B2", name: "B2", type: "BACK", price: 270, status: "AVAILABLE", label: "Back Row Right" },
];

export function ShuttleCabinPreview() {
  const [seats] = useState<Seat[]>(INITIAL_SEATS);
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(INITIAL_SEATS[0]);

  const handleSeatClick = (seat: Seat) => {
    if (seat.status === "BOOKED") return;
    setSelectedSeat(seat);
  };

  const availableCount = seats.filter((s) => s.status === "AVAILABLE").length;
  const lockedCount = seats.filter((s) => s.status === "LOCKED").length;

  return (
    <div className="w-full space-y-6">
      <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-6 items-center">
        {/* Visual Cabin Graphic */}
        <div className="relative bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 backdrop-blur-xl shadow-xl transition-colors">
          {/* Cabin Header / Driver Cockpit */}
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-[var(--border)]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[var(--muted)] flex items-center justify-center text-amber-500 border border-[var(--border)] font-black text-[10px]">
                DRIVER
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">Driver Cockpit</p>
                <p className="text-xs font-semibold text-[var(--foreground)]">Rahul S. (Rating 4.9★)</p>
              </div>
            </div>
            <span className="text-[11px] font-bold text-emerald-500 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
              6-Seater Executive SUV
            </span>
          </div>

          {/* Seat Rows Layout */}
          <div className="space-y-4 max-w-sm mx-auto">
            {/* Front Row */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider px-1">
                <span>Front Row (VIP)</span>
                <span className="text-amber-500 font-bold">₹350 Fares</span>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-2.5 rounded-xl border border-dashed border-[var(--border)] bg-[var(--muted)]/40 text-center text-xs text-[var(--muted-foreground)] font-semibold flex items-center justify-center">
                  Driver Seat
                </div>
                {seats
                  .filter((s) => s.type === "FRONT")
                  .map((seat) => (
                    <button
                      key={seat.id}
                      type="button"
                      onClick={() => handleSeatClick(seat)}
                      className={`p-2.5 rounded-xl border transition-all flex flex-col items-center justify-center gap-0.5 relative cursor-pointer ${
                        selectedSeat?.id === seat.id
                          ? "bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-md scale-[1.02]"
                          : seat.status === "LOCKED"
                          ? "bg-amber-500/10 text-amber-500 border-amber-500/30"
                          : seat.status === "BOOKED"
                          ? "bg-[var(--muted)]/40 text-[var(--muted-foreground)] border-[var(--border)] opacity-60 cursor-not-allowed"
                          : "bg-[var(--muted)] text-[var(--foreground)] border-[var(--border)] hover:border-amber-500"
                      }`}
                    >
                      <span className="text-xs font-extrabold">{seat.name}</span>
                      <span className="text-[10px] opacity-90">₹{seat.price}</span>
                    </button>
                  ))}
              </div>
            </div>

            {/* Middle Row */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
                <span>Middle Row (Captain)</span>
                <span className="text-slate-300">₹300 Fares</span>
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                {seats
                  .filter((s) => s.type === "MIDDLE")
                  .map((seat) => (
                    <button
                      key={seat.id}
                      type="button"
                      onClick={() => handleSeatClick(seat)}
                      disabled={seat.status === "BOOKED"}
                      className={`p-2.5 rounded-xl border transition-all flex flex-col items-center justify-center gap-0.5 relative ${
                        selectedSeat?.id === seat.id
                          ? "bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-md scale-[1.02]"
                          : seat.status === "LOCKED"
                          ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                          : seat.status === "BOOKED"
                          ? "bg-slate-800/40 text-slate-600 border-slate-800 opacity-60 cursor-not-allowed"
                          : "bg-slate-800/80 text-white border-slate-700 hover:border-amber-400"
                      }`}
                    >
                      <span className="text-xs font-extrabold">{seat.name}</span>
                      <span className="text-[10px] opacity-90">₹{seat.price}</span>
                    </button>
                  ))}
              </div>
            </div>

            {/* Back Row */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
                <span>Back Row</span>
                <span className="text-slate-300">₹270 Fares</span>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {seats
                  .filter((s) => s.type === "BACK")
                  .map((seat) => (
                    <button
                      key={seat.id}
                      type="button"
                      onClick={() => handleSeatClick(seat)}
                      className={`p-2.5 rounded-xl border transition-all flex flex-col items-center justify-center gap-0.5 relative ${
                        selectedSeat?.id === seat.id
                          ? "bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-md scale-[1.02]"
                          : seat.status === "LOCKED"
                          ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                          : seat.status === "BOOKED"
                          ? "bg-slate-800/40 text-slate-600 border-slate-800 opacity-60 cursor-not-allowed"
                          : "bg-slate-800/80 text-white border-slate-700 hover:border-amber-400"
                      }`}
                    >
                      <span className="text-xs font-extrabold">{seat.name}</span>
                      <span className="text-[10px] opacity-90">₹{seat.price}</span>
                    </button>
                  ))}
              </div>
            </div>
          </div>

          {/* Seat Status Legend */}
          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-around text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-slate-800 border border-slate-700" />
              <span>Available ({availableCount})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-amber-500/20 border border-amber-500/50" />
              <span>Locked ({lockedCount})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-slate-800/50 border border-slate-800" />
              <span>Booked</span>
            </div>
          </div>
        </div>

        {/* Seat Detail & Guarantee Card */}
        <div className="space-y-4">
          {selectedSeat ? (
            <Card variant="glass" className="border-amber-500/30 p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <Badge variant="solidAmber" className="mb-1">Seat: {selectedSeat.name}</Badge>
                  <h3 className="text-lg font-bold text-white">{selectedSeat.label}</h3>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block">Total Fare</span>
                  <span className="text-2xl font-black text-amber-400">₹{selectedSeat.price}</span>
                </div>
              </div>

              <div className="space-y-2 text-xs text-slate-300 border-t border-slate-800 pt-3">
                <div className="flex items-center gap-2">
                  <Zap className="h-3.5 w-3.5 text-amber-400" />
                  <span>5-Minute Atomic Lock active during checkout.</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="h-3.5 w-3.5 text-emerald-400" />
                  <span>AC cabin, luggage allowance &amp; free Wi-Fi.</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-3.5 w-3.5 text-blue-400" />
                  <span>Instant digital Boarding Pass with QR.</span>
                </div>
              </div>

              <a
                href="#booking-wizard"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-all shadow-md text-xs cursor-pointer hover:scale-[1.02]"
              >
                Proceed to Book {selectedSeat.name}
              </a>
            </Card>
          ) : (
            <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/30 text-center text-slate-400">
              <Info className="h-5 w-5 text-slate-500 mx-auto mb-1" />
              <p className="text-xs font-semibold">Click any seat in the shuttle cabin to inspect details.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
