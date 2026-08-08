import { auth } from "@/auth";
import { db } from "@/lib/db";
import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/home/public-footer";
import { StepBookingWizard, type RideSummary } from "@/components/home/step-booking-wizard";
import { 
  CheckCircle2, 
  Zap, 
  Sparkles, 
  HelpCircle, 
  ChevronRight,
  Award,
  ShieldCheck,
  MapPin,
  Clock3,
  Armchair,
  Check,
  Navigation
} from "lucide-react";
import { buttonVariants } from "@/components/ui";
import Link from "next/link";

export const dynamic = "force-dynamic";

function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default async function HomePage() {
  const session = await auth().catch(() => null);
  const now = new Date();
  const today = getLocalDateString(now);
  const tomorrowDate = new Date(now);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrow = getLocalDateString(tomorrowDate);
  
  const [locationsRaw, upcomingTripsRaw] = await Promise.all([
    db.location.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }).catch(() => []),
    db.trip.findMany({
      where: {
        status: "SCHEDULED",
        startTime: { gt: now },
        manifestLocked: false,
        isCancelled: false,
        driverId: { not: null },
        vehicle: { is: { isActive: true } },
        seats: { some: { status: "AVAILABLE" } },
      },
      include: {
        source: { select: { id: true, name: true } },
        destination: { select: { id: true, name: true } },
        seats: { select: { id: true, seatNumber: true, seatType: true, price: true, status: true } },
      },
      orderBy: { startTime: "asc" },
      take: 8,
    }).catch(() => []),
  ]);

  const locations = locationsRaw.length > 0 ? locationsRaw : [
    { id: "loc-lkn", name: "Lucknow" },
    { id: "loc-ayd", name: "Ayodhya" },
    { id: "loc-vns", name: "Varanasi" },
    { id: "loc-gkp", name: "Gorakhpur" },
  ];
  const upcomingTrips = upcomingTripsRaw;

  const initialRides: RideSummary[] = upcomingTrips.map((trip) => {
    const prices = trip.seats.map((seat) => Number(seat.price)).filter(Number.isFinite);
    return {
      id: trip.id,
      startTime: trip.startTime.toISOString(),
      source: trip.source,
      destination: trip.destination,
      availableSeats: trip.seats.filter((seat) => seat.status === "AVAILABLE").length,
      totalSeats: trip.seats.length,
      lowestFare: prices.length ? Math.min(...prices) : 300,
      seats: trip.seats.map((s) => ({ ...s, price: Number(s.price) })),
    };
  });

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] selection:bg-amber-500 selection:text-slate-950 font-sans transition-colors duration-200">
      {/* Sleek Public Header */}
      <PublicHeader />
      
      <main className="relative overflow-hidden">
        {/* Ambient Glow Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[550px] bg-gradient-to-tr from-amber-500/15 via-orange-600/10 to-indigo-600/5 blur-[180px] pointer-events-none rounded-full" />
        <div className="absolute top-[800px] right-0 w-[500px] h-[500px] bg-amber-500/5 blur-[160px] pointer-events-none rounded-full" />

        {/* 1. Hero Block + Step Booking Wizard */}
        <section className="relative z-10 pt-8 pb-16 px-4 sm:px-6 lg:px-8 border-b border-[var(--border)]">
          <div className="mx-auto max-w-7xl space-y-8">
            {/* Hero Value Statement */}
            <div className="text-center max-w-3xl mx-auto space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1 text-xs font-bold text-amber-500 backdrop-blur-md">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Next-Gen Daily Intercity Mobility</span>
              </div>

              <h1 className="text-4xl font-black tracking-tight sm:text-6xl text-[var(--foreground)] leading-tight">
                Intercity Travel,{" "}
                <span className="bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 bg-clip-text text-transparent">
                  Re-Imagined.
                </span>
              </h1>

              <p className="text-sm sm:text-base text-[var(--muted-foreground)] leading-relaxed max-w-2xl mx-auto font-normal">
                Reserve guaranteed executive seats with 5-minute atomic locks, millisecond GPS telemetry, transparent fares, and instant digital QR boarding.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 pt-2 text-xs text-[var(--muted-foreground)]">
                <div className="flex items-center gap-1.5 font-bold text-[var(--foreground)] bg-[var(--card)] px-3.5 py-1.5 rounded-full border border-[var(--border)] shadow-sm">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>99.8% On-Time Dispatches</span>
                </div>
                <div className="flex items-center gap-1.5 font-bold text-[var(--foreground)] bg-[var(--card)] px-3.5 py-1.5 rounded-full border border-[var(--border)] shadow-sm">
                  <Zap className="h-4 w-4 text-amber-500" />
                  <span>Atomic 5-Min Locks</span>
                </div>
                <div className="flex items-center gap-1.5 font-bold text-[var(--foreground)] bg-[var(--card)] px-3.5 py-1.5 rounded-full border border-[var(--border)] shadow-sm">
                  <Award className="h-4 w-4 text-indigo-500" />
                  <span>4.92★ Fleet Rating</span>
                </div>
              </div>
            </div>

            {/* Step Booking Wizard Widget */}
            <div id="booking-wizard">
              <StepBookingWizard
                locations={locations}
                initialRides={initialRides}
                isLoggedIn={Boolean(session?.user?.id)}
                today={today}
                tomorrow={tomorrow}
              />
            </div>
          </div>
        </section>

        {/* 3. How It Works Flow */}
        <section id="how-it-works" className="py-16 px-4 sm:px-6 lg:px-8 border-b border-[var(--border)]">
          <div className="mx-auto max-w-7xl space-y-12">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">Simple &amp; Seamless</span>
              <h2 className="text-3xl font-black text-[var(--foreground)]">How GoShuttles Works</h2>
              <p className="text-xs sm:text-sm text-[var(--muted-foreground)]">3 effortless steps to secure your executive intercity seat.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 rounded-3xl bg-[var(--card)] border border-[var(--border)] space-y-3 shadow-lg">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 flex items-center justify-center font-black text-sm">
                  01
                </div>
                <h3 className="text-base font-extrabold text-[var(--foreground)]">Select Route &amp; Time</h3>
                <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                  Choose your departure terminal and travel window between Lucknow, Ayodhya, Varanasi, and Gorakhpur.
                </p>
              </div>

              <div className="p-6 rounded-3xl bg-[var(--card)] border border-[var(--border)] space-y-3 shadow-lg">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 flex items-center justify-center font-black text-sm">
                  02
                </div>
                <h3 className="text-base font-extrabold text-[var(--foreground)]">Atomic Seat Lock</h3>
                <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                  Pick your favorite seat on our 3D SUV cabin map. Our atomic lock holds it exclusively for 5 minutes.
                </p>
              </div>

              <div className="p-6 rounded-3xl bg-[var(--card)] border border-[var(--border)] space-y-3 shadow-lg">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-500 flex items-center justify-center font-black text-sm">
                  03
                </div>
                <h3 className="text-base font-extrabold text-[var(--foreground)]">QR Boarding &amp; Live Track</h3>
                <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                  Receive an instant QR boarding pass and track your assigned shuttle live in real-time.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 4. FAQ Section */}
        <section id="faq" className="py-16 px-4 sm:px-6 lg:px-8 border-b border-[var(--border)] bg-[var(--muted)]/40">
          <div className="mx-auto max-w-4xl space-y-8">
            <div className="text-center space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">Got Questions?</span>
              <h2 className="text-3xl font-black text-[var(--foreground)]">Frequently Asked Questions</h2>
            </div>

            <div className="space-y-3">
              <FaqItem
                question="How does the 5-minute atomic seat lock guarantee work?"
                answer="When you select a seat, our database atomically locks it for 5 minutes exclusively for your transaction. No double bookings are mathematically possible during this window."
              />
              <FaqItem
                question="Can I pay cash to the driver at boarding?"
                answer="Yes! We accept both Cash on Boarding and Instant Online Payments (UPI / QR Code). Cash bookings hold your seat as confirmed, and tickets are issued upon pickup."
              />
              <FaqItem
                question="What happens if a shuttle trip is delayed or cancelled?"
                answer="In the rare event of a cancellation or delay, our system sends immediate automated notifications to your passenger dashboard and bell updates, with 100% refund processing."
              />
              <FaqItem
                question="Where can I track my assigned shuttle driver?"
                answer="Once your trip departure approaches, tap 'Track Shuttle' on your passenger dashboard to view real-time GPS telemetry updates directly on the map."
              />
            </div>
          </div>
        </section>

        {/* 5. CTA Section */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 text-center">
          <div className="mx-auto max-w-3xl p-8 sm:p-12 rounded-3xl bg-[var(--card)] border border-amber-500/30 shadow-2xl space-y-4">
            <h2 className="text-2xl sm:text-4xl font-black text-[var(--foreground)]">Ready to Experience Modern Shuttle Travel?</h2>
            <p className="text-xs sm:text-sm text-[var(--muted-foreground)] max-w-xl mx-auto">
              Join thousands of daily passengers commuting with guaranteed seats and live tracking.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link 
                href="/register" 
                className={`${buttonVariants({ size: "sm" })} bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-6 h-10 rounded-xl shadow-md flex items-center gap-1.5 text-xs transition-transform active:scale-95`}
              >
                <span>Register Account Free</span>
                <ChevronRight className="h-4 w-4" />
              </Link>
              <Link 
                href="/login" 
                className={`${buttonVariants({ variant: "outline", size: "sm" })} border-[var(--border)] bg-[var(--muted)] hover:bg-[var(--card)] text-[var(--foreground)] h-10 rounded-xl text-xs font-semibold`}
              >
                Sign In
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <PublicFooter />
    </div>
  );
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  return (
    <details className="group rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 transition-all hover:border-amber-500/30 [&_summary::-webkit-details-marker]:hidden">
      <summary className="flex cursor-pointer items-center justify-between font-bold text-[var(--foreground)] text-xs sm:text-sm">
        <span>{question}</span>
        <span className="ml-3 shrink-0 text-[var(--muted-foreground)] group-open:-rotate-180 transition-transform">
          ↓
        </span>
      </summary>
      <p className="mt-2.5 text-xs text-[var(--muted-foreground)] leading-relaxed border-t border-[var(--border)] pt-2.5">
        {answer}
      </p>
    </details>
  );
}
