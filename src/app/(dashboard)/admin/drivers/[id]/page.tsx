import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { approveKycForm, rejectKycForm } from "@/app/actions/form-actions";
import Link from "next/link";
import { Users, ShieldCheck, CheckCircle2, XCircle, ArrowLeft, Phone, Wallet, Car, Star } from "lucide-react";

export default async function DriverDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login");

  const { id } = await params;
  const driver = await db.user.findUnique({
    where: { id, role: "DRIVER" },
    include: {
      driverProfile: true,
      vehicles: true,
      assignedTrips: {
        include: { source: true, destination: true },
        take: 5,
        orderBy: { startTime: "desc" },
      },
    },
  });

  if (!driver) redirect("/admin/drivers");

  const profile = driver.driverProfile;
  const kycStatus = profile?.kycStatus || "PENDING";

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <Link
        href="/admin/drivers"
        className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Driver Registry
      </Link>

      <div className="bg-white dark:bg-[#0e131f] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-8 shadow-xl space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800/80">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center font-black text-xl">
              {driver.name?.charAt(0)?.toUpperCase() || "D"}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  {driver.name || "Driver Partner"}
                </h1>
                <span
                  className={`badge ${
                    kycStatus === "APPROVED"
                      ? "badge-success"
                      : kycStatus === "REJECTED"
                      ? "badge-danger"
                      : "badge-warning"
                  }`}
                >
                  {kycStatus}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                <Phone className="h-3.5 w-3.5" /> {driver.phone || "No Phone Registered"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {kycStatus !== "APPROVED" && (
              <form action={approveKycForm}>
                <input type="hidden" name="driverUserId" value={driver.id} />
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="h-4 w-4" /> Approve KYC
                </button>
              </form>
            )}
            {kycStatus !== "REJECTED" && (
              <form action={rejectKycForm}>
                <input type="hidden" name="driverUserId" value={driver.id} />
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-2 cursor-pointer"
                >
                  <XCircle className="h-4 w-4" /> Reject KYC
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Credentials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-50 dark:bg-[#060911] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 space-y-4">
            <h3 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-amber-500" /> Identity Credentials
            </h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-800/60">
                <span className="text-slate-500">Legal Name</span>
                <span className="font-bold text-slate-900 dark:text-white">{profile?.fullName || driver.name || "N/A"}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-800/60">
                <span className="text-slate-500">Aadhaar Card Number</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">{profile?.aadhaarNumber || "Not Provided"}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-500">Driving License Number</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">{profile?.licenseNumber || "Not Provided"}</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-[#060911] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 space-y-4">
            <h3 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Wallet className="h-4 w-4 text-emerald-500" /> Financial &amp; Performance
            </h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-800/60">
                <span className="text-slate-500">Wallet Balance</span>
                <span className="font-bold text-amber-500 text-sm">₹{Number(profile?.walletBalance || 0).toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-800/60">
                <span className="text-slate-500">Total All-Time Earnings</span>
                <span className="font-bold text-slate-900 dark:text-white">₹{Number(profile?.totalEarnings || 0).toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-500">Driver Performance Rating</span>
                <span className="font-bold text-amber-500 flex items-center gap-1">
                  {Number(profile?.rating || 5).toFixed(1)} <Star className="h-3.5 w-3.5 fill-amber-500" />
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Assigned Vehicles */}
        <div className="space-y-4">
          <h3 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Car className="h-4 w-4 text-indigo-500" /> Assigned Vehicles ({driver.vehicles.length})
          </h3>
          {driver.vehicles.length === 0 ? (
            <p className="text-xs text-slate-500 italic">No vehicles assigned to this driver yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {driver.vehicles.map((v) => (
                <div key={v.id} className="bg-slate-50 dark:bg-[#060911] border border-slate-200 dark:border-slate-800/80 p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="font-mono font-extrabold text-xs text-amber-500">{v.regNumber}</p>
                    <p className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">{v.modelName}</p>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500">{v.capacity} Seats</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
