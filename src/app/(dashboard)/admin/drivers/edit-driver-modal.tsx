"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateDriverDetailsAction } from "@/app/actions/user-actions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, Button, Input, Label, Select } from "@/components/ui";
import { Loader2, UserCheck, ShieldCheck, CreditCard, Phone, User } from "lucide-react";

interface DriverDetails {
  id: string;
  name: string | null;
  phone: string | null;
  driverProfile: {
    id?: string;
    kycStatus?: string;
    fullName?: string | null;
    aadhaarNumber?: string | null;
    licenseNumber?: string | null;
    walletBalance?: number | string;
  } | null;
}

interface EditDriverModalProps {
  driver: DriverDetails;
  isOpen: boolean;
  onClose: () => void;
}

export function EditDriverModal({ driver, isOpen, onClose }: EditDriverModalProps) {
  const router = useRouter();
  const [name, setName] = useState(driver.name || "");
  const [phone, setPhone] = useState(driver.phone || "");
  const [fullName, setFullName] = useState(driver.driverProfile?.fullName || driver.name || "");
  const [aadhaarNumber, setAadhaarNumber] = useState(driver.driverProfile?.aadhaarNumber || "");
  const [licenseNumber, setLicenseNumber] = useState(driver.driverProfile?.licenseNumber || "");
  const [kycStatus, setKycStatus] = useState<"PENDING" | "APPROVED" | "REJECTED">(
    (driver.driverProfile?.kycStatus as "PENDING" | "APPROVED" | "REJECTED") || "APPROVED"
  );
  const [walletBalance, setWalletBalance] = useState(
    Number(driver.driverProfile?.walletBalance || 0)
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await updateDriverDetailsAction({
        driverId: driver.id,
        name,
        phone,
        fullName,
        aadhaarNumber,
        licenseNumber,
        kycStatus,
        walletBalance,
      });

      if (res.success) {
        onClose();
        router.refresh();
      } else {
        setError(res.error || "Failed to update driver details.");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-[#0c101c] border-slate-800 text-white rounded-3xl p-6 shadow-2xl glow-amber">
        <DialogHeader>
          <DialogTitle className="text-lg font-extrabold flex items-center gap-2 text-white">
            <UserCheck className="h-5 w-5 text-amber-400" /> Edit Driver Profile
          </DialogTitle>
        </DialogHeader>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-amber-400" /> Account Name
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Driver display name"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 text-amber-400" /> Contact Phone
            </Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Driver phone number"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-amber-400" /> Legal Full Name (Govt ID)
            </Label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Legal full name"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-300">Aadhaar Card #</Label>
              <Input
                value={aadhaarNumber}
                onChange={(e) => setAadhaarNumber(e.target.value)}
                placeholder="12-digit Aadhaar"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-300">Driving License #</Label>
              <Input
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
                placeholder="DL number"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-300">KYC Status</Label>
              <Select
                value={kycStatus}
                onChange={(e) => setKycStatus(e.target.value as "PENDING" | "APPROVED" | "REJECTED")}
              >
                <option value="APPROVED">APPROVED</option>
                <option value="PENDING">PENDING</option>
                <option value="REJECTED">REJECTED</option>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-300 flex items-center gap-1">
                <CreditCard className="h-3.5 w-3.5 text-emerald-400" /> Wallet Balance (₹)
              </Label>
              <Input
                type="number"
                value={walletBalance}
                onChange={(e) => setWalletBalance(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <Button type="button" variant="secondary" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs cursor-pointer shadow-md glow-amber"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : "Save Driver Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
