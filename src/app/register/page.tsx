"use client";

import { register } from "./actions";
import { useActionState, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Route, Phone, Mail, Lock, User, ArrowRight, ShieldCheck, Zap, Sparkles, Check } from "lucide-react";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Input,
  Label,
  Alert,
  AlertDescription,
} from "@/components/ui";

function RegisterFormContent() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "";

  const [state, action, pending] = useActionState(register, null);
  const [passwordValue, setPasswordValue] = useState("");

  const loginHref = callbackUrl
    ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`
    : "/login";

  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: "None", color: "bg-slate-700" };
    if (pass.length < 6) return { score: 1, label: "Weak (Min 6 chars)", color: "bg-rose-500" };
    if (pass.length < 10) return { score: 2, label: "Good", color: "bg-amber-500" };
    return { score: 3, label: "Strong", color: "bg-emerald-500" };
  };

  const strength = getPasswordStrength(passwordValue);

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="name" className="text-xs font-bold text-slate-300">Full Name</Label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <User className="h-4 w-4" />
          </div>
          <Input
            id="name"
            name="name"
            type="text"
            placeholder="Ramesh Kumar"
            required
            className="pl-10 h-11 bg-slate-900/80 border-slate-800 focus:border-amber-400 text-sm text-white rounded-xl"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="phone" className="text-xs font-bold text-slate-300">10-Digit Mobile Number</Label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Phone className="h-4 w-4" />
          </div>
          <Input
            id="phone"
            name="phone"
            type="tel"
            placeholder="9876543210"
            maxLength={15}
            required
            className="pl-10 h-11 bg-slate-900/80 border-slate-800 focus:border-amber-400 text-sm text-white rounded-xl"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email" className="text-xs font-bold text-slate-300">
          Email Address <span className="text-slate-500 font-normal">(optional)</span>
        </Label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Mail className="h-4 w-4" />
          </div>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="ramesh@example.com"
            className="pl-10 h-11 bg-slate-900/80 border-slate-800 focus:border-amber-400 text-sm text-white rounded-xl"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="password" className="text-xs font-bold text-slate-300">Password</Label>
          {passwordValue && (
            <span className="text-[11px] font-semibold text-slate-400">
              Strength: <span className="text-white">{strength.label}</span>
            </span>
          )}
        </div>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Lock className="h-4 w-4" />
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            value={passwordValue}
            onChange={(e) => setPasswordValue(e.target.value)}
            placeholder="••••••••"
            required
            minLength={6}
            className="pl-10 h-11 bg-slate-900/80 border-slate-800 focus:border-amber-400 text-sm text-white rounded-xl"
          />
        </div>
        {passwordValue && (
          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden mt-1.5">
            <div
              className={`h-full transition-all ${strength.color}`}
              style={{ width: `${(strength.score / 3) * 100}%` }}
            />
          </div>
        )}
      </div>

      <input type="hidden" name="role" value="CUSTOMER" />

      {state?.error && (
        <Alert variant="destructive" className="py-2.5">
          <AlertDescription className="text-xs">{state.error}</AlertDescription>
        </Alert>
      )}
      {state?.success && (
        <Alert variant="success" className="py-3 space-y-2">
          <AlertDescription className="text-xs font-bold flex items-center justify-between">
            <span>{state.success}</span>
            <Link href={loginHref} className="text-xs underline text-emerald-400 font-bold ml-2">
              Sign In Now →
            </Link>
          </AlertDescription>
        </Alert>
      )}

      <Button
        type="submit"
        disabled={pending}
        size="lg"
        className="w-full h-11 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
      >
        <span>{pending ? "Creating Account..." : "Create GoShuttles Account"}</span>
        <ArrowRight className="h-4 w-4" />
      </Button>

      <div className="pt-2 border-t border-slate-800 text-center">
        <p className="text-xs text-slate-400">
          Already have an account?{" "}
          <Link href={loginHref} className="text-amber-400 hover:text-amber-300 font-bold underline">
            Sign In Here
          </Link>
        </p>
      </div>
    </form>
  );
}

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans">
      {/* Background glow orbs */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-amber-500/10 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-[300px] h-[300px] bg-purple-500/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="w-full max-w-4xl grid lg:grid-cols-[1.1fr_0.9fr] gap-6 relative z-10 items-center">
        {/* Left Column: Register Card */}
        <Card variant="glass" className="w-full border-amber-500/30 p-2 sm:p-4 shadow-2xl bg-slate-950/80 backdrop-blur-2xl">
          <CardHeader className="text-center space-y-2 pb-2">
            <Link href="/" className="inline-flex items-center gap-3 group justify-center">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 via-amber-400 to-amber-600 flex items-center justify-center text-slate-950 font-extrabold shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform">
                <Route className="h-7 w-7 stroke-[2.5]" />
              </div>
            </Link>
            <CardTitle className="text-2xl font-extrabold text-white tracking-tight">
              Create Your <span className="text-amber-400">GoShuttles</span> Account
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Join thousands of daily travelers enjoying daily intercity express shuttles.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            <Suspense fallback={<div className="text-center text-xs text-slate-500 py-8">Loading registration form...</div>}>
              <RegisterFormContent />
            </Suspense>
          </CardContent>
        </Card>

        {/* Right Column: Perks Showcase */}
        <div className="hidden lg:block space-y-6 p-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Passenger Account Perks</span>
          </div>

          <h2 className="text-3xl font-extrabold text-white tracking-tight leading-snug">
            Your Gateway to Guaranteed Intercity Seats
          </h2>

          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl flex items-start gap-3.5">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 shrink-0 mt-0.5">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">5-Minute Atomic Seat Locks</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Never lose your seat during payment. Our engine holds your choice atomically.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl flex items-start gap-3.5">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0 mt-0.5">
                <Check className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Instant QR Mobile Passes</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Paperless boarding ticket with live shuttle departure alerts &amp; driver contact.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl flex items-start gap-3.5">
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 shrink-0 mt-0.5">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Verified Drivers &amp; Modern SUVs</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Clean AC executive cabins with 100% KYC checked driver partners.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
