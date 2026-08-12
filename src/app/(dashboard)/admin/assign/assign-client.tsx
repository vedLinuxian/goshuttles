"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { assignVehicleToDriverAction, unassignVehicleAction } from "@/app/actions/vehicle-actions";
import { registerDriverAction, updateDriverDetailsAction, toggleUserActiveStatus } from "@/app/actions/user-actions";
import { updateDriverKycStatus } from "@/app/actions/profile-actions";
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
  UserPlus,
  Pencil,
  Eye,
  ShieldCheck,
  DollarSign,
  Wallet,
  Lock,
  Unlock,
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
  Input,
  Label,
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

  // Driver CRUD Modals State
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<DriverSerialized | null>(null);
  const [viewingDriver, setViewingDriver] = useState<DriverSerialized | null>(null);

  // Form inputs for Register Driver Modal
  const [regName, setRegName] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regLicense, setRegLicense] = useState("");
  const [regAadhaar, setRegAadhaar] = useState("");
  const [regKycStatus, setRegKycStatus] = useState<"APPROVED" | "PENDING">("APPROVED");

  // Form inputs for Edit Driver Modal
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editLicense, setEditLicense] = useState("");
  const [editAadhaar, setEditAadhaar] = useState("");
  const [editKycStatus, setEditKycStatus] = useState<"PENDING" | "APPROVED" | "REJECTED">("APPROVED");
  const [editWalletBalance, setEditWalletBalance] = useState("0");

  // Vehicle Link Modals
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

  // Action Handlers
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

  async function handleRegisterDriver(e: React.FormEvent) {
    e.preventDefault();
    if (!regName || !regPhone) return;
    setLoading(true);
    setResult(null);

    try {
      const res = await registerDriverAction({
        name: regName,
        phone: regPhone,
        licenseNumber: regLicense,
        aadhaarNumber: regAadhaar,
        kycStatus: regKycStatus,
      });

      if (res.success) {
        setResult({
          success: true,
          message: `Driver partner "${regName}" successfully registered.`,
        });
        setIsRegisterModalOpen(false);
        setRegName("");
        setRegPhone("");
        setRegLicense("");
        setRegAadhaar("");
        router.refresh();
      } else {
        setResult({ success: false, message: res.error || "Failed to register driver." });
      }
    } catch (err) {
      setResult({ success: false, message: err instanceof Error ? err.message : "Error registering driver." });
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateDriver(e: React.FormEvent) {
    e.preventDefault();
    if (!editingDriver) return;
    setLoading(true);
    setResult(null);

    try {
      const res = await updateDriverDetailsAction({
        driverId: editingDriver.id,
        name: editName,
        phone: editPhone,
        licenseNumber: editLicense,
        aadhaarNumber: editAadhaar,
        kycStatus: editKycStatus,
        walletBalance: Number(editWalletBalance) || 0,
      });

      if (res.success) {
        setResult({
          success: true,
          message: `Driver partner details updated successfully.`,
        });
        setEditingDriver(null);
        router.refresh();
      } else {
        setResult({ success: false, message: res.error || "Failed to update driver." });
      }
    } catch (err) {
      setResult({ success: false, message: err instanceof Error ? err.message : "Error updating driver." });
    } finally {
      setLoading(false);
    }
  }

  async function handleQuickKycChange(driverId: string, status: "APPROVED" | "PENDING" | "REJECTED") {
    setLoading(true);
    try {
      const res = await updateDriverKycStatus(driverId, status);
      if (res.success) {
        setResult({ success: true, message: `Driver KYC status set to ${status}.` });
        router.refresh();
      } else {
        setResult({ success: false, message: res.error || "Failed to update KYC status." });
      }
    } catch (err) {
      setResult({ success: false, message: err instanceof Error ? err.message : "Error updating KYC status." });
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleDriverActive(driverId: string, currentActive: boolean) {
    setLoading(true);
    try {
      const res = await toggleUserActiveStatus(driverId, !currentActive);
      if (res.success) {
        setResult({
          success: true,
          message: `Driver partner account ${!currentActive ? "activated" : "deactivated"}.`,
        });
        router.refresh();
      } else {
        setResult({ success: false, message: res.error || "Failed to update driver status." });
      }
    } catch (err) {
      setResult({ success: false, message: err instanceof Error ? err.message : "Error toggling status." });
    } finally {
      setLoading(false);
    }
  }

  const openEditModal = (driver: DriverSerialized) => {
    setEditingDriver(driver);
    setEditName(driver.name || "");
    setEditPhone(driver.phone || "");
    setEditLicense(driver.driverProfile?.licenseNumber || "");
    setEditAadhaar(driver.driverProfile?.aadhaarNumber || "");
    setEditKycStatus((driver.driverProfile?.kycStatus as "PENDING" | "APPROVED" | "REJECTED") || "APPROVED");
    setEditWalletBalance(String(driver.driverProfile?.walletBalance || 0));
  };

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
        d.driverProfile?.licenseNumber?.toLowerCase().includes(q) ||
        d.driverProfile?.aadhaarNumber?.toLowerCase().includes(q) ||
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
            Enforce strict single driver-to-vehicle pairing across your shuttle fleet with real-time CRUD controls.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            onClick={() => setIsRegisterModalOpen(true)}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs px-4 h-10 rounded-xl shadow-lg glow-amber flex items-center gap-2 cursor-pointer transition-transform active:scale-95"
          >
            <UserPlus className="h-4 w-4" />
            <span>+ Register Driver Partner</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => router.refresh()}
            className="border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-slate-300 text-xs font-semibold h-10"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
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
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">{utilizationRate}% Allocation Rate</p>
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
          /* GRID VIEW WITH FULL CRUD ACTIONS */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDrivers.map((driver) => {
              const assignedVehicle = driver.vehicles.length > 0 ? driver.vehicles[0] : null;
              const kyc = driver.driverProfile?.kycStatus || "PENDING";

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
                  {/* Top Bar: Driver Identity + KYC Badge + Status */}
                  <div className="flex items-start justify-between gap-2 border-b border-slate-800/80 pb-3">
                    <div>
                      <h3 className="font-extrabold text-white text-base flex items-center gap-2">
                        {driver.name || "Driver Partner"}
                        {!driver.isActive && (
                          <span className="text-[10px] bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded-full border border-rose-500/30 font-mono">
                            Suspended
                          </span>
                        )}
                      </h3>
                      <p className="text-xs font-mono text-slate-400 mt-0.5">{driver.phone}</p>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      {/* KYC Badge with quick action click */}
                      <button
                        type="button"
                        onClick={() =>
                          handleQuickKycChange(
                            driver.id,
                            kyc === "APPROVED" ? "PENDING" : "APPROVED"
                          )
                        }
                        title="Click to toggle KYC status"
                        className="cursor-pointer hover:opacity-80 transition-opacity"
                      >
                        <Badge variant={kyc === "APPROVED" ? "success" : kyc === "REJECTED" ? "destructive" : "warning"}>
                          {kyc}
                        </Badge>
                      </button>

                      {driver.driverProfile?.rating !== undefined && (
                        <span className="text-[10px] font-bold text-amber-400 flex items-center gap-1">
                          <Star className="h-3 w-3 fill-amber-400" /> {driver.driverProfile.rating.toFixed(1)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Driver Telemetry Badges */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">Wallet Balance</span>
                      <span className="font-black text-emerald-400 text-xs">₹{driver.driverProfile?.walletBalance || 0}</span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Earnings</span>
                      <span className="font-black text-amber-400 text-xs">₹{driver.driverProfile?.totalEarnings || 0}</span>
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

                  {/* Card CRUD Toolbar Action Buttons */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-xs">
                    <button
                      type="button"
                      onClick={() => setViewingDriver(driver)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Eye className="h-3.5 w-3.5 text-amber-400" /> View Profile
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => openEditModal(driver)}
                        className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-amber-400 transition-colors cursor-pointer"
                        title="Edit Driver Details"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleDriverActive(driver.id, driver.isActive)}
                        className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                          driver.isActive
                            ? "bg-slate-900 hover:bg-rose-950/40 border-slate-800 text-slate-400 hover:text-rose-400"
                            : "bg-emerald-950/30 border-emerald-500/30 text-emerald-400"
                        }`}
                        title={driver.isActive ? "Deactivate Driver Account" : "Activate Driver Account"}
                      >
                        {driver.isActive ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          /* TABLE VIEW WITH COMPLETE ACTION BUTTONS */
          <Card variant="glass" className="p-0 border-slate-800 bg-[#0c101c]/80 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/60 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Driver Partner</th>
                    <th className="py-3.5 px-4">Contact</th>
                    <th className="py-3.5 px-4">KYC &amp; Rating</th>
                    <th className="py-3.5 px-4">Wallet &amp; Earnings</th>
                    <th className="py-3.5 px-4">Assigned Vehicle</th>
                    <th className="py-3.5 px-4 text-center">Active Trips</th>
                    <th className="py-3.5 px-4 text-right">CRUD Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs font-semibold text-white">
                  {filteredDrivers.map((driver) => {
                    const assignedVehicle = driver.vehicles.length > 0 ? driver.vehicles[0] : null;
                    const kyc = driver.driverProfile?.kycStatus || "PENDING";

                    return (
                      <tr key={driver.id} className="hover:bg-slate-900/40 transition-colors">
                        <td className="py-3.5 px-4">
                          <div>
                            <p className="font-bold flex items-center gap-1.5">
                              {driver.name || "Driver Partner"}
                              {!driver.isActive && (
                                <span className="text-[9px] bg-rose-500/20 text-rose-400 px-1.5 py-0.2 rounded border border-rose-500/30">
                                  Off
                                </span>
                              )}
                            </p>
                            {driver.driverProfile?.licenseNumber && (
                              <p className="text-[10px] font-mono text-slate-500">Lic: {driver.driverProfile.licenseNumber}</p>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-400">{driver.phone}</td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                handleQuickKycChange(
                                  driver.id,
                                  kyc === "APPROVED" ? "PENDING" : "APPROVED"
                                )
                              }
                              title="Click to toggle KYC"
                              className="cursor-pointer"
                            >
                              <Badge variant={kyc === "APPROVED" ? "success" : kyc === "REJECTED" ? "destructive" : "warning"}>
                                {kyc}
                              </Badge>
                            </button>
                            {driver.driverProfile?.rating !== undefined && (
                              <span className="text-amber-400 font-bold flex items-center gap-0.5 text-[11px]">
                                ⭐ {driver.driverProfile.rating.toFixed(1)}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono">
                          <span className="text-emerald-400 font-bold">₹{driver.driverProfile?.walletBalance || 0}</span>
                          <span className="text-slate-500 text-[10px] block">Earned: ₹{driver.driverProfile?.totalEarnings || 0}</span>
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
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setViewingDriver(driver)}
                              title="View Telemetry Profile"
                              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-amber-400 border border-slate-800 transition-colors cursor-pointer"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => openEditModal(driver)}
                              title="Edit Driver Profile"
                              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-amber-400 border border-slate-800 transition-colors cursor-pointer"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>

                            {assignedVehicle ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setUnassigningVehicle({
                                    vehicleId: assignedVehicle.id,
                                    regNumber: assignedVehicle.regNumber,
                                    driverName: driver.name || "Driver",
                                  })
                                }
                                title="Unassign Vehicle"
                                className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors cursor-pointer"
                              >
                                <UserX className="h-3.5 w-3.5" />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setAssigningModalDriver(driver);
                                  setModalVehicleId("");
                                }}
                                title="Assign Vehicle"
                                className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-[11px] transition-all cursor-pointer shadow-md glow-amber flex items-center gap-1"
                              >
                                <Car className="h-3 w-3" /> Pair
                              </button>
                            )}
                          </div>
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

      {/* MODAL 1: Register New Driver Partner */}
      {isRegisterModalOpen && (
        <Dialog open={isRegisterModalOpen} onOpenChange={setIsRegisterModalOpen}>
          <DialogContent className="max-w-md bg-[#0c101c] border-amber-500/30 text-white rounded-3xl p-6 shadow-2xl glow-amber z-[99999]">
            <form onSubmit={handleRegisterDriver} className="space-y-4">
              <DialogHeader>
                <DialogTitle className="text-lg font-extrabold text-amber-400 flex items-center gap-2">
                  <UserPlus className="h-5 w-5" /> Register New Driver Partner
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-3">
                <div>
                  <Label className="text-xs font-bold text-slate-300">Driver Partner Name *</Label>
                  <Input
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="e.g. Ramesh Kumar"
                    className="h-10 bg-slate-900 border-slate-800 text-white font-bold text-xs"
                  />
                </div>

                <div>
                  <Label className="text-xs font-bold text-slate-300">Mobile Phone Number *</Label>
                  <Input
                    required
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="e.g. 9876543210"
                    className="h-10 bg-slate-900 border-slate-800 text-white font-mono text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-bold text-slate-300">Driving License #</Label>
                    <Input
                      value={regLicense}
                      onChange={(e) => setRegLicense(e.target.value)}
                      placeholder="DL-14201100..."
                      className="h-10 bg-slate-900 border-slate-800 text-white font-mono text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-bold text-slate-300">Aadhaar Card #</Label>
                    <Input
                      value={regAadhaar}
                      onChange={(e) => setRegAadhaar(e.target.value)}
                      placeholder="12-digit Aadhaar"
                      className="h-10 bg-slate-900 border-slate-800 text-white font-mono text-xs"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-bold text-slate-300">Initial KYC Status</Label>
                  <select
                    value={regKycStatus}
                    onChange={(e) => setRegKycStatus(e.target.value as "APPROVED" | "PENDING")}
                    className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-white outline-none focus:border-amber-500"
                  >
                    <option value="APPROVED">APPROVED (Ready for immediate dispatch)</option>
                    <option value="PENDING">PENDING (Awaiting document verification)</option>
                  </select>
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="secondary" size="sm" onClick={() => setIsRegisterModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs glow-amber">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : "Save Driver Partner"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* MODAL 2: Edit Driver Details */}
      {editingDriver && (
        <Dialog open={!!editingDriver} onOpenChange={() => setEditingDriver(null)}>
          <DialogContent className="max-w-md bg-[#0c101c] border-amber-500/30 text-white rounded-3xl p-6 shadow-2xl z-[99999]">
            <form onSubmit={handleUpdateDriver} className="space-y-4">
              <DialogHeader>
                <DialogTitle className="text-lg font-extrabold text-white flex items-center gap-2">
                  <Pencil className="h-5 w-5 text-amber-400" /> Edit Driver Profile &amp; KYC
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-3">
                <div>
                  <Label className="text-xs font-bold text-slate-300">Driver Partner Name</Label>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="h-10 bg-slate-900 border-slate-800 text-white font-bold text-xs"
                  />
                </div>

                <div>
                  <Label className="text-xs font-bold text-slate-300">Mobile Phone Number</Label>
                  <Input
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="h-10 bg-slate-900 border-slate-800 text-white font-mono text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-bold text-slate-300">License Number</Label>
                    <Input
                      value={editLicense}
                      onChange={(e) => setEditLicense(e.target.value)}
                      className="h-10 bg-slate-900 border-slate-800 text-white font-mono text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-bold text-slate-300">Aadhaar Number</Label>
                    <Input
                      value={editAadhaar}
                      onChange={(e) => setEditAadhaar(e.target.value)}
                      className="h-10 bg-slate-900 border-slate-800 text-white font-mono text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-bold text-slate-300">KYC Status</Label>
                    <select
                      value={editKycStatus}
                      onChange={(e) => setEditKycStatus(e.target.value as "PENDING" | "APPROVED" | "REJECTED")}
                      className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-white outline-none"
                    >
                      <option value="APPROVED">APPROVED</option>
                      <option value="PENDING">PENDING</option>
                      <option value="REJECTED">REJECTED</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs font-bold text-slate-300">Wallet Balance (₹)</Label>
                    <Input
                      type="number"
                      value={editWalletBalance}
                      onChange={(e) => setEditWalletBalance(e.target.value)}
                      className="h-10 bg-slate-900 border-slate-800 text-emerald-400 font-bold text-xs"
                    />
                  </div>
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="secondary" size="sm" onClick={() => setEditingDriver(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs glow-amber">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : "Update Driver"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* MODAL 3: View Driver Full Profile Telemetry */}
      {viewingDriver && (
        <Dialog open={!!viewingDriver} onOpenChange={() => setViewingDriver(null)}>
          <DialogContent className="max-w-md bg-[#0c101c] border-slate-800 text-white rounded-3xl p-6 shadow-2xl z-[99999]">
            <DialogHeader>
              <DialogTitle className="text-lg font-extrabold flex items-center gap-2 text-white">
                <Users className="h-5 w-5 text-amber-400" /> {viewingDriver.name || "Driver Partner"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 pt-2 text-xs">
              <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-1.5">
                <div className="flex justify-between"><span className="text-slate-400">Phone Mobile:</span> <span className="font-mono text-white font-bold">{viewingDriver.phone}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">KYC Status:</span> <Badge variant={viewingDriver.driverProfile?.kycStatus === "APPROVED" ? "success" : "warning"}>{viewingDriver.driverProfile?.kycStatus || "PENDING"}</Badge></div>
                <div className="flex justify-between"><span className="text-slate-400">Rating:</span> <span className="text-amber-400 font-bold">⭐ {(viewingDriver.driverProfile?.rating || 5).toFixed(1)}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">License Number:</span> <span className="font-mono text-slate-200">{viewingDriver.driverProfile?.licenseNumber || "N/A"}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Aadhaar Number:</span> <span className="font-mono text-slate-200">{viewingDriver.driverProfile?.aadhaarNumber || "N/A"}</span></div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Wallet Balance</span>
                  <span className="text-lg font-black text-emerald-400">₹{viewingDriver.driverProfile?.walletBalance || 0}</span>
                </div>
                <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Earnings</span>
                  <span className="text-lg font-black text-amber-400">₹{viewingDriver.driverProfile?.totalEarnings || 0}</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Assigned Vehicle</span>
                {viewingDriver.vehicles.length > 0 ? (
                  <div className="flex items-center gap-2">
                    <Car className="h-4 w-4 text-emerald-400" />
                    <span className="font-mono font-extrabold text-amber-400">{viewingDriver.vehicles[0].regNumber}</span>
                    <span className="text-slate-400">({viewingDriver.vehicles[0].modelName})</span>
                  </div>
                ) : (
                  <span className="text-slate-500 italic">No vehicle linked currently</span>
                )}
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="secondary" size="sm" onClick={() => setViewingDriver(null)}>
                  Close
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      )}

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
