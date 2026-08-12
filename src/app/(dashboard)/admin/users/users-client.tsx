"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  UserX,
  Phone,
  Mail,
  Shield,
  Search,
  KeyRound,
  Copy,
  Check,
  Loader2,
  Lock,
  Unlock,
  Car,
  User,
  Sparkles,
  RefreshCw,
  UserCheck,
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
  Input,
  Label,
} from "@/components/ui";
import SearchBar from "@/components/ui/search-bar";
import PaginationControls from "@/components/ui/pagination";
import { updateUserRole, toggleUserActiveStatus, adminResetUserPasswordAction } from "@/app/actions/user-actions";

type Role = "ADMIN" | "DRIVER" | "CUSTOMER";

interface UserItem {
  id: string;
  name: string | null;
  email: string | null;
  phone: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
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
  | { type: "RESET_PASSWORD"; user: UserItem }
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

  // Reset Password State
  const [customPassword, setCustomPassword] = useState("");
  const [resetSuccessData, setResetSuccessData] = useState<{ password: string; userName: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleRunModalAction = async () => {
    if (!activeModal) return;
    setErrorMessage(null);

    try {
      if (activeModal.type === "ROLE_CHANGE") {
        const res = await updateUserRole(activeModal.user.id, activeModal.newRole);
        if (!res.success) throw new Error(res.error || "Failed to update user role");
        setActiveModal(null);
      } else if (activeModal.type === "TOGGLE_STATUS") {
        const res = await toggleUserActiveStatus(activeModal.user.id, !activeModal.user.isActive);
        if (!res.success) throw new Error(res.error || "Failed to update account status");
        setActiveModal(null);
      } else if (activeModal.type === "RESET_PASSWORD") {
        const res = await adminResetUserPasswordAction(activeModal.user.id, customPassword);
        if (!res.success) throw new Error(res.error || "Failed to reset password");
        setResetSuccessData({
          password: res.newPassword || customPassword || "shuttle123",
          userName: activeModal.user.name || activeModal.user.phone,
        });
        setCustomPassword("");
      }

      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Operation failed.");
    }
  };

  const generateRandomPassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$";
    let pass = "GoShuttle@";
    for (let i = 0; i < 4; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCustomPassword(pass);
  };

  const handleCopyPassword = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <ShieldCheck className="h-7 w-7 text-amber-500 shrink-0" />
            User Access Control &amp; RBAC Directory
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Administer system account roles, reset passwords, toggle access statuses, and review security credentials.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => router.refresh()}
          className="border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-slate-300 text-xs font-semibold self-start sm:self-auto h-10"
        >
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh Directory
        </Button>
      </div>

