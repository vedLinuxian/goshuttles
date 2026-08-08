import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, DollarSign } from "lucide-react";
import { PricingClient } from "./pricing-client";
import { initializeVehicleSeatTemplates } from "@/app/actions/vehicle-pricing-actions";

export default async function VehiclePricingPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login");
  const { id } = await params;
  const vehicle = await db.vehicle.findUnique({ where: { id }, include: { seatTemplates: { orderBy: { seatNumber: "asc" } } } });
  if (!vehicle) redirect("/admin/vehicles");
  const loadedVehicle = vehicle;

  if (loadedVehicle.seatTemplates.length === 0) {
    async function initialize() {
      "use server";
      await initializeVehicleSeatTemplates(loadedVehicle.id);
      redirect(`/admin/vehicles/${loadedVehicle.id}/pricing`);
    }
    return <div className="mx-auto max-w-4xl space-y-6 pb-12"><Link href="/admin/vehicles" className="inline-flex items-center gap-2 text-xs font-bold text-slate-500"><ArrowLeft className="h-4 w-4" /> Back to fleet</Link><div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-8"><h1 className="text-xl font-black text-slate-900 dark:text-white">Initialize seat pricing</h1><p className="mt-2 text-sm text-slate-600 dark:text-slate-300">This {loadedVehicle.capacity}-seat vehicle has no pricing template. Create the admin defaults, then customize each seat.</p><form action={initialize}><button className="mt-5 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-black text-slate-950">Create {loadedVehicle.capacity} seat templates</button></form></div></div>;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-12">
      <Link href="/admin/vehicles" className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"><ArrowLeft className="h-4 w-4" /> Back to fleet</Link>
      <div className="flex items-start gap-4"><div className="rounded-2xl bg-amber-500/10 p-3 text-amber-500"><DollarSign className="h-6 w-6" /></div><div><h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Seat pricing · {loadedVehicle.regNumber}</h1><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Admin-only template pricing for {loadedVehicle.modelName}. Existing bookings and tickets keep their historical fare.</p></div></div>
      <PricingClient vehicle={{ id: loadedVehicle.id, regNumber: loadedVehicle.regNumber, modelName: loadedVehicle.modelName, capacity: loadedVehicle.capacity }} initialSeats={vehicle.seatTemplates.map((seat) => ({ id: seat.id, seatNumber: seat.seatNumber, seatType: seat.seatType, basePrice: seat.basePrice.toString(), isActive: seat.isActive }))} />
    </div>
  );
}
