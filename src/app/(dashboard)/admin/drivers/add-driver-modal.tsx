"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { registerDriverAction } from "@/app/actions/user-actions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, Button, Input, Label, Select } from "@/components/ui";
import { Loader2, UserPlus, Phone, ShieldCheck, Lock, User } from "lucide-react";

interface AddDriverModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddDriverModal({ isOpen, onClose }: AddDriverModalProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("driver123");
  const [fullName, setFullName] = useState("");
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [kycStatus, setKycStatus] = useState<"PENDING" | "APPROVED">("APPROVED");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError("Driver name is required.");
    if (!phone.trim()) return setError("Phone number is required.");

    setLoading(true);
    try {
      const res = await registerDriverAction({
        name,
        phone,
        password,
        fullName: fullName || name,
        aadhaarNumber,
        licenseNumber,
        kycStatus,
      });

      if (res.success) {
        onClose();
        router.refresh();
      } else {
        setError(res.error || "Failed to register driver partner.");
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
            <UserPlus className="h-5 w-5 text-amber-400" /> Register New Driver Partner
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
              placeholder="e.g. Ramesh Kumar"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 text-amber-400" /> 10-Digit Mobile Phone
            </Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 9876543210"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-amber-400" /> Initial Password
            </Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Default: driver123"
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
              <Label className="text-xs font-bold text-slate-300">Aadhaar #</Label>
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

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-300">Initial KYC Status</Label>
            <Select
              value={kycStatus}
              onChange={(e) => setKycStatus(e.target.value as "PENDING" | "APPROVED")}
            >
              <option value="APPROVED">APPROVED (Verified)</option>
              <option value="PENDING">PENDING (Review Required)</option>
            </Select>
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
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : "Register Driver Partner"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
