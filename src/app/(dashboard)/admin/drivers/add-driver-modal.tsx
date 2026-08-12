"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { registerDriverAction } from "@/app/actions/user-actions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, Button, Input, Label, Select } from "@/components/ui";
import { Loader2, UserPlus, Phone, ShieldCheck, Lock, User, Eye, EyeOff, X, Sparkles } from "lucide-react";

interface AddDriverModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddDriverModal({ isOpen, onClose }: AddDriverModalProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("driver123");
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [kycStatus, setKycStatus] = useState<"PENDING" | "APPROVED">("APPROVED");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setName("");
    setPhone("");
    setPassword("driver123");
    setShowPassword(false);
    setFullName("");
    setAadhaarNumber("");
    setLicenseNumber("");
    setKycStatus("APPROVED");
    setError(null);
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError("Driver account name is required.");
    if (!phone.trim()) return setError("Mobile phone number is required.");
    if (!password.trim()) return setError("Password is required.");

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
        handleClose();
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
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md bg-[#0c101c] border-slate-800 text-white rounded-3xl p-6 shadow-2xl glow-amber z-[9999]">
        <DialogHeader>
          <DialogTitle className="text-lg font-extrabold flex items-center justify-between text-white border-b border-slate-800 pb-3">
            <span className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-amber-400" /> Register Driver Partner
            </span>
            <span className="text-[10px] uppercase font-mono px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
              Super Admin
            </span>
          </DialogTitle>
        </DialogHeader>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center justify-between">
            <span>{error}</span>
            <button type="button" onClick={() => setError(null)} className="text-rose-400 hover:text-white">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Account Name */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-amber-400" /> Driver Account Display Name
            </Label>
            <div className="relative">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ramesh Kumar"
                required
                className="pr-8"
              />
              {name && (
                <button
                  type="button"
                  onClick={() => setName("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  title="Clear name"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Phone Number */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 text-amber-400" /> 10-Digit Mobile Phone
            </Label>
            <div className="relative">
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 9876543210"
                required
                className="pr-8 font-mono"
              />
              {phone && (
                <button
                  type="button"
                  onClick={() => setPhone("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  title="Clear phone"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Password Field with Clear & Toggle buttons */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-amber-400" /> Initial Login Password
              </Label>
              <button
                type="button"
                onClick={() => setPassword("")}
                className="text-[10px] text-amber-400 hover:text-amber-300 font-bold underline"
              >
                Clear Password
              </button>
            </div>

            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Type password..."
                required
                className="pr-16 font-mono"
                autoComplete="new-password"
              />
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                {password && (
                  <button
                    type="button"
                    onClick={() => setPassword("")}
                    className="text-slate-400 hover:text-rose-400 p-0.5"
                    title="Clear password input"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-slate-400 hover:text-white p-0.5"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Legal Full Name */}
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

          {/* Aadhaar & DL */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-300">Aadhaar #</Label>
              <Input
                value={aadhaarNumber}
                onChange={(e) => setAadhaarNumber(e.target.value)}
                placeholder="12-digit Aadhaar"
                maxLength={12}
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

          {/* Initial KYC Status */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-300">Initial KYC Status</Label>
            <Select
              value={kycStatus}
              onChange={(e) => setKycStatus(e.target.value as "PENDING" | "APPROVED")}
            >
              <option value="APPROVED">APPROVED (Verified Driver)</option>
              <option value="PENDING">PENDING (Review Required)</option>
            </Select>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <Button type="button" variant="secondary" size="sm" onClick={handleClose}>
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
