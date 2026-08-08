"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  MapPin,
  Navigation,
  CalendarDays,
  Users,
  Search,
  ArrowLeftRight,
  Clock3,
  ArrowRight,
  CheckCircle2,
  Zap,
  ShieldCheck,
  Armchair,
  Bus,
  RotateCcw
} from "lucide-react";
import { Button, Card } from "@/components/ui";

type Location = { id: string; name: string };

type Seat = {
  id: string;
  seatNumber: string;
  seatType: string;
  price: number;
  status: string;
};

type ApiTrip = {
  id: string;
  startTime: string;
  source: { id?: string; name: string };
  destination: { id?: string; name: string };
  seats: Seat[];
  availableSeats?: number;
  totalSeats?: number;
};

export type RideSummary = {
  id: string;
  startTime: string;
  source: { id?: string; name: string };
  destination: { id?: string; name: string };
  availableSeats: number;
  totalSeats: number;
  lowestFare: number;
  seats: Seat[];
};

export function StepBookingWizard({
  locations,
  initialRides,
  isLoggedIn,
  today,
  tomorrow,
}: {
  locations: Location[];
  initialRides: RideSummary[];
  isLoggedIn: boolean;
  today: string;
  tomorrow: string;
}) {
  const router = useRouter();

  // Ensure dates are formatted YYYY-MM-DD for native mobile pickers
  const safeToday = today.slice(0, 10);
  const safeTomorrow = tomorrow.slice(0, 10);

  // Wizard Steps: 1 (Route & Date) -> 2 (Shuttle Departure) -> 3 (Cabin Seat) -> 4 (Confirm)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Step 1 Form State
  const [sourceId, setSourceId] = useState("");
  const [destinationId, setDestinationId] = useState("");
  const [date, setDate] = useState("");
  const [passengers, setPassengers] = useState("1");
  const [windowFilter, setWindowFilter] = useState("ANY");

  // Step 2 Departures State
  const [rides, setRides] = useState<RideSummary[]>(initialRides);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 3 & 4 Selected Details
  // Step 3 & 4 Selected Details
  const [selectedTrip, setSelectedTrip] = useState<RideSummary | null>(initialRides[0] || null);
  const [selectedSeats, setSelectedSeats] = useState<Seat[]>([]);
  const searchRequestRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const selectedSeat = selectedSeats[0] || null;
  const filteredRides = rides;

  // DOM refs — read the ACTUAL current select/input values at search time.
  // This bypasses iOS Safari's onChange not firing when a picker is dismissed
  // and ensures we always send the correct values to the API.
  const sourceRef = useRef<HTMLSelectElement>(null);
  const destRef = useRef<HTMLSelectElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);
  const passengersRef = useRef<HTMLInputElement>(null);
  const windowRef = useRef<HTMLSelectElement>(null);

  const swapLocations = () => {
    setSourceId(destinationId);
    setDestinationId(sourceId);
    setSelectedTrip(null);
    setSelectedSeats([]);
    if (currentStep > 1) setCurrentStep(1);
  };

  const handleSourceChange = (id: string) => {
    setSourceId(id);
    setSelectedTrip(null);
    setSelectedSeats([]);
    if (currentStep > 1) setCurrentStep(1);
  };

  const handleDestinationChange = (id: string) => {
    setDestinationId(id);
    setSelectedTrip(null);
    setSelectedSeats([]);
    if (currentStep > 1) setCurrentStep(1);
  };

  const handleResetFilters = () => {
    setSourceId("");
    setDestinationId("");
    setDate("");
    setPassengers("1");
    setWindowFilter("ANY");
    setRides(initialRides);
    setError(null);
    setCurrentStep(1);
    setCurrentPage(1);
    setHasMore(false);
    setSelectedSeats([]);
  };

  const handleSearchNow = useCallback(() => {
    // Read live DOM values — guaranteed fresh on all mobile browsers
    if (sourceRef.current) setSourceId(sourceRef.current.value);
    if (destRef.current) setDestinationId(destRef.current.value);
    if (dateRef.current) setDate(dateRef.current.value);
    if (passengersRef.current) setPassengers(passengersRef.current.value);
    if (windowRef.current) setWindowFilter(windowRef.current.value);

    const src = sourceRef.current?.value || sourceId;
    const dst = destRef.current?.value || destinationId;
    const dt = dateRef.current?.value || date;
    const pax = passengersRef.current?.value || passengers;
    const win = windowRef.current?.value || windowFilter;

    const requestId = ++searchRequestRef.current;
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const requestedPassengers = Math.min(6, Math.max(1, Number(pax) || 1));
    setCurrentStep(2);
    setLoading(true);
    setError(null);
    setCurrentPage(1);
    setHasMore(false);

    const params = new URLSearchParams({ page: "1", limit: "20", passengers: String(requestedPassengers), window: win });
    if (src) params.set("source", src);
    if (dst) params.set("destination", dst);
    if (dt) params.set("date", dt);

    fetch(`/api/trips?${params.toString()}`, { cache: "no-store", signal: controller.signal })
      .then((r) => r.json().then((payload) => ({ ok: r.ok, payload })))
      .then(({ ok, payload }) => {
        if (requestId !== searchRequestRef.current) return;
        if (!ok) throw new Error(payload.error || "Unable to search departures.");
        const nextRides: RideSummary[] = (payload.data as ApiTrip[]).map((ride) => {
          const availableSeats = ride.availableSeats ?? ride.seats.filter((s) => s.status === "AVAILABLE").length;
          const totalSeats = ride.totalSeats ?? ride.seats.length;
          const prices = ride.seats.map((s) => Number(s.price)).filter(Number.isFinite);
          return { id: ride.id, startTime: ride.startTime, source: ride.source, destination: ride.destination, availableSeats, totalSeats, lowestFare: prices.length ? Math.min(...prices) : 300, seats: ride.seats || [] };
        });
        setRides(nextRides);
        setSelectedTrip(null);
        setSelectedSeats([]);
        setHasMore(payload.total > (payload.page || 1) * (payload.limit || 20));
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        if (requestId !== searchRequestRef.current) return;
        setError(err instanceof Error ? err.message : "Unable to search departures.");
        setSelectedTrip(null);
        setSelectedSeats([]);
      })
      .finally(() => {
        if (requestId === searchRequestRef.current) setLoading(false);
      });
  }, [sourceId, destinationId, date, passengers, windowFilter]);

  async function handleLoadMore() {
    const nextPage = currentPage + 1;
    setLoadingMore(true);
    const requestedPassengers = Math.min(6, Math.max(1, Number(passengers) || 1));
    
    try {
      const params = new URLSearchParams({
        page: String(nextPage),
        limit: "20",
        passengers: String(requestedPassengers),
        window: windowFilter,
      });
      if (sourceId) params.set("source", sourceId);
      if (destinationId) params.set("destination", destinationId);
      if (date) params.set("date", date);

      const response = await fetch(`/api/trips?${params.toString()}`, {
        cache: "no-store",
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to load more departures.");

      const nextRides: RideSummary[] = (payload.data as ApiTrip[]).map((ride) => {
        const availableSeats = ride.availableSeats ?? ride.seats.filter((seat) => seat.status === "AVAILABLE").length;
        const totalSeats = ride.totalSeats ?? ride.seats.length;
        const prices = ride.seats.map((seat) => Number(seat.price)).filter(Number.isFinite);
        return {
          id: ride.id,
          startTime: ride.startTime,
          source: ride.source,
          destination: ride.destination,
          availableSeats,
          totalSeats,
          lowestFare: prices.length ? Math.min(...prices) : 300,
          seats: ride.seats || [],
        };
      });

      setRides(prev => [...prev, ...nextRides]);
      setCurrentPage(nextPage);
      
      if (payload.total > (payload.page || nextPage) * (payload.limit || 20)) {
        setHasMore(true);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error("Failed to load more departures", err);
    } finally {
      setLoadingMore(false);
    }
  }

  const handleSelectTrip = (trip: RideSummary) => {
    setSelectedTrip(trip);
    setSelectedSeats([]);
  };

  const handleSeatClick = (seat: Seat) => {
    if (seat.status !== "AVAILABLE") return;
    setSelectedSeats((prev) => {
      const exists = prev.some((s) => s.id === seat.id);
      if (exists) {
        return prev.filter((s) => s.id !== seat.id);
      }
      if (prev.length >= 6) return prev;
      return [...prev, seat];
    });
  };

  const handleProceedToConfirm = () => {
    if (selectedSeats.length === 0) return;
    setCurrentStep(4);
  };

  const handleFinalBookingSubmit = () => {
    if (!selectedTrip || selectedSeats.length === 0) return;
    const seatParam = selectedSeats.map((s) => s.seatNumber).join(",");
    const bookingPath = `/passenger/trips/${selectedTrip.id}?seat=${encodeURIComponent(seatParam)}`;
    if (!isLoggedIn) {
      router.push(`/login?callbackUrl=${encodeURIComponent(bookingPath)}`);
    } else {
      router.push(bookingPath);
    }
  };

  return (
    <Card variant="glass" className="w-full border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] p-5 sm:p-8 backdrop-blur-2xl shadow-2xl space-y-6">
      {/* Step Navigation Progress Bar */}
      <div className="grid grid-cols-2 gap-2 border-b border-[var(--border)] pb-5 sm:grid-cols-4">
        {[
          { step: 1, title: "1. Corridor & Date" },
          { step: 2, title: "2. Departure" },
          { step: 3, title: "3. Seat Map" },
          { step: 4, title: "4. Lock Ticket" },
        ].map((item) => (
          <button
            key={item.step}
            type="button"
            onClick={() => {
              if (item.step < currentStep) setCurrentStep(item.step as 1 | 2 | 3 | 4);
            }}
            disabled={item.step > currentStep}
            className={`py-2 px-2 rounded-xl text-center transition-all ${
              currentStep === item.step
                ? "bg-amber-500 text-[var(--background)] font-black shadow-lg shadow-amber-500/20 scale-[1.02]"
                : currentStep > item.step
                ? "bg-[var(--muted)] text-amber-500 font-bold hover:bg-[var(--card)] cursor-pointer"
                : "bg-[var(--muted)]/40 text-[var(--muted-foreground)] font-medium cursor-not-allowed opacity-50"
            }`}
          >
            <span className="text-[11px] sm:text-xs block truncate">{item.title}</span>
          </button>
        ))}
      </div>

      {/* STEP 1: Corridor & Date Selection */}
      {currentStep === 1 && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">Step 1 of 4</span>
              <h3 className="text-xl font-extrabold text-[var(--foreground)]">Select Travel Corridor</h3>
            </div>
            <span className="text-xs text-emerald-500 dark:text-emerald-400 font-bold bg-emerald-500/10 px-3.5 py-1 rounded-full border border-emerald-500/20 flex items-center gap-1.5 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Atomic Seat Engine Active
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-5 space-y-1.5">
              <label htmlFor="wizard-source" className="text-xs font-bold text-[var(--foreground)] flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-amber-500" /> Origin City
              </label>
              <select
                ref={sourceRef}
                id="wizard-source"
                value={sourceId}
                onChange={(e) => handleSourceChange(e.target.value)}
                className="w-full h-11 px-3.5 bg-[var(--card)] border border-[var(--border)] focus:border-amber-500 rounded-xl text-xs font-bold text-[var(--foreground)] outline-none transition-colors"
              >
                <option value="">All Origins (or choose city)</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>

            <div className="hidden md:flex md:col-span-2 justify-center pb-0.5">
              <button
                type="button"
                onClick={swapLocations}
                className="p-3 bg-[var(--muted)] border border-[var(--border)] hover:border-amber-500/50 text-amber-500 rounded-xl transition-all shadow-md cursor-pointer hover:scale-105"
                title="Swap Origin and Destination"
              >
                <ArrowLeftRight className="h-4 w-4" />
              </button>
            </div>

            <div className="md:col-span-5 space-y-1.5">
              <label htmlFor="wizard-dest" className="text-xs font-bold text-[var(--foreground)] flex items-center gap-1.5">
                <Navigation className="h-3.5 w-3.5 text-amber-500" /> Destination City
              </label>
              <select
                ref={destRef}
                id="wizard-dest"
                value={destinationId}
                onChange={(e) => handleDestinationChange(e.target.value)}
                className="w-full h-11 px-3.5 bg-[var(--card)] border border-[var(--border)] focus:border-amber-500 rounded-xl text-xs font-bold text-[var(--foreground)] outline-none transition-colors"
              >
                <option value="">All Destinations (or choose city)</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="space-y-1.5">
              <label htmlFor="wizard-date" className="text-xs font-bold text-[var(--foreground)] flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5 text-amber-500" /> Travel Date
              </label>
              <input
                ref={dateRef}
                id="wizard-date"
                type="date"
                min={safeToday}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full h-11 px-3.5 bg-[var(--card)] border border-[var(--border)] focus:border-amber-500 rounded-xl text-xs font-bold text-[var(--foreground)] outline-none transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="wizard-passengers" className="text-xs font-bold text-[var(--foreground)] flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-amber-500" /> Passengers
              </label>
              <input
                ref={passengersRef}
                id="wizard-passengers"
                type="number"
                min="1"
                max="6"
                value={passengers}
                onChange={(e) => setPassengers(e.target.value)}
                className="w-full h-11 px-3.5 bg-[var(--card)] border border-[var(--border)] focus:border-amber-500 rounded-xl text-xs font-bold text-[var(--foreground)] outline-none transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="wizard-window" className="text-xs font-bold text-[var(--foreground)] flex items-center gap-1.5">
                <Clock3 className="h-3.5 w-3.5 text-amber-500" /> Time Window
              </label>
              <select
                ref={windowRef}
                id="wizard-window"
                value={windowFilter}
                onChange={(e) => setWindowFilter(e.target.value)}
                className="w-full h-11 px-3.5 bg-[var(--card)] border border-[var(--border)] focus:border-amber-500 rounded-xl text-xs font-bold text-[var(--foreground)] outline-none transition-colors"
              >
                <option value="ANY">Any time</option>
                <option value="MORNING">Morning (5am - 12pm)</option>
                <option value="AFTERNOON">Afternoon (12pm - 5pm)</option>
                <option value="EVENING">Evening (5pm onwards)</option>
              </select>
            </div>
          </div>

          {error && (
            <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs font-semibold text-rose-700 dark:text-rose-300">
              {error}
            </div>
          )}

          <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
              <span className="font-semibold text-[var(--muted-foreground)] mr-1">Quick Date:</span>
              <button
                type="button"
                onClick={() => setDate(safeToday)}
                className={`px-3 py-1 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                  date === safeToday ? "bg-amber-500 text-slate-950 font-bold border-amber-400" : "bg-[var(--muted)] border-[var(--border)] text-[var(--foreground)] hover:border-slate-400"
                }`}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setDate(safeTomorrow)}
                className={`px-3 py-1 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                  date === safeTomorrow ? "bg-amber-500 text-slate-950 font-bold border-amber-400" : "bg-[var(--muted)] border-[var(--border)] text-[var(--foreground)] hover:border-slate-400"
                }`}
              >
                Tomorrow
              </button>
              <button
                type="button"
                onClick={() => setDate("")}
                className={`px-3 py-1 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                  date === "" ? "bg-amber-500/20 text-amber-500 border-amber-500/40" : "bg-[var(--muted)] border-[var(--border)] text-[var(--foreground)] hover:border-slate-400"
                }`}
              >
                All Dates
              </button>
            </div>

            <button
              type="button"
              disabled={loading}
              aria-label="Find departures"
              onClick={() => {
                if (!loading) handleSearchNow();
              }}
              style={{ touchAction: "manipulation" }}
              className="select-none touch-manipulation bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-6 h-11 rounded-xl shadow-lg flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed text-sm"
            >
              <Search className="h-4 w-4" aria-hidden />
              <span>{loading ? "Searching..." : "Find Departures →"}</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Departure Selection */}
      {currentStep === 2 && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">Step 2 of 4</span>
              <h3 className="text-xl font-extrabold text-[var(--foreground)]">Choose Shuttle Departure</h3>
            </div>
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs text-amber-500 hover:underline flex items-center gap-1 font-bold cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset Search Filters
            </button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="w-full rounded-2xl border border-[var(--border)] bg-[var(--muted)]/60 p-4 h-[132px] animate-pulse space-y-3">
                  <div className="flex justify-between items-center"><div className="h-5 bg-[var(--border)] w-20 rounded"></div><div className="h-4 bg-[var(--border)] w-12 rounded"></div></div>
                  <div className="flex justify-start items-center gap-2"><div className="h-4 bg-[var(--border)] w-24 rounded"></div><div className="h-4 bg-[var(--border)] w-4 rounded"></div><div className="h-4 bg-[var(--border)] w-24 rounded"></div></div>
                  <div className="flex justify-between items-center pt-1"><div className="h-3 bg-[var(--border)] w-24 rounded"></div><div className="h-3 bg-[var(--border)] w-24 rounded"></div></div>
                </div>
              ))}
            </div>
          ) : filteredRides.length === 0 ? (
            <div className="p-8 rounded-2xl bg-[var(--muted)] border border-[var(--border)] text-center space-y-3">
              <Bus className="h-10 w-10 mx-auto text-amber-500/50" />
              <p className="font-extrabold text-[var(--foreground)] text-sm">No departures match your search criteria.</p>
              <p className="text-xs text-[var(--muted-foreground)]">Try clearing the time window or selecting &quot;All Dates&quot;.</p>
              <Button type="button" onClick={handleResetFilters} size="sm" className="bg-amber-500 text-[var(--background)] font-bold">
                Reset Filters
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredRides.map((ride) => {
                const isSelected = selectedTrip?.id === ride.id;
                const formattedTime = new Date(ride.startTime).toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                });
                const formattedDate = new Date(ride.startTime).toLocaleDateString("en-IN", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                });

                return (
                  <button
                    key={ride.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => handleSelectTrip(ride)}
                    className={`w-full rounded-2xl border p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 space-y-3 ${
                      isSelected
                        ? "border-amber-500 bg-amber-500/10 shadow-lg glow-amber"
                        : "border-[var(--border)] bg-[var(--muted)]/60 hover:border-amber-500/40"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <span className="text-base font-black text-[var(--foreground)]">{formattedTime}</span>
                        <span className="text-[10px] font-semibold uppercase text-[var(--muted-foreground)]">({formattedDate})</span>
                      </div>
                      <span className="shrink-0 text-sm font-black text-amber-500">₹{ride.lowestFare}</span>
                    </div>

                    <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-xs font-extrabold text-[var(--foreground)]">
                      <span className="break-words">{ride.source.name}</span>
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                      <span className="break-words">{ride.destination.name}</span>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px]">
                      <span className="font-medium text-[var(--muted-foreground)]">Available Seats:</span>
                      <span className="font-extrabold text-emerald-500 dark:text-emerald-400">
                        {ride.availableSeats} of {ride.totalSeats} seats
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
            
            {hasMore && (
              <div className="pt-4 flex justify-center">
                <Button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="touch-manipulation bg-[var(--muted)] hover:bg-[var(--card)] text-[var(--foreground)] border border-[var(--border)] px-6 h-10 rounded-xl flex items-center gap-2 transition-all cursor-pointer"
                >
                  {loadingMore ? (
                    <>
                      <RotateCcw className="h-4 w-4 animate-spin" /> Loading...
                    </>
                  ) : (
                    "Load More Departures"
                  )}
                </Button>
              </div>
            )}
          </>
          )}

          {selectedTrip && !loading && (
            <div className="pt-2 flex justify-end">
              <Button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="bg-amber-500 hover:bg-amber-400 text-[var(--background)] font-black px-6 h-11 rounded-xl shadow-lg flex items-center gap-2 cursor-pointer"
              >
                <span>Select Cabin Seat →</span>
              </Button>
            </div>
          )}
        </div>
      )}

      {/* STEP 3: Interactive Cabin Seat Map */}
      {currentStep === 3 && selectedTrip && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">Step 3 of 4</span>
              <h3 className="text-xl font-extrabold text-[var(--foreground)]">Interactive SUV Cabin Seat Map</h3>
            </div>
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="text-xs text-amber-500 hover:underline flex items-center gap-1 font-bold cursor-pointer"
            >
              ← Back to Departures
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Seat Map View */}
            <div className="lg:col-span-7 p-6 rounded-3xl bg-[var(--muted)] border border-[var(--border)] space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                <span className="text-xs font-bold text-[var(--muted-foreground)] flex items-center gap-1.5">
                  <Bus className="h-4 w-4 text-amber-500" /> Driver Cockpit (Front)
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase">SUV 7-Seater Configuration</span>
              </div>

              {/* Seat Layout */}
              <div className="space-y-3 max-w-xs mx-auto pt-2">
                {/* Row 1: Front */}
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="p-3 rounded-xl bg-[var(--card)] border border-[var(--border)] text-xs text-[var(--muted-foreground)] font-bold opacity-60">
                    Driver
                  </div>
                  {selectedTrip.seats
                    .filter((s) => s.seatNumber === "F1")
                    .map((seat) => (
                      <SeatPill
                        key={seat.id}
                        seat={seat}
                        isSelected={selectedSeats.some((s) => s.id === seat.id)}
                        onClick={() => handleSeatClick(seat)}
                      />
                    ))}
                </div>

                {/* Row 2: Middle Row */}
                <div className="grid grid-cols-3 gap-3 text-center pt-2">
                  {selectedTrip.seats
                    .filter((s) => ["M1", "M2", "M3"].includes(s.seatNumber))
                    .map((seat) => (
                      <SeatPill
                        key={seat.id}
                        seat={seat}
                        isSelected={selectedSeats.some((s) => s.id === seat.id)}
                        onClick={() => handleSeatClick(seat)}
                      />
                    ))}
                </div>

                {/* Row 3: Back Row */}
                <div className="grid grid-cols-3 gap-3 text-center pt-2">
                  {selectedTrip.seats
                    .filter((s) => ["B1", "B2", "B3"].includes(s.seatNumber))
                    .map((seat) => (
                      <SeatPill
                        key={seat.id}
                        seat={seat}
                        isSelected={selectedSeats.some((s) => s.id === seat.id)}
                        onClick={() => handleSeatClick(seat)}
                      />
                    ))}
                </div>
              </div>

              {/* Seat Legend */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-4 border-t border-[var(--border)] text-[11px] font-bold sm:gap-4">
                <span className="flex items-center gap-1.5 text-[var(--muted-foreground)]">
                  <span className="w-3 h-3 rounded-md bg-[var(--card)] border border-[var(--border)]" /> Available
                </span>
                <span className="flex items-center gap-1.5 text-amber-500">
                  <span className="w-3 h-3 rounded-md bg-amber-500" /> Selected ({selectedSeats.length})
                </span>
                <span className="flex items-center gap-1.5 text-[var(--muted-foreground)] opacity-50">
                  <span className="w-3 h-3 rounded-md bg-rose-500/20 border border-rose-500/40" /> Booked
                </span>
              </div>
            </div>

            {/* Selected Seat Details */}
            <div className="lg:col-span-5 p-6 rounded-3xl bg-[var(--muted)] border border-[var(--border)] space-y-4">
              <h4 className="text-sm font-extrabold text-[var(--foreground)] uppercase tracking-wider">Group Seat Summary</h4>

              {selectedSeats.length > 0 ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-[var(--card)] border border-amber-500/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[var(--muted-foreground)] font-bold">Selected ({selectedSeats.length} {selectedSeats.length === 1 ? "Seat" : "Seats"})</span>
                      <span className="text-base font-black text-amber-500 font-mono">{selectedSeats.map((s) => s.seatNumber).join(", ")}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-[var(--border)]">
                      <span className="text-[var(--muted-foreground)] font-bold">Total Group Fare</span>
                      <span className="text-base font-black text-emerald-500 dark:text-emerald-400">
                        ₹{selectedSeats.reduce((acc, s) => acc + Number(s.price), 0)}
                      </span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    onClick={handleProceedToConfirm}
                    className="w-full bg-amber-500 hover:bg-amber-400 text-[var(--background)] font-black h-11 rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Proceed to Confirm (₹{selectedSeats.reduce((acc, s) => acc + Number(s.price), 0)})</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="p-8 text-center text-[var(--muted-foreground)] space-y-2">
                  <Armchair className="h-8 w-8 mx-auto text-amber-500/40" />
                  <p className="text-xs font-bold">Click 1 or more available seats on the map to select for your group.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: Lock Ticket & Confirm */}
      {currentStep === 4 && selectedTrip && selectedSeats.length > 0 && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">Step 4 of 4</span>
              <h3 className="text-xl font-extrabold text-[var(--foreground)]">Confirm Ticket &amp; Atomic Seat Lock</h3>
            </div>
            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              className="text-xs text-amber-500 hover:underline flex items-center gap-1 font-bold cursor-pointer"
            >
              ← Back to Seat Map
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-[var(--muted)] border border-[var(--border)] space-y-2">
              <span className="text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider block">Departure &amp; Route</span>
              <p className="text-sm font-black text-[var(--foreground)]">{selectedTrip.source.name} ➔ {selectedTrip.destination.name}</p>
              <p className="text-xs text-[var(--muted-foreground)]">Date: {new Date(selectedTrip.startTime).toLocaleString("en-IN")}</p>
              <p className="text-xs text-[var(--muted-foreground)]">Seats ({selectedSeats.length}): <span className="font-mono font-bold text-amber-500">{selectedSeats.map((s) => s.seatNumber).join(", ")}</span></p>
              <p className="text-xs text-[var(--muted-foreground)]">Total Group Fare: <span className="font-bold text-amber-500 text-sm">₹{selectedSeats.reduce((acc, s) => acc + Number(s.price), 0)}</span></p>
            </div>

            <div className="p-5 rounded-2xl bg-[var(--muted)] border border-[var(--border)] space-y-3">
              <span className="text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider block">5-Minute Atomic Group Lock Guarantee</span>
              <div className="space-y-2 text-xs text-[var(--foreground)]">
                <p className="flex items-center gap-1.5"><Zap className="h-3.5 w-3.5 text-amber-500" /> Atomic database engine holds all {selectedSeats.length} seats simultaneously.</p>
                <p className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> Instant QR Passes generated for all passengers.</p>
                <p className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-indigo-500" /> Single consolidated payment for the group.</p>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={handleFinalBookingSubmit}
              className="w-full py-4 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-[var(--background)] font-black text-sm uppercase tracking-wider rounded-2xl transition-all shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.01] active:scale-95"
            >
              <Zap className="h-4 w-4 fill-current" />
              <span>Proceed to Lock &amp; Issue Tickets (₹{selectedSeats.reduce((acc, s) => acc + Number(s.price), 0)})</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}

function SeatPill({
  seat,
  isSelected,
  onClick,
}: {
  seat: Seat;
  isSelected: boolean;
  onClick: () => void;
}) {
  const isAvailable = seat.status === "AVAILABLE";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!isAvailable}
      className={`p-3 rounded-xl border text-xs font-black transition-all ${
        isSelected
          ? "bg-amber-500 text-[var(--background)] border-amber-400 shadow-md scale-105 glow-amber cursor-pointer"
          : isAvailable
          ? "bg-[var(--card)] border-[var(--border)] text-[var(--foreground)] hover:border-amber-500/50 hover:text-amber-500 cursor-pointer"
          : "bg-rose-500/10 border-rose-500/20 text-[var(--muted-foreground)] cursor-not-allowed opacity-50"
      }`}
    >
      <div className="font-mono">{seat.seatNumber}</div>
      <div className="text-[9px] font-normal opacity-80">₹{Number(seat.price)}</div>
    </button>
  );
}
