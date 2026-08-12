"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createTrip } from "@/app/actions/trip-actions";
import { assignVehicleToDriverAction } from "@/app/actions/vehicle-actions";
import Link from "next/link";
import { Route, ArrowLeft, Loader2, AlertCircle, UserCheck, ShieldCheck, Truck, MapPin } from "lucide-react";
import { Button, Label, Card, SearchableSelect, DateTimePicker, type SearchableOption } from "@/components/ui";

interface VehicleItem {
  id: string;
  regNumber: string;
  modelName: string;
  capacity: number;
  ownerId: string;
  owner?: { id: string; name: string | null; phone: string | null; role: string } | null;
}

interface ScheduleTripFormProps {
  vehicles: VehicleItem[];
  locations: { id: string; name: string }[];
  drivers: { id: string; name: string | null; phone: string | null }[];
  isDriverView?: boolean;
  redirectPath?: string;
  backLink?: string;
  noticeText?: string;
}

export function ScheduleTripForm({
  vehicles,
  locations,
  drivers,
  isDriverView = false,
  redirectPath = isDriverView ? "/driver/trips" : "/admin/trips",
  backLink = isDriverView ? "/driver/trips" : "/admin/trips",
  noticeText = isDriverView
    ? "Note: Driver-created trip schedules require Admin Approval before going live for passenger bookings."
    : undefined,
}: ScheduleTripFormProps) {
  const router = useRouter();
  const [vehicleId, setVehicleId] = useState("");
  const [sourceId, setSourceId] = useState("");
  const [destinationId, setDestinationId] = useState("");
  const [driverId, setDriverId] = useState("");
  const [shouldAutoAssignVehicle, setShouldAutoAssignVehicle] = useState(false);
  const [startTime, setStartTime] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Selected vehicle lookup
  const selectedVehicle = useMemo(
    () => vehicles.find((v) => v.id === vehicleId),
    [vehicles, vehicleId]
  );

  // Vehicle owner details
  const isDriverOwnedVehicle = selectedVehicle?.owner?.role === "DRIVER";
  const associatedDriver = isDriverOwnedVehicle ? selectedVehicle?.owner : null;

  // Auto-set driver if vehicle is driver-owned
  useEffect(() => {
    if (isDriverOwnedVehicle && associatedDriver) {
      setDriverId(associatedDriver.id);
      setShouldAutoAssignVehicle(false);
    } else {
      if (!driverId) setDriverId("");
    }
  }, [vehicleId, isDriverOwnedVehicle, associatedDriver, driverId]);

  // Options for SearchableSelect
  const vehicleOptions: SearchableOption[] = useMemo(
    () =>
      vehicles.map((v) => ({
        value: v.id,
        label: `${v.regNumber} — ${v.modelName}`,
        description: `${v.capacity} Seats · ${v.owner?.name ? `Owner: ${v.owner.name}` : "Company Fleet"}`,
        badge: v.owner?.role === "DRIVER" ? "Driver Fleet" : "Company Fleet",
        icon: Truck,
      })),
    [vehicles]
  );

  const locationOptions: SearchableOption[] = useMemo(
    () =>
      locations.map((l) => ({
        value: l.id,
        label: l.name,
        description: "Shuttle Terminal / Stop",
        icon: MapPin,
      })),
    [locations]
  );

  const driverOptions: SearchableOption[] = useMemo(
    () => [
      {
        value: "",
        label: "Default (Vehicle Owner or System Admin)",
        description: "Use default assigned driver partner",
      },
      ...drivers.map((d) => ({
        value: d.id,
        label: d.name || "Driver Partner",
        description: d.phone ? `Phone: ${d.phone}` : "Verified Driver",
        badge: "Verified Driver",
        icon: UserCheck,
      })),
    ],
    [drivers]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!vehicleId) return setErrorMsg("Please select a shuttle vehicle.");
    if (!sourceId) return setErrorMsg("Please select an origin terminal.");
    if (!destinationId) return setErrorMsg("Please select a destination terminal.");
    if (sourceId === destinationId) return setErrorMsg("Origin and destination terminals cannot be identical.");
    if (!startTime) return setErrorMsg("Please specify a departure date & time.");

    const finalDriverId = isDriverOwnedVehicle && associatedDriver ? associatedDriver.id : driverId;

    setIsSubmitting(true);
    try {
      // If admin checked auto-assign driver to vehicle
      if (!isDriverView && shouldAutoAssignVehicle && finalDriverId && vehicleId && !isDriverOwnedVehicle) {
        await assignVehicleToDriverAction(vehicleId, finalDriverId);
      }

      const res = await createTrip({
        vehicleId,
        sourceId,
        destinationId,
        driverId: finalDriverId || undefined,
        startTime,
      });

      if (res.success) {
        router.push(redirectPath);
        router.refresh();
      } else {
        setErrorMsg(res.error || "Failed to schedule shuttle trip.");
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      <Link
        href={backLink}
        className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to My Trips
      </Link>

      <Card variant="glass" className="p-8 space-y-6 border-slate-800 shadow-2xl glow-amber">
        <div className="flex items-center gap-3 pb-6 border-b border-slate-800/80">
          <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Route className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-tight">
              Schedule New Shuttle Trip
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Configure shuttle vehicle, route terminals, assigned driver, and departure schedule.
            </p>
          </div>
        </div>

        {noticeText && (
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold flex items-center gap-2">
            <Route className="h-4 w-4 shrink-0 text-amber-400" />
            <span>{noticeText}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Searchable Shuttle Vehicle Dropdown */}
          <div className="space-y-2">
            <Label>Shuttle Vehicle</Label>
            <SearchableSelect
              options={vehicleOptions}
              value={vehicleId}
              onChange={setVehicleId}
              placeholder="Search or select shuttle vehicle..."
              searchPlaceholder="Type registration number or model..."
            />
          </div>

          {/* Smart Vehicle Driver Association Display */}
          {selectedVehicle && (
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2 transition-all">
              {isDriverOwnedVehicle && associatedDriver ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                      <UserCheck className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-extrabold text-white">
                        Associated Driver: {associatedDriver.name || "Driver Partner"}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        Phone: {associatedDriver.phone || "N/A"} · Vehicle Owner
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3" /> Auto-Assigned
                  </span>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400 font-semibold">Vehicle Owner: Company Fleet / Admin</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      {!isDriverView ? "Assign Driver Below" : "Driver Self-Schedule"}
                    </span>
                  </div>

                  {!isDriverView && (
                    <>
                      {/* Driver Partner Searchable Select */}
                      <div className="space-y-1.5 pt-1">
                        <Label className="text-xs">Assigned Driver Partner</Label>
                        <SearchableSelect
                          options={driverOptions}
                          value={driverId}
                          onChange={setDriverId}
                          placeholder="Search and assign driver partner..."
                          searchPlaceholder="Type driver name or phone..."
                        />
                      </div>

                      {driverId && (
                        <label className="flex items-center gap-2 text-xs font-semibold text-amber-400 cursor-pointer pt-1">
                          <input
                            type="checkbox"
                            checked={shouldAutoAssignVehicle}
                            onChange={(e) => setShouldAutoAssignVehicle(e.target.checked)}
                            className="rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-amber-500"
                          />
                          <span>Permanently link &amp; assign vehicle {selectedVehicle.regNumber} to this driver</span>
                        </label>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Route Terminals Dropdowns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Origin Terminal (From)</Label>
              <SearchableSelect
                options={locationOptions}
                value={sourceId}
                onChange={setSourceId}
                placeholder="Search origin city..."
                searchPlaceholder="Type terminal or city name..."
              />
            </div>

            <div className="space-y-2">
              <Label>Destination Terminal (To)</Label>
              <SearchableSelect
                options={locationOptions}
                value={destinationId}
                onChange={setDestinationId}
                placeholder="Search destination city..."
                searchPlaceholder="Type terminal or city name..."
              />
            </div>
          </div>

          {/* Custom Date-Time Picker */}
          <div className="space-y-2">
            <Label>Departure Date &amp; Time</Label>
            <DateTimePicker
              value={startTime}
              onChange={setStartTime}
              placeholder="Select departure date &amp; departure time..."
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800/80">
            <Link href={backLink}>
              <Button type="button" variant="secondary" size="sm" className="cursor-pointer">
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-extrabold shadow-lg glow-amber cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Scheduling Departure...
                </>
              ) : (
                "Confirm Departure Schedule"
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

// Backward compatibility export alias
export const AdminScheduleTripForm = ScheduleTripForm;
