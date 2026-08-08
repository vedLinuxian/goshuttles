"use client";

import { useState } from "react";
import { ArrowRight, Clock, MapPin, ShieldCheck, Zap, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui";

type RouteData = {
  id: string;
  name: string;
  source: string;
  destination: string;
  distanceKm: number;
  durationMins: number;
  frequencyMinutes: number;
  stops: string[];
  basePrice: number;
  nextDepartureTime: string;
  occupancyPct: number;
  fleetType: string;
};

const CORRIDORS: RouteData[] = [
  {
    id: "lkn-ayd",
    name: "Lucknow ↔ Ayodhya Dham Express",
    source: "Lucknow (Alambagh Bus Stand)",
    destination: "Ayodhya (Dham Terminal)",
    distanceKm: 135,
    durationMins: 120,
    frequencyMinutes: 30,
    stops: ["Alambagh Bus Stand", "Polytechnic Crossing", "BBD Express Gate", "Ayodhya Dham Terminal"],
    basePrice: 300,
    nextDepartureTime: "07:00 AM",
    occupancyPct: 83,
    fleetType: "Toyota Innova Crysta / Ertiga ZXI+",
  },
  {
    id: "lkn-vns",
    name: "Lucknow ↔ Varanasi Cantt Corridor",
    source: "Lucknow (Alambagh Bus Stand)",
    destination: "Varanasi (Cantt Station)",
    distanceKm: 310,
    durationMins: 270,
    frequencyMinutes: 60,
    stops: ["Alambagh Hub", "Raebareli Highway", "Jaunpur Bypass", "Varanasi Cantt Station"],
    basePrice: 600,
    nextDepartureTime: "08:15 AM",
    occupancyPct: 75,
    fleetType: "Force Traveller Luxury Executive",
  },
  {
    id: "ayd-gkp",
    name: "Ayodhya ↔ Gorakhpur Express",
    source: "Ayodhya (Dham Terminal)",
    destination: "Gorakhpur (Express Hub)",
    distanceKm: 140,
    durationMins: 135,
    frequencyMinutes: 45,
    stops: ["Ayodhya Dham Terminal", "Basti Expressway Junction", "Gorakhpur Express Hub"],
    basePrice: 450,
    nextDepartureTime: "09:30 AM",
    occupancyPct: 90,
    fleetType: "Maruti XL6 Premium SUV",
  },
];

export function FuturisticRouteExplorer() {
  const [selectedRoute, setSelectedRoute] = useState<RouteData>(CORRIDORS[0]);

  return (
    <div className="w-full space-y-6">
      {/* Corridor Selector Tabs */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {CORRIDORS.map((route) => (
          <button
            key={route.id}
            type="button"
            onClick={() => setSelectedRoute(route)}
            className={`px-4 py-2.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              selectedRoute.id === route.id
                ? "bg-amber-500 text-slate-950 border-amber-400 shadow-md"
                : "bg-[var(--card)] text-[var(--foreground)] border border-[var(--border)] hover:border-amber-500/40"
            }`}
          >
            <MapPin className={`h-3.5 w-3.5 ${selectedRoute.id === route.id ? "text-slate-950" : "text-amber-500"}`} />
            <span>{route.name}</span>
          </button>
        ))}
      </div>

      {/* Selected Corridor Visual Card */}
      <div className="relative rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 sm:p-6 backdrop-blur-xl transition-colors">
        <div className="grid lg:grid-cols-[1.3fr_0.7fr] gap-6 items-center">
          {/* Left: Stops Visual Flow */}
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
              <div>
                <Badge variant="solidAmber" className="mb-1">Every {selectedRoute.frequencyMinutes} Mins</Badge>
                <h3 className="text-xl sm:text-2xl font-black text-[var(--foreground)]">{selectedRoute.name}</h3>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-[var(--muted-foreground)] block">Base Seat Fare</span>
                <span className="text-2xl font-black text-amber-500">₹{selectedRoute.basePrice}</span>
              </div>
            </div>

            {/* Route Stops Timeline */}
            <div className="space-y-3">
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--muted-foreground)]">Waypoints &amp; Stops</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {selectedRoute.stops.map((stop, idx) => (
                  <div
                    key={stop}
                    className="p-3 rounded-xl bg-[var(--muted)]/50 border border-[var(--border)] space-y-1"
                  >
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-500 text-[10px] font-bold inline-flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <p className="text-xs font-bold text-[var(--foreground)] leading-tight">{stop}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Route Specs Grid */}
            <div className="grid grid-cols-3 gap-3 pt-2 border-t border-slate-800">
              <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Distance</span>
                <span className="text-base font-black text-white">{selectedRoute.distanceKm} km</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Duration</span>
                <span className="text-base font-black text-white">{selectedRoute.durationMins} mins</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Fleet</span>
                <span className="text-xs font-extrabold text-amber-400 truncate block mt-0.5">{selectedRoute.fleetType}</span>
              </div>
            </div>
          </div>

          {/* Right: Booking Summary & Live Meter */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Next Departure</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {selectedRoute.nextDepartureTime}
                </span>
              </div>
              <p className="text-base font-extrabold text-white">{selectedRoute.source}</p>
              <p className="text-xs text-slate-400">➔ {selectedRoute.destination}</p>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-400">Route Occupancy</span>
                <span className="text-amber-400 font-bold">{selectedRoute.occupancyPct}% Booked</span>
              </div>
              <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 rounded-full"
                  style={{ width: `${selectedRoute.occupancyPct}%` }}
                />
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-300 pt-2 border-t border-slate-800">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span>Dual AC Climate Control</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                <span>5-Min Atomic Seat Lock</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                <span>Verified Drivers</span>
              </div>
            </div>

            <a
              href="#booking-wizard"
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-all shadow-md text-xs cursor-pointer hover:scale-[1.02]"
            >
              <span>Book Departure ({selectedRoute.nextDepartureTime})</span>
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
