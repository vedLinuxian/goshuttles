"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
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
  Filter,
  X,
  ChevronRight,
  Eye,
  Info,
  Calendar,
  Wallet,
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

export interface UserItem {
  id: string;
  name: string | null;
  email: string | null;
  phone: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
  driverProfile?: {
    kycStatus: string;
    walletBalance: number;
    totalEarnings: number;
    isAvailable: boolean;
  } | null;
  _count: { bookings: number; assignedTrips: number; vehicles: number };
}

interface UsersClientProps {
  users: UserItem[];
  page: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  roleFilter: string;
  statusFilter: string;
  q: string;
  stats: {
    adminCount: number;
    driverCount: number;
    customerCount: number;
    disabledCount: number;
    totalUsers: number;
  };
  currentUserId: string;
}

type ModalState =
  | { type: "ROLE_CHANGE"; user: UserItem; newRole: Role }
  | { type: "TOGGLE_STATUS"; user: UserItem }
  | { type: "RESET_PASSWORD"; user: UserItem }
  | { type: "VIEW_DETAIL"; user: UserItem }
  | null;

export function UsersClient({
  users,
  page,
  totalPages,
  totalCount,
  pageSize,
  roleFilter,
  statusFilter,
  q,
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

    startTransition(async () => {
      try {
        if (activeModal.type === "ROLE_CHANGE") {
          const res = await updateUserRole(activeModal.user.id, activeModal.newRole);
          if (!res.success) throw new Error(res.error);
          setActiveModal(null);
          router.refresh();
        } else if (activeModal.type === "TOGGLE_STATUS") {
          const res = await toggleUserActiveStatus(activeModal.user.id, !activeModal.user.isActive);
          if (!res.success) throw new Error(res.error);
          setActiveModal(null);
          router.refresh();
        } else if (activeModal.type === "RESET_PASSWORD") {
          const res = await adminResetUserPasswordAction(
            activeModal.user.id,
            customPassword.trim() ? customPassword.trim() : undefined
          );
          if (!res.success) throw new Error(res.error);
          setResetSuccessData({
            password: res.newPassword!,
            userName: activeModal.user.name || activeModal.user.phone,
          });
        }
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : "Action failed. Please try again.");
      }
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const hasActiveFilters = Boolean(q || roleFilter || statusFilter || pageSize !== 20);

  return (
    <div className="mx-auto max-w-[1500px] space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            <Users className="h-7 w-7 text-amber-500" /> Users &amp; RBAC Control Center
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Manage system access, RBAC roles, driver profiles, security credentials, and non-destructive sandbox impersonation.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <Metric label="Admins" value={stats.adminCount} tone="text-indigo-400" />
          <Metric label="Drivers" value={stats.driverCount} tone="text-amber-500" />
          <Metric label="Customers" value={stats.customerCount} tone="text-emerald-400" />
          <Metric label="Disabled" value={stats.disabledCount} tone="text-rose-400" />
        </div>
      </div>

      {/* Advanced Filter Toolbar */}
      <form
        method="get"
        className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_160px_160px_130px_auto]"
      >
        <SearchBar placeholder="Search name, phone, or email..." className="min-w-0" debounceMs={0} navigateOnChange={false} />
        <Select name="role" defaultValue={roleFilter}>
          <option value="">All Roles</option>
          <option value="CUSTOMER">👤 Customer (Passenger)</option>
          <option value="DRIVER">🚘 Driver (Partner)</option>
          <option value="ADMIN">🛡️ Administrator</option>
        </Select>
        <Select name="status" defaultValue={statusFilter}>
          <option value="">All Statuses</option>
          <option value="ACTIVE">✅ Active Users</option>
          <option value="DISABLED">🚫 Disabled Accounts</option>
        </Select>
        <Select name="pageSize" defaultValue={String(pageSize)}>
          <option value="10">10 / page</option>
          <option value="20">20 / page</option>
          <option value="50">50 / page</option>
          <option value="100">100 / page</option>
        </Select>
        <div className="flex gap-2">
          <Button type="submit" className="h-11 w-full font-bold gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950">
            <Filter className="h-4 w-4" /> Filter
          </Button>
          {hasActiveFilters && (
            <Link
              href="/admin/users"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 px-3 text-xs font-bold text-slate-600 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              title="Reset filters"
            >
              <X className="h-4 w-4" />
            </Link>
          )}
        </div>
      </form>

      {/* Users Data Table */}
      {users.length === 0 ? (
        <Card variant="glass" className="p-12 text-center sm:p-16">
          <Users className="mx-auto h-12 w-12 text-slate-600" />
          <h2 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">No users match this filter</h2>
          <p className="mt-1 text-xs text-slate-500">Try adjusting your search term or role filters.</p>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left">
              <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/50">
                <tr>
                  <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">User Identity</th>
                  <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Contact Details</th>
                  <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">RBAC System Role</th>
                  <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Account Status</th>
                  <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Registered</th>
                  <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Actions &amp; Security</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                {users.map((u) => {
                  const isSelf = u.id === currentUserId;
                  return (
                    <tr key={u.id} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 font-extrabold text-xs text-slate-900 dark:text-white">
                          {u.name || "Unnamed User"}
                          {isSelf && (
                            <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                              You
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5 font-medium">
                          {u.role === "CUSTOMER" && `${u._count.bookings} bookings`}
                          {u.role === "DRIVER" && `${u._count.assignedTrips} trips • ${u._count.vehicles} vehicles`}
                          {u.role === "ADMIN" && "Full System Access"}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-xs">
                        <div className="font-mono font-bold text-slate-900 dark:text-slate-200">{u.phone}</div>
                        <div className="text-[11px] text-slate-500">{u.email || "No email"}</div>
                      </td>
                      <td className="px-5 py-4">
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
                          className="h-9 text-xs font-bold w-full bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                        >
                          <option value="CUSTOMER">👤 CUSTOMER</option>
                          <option value="DRIVER">🚘 DRIVER</option>
                          <option value="ADMIN">🛡️ ADMIN</option>
                        </Select>
                      </td>
                      <td className="px-5 py-4">
                        <Badge variant={u.isActive ? "success" : "destructive"}>
                          {u.isActive ? "Active" : "Disabled"}
                        </Badge>
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-500">
                        {new Date(u.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* LOGIN AS Sandbox Impersonation Button */}
                          {!isSelf && u.isActive && (
                            <a
                              href={`/api/auth/impersonate?userId=${u.id}`}
                              className="h-8 px-2.5 text-[11px] bg-indigo-600/15 hover:bg-indigo-600 text-indigo-400 hover:text-white border border-indigo-500/30 font-extrabold rounded-xl inline-flex items-center gap-1 cursor-pointer transition-all shadow-sm"
                              title={`View dashboard as ${u.name || u.role} (Non-destructive Sandbox)`}
                            >
                              <UserCheck className="h-3.5 w-3.5" /> Sandbox Login As
                            </a>
                          )}

                          {/* Detail Modal Button */}
                          <button
                            type="button"
                            onClick={() => setActiveModal({ type: "VIEW_DETAIL", user: u })}
                            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                            title="View User Details"
                          >
                            <Info className="h-3.5 w-3.5" />
                          </button>

                          {/* Reset Password Button */}
                          <Button
                            size="sm"
                            disabled={isPending}
                            onClick={() => {
                              setErrorMessage(null);
                              setResetSuccessData(null);
                              setCustomPassword("");
                              setActiveModal({ type: "RESET_PASSWORD", user: u });
                            }}
                            className="h-8 px-2 text-[11px] bg-amber-500/10 hover:bg-amber-500 text-amber-500 hover:text-slate-950 border border-amber-500/20 font-extrabold rounded-xl flex items-center gap-1 transition-all"
                            title="Reset Password"
                          >
                            <KeyRound className="h-3.5 w-3.5" /> Reset Pass
                          </Button>

                          {/* Account Status Toggle Button */}
                          <Button
                            size="sm"
                            disabled={isSelf || isPending}
                            onClick={() => {
                              setErrorMessage(null);
                              setActiveModal({ type: "TOGGLE_STATUS", user: u });
                            }}
                            variant={u.isActive ? "destructive" : "default"}
                            className="h-8 px-2 text-[11px] gap-1 font-extrabold rounded-xl cursor-pointer"
                          >
                            {u.isActive ? <UserX className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <PaginationControls page={page} totalPages={totalPages} total={totalCount} pageSize={pageSize} />

      {/* Role Change Modal */}
      <Dialog
        open={activeModal?.type === "ROLE_CHANGE"}
        onOpenChange={(open) => !open && setActiveModal(null)}
      >
        <DialogContent className="sm:max-w-md bg-[#0c101c] border-amber-500/30 text-white rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-amber-400 font-extrabold flex items-center gap-2">
              <Shield className="h-5 w-5" /> Change User RBAC Role
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-sm mt-1">
              Confirm role modification for{" "}
              <strong className="text-white">
                {activeModal?.type === "ROLE_CHANGE" && (activeModal.user.name || activeModal.user.phone)}
              </strong>
              .
            </DialogDescription>
          </DialogHeader>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold">
              {errorMessage}
            </div>
          )}

          <DialogFooter className="gap-2 mt-4">
            <Button variant="secondary" onClick={() => setActiveModal(null)} disabled={isPending}>
              Cancel
            </Button>
            <Button
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold gap-2"
              onClick={handleRunModalAction}
              disabled={isPending}
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm Role Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Toggle Status Modal */}
      <Dialog
        open={activeModal?.type === "TOGGLE_STATUS"}
        onOpenChange={(open) => !open && setActiveModal(null)}
      >
        <DialogContent className="sm:max-w-md bg-[#0c101c] border-rose-500/30 text-white rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-rose-400 font-extrabold flex items-center gap-2">
              {activeModal?.type === "TOGGLE_STATUS" && activeModal.user.isActive ? (
                <>
                  <UserX className="h-5 w-5" /> Disable User Account
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-5 w-5" /> Enable User Account
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-sm mt-1">
              {activeModal?.type === "TOGGLE_STATUS" && activeModal.user.isActive
                ? `Disabling this account will prevent ${activeModal.user.name || activeModal.user.phone} from logging into GoShuttles.`
                : `Enabling this account will restore access for ${activeModal?.type === "TOGGLE_STATUS" ? activeModal.user.name || activeModal.user.phone : ""}.`}
            </DialogDescription>
          </DialogHeader>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold">
              {errorMessage}
            </div>
          )}

          <DialogFooter className="gap-2 mt-4">
            <Button variant="secondary" onClick={() => setActiveModal(null)} disabled={isPending}>
              Cancel
            </Button>
            <Button
              variant={activeModal?.type === "TOGGLE_STATUS" && activeModal.user.isActive ? "destructive" : "default"}
              className="font-extrabold gap-2"
              onClick={handleRunModalAction}
              disabled={isPending}
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm Status Change"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Modal */}
      <Dialog
        open={activeModal?.type === "RESET_PASSWORD"}
        onOpenChange={(open) => {
          if (!open) {
            setActiveModal(null);
            setResetSuccessData(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md bg-[#0c101c] border-amber-500/30 text-white rounded-3xl p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-amber-400 font-extrabold flex items-center gap-2">
              <KeyRound className="h-5 w-5" /> Reset Security Credentials
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-sm mt-1">
              Generate or assign a new password for{" "}
              <strong className="text-white">
                {activeModal?.type === "RESET_PASSWORD" && (activeModal.user.name || activeModal.user.phone)}
              </strong>
              .
            </DialogDescription>
          </DialogHeader>

          {!resetSuccessData ? (
            <div className="space-y-4 my-2">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-300">New Password (Optional)</Label>
                <Input
                  type="text"
                  placeholder="Leave empty to auto-generate secure password..."
                  value={customPassword}
                  onChange={(e) => setCustomPassword(e.target.value)}
                  className="bg-slate-900 border-slate-800 text-white text-xs font-mono"
                />
                <p className="text-[11px] text-slate-500">
                  If left blank, a random 10-character password will be created.
                </p>
              </div>

              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold">
                  {errorMessage}
                </div>
              )}

              <DialogFooter className="gap-2 pt-2">
                <Button variant="secondary" onClick={() => setActiveModal(null)} disabled={isPending}>
                  Cancel
                </Button>
                <Button
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold gap-2"
                  onClick={handleRunModalAction}
                  disabled={isPending}
                >
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reset Password Now"}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4 my-2">
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-2 text-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto" />
                <p className="text-sm font-extrabold text-emerald-400">Password Reset Successful!</p>
                <p className="text-xs text-slate-300">
                  Credentials updated for <strong>{resetSuccessData.userName}</strong>.
                </p>
              </div>

              <div className="space-y-1.5 bg-slate-900 p-4 rounded-2xl border border-slate-800">
                <Label className="text-[10px] uppercase font-bold text-slate-400">New Password</Label>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-base font-black text-amber-400 tracking-wider">
                    {resetSuccessData.password}
                  </span>
                  <Button
                    size="sm"
                    onClick={() => copyToClipboard(resetSuccessData.password)}
                    className="bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 h-8 px-3 text-xs"
                  >
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} Copy
                  </Button>
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold"
                  onClick={() => {
                    setActiveModal(null);
                    setResetSuccessData(null);
                  }}
                >
                  Close &amp; Finish
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* User Detail Modal */}
      <Dialog
        open={activeModal?.type === "VIEW_DETAIL"}
        onOpenChange={(open) => !open && setActiveModal(null)}
      >
        <DialogContent className="sm:max-w-md bg-[#0c101c] border-slate-800 text-white rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-white font-extrabold flex items-center gap-2">
              <User className="h-5 w-5 text-amber-500" /> User Profile Summary
            </DialogTitle>
          </DialogHeader>

          {activeModal?.type === "VIEW_DETAIL" && (
            <div className="space-y-3 text-xs my-2">
              <DetailRow label="Full Name" value={activeModal.user.name || "Unnamed User"} />
              <DetailRow label="Phone Number" value={activeModal.user.phone} />
              <DetailRow label="Email Address" value={activeModal.user.email || "Not provided"} />
              <DetailRow label="Role" value={activeModal.user.role} />
              <DetailRow label="Account Status" value={activeModal.user.isActive ? "Active" : "Disabled"} />
              <DetailRow label="Registration Date" value={new Date(activeModal.user.createdAt).toLocaleDateString("en-IN", { dateStyle: "full" })} />
              
              {activeModal.user.driverProfile && (
                <div className="mt-3 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-2">
                  <p className="text-[10px] uppercase font-bold text-amber-400">Driver Partner Details</p>
                  <DetailRow label="KYC Status" value={activeModal.user.driverProfile.kycStatus} />
                  <DetailRow label="Wallet Balance" value={`₹${activeModal.user.driverProfile.walletBalance}`} />
                  <DetailRow label="Total Earnings" value={`₹${activeModal.user.driverProfile.totalEarnings}`} />
                </div>
              )}
            </div>
          )}

          <DialogFooter className="mt-2">
            <Button variant="secondary" onClick={() => setActiveModal(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
      <p className={`text-2xl font-black ${tone}`}>{value}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center border-b border-slate-800 pb-2">
      <span className="text-slate-400 font-medium">{label}</span>
      <span className="font-extrabold text-white">{value}</span>
    </div>
  );
}
