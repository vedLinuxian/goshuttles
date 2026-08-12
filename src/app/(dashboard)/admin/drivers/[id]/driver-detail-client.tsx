"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Phone,
  Wallet,
  Car,
  Star,
  Edit3,
  Plus,
} from "lucide-react";
import { approveKycForm, rejectKycForm } from "@/app/actions/form-actions";
import { EditDriverModal } from "../edit-driver-modal";

interface Vehicle {
  id: string;
  regNumber: string;
  modelName: string;
  capacity: number;
}

interface AssignedTrip {
  id: string;
  startTime: Date | string;
  source: { name: string };
  destination: { name: string };
  status: string;
}

interface DriverDetailData {
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
  vehicles: Vehicle[];
  assignedTrips: AssignedTrip[];
}

export function DriverDetailClient({ driver }: { driver: DriverDetailData }) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const profile = driver.driverProfile;
  const kycStatus = profile?.kycStatus || "PENDING";

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Edit Modal */}
      {isEditOpen && (
        <EditDriverModal
          driver={driver}
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
        />
      )}

      <Link
        href="/admin/drivers"
        className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Driver Directory
      </Link>

      <div className="bg-white dark:bg-[#0e131f] border border-slate-200 dark:border-slate-800/80 rounded-3xl p-8 shadow-2xl space-y-8">
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
                  className={`px-3 py-1 rounded-full text-xs font-extrabold border ${
                    kycStatus === "APPROVED"
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                      : kycStatus === "REJECTED"
                      ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                      : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                  }`}
                >
                  {kycStatus}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2 font-mono">
                <Phone className="h-3.5 w-3.5" /> {driver.phone || "No Phone Registered"}
              </p>
            </div>
          </div>

          {/* Icon-Only Command Buttons with Tooltips */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsEditOpen(true)}
              title="Edit Driver Profile Details"
              className="p-2.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-all cursor-pointer shadow-sm"
            >
              <Edit3 className="h-4 w-4" />
            </button>

            {kycStatus !== "APPROVED" && (
              <form action={approveKycForm}>
                <input type="hidden" name="driverUserId" value={driver.id} />
                <button
                  type="submit"
                  title="Approve Driver KYC Verification"
                  className="p-2.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all cursor-pointer shadow-sm"
                >
                  <CheckCircle2 className="h-4 w-4" />
                </button>
              </form>
            )}

            {kycStatus !== "REJECTED" && (
              <form action={rejectKycForm}>
                <input type="hidden" name="driverUserId" value={driver.id} />
                <button
                  type="submit"
                  title="Reject Driver KYC Verification"
                  className="p-2.5 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-all cursor-pointer shadow-sm"
                >
                  <XCircle className="h-4 w-4" />
                </button>
              </form>
            )}

            <Link
              href="/admin/assign"
              title="Assign New Shuttle Vehicle to Driver"
              className="p-2.5 rounded-2xl border border-slate-700 bg-slate-900 text-slate-300 hover:text-white hover:border-amber-500/50 transition-all cursor-pointer shadow-sm"
            >
              <Plus className="h-4 w-4" />
            </Link>
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
            <Car className="h-4 w-4 text-amber-400" /> Assigned Vehicles ({driver.vehicles.length})
          </h3>
          {driver.vehicles.length === 0 ? (
            <p className="text-xs text-slate-500 italic">No vehicles assigned to this driver yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {driver.vehicles.map((v) => (
                <div key={v.id} className="bg-slate-50 dark:bg-[#060911] border border-slate-200 dark:border-slate-800/80 p-4 rounded-2xl flex items-center justify-between">
                  <div>
                    <p className="font-mono font-extrabold text-xs text-amber-500">{v.regNumber}</p>
                    <p className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">{v.modelName}</p>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-400 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
                    {v.capacity} Seats
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
