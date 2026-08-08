"use client";

import { useState } from "react";
import { FuturisticRouteExplorer } from "./futuristic-route-explorer";
import { ShuttleCabinPreview } from "./shuttle-cabin-preview";
import { LiveTelemetrySection } from "./live-telemetry-section";
import { Compass, Armchair, Activity } from "lucide-react";

export function UnifiedInteractiveDeck() {
  const [activeTab, setActiveTab] = useState<"CORRIDORS" | "CABIN" | "TELEMETRY">("CORRIDORS");

  return (
    <section className="py-12 px-4 sm:px-6 lg:px-8 mx-auto max-w-7xl">
      {/* Tab Switcher Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8 bg-slate-950/80 border border-slate-800 p-2 rounded-2xl backdrop-blur-xl">
        <div className="px-3">
          <p className="text-xs font-black uppercase tracking-widest text-amber-400">Interactive Studio</p>
          <p className="text-xs text-slate-400 font-medium">Explore routes, seat maps &amp; live telemetry</p>
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("CORRIDORS")}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "CORRIDORS"
                ? "bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }`}
          >
            <Compass className="h-3.5 w-3.5" />
            <span>Corridors &amp; Stops</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("CABIN")}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "CABIN"
                ? "bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }`}
          >
            <Armchair className="h-3.5 w-3.5" />
            <span>Cabin Seat Map</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("TELEMETRY")}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "TELEMETRY"
                ? "bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }`}
          >
            <Activity className="h-3.5 w-3.5 text-emerald-400" />
            <span>Live Telemetry</span>
          </button>
        </div>
      </div>

      {/* Tab Contents */}
      <div className="rounded-3xl border border-slate-800 bg-slate-950/60 p-2 sm:p-6 backdrop-blur-xl">
        {activeTab === "CORRIDORS" && <FuturisticRouteExplorer />}
        {activeTab === "CABIN" && <ShuttleCabinPreview />}
        {activeTab === "TELEMETRY" && <LiveTelemetrySection />}
      </div>
    </section>
  );
}
