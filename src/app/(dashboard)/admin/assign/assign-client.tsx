"use client";

import { useState } from "react";
import { Link2, Car, User, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";
import { Badge, Button } from "@/components/ui";

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
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  async function handleAssign() {
    if (!selectedDriver || !selectedVehicle) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/assign-vehicle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driverId: selectedDriver.id, vehicleId: selectedVehicle.id }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult({ success: true, message: `Vehicle ${selectedVehicle.regNumber} assigned to ${selectedDriver.name || "driver"}.` });
        setSelectedDriver(null);
        setSelectedVehicle(null);
        window.location.reload();
      } else {
        setResult({ success: false, message: data.error || "Assignment failed." });
      }
    } catch {
      setResult({ success: false, message: "Network error. Please try again." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pb-12">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--foreground)] tracking-tight flex items-center gap-2.5">
          <Link2 className="h-7 w-7 text-amber-500" />
          Assign Vehicle to Driver
        </h1>
        <p className="text-xs sm:text-sm text-[var(--muted-foreground)] mt-1">Select a driver partner and a shuttle vehicle to link their operational assignment</p>
      </div>

      {result && (
        <div className={`flex items-center gap-2.5 p-4 rounded-xl border text-xs font-bold ${
          result.success
            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
            : "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400"
        }`}>
          {result.success ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
          {result.message}
        </div>
      )}

      {/* Step Selection Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Driver Selection */}
        <div className="bg-[var(--card)] border border-[var(--border)] backdrop-blur-xl rounded-2xl overflow-hidden shadow-xl">
          <div className="px-5 py-4 border-b border-[var(--border)] bg-[var(--muted)]/50">
            <p className="text-xs font-bold text-[var(--foreground)] flex items-center gap-2 uppercase tracking-wider">
              <User className="h-4 w-4 text-amber-500" />
              Step 1: Select Driver Partner
            </p>
          </div>
          <div className="divide-y divide-[var(--border)] max-h-[400px] overflow-y-auto">
            {drivers.length === 0 ? (
              <p className="text-center text-[var(--muted-foreground)] py-8 text-xs">No active drivers found</p>
            ) : (
              drivers.map((driver) => (
                <button
                  key={driver.id}
                  onClick={() => setSelectedDriver(driver)}
                  className={`w-full flex items-center justify-between px-5 py-3.5 text-left transition-colors cursor-pointer ${
                    selectedDriver?.id === driver.id
                      ? "bg-amber-500/15 border-l-4 border-amber-500"
                      : "hover:bg-[var(--muted)]/40 text-[var(--foreground)]"
                  }`}
                >
                  <div>
                    <p className="text-xs font-extrabold text-[var(--foreground)]">{driver.name || "Unnamed Driver"}</p>
                    <p className="text-[11px] text-[var(--muted-foreground)] mt-0.5">
                      {driver.phone} • KYC: {driver.driverProfile?.kycStatus || "PENDING"}
                    </p>
                    <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5">
                      {driver.vehicles.length} vehicle(s) assigned
                    </p>
                  </div>
                  {selectedDriver?.id === driver.id && (
                    <CheckCircle2 className="h-5 w-5 text-amber-500 shrink-0" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Vehicle Selection */}
        <div className="bg-[var(--card)] border border-[var(--border)] backdrop-blur-xl rounded-2xl overflow-hidden shadow-xl">
          <div className="px-5 py-4 border-b border-[var(--border)] bg-[var(--muted)]/50">
            <p className="text-xs font-bold text-[var(--foreground)] flex items-center gap-2 uppercase tracking-wider">
              <Car className="h-4 w-4 text-amber-500" />
              Step 2: Select Shuttle Vehicle
            </p>
          </div>
          <div className="divide-y divide-[var(--border)] max-h-[400px] overflow-y-auto">
            {vehicles.length === 0 ? (
              <p className="text-center text-[var(--muted-foreground)] py-8 text-xs">No vehicles found</p>
            ) : (
              vehicles.map((vehicle) => (
                <button
                  key={vehicle.id}
                  onClick={() => setSelectedVehicle(vehicle)}
                  className={`w-full flex items-center justify-between px-5 py-3.5 text-left transition-colors cursor-pointer ${
                    selectedVehicle?.id === vehicle.id
                      ? "bg-amber-500/15 border-l-4 border-amber-500"
                      : "hover:bg-[var(--muted)]/40 text-[var(--foreground)]"
                  }`}
                >
                  <div>
                    <p className="text-xs font-extrabold font-mono text-amber-600 dark:text-amber-400">{vehicle.regNumber}</p>
                    <p className="text-[11px] text-[var(--muted-foreground)] mt-0.5">
                      {vehicle.modelName} • {vehicle.vehicleType} • {vehicle.capacity} seats
                    </p>
                    <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5">
                      Owner: {vehicle.owner.name || "System"} ({vehicle.owner.phone})
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={vehicle.isActive ? "success" : "destructive"}>
                      {vehicle.isActive ? "Active" : "Inactive"}
                    </Badge>
                    {selectedVehicle?.id === vehicle.id && (
                      <CheckCircle2 className="h-5 w-5 text-amber-500 shrink-0" />
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Assignment Confirmation Card */}
      {selectedDriver && selectedVehicle && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 shadow-xl space-y-4">
          <p className="text-xs font-extrabold text-[var(--foreground)] uppercase tracking-wider">Assignment Confirmation</p>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex-1 bg-[var(--muted)]/40 border border-[var(--border)] p-4 rounded-xl">
              <p className="text-[11px] text-[var(--muted-foreground)] font-semibold">Driver Partner</p>
              <p className="text-xs font-bold text-[var(--foreground)] mt-0.5">{selectedDriver.name}</p>
              <p className="text-[11px] text-[var(--muted-foreground)]">{selectedDriver.phone}</p>
            </div>
            <ArrowRight className="h-5 w-5 text-amber-500 shrink-0 hidden sm:block" />
            <div className="flex-1 bg-[var(--muted)]/40 border border-[var(--border)] p-4 rounded-xl">
              <p className="text-[11px] text-[var(--muted-foreground)] font-semibold">Shuttle Vehicle</p>
              <p className="text-xs font-bold text-amber-600 dark:text-amber-400 font-mono mt-0.5">{selectedVehicle.regNumber}</p>
              <p className="text-[11px] text-[var(--muted-foreground)]">{selectedVehicle.modelName} • {selectedVehicle.capacity} seats</p>
            </div>
            <Button
              onClick={handleAssign}
              disabled={loading}
              className="w-full sm:w-auto px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg shadow-amber-500/10 flex items-center justify-center gap-2 cursor-pointer h-12"
            >
              <Link2 className="h-4 w-4" />
              {loading ? "Assigning..." : "Confirm Vehicle Assignment"}
            </Button>
          </div>
        </div>
      )}

      {/* Current Assignments Table */}
      <div className="bg-[var(--card)] border border-[var(--border)] backdrop-blur-xl rounded-2xl overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-[var(--border)] bg-[var(--muted)]/50">
          <h2 className="text-xs font-bold text-[var(--foreground)] uppercase tracking-wider">Current Driver-Vehicle Links</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--muted)]/50">
                <th className="px-6 py-3 text-[11px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Driver Partner</th>
                <th className="px-6 py-3 text-[11px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Phone</th>
                <th className="px-6 py-3 text-[11px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">KYC Status</th>
                <th className="px-6 py-3 text-[11px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Assigned Vehicles</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {drivers.map((driver) => (
                <tr key={driver.id} className="hover:bg-[var(--muted)]/40 transition-colors">
                  <td className="px-6 py-3.5 text-xs font-bold text-[var(--foreground)]">{driver.name || "—"}</td>
                  <td className="px-6 py-3.5 text-xs text-[var(--muted-foreground)] font-mono">{driver.phone}</td>
                  <td className="px-6 py-3.5">
                    <Badge variant={
                      driver.driverProfile?.kycStatus === "APPROVED" ? "success" :
                      driver.driverProfile?.kycStatus === "REJECTED" ? "destructive" : "warning"
                    }>
                      {driver.driverProfile?.kycStatus || "PENDING"}
                    </Badge>
                  </td>
                  <td className="px-6 py-3.5">
                    {driver.vehicles.length === 0 ? (
                      <span className="text-xs text-[var(--muted-foreground)] italic">No vehicles assigned</span>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {driver.vehicles.map((v) => (
                          <span key={v.id} className="text-[11px] font-mono border border-[var(--border)] bg-[var(--muted)]/50 px-2 py-0.5 rounded text-amber-600 dark:text-amber-400 font-bold">
                            {v.regNumber}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
