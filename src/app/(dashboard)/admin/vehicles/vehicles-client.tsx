"use client";

import { useState } from "react";
import { Car, Plus, XCircle, CheckCircle2, Edit3, DollarSign } from "lucide-react";
import {
  Card,
  Button,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  SortableHeader
} from "@/components/ui";
import SearchBar from "@/components/ui/search-bar";
import PaginationControls from "@/components/ui/pagination";
import { toggleVehicleActiveForm } from "@/app/actions/form-actions";
import Link from "next/link";

interface VehicleItem {
  id: string;
  regNumber: string;
  modelName: string;
  vehicleType: string;
  capacity: number;
  isActive: boolean;
  owner: { name: string | null; phone: string | null };
}

interface VehiclesClientProps {
  vehicles: VehicleItem[];
  page: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  sortField?: string;
  sortOrder?: "asc" | "desc";
}

export function VehiclesClient({
  vehicles,
  page,
  totalPages,
  totalCount,
  pageSize,
  sortField = "regNumber",
  sortOrder = "asc",
}: VehiclesClientProps) {
  const [clientSortField, setClientSortField] = useState(sortField);
  const [clientSortOrder, setClientSortOrder] = useState<"asc" | "desc">(sortOrder);

  const handleSort = (field: string) => {
    if (clientSortField === field) {
      setClientSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setClientSortField(field);
      setClientSortOrder("asc");
    }
  };

  const sortedVehicles = [...vehicles].sort((a, b) => {
    const factor = clientSortOrder === "asc" ? 1 : -1;
    if (clientSortField === "regNumber") {
      return a.regNumber.localeCompare(b.regNumber) * factor;
    }
    if (clientSortField === "modelName") {
      return a.modelName.localeCompare(b.modelName) * factor;
    }
    if (clientSortField === "capacity") {
      return (a.capacity - b.capacity) * factor;
    }
    if (clientSortField === "owner") {
      const nameA = a.owner.name || "";
      const nameB = b.owner.name || "";
      return nameA.localeCompare(nameB) * factor;
    }
    if (clientSortField === "isActive") {
      return (a.isActive === b.isActive ? 0 : a.isActive ? -1 : 1) * factor;
    }
    return 0;
  });

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--foreground)] tracking-tight flex items-center gap-2.5">
            <Car className="h-7 w-7 text-amber-500" />
            Fleet &amp; Vehicle Registry
          </h1>
          <p className="text-xs sm:text-sm text-[var(--muted-foreground)] mt-1">
            Manage shuttle vehicle inventory, seating capacity, driver assignments, and active availability.
          </p>
        </div>

        {/* Dedicated Add Vehicle Button */}
        <Link
          href="/admin/vehicles/new"
          className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold inline-flex items-center gap-2 shadow-lg shadow-amber-500/10 text-xs py-2.5 px-4 rounded-xl transition-all self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          Add New Vehicle
        </Link>
      </div>

      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 bg-[var(--card)] p-4 border border-[var(--border)] backdrop-blur-xl rounded-2xl shadow-sm">
        <SearchBar placeholder="Search by registration number, vehicle model, or driver name..." className="flex-1" />
      </div>

      {/* Vehicles View */}
      {sortedVehicles.length === 0 ? (
        <Card variant="glass" className="p-12 text-center text-[var(--muted-foreground)] space-y-3">
          <Car className="h-12 w-12 mx-auto text-amber-500/40" />
          <p className="font-extrabold text-[var(--foreground)] text-base">
            {totalCount === 0 ? "No vehicles registered yet." : "No vehicles match your search query."}
          </p>
          <p className="text-xs text-[var(--muted-foreground)]">Register a new vehicle to make it available for trip dispatching.</p>
        </Card>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHeader
                    field="regNumber"
                    title="Registration"
                    currentSortField={clientSortField}
                    currentSortOrder={clientSortOrder}
                    onSort={handleSort}
                    className="w-[180px]"
                  />
                  <SortableHeader
                    field="modelName"
                    title="Model / Type"
                    currentSortField={clientSortField}
                    currentSortOrder={clientSortOrder}
                    onSort={handleSort}
                    className="w-[200px]"
                  />
                  <SortableHeader
                    field="capacity"
                    title="Capacity"
                    currentSortField={clientSortField}
                    currentSortOrder={clientSortOrder}
                    onSort={handleSort}
                    className="w-[140px]"
                  />
                  <SortableHeader
                    field="owner"
                    title="Assigned Owner"
                    currentSortField={clientSortField}
                    currentSortOrder={clientSortOrder}
                    onSort={handleSort}
                    className="w-[200px]"
                  />
                  <SortableHeader
                    field="isActive"
                    title="Status"
                    currentSortField={clientSortField}
                    currentSortOrder={clientSortOrder}
                    onSort={handleSort}
                    className="w-[120px]"
                  />
                  <TableCell className="text-right text-xs font-bold">Actions</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedVehicles.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell>
                      <span className="font-mono font-extrabold text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        {v.regNumber}
                      </span>
                    </TableCell>

                    <TableCell>
                      <span className="font-bold text-xs text-[var(--foreground)]">{v.modelName}</span>
                      <span className="text-[10px] text-[var(--muted-foreground)] block uppercase tracking-wider font-medium">{v.vehicleType}</span>
                    </TableCell>

                    <TableCell>
                      <span className="font-bold text-xs text-[var(--foreground)]">{v.capacity} Seats</span>
                    </TableCell>

                    <TableCell>
                      {v.owner.name ? (
                        <div>
                          <span className="font-bold text-xs text-[var(--foreground)]">{v.owner.name}</span>
                          {v.owner.phone && <span className="text-[10px] text-[var(--muted-foreground)] block">{v.owner.phone}</span>}
                        </div>
                      ) : (
                        <span className="text-xs text-[var(--muted-foreground)] italic">Unassigned</span>
                      )}
                    </TableCell>

                    <TableCell>
                      {v.isActive ? (
                        <Badge variant="success" className="gap-1 text-[10px]">
                          <CheckCircle2 className="h-3 w-3" /> Active
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="gap-1 text-[10px]">
                          <XCircle className="h-3 w-3" /> Deactivated
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/admin/vehicles/${v.id}/pricing`}
                          className="h-8 px-2.5 text-xs inline-flex items-center gap-1 border border-[var(--border)] hover:border-amber-500/50 text-[var(--foreground)] hover:text-amber-500 rounded-lg bg-[var(--muted)]/40 font-semibold transition-colors"
                        >
                          <DollarSign className="h-3.5 w-3.5" /> Pricing
                        </Link>
                        <Link
                          href={`/admin/vehicles/${v.id}/edit`}
                          className="h-8 px-2.5 text-xs inline-flex items-center gap-1 border border-[var(--border)] hover:border-amber-500/50 text-[var(--foreground)] hover:text-amber-500 rounded-lg bg-[var(--muted)]/40 font-semibold transition-colors"
                        >
                          <Edit3 className="h-3.5 w-3.5" /> Edit
                        </Link>

                        <form action={toggleVehicleActiveForm} className="inline">
                          <input type="hidden" name="vehicleId" value={v.id} />
                          <input type="hidden" name="currentActive" value={String(v.isActive)} />
                          <Button
                            type="submit"
                            size="sm"
                            variant={v.isActive ? "outline" : "secondary"}
                            className="h-8 px-2.5 text-xs font-semibold rounded-lg cursor-pointer"
                          >
                            {v.isActive ? "Deactivate" : "Activate"}
                          </Button>
                        </form>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile View */}
          <div className="grid gap-3 lg:hidden">
            {sortedVehicles.map((v) => (
              <div key={v.id} className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-black text-xs text-amber-500">{v.regNumber}</span>
                  {v.isActive ? (
                    <Badge variant="success" className="text-[10px]">Active</Badge>
                  ) : (
                    <Badge variant="destructive" className="text-[10px]">Deactivated</Badge>
                  )}
                </div>
                <div>
                  <p className="text-sm font-bold text-[var(--foreground)]">{v.modelName} ({v.capacity} Seats)</p>
                  <p className="text-xs text-[var(--muted-foreground)]">Owner: {v.owner.name || "Unassigned"}</p>
                </div>
                <div className="flex items-center gap-2 pt-2 border-t border-[var(--border)]">
                  <Link href={`/admin/vehicles/${v.id}/pricing`} className="text-xs text-amber-500 font-bold underline">Seat Pricing</Link>
                  <Link href={`/admin/vehicles/${v.id}/edit`} className="text-xs text-slate-300 font-bold underline">Edit Details</Link>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Pagination */}
      <PaginationControls
        page={page}
        totalPages={totalPages}
        total={totalCount}
        pageSize={pageSize}
      />
    </div>
  );
}
