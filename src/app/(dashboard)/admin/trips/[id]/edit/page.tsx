import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CalendarClock, DollarSign } from "lucide-react";
import { rescheduleAdminTrip, updateAvailableTripSeatPrice } from "@/app/actions/admin-trip-actions";

export default async function AdminEditTripPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login");
  const { id } = await params;
  const trip = await db.trip.findUnique({ where: { id }, include: { source: true, destination: true, vehicle: true, seats: { orderBy: { seatNumber: "asc" } } } });
  if (!trip) redirect("/admin/trips");

  async function reschedule(formData: FormData) {
    "use server";
    await rescheduleAdminTrip(id, String(formData.get("startTime") || ""));
    redirect(`/admin/trips/${id}`);
  }
  async function price(formData: FormData) {
    "use server";
    await updateAvailableTripSeatPrice(id, Number(formData.get("price")));
    redirect(`/admin/trips/${id}`);
  }

  const availableSeats = trip.seats.filter((seat) => seat.status === "AVAILABLE");
  return <div className="mx-auto max-w-3xl space-y-6 pb-12">
    <Link href={`/admin/trips/${id}`} className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"><ArrowLeft className="h-4 w-4" /> Back to operations</Link>
    <div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-500">Controlled edit</p><h1 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{trip.source.name} → {trip.destination.name}</h1><p className="mt-1 text-sm text-slate-500">Only unlocked scheduled trips can be rescheduled or repriced.</p></div>
    <div className="grid gap-5 md:grid-cols-2">
      <form action={reschedule} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60"><div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white"><CalendarClock className="h-5 w-5 text-amber-500" /> Reschedule departure</div><p className="text-xs text-slate-500">Existing booking and ticket snapshots remain unchanged.</p><input required name="startTime" type="datetime-local" defaultValue={new Date(trip.startTime).toISOString().slice(0, 16)} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950" /><button className="h-10 w-full rounded-xl bg-amber-500 px-4 text-xs font-black text-slate-950">Save departure</button></form>
      <form action={price} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60"><div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white"><DollarSign className="h-5 w-5 text-amber-500" /> Price available seats</div><p className="text-xs text-slate-500">{availableSeats.length} available seats will receive this fare. Booked/locked seats are protected.</p><input required name="price" type="number" min="1" max="10000" defaultValue={availableSeats[0] ? Number(availableSeats[0].price) : 0} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950" /><button disabled={!availableSeats.length} className="h-10 w-full rounded-xl bg-amber-500 px-4 text-xs font-black text-slate-950 disabled:opacity-50">Apply fare to available seats</button></form>
    </div>
  </div>;
}
