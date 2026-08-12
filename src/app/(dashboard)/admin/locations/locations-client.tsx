"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  MapPin,
  Pencil,
  Trash2,
  Plus,
  Zap,
  TrendingUp,
  Percent,
  Clock,
  ShieldCheck,
  Calculator,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Navigation,
  Compass,
  Building2,
  Route,
  Search,
  LayoutGrid,
  List,
  Eye,
  Info,
  XCircle,
  Loader2,
  ArrowLeftRight,
} from "lucide-react";
import {
  Card,
  Button,
  Badge,
  Input,
  Label,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  SortableHeader,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui";
import PaginationControls from "@/components/ui/pagination";
import { createLocation, updateLocation, deleteLocation, savePricingConfigAction } from "@/app/actions/location-actions";

export type LocationWithStats = {
  id: string;
  name: string;
  activeTripsFrom: number;
  activeTripsTo: number;
  totalTripsCount: number;
};

export type PricingConfigData = {
  id: string;
  surgeMultiplier: number;
  occupancyThreshold: number;
  commissionRate: number;
  surgeEnabled: boolean;
  seatLockTimeout: number;
};

interface LocationsClientProps {
  locations: LocationWithStats[];
  pricingConfig: PricingConfigData;
  page: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  sortField?: string;
  sortOrder?: "asc" | "desc";
}

export function LocationsClient({
  locations,
  pricingConfig: initialConfig,
  page,
  totalPages,
  totalCount,
  pageSize,
  sortField = "name",
  sortOrder = "asc",
}: LocationsClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // View Mode & Search State
  const [viewMode, setViewMode] = useState<"GRID" | "TABLE">("TABLE");
  const [searchQuery, setSearchQuery] = useState("");
  const [clientSortField, setClientSortField] = useState(sortField);
  const [clientSortOrder, setClientSortOrder] = useState<"asc" | "desc">(sortOrder);

  // Pricing Config Form State
  const [config, setConfig] = useState(initialConfig);
  const [configSuccess, setConfigSuccess] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);

  // Location Modal State
  const [activeModal, setActiveModal] = useState<"CREATE" | { type: "EDIT"; location: LocationWithStats } | { type: "DELETE"; location: LocationWithStats } | null>(null);
  const [locationName, setLocationName] = useState("");
  const [modalError, setModalError] = useState<string | null>(null);

  // Associated Trips View Modal
  const [viewingTripsLocation, setViewingTripsLocation] = useState<LocationWithStats | null>(null);

  // Fare Simulator State
  const [simOrigin, setSimOrigin] = useState(locations[0]?.name || "Lucknow (Alambagh Hub)");
  const [simDest, setSimDest] = useState(locations[1]?.name || "Ayodhya (Dham Terminal)");
  const [simBasePrice, setSimBasePrice] = useState("300");
  const [simOccupancy, setSimOccupancy] = useState("75");


  // Helper to extract clean terminal code (e.g., "Lucknow (Alambagh)" -> "LKO-ALB")
  const getTerminalCode = (name: string) => {
    const clean = name.replace(/[^a-zA-Z0-9\s]/g, "").trim();
    const parts = clean.split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0].slice(0, 3) + "-" + parts[1].slice(0, 3)).toUpperCase();
    }
    return clean.slice(0, 6).toUpperCase();
  };

  const handleSort = (field: string) => {
    if (clientSortField === field) {
      setClientSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setClientSortField(field);
      setClientSortOrder("asc");
    }
  };

  const filteredLocations = useMemo(() => {
    return locations.filter((l) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return l.name.toLowerCase().includes(q) || getTerminalCode(l.name).toLowerCase().includes(q);
    });
  }, [locations, searchQuery]);

  const sortedLocations = useMemo(() => {
    return [...filteredLocations].sort((a, b) => {
      const factor = clientSortOrder === "asc" ? 1 : -1;
      if (clientSortField === "name") {
        return a.name.localeCompare(b.name) * factor;
      }
      if (clientSortField === "activeTripsFrom") {
        return (a.activeTripsFrom - b.activeTripsFrom) * factor;
      }
      if (clientSortField === "totalTripsCount") {
        return (a.totalTripsCount - b.totalTripsCount) * factor;
      }
      return 0;
    });
  }, [filteredLocations, clientSortField, clientSortOrder]);

  const handleSaveConfig = () => {
    setConfigError(null);
    setConfigSuccess(false);

    startTransition(async () => {
      const res = await savePricingConfigAction({
        surgeMultiplier: Number(config.surgeMultiplier),
        occupancyThreshold: Number(config.occupancyThreshold),
        commissionRate: Number(config.commissionRate),
        seatLockTimeout: Number(config.seatLockTimeout),
        surgeEnabled: config.surgeEnabled,
      });

      if (!res.success) {
        setConfigError(res.error || "Failed to save pricing config.");
      } else {
        setConfigSuccess(true);
        setTimeout(() => setConfigSuccess(false), 3000);
        router.refresh();
      }
    });
  };

  const handleLocationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locationName.trim()) return;
    setModalError(null);

    startTransition(async () => {
      if (activeModal === "CREATE") {
        const res = await createLocation({ name: locationName.trim() });
        if (!res.success) {
          setModalError(res.error || "Failed to create location.");
          return;
        }
      } else if (typeof activeModal === "object" && activeModal?.type === "EDIT") {
        const res = await updateLocation({ locationId: activeModal.location.id, name: locationName.trim() });
        if (!res.success) {
          setModalError(res.error || "Failed to update location.");
          return;
        }
      }

      setActiveModal(null);
      setLocationName("");
      router.refresh();
    });
  };

  const handleDeleteLocation = async (id: string) => {
    setModalError(null);
    startTransition(async () => {
      const res = await deleteLocation(id);
      if (!res.success) {
        setModalError(res.error || "Failed to delete location.");
        return;
      }
      setActiveModal(null);
      router.refresh();
    });
  };

  // Fare Simulator Calculation
  const basePriceNum = Number(simBasePrice) || 350;
  const occupancyNum = (Number(simOccupancy) || 0) / 100;
  const isSurging = config.surgeEnabled && occupancyNum >= config.occupancyThreshold;
  const finalPrice = isSurging ? Math.round(basePriceNum * config.surgeMultiplier) : basePriceNum;
  const platformFee = Math.round(finalPrice * (config.commissionRate / 100));
  const driverPayout = finalPrice - platformFee;

  // Busiest location calculation
  const busiestLocation = useMemo(() => {
    if (locations.length === 0) return null;
    return locations.reduce((prev, current) => (prev.totalTripsCount > current.totalTripsCount ? prev : current), locations[0]);
  }, [locations]);

  return (
    <div className="mx-auto max-w-[1500px] space-y-8 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <MapPin className="h-7 w-7 text-amber-400 shrink-0" />
            Terminal Hubs &amp; Dynamic Fare Corridor Engine
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Manage intercity pickup/drop-off terminals, dynamic surge yield rules, commission splits, and seat lock timers.
          </p>
        </div>

        <Button
          type="button"
          onClick={() => {
            setLocationName("");
            setModalError(null);
            setActiveModal("CREATE");
          }}
          className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-5 h-11 rounded-xl shadow-lg glow-amber flex items-center gap-2 cursor-pointer transition-transform active:scale-95 self-start sm:self-auto text-xs"
        >
          <Plus className="h-4 w-4 stroke-[3]" />
          <span>+ Add New Terminal Hub</span>
        </Button>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card variant="glass" className="p-4 border-slate-800 bg-[#0c101c]/80 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Registered Terminals</p>
            <p className="text-2xl font-black text-white mt-1">{totalCount}</p>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">Active Route Hubs</p>
          </div>
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Building2 className="h-5 w-5" />
          </div>
        </Card>

        <Card variant="glass" className="p-4 border-slate-800 bg-[#0c101c]/80 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Departures</p>
            <p className="text-2xl font-black text-emerald-400 mt-1">
              {locations.reduce((acc, l) => acc + l.activeTripsFrom, 0)}
            </p>
            <p className="text-[10px] text-emerald-400 font-medium mt-0.5">Scheduled Outbound</p>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Navigation className="h-5 w-5" />
          </div>
        </Card>

        <Card variant="glass" className="p-4 border-slate-800 bg-[#0c101c]/80 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Corridor Connections</p>
            <p className="text-2xl font-black text-indigo-400 mt-1">
              {locations.reduce((acc, l) => acc + l.totalTripsCount, 0)}
            </p>
            <p className="text-[10px] text-indigo-400 font-medium mt-0.5">Total Connections</p>
          </div>
          <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Route className="h-5 w-5" />
          </div>
        </Card>

        <Card variant="glass" className="p-4 border-slate-800 bg-[#0c101c]/80 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Busiest Terminal</p>
            <p className="text-sm font-black text-amber-400 mt-1 truncate max-w-[120px]">
              {busiestLocation ? busiestLocation.name : "N/A"}
            </p>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">
              {busiestLocation ? `${busiestLocation.totalTripsCount} trips linked` : "No trips"}
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Compass className="h-5 w-5" />
          </div>
        </Card>
      </div>

      {/* 1. Dynamic Pricing & Surge Control Panel */}
      <Card variant="glass" className="border-amber-500/30 bg-[#0c101c]/90 p-5 sm:p-6 backdrop-blur-2xl shadow-2xl space-y-5 glow-amber">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-0.5 text-[11px] font-bold text-amber-400">
              <Zap className="h-3.5 w-3.5" />
              <span>Automated Dynamic Yield &amp; Surge Engine</span>
            </div>
            <h2 className="text-lg font-black text-white mt-1">Platform Revenue &amp; Dynamic Fare Parameters</h2>
          </div>

          <div className="flex items-center gap-2">
            {configSuccess && (
              <span className="text-xs font-extrabold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-xl border border-emerald-500/20 flex items-center gap-1.5 animate-pulse">
                <CheckCircle2 className="h-3.5 w-3.5" /> Parameters Saved!
              </span>
            )}
            <Button
              type="button"
              disabled={isPending}
              onClick={handleSaveConfig}
              className="bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-black px-5 h-9 rounded-xl text-xs shadow-md glow-amber cursor-pointer"
            >
              {isPending ? "Saving..." : "Save Pricing Rules"}
            </Button>
          </div>
        </div>

        {configError && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold">
            {configError}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Surge Toggle */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-slate-300">Dynamic Surge</Label>
              <Zap className={`h-4 w-4 ${config.surgeEnabled ? "text-amber-400" : "text-slate-600"}`} />
            </div>
            <button
              type="button"
              onClick={() => setConfig((c) => ({ ...c, surgeEnabled: !c.surgeEnabled }))}
              className={`w-full py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                config.surgeEnabled
                  ? "bg-amber-500 text-slate-950 border-amber-400 shadow-md"
                  : "bg-slate-800 text-slate-400 border-slate-700"
              }`}
            >
              {config.surgeEnabled ? "SURGE ACTIVE ON" : "SURGE DISABLED OFF"}
            </button>
          </div>

          {/* Surge Multiplier */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1.5">
            <Label htmlFor="surgeMultiplier" className="text-xs font-bold text-slate-300 flex items-center justify-between">
              <span>Surge Multiplier</span>
              <TrendingUp className="h-3.5 w-3.5 text-amber-400" />
            </Label>
            <Input
              id="surgeMultiplier"
              type="number"
              step="0.05"
              min="1.0"
              max="3.0"
              value={config.surgeMultiplier}
              onChange={(e) => setConfig((c) => ({ ...c, surgeMultiplier: Number(e.target.value) }))}
              className="h-10 bg-slate-950 border-slate-800 font-black text-amber-400 text-sm"
            />
            <span className="text-[10px] text-slate-500 block">e.g. 1.10 = +10% peak surge</span>
          </div>

          {/* Occupancy Threshold */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1.5">
            <Label htmlFor="occupancyThreshold" className="text-xs font-bold text-slate-300 flex items-center justify-between">
              <span>Occupancy Threshold</span>
              <Percent className="h-3.5 w-3.5 text-indigo-400" />
            </Label>
            <Input
              id="occupancyThreshold"
              type="number"
              step="0.05"
              min="0.1"
              max="1.0"
              value={config.occupancyThreshold}
              onChange={(e) => setConfig((c) => ({ ...c, occupancyThreshold: Number(e.target.value) }))}
              className="h-10 bg-slate-950 border-slate-800 font-black text-indigo-400 text-sm"
            />
            <span className="text-[10px] text-slate-500 block">Trigger surge at {Math.round(config.occupancyThreshold * 100)}% seats</span>
          </div>

          {/* Commission Rate */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1.5">
            <Label htmlFor="commissionRate" className="text-xs font-bold text-slate-300 flex items-center justify-between">
              <span>Platform Commission</span>
              <Percent className="h-3.5 w-3.5 text-emerald-400" />
            </Label>
            <Input
              id="commissionRate"
              type="number"
              step="0.5"
              min="0"
              max="30"
              value={config.commissionRate}
              onChange={(e) => setConfig((c) => ({ ...c, commissionRate: Number(e.target.value) }))}
              className="h-10 bg-slate-950 border-slate-800 font-black text-emerald-400 text-sm"
            />
            <span className="text-[10px] text-slate-500 block">{config.commissionRate}% platform share per fare</span>
          </div>

          {/* Seat Lock Timeout */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1.5">
            <Label htmlFor="seatLockTimeout" className="text-xs font-bold text-slate-300 flex items-center justify-between">
              <span>Seat Lock Expiry</span>
              <Clock className="h-3.5 w-3.5 text-amber-400" />
            </Label>
            <Input
              id="seatLockTimeout"
              type="number"
              step="1"
              min="1"
              max="15"
              value={config.seatLockTimeout}
              onChange={(e) => setConfig((c) => ({ ...c, seatLockTimeout: Number(e.target.value) }))}
              className="h-10 bg-slate-950 border-slate-800 font-black text-white text-sm"
            />
            <span className="text-[10px] text-slate-500 block">Atomic hold timeout in minutes</span>
          </div>
        </div>
      </Card>

      {/* 2. Interactive Route Fare & Commission Calculator */}
      <Card variant="glass" className="border-slate-800 bg-[#0c101c]/90 p-5 sm:p-6 backdrop-blur-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-amber-400" />
            <h3 className="text-base font-extrabold text-white">Interactive Corridor Fare &amp; Yield Simulator</h3>
          </div>
          <span className="text-[10px] font-mono text-slate-500">Live Yield Preview</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <Label className="text-xs font-bold text-slate-300">Base Fare (₹)</Label>
            <Input
              type="number"
              value={simBasePrice}
              onChange={(e) => setSimBasePrice(e.target.value)}
              className="h-10 bg-slate-900 border-slate-800 text-white font-extrabold text-xs"
            />
          </div>

          <div>
            <Label className="text-xs font-bold text-slate-300">Route Occupancy (%)</Label>
            <Input
              type="number"
              min="0"
              max="100"
              value={simOccupancy}
              onChange={(e) => setSimOccupancy(e.target.value)}
              className="h-10 bg-slate-900 border-slate-800 text-white font-extrabold text-xs"
            />
          </div>

          <div className="md:col-span-2 p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between text-xs">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Simulated Ticket Price</span>
              <span className="text-xl font-black text-amber-400">
                ₹{finalPrice} {isSurging && <span className="text-xs text-rose-400 font-bold">({config.surgeMultiplier}x Surge Active)</span>}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Platform Share ({config.commissionRate}%)</span>
              <span className="text-sm font-bold text-emerald-400">₹{platformFee}</span>
              <span className="text-[10px] text-slate-400 block font-medium">Driver Net: ₹{driverPayout}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* 3. Search & View Mode Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by hub name or terminal code..."
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

        <div className="flex items-center gap-3 self-end sm:self-auto">
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
        </div>
      </div>

      {/* 4. Terminal Hubs Content View */}
      {sortedLocations.length === 0 ? (
        <Card variant="glass" className="p-12 text-center text-slate-400 space-y-3">
          <MapPin className="h-12 w-12 mx-auto text-amber-500/40" />
          <p className="font-extrabold text-white text-base">
            {totalCount === 0 ? "No terminal hubs created yet." : "No terminal hubs match your search query."}
          </p>
          <p className="text-xs text-slate-400">Create terminal hubs to configure intercity departure routes.</p>
        </Card>
      ) : viewMode === "GRID" ? (
        /* GRID CARDS VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedLocations.map((l) => {
            const code = getTerminalCode(l.name);
            return (
              <Card
                key={l.id}
                variant="glass"
                className="p-5 space-y-4 border border-slate-800 bg-[#0c101c]/80 hover:border-slate-700 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-black shrink-0">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-white text-base">{l.name}</h3>
                      <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        {code}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Outbound Departures</span>
                    <span className="font-black text-amber-400 text-sm">{l.activeTripsFrom} Active</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Trips Linked</span>
                    <span className="font-black text-indigo-400 text-sm">{l.totalTripsCount} Trips</span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800 text-xs">
                  <button
                    type="button"
                    onClick={() => setViewingTripsLocation(l)}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Eye className="h-3.5 w-3.5 text-amber-400" /> View Connections
                  </button>

                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setLocationName(l.name);
                        setModalError(null);
                        setActiveModal({ type: "EDIT", location: l });
                      }}
                      className="h-8 px-2.5 text-xs font-bold text-slate-200 hover:text-amber-400 hover:bg-slate-800 rounded-lg cursor-pointer"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>

                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        setModalError(null);
                        setActiveModal({ type: "DELETE", location: l });
                      }}
                      className="h-8 px-2.5 text-xs font-bold rounded-lg cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <Card variant="glass" className="border-amber-500/20 bg-[#0c101c]/80 backdrop-blur-xl shadow-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-900/90 border-b border-slate-800">
                <TableRow className="hover:bg-transparent">
                  <SortableHeader
                    field="name"
                    title="Terminal Hub Name"
                    currentSortField={clientSortField}
                    currentSortOrder={clientSortOrder}
                    onSort={handleSort}
                  />
                  <TableCell className="text-xs font-bold text-slate-300">Terminal Code</TableCell>
                  <SortableHeader
                    field="activeTripsFrom"
                    title="Departing Outbound"
                    currentSortField={clientSortField}
                    currentSortOrder={clientSortOrder}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    field="totalTripsCount"
                    title="Total Corridor Connections"
                    currentSortField={clientSortField}
                    currentSortOrder={clientSortOrder}
                    onSort={handleSort}
                  />
                  <TableCell className="text-right text-xs font-bold text-slate-300">Actions</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-slate-800/60">
                {sortedLocations.map((l) => {
                  const code = getTerminalCode(l.name);
                  return (
                    <TableRow key={l.id} className="hover:bg-slate-900/60 transition-colors">
                      <TableCell className="py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-extrabold shrink-0">
                            <MapPin className="h-4.5 w-4.5" />
                          </div>
                          <span className="font-extrabold text-white text-sm">{l.name}</span>
                        </div>
                      </TableCell>

                      <TableCell className="py-3.5">
                        <span className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                          {code}
                        </span>
                      </TableCell>

                      <TableCell className="py-3.5">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                          {l.activeTripsFrom} Active Departures
                        </span>
                      </TableCell>

                      <TableCell className="py-3.5 text-xs text-slate-300 font-bold">
                        {l.totalTripsCount} total scheduled routes
                      </TableCell>

                      <TableCell className="py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setLocationName(l.name);
                              setModalError(null);
                              setActiveModal({ type: "EDIT", location: l });
                            }}
                            className="h-8 px-2.5 text-xs font-bold text-slate-200 hover:text-amber-400 hover:bg-slate-800 rounded-lg cursor-pointer"
                          >
                            <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                          </Button>

                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              setModalError(null);
                              setActiveModal({ type: "DELETE", location: l });
                            }}
                            className="h-8 px-2.5 text-xs font-bold rounded-lg cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Pagination Controls */}
      <PaginationControls
        page={page}
        totalPages={totalPages}
        total={totalCount}
        pageSize={pageSize}
      />

      {/* Modal Dialog for CREATE & EDIT & DELETE */}
      <Dialog open={Boolean(activeModal)} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="sm:max-w-md bg-[#0c101c] border-amber-500/30 text-white rounded-3xl p-6 shadow-2xl z-[99999]">
          {activeModal === "CREATE" && (
            <form onSubmit={handleLocationSubmit} className="space-y-4">
              <DialogHeader>
                <DialogTitle className="text-lg font-extrabold text-amber-400 flex items-center gap-2">
                  <Plus className="h-5 w-5" /> Add New Terminal Hub
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-400">
                  Register a new intercity pickup or drop-off location hub for route scheduling.
                </DialogDescription>
              </DialogHeader>

              {modalError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold">
                  {modalError}
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="locName" className="text-xs font-bold text-slate-300">Terminal / Hub Name *</Label>
                <Input
                  id="locName"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  placeholder="e.g. Lucknow (Alambagh Bus Stand Hub)"
                  required
                  className="h-11 bg-slate-900 border-slate-800 text-white font-bold text-sm"
                />
              </div>

              <DialogFooter className="gap-2 sm:gap-0 pt-2">
                <Button type="button" variant="secondary" onClick={() => setActiveModal(null)} disabled={isPending}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending || !locationName.trim()} className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs glow-amber">
                  {isPending ? "Creating..." : "Save Terminal"}
                </Button>
              </DialogFooter>
            </form>
          )}

          {typeof activeModal === "object" && activeModal?.type === "EDIT" && (
            <form onSubmit={handleLocationSubmit} className="space-y-4">
              <DialogHeader>
                <DialogTitle className="text-lg font-extrabold text-white flex items-center gap-2">
                  <Pencil className="h-5 w-5 text-amber-400" /> Edit Terminal Hub
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-400">
                  Update terminal location name for ID {activeModal.location.id.slice(0, 8)}...
                </DialogDescription>
              </DialogHeader>

              {modalError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold">
                  {modalError}
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="editLocName" className="text-xs font-bold text-slate-300">Terminal / Hub Name *</Label>
                <Input
                  id="editLocName"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  required
                  className="h-11 bg-slate-900 border-slate-800 text-white font-bold text-sm"
                />
              </div>

              <DialogFooter className="gap-2 sm:gap-0 pt-2">
                <Button type="button" variant="secondary" onClick={() => setActiveModal(null)} disabled={isPending}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending || !locationName.trim()} className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs glow-amber">
                  {isPending ? "Updating..." : "Update Terminal"}
                </Button>
              </DialogFooter>
            </form>
          )}

          {typeof activeModal === "object" && activeModal?.type === "DELETE" && (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle className="text-lg font-extrabold text-rose-400 flex items-center gap-2">
                  <Trash2 className="h-5 w-5" /> Delete Terminal Hub
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-300">
                  Are you sure you want to delete terminal hub <strong className="text-white">{activeModal.location.name}</strong>?
                </DialogDescription>
              </DialogHeader>

              {modalError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold">
                  {modalError}
                </div>
              )}

              <DialogFooter className="gap-2 sm:gap-0 pt-2">
                <Button type="button" variant="secondary" onClick={() => setActiveModal(null)} disabled={isPending}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={isPending}
                  onClick={() => handleDeleteLocation(activeModal.location.id)}
                  className="font-extrabold text-xs"
                >
                  {isPending ? "Deleting..." : "Confirm Delete"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Dialog for Viewing Terminal Connected Routes */}
      {viewingTripsLocation && (
        <Dialog open={!!viewingTripsLocation} onOpenChange={() => setViewingTripsLocation(null)}>
          <DialogContent className="max-w-md bg-[#0c101c] border-slate-800 text-white rounded-3xl p-6 shadow-2xl z-[99999]">
            <DialogHeader>
              <DialogTitle className="text-lg font-extrabold flex items-center gap-2 text-white">
                <Route className="h-5 w-5 text-amber-400" /> {viewingTripsLocation.name}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 pt-2 text-xs">
              <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-1.5">
                <div className="flex justify-between"><span className="text-slate-400">Outbound Departures:</span> <span className="font-extrabold text-amber-400">{viewingTripsLocation.activeTripsFrom} Trips</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Inbound Arrivals:</span> <span className="font-extrabold text-emerald-400">{viewingTripsLocation.activeTripsTo} Trips</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Total Route Connections:</span> <span className="font-extrabold text-white">{viewingTripsLocation.totalTripsCount} Trips</span></div>
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="secondary" size="sm" onClick={() => setViewingTripsLocation(null)}>
                  Close
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
