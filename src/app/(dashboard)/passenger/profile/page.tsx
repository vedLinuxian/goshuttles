import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { updatePassengerProfileForm } from "@/app/actions/form-actions";
import { User, Phone, Calendar, Star, Shield, Pencil } from "lucide-react";
import { Card, Badge, Button, Input, Select, Label } from "@/components/ui";

export default async function PassengerProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const profile = await db.passengerProfile.findUnique({ where: { userId: session.user.id! } });
  const totalTrips = await db.booking.count({
    where: { userId: session.user.id!, status: { in: ["CONFIRMED", "COMPLETED"] } },
  });
  const totalSpent = await db.booking.aggregate({
    _sum: { totalAmount: true },
    where: { userId: session.user.id!, status: { in: ["CONFIRMED", "COMPLETED"] }, paymentStatus: "COLLECTED" },
  });

  return (
    <div className="max-w-lg mx-auto space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <User className="h-6 w-6 text-amber-400" />
          My Passenger Profile
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Manage your personal account information and emergency contacts.
        </p>
      </div>

      {/* Profile Card */}
      <Card variant="glass" className="p-6 space-y-6 border-slate-800 shadow-2xl glow-amber">
        <div className="flex items-center gap-4 border-b border-slate-800/80 pb-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-extrabold">
            <User className="h-6 w-6" />
          </div>
          <div>
            <p className="font-extrabold text-lg text-white">{profile?.fullName || session.user.name || "Passenger"}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="default" className="text-[10px]">
                {session.user.role === "CUSTOMER" ? "Passenger" : session.user.role}
              </Badge>
              {profile?.isVip && (
                <Badge variant="solidAmber" className="text-[10px]">
                  VIP ✦
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-3 text-xs">
          <div className="flex justify-between py-1 border-b border-slate-800/60">
            <span className="text-slate-400 flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-amber-400" />Phone Number</span>
            <span className="font-mono font-bold text-slate-200">{session.user.phone}</span>
          </div>
          {session.user.email && (
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Email Address</span>
              <span className="font-semibold text-slate-200">{session.user.email}</span>
            </div>
          )}
          {profile?.age && (
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400 flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-amber-400" />Age</span>
              <span className="font-bold text-slate-200">{profile.age}</span>
            </div>
          )}
          {profile?.gender && (
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Gender</span>
              <span className="font-semibold text-slate-200">{profile.gender}</span>
            </div>
          )}
          {profile?.emergencyContact && (
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400 flex items-center gap-1.5"><Shield className="h-3.5 w-3.5 text-amber-400" />Emergency Contact</span>
              <span className="font-mono font-bold text-slate-200">{profile.emergencyContact}</span>
            </div>
          )}
          <div className="flex justify-between py-1 border-b border-slate-800/60">
            <span className="text-slate-400 flex items-center gap-1.5"><Star className="h-3.5 w-3.5 text-amber-400" />Total Completed Rides</span>
            <span className="font-extrabold text-white">{totalTrips}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-slate-400">Total Spent</span>
            <span className="font-extrabold text-emerald-400">₹{Number(totalSpent._sum.totalAmount || 0).toLocaleString("en-IN")}</span>
          </div>
        </div>
      </Card>

      {/* Edit Profile Form */}
      <Card variant="glass" className="p-6 space-y-4 border-slate-800 shadow-2xl">
        <h2 className="font-extrabold text-white text-base flex items-center gap-2 border-b border-slate-800/80 pb-3">
          <Pencil className="h-4 w-4 text-amber-400" /> Edit Profile Information
        </h2>
        <form action={updatePassengerProfileForm} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="fullName">Full Name</Label>
            <Input id="fullName" name="fullName" defaultValue={profile?.fullName || session.user.name || ""} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="age">Age</Label>
              <Input id="age" name="age" type="number" defaultValue={profile?.age || ""} min={1} max={120} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gender">Gender</Label>
              <Select id="gender" name="gender" defaultValue={profile?.gender || ""}>
                <option value="">Prefer not to say</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="emergencyContact">Emergency Contact Phone</Label>
            <Input id="emergencyContact" name="emergencyContact" type="tel" defaultValue={profile?.emergencyContact || ""} placeholder="Mobile number" />
          </div>
          <Button type="submit" className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs py-2.5 rounded-xl shadow-md glow-amber transition-all cursor-pointer mt-2">
            Save Profile Changes
          </Button>
        </form>
      </Card>
    </div>
  );
}
