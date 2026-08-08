"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { createTrip, getDriverVehicles, getLocations } from "@/app/actions/trip-actions";
import Link from "next/link";
import { Loader2, PlusCircle, ArrowLeft, Route } from "lucide-react";
import { Card, Button, Input, Select, Label } from "@/components/ui";

const newTripSchema = z
  .object({
    vehicleId: z.string().min(1, "Please select a vehicle"),
    sourceId: z.string().min(1, "Please select a source location"),
    destinationId: z.string().min(1, "Please select a destination location"),
    startTime: z.string().min(1, "Departure date & time is required"),
  })
  .refine((data) => data.sourceId !== data.destinationId, {
    message: "Source and destination cannot be the same",
    path: ["destinationId"],
  });

type NewTripForm = z.infer<typeof newTripSchema>;
type Vehicle = { id: string; regNumber: string; modelName: string };
type Location = { id: string; name: string };

export default function NewTripPage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
  } = useForm<NewTripForm>({
    resolver: zodResolver(newTripSchema),
    defaultValues: {
      vehicleId: "",
      sourceId: "",
      destinationId: "",
      startTime: "",
    },
  });

  useEffect(() => {
    async function fetchFormData() {
      try {
        const [vehRes, locRes] = await Promise.all([
          getDriverVehicles(),
          getLocations(),
        ]);
        if (vehRes.success) setVehicles(vehRes.data ?? []);
        if (locRes.success) setLocations(locRes.data ?? []);
      } catch {
        // Silently fallback
      } finally {
        setLoadingData(false);
      }
    }
    fetchFormData();
  }, []);

  const onSubmit = async (data: NewTripForm) => {
    setServerError(null);
    const result = await createTrip(data);
    if (result.success) {
      router.push("/driver/trips");
      router.refresh();
    } else {
      setServerError(result.error ?? "Failed to create trip");
    }
  };

  const handleSelectChange =
    (field: keyof NewTripForm) => (e: React.ChangeEvent<HTMLSelectElement>) => {
      setValue(field, e.target.value, { shouldValidate: true });
    };

  return (
    <div className="max-w-lg mx-auto space-y-6 pb-12">
      <Link href="/driver/trips" className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors">
        <ArrowLeft className="h-4 w-4" />
        Back to My Trips
      </Link>

      <Card variant="glass" className="p-8 space-y-6 border-slate-800 shadow-2xl glow-amber">
        <div className="border-b border-slate-800/80 pb-4">
          <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
            <Route className="h-5 w-5 text-amber-400" />
            Schedule New Shuttle Trip
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Dispatch a shuttle run for passenger bookings.
          </p>
        </div>

        {serverError && (
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="vehicleId">Assigned Vehicle</Label>
            <Select
              id="vehicleId"
              disabled={loadingData}
              onChange={handleSelectChange("vehicleId")}
            >
              <option value="">
                {loadingData ? "Loading vehicles..." : "Select vehicle"}
              </option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.regNumber} — {v.modelName}
                </option>
              ))}
            </Select>
            {errors.vehicleId && (
              <p className="text-rose-400 text-xs font-semibold mt-1">{errors.vehicleId.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="sourceId">From (Source)</Label>
              <Select
                id="sourceId"
                disabled={loadingData}
                onChange={handleSelectChange("sourceId")}
              >
                <option value="">
                  {loadingData ? "Loading..." : "Select source"}
                </option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </Select>
              {errors.sourceId && (
                <p className="text-rose-400 text-xs font-semibold mt-1">{errors.sourceId.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="destinationId">To (Destination)</Label>
              <Select
                id="destinationId"
                disabled={loadingData}
                onChange={handleSelectChange("destinationId")}
              >
                <option value="">
                  {loadingData ? "Loading..." : "Select destination"}
                </option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </Select>
              {errors.destinationId && (
                <p className="text-rose-400 text-xs font-semibold mt-1">{errors.destinationId.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="startTime">Departure Date &amp; Time</Label>
            <Input
              id="startTime"
              type="datetime-local"
              {...register("startTime")}
            />
            {errors.startTime && (
              <p className="text-rose-400 text-xs font-semibold mt-1">{errors.startTime.message}</p>
            )}
          </div>

          <Button
            type="submit"
            disabled={isSubmitting || loadingData}
            className="w-full bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-extrabold text-xs py-3 rounded-xl shadow-lg glow-amber transition-all cursor-pointer mt-4"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2 inline" />
                Scheduling Trip...
              </>
            ) : (
              "Schedule Shuttle Trip"
            )}
          </Button>
        </form>
      </Card>
    </div>
  );
}
