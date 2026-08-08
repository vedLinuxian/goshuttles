"use client";

import Link from "next/link";
import { ArrowRight, Clock3, Users } from "lucide-react";
import { buttonVariants, Card } from "@/components/ui";

export type RideSummary = {
  id: string;
  startTime: string;
  source: { name: string };
  destination: { name: string };
  availableSeats: number;
  totalSeats: number;
  lowestFare: number;
};

function formatDeparture(value: string) {
  return new Date(value).toLocaleString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function PublicRideResults({ rides, isLoggedIn }: { rides: RideSummary[]; isLoggedIn: boolean }) {
  if (rides.length === 0) {
    return (
      <Card variant="glass" className="border-dashed p-8 text-center">
        <p className="text-base font-semibold text-[var(--foreground)]">No rides match those choices</p>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">Try another date, route, or departure window.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3" aria-live="polite">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-[var(--foreground)]">Available departures</p>
        <span className="text-xs text-[var(--muted-foreground)]">{rides.length} shown</span>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {rides.map((ride) => {
          const bookingPath = `/passenger/trips/${ride.id}`;
          const href = isLoggedIn ? bookingPath : `/login?callbackUrl=${encodeURIComponent(bookingPath)}`;
          return (
            <Card key={ride.id} variant="glass" className="group p-4 transition-transform hover:-translate-y-0.5 sm:p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="truncate text-base font-bold text-[var(--foreground)]">{ride.source.name} <span className="text-amber-500">→</span> {ride.destination.name}</p>
                  <p className="mt-2 flex items-center gap-2 text-sm text-[var(--muted-foreground)]"><Clock3 className="h-4 w-4 text-amber-500" /> {formatDeparture(ride.startTime)}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs text-[var(--muted-foreground)]">from</p>
                  <p className="text-lg font-black text-[var(--foreground)]">₹{ride.lowestFare.toLocaleString("en-IN")}</p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between gap-3 border-t border-[var(--border)] pt-3">
                <span className="flex items-center gap-1.5 text-xs font-medium text-[var(--muted-foreground)]"><Users className="h-4 w-4" /> {ride.availableSeats} of {ride.totalSeats} seats open</span>
                <Link href={href} className={buttonVariants({ size: "sm" })}>View seats <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
