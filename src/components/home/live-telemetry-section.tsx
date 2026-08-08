import { ShieldCheck, MapPin, Sparkles, Navigation } from "lucide-react";

export function LiveTelemetrySection() {
  return (
    <div className="w-full space-y-6">
      <div className="grid lg:grid-cols-2 gap-8 items-center">
        {/* Left: Section Header & Feature Points */}
        <div className="space-y-4">
          <h3 className="text-2xl font-black text-[var(--foreground)] tracking-tight leading-snug">
            Powered by Live Telemetry &amp; Autonomous Dispatch
          </h3>

          <p className="text-[var(--muted-foreground)] text-xs sm:text-sm leading-relaxed">
            Every GoShuttles vehicle continuously updates its GPS telemetry, seat occupancy, and departure ETA. Passengers enjoy complete visibility while platform algorithms optimize trip dispatch in real time.
          </p>

          <div className="space-y-3 pt-1">
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-[var(--card)] border border-[var(--border)] shadow-sm">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500 shrink-0">
                <Navigation className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[var(--foreground)]">Millisecond Location Tracking</h4>
                <p className="text-[11px] text-[var(--muted-foreground)] mt-0.5">
                  Live GPS stream shared with passengers for precision pickup timing.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-[var(--card)] border border-[var(--border)] shadow-sm">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 shrink-0">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[var(--foreground)]">Full Driver &amp; Vehicle Vetting</h4>
                <p className="text-[11px] text-[var(--muted-foreground)] mt-0.5">
                  100% Aadhaar &amp; Commercial Driver License verification with regular vehicle maintenance logs.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Telemetry Grid Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 rounded-2xl bg-[var(--card)] border border-[var(--border)] backdrop-blur-xl space-y-2 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">Daily Fleet Mileage</span>
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            </div>
            <p className="text-2xl font-black text-[var(--foreground)]">12,450+ <span className="text-xs font-normal text-[var(--muted-foreground)]">km</span></p>
            <p className="text-[10px] text-emerald-500 font-semibold">↑ 18% weekly growth</p>
          </div>

          <div className="p-4 rounded-2xl bg-[var(--card)] border border-[var(--border)] backdrop-blur-xl space-y-2 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">Active Corridors</span>
              <MapPin className="h-3.5 w-3.5 text-amber-500" />
            </div>
            <p className="text-2xl font-black text-[var(--foreground)]">14 <span className="text-xs font-normal text-[var(--muted-foreground)]">routes</span></p>
            <p className="text-[10px] text-[var(--muted-foreground)]">Lucknow • Ayodhya • Varanasi</p>
          </div>

          <div className="p-4 rounded-2xl bg-[var(--card)] border border-[var(--border)] backdrop-blur-xl space-y-2 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">Driver Rating</span>
              <span className="text-[9px] font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">Top Rated</span>
            </div>
            <p className="text-2xl font-black text-[var(--foreground)]">4.92 / 5.0</p>
            <p className="text-[10px] text-[var(--muted-foreground)]">From 8,500+ trip reviews</p>
          </div>

          <div className="p-4 rounded-2xl bg-[var(--card)] border border-[var(--border)] backdrop-blur-xl space-y-2 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">Manifest Rate</span>
              <span className="text-[9px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">Optimal</span>
            </div>
            <p className="text-2xl font-black text-[var(--foreground)]">99.4%</p>
            <p className="text-[10px] text-[var(--muted-foreground)]">On-time departure rate</p>
          </div>
        </div>
      </div>
    </div>
  );
}
