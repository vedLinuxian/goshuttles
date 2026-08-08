import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { updateDriverProfileForm, addVehicleForm, removeVehicleForm } from "@/app/actions/form-actions";
import { Pencil, Plus, Trash2, User, Car, ShieldCheck, Star, Wallet, Route } from "lucide-react";
import { Card, Badge, Button, Input, Select, Label } from "@/components/ui";

export default async function DriverProfilePage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "DRIVER") redirect("/login");

  const profile = await db.driverProfile.findUnique({ where: { userId: session.user.id! } });
  const vehicles = await db.vehicle.findMany({ where: { ownerId: session.user.id! } });
  const completedTrips = await db.trip.count({ where: { driverId: session.user.id!, status: "COMPLETED" } });
  const totalBookings = await db.booking.count({
    where: { trip: { driverId: session.user.id! }, status: { in: ["CONFIRMED", "COMPLETED"] } },
  });

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <User className="h-6 w-6 text-amber-400" />
          Driver Profile &amp; Fleet Settings
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Manage your personal driver profile, KYC credentials, wallet balance, and registered shuttle vehicles.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Card */}
        <Card variant="glass" className="p-6 space-y-6 border-slate-800">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
            <h2 className="font-extrabold text-white text-lg flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-amber-400" />
              Driver Credentials
            </h2>
            <Badge variant={profile?.kycStatus === "APPROVED" ? "success" : "warning"}>
              {profile?.kycStatus || "PENDING"}
            </Badge>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-800/60"><span className="text-slate-400">Full Name</span> <span className="font-bold text-white">{profile?.fullName || session.user.name}</span></div>
            <div className="flex justify-between py-1 border-b border-slate-800/60"><span className="text-slate-400">Mobile Phone</span> <span className="font-mono font-bold text-slate-200">{session.user.phone}</span></div>
            <div className="flex justify-between py-1 border-b border-slate-800/60"><span className="text-slate-400">Driver Rating</span> <span className="font-bold text-amber-400">{Number(profile?.rating || 5).toFixed(1)} ★</span></div>
            {profile?.aadhaarNumber && <div className="flex justify-between py-1 border-b border-slate-800/60"><span className="text-slate-400">Aadhaar Number</span> <span className="font-mono font-bold text-slate-200">{profile.aadhaarNumber}</span></div>}
            {profile?.licenseNumber && <div className="flex justify-between py-1 border-b border-slate-800/60"><span className="text-slate-400">Driving License</span> <span className="font-mono font-bold text-slate-200">{profile.licenseNumber}</span></div>}
            <div className="flex justify-between py-1 border-b border-slate-800/60"><span className="text-slate-400">Wallet Balance</span> <span className="font-extrabold text-amber-400">₹{Number(profile?.walletBalance || 0).toLocaleString("en-IN")}</span></div>
            <div className="flex justify-between py-1"><span className="text-slate-400">Total Lifetime Earnings</span> <span className="font-extrabold text-emerald-400">₹{Number(profile?.totalEarnings || 0).toLocaleString("en-IN")}</span></div>
          </div>

          {/* Edit Profile Accordion */}
          <details className="group border-t border-slate-800/80 pt-4">
            <summary className="cursor-pointer text-amber-400 text-xs font-bold hover:text-amber-300 inline-flex items-center gap-1.5 transition-colors">
              <Pencil className="h-3.5 w-3.5" /> Edit Profile Details
            </summary>
            <form action={updateDriverProfileForm} className="mt-4 space-y-3 bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
              <div className="space-y-1">
                <Label htmlFor="fullName" className="text-[11px]">Full Legal Name</Label>
                <Input id="fullName" name="fullName" defaultValue={profile?.fullName || session.user.name || ""} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="aadhaarNumber" className="text-[11px]">Aadhaar Card Number</Label>
                <Input id="aadhaarNumber" name="aadhaarNumber" defaultValue={profile?.aadhaarNumber || ""} maxLength={12} placeholder="12-digit Aadhaar" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="licenseNumber" className="text-[11px]">Driving License Number</Label>
                <Input id="licenseNumber" name="licenseNumber" defaultValue={profile?.licenseNumber || ""} placeholder="DL number" />
              </div>
              <Button type="submit" className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs py-2 rounded-xl mt-2">
                Save Profile Changes
              </Button>
            </form>
          </details>
        </Card>

        {/* Stats Card */}
        <Card variant="glass" className="p-6 space-y-6 border-slate-800">
          <h2 className="font-extrabold text-white text-lg border-b border-slate-800/80 pb-4 flex items-center gap-2">
            <Star className="h-5 w-5 text-amber-400" />
            Performance &amp; Manifest Stats
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 text-center">
              <p className="text-3xl font-extrabold text-white">{completedTrips}</p>
              <p className="text-xs text-slate-400 font-bold mt-1">Completed Trips</p>
            </div>
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 text-center">
              <p className="text-3xl font-extrabold text-amber-400">{totalBookings}</p>
              <p className="text-xs text-slate-400 font-bold mt-1">Passengers Transported</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Vehicles Section */}
      <Card variant="glass" className="p-6 space-y-6 border-slate-800">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
          <h2 className="font-extrabold text-white text-lg flex items-center gap-2">
            <Car className="h-5 w-5 text-amber-400" />
            My Fleet Vehicles ({vehicles.length})
          </h2>
          <details className="group">
            <summary className="cursor-pointer text-amber-400 text-xs font-bold hover:text-amber-300 inline-flex items-center gap-1.5 transition-colors">
              <Plus className="h-4 w-4" /> Add Vehicle
            </summary>
            <div className="mt-4 p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
              <form action={addVehicleForm} className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="regNumber" className="text-[11px]">Registration Number</Label>
                  <Input id="regNumber" name="regNumber" required placeholder="e.g., UP32 AB 1234" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="modelName" className="text-[11px]">Vehicle Model</Label>
                    <Input id="modelName" name="modelName" defaultValue="Maruti Ertiga" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="vehicleType" className="text-[11px]">Type</Label>
                    <Select id="vehicleType" name="vehicleType" defaultValue="SUV">
                      <option value="SUV">SUV</option>
                      <option value="SEDAN">Sedan</option>
                      <option value="HATCHBACK">Hatchback</option>
                      <option value="MINIVAN">Minivan</option>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="capacity" className="text-[11px]">Capacity</Label>
                  <Input id="capacity" name="capacity" type="number" defaultValue={6} min={1} max={50} />
                </div>
                <Button type="submit" className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs py-2 rounded-xl mt-2">
                  Register Vehicle
                </Button>
              </form>
            </div>
          </details>
        </div>

        {vehicles.length === 0 ? (
          <p className="text-slate-400 text-xs py-4 text-center">No vehicles registered yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {vehicles.map((v) => (
              <div key={v.id} className="p-4 rounded-2xl border border-slate-800 bg-slate-900/60 flex items-start justify-between">
                <div>
                  <p className="font-mono font-extrabold text-amber-400 text-sm">{v.regNumber}</p>
                  <p className="text-xs text-slate-300 mt-0.5">{v.modelName} · {v.vehicleType} · {v.capacity} seats</p>
                  <Badge variant={v.isActive ? "success" : "destructive"} className="mt-2 text-[10px]">
                    {v.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <form action={removeVehicleForm}>
                  <input type="hidden" name="vehicleId" value={v.id} />
                  <button type="submit" className="text-slate-400 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors" title="Remove vehicle">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
