import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { updateVehicle } from "@/app/actions/vehicle-actions";
import Link from "next/link";
import { Car, ArrowLeft } from "lucide-react";

export default async function EditVehiclePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login");

  const { id } = await params;
  const vehicle = await db.vehicle.findUnique({
    where: { id },
    include: { owner: { select: { name: true, phone: true } } },
  });

  if (!vehicle) redirect("/admin/vehicles");

  async function handleUpdate(formData: FormData) {
    "use server";
    formData.append("vehicleId", id);
    const result = await updateVehicle(null, formData);
    if (result.success) {
      redirect("/admin/vehicles");
    } else {
      throw new Error(result.error || "Failed to update vehicle.");
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      <Link
        href="/admin/vehicles"
        className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Fleet Registry
      </Link>

      <div className="bg-white dark:bg-[#0e131f] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-8 shadow-xl">
        <div className="flex items-center gap-3 mb-6 pb-6 border-b border-slate-200 dark:border-slate-800/80">
          <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500">
            <Car className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Edit Vehicle Details ({vehicle.regNumber})
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Update shuttle specs, seating capacity, and operational status.
            </p>
          </div>
        </div>

        <form action={handleUpdate} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Registration Number</label>
            <input
              type="text"
              name="regNumber"
              defaultValue={vehicle.regNumber}
              required
              maxLength={20}
              className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold bg-white dark:bg-[#060911] text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500/50"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Vehicle Model</label>
              <input
                type="text"
                name="modelName"
                defaultValue={vehicle.modelName}
                required
                maxLength={100}
                className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold bg-white dark:bg-[#060911] text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500/50"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Vehicle Type</label>
              <select
                name="vehicleType"
                defaultValue={vehicle.vehicleType}
                className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold bg-white dark:bg-[#060911] text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500/50"
              >
                <option value="SUV">SUV</option>
                <option value="SEDAN">Sedan</option>
                <option value="MINIVAN">Minivan</option>
                <option value="BUS">Tempo Traveller</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Seating Capacity</label>
              <input
                type="number"
                name="capacity"
                defaultValue={vehicle.capacity}
                min={1}
                max={50}
                required
                className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold bg-white dark:bg-[#060911] text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500/50"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Operational Status</label>
              <select
                name="isActive"
                defaultValue={vehicle.isActive.toString()}
                className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold bg-white dark:bg-[#060911] text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500/50"
              >
                <option value="true">Active &amp; Ready</option>
                <option value="false">Inactive / Maintenance</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800/80">
            <Link
              href="/admin/vehicles"
              className="px-5 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl transition-all shadow-lg shadow-amber-500/10 cursor-pointer"
            >
              Save Vehicle Updates
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
