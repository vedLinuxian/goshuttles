"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { assignVehicleToDriverAction, unassignVehicleAction } from "@/app/actions/vehicle-actions";
import type { DriverSerialized, VehicleSerialized } from "./page";
import {
  Link2,
  Car,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  ArrowRight,
  XCircle,
  Loader2,
  Search,
  RefreshCw,
  UserX,
  LayoutGrid,
  List,
  Sparkles,
  Users,
  Star,
  Zap,
  Check,
  AlertTriangle,
  Info,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  SearchableSelect,
  type SearchableOption,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui";

interface AssignVehicleClientProps {
  drivers: DriverSerialized[];
  vehicles: VehicleSerialized[];
}

export function AssignVehicleClient({ drivers, vehicles }: AssignVehicleClientProps) {
  const router = useRouter();

  // Selection states for top quick-linker
  const [selectedDriverId, setSelectedDriverId] = useState<string>("");
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");

  // UI state
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"GRID" | "TABLE">("GRID");
  const [filterTab, setFilterTab] = useState<"ALL" | "UNASSIGNED" | "ASSIGNED" | "UNASSIGNED_VEHICLES">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  // Modal dialog states
  const [assigningModalDriver, setAssigningModalDriver] = useState<DriverSerialized | null>(null);
  const [modalVehicleId, setModalVehicleId] = useState<string>("");
  const [unassigningVehicle, setUnassigningVehicle] = useState<{ vehicleId: string; regNumber: string; driverName: string } | null>(null);

  // Stats calculations
  const totalDrivers = drivers.length;
  const pairedDrivers = drivers.filter((d) => d.vehicles.length > 0).length;
  const unassignedDrivers = drivers.filter((d) => d.vehicles.length === 0).length;
  const unassignedVehicles = vehicles.filter(
    (v) => !v.owner?.phone || !drivers.some((d) => d.id === v.ownerId)
  );
  const totalVehicles = vehicles.length;
  const utilizationRate = totalDrivers > 0 ? Math.round((pairedDrivers / totalDrivers) * 100) : 0;

  // Selected driver & vehicle objects for top quick linker
  const selectedDriver = useMemo(
    () => drivers.find((d) => d.id === selectedDriverId),
    [drivers, selectedDriverId]
  );

  const selectedVehicle = useMemo(
    () => vehicles.find((v) => v.id === selectedVehicleId),
    [vehicles, selectedVehicleId]
  );

  // Detect conflict: is selected vehicle currently linked to another driver?
  const vehicleCurrentOwner = useMemo(() => {
    if (!selectedVehicle) return null;
    return drivers.find((d) => d.id === selectedVehicle.ownerId);
  }, [selectedVehicle, drivers]);

  // Options for SearchableSelect
  const driverOptions: SearchableOption[] = useMemo(
    () =>
      drivers.map((d) => {
        const hasAssignedVehicle = d.vehicles.length > 0;
        const currentReg = hasAssignedVehicle ? d.vehicles[0].regNumber : null;
        return {
          value: d.id,
          label: d.name || "Driver Partner",
          description: `Phone: ${d.phone} · ${currentReg ? `Currently: ${currentReg}` : "Unassigned Fleet"}`,
          badge: hasAssignedVehicle ? `Linked: ${currentReg}` : "Available",
          icon: UserCheck,
        };
      }),
    [drivers]
  );

  const vehicleOptions: SearchableOption[] = useMemo(
    () =>
      vehicles.map((v) => {
        const isDriverOwned = v.owner?.phone && drivers.some((d) => d.id === v.ownerId);
        return {
          value: v.id,
          label: `${v.regNumber} — ${v.modelName}`,
          description: `${v.capacity} Seats (${v.fuelType}) · Owner: ${v.owner?.name || "Company Fleet"}`,
          badge: isDriverOwned ? `Assigned to: ${v.owner?.name || "Driver"}` : "Company Fleet",
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
        setModalVehicleId("");
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

  async function handleConfirmUnassign() {
    if (!unassigningVehicle) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await unassignVehicleAction(unassigningVehicle.vehicleId);
      if (res.success) {
        setResult({
          success: true,
          message: `Vehicle ${unassigningVehicle.regNumber} unassigned from ${unassigningVehicle.driverName} and returned to company fleet.`,
        });
        setUnassigningVehicle(null);
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
      setLoading(false);
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
        d.email?.toLowerCase().includes(q) ||
        d.vehicles.some((v) => v.regNumber.toLowerCase().includes(q) || v.modelName.toLowerCase().includes(q))
      );
    });
  }, [drivers, filterTab, searchQuery]);

  const filteredUnassignedVehicles = useMemo(() => {
    return unassignedVehicles.filter((v) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return v.regNumber.toLowerCase().includes(q) || v.modelName.toLowerCase().includes(q) || v.fuelType.toLowerCase().includes(q);
    });
  }, [unassignedVehicles, searchQuery]);

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pb-12">
      {/* Top Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Link2 className="h-7 w-7 text-amber-500 shrink-0" />
            1-to-1 Vehicle &amp; Driver Fleet Allocation
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Enforce strict single driver-to-vehicle pairing across your shuttle fleet with real-time telemetry.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => router.refresh()}
            className="border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-slate-300 text-xs font-semibold"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh Fleet Data
          </Button>
        </div>
      </div>

      {/* Stats KPI Overview Deck */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card variant="glass" className="p-4 border-slate-800/80 bg-[#0c101c]/80 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Drivers</p>
            <p className="text-2xl font-black text-white mt-1">{totalDrivers}</p>
            <p className="text-[10px] text-emerald-400 font-medium mt-0.5">
              {drivers.filter((d) => d.driverProfile?.kycStatus === "APPROVED").length} KYC Approved
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Users className="h-5 w-5" />
          </div>
        </Card>

        <Card variant="glass" className="p-4 border-slate-800/80 bg-[#0c101c]/80 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Paired Fleet</p>
            <p className="text-2xl font-black text-emerald-400 mt-1">{pairedDrivers}</p>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">1-to-1 Linked</p>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </Card>

        <Card variant="glass" className="p-4 border-slate-800/80 bg-[#0c101c]/80 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Unassigned Drivers</p>
            <p className="text-2xl font-black text-rose-400 mt-1">{unassignedDrivers}</p>
            <p className="text-[10px] text-rose-400/80 font-medium mt-0.5">Needs Vehicle Link</p>
          </div>
          <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
            <UserX className="h-5 w-5" />
          </div>
        </Card>

        <Card variant="glass" className="p-4 border-slate-800/80 bg-[#0c101c]/80 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Company Fleet Ready</p>
            <p className="text-2xl font-black text-amber-400 mt-1">{unassignedVehicles.length}</p>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">Available Shuttles</p>
          </div>
          <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <Car className="h-5 w-5" />
          </div>
        </Card>
      </div>

      {/* Result Alert Toast Banner */}
      {result && (
        <div
          className={`flex items-center justify-between p-4 rounded-2xl border text-xs font-bold shadow-lg transition-all animate-in fade-in ${
            result.success
              ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300"
              : "bg-rose-950/60 border-rose-500/40 text-rose-300"
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
          <button type="button" onClick={() => setResult(null)} className="hover:opacity-75 p-1">
            <XCircle className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Exclusive Policy Banner */}
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold flex items-center gap-3">
        <ShieldAlert className="h-5 w-5 shrink-0 text-amber-400" />
        <span>
          <strong>Exclusive Allocation Invariant:</strong> Every driver can be linked to exactly <strong>one</strong> active shuttle vehicle. Linking a vehicle already assigned to another driver automatically transfers the vehicle and releases the previous driver back to unassigned status.
        </span>
      </div>

      {/* Primary Assignment Hero Selector */}
      <Card variant="glass" className="p-6 border-slate-800 bg-[#0c101c]/90 shadow-2xl space-y-6 glow-amber">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <h2 className="text-xs font-extrabold text-amber-400 uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="h-4 w-4" /> Quick Fleet Pair Selector
          </h2>
          <span className="text-[10px] font-mono text-slate-500">Auto-validates 1:1 binding</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Driver Select */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <UserCheck className="h-3.5 w-3.5 text-amber-400" /> Target Driver Partner
            </label>
            <SearchableSelect
              options={driverOptions}
              value={selectedDriverId}
              onChange={setSelectedDriverId}
              placeholder="Search driver by name or mobile number..."
              searchPlaceholder="Type driver name or phone..."
            />
          </div>

          {/* Vehicle Select */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Car className="h-3.5 w-3.5 text-emerald-400" /> Target Shuttle Vehicle
            </label>
            <SearchableSelect
              options={vehicleOptions}
              value={selectedVehicleId}
              onChange={setSelectedVehicleId}
              placeholder="Search vehicle by reg number or model..."
              searchPlaceholder="Type reg number (e.g. UP32 AB 1234)..."
            />
          </div>
        </div>

        {/* Warning Conflict Banner if vehicle is owned by another driver */}
        {selectedVehicle && vehicleCurrentOwner && selectedDriverId !== vehicleCurrentOwner.id && (
          <div className="p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-3">
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
            <span>
              <strong>Vehicle Reassignment Conflict:</strong> Vehicle <strong>{selectedVehicle.regNumber}</strong> is currently assigned to <strong>{vehicleCurrentOwner.name || "another driver"}</strong>. Assigning it to <strong>{selectedDriver?.name || "selected driver"}</strong> will transfer ownership and unassign {vehicleCurrentOwner.name}.
            </span>
          </div>
        )}

        {/* Selected Pair Action Bar */}
        {selectedDriver && selectedVehicle && (
          <div className="p-4 rounded-2xl bg-slate-900 border border-amber-500/40 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 font-extrabold text-xs flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-amber-400" />
                {selectedDriver.name || "Driver"} ({selectedDriver.phone})
              </div>
              <ArrowRight className="h-4 w-4 text-amber-400 shrink-0" />
              <div className="px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono font-extrabold text-xs flex items-center gap-2">
                <Car className="h-4 w-4 text-emerald-400" />
                {selectedVehicle.regNumber} — {selectedVehicle.modelName} ({selectedVehicle.capacity} Seats)
              </div>
            </div>

            <Button
              type="button"
              disabled={loading}
              onClick={() => handleAssign()}
              className="w-full sm:w-auto bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs px-6 py-2.5 rounded-xl shadow-lg glow-amber cursor-pointer transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" /> Linking Vehicle...
                </>
              ) : (
                <>
                  <Link2 className="h-4 w-4 mr-1.5" /> Confirm 1:1 Link
                </>
              )}
            </Button>
          </div>
        )}
      </Card>

      {/* Directory & Fleet Tabs */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Tabs Filter Bar */}
          <div className="flex items-center p-1 rounded-2xl bg-slate-900/90 border border-slate-800 text-xs font-bold gap-1 flex-wrap">
            <button
              type="button"
              onClick={() => setFilterTab("ALL")}
              className={`px-3.5 py-2 rounded-xl transition-all ${
                filterTab === "ALL"
                  ? "bg-amber-500 text-slate-950 shadow-md"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              All Drivers ({totalDrivers})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab("UNASSIGNED")}
              className={`px-3.5 py-2 rounded-xl transition-all ${
                filterTab === "UNASSIGNED"
                  ? "bg-rose-500 text-white shadow-md"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              Unassigned Drivers ({unassignedDrivers})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab("ASSIGNED")}
              className={`px-3.5 py-2 rounded-xl transition-all ${
                filterTab === "ASSIGNED"
                  ? "bg-emerald-500 text-slate-950 shadow-md"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              Paired Drivers ({pairedDrivers})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab("UNASSIGNED_VEHICLES")}
              className={`px-3.5 py-2 rounded-xl transition-all ${
                filterTab === "UNASSIGNED_VEHICLES"
                  ? "bg-blue-500 text-white shadow-md"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              Available Shuttles ({unassignedVehicles.length})
            </button>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Filter Input */}
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search drivers or vehicles..."
                className="w-full pl-9 pr-4 py-2 bg-slate-900/90 border border-slate-800 rounded-xl text-xs font-semibold text-white placeholder:text-slate-500 outline-none focus:border-amber-500 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                >
                  <XCircle className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* View Mode Toggle Button */}
            {filterTab !== "UNASSIGNED_VEHICLES" && (
              <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-slate-800 text-slate-400">
                <button
                  type="button"
                  onClick={() => setViewMode("GRID")}
                  title="Grid View"
                  className={`p-1.5 rounded-lg transition-all ${
                    viewMode === "GRID" ? "bg-slate-800 text-amber-400 font-bold" : "hover:text-white"
                  }`}
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("TABLE")}
                  title="Table View"
                  className={`p-1.5 rounded-lg transition-all ${
                    viewMode === "TABLE" ? "bg-slate-800 text-amber-400 font-bold" : "hover:text-white"
                  }`}
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* TAB CONTENT: Available Shuttle Vehicles (Company Fleet) */}
        {filterTab === "UNASSIGNED_VEHICLES" ? (
          <div className="space-y-4">
            {filteredUnassignedVehicles.length === 0 ? (
              <Card variant="glass" className="p-8 text-center text-slate-400 text-xs font-semibold">
                No unassigned shuttle vehicles available in the company fleet matching search.
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredUnassignedVehicles.map((vehicle) => (
                  <Card
                    key={vehicle.id}
                    variant="glass"
                    className="p-5 space-y-4 border border-blue-500/20 bg-blue-950/10 hover:border-blue-500/40 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-mono font-extrabold text-blue-300 text-base flex items-center gap-2">
                          <Car className="h-4 w-4 text-blue-400" />
                          {vehicle.regNumber}
                        </h3>
                        <p className="text-xs text-slate-300 mt-0.5 font-medium">{vehicle.modelName}</p>
                      </div>
                      <Badge variant="outline" className="bg-blue-500/10 text-blue-300 border-blue-500/30">
                        {vehicle.vehicleType} · {vehicle.fuelType}
                      </Badge>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs">
                      <span className="text-slate-400">Capacity: <strong className="text-white">{vehicle.capacity} Seats</strong></span>
                      <span className="text-slate-400">Active Trips: <strong className="text-amber-400">{vehicle.activeTripCount}</strong></span>
                    </div>

                    <Button
                      type="button"
                      onClick={() => {
                        setSelectedVehicleId(vehicle.id);
                        setFilterTab("UNASSIGNED");
                      }}
                      className="w-full bg-blue-500 hover:bg-blue-400 text-slate-950 font-extrabold text-xs py-2 rounded-xl shadow-md cursor-pointer transition-all flex items-center justify-center gap-1.5"
                    >
                      <UserCheck className="h-3.5 w-3.5" /> Select for Driver Assignment
                    </Button>
                  </Card>
                ))}
              </div>
            )}
          </div>
        ) : filteredDrivers.length === 0 ? (
          <Card variant="glass" className="p-8 text-center text-slate-400 text-xs font-semibold">
            No driver partners match the current search or filter criteria.
          </Card>
        ) : viewMode === "GRID" ? (
          /* GRID VIEW */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDrivers.map((driver) => {
              const assignedVehicle = driver.vehicles.length > 0 ? driver.vehicles[0] : null;

              return (
                <Card
                  key={driver.id}
                  variant="glass"
                  className={`p-5 space-y-4 border transition-all ${
                    assignedVehicle
                      ? "border-emerald-500/30 bg-emerald-950/10 hover:border-emerald-500/50"
                      : "border-slate-800 bg-[#0c101c]/80 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-extrabold text-white text-base flex items-center gap-2">
                        {driver.name || "Driver Partner"}
                      </h3>
                      <p className="text-xs font-mono text-slate-400 mt-0.5">{driver.phone}</p>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <Badge variant={driver.driverProfile?.kycStatus === "APPROVED" ? "success" : "warning"}>
                        {driver.driverProfile?.kycStatus || "PENDING"}
                      </Badge>
                      {driver.driverProfile?.rating !== undefined && (
                        <span className="text-[10px] font-bold text-amber-400 flex items-center gap-1">
                          <Star className="h-3 w-3 fill-amber-400" /> {driver.driverProfile.rating.toFixed(1)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Vehicle Allocation Status Box */}
                  <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800/80 space-y-2">
                    <div className="flex items-center justify-between text-[10px] uppercase font-bold tracking-wider text-slate-400">
                      <span>Vehicle Allocation</span>
                      {driver.activeTripCount > 0 && (
                        <span className="text-amber-400 flex items-center gap-1">
                          <Zap className="h-3 w-3" /> {driver.activeTripCount} Active Trips
                        </span>
                      )}
                    </div>

                    {assignedVehicle ? (
                      <div className="space-y-2 pt-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-mono font-extrabold text-amber-400 text-sm flex items-center gap-1.5">
                              <Car className="h-4 w-4 text-emerald-400" />
                              {assignedVehicle.regNumber}
                            </p>
                            <p className="text-[11px] text-slate-300 font-medium">
                              {assignedVehicle.modelName} · {assignedVehicle.capacity} Seats ({assignedVehicle.fuelType})
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                          <button
                            type="button"
                            onClick={() => {
                              setAssigningModalDriver(driver);
                              setModalVehicleId(assignedVehicle.id);
                            }}
                            className="text-[11px] font-bold text-slate-400 hover:text-amber-400 underline underline-offset-2 transition-colors cursor-pointer"
                          >
                            Change Vehicle
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setUnassigningVehicle({
                                vehicleId: assignedVehicle.id,
                                regNumber: assignedVehicle.regNumber,
                                driverName: driver.name || "Driver",
                              })
                            }
                            className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <UserX className="h-3.5 w-3.5" /> Unassign
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-xs text-slate-500 italic flex items-center gap-1">
                          <Info className="h-3.5 w-3.5 text-slate-500" /> No vehicle linked
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setAssigningModalDriver(driver);
                            setModalVehicleId("");
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md glow-amber"
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
        ) : (
          /* TABLE VIEW */
          <Card variant="glass" className="p-0 border-slate-800 bg-[#0c101c]/80 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/60 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Driver Partner</th>
                    <th className="py-3.5 px-4">Contact</th>
                    <th className="py-3.5 px-4">KYC &amp; Rating</th>
                    <th className="py-3.5 px-4">Assigned Vehicle</th>
                    <th className="py-3.5 px-4 text-center">Active Trips</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs font-semibold text-white">
                  {filteredDrivers.map((driver) => {
                    const assignedVehicle = driver.vehicles.length > 0 ? driver.vehicles[0] : null;

                    return (
                      <tr key={driver.id} className="hover:bg-slate-900/40 transition-colors">
                        <td className="py-3.5 px-4 font-bold">{driver.name || "Driver Partner"}</td>
                        <td className="py-3.5 px-4 font-mono text-slate-400">{driver.phone}</td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <Badge variant={driver.driverProfile?.kycStatus === "APPROVED" ? "success" : "warning"}>
                              {driver.driverProfile?.kycStatus || "PENDING"}
                            </Badge>
                            {driver.driverProfile?.rating !== undefined && (
                              <span className="text-amber-400 font-bold flex items-center gap-0.5 text-[11px]">
                                ⭐ {driver.driverProfile.rating.toFixed(1)}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          {assignedVehicle ? (
                            <div className="flex items-center gap-2">
                              <Car className="h-4 w-4 text-emerald-400 shrink-0" />
                              <span className="font-mono font-extrabold text-amber-400">{assignedVehicle.regNumber}</span>
                              <span className="text-[11px] text-slate-400">({assignedVehicle.modelName})</span>
                            </div>
                          ) : (
                            <span className="text-slate-500 italic">Unassigned</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded-md font-mono text-xs ${driver.activeTripCount > 0 ? "bg-amber-500/10 text-amber-400 font-bold" : "text-slate-500"}`}>
                            {driver.activeTripCount}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {assignedVehicle ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setAssigningModalDriver(driver);
                                  setModalVehicleId(assignedVehicle.id);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold transition-colors cursor-pointer"
                              >
                                Change
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setUnassigningVehicle({
                                    vehicleId: assignedVehicle.id,
                                    regNumber: assignedVehicle.regNumber,
                                    driverName: driver.name || "Driver",
                                  })
                                }
                                className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-[11px] font-bold border border-rose-500/30 transition-colors cursor-pointer"
                              >
                                Unassign
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setAssigningModalDriver(driver);
                                setModalVehicleId("");
                              }}
                              className="px-3 py-1 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-[11px] transition-all cursor-pointer shadow-md glow-amber"
                            >
                              Assign Vehicle
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
        )}
      </div>

      {/* Quick Assign Vehicle Modal Dialog */}
      {assigningModalDriver && (
        <Dialog open={!!assigningModalDriver} onOpenChange={() => setAssigningModalDriver(null)}>
          <DialogContent className="max-w-md bg-[#0c101c] border-slate-800 text-white rounded-3xl p-6 shadow-2xl glow-amber z-[99999]">
            <DialogHeader>
              <DialogTitle className="text-lg font-extrabold flex items-center gap-2 text-white">
                <Car className="h-5 w-5 text-amber-400" /> Assign Shuttle to {assigningModalDriver.name}
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
                  value={modalVehicleId}
                  onChange={setModalVehicleId}
                  placeholder="Select vehicle from fleet..."
                  searchPlaceholder="Type reg number or model..."
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setAssigningModalDriver(null)}
                  className="bg-slate-900 hover:bg-slate-800 text-slate-300"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={loading || !modalVehicleId}
                  onClick={() => handleAssign(assigningModalDriver.id, modalVehicleId)}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs cursor-pointer shadow-md glow-amber"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : "Confirm Assignment"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Unassign Confirmation Modal */}
      {unassigningVehicle && (
        <Dialog open={!!unassigningVehicle} onOpenChange={() => setUnassigningVehicle(null)}>
          <DialogContent className="max-w-md bg-[#0c101c] border-slate-800 text-white rounded-3xl p-6 shadow-2xl z-[99999]">
            <DialogHeader>
              <DialogTitle className="text-lg font-extrabold flex items-center gap-2 text-rose-400">
                <UserX className="h-5 w-5 text-rose-400" /> Unassign Vehicle {unassigningVehicle.regNumber}?
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              <p className="text-xs text-slate-300">
                Are you sure you want to unassign vehicle <strong className="font-mono text-amber-400">{unassigningVehicle.regNumber}</strong> from driver <strong>{unassigningVehicle.driverName}</strong>?
              </p>
              <p className="text-xs text-slate-400">
                This vehicle will be returned to the unassigned company fleet pool.
              </p>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setUnassigningVehicle(null)}
                  className="bg-slate-900 hover:bg-slate-800 text-slate-300"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={loading}
                  onClick={handleConfirmUnassign}
                  className="bg-rose-500 hover:bg-rose-600 text-white font-extrabold text-xs cursor-pointer shadow-md"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : "Confirm Unassign"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
