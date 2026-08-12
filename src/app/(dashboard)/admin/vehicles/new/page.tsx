import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { addVehicleForm } from "@/app/actions/form-actions";
import Link from "next/link";
import { Car, ArrowLeft, ShieldCheck, Fuel, Calendar, Hash } from "lucide-react";
import { Button, Card, Input, Label, Select } from "@/components/ui";

export default async function RegisterVehiclePage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login");

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      <Link
        href="/admin/vehicles"
        className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Fleet Registry
      </Link>

      <Card variant="glass" className="p-8 space-y-6 border-slate-800 shadow-2xl glow-amber">
        <div className="flex items-center gap-3 pb-6 border-b border-slate-800/80">
          <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Car className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-tight">
              Register New Shuttle Vehicle
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Configure vehicle specifications, fuel type, seating capacity, and compliance insurance records.
            </p>
          </div>
        </div>

        <form action={addVehicleForm} className="space-y-5">
          {/* Registration Number */}
          <div className="space-y-1.5">
            <Label htmlFor="regNumber" className="flex items-center gap-1.5">
              <Hash className="h-3.5 w-3.5 text-amber-400" /> Vehicle Registration Number (RTO)
            </Label>
            <Input
              id="regNumber"
              type="text"
              name="regNumber"
              required
              placeholder="e.g. UP32 AB 1234"
              maxLength={20}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Vehicle Model */}
            <div className="space-y-1.5">
              <Label htmlFor="modelName">Vehicle Model Name</Label>
              <Input
                id="modelName"
                type="text"
                name="modelName"
                defaultValue="Maruti Ertiga ZXI+"
                required
                maxLength={100}
              />
            </div>

            {/* Vehicle Type */}
            <div className="space-y-1.5">
              <Label htmlFor="vehicleType">Vehicle Category / Type</Label>
              <Select id="vehicleType" name="vehicleType" defaultValue="SUV">
                <option value="SUV">SUV (6 Seats)</option>
                <option value="SEDAN">Sedan (4 Seats)</option>
                <option value="MINIVAN">Minivan (10 Seats)</option>
                <option value="BUS">Tempo Traveller (14 Seats)</option>
                <option value="COACH">Luxury Coach (24 Seats)</option>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Fuel Type */}
            <div className="space-y-1.5">
              <Label htmlFor="fuelType" className="flex items-center gap-1">
                <Fuel className="h-3.5 w-3.5 text-amber-400" /> Fuel Type
              </Label>
              <Select id="fuelType" name="fuelType" defaultValue="CNG">
                <option value="CNG">CNG + Petrol (Bi-Fuel)</option>
                <option value="DIESEL">Diesel</option>
                <option value="PETROL">Petrol</option>
                <option value="ELECTRIC">EV / Electric Vehicle</option>
              </Select>
            </div>

            {/* Seating Capacity */}
            <div className="space-y-1.5">
              <Label htmlFor="capacity">Seating Capacity</Label>
              <Input
                id="capacity"
                type="number"
                name="capacity"
                defaultValue={6}
                min={1}
                max={50}
                required
              />
            </div>
          </div>

          {/* Registration Date & Insurance Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800/80">
            <div className="space-y-1.5">
              <Label htmlFor="regDate" className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-amber-400" /> Vehicle Registration Date
              </Label>
              <Input id="regDate" type="date" name="regDate" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="insuranceNumber" className="flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> Insurance Policy Number
              </Label>
              <Input
                id="insuranceNumber"
                type="text"
                name="insuranceNumber"
                placeholder="e.g. POL-987654321"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="insuranceExpiryDate" className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-rose-400" /> Insurance Expiry Date
            </Label>
            <Input id="insuranceExpiryDate" type="date" name="insuranceExpiryDate" />
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800/80">
            <Link href="/admin/vehicles">
              <Button type="button" variant="secondary" size="sm">
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shadow-lg glow-amber cursor-pointer"
            >
              Register Vehicle
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
