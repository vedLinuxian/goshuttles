"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { User, LogOut, ShieldCheck, Bell, ChevronDown } from "lucide-react";
import { handleSignOut } from "@/app/actions/auth-actions";

export type UserInfo = {
  id?: string;
  name?: string | null;
  email?: string | null;
  phone?: string;
  role?: string;
};

function profileHref(role?: string): string {
  if (role === "DRIVER") return "/driver/profile";
  if (role === "ADMIN") return "/admin/users";
  return "/passenger/profile";
}

function notifHref(role?: string): string {
  if (role === "ADMIN") return "/admin/notifications";
  if (role === "DRIVER") return "/driver/notifications";
  return "/passenger/notifications";
}

export function UserProfileMenu({ user }: { user: UserInfo }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const role = user.role === "ADMIN" ? "Admin" : user.role === "DRIVER" ? "Driver" : "Passenger";
  const initial = user.name?.charAt(0)?.toUpperCase() || "U";

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] p-1.5 text-[var(--foreground)] shadow-sm transition-all hover:border-amber-500/40 hover:bg-[var(--muted)] sm:px-3 sm:py-1.5 cursor-pointer"
        aria-expanded={open}
        aria-label="User profile menu"
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500 text-xs font-black text-slate-950 shadow-sm">
          {initial}
        </div>
        <div className="hidden sm:block text-left">
          <p className="max-w-[120px] truncate text-xs font-extrabold leading-tight text-[var(--foreground)]">
            {user.name || "User"}
          </p>
          <p className="text-[10px] text-amber-400 font-bold leading-tight">{role}</p>
        </div>
        <ChevronDown className={`h-3.5 w-3.5 text-[var(--muted-foreground)] transition-transform ${open ? "rotate-180 text-amber-500" : ""}`} />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="User Profile Options"
          className="glass-card-dark absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-[var(--border)] shadow-2xl glow-amber divide-y divide-[var(--border)]"
        >
          {/* Header */}
          <div className="space-y-1 bg-[var(--muted)] p-3.5">
            <p className="truncate text-xs font-extrabold text-[var(--foreground)]">{user.name || "Logged In User"}</p>
            <div className="flex items-center gap-2 text-[10px]">
              <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-bold text-amber-600 dark:text-amber-400">
                {role}
              </span>
              {user.phone && <span className="truncate font-mono text-[var(--muted-foreground)]">{user.phone}</span>}
            </div>
          </div>

          {/* Links */}
          <div className="py-1.5 px-1 space-y-0.5 text-xs">
            <Link
              href={profileHref(user.role)}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2 font-bold text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-amber-500"
            >
              <User className="h-4 w-4 text-amber-400" />
              <span>My Profile &amp; Settings</span>
            </Link>

            <Link
              href={notifHref(user.role)}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2 font-bold text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-amber-500"
            >
              <Bell className="h-4 w-4 text-amber-400" />
              <span>Notifications Hub</span>
            </Link>
          </div>

          {/* Sign Out Action */}
          <div className="p-1.5">
            <form action={handleSignOut}>
              <button
                type="submit"
                className="flex w-full items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
