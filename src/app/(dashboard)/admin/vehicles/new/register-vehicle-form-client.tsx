"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createVehicle } from "@/app/actions/vehicle-actions";
import { Car, ArrowLeft, ShieldCheck, Fuel, Calendar, Hash, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Button, Card, Input, Label, Select } from "@/components/ui";

export function RegisterVehicleFormClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);

    try {
      const res = await createVehicle(formData);
      if (res.success) {
        setSuccessMsg("🎉 Vehicle registered successfully! Redirecting to Fleet Registry...");
        setTimeout(() => {
          router.push("/admin/vehicles");
          router.refresh();
        }, 1200);
      } else {
        setError(res.error || "Failed to register shuttle vehicle.");
        setLoading(false);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      <Link
        href="/admin/vehicles"
        className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Fleet Registry
      </Link>

      <Card variant="glass" className="p-8 space-y-6 border-slate-800 shadow-2xl glow-amber relative z-10 overflow-visible">
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

        {/* Success Popup Banner */}
        {successMsg && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-extrabold flex items-center justify-between shadow-lg animate-in fade-in-0">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
            <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold flex items-center gap-2.5">
            <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
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
              disabled={loading}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shadow-lg glow-amber cursor-pointer"
            >
              {loading ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="h-4 w-4 animate-spin" /> Registering...
                </span>
              ) : (
                "Register Vehicle"
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
