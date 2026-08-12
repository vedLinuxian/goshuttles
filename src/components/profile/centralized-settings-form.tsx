"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateUserProfileAndSecurityAction } from "@/app/actions/profile-actions";
import { Card, Button, Input, Label, Tabs, TabsList, TabsTrigger, TabsContent, Alert } from "@/components/ui";
import { User, Phone, Mail, Lock, ShieldCheck, CheckCircle2, AlertCircle, Loader2, KeyRound } from "lucide-react";

interface UserProfileData {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: string;
}

export function CentralizedSettingsForm({ user }: { user: UserProfileData }) {
  const router = useRouter();

  // Profile Form state
  const [name, setName] = useState(user.name || "");
  const [email, setEmail] = useState(user.email || "");
  const [phone, setPhone] = useState(user.phone || "");

  // Password Form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);
    setErrorMsg(null);
    setLoading(true);

    try {
      const res = await updateUserProfileAndSecurityAction({
        name,
        email,
        phone,
      });

      if (res.success) {
        setSuccessMsg("Profile details updated successfully.");
        router.refresh();
      } else {
        setErrorMsg(res.error || "Failed to update profile details.");
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);
    setErrorMsg(null);

    if (!currentPassword) return setErrorMsg("Current password is required.");
    if (!newPassword || newPassword.length < 6) return setErrorMsg("New password must be at least 6 characters.");
    if (newPassword !== confirmPassword) return setErrorMsg("New password and confirmation do not match.");

    setLoading(true);
    try {
      const res = await updateUserProfileAndSecurityAction({
        currentPassword,
        newPassword,
      });

      if (res.success) {
        setSuccessMsg("Password changed successfully.");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        router.refresh();
      } else {
        setErrorMsg(res.error || "Failed to update password.");
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Alert Notices */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="w-full sm:w-auto grid grid-cols-2 bg-slate-900 border border-slate-800 p-1 rounded-2xl mb-6">
          <TabsTrigger
            value="profile"
            className="flex items-center justify-center gap-2 text-xs font-extrabold rounded-xl py-2.5 data-[state=active]:bg-amber-500 data-[state=active]:text-slate-950"
          >
            <User className="h-4 w-4" /> Personal Account Info
          </TabsTrigger>
          <TabsTrigger
            value="security"
            className="flex items-center justify-center gap-2 text-xs font-extrabold rounded-xl py-2.5 data-[state=active]:bg-amber-500 data-[state=active]:text-slate-950"
          >
            <KeyRound className="h-4 w-4" /> Password &amp; Security
          </TabsTrigger>
        </TabsList>

        {/* Profile Info Tab */}
        <TabsContent value="profile">
          <Card variant="glass" className="p-8 space-y-6 border-slate-800 shadow-2xl glow-amber">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
              <div>
                <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                  <User className="h-5 w-5 text-amber-400" /> Edit Profile Details
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Update your contact phone number, display name, and email address.
                </p>
              </div>
              <span className="text-[11px] font-mono px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
                {user.role} Account
              </span>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-amber-400" /> Full Display Name
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-amber-400" /> Registered Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. user@example.com"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-amber-400" /> Contact Phone Number
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 9876543210"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-end pt-4 border-t border-slate-800">
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs px-6 py-2.5 rounded-xl shadow-lg glow-amber cursor-pointer"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Save Profile Changes"}
                </Button>
              </div>
            </form>
          </Card>
        </TabsContent>

        {/* Password & Security Tab */}
        <TabsContent value="security">
          <Card variant="glass" className="p-8 space-y-6 border-slate-800 shadow-2xl glow-amber">
            <div className="pb-4 border-b border-slate-800/80">
              <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-amber-400" /> Change Account Password
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Update your account password to maintain security across your sessions.
              </p>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-type new password"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-end pt-4 border-t border-slate-800">
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs px-6 py-2.5 rounded-xl shadow-lg glow-amber cursor-pointer"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Update Password"}
                </Button>
              </div>
            </form>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
