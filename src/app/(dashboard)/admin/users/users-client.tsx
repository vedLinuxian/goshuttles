"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  UserX,
  FilterX,
  Phone,
  Mail,
  Shield,
  Search,
} from "lucide-react";
import {
  Card,
  Button,
  Badge,
  Select,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui";
import SearchBar from "@/components/ui/search-bar";
import PaginationControls from "@/components/ui/pagination";
import { updateUserRole, toggleUserActiveStatus } from "@/app/actions/user-actions";
type Role = "ADMIN" | "DRIVER" | "CUSTOMER";
import Link from "next/link";

interface UserItem {
  id: string;
  name: string | null;
  email: string | null;
  phone: string;
  role: Role;
  isActive: boolean;
  createdAt: Date;
  _count: { bookings: number; assignedTrips: number; vehicles: number };
}

interface UsersClientProps {
  users: UserItem[];
  page: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  roleFilter: string;
  stats: { adminCount: number; driverCount: number; customerCount: number; totalUsers: number };
  currentUserId: string;
}

type ModalState =
  | { type: "ROLE_CHANGE"; user: UserItem; newRole: Role }
  | { type: "TOGGLE_STATUS"; user: UserItem }
  | null;

export function UsersClient({
  users,
  page,
  totalPages,
  totalCount,
  pageSize,
  roleFilter,
  stats,
  currentUserId,
}: UsersClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeModal, setActiveModal] = useState<ModalState>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleRunModalAction = async () => {
    if (!activeModal) return;
    setErrorMessage(null);

    try {
      if (activeModal.type === "ROLE_CHANGE") {
        const res = await updateUserRole(activeModal.user.id, activeModal.newRole);
        if (!res.success) throw new Error(res.error || "Failed to update user role");
      } else if (activeModal.type === "TOGGLE_STATUS") {
        const res = await toggleUserActiveStatus(activeModal.user.id, !activeModal.user.isActive);
        if (!res.success) throw new Error(res.error || "Failed to update account status");
      }

      setActiveModal(null);
      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Operation failed.");
    }
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--foreground)] tracking-tight flex items-center gap-2.5">
            <ShieldCheck className="h-7 w-7 text-amber-500" />
            User Management &amp; Role Access (RBAC)
          </h1>
          <p className="text-xs sm:text-sm text-[var(--muted-foreground)] mt-1">
            Manage system roles, account active statuses, administrative privileges, and operational security access.
          </p>
        </div>
      </div>

      {/* Role Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-[var(--card)] border border-[var(--border)] p-4 rounded-2xl shadow-sm">
          <p className="text-[11px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">All Registered Users</p>
          <p className="text-2xl font-black text-[var(--foreground)] mt-1">{stats.totalUsers}</p>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] p-4 rounded-2xl shadow-sm">
          <p className="text-[11px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Admins</p>
          <p className="text-2xl font-black text-amber-500 mt-1">{stats.adminCount}</p>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] p-4 rounded-2xl shadow-sm">
          <p className="text-[11px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Driver Partners</p>
          <p className="text-2xl font-black text-indigo-500 mt-1">{stats.driverCount}</p>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] p-4 rounded-2xl shadow-sm">
          <p className="text-[11px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Passengers</p>
          <p className="text-2xl font-black text-emerald-500 mt-1">{stats.customerCount}</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 bg-[var(--card)] p-4 border border-[var(--border)] backdrop-blur-xl rounded-2xl shadow-sm">
        <SearchBar placeholder="Search by name, email address, or phone number..." className="flex-1" />
        <form className="flex gap-2">
          <Select
            name="role"
            defaultValue={roleFilter}
            onChange={(e) => (e.target.form as HTMLFormElement)?.requestSubmit()}
            className="w-full sm:w-48 text-xs font-semibold"
          >
            <option value="">All Roles</option>
            <option value="ADMIN">Admins Only</option>
            <option value="DRIVER">Drivers Only</option>
            <option value="CUSTOMER">Passengers Only</option>
          </Select>
        </form>
      </div>

      {/* Users View */}
      {users.length === 0 ? (
        <Card variant="glass" className="p-12 text-center text-[var(--muted-foreground)] space-y-3">
          <Users className="h-12 w-12 mx-auto text-amber-500/40" />
          <p className="font-extrabold text-[var(--foreground)] text-base">
            {totalCount === 0 ? "No users registered yet." : "No users match your filters."}
          </p>
          <p className="text-xs text-[var(--muted-foreground)]">Registered users will appear here for role administration.</p>
        </Card>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[240px]">User Details</TableHead>
                  <TableHead className="w-[200px]">Contact Info</TableHead>
                  <TableHead className="w-[180px]">RBAC Role</TableHead>
                  <TableHead className="w-[120px]">Status</TableHead>
                  <TableHead className="w-[140px]">Joined Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => {
                  const isSelf = u.id === currentUserId;
                  return (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="font-extrabold text-xs text-[var(--foreground)] flex items-center gap-2">
                          {u.name || "Unnamed User"}
                          {isSelf && (
                            <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                              You
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-[var(--muted-foreground)] mt-0.5">
                          {u.role === "CUSTOMER" && `${u._count.bookings} bookings`}
                          {u.role === "DRIVER" && `${u._count.assignedTrips} trips • ${u._count.vehicles} vehicles`}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="font-mono text-[var(--foreground)] font-bold">{u.phone}</div>
                        <div className="text-[11px] text-[var(--muted-foreground)]">{u.email || "No email"}</div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={u.role}
                          disabled={isSelf || isPending}
                          onChange={(e) =>
                            setActiveModal({
                              type: "ROLE_CHANGE",
                              user: u,
                              newRole: e.target.value as Role,
                            })
                          }
                          className="h-9 text-xs font-bold w-full"
                        >
                          <option value="CUSTOMER">CUSTOMER (Passenger)</option>
                          <option value="DRIVER">DRIVER (Partner)</option>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Badge variant={u.isActive ? "success" : "destructive"}>
                          {u.isActive ? "Active" : "Disabled"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs font-medium text-[var(--muted-foreground)]">
                        {new Date(u.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          disabled={isSelf || isPending}
                          onClick={() => setActiveModal({ type: "TOGGLE_STATUS", user: u })}
                          variant={u.isActive ? "destructive" : "default"}
                          className="h-8 px-3 text-xs gap-1 font-bold rounded-lg"
                        >
                          {u.isActive ? (
                            <>
                              <XCircle className="h-3.5 w-3.5" /> Disable
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="h-3.5 w-3.5" /> Enable
                            </>
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card List View */}
          <div className="grid gap-4 lg:hidden">
            {users.map((u) => {
              const isSelf = u.id === currentUserId;
              return (
                <div key={u.id} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm space-y-3">
                  <div className="flex items-start justify-between gap-2 border-b border-[var(--border)] pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-black text-[var(--foreground)]">{u.name || "Unnamed User"}</p>
                        {isSelf && (
                          <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                            You
                          </span>
                        )}
                      </div>
                      <p className="font-mono text-xs font-bold text-[var(--muted-foreground)] mt-0.5">{u.phone}</p>
                    </div>
                    <Badge variant={u.isActive ? "success" : "destructive"}>
                      {u.isActive ? "Active" : "Disabled"}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase">Role</p>
                      <Select
                        value={u.role}
                        disabled={isSelf || isPending}
                        onChange={(e) =>
                          setActiveModal({
                            type: "ROLE_CHANGE",
                            user: u,
                            newRole: e.target.value as Role,
                          })
                        }
                        className="h-8 text-xs font-bold w-full mt-1"
                      >
                        <option value="CUSTOMER">CUSTOMER</option>
                        <option value="DRIVER">DRIVER</option>
                      </Select>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase">Email</p>
                      <p className="text-xs font-semibold text-[var(--foreground)] mt-1 truncate">{u.email || "No email"}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
                    <span className="text-[10px] text-[var(--muted-foreground)]">
                      Joined {new Date(u.createdAt).toLocaleDateString("en-IN")}
                    </span>
                    <Button
                      size="sm"
                      disabled={isSelf || isPending}
                      onClick={() => setActiveModal({ type: "TOGGLE_STATUS", user: u })}
                      variant={u.isActive ? "destructive" : "default"}
                      className="h-8 px-3 text-xs gap-1 font-bold rounded-lg"
                    >
                      {u.isActive ? (
                        <>
                          <XCircle className="h-3.5 w-3.5" /> Disable
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5" /> Enable
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Pagination */}
      <PaginationControls page={page} totalPages={totalPages} total={totalCount} pageSize={pageSize} />

      {/* Action Dialog Modal */}
      <Dialog open={Boolean(activeModal)} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="sm:max-w-md">
          {activeModal?.type === "ROLE_CHANGE" && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                  <Shield className="h-5 w-5" /> Change User Role
                </DialogTitle>
                <DialogDescription>
                  Are you sure you want to change <strong>{activeModal.user.name || activeModal.user.phone}</strong>&apos;s role to{" "}
                  <strong>{activeModal.newRole}</strong>?
                </DialogDescription>
              </DialogHeader>
              {errorMessage && (
                <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-500">
                  {errorMessage}
                </div>
              )}
              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={() => setActiveModal(null)} disabled={isPending}>
                  Cancel
                </Button>
                <Button className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold" onClick={handleRunModalAction} disabled={isPending}>
                  {isPending ? "Updating..." : "Update Role"}
                </Button>
              </DialogFooter>
            </>
          )}

          {activeModal?.type === "TOGGLE_STATUS" && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                  {activeModal.user.isActive ? <XCircle className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
                  {activeModal.user.isActive ? "Deactivate User Account" : "Activate User Account"}
                </DialogTitle>
                <DialogDescription>
                  Are you sure you want to {activeModal.user.isActive ? "deactivate" : "enable"} the account for{" "}
                  <strong>{activeModal.user.name || activeModal.user.phone}</strong>?
                </DialogDescription>
              </DialogHeader>
              {errorMessage && (
                <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-500">
                  {errorMessage}
                </div>
              )}
              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={() => setActiveModal(null)} disabled={isPending}>
                  Cancel
                </Button>
                <Button
                  variant={activeModal.user.isActive ? "destructive" : "default"}
                  className="font-bold"
                  onClick={handleRunModalAction}
                  disabled={isPending}
                >
                  {isPending ? "Processing..." : activeModal.user.isActive ? "Deactivate" : "Activate"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
