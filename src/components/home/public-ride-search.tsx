"use client";

import { useState } from "react";
import { ArrowLeftRight, CalendarDays, MapPin, Search, Users } from "lucide-react";
import { Alert, AlertDescription, Button, Card, Input, Label, Select } from "@/components/ui";
import { PublicRideResults, type RideSummary } from "./public-ride-results";

type Location = { id: string; name: string };

type ApiRide = {
  id: string;
  startTime: string;
  source: { name: string };
  destination: { name: string };
  seats: Array<{ price: number; status: string }>;
  availableSeats?: number;
  totalSeats?: number;
};

export function PublicRideSearch({ locations, initialRides, isLoggedIn, today, tomorrow }: { locations: Location[]; initialRides: RideSummary[]; isLoggedIn: boolean; today: string; tomorrow: string }) {
  const [sourceId, setSourceId] = useState("");
  const [destinationId, setDestinationId] = useState("");
  const [date, setDate] = useState("");
  const [passengers, setPassengers] = useState("1");
  const [window, setWindow] = useState("ANY");
  const [rides, setRides] = useState<RideSummary[]>(initialRides);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const selectedSource = locations.find((location) => location.id === sourceId)?.name;
  const selectedDestination = locations.find((location) => location.id === destinationId)?.name;

  const filteredRides = rides;

  const swap = () => {
    setSourceId(destinationId);
    setDestinationId(sourceId);
  };

  async function searchRides(event?: React.SyntheticEvent) {
    if (event) event.preventDefault();
    setLoading(true);
    setError(null);
    setSearched(true);
    try {
      const params = new URLSearchParams({
        page: "1",
        limit: "20",
        passengers: String(Math.min(6, Math.max(1, Number(passengers) || 1))),
      });
      if (sourceId) params.set("source", sourceId);
      if (destinationId) params.set("destination", destinationId);
      if (date) params.set("date", date);
      params.set("window", window);
      const response = await fetch(`/api/trips?${params.toString()}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "We could not load departures.");
      const nextRides = (payload.data as ApiRide[]).map((ride) => {
        const availableSeats = ride.availableSeats ?? ride.seats.filter((seat) => seat.status === "AVAILABLE").length;
        const totalSeats = ride.totalSeats ?? ride.seats.length;
        const prices = ride.seats.map((seat) => Number(seat.price)).filter(Number.isFinite);
        return { id: ride.id, startTime: ride.startTime, source: ride.source, destination: ride.destination, availableSeats, totalSeats, lowestFare: prices.length ? Math.min(...prices) : 0 };
      });
      setRides(nextRides);
    } catch (searchError) {
      setRides([]);
      setError(searchError instanceof Error ? searchError.message : "We could not load departures.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <Card id="search" variant="glass" className="border-amber-500/25 p-4 shadow-lg sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-600 dark:text-amber-400">Find a ride</p><h2 className="mt-1 text-xl font-black text-[var(--foreground)] sm:text-2xl">Where are you going?</h2><p className="mt-1 text-sm text-[var(--muted-foreground)]">Compare real departures, fares, and open seats.</p></div>
          <MapPin className="hidden h-7 w-7 text-amber-500 sm:block" aria-hidden="true" />
        </div>
        <form onSubmit={searchRides} className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr] md:items-end">
            <div className="space-y-2"><Label htmlFor="public-source">From</Label><Select id="public-source" value={sourceId} onChange={(event) => setSourceId(event.target.value)}><option value="">Choose origin</option>{locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</Select></div>
            <Button type="button" variant="outline" size="icon" onClick={swap} aria-label="Swap origin and destination"><ArrowLeftRight className="h-4 w-4" /></Button>
            <div className="space-y-2"><Label htmlFor="public-destination">To</Label><Select id="public-destination" value={destinationId} onChange={(event) => setDestinationId(event.target.value)}><option value="">Choose destination</option>{locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</Select></div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.2fr_0.8fr_1fr_auto] lg:items-end">
            <div className="space-y-2"><Label htmlFor="public-date">Travel date</Label><div className="relative"><CalendarDays className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-[var(--muted-foreground)]" /><Input id="public-date" type="date" min={today} value={date} onChange={(event) => setDate(event.target.value)} onBlur={(event) => setDate(event.target.value)} className="pl-10" /></div></div>
            <div className="space-y-2"><Label htmlFor="public-passengers">Passengers</Label><div className="relative"><Users className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-[var(--muted-foreground)]" /><Input id="public-passengers" type="number" min="1" max="6" value={passengers} onChange={(event) => setPassengers(event.target.value)} className="pl-10" /></div></div>
            <div className="space-y-2"><Label htmlFor="public-window">Departure window</Label><Select id="public-window" value={window} onChange={(event) => setWindow(event.target.value)}><option value="ANY">Any time</option><option value="MORNING">Morning</option><option value="AFTERNOON">Afternoon</option><option value="EVENING">Evening</option></Select></div>
            <Button type="submit" disabled={loading} onClick={searchRides} className="min-h-11 gap-2"><Search className="h-4 w-4" />{loading ? "Searching" : "Search rides"}</Button>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs"><span className="mr-1 text-[var(--muted-foreground)]">Quick date</span><button type="button" onClick={() => setDate(today)} className="rounded-lg border border-[var(--border)] px-3 py-2 font-medium text-[var(--foreground)] hover:bg-[var(--muted)]">Today</button><button type="button" onClick={() => setDate(tomorrow)} className="rounded-lg border border-[var(--border)] px-3 py-2 font-medium text-[var(--foreground)] hover:bg-[var(--muted)]">Tomorrow</button><button type="button" onClick={() => setDate("")} className="rounded-lg border border-[var(--border)] px-3 py-2 font-medium text-[var(--foreground)] hover:bg-[var(--muted)]">Any date</button></div>
        </form>
        {(selectedSource || selectedDestination) && <p className="mt-4 text-xs text-[var(--muted-foreground)]">Searching {selectedSource || "anywhere"} to {selectedDestination || "anywhere"} for {passengers} passenger{Number(passengers) === 1 ? "" : "s"}.</p>}
      </Card>
      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
      <div id="results">{(searched || initialRides.length > 0) && <PublicRideResults rides={filteredRides} isLoggedIn={isLoggedIn} />}</div>
    </div>
  );
}
