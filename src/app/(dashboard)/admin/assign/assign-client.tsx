"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { assignVehicleToDriverAction, unassignVehicleAction } from "@/app/actions/vehicle-actions";
import { Link2, Car, UserCheck, CheckCircle2, AlertCircle, ShieldAlert, ArrowRight, XCircle, Loader2, Trash2 } from "lucide-react";
import { Badge, Button, Card, SearchableSelect, type SearchableOption } from "@/components/ui";

interface Driver {
  id: string;
  name: string | null;
  phone: string;
  driverProfile: { kycStatus: string; isAvailable: boolean; rating: number | string } | null;
  vehicles: { id: string; regNumber: string; modelName: string; isActive: boolean }[];
}

interface Vehicle {
  id: string;
  regNumber: string;
  modelName: string;
  vehicleType: string;
  capacity: number;
  isActive: boolean;
  ownerId: string;
  owner: { id: string; name: string | null; phone: string };
}

interface AssignVehicleClientProps {
  drivers: Driver[];
  vehicles: Vehicle[];
}

export function AssignVehicleClient({ drivers, vehicles }: AssignVehicleClientProps) {
  const router = useRouter();
  const [selectedDriverId, setSelectedDriverId] = useState<string>("");
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [unassigningVehicleId, setUnassigningVehicleId] = useState<string | null>(null);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const selectedDriver = useMemo(
    () => drivers.find((d) => d.id === selectedDriverId),
    [drivers, selectedDriverId]
  );

  const selectedVehicle = useMemo(
    () => vehicles.find((v) => v.id === selectedVehicleId),
    [vehicles, selectedVehicleId]
  );

  // Driver options for SearchableSelect
  const driverOptions: SearchableOption[] = useMemo(
    () =>
      drivers.map((d) => {
        const hasAssignedVehicle = d.vehicles.length > 0;
        const currentReg = hasAssignedVehicle ? d.vehicles[0].regNumber : null;
        return {
          value: d.id,
          label: d.name || "Driver Partner",
          description: `Phone: ${d.phone} · ${currentReg ? `Currently Assigned: ${currentReg}` : "Unassigned Fleet"}`,
          badge: hasAssignedVehicle ? `Linked: ${currentReg}` : "Available",
          icon: UserCheck,
        };
      }),
    [drivers]
  );

  // Vehicle options for SearchableSelect
  const vehicleOptions: SearchableOption[] = useMemo(
    () =>
      vehicles.map((v) => {
        const isDriverOwned = v.owner?.phone && drivers.some((d) => d.id === v.ownerId);
        return {
          value: v.id,
          label: `${v.regNumber} — ${v.modelName}`,
          description: `${v.capacity} Seats · Owner: ${v.owner?.name || "Company Fleet"}`,
          badge: isDriverOwned ? `Assigned to: ${v.owner.name}` : "Company Fleet",
          icon: Car,
        };
      }),
    [vehicles, drivers]
  );

  async function handleAssign() {
    if (!selectedDriver || !selectedVehicle) return;
    setLoading(true);
    setResult(null);

    try {
      const res = await assignVehicleToDriverAction(selectedVehicle.id, selectedDriver.id);
      if (res.success) {
        setResult({
          success: true,
          message: `Vehicle ${selectedVehicle.regNumber} successfully assigned exclusively to ${selectedDriver.name || "driver"}.`,
        });
        setSelectedDriverId("");
        setSelectedVehicleId("");
        router.refresh();
      } else {
        setResult({ success: false, message: res.error || "Assignment failed." });
      }
    } catch (err: unknown) {
      setResult({
        success: false,
        message: err instanceof Error ? err.message : "An unexpected error occurred.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleUnassign(vehicleId: string) {
    setUnassigningVehicleId(vehicleId);
    try {
      const res = await unassignVehicleAction(vehicleId);
      if (res.success) {
        setResult({
          success: true,
          message: "Vehicle unassigned and returned to company fleet.",
        });
        router.refresh();
      } else {
        setResult({ success: false, message: res.error || "Unassignment failed." });
      }
    } catch (err: unknown) {
      setResult({
        success: false,
        message: err instanceof Error ? err.message : "Failed to unassign vehicle.",
      });
    } finally {
      setUnassigningVehicleId(null);
    }
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pb-12">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--foreground)] tracking-tight flex items-center gap-2.5">
            <Link2 className="h-7 w-7 text-amber-500" />
            1-to-1 Vehicle &amp; Driver Fleet Assignment
          </h1>
          <p className="text-xs sm:text-sm text-[var(--muted-foreground)] mt-1">
            Enforce strict 1:1 driver-to-vehicle allocation across your shuttle operations.
          </p>
        </div>
      </div>

      {result && (
        <div
          className={`flex items-center gap-2.5 p-4 rounded-2xl border text-xs font-bold shadow-md ${
            result.success
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              : "bg-rose-500/10 border-rose-500/30 text-rose-400"
          }`}
        >
          {result.success ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
          )}
          <span>{result.message}</span>
        </div>
      )}

      {/* Strict Rule Notice Card */}
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold flex items-center gap-3">
        <ShieldAlert className="h-5 w-5 shrink-0 text-amber-400" />
        <span>
          <strong>Exclusive Assignment Guard:</strong> Each driver partner can only be linked to <strong>one</strong> shuttle vehicle at a time. Assigning a new vehicle automatically releases any previously assigned vehicle back to the company fleet.
        </span>
      </div>

      {/* Interactive Assignment Card */}
      <Card variant="glass" className="p-6 border-slate-800 shadow-2xl space-y-6 glow-amber">
        <h2 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
          <Link2 className="h-4 w-4 text-amber-400" /> Link Vehicle to Driver
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Driver Combobox */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300">Select Driver Partner</label>
            <SearchableSelect
              options={driverOptions}
              value={selectedDriverId}
              onChange={setSelectedDriverId}
              placeholder="Search driver by name or phone..."
              searchPlaceholder="Type name or phone..."
            />
          </div>

          {/* Vehicle Combobox */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300">Select Shuttle Vehicle</label>
            <SearchableSelect
              options={vehicleOptions}
              value={selectedVehicleId}
              onChange={setSelectedVehicleId}
              placeholder="Search vehicle by reg number or model..."
              searchPlaceholder="Type registration number or model..."
            />
          </div>
        </div>

        {/* Confirmation Toolbar */}
        {selectedDriver && selectedVehicle && (
          <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono font-black text-sm">
                {selectedVehicle.regNumber}
              </div>
              <div>
                <p className="text-xs font-extrabold text-white">
                  Assigning {selectedVehicle.modelName} ({selectedVehicle.capacity} seats)
                </p>
                <p className="text-[11px] text-slate-400">
                  Target Driver: <span className="text-amber-400 font-bold">{selectedDriver.name || "Driver"}</span> ({selectedDriver.phone})
                </p>
              </div>
            </div>

            <Button
              type="button"
              disabled={loading}
              onClick={handleAssign}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs px-6 py-2.5 rounded-xl shadow-lg glow-amber cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Updating Assignment...
                </>
              ) : (
                "Confirm 1:1 Assignment"
              )}
            </Button>
          </div>
        )}
      </Card>

      {/* Fleet Assignments Directory Table */}
      <Card variant="glass" className="p-6 border-slate-800 shadow-2xl space-y-4">
        <h2 className="text-xs font-extrabold text-white uppercase tracking-wider">
          Active Fleet Driver Assignments
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Driver Partner</th>
                <th className="py-3 px-4">Phone Number</th>
                <th className="py-3 px-4">KYC Status</th>
                <th className="py-3 px-4">Assigned Vehicle</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {drivers.map((driver) => {
                const assignedVehicle = driver.vehicles[0];
                return (
                  <tr key={driver.id} className="hover:bg-slate-900/50 transition-colors">
                    <td className="py-3.5 px-4 text-xs font-bold text-white">
                      {driver.name || "Driver Partner"}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-mono text-slate-300">
                      {driver.phone}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge
                        variant={
                          driver.driverProfile?.kycStatus === "APPROVED"
                            ? "success"
                            : driver.driverProfile?.kycStatus === "REJECTED"
                            ? "destructive"
                            : "warning"
                        }
                      >
                        {driver.driverProfile?.kycStatus || "PENDING"}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4">
                      {assignedVehicle ? (
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono text-xs font-extrabold">
                          <Car className="h-3.5 w-3.5" />
                          <span>{assignedVehicle.regNumber} — {assignedVehicle.modelName}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500 italic">No vehicle assigned (Company Fleet)</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {assignedVehicle && (
                        <button
                          type="button"
                          disabled={unassigningVehicleId === assignedVehicle.id}
                          onClick={() => handleUnassign(assignedVehicle.id)}
                          title="Unassign Vehicle and Return to Fleet"
                          className="p-2 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-all cursor-pointer"
                        >
                          {unassigningVehicleId === assignedVehicle.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
