"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { assignVehicleToDriverAction, unassignVehicleAction } from "@/app/actions/vehicle-actions";
import { Link2, Car, UserCheck, CheckCircle2, AlertCircle, ShieldAlert, ArrowRight, XCircle, Loader2, Trash2, Search, RefreshCw, UserX } from "lucide-react";
import { Badge, Button, Card, SearchableSelect, type SearchableOption, Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui";

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

  // Modal State for Quick Driver Pairing
  const [assigningModalDriver, setAssigningModalDriver] = useState<Driver | null>(null);
  const [filterTab, setFilterTab] = useState<"ALL" | "UNASSIGNED" | "ASSIGNED">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

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

  async function handleAssign(driverIdToAssign?: string, vehicleIdToAssign?: string) {
    const targetDriverId = driverIdToAssign || selectedDriverId;
    const targetVehicleId = vehicleIdToAssign || selectedVehicleId;

    if (!targetDriverId || !targetVehicleId) return;
    setLoading(true);
    setResult(null);

    const targetDriverObj = drivers.find((d) => d.id === targetDriverId);
    const targetVehicleObj = vehicles.find((v) => v.id === targetVehicleId);

    try {
      const res = await assignVehicleToDriverAction(targetVehicleId, targetDriverId);
      if (res.success) {
        setResult({
          success: true,
          message: `Vehicle ${targetVehicleObj?.regNumber || ""} successfully assigned exclusively to ${targetDriverObj?.name || "driver"}.`,
        });
        setSelectedDriverId("");
        setSelectedVehicleId("");
        setAssigningModalDriver(null);
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
    setResult(null);
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
        message: err instanceof Error ? err.message : "An unexpected error occurred.",
      });
    } finally {
      setUnassigningVehicleId(null);
    }
  }

  const filteredDrivers = useMemo(() => {
    return drivers.filter((d) => {
      const hasVehicle = d.vehicles.length > 0;
      if (filterTab === "UNASSIGNED" && hasVehicle) return false;
      if (filterTab === "ASSIGNED" && !hasVehicle) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        d.name?.toLowerCase().includes(q) ||
        d.phone.includes(q) ||
        d.vehicles.some((v) => v.regNumber.toLowerCase().includes(q) || v.modelName.toLowerCase().includes(q))
      );
    });
  }, [drivers, filterTab, searchQuery]);

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
          className={`flex items-center justify-between p-4 rounded-2xl border text-xs font-bold shadow-md ${
            result.success
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              : "bg-rose-500/10 border-rose-500/30 text-rose-400"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {result.success ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            )}
            <span>{result.message}</span>
          </div>
          <button type="button" onClick={() => setResult(null)} className="hover:opacity-75">
            <XCircle className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Strict Rule Notice Card */}
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold flex items-center gap-3">
        <ShieldAlert className="h-5 w-5 shrink-0 text-amber-400" />
        <span>
          <strong>Exclusive Assignment Guard:</strong> Each driver partner can only be linked to <strong>one</strong> shuttle vehicle at a time. Assigning a new vehicle automatically releases any previously assigned vehicle back to the company fleet.
        </span>
      </div>

      {/* Primary Assignment Bar */}
      <Card variant="glass" className="p-6 border-slate-800 shadow-2xl space-y-6 glow-amber">
        <h2 className="text-xs font-extrabold text-amber-400 uppercase tracking-wider flex items-center gap-2">
          <Link2 className="h-4 w-4" /> Quick Fleet Pair Selector
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Driver Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300">Select Driver Partner</label>
            <SearchableSelect
              options={driverOptions}
              value={selectedDriverId}
              onChange={setSelectedDriverId}
              placeholder="Search driver partner by name or phone..."
              searchPlaceholder="Type driver name or mobile..."
            />
          </div>

          {/* Vehicle Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300">Select Shuttle Vehicle</label>
            <SearchableSelect
              options={vehicleOptions}
              value={selectedVehicleId}
              onChange={setSelectedVehicleId}
              placeholder="Search shuttle vehicle by registration or model..."
              searchPlaceholder="Type reg number (e.g. UP32 AB 1234)..."
            />
          </div>
        </div>

        {/* Selected Pair Preview Bar */}
        {selectedDriver && selectedVehicle && (
          <div className="p-4 rounded-2xl bg-slate-900 border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 font-bold text-xs">
                {selectedDriver.name || "Driver"}
              </div>
              <ArrowRight className="h-4 w-4 text-amber-400 shrink-0" />
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 font-bold text-xs font-mono">
                {selectedVehicle.regNumber} ({selectedVehicle.modelName})
              </div>
            </div>

            <Button
              type="button"
              disabled={loading}
              onClick={() => handleAssign()}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs px-6 py-2.5 rounded-xl shadow-lg glow-amber cursor-pointer"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : "Confirm Exclusive Link"}
            </Button>
          </div>
        )}
      </Card>

      {/* Driver Cards Workspace Directory */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-amber-400" />
            <h2 className="text-lg font-extrabold text-white">Driver Fleet Directory ({filteredDrivers.length})</h2>
          </div>

          <div className="flex items-center gap-3">
            {/* Filter Tabs */}
            <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold">
              <button
                type="button"
                onClick={() => setFilterTab("ALL")}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  filterTab === "ALL" ? "bg-amber-500 text-slate-950" : "text-slate-400 hover:text-white"
                }`}
              >
                All Drivers ({drivers.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab("UNASSIGNED")}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  filterTab === "UNASSIGNED" ? "bg-amber-500 text-slate-950" : "text-slate-400 hover:text-white"
                }`}
              >
                Unassigned ({drivers.filter((d) => d.vehicles.length === 0).length})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab("ASSIGNED")}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  filterTab === "ASSIGNED" ? "bg-amber-500 text-slate-950" : "text-slate-400 hover:text-white"
                }`}
              >
                Assigned ({drivers.filter((d) => d.vehicles.length > 0).length})
              </button>
            </div>

            {/* Search Input */}
            <div className="relative w-48 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter drivers..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-semibold text-white placeholder:text-slate-500 outline-none focus:border-amber-500"
              />
            </div>
          </div>
        </div>

        {filteredDrivers.length === 0 ? (
          <Card variant="glass" className="p-8 text-center text-slate-400 text-xs font-semibold">
            No driver partners match the current filter.
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDrivers.map((driver) => {
              const assignedVehicle = driver.vehicles.length > 0 ? driver.vehicles[0] : null;

              return (
                <Card
                  key={driver.id}
                  variant="glass"
                  className={`p-5 space-y-4 border transition-all ${
                    assignedVehicle
                      ? "border-emerald-500/30 bg-emerald-950/10"
                      : "border-slate-800 bg-slate-950/80"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-extrabold text-white text-base flex items-center gap-2">
                        {driver.name || "Driver Partner"}
                      </h3>
                      <p className="text-xs font-mono text-slate-400 mt-0.5">{driver.phone}</p>
                    </div>

                    <Badge variant={driver.driverProfile?.kycStatus === "APPROVED" ? "success" : "warning"}>
                      {driver.driverProfile?.kycStatus || "PENDING"}
                    </Badge>
                  </div>

                  {/* Vehicle Link Info Box */}
                  <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                      Current Vehicle Status
                    </span>

                    {assignedVehicle ? (
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-mono font-extrabold text-amber-400 text-sm">{assignedVehicle.regNumber}</p>
                          <p className="text-[11px] text-slate-300">{assignedVehicle.modelName}</p>
                        </div>
                        <button
                          type="button"
                          disabled={unassigningVehicleId === assignedVehicle.id}
                          onClick={() => handleUnassign(assignedVehicle.id)}
                          className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          {unassigningVehicleId === assignedVehicle.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <>
                              <UserX className="h-3.5 w-3.5" /> Unassign
                            </>
                          )}
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-xs text-slate-500 italic">No vehicle linked</span>
                        <button
                          type="button"
                          onClick={() => setAssigningModalDriver(driver)}
                          className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs flex items-center gap-1 transition-all cursor-pointer shadow-md glow-amber"
                        >
                          <Car className="h-3.5 w-3.5" /> Assign Vehicle
                        </button>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Assign Vehicle Modal Dialog for direct driver card click */}
      {assigningModalDriver && (
        <Dialog open={!!assigningModalDriver} onOpenChange={() => setAssigningModalDriver(null)}>
          <DialogContent className="max-w-md bg-[#0c101c] border-slate-800 text-white rounded-3xl p-6 shadow-2xl glow-amber z-[99999]">
            <DialogHeader>
              <DialogTitle className="text-lg font-extrabold flex items-center gap-2 text-white">
                <Car className="h-5 w-5 text-amber-400" /> Assign Vehicle to {assigningModalDriver.name}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              <p className="text-xs text-slate-400">
                Select a shuttle vehicle to link exclusively to <strong>{assigningModalDriver.name}</strong> ({assigningModalDriver.phone}).
              </p>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Shuttle Vehicle</label>
                <SearchableSelect
                  options={vehicleOptions}
                  value={selectedVehicleId}
                  onChange={setSelectedVehicleId}
                  placeholder="Select vehicle..."
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <Button type="button" variant="secondary" size="sm" onClick={() => setAssigningModalDriver(null)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={loading || !selectedVehicleId}
                  onClick={() => handleAssign(assigningModalDriver.id, selectedVehicleId)}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs cursor-pointer shadow-md glow-amber"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : "Confirm Assignment"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
