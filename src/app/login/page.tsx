"use client";

import { login, demoLogin } from "./actions";
import { useActionState, useState, useTransition, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Route, Phone, Mail, Lock, ShieldCheck, ArrowRight, Sparkles, UserCheck, ShieldAlert, KeyRound } from "lucide-react";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Input,
  Label,
  Tabs,
  TabsList,
  TabsTrigger,
  Alert,
  AlertDescription,
} from "@/components/ui";

function LoginFormContent() {
  const [state, action, pending] = useActionState(login, null);
  const [isDemoPending, startDemoTransition] = useTransition();
  const [demoError, setDemoError] = useState<string | null>(null);
  const [activeDemoKey, setActiveDemoKey] = useState<string | null>(null);
  const [loginMethod, setLoginMethod] = useState<"PHONE" | "EMAIL">("PHONE");
  const [credentialValue, setCredentialValue] = useState("");
  const [passwordValue, setPasswordValue] = useState("");

  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "";
  const errorParam = searchParams.get("error");

  const runDemo = (key: "admin" | "driver" | "passenger") => {
    setDemoError(null);
    setActiveDemoKey(key);
    startDemoTransition(async () => {
      const res = await demoLogin(key, callbackUrl);
      if (res?.error) {
        setDemoError(res.error);
        setActiveDemoKey(null);
      }
    });
  };

  return (
    <>
      {process.env.NEXT_PUBLIC_ENABLE_DEMO_LOGIN !== "false" && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 backdrop-blur-md space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-400" />
              <p className="text-xs font-bold uppercase tracking-wider text-amber-400">1-Click Demo Workspaces</p>
            </div>
            <span className="text-[10px] text-amber-300/80 font-medium">Instant Test Login</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { key: "admin" as const, label: "Admin Control", role: "Ops & Fleet" },
              { key: "driver" as const, label: "Driver Partner", role: "Shuttle Duty" },
              { key: "passenger" as const, label: "Passenger", role: "Rider Portal" },
            ].map((item) => (
              <Button
                key={item.key}
                type="button"
                variant="outline"
                size="sm"
                disabled={pending || isDemoPending}
                onClick={() => runDemo(item.key)}
                className={`h-auto py-2 px-2 flex flex-col items-center justify-center rounded-xl border text-center transition-all ${
                  activeDemoKey === item.key
                    ? "bg-amber-500 text-slate-950 border-amber-400 font-bold"
                    : "border-slate-800 bg-slate-900/80 text-slate-200 hover:border-amber-500/50 hover:bg-slate-800"
                }`}
              >
                <span className="text-xs font-bold">{isDemoPending && activeDemoKey === item.key ? "Signing in..." : item.label}</span>
                <span className="text-[9px] opacity-75 font-normal">{item.role}</span>
              </Button>
            ))}
          </div>

          {demoError && (
            <Alert variant="destructive" className="py-2 text-xs">
              <AlertDescription>{demoError}</AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* Unauthorized Route Error Alert */}
      {errorParam && (
        <Alert variant="destructive" className="py-3">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          <AlertDescription className="font-medium text-xs leading-relaxed">
            {errorParam === "UnauthorizedAdmin"
              ? "Admin privileges required. Please sign in with an Admin account."
              : errorParam === "UnauthorizedDriver"
              ? "Driver partner access required. Please sign in with a Driver account."
              : "Session expired or access restricted. Please sign in."}
          </AlertDescription>
        </Alert>
      )}

      {/* Separate Login Method Tabs */}
      <Tabs value={loginMethod} onValueChange={(val) => setLoginMethod(val as "PHONE" | "EMAIL")}>
        <TabsList className="w-full grid grid-cols-2 bg-slate-900/90 border border-slate-800 p-1 rounded-xl">
          <TabsTrigger
            value="PHONE"
            onClick={() => setCredentialValue("")}
            className="flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all data-[state=active]:bg-amber-500 data-[state=active]:text-slate-950"
          >
            <Phone className="h-3.5 w-3.5" />
            <span>Mobile Phone</span>
          </TabsTrigger>
          <TabsTrigger
            value="EMAIL"
            onClick={() => setCredentialValue("")}
            className="flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all data-[state=active]:bg-amber-500 data-[state=active]:text-slate-950"
          >
            <Mail className="h-3.5 w-3.5" />
            <span>Email Address</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Form */}
      <form action={action} className="space-y-4">
        <input type="hidden" name="callbackUrl" value={callbackUrl} />

        <div className="space-y-1.5">
          <Label htmlFor="credential" className="text-xs font-bold text-slate-300">
            {loginMethod === "PHONE" ? "10-Digit Mobile Number" : "Registered Email Address"}
          </Label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              {loginMethod === "PHONE" ? <Phone className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
            </div>
            <Input
              id="credential"
              name="credential"
              type={loginMethod === "PHONE" ? "tel" : "email"}
              value={credentialValue}
              onChange={(e) => setCredentialValue(e.target.value)}
              placeholder={loginMethod === "PHONE" ? "9999999999" : "admin@goayodhya.com"}
              required
              className="pl-10 h-11 bg-slate-900/80 border-slate-800 focus:border-amber-400 text-sm text-white rounded-xl"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-xs font-bold text-slate-300">Password</Label>
            <span className="text-[11px] text-slate-500">Min 6 characters</span>
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
              className="pl-10 h-11 bg-slate-900/80 border-slate-800 focus:border-amber-400 text-sm text-white rounded-xl"
            />
          </div>
        </div>

        {state?.error && (
          <Alert variant="destructive" className="py-2.5">
            <AlertDescription className="text-xs">{state.error}</AlertDescription>
          </Alert>
        )}

        <Button
          type="submit"
          disabled={pending || isDemoPending}
          size="lg"
          className="w-full h-11 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
        >
          <span>{pending ? "Authenticating..." : "Sign In to GoShuttles"}</span>
          <ArrowRight className="h-4 w-4" />
        </Button>
      </form>
    </>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans">
      {/* Background glow orbs */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-amber-500/10 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute top-10 right-10 w-[300px] h-[300px] bg-indigo-500/10 rounded-full blur-[140px] pointer-events-none" />

      <Card variant="glass" className="w-full max-w-md border-amber-500/30 p-2 sm:p-4 shadow-2xl relative z-10 bg-slate-950/80 backdrop-blur-2xl">
        <CardHeader className="text-center space-y-2 pb-2">
          <Link href="/" className="inline-flex items-center gap-3 group justify-center">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 via-amber-400 to-amber-600 flex items-center justify-center text-slate-950 font-extrabold shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform">
              <Route className="h-7 w-7 stroke-[2.5]" />
            </div>
          </Link>
          <CardTitle className="text-2xl font-extrabold text-white tracking-tight">
            Welcome Back to <span className="text-amber-400">GoShuttles</span>
          </CardTitle>
          <CardDescription className="text-xs text-slate-400">
            Sign in to manage your bookings, driver shifts, or fleet ops.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          <Suspense fallback={<div className="text-center text-xs text-slate-500 py-8">Loading sign-in deck...</div>}>
            <LoginFormContent />
          </Suspense>

          <div className="pt-2 border-t border-slate-800 text-center">
            <p className="text-xs text-slate-400">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="text-amber-400 hover:text-amber-300 font-bold underline">
                Register for Free
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}