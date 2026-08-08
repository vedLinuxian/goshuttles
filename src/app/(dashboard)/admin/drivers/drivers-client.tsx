"use client";

import { Users, CheckCircle2, XCircle, Eye } from "lucide-react";
import {
  Card,
  Button,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui";
import SearchBar from "@/components/ui/search-bar";
import PaginationControls from "@/components/ui/pagination";
import { approveKycForm, rejectKycForm } from "@/app/actions/form-actions";
import Link from "next/link";

interface DriverItem {
  id: string;
  name: string | null;
  phone: string | null;
  driverProfile: {
    id: string;
    kycStatus: string;
    fullName: string | null;
    aadhaarNumber: string | null;
    licenseNumber: string | null;
    rating: number | string;
    walletBalance: number | string;
    totalEarnings: number | string;
  } | null;
  _count: {
    assignedTrips: number;
    vehicles: number;
  };
}

interface DriversClientProps {
  drivers: DriverItem[];
  page: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
}

export function DriversClient({
  drivers,
  page,
  totalPages,
  totalCount,
  pageSize,
}: DriversClientProps) {
  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--foreground)] tracking-tight flex items-center gap-2.5">
            <Users className="h-7 w-7 text-amber-500" />
            Driver &amp; Operator Directory
          </h1>
          <p className="text-xs sm:text-sm text-[var(--muted-foreground)] mt-1">
            Review driver registrations, KYC compliance verification, performance ratings, and fleet assignments.
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 bg-[var(--card)] p-4 border border-[var(--border)] backdrop-blur-xl rounded-2xl shadow-sm">
        <SearchBar placeholder="Search by driver name or phone number..." className="flex-1" />
      </div>

      {/* Drivers View */}
      {drivers.length === 0 ? (
        <Card variant="glass" className="p-12 text-center text-[var(--muted-foreground)] space-y-3">
          <Users className="h-12 w-12 mx-auto text-amber-500/40" />
          <p className="font-extrabold text-[var(--foreground)] text-base">
            {totalCount === 0 ? "No driver partners registered yet." : "No drivers match your search query."}
          </p>
          <p className="text-xs text-[var(--muted-foreground)]">Registered shuttle drivers will appear here for KYC review.</p>
        </Card>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Driver Name</TableHead>
                  <TableHead className="w-[160px]">Phone</TableHead>
                  <TableHead className="w-[160px]">KYC Verification</TableHead>
                  <TableHead className="w-[120px]">Fleet</TableHead>
                  <TableHead className="w-[120px]">Trips</TableHead>
                  <TableHead className="w-[120px]">Rating</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {drivers.map((d) => {
                  const kyc = d.driverProfile?.kycStatus || "PENDING";
                  return (
                    <TableRow key={d.id}>
                      <TableCell className="font-bold text-xs text-[var(--foreground)]">
                        {d.name || "Driver Partner"}
                      </TableCell>
                      <TableCell className="font-mono text-[var(--foreground)] text-xs">
                        {d.phone || "N/A"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            kyc === "APPROVED"
                              ? "success"
                              : kyc === "REJECTED"
                              ? "destructive"
                              : "warning"
                          }
                        >
                          {kyc}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold text-xs text-[var(--muted-foreground)]">
                        {d._count.vehicles} vehicle(s)
                      </TableCell>
                      <TableCell className="font-semibold text-xs text-[var(--muted-foreground)]">
                        {d._count.assignedTrips} trips
                      </TableCell>
                      <TableCell className="font-bold text-xs text-amber-600 dark:text-amber-400">
                        {Number(d.driverProfile?.rating || 5).toFixed(1)} ★
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/admin/drivers/${d.id}`}
                            className="h-8 px-2.5 text-xs inline-flex items-center gap-1 border border-[var(--border)] hover:border-amber-500/50 text-[var(--foreground)] hover:text-amber-500 rounded-lg bg-[var(--muted)]/40 font-semibold transition-colors"
                          >
                            <Eye className="h-3.5 w-3.5" /> View Profile
                          </Link>

                          {d.driverProfile && d.driverProfile.kycStatus !== "APPROVED" && (
                            <form action={approveKycForm} className="inline">
                              <input type="hidden" name="driverUserId" value={d.id} />
                              <Button
                                type="submit"
                                size="sm"
                                className="h-8 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-1 rounded-lg cursor-pointer"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                              </Button>
                            </form>
                          )}

                          {d.driverProfile && d.driverProfile.kycStatus !== "REJECTED" && (
                            <form action={rejectKycForm} className="inline">
                              <input type="hidden" name="driverUserId" value={d.id} />
                              <Button
                                type="submit"
                                size="sm"
                                variant="destructive"
                                className="h-8 px-2.5 text-xs gap-1 rounded-lg cursor-pointer"
                              >
                                <XCircle className="h-3.5 w-3.5" /> Reject
                              </Button>
                            </form>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View */}
          <div className="grid gap-4 lg:hidden">
            {drivers.map((d) => {
              const kyc = d.driverProfile?.kycStatus || "PENDING";
              return (
                <div key={d.id} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm space-y-3">
                  <div className="flex items-start justify-between gap-2 border-b border-[var(--border)] pb-3">
                    <div>
                      <p className="text-sm font-black text-[var(--foreground)]">{d.name || "Driver Partner"}</p>
                      <p className="font-mono text-xs text-[var(--muted-foreground)] mt-0.5">{d.phone || "N/A"}</p>
                    </div>
                    <Badge
                      variant={
                        kyc === "APPROVED"
                          ? "success"
                          : kyc === "REJECTED"
                          ? "destructive"
                          : "warning"
                      }
                    >
                      {kyc}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <p className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase">Rating</p>
                      <p className="font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                        {Number(d.driverProfile?.rating || 5).toFixed(1)} ★
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase">Fleet</p>
                      <p className="font-semibold text-[var(--foreground)] mt-0.5">{d._count.vehicles} vehicle(s)</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase">Trips</p>
                      <p className="font-semibold text-[var(--foreground)] mt-0.5">{d._count.assignedTrips} trips</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border)]">
                    <Link
                      href={`/admin/drivers/${d.id}`}
                      className="h-8 px-2.5 text-xs inline-flex items-center gap-1 border border-[var(--border)] text-[var(--foreground)] hover:text-amber-500 rounded-lg bg-[var(--muted)]/40 font-semibold"
                    >
                      <Eye className="h-3.5 w-3.5" /> View Profile
                    </Link>

                    {d.driverProfile && d.driverProfile.kycStatus !== "APPROVED" && (
                      <form action={approveKycForm} className="inline">
                        <input type="hidden" name="driverUserId" value={d.id} />
                        <Button
                          type="submit"
                          size="sm"
                          className="h-8 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-1 rounded-lg"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                        </Button>
                      </form>
                    )}

                    {d.driverProfile && d.driverProfile.kycStatus !== "REJECTED" && (
                      <form action={rejectKycForm} className="inline">
                        <input type="hidden" name="driverUserId" value={d.id} />
                        <Button
                          type="submit"
                          size="sm"
                          variant="destructive"
                          className="h-8 px-2.5 text-xs gap-1 rounded-lg"
                        >
                          <XCircle className="h-3.5 w-3.5" /> Reject
                        </Button>
                      </form>
                    )}
                  </div>
                </div>
              );
            })}
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