      {/* Role Stats KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card variant="glass" className="p-4 border-slate-800 bg-[#0c101c]/80 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">All Users</p>
            <p className="text-2xl font-black text-white mt-1">{stats.totalUsers}</p>
          </div>
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Users className="h-5 w-5" />
          </div>
        </Card>

        <Card variant="glass" className="p-4 border-slate-800 bg-[#0c101c]/80 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Admins</p>
            <p className="text-2xl font-black text-amber-400 mt-1">{stats.adminCount}</p>
          </div>
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <ShieldCheck className="h-5 w-5" />
          </div>
        </Card>

        <Card variant="glass" className="p-4 border-slate-800 bg-[#0c101c]/80 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Driver Partners</p>
            <p className="text-2xl font-black text-indigo-400 mt-1">{stats.driverCount}</p>
          </div>
          <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Car className="h-5 w-5" />
          </div>
        </Card>

        <Card variant="glass" className="p-4 border-slate-800 bg-[#0c101c]/80 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Passengers</p>
            <p className="text-2xl font-black text-emerald-400 mt-1">{stats.customerCount}</p>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <User className="h-5 w-5" />
          </div>
        </Card>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 bg-[#0c101c]/90 p-4 border border-slate-800 backdrop-blur-xl rounded-2xl shadow-xl">
        <SearchBar placeholder="Search by name, email address, or phone number..." className="flex-1" />
        <form className="flex gap-2">
          <Select
            name="role"
            defaultValue={roleFilter}
            onChange={(e) => (e.target.form as HTMLFormElement)?.requestSubmit()}
            className="w-full sm:w-48 text-xs font-bold bg-slate-900 border-slate-800 text-white"
          >
            <option value="">All Roles</option>
            <option value="ADMIN">Admins Only</option>
            <option value="DRIVER">Drivers Only</option>
            <option value="CUSTOMER">Passengers Only</option>
          </Select>
        </form>
      </div>

      {/* Users Data View */}
      {users.length === 0 ? (
        <Card variant="glass" className="p-12 text-center text-slate-400 space-y-3">
          <Users className="h-12 w-12 mx-auto text-amber-500/40" />
          <p className="font-extrabold text-white text-base">
            {totalCount === 0 ? "No users registered yet." : "No users match your filters."}
          </p>
          <p className="text-xs text-slate-400">Registered users will appear here for role administration.</p>
        </Card>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden lg:block">
            <Card variant="glass" className="p-0 border-slate-800 bg-[#0c101c]/80 overflow-hidden shadow-xl">
              <Table>
                <TableHeader className="bg-slate-900/90 border-b border-slate-800">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[240px] text-xs font-bold text-slate-300">User Identity</TableHead>
                    <TableHead className="w-[200px] text-xs font-bold text-slate-300">Contact Details</TableHead>
                    <TableHead className="w-[180px] text-xs font-bold text-slate-300">RBAC System Role</TableHead>
                    <TableHead className="w-[120px] text-xs font-bold text-slate-300">Status</TableHead>
                    <TableHead className="w-[140px] text-xs font-bold text-slate-300">Registration Date</TableHead>
                    <TableHead className="text-right text-xs font-bold text-slate-300">Security &amp; Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-slate-800/60">
                  {users.map((u) => {
                    const isSelf = u.id === currentUserId;
                    return (
                      <TableRow key={u.id} className="hover:bg-slate-900/40 transition-colors">
                        <TableCell className="py-3.5">
                          <div className="font-extrabold text-xs text-white flex items-center gap-2">
                            {u.name || "Unnamed User"}
                            {isSelf && (
                              <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                                You
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                            {u.role === "CUSTOMER" && `${u._count.bookings} bookings`}
                            {u.role === "DRIVER" && `${u._count.assignedTrips} trips • ${u._count.vehicles} vehicles`}
                            {u.role === "ADMIN" && "Full System Access"}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs py-3.5">
                          <div className="font-mono text-slate-200 font-bold">{u.phone}</div>
                          <div className="text-[11px] text-slate-400">{u.email || "No email"}</div>
                        </TableCell>
                        <TableCell className="py-3.5">
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
                            className="h-9 text-xs font-bold w-full bg-slate-900 border-slate-800 text-white"
                          >
                            <option value="CUSTOMER">CUSTOMER (Passenger)</option>
                            <option value="DRIVER">DRIVER (Partner)</option>
                          </Select>
                        </TableCell>
                        <TableCell className="py-3.5">
                          <Badge variant={u.isActive ? "success" : "destructive"}>
                            {u.isActive ? "Active" : "Disabled"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs font-medium text-slate-400 py-3.5">
                          {new Date(u.createdAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </TableCell>
                        <TableCell className="text-right py-3.5">
                          <div className="flex items-center justify-end gap-2">
                            {/* Login As (Impersonate User) Button */}
                            {!isSelf && u.isActive && (
                              <a
                                href={`/api/auth/impersonate?userId=${u.id}`}
                                target="_blank"
                                rel="noreferrer"
                                className="h-8 px-2.5 text-[11px] bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 hover:text-white border border-indigo-500/30 font-extrabold rounded-lg inline-flex items-center gap-1 cursor-pointer transition-all shadow-sm"
                                title={`Login as ${u.name || u.role} in a new tab (Temporary Session)`}
                              >
                                <UserCheck className="h-3.5 w-3.5 text-indigo-400" /> Login As
                              </a>
                            )}

                            {/* Password Reset Action Button */}

                            <Button
                              size="sm"
                              disabled={isPending}
                              onClick={() => {
                                setErrorMessage(null);
                                setResetSuccessData(null);
                                setCustomPassword("");
                                setActiveModal({ type: "RESET_PASSWORD", user: u });
                              }}
                              className="h-8 px-2.5 text-[11px] bg-slate-900 hover:bg-slate-800 border border-slate-800 text-amber-400 font-bold rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                              title="Reset Password"
                            >
                              <KeyRound className="h-3.5 w-3.5 text-amber-400" /> Reset Password
                            </Button>

                            {/* Account Status Toggle Action Button */}
                            <Button
                              size="sm"
                              disabled={isSelf || isPending}
                              onClick={() => {
                                setErrorMessage(null);
                                setActiveModal({ type: "TOGGLE_STATUS", user: u });
                              }}
                              variant={u.isActive ? "destructive" : "default"}
                              className="h-8 px-2.5 text-[11px] gap-1 font-bold rounded-lg cursor-pointer"
                            >
                              {u.isActive ? (
                                <>
                                  <UserX className="h-3.5 w-3.5" /> Disable
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="h-3.5 w-3.5" /> Enable
                                </>
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          </div>

          {/* Mobile Card List View */}
          <div className="grid gap-4 lg:hidden">
            {users.map((u) => {
              const isSelf = u.id === currentUserId;
              return (
                <Card key={u.id} variant="glass" className="p-4 border-slate-800 bg-[#0c101c]/80 space-y-3">
                  <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-black text-white">{u.name || "Unnamed User"}</p>
                        {isSelf && (
                          <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                            You
                          </span>
                        )}
                      </div>
                      <p className="font-mono text-xs font-bold text-slate-400 mt-0.5">{u.phone}</p>
                    </div>
                    <Badge variant={u.isActive ? "success" : "destructive"}>
                      {u.isActive ? "Active" : "Disabled"}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Role</p>
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
                        className="h-8 text-xs font-bold w-full mt-1 bg-slate-900 border-slate-800 text-white"
                      >
                        <option value="CUSTOMER">CUSTOMER</option>
                        <option value="DRIVER">DRIVER</option>
                      </Select>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Email</p>
                      <p className="text-xs font-semibold text-white mt-1 truncate">{u.email || "No email"}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                    <span className="text-[10px] text-slate-400">
                      Joined {new Date(u.createdAt).toLocaleDateString("en-IN")}
                    </span>

                    <div className="flex items-center gap-2">
                      {!isSelf && u.isActive && (
                        <a
                          href={`/api/auth/impersonate?userId=${u.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="h-8 px-2.5 text-[11px] bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 hover:text-white border border-indigo-500/30 font-extrabold rounded-lg inline-flex items-center gap-1 cursor-pointer transition-all"
                          title={`Login as ${u.name || u.role} in a new tab`}
                        >
                          <UserCheck className="h-3.5 w-3.5" /> Login As
                        </a>
                      )}

                      <Button

                        size="sm"
                        disabled={isPending}
                        onClick={() => {
                          setErrorMessage(null);
                          setResetSuccessData(null);
                          setCustomPassword("");
                          setActiveModal({ type: "RESET_PASSWORD", user: u });
                        }}
                        className="h-8 px-2.5 text-[11px] bg-slate-900 border border-slate-800 text-amber-400 font-bold rounded-lg flex items-center gap-1"
                      >
                        <KeyRound className="h-3.5 w-3.5" /> Reset Pass
                      </Button>

                      <Button
                        size="sm"
                        disabled={isSelf || isPending}
                        onClick={() => {
                          setErrorMessage(null);
                          setActiveModal({ type: "TOGGLE_STATUS", user: u });
                        }}
                        variant={u.isActive ? "destructive" : "default"}
                        className="h-8 px-2.5 text-[11px] gap-1 font-bold rounded-lg"
                      >
                        {u.isActive ? "Disable" : "Enable"}
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* Pagination */}
      <PaginationControls page={page} totalPages={totalPages} total={totalCount} pageSize={pageSize} />

      {/* Action Dialog Modals */}
      <Dialog open={Boolean(activeModal)} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="sm:max-w-md bg-[#0c101c] border-amber-500/30 text-white rounded-3xl p-6 shadow-2xl z-[99999]">
          {/* 1. RESET PASSWORD MODAL */}
          {activeModal?.type === "RESET_PASSWORD" && (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-amber-400 text-lg font-extrabold">
                  <KeyRound className="h-5 w-5 text-amber-400" /> Reset User Password
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-400">
                  Set a new account login password for <strong>{activeModal.user.name || activeModal.user.phone}</strong> ({activeModal.user.phone}).
                </DialogDescription>
              </DialogHeader>

              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold">
                  {errorMessage}
                </div>
              )}

              {resetSuccessData ? (
                <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    <span>Password successfully updated for {resetSuccessData.userName}!</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-emerald-500/30 flex items-center justify-between font-mono text-sm font-extrabold">
                    <span>{resetSuccessData.password}</span>
                    <button
                      type="button"
                      onClick={() => handleCopyPassword(resetSuccessData.password)}
                      className="px-3 py-1 bg-emerald-500 text-slate-950 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-emerald-400 cursor-pointer"
                    >
                      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      {copied ? "Copied!" : "Copy"}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400">Share this new password securely with the user.</p>
                </div>
              ) : (
                <div className="space-y-3 pt-1">
                  <div>
                    <Label className="text-xs font-bold text-slate-300">New Password *</Label>
                    <div className="relative mt-1">
                      <Input
                        type="text"
                        value={customPassword}
                        onChange={(e) => setCustomPassword(e.target.value)}
                        placeholder="Enter new password or click Generate..."
                        className="h-10 bg-slate-900 border-slate-800 text-white font-mono text-xs pr-24"
                      />
                      <button
                        type="button"
                        onClick={generateRandomPassword}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-lg text-[11px] font-bold hover:bg-amber-500/20"
                      >
                        <Sparkles className="h-3 w-3 inline mr-1" /> Auto
                      </button>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500">
                    If left blank, password will default to <code className="text-amber-400 font-mono">shuttle123</code>.
                  </p>
                </div>
              )}

              <DialogFooter className="gap-2 sm:gap-0 pt-2">
                <Button type="button" variant="secondary" onClick={() => setActiveModal(null)}>
                  {resetSuccessData ? "Close" : "Cancel"}
                </Button>
                {!resetSuccessData && (
                  <Button
                    type="button"
                    disabled={isPending}
                    onClick={handleRunModalAction}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs glow-amber cursor-pointer"
                  >
                    {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : "Confirm Reset Password"}
                  </Button>
                )}
              </DialogFooter>
            </div>
          )}

          {/* 2. ROLE CHANGE MODAL */}
          {activeModal?.type === "ROLE_CHANGE" && (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-amber-400 text-lg font-extrabold">
                  <Shield className="h-5 w-5" /> Change User Role
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-400">
                  Are you sure you want to change <strong>{activeModal.user.name || activeModal.user.phone}</strong>&apos;s system role to{" "}
                  <strong className="text-amber-400">{activeModal.newRole}</strong>?
                </DialogDescription>
              </DialogHeader>
              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold">
                  {errorMessage}
                </div>
              )}
              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="secondary" onClick={() => setActiveModal(null)} disabled={isPending}>
                  Cancel
                </Button>
                <Button className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs glow-amber" onClick={handleRunModalAction} disabled={isPending}>
                  {isPending ? "Updating..." : "Update Role"}
                </Button>
              </DialogFooter>
            </div>
          )}

          {/* 3. TOGGLE STATUS MODAL */}
          {activeModal?.type === "TOGGLE_STATUS" && (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-rose-400 text-lg font-extrabold">
                  {activeModal.user.isActive ? <UserX className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5 text-emerald-400" />}
                  {activeModal.user.isActive ? "Disable User Account" : "Enable User Account"}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-400">
                  Are you sure you want to {activeModal.user.isActive ? "deactivate" : "enable"} the account for{" "}
                  <strong className="text-white">{activeModal.user.name || activeModal.user.phone}</strong>?
                </DialogDescription>
              </DialogHeader>
              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold">
                  {errorMessage}
                </div>
              )}
              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="secondary" onClick={() => setActiveModal(null)} disabled={isPending}>
                  Cancel
                </Button>
                <Button
                  variant={activeModal.user.isActive ? "destructive" : "default"}
                  className="font-extrabold text-xs"
                  onClick={handleRunModalAction}
                  disabled={isPending}
                >
                  {isPending ? "Processing..." : activeModal.user.isActive ? "Deactivate" : "Enable"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
