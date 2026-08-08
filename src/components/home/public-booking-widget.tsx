"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Search, Route, ArrowRight, ShieldCheck, X, Lock, Sparkles,
  ChevronDown, Check, AlertCircle, Calendar, ArrowLeftRight, Clock,
  MapPin, Navigation, Zap, Armchair, Bus
} from "lucide-react";
import Link from "next/link";

interface Location {
  id: string;
  name: string;
}

interface Seat {
  id: string;
  seatNumber: string;
  seatType: string;
  price: number;
  status: string;
}

interface Trip {
  id: string;
  startTime: string;
  source: { name: string };
  destination: { name: string };
  seats: Seat[];
}

interface PublicBookingWidgetProps {
  locations: Location[];
  initialTrips: Trip[];
  isLoggedIn: boolean;
  userRole?: string;
  maxInitialPreview?: number;
}

export function PublicBookingWidget({
  locations,
  initialTrips,
  isLoggedIn,
  maxInitialPreview = 3,
}: PublicBookingWidgetProps) {
  const router = useRouter();

  // Search state
  const [sourceId, setSourceId] = useState("");
  const [destId, setDestId] = useState("");
  const [travelDate, setTravelDate] = useState(""); // empty = all future trips from now

  // Dropdown Open States
  const [sourceOpen, setSourceOpen] = useState(false);
  const [destOpen, setDestOpen] = useState(false);
  const [sourceSearch, setSourceSearch] = useState("");
  const [destSearch, setDestSearch] = useState("");

  // Refs for click outside
  const sourceRef = useRef<HTMLDivElement>(null);
  const destRef = useRef<HTMLDivElement>(null);

  // Executed search results
  const [searchResults, setSearchResults] = useState<Trip[]>(initialTrips.slice(0, maxInitialPreview));
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hasExecutedSearch, setHasExecutedSearch] = useState(false);

  // Selected Trip & Seat
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(initialTrips[0] || null);
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);

  // Auth Modal State
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState<"login" | "register">("login");
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (sourceRef.current && !sourceRef.current.contains(e.target as Node)) {
        setSourceOpen(false);
      }
      if (destRef.current && !destRef.current.contains(e.target as Node)) {
        setDestOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const todayStr = new Date().toISOString().slice(0, 10);
  const tomorrowObj = new Date();
  tomorrowObj.setDate(tomorrowObj.getDate() + 1);
  const tomorrowStr = tomorrowObj.toISOString().slice(0, 10);

  const handleSwapLocations = () => {
    const temp = sourceId;
    setSourceId(destId);
    setDestId(temp);
  };

  const handleExecuteSearch = async () => {
    setIsSearching(true);
    setSearchError(null);
    setHasExecutedSearch(true);

    try {
      const params = new URLSearchParams({ page: "1", limit: "20", passengers: "1" });
      if (sourceId) params.set("source", sourceId);
      if (destId) params.set("destination", destId);
      if (travelDate) params.set("date", travelDate);

      const response = await fetch(`/api/trips?${params.toString()}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to search departures.");

      const matches = (payload.data || []) as Trip[];
      setSearchResults(matches);
      setSelectedTrip(matches[0] || null);
      setSelectedSeat(null);
    } catch (error) {
      setSearchResults([]);
      setSelectedTrip(null);
      setSelectedSeat(null);
      setSearchError(error instanceof Error ? error.message : "Unable to search departures.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSeatClick = (seat: Seat) => {
    if (seat.status !== "AVAILABLE") return;
    setSelectedSeat(seat);
    if (!isLoggedIn) {
      setIsAuthOpen(true);
    }
  };

  const handleProceedBooking = () => {
    if (!selectedTrip || !selectedSeat) return;
    if (!isLoggedIn) {
      setIsAuthOpen(true);
      return;
    }
    router.push(`/passenger/trips/${selectedTrip.id}?seat=${selectedSeat.seatNumber}`);
  };

  async function handleLoginSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsAuthLoading(true);
    setAuthError(null);

    const formData = new FormData(e.currentTarget);
    const emailOrPhone = formData.get("emailOrPhone") as string;
    const password = formData.get("password") as string;

    try {
      const res = await fetch("/api/auth/login-json", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailOrPhone, password }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsAuthOpen(false);
        if (selectedTrip && selectedSeat) {
          router.push(`/passenger/trips/${selectedTrip.id}?seat=${selectedSeat.seatNumber}`);
        } else {
          router.push(data.redirectUrl || "/passenger/dashboard");
        }
      } else {
        setAuthError(data.error || "Invalid credentials. Please try again.");
      }
    } catch {
      setAuthError("Network error. Please try again.");
    } finally {
      setIsAuthLoading(false);
    }
  }

  async function handleRegisterSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsAuthLoading(true);
    setAuthError(null);

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const phone = formData.get("phone") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      const res = await fetch("/api/auth/register-json", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, email, password, role: "CUSTOMER" }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsAuthOpen(false);
        if (selectedTrip && selectedSeat) {
          router.push(`/passenger/trips/${selectedTrip.id}?seat=${selectedSeat.seatNumber}`);
        } else {
          router.push("/passenger/dashboard");
        }
      } else {
        setAuthError(data.error || "Registration failed.");
      }
    } catch {
      setAuthError("Network error. Please try again.");
    } finally {
      setIsAuthLoading(false);
    }
  }

  const selectedSourceName = locations.find((l) => l.id === sourceId)?.name || "All Origins";
  const selectedDestName = locations.find((l) => l.id === destId)?.name || "All Destinations";

  const filteredLocationsSource = locations.filter((l) =>
    l.name.toLowerCase().includes(sourceSearch.toLowerCase())
  );
  const filteredLocationsDest = locations.filter((l) =>
    l.name.toLowerCase().includes(destSearch.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Outer Glassmorphism Search Deck */}
      <div className="relative rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 glass-panel border border-amber-500/20 bg-slate-950/80 backdrop-blur-2xl">
        {/* Subtle Top Glowing Edge */}
        <div className="absolute top-0 inset-x-8 h-[1px] bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />

        {/* Widget Header & Concurrency Badge */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[11px] font-bold mb-1 shadow-inner">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <span>Express Shuttle Concurrency Deck</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              Find &amp; Lock Your Express Seat
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-1.5 rounded-xl flex items-center gap-2 shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              Atomic Concurrency Active
            </span>
          </div>
        </div>

        {/* 3-Column Search Controls with Location Swap */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          {/* Departure City Dropdown */}
          <div className="md:col-span-4 space-y-2 relative" ref={sourceRef}>
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-amber-400" /> Departure City (From)
            </label>
            <button
              type="button"
              onClick={() => {
                setSourceOpen(!sourceOpen);
                setDestOpen(false);
              }}
              className="w-full px-4 py-3.5 bg-slate-900/90 border border-slate-800 hover:border-amber-500/40 rounded-xl text-xs font-bold text-white flex items-center justify-between transition-all text-left shadow-inner focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            >
              <span className="truncate">{selectedSourceName}</span>
              <ChevronDown className="h-4 w-4 text-slate-400 shrink-0 ml-2" />
            </button>

            {sourceOpen && (
              <div role="listbox" aria-label="Departure city options" className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-700/80 rounded-2xl p-3 shadow-2xl z-40 space-y-2 backdrop-blur-xl">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={sourceSearch}
                    onChange={(e) => setSourceSearch(e.target.value)}
                    placeholder="Search origin city..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-semibold text-white outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                  <button
                    role="option"
                    aria-selected={sourceId === ""}
                    type="button"
                    onClick={() => {
                      setSourceId("");
                      setSourceOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between cursor-pointer transition-colors ${
                      sourceId === "" ? "bg-amber-500 text-slate-950 font-black shadow-md" : "text-slate-300 hover:bg-slate-800/80"
                    }`}
                  >
                    <span>All Origins</span>
                    {sourceId === "" && <Check className="h-3.5 w-3.5" />}
                  </button>
                  {filteredLocationsSource.map((l) => (
                    <button
                      role="option"
                      aria-selected={sourceId === l.id}
                      key={l.id}
                      type="button"
                      onClick={() => {
                        setSourceId(l.id);
                        setSourceOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between cursor-pointer transition-colors ${
                        sourceId === l.id ? "bg-amber-500 text-slate-950 font-black shadow-md" : "text-slate-300 hover:bg-slate-800/80"
                      }`}
                    >
                      <span>{l.name}</span>
                      {sourceId === l.id && <Check className="h-3.5 w-3.5" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Quick Swap Button */}
          <div className="hidden md:flex md:col-span-1 justify-center items-center pb-1">
            <button
              type="button"
              onClick={handleSwapLocations}
              title="Swap From and To"
              className="p-3 bg-slate-900 border border-slate-800 hover:border-amber-500/50 hover:bg-slate-800 text-amber-400 rounded-xl transition-all shadow-md group cursor-pointer"
            >
              <ArrowLeftRight className="h-4 w-4 group-hover:rotate-180 transition-transform duration-300" />
            </button>
          </div>

          {/* Destination City Dropdown */}
          <div className="md:col-span-4 space-y-2 relative" ref={destRef}>
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Navigation className="h-3.5 w-3.5 text-amber-400" /> Destination City (To)
            </label>
            <button
              type="button"
              onClick={() => {
                setDestOpen(!destOpen);
                setSourceOpen(false);
              }}
              className="w-full px-4 py-3.5 bg-slate-900/90 border border-slate-800 hover:border-amber-500/40 rounded-xl text-xs font-bold text-white flex items-center justify-between transition-all text-left shadow-inner focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            >
              <span className="truncate">{selectedDestName}</span>
              <ChevronDown className="h-4 w-4 text-slate-400 shrink-0 ml-2" />
            </button>

            {destOpen && (
              <div role="listbox" aria-label="Destination city options" className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-700/80 rounded-2xl p-3 shadow-2xl z-40 space-y-2 backdrop-blur-xl">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={destSearch}
                    onChange={(e) => setDestSearch(e.target.value)}
                    placeholder="Search destination..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-semibold text-white outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                  <button
                    role="option"
                    aria-selected={destId === ""}
                    type="button"
                    onClick={() => {
                      setDestId("");
                      setDestOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between cursor-pointer transition-colors ${
                      destId === "" ? "bg-amber-500 text-slate-950 font-black shadow-md" : "text-slate-300 hover:bg-slate-800/80"
                    }`}
                  >
                    <span>All Destinations</span>
                    {destId === "" && <Check className="h-3.5 w-3.5" />}
                  </button>
                  {filteredLocationsDest.map((l) => (
                    <button
                      role="option"
                      aria-selected={destId === l.id}
                      key={l.id}
                      type="button"
                      onClick={() => {
                        setDestId(l.id);
                        setDestOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between cursor-pointer transition-colors ${
                        destId === l.id ? "bg-amber-500 text-slate-950 font-black shadow-md" : "text-slate-300 hover:bg-slate-800/80"
                      }`}
                    >
                      <span>{l.name}</span>
                      {destId === l.id && <Check className="h-3.5 w-3.5" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Travel Date Selector & Quick Chips */}
          <div className="md:col-span-3 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-amber-400" /> Travel Date
              </label>
              {travelDate && (
                <button
                  type="button"
                  onClick={() => setTravelDate("")}
                  className="text-[10px] text-amber-400 hover:underline font-semibold cursor-pointer"
                >
                  Clear Date
                </button>
              )}
            </div>
            <input
              type="date"
              min={todayStr}
              value={travelDate}
              onChange={(e) => setTravelDate(e.target.value)}
              className="w-full px-3.5 py-3 bg-slate-900/90 border border-slate-800 rounded-xl text-xs font-bold text-white outline-none focus:ring-2 focus:ring-amber-500/50 shadow-inner"
            />
          </div>
        </div>

        {/* Date Quick Select & Search Action Bar */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-800/60">
          <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
            <span className="text-[11px] font-bold text-slate-400 mr-1">Quick Date:</span>
            <button
              type="button"
              onClick={() => setTravelDate(todayStr)}
              className={`px-3 py-1.5 text-[11px] font-extrabold rounded-lg border transition-all cursor-pointer ${
                travelDate === todayStr ? "bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20" : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setTravelDate(tomorrowStr)}
              className={`px-3 py-1.5 text-[11px] font-extrabold rounded-lg border transition-all cursor-pointer ${
                travelDate === tomorrowStr ? "bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20" : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              Tomorrow
            </button>
            <button
              type="button"
              onClick={() => setTravelDate("")}
              className={`px-3 py-1.5 text-[11px] font-extrabold rounded-lg border transition-all cursor-pointer ${
                travelDate === "" ? "bg-amber-500/20 text-amber-400 border-amber-500/40" : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              All Departures
            </button>
          </div>

          <button
            type="button"
            onClick={handleExecuteSearch}
            disabled={isSearching}
            className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
          >
            <Search className="h-4 w-4 stroke-[2.5]" />
            {isSearching ? "Searching Corridor..." : "Search Available Shuttles"}
          </button>
        </div>

        {/* Departure Cards Stream */}
        <div className="space-y-4 pt-4 border-t border-slate-800/80">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Bus className="h-4 w-4 text-amber-400" />
              {hasExecutedSearch
                ? `Matching Express Shuttles (${searchResults.length})`
                : `Upcoming Express Departures (${searchResults.length})`}
            </h3>
            <Link
              href="/passenger/discover"
              className="text-xs font-extrabold text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1.5 group"
            >
              <span>Explore All Shuttles</span>
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {searchError && (
            <div role="alert" className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2.5">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{searchError}</span>
            </div>
          )}

          {searchResults.length === 0 ? (
            <div className="p-10 text-center text-slate-500 bg-slate-900/60 rounded-3xl border border-slate-800/80 space-y-3">
              <Route className="h-10 w-10 mx-auto text-amber-500/40" />
              <p className="text-sm font-extrabold text-white">No active shuttles found for this route filter</p>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                Try clearing your origin/destination filter or selecting &quot;All Departures&quot; to see upcoming runs.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {searchResults.map((trip) => {
                const availableSeats = trip.seats.filter((seat) => seat.status === "AVAILABLE").length;
                const totalSeats = trip.seats.length || 16;
                const occupancyPercent = Math.round(((totalSeats - availableSeats) / totalSeats) * 100);
                const lowestFare = trip.seats.length > 0 ? Math.min(...trip.seats.map((seat) => Number(seat.price))) : 350;
                const isSelected = selectedTrip?.id === trip.id;

                const formattedTime = new Date(trip.startTime).toLocaleString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                });
                const formattedDate = new Date(trip.startTime).toLocaleString("en-IN", {
                  month: "short",
                  day: "numeric",
                });

                return (
                  <button
                    key={trip.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => {
                      setSelectedTrip(trip);
                      setSelectedSeat(null);
                    }}
                    className={`w-full rounded-2xl border p-5 text-left transition-all relative overflow-hidden focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer ${
                      isSelected
                        ? "border-amber-500 bg-amber-500/10 shadow-xl shadow-amber-500/10 ring-1 ring-amber-500/30"
                        : "border-slate-800/80 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900/90"
                    }`}
                  >
                    {/* Top Fare Pill */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-amber-400" />
                          <h4 className="text-xs font-black text-white tracking-tight">{trip.source.name} → {trip.destination.name}</h4>
                        </div>
                        <p className="text-[11px] font-semibold text-slate-400 mt-1 flex items-center gap-1">
                          <Clock className="h-3 w-3 text-slate-400" /> {formattedTime} ({formattedDate})
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block font-semibold">From</span>
                        <span className="text-sm font-black text-amber-400">₹{lowestFare}</span>
                      </div>
                    </div>

                    {/* Seat Occupancy Progress Bar */}
                    <div className="space-y-1.5 pt-2 border-t border-slate-800/60">
                      <div className="flex justify-between items-center text-[10px] font-bold">
                        <span className="text-slate-400">Availability</span>
                        <span className={availableSeats <= 3 ? "text-rose-400" : "text-emerald-400"}>
                          {availableSeats} seats left
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            availableSeats <= 3 ? "bg-rose-500" : "bg-gradient-to-r from-amber-500 to-emerald-400"
                          }`}
                          style={{ width: `${occupancyPercent}%` }}
                        />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Realistic Interactive 3D Shuttle Cabin Layout */}
        {selectedTrip && (
          <div className="pt-8 border-t border-slate-800/80 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-extrabold text-amber-400 uppercase tracking-widest flex items-center gap-1.5 mb-1">
                  <Armchair className="h-3.5 w-3.5" /> Interactive Shuttle Deck Layout
                </span>
                <h4 className="text-base font-extrabold text-white">
                  {selectedTrip.source.name} → {selectedTrip.destination.name} Shuttle Deck
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Click an available seat to lock it. Server transaction guarantees zero double-booking.
                </p>
              </div>

              {selectedSeat ? (
                <button
                  type="button"
                  onClick={handleProceedBooking}
                  className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs rounded-xl shadow-xl shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer scale-105"
                >
                  <Zap className="h-4 w-4 fill-current" />
                  <span>Reserve Seat {selectedSeat.seatNumber} (₹{Number(selectedSeat.price)})</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <div className="text-xs font-semibold text-slate-400 bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-amber-400" />
                  Select seat to continue
                </div>
              )}
            </div>

            {/* Shuttle Vehicle Body Outline */}
            <div className="shuttle-chassis rounded-3xl p-6 md:p-8 space-y-6 relative overflow-hidden">
              {/* Cockpit & Windshield Header */}
              <div className="flex items-center justify-between pb-6 border-b border-slate-800/80 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 text-amber-400 flex items-center justify-center font-black">
                    <Bus className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-white uppercase tracking-wider block">Driver Cockpit</span>
                    <span className="text-[10px] text-slate-400 font-semibold">Front Windshield &amp; Navigation Deck</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-400 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
                  <span className="w-2 h-2 rounded-full bg-slate-600" /> Driver Seat (Occupied)
                </div>
              </div>

              {/* Passenger Seat Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4 max-w-3xl mx-auto">
                {selectedTrip.seats.map((seat) => {
                  const isAvail = seat.status === "AVAILABLE";
                  const isChosen = selectedSeat?.id === seat.id;

                  return (
                    <button
                      type="button"
                      key={seat.id}
                      disabled={!isAvail}
                      aria-label={`Seat ${seat.seatNumber}, ${isChosen ? "selected" : isAvail ? `available for ₹${Number(seat.price)}` : "unavailable"}`}
                      aria-pressed={isChosen}
                      onClick={() => handleSeatClick(seat)}
                      className={`seat-grid-item p-4 rounded-2xl border text-center relative focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer ${
                        isChosen
                          ? "bg-gradient-to-tr from-amber-500 via-amber-400 to-amber-600 border-amber-300 text-slate-950 font-black shadow-xl shadow-amber-500/30 scale-105 seat-selected-pulse"
                          : isAvail
                          ? "bg-slate-900/90 border-slate-700/80 hover:border-amber-500/50 hover:bg-slate-800 text-slate-200"
                          : "bg-slate-950/80 border-slate-800 text-slate-600 opacity-60 cursor-not-allowed"
                      }`}
                    >
                      {/* Top Seat Tag */}
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-xs font-mono font-black ${isChosen ? "text-slate-950" : "text-amber-400"}`}>
                          {seat.seatNumber}
                        </span>
                        <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${
                          isChosen ? "bg-slate-950/20 text-slate-950" : "bg-slate-800 text-slate-400"
                        }`}>
                          {seat.seatType}
                        </span>
                      </div>

                      {/* Armchair Icon */}
                      <Armchair className={`h-6 w-6 mx-auto my-1 ${isChosen ? "text-slate-950 stroke-[2.5]" : isAvail ? "text-slate-300" : "text-slate-600"}`} />

                      {/* Status / Price Badge */}
                      <div className={`text-[11px] font-black mt-2 pt-1 border-t ${
                        isChosen
                          ? "border-slate-950/20 text-slate-950"
                          : isAvail
                          ? "border-slate-800 text-emerald-400"
                          : "border-slate-900 text-slate-600"
                      }`}>
                        {isChosen ? "SELECTED" : isAvail ? `₹${Number(seat.price)}` : "LOCKED"}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Shuttle Legend & Aisle Indicator */}
              <div className="pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4 text-xs font-bold text-slate-400">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-md bg-slate-900 border border-slate-700 inline-block" /> Available (Emerald Fare)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-md bg-amber-500 border border-amber-400 inline-block" /> Selected
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-md bg-slate-950 border border-slate-800 opacity-60 inline-block" /> Booked / Locked
                  </span>
                </div>

                <span className="text-[11px] text-slate-500 font-mono">Center Aisle • Premium AC Luxury Shuttle</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Auth Modal (Login / Register) */}
      {isAuthOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl relative space-y-6">
            <button
              onClick={() => setIsAuthOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="text-center">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-3">
                <Lock className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-extrabold text-white">Sign In to Complete Reservation</h3>
              <p className="text-xs text-slate-400 mt-1">
                {selectedSeat ? `Locking Seat ${selectedSeat.seatNumber} on GoShuttles Express` : "Access your passenger portal"}
              </p>
            </div>

            <div className="flex bg-slate-950 p-1.5 rounded-xl border border-slate-800">
              <button
                onClick={() => { setAuthTab("login"); setAuthError(null); }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  authTab === "login" ? "bg-amber-500 text-slate-950 shadow-md font-black" : "text-slate-400 hover:text-white"
                }`}
              >
                Log In
              </button>
              <button
                onClick={() => { setAuthTab("register"); setAuthError(null); }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  authTab === "register" ? "bg-amber-500 text-slate-950 shadow-md font-black" : "text-slate-400 hover:text-white"
                }`}
              >
                New Passenger Sign-Up
              </button>
            </div>

            {authError && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            {authTab === "login" ? (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Email or Mobile Number</label>
                  <input
                    type="text"
                    name="emailOrPhone"
                    required
                    placeholder="Enter phone or email"
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Password</label>
                  <input
                    type="password"
                    name="password"
                    required
                    placeholder="••••••••"
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isAuthLoading}
                  className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl transition-all shadow-lg shadow-amber-500/10 cursor-pointer"
                >
                  {isAuthLoading ? "Authenticating..." : "Sign In & Complete Booking"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Full Name</label>
                  <input
                    type="text"
                    name="name"
                    required
                    placeholder="e.g. Rahul Sharma"
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300">Phone Number</label>
                    <input
                      type="tel"
                      name="phone"
                      required
                      placeholder="9876543210"
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none focus:ring-2 focus:ring-amber-500/50"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300">Email Address</label>
                    <input
                      type="email"
                      name="email"
                      required
                      placeholder="rahul@example.com"
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none focus:ring-2 focus:ring-amber-500/50"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Create Password</label>
                  <input
                    type="password"
                    name="password"
                    required
                    placeholder="••••••••"
                    minLength={6}
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isAuthLoading}
                  className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl transition-all shadow-lg shadow-amber-500/10 cursor-pointer"
                >
                  {isAuthLoading ? "Creating Account..." : "Register & Reserve Seat"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
