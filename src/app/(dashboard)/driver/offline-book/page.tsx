import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { offlineBook } from "@/lib/booking-service";
import { offlineBookSchema } from "@/lib/validators";
import { revalidatePath } from "next/cache";
import { Ticket, User, Phone, CheckCircle2 } from "lucide-react";
import { Card, Button, Input, Select, Label } from "@/components/ui";

export default async function OfflineBookPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "DRIVER") redirect("/login");

  const trips = await db.trip.findMany({
    where: { driverId: session.user.id, status: "SCHEDULED", startTime: { gt: new Date() }, manifestLocked: false, isCancelled: false },
    include: { source: true, destination: true },
    orderBy: { startTime: "asc" },
  });

  return (
    <div className="max-w-lg mx-auto space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <Ticket className="h-6 w-6 text-amber-400" />
          Offline Counter Booking
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Issue walk-in passenger tickets directly to active shuttle trips.
        </p>
      </div>

      <Card variant="glass" className="p-8 border-slate-800 shadow-2xl space-y-5 glow-amber">
        <form
          action={async (formData: FormData) => {
            "use server";
            const session = await auth();
            if (!session?.user?.id || session.user.role !== "DRIVER") redirect("/login");
            const raw = {
              tripId: formData.get("tripId") as string,
              seatNumber: (formData.get("seatNumber") as string) || undefined,
              guestName: formData.get("name") as string,
              guestPhone: formData.get("phone") as string,
              paymentCollected: formData.get("paymentCollected") === "yes",
            };
            const parsed = offlineBookSchema.safeParse(raw);
            if (!parsed.success) {
              throw new Error(parsed.error.issues.map((i) => i.message).join(", "));
            }
            const { tripId, seatNumber, guestName, guestPhone, paymentCollected } = parsed.data;
            await offlineBook(session.user.id, tripId, seatNumber, guestPhone, guestName, paymentCollected);
            revalidatePath("/driver/offline-book");
            redirect("/driver/dashboard");
          }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="tripId">Active Trip Manifest</Label>
            <Select id="tripId" name="tripId" required>
              <option value="">Select upcoming scheduled trip</option>
              {trips.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.source.name} → {t.destination.name} (
                  {new Date(t.startTime).toLocaleDateString("en-IN", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  )
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="seatNumber">Seat Number (Optional)</Label>
            <Input
              id="seatNumber"
              name="seatNumber"
              placeholder="e.g. F1, M2, B1 (leave empty to auto-assign)"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="name">Passenger Full Name</Label>
            <Input id="name" name="name" required placeholder="Passenger name" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phone">Mobile Phone Number</Label>
            <Input id="phone" name="phone" type="tel" required placeholder="10-digit mobile number" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="paymentCollected">Cash Payment Collected?</Label>
            <Select id="paymentCollected" name="paymentCollected" defaultValue="no">
              <option value="no">No — Reserve seat (Collect upon boarding)</option>
              <option value="yes">Yes — Cash received (Issue Ticket)</option>
            </Select>
          </div>

          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-extrabold text-xs py-3.5 rounded-xl shadow-lg glow-amber transition-all cursor-pointer mt-4"
          >
            <CheckCircle2 className="h-4 w-4 mr-1.5 inline" />
            Book &amp; Reserve Walk-in Passenger
          </Button>
        </form>
      </Card>
    </div>
  );
}
