import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createTrip } from "@/app/actions/trip-actions";
import Link from "next/link";
import { Route, ArrowLeft } from "lucide-react";

export default async function ScheduleTripPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login");

  const [vehicles, locations] = await Promise.all([
    db.vehicle.findMany({
      where: { isActive: true },
      select: { id: true, regNumber: true, modelName: true, capacity: true },
      orderBy: { regNumber: "asc" },
    }),
    db.location.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  async function handleSchedule(formData: FormData) {
    "use server";
    const vehicleId = formData.get("vehicleId") as string;
    const sourceId = formData.get("sourceId") as string;
    const destinationId = formData.get("destinationId") as string;
    const startTime = formData.get("startTime") as string;

    const result = await createTrip({ vehicleId, sourceId, destinationId, startTime });
    if (result.success) {
      redirect("/admin/trips");
    } else {
      throw new Error(result.error || "Failed to schedule trip.");
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      <Link
        href="/admin/trips"
        className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to All Trips
      </Link>

      <div className="bg-white dark:bg-[#0e131f] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-8 shadow-xl">
        <div className="flex items-center gap-3 mb-6 pb-6 border-b border-slate-200 dark:border-slate-800/80">
          <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500">
            <Route className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Schedule New Shuttle Trip
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Configure shuttle vehicle, route terminals, and departure date/time.
            </p>
          </div>
        </div>

        <form action={handleSchedule} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Shuttle Vehicle</label>
            <select
              name="vehicleId"
              required
              className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold bg-white dark:bg-[#060911] text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500/50"
            >
              <option value="">Select Shuttle Vehicle</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.regNumber} — {v.modelName} ({v.capacity} Seats)
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Origin Terminal (From)</label>
              <select
                name="sourceId"
                required
                className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold bg-white dark:bg-[#060911] text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500/50"
              >
                <option value="">Select Origin City</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Destination Terminal (To)</label>
              <select
                name="destinationId"
                required
                className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold bg-white dark:bg-[#060911] text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500/50"
              >
                <option value="">Select Destination City</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Departure Date &amp; Time</label>
            <input
              type="datetime-local"
              name="startTime"
              required
              className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold bg-white dark:bg-[#060911] text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500/50"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800/80">
            <Link
              href="/admin/trips"
              className="px-5 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl transition-all shadow-lg shadow-amber-500/10 cursor-pointer"
            >
              Confirm Departure Schedule
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
