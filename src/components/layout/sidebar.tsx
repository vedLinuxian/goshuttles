"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard, Route, Users, Car, BarChart3, Wallet, MapPin, FileText,
  Bell, Ticket, Star, MessageSquare, LogOut, X, User, ClipboardCheck,
  History, PlusCircle, TrendingUp, Search, Menu, Link2, ShieldCheck,
  ChevronLeft, ChevronRight, PanelLeftClose, PanelLeftOpen,
} from "lucide-react";
import { handleSignOut } from "@/app/actions/auth-actions";

type Role = "ADMIN" | "DRIVER" | "CUSTOMER";
type UserInfo = { id?: string; name?: string | null; role?: string; phone?: string };
type NavItem = { label: string; href: string; icon: LucideIcon; children?: string[] };
type NavSection = { title: string; items: NavItem[] };

export const navigationByRole: Record<Role, NavSection[]> = {
  ADMIN: [
    { title: "Overview", items: [
      { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
      { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
      { label: "Audit Logs", href: "/admin/audit-logs", icon: History },
      { label: "Notifications", href: "/admin/notifications", icon: Bell },
    ] },
    { title: "Operations", items: [
      { label: "All Trips", href: "/admin/trips", icon: Route, children: ["/admin/trips/" ] },
      { label: "Bookings", href: "/admin/bookings", icon: ClipboardCheck },
      { label: "Approvals", href: "/admin/trips/approvals", icon: ClipboardCheck },
      { label: "Boarding Passes", href: "/admin/tickets", icon: Ticket },
      { label: "Locations & Fares", href: "/admin/locations", icon: MapPin },
    ] },
    { title: "Fleet & Finance", items: [
      { label: "Users & RBAC", href: "/admin/users", icon: ShieldCheck },
      { label: "Vehicles", href: "/admin/vehicles", icon: Car },
      { label: "Drivers", href: "/admin/drivers", icon: Users },
      { label: "Assign Vehicle", href: "/admin/assign", icon: Link2 },
      { label: "Finance", href: "/admin/finance", icon: Wallet },
    ] },
  ],
  DRIVER: [
    { title: "Operations", items: [
      { label: "Live Dashboard", href: "/driver/dashboard", icon: LayoutDashboard },
      { label: "Pending Confirmations", href: "/driver/bookings/pending", icon: ClipboardCheck },
      { label: "My Trips", href: "/driver/trips", icon: History, children: ["/driver/trips/"] },
    ] },
    { title: "Quick Actions", items: [
      { label: "Schedule Trip", href: "/driver/trips/new", icon: PlusCircle },
      { label: "Offline Booking", href: "/driver/offline-book", icon: Ticket },
    ] },
    { title: "Account", items: [
      { label: "Earnings & Wallet", href: "/driver/earnings", icon: TrendingUp },
      { label: "Notifications", href: "/driver/notifications", icon: Bell },
      { label: "Profile", href: "/driver/profile", icon: User },
    ] },
  ],
  CUSTOMER: [
    { title: "Shuttle", items: [
      { label: "Dashboard", href: "/passenger/dashboard", icon: LayoutDashboard },
      { label: "Find Rides", href: "/passenger/discover", icon: Search },
      { label: "My Bookings", href: "/passenger/bookings", icon: Ticket, children: ["/passenger/bookings/"] },
      { label: "Live Tracking", href: "/passenger/tracking", icon: MapPin },
    ] },
    { title: "Account", items: [
      { label: "Notifications", href: "/passenger/notifications", icon: Bell },
      { label: "Invoices", href: "/passenger/invoices", icon: FileText },
      { label: "Reviews", href: "/passenger/reviews", icon: Star },
      { label: "Support", href: "/passenger/complaints", icon: MessageSquare },
      { label: "Profile", href: "/passenger/profile", icon: User },
    ] },
  ],
};

function roleOf(value?: string): Role { return value === "ADMIN" || value === "DRIVER" ? value : "CUSTOMER"; }
function activeFor(pathname: string | null, item: NavItem, items: NavItem[]) {
  if (pathname === item.href) return true;
  if (items.some((candidate) => candidate.href !== item.href && candidate.href === pathname)) return false;
  return item.children?.some((prefix) => pathname?.startsWith(prefix)) === true;
}

export function Sidebar({ user }: { user: UserInfo }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const drawerRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);
  const role = roleOf(user.role);
  const sections = navigationByRole[role];

  useEffect(() => {
    if (!mobileOpen) {
      if (wasOpen.current) menuButtonRef.current?.focus();
      wasOpen.current = false;
      return;
    }

    wasOpen.current = true;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const drawer = drawerRef.current;
    const getFocusable = () => Array.from(
      drawer?.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), [tabindex]:not([tabindex='-1'])") ?? [],
    ).filter((element) => element.getClientRects().length > 0 && getComputedStyle(element).visibility !== "hidden");
    getFocusable()[0]?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setMobileOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = getFocusable();
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileOpen]);

  const close = () => setMobileOpen(false);

  return (
    <>
      {/* Mobile Top Nav Header */}
      <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--sidebar-bg)] px-4 py-3 lg:hidden">
        <Brand compact />
        <button
          ref={menuButtonRef}
          type="button"
          onClick={() => setMobileOpen((open) => !open)}
          aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={mobileOpen}
          aria-controls="dashboard-mobile-navigation"
          className="touch-manipulation rounded-xl p-2 text-[var(--text-subtle)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Mobile Backdrop */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation overlay"
          onClick={close}
          className="touch-manipulation fixed inset-0 z-40 bg-[var(--background)]/80 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Sidebar Drawer / Desktop Bar */}
      <aside
        ref={drawerRef}
        id="dashboard-mobile-navigation"
        role={mobileOpen ? "dialog" : undefined}
        aria-modal={mobileOpen ? "true" : undefined}
        aria-label="Primary navigation"
        className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] transition-all duration-300 lg:static lg:h-screen lg:translate-x-0 ${
          mobileOpen ? "translate-x-0 w-64" : "-translate-x-full lg:translate-x-0"
        } ${collapsed ? "lg:w-20" : "lg:w-64"}`}
      >
        {/* Brand & Collapse Toggle Header */}
        <div className={`flex shrink-0 items-center border-b border-[var(--sidebar-border)] py-4 ${collapsed ? "px-3 justify-center" : "px-5"}`}>
          <Brand compact={collapsed} />

          {/* Desktop Collapse Arrow Toggle Button */}
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand navigation (Show labels)" : "Collapse navigation (Icons only)"}
            className={`hidden lg:flex items-center justify-center rounded-xl p-1.5 text-[var(--text-subtle)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] transition-colors ${collapsed ? "mt-2" : "ml-auto"}`}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>

          {/* Mobile Close Button */}
          <button
            type="button"
            onClick={close}
            aria-label="Close navigation"
            className="ml-auto rounded-lg p-1 text-[var(--text-subtle)] hover:text-[var(--foreground)] lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav Items */}
        <nav
          className={`min-h-0 flex-1 overflow-y-auto py-4 ${collapsed ? "px-2" : "px-3"}`}
          aria-label={`${role.toLowerCase()} navigation`}
        >
          {sections.map((section) => (
            <div key={section.title} className="mb-5">
              {!collapsed && (
                <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[var(--text-subtle)]">
                  {section.title}
                </p>
              )}
              {collapsed && <div className="my-2 border-t border-[var(--sidebar-border)] opacity-60" />}

              <div className="space-y-1">
                {section.items.map((item) => {
                  const active = activeFor(pathname, item, section.items);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={close}
                      title={collapsed ? item.label : undefined}
                      aria-current={active ? "page" : undefined}
                      className={`flex items-center gap-3 rounded-xl py-2.5 text-sm font-semibold transition-all ${
                        collapsed ? "justify-center px-2" : "px-3"
                      } ${
                        active
                          ? "bg-amber-500 text-slate-950 shadow-sm font-extrabold"
                          : "text-[var(--text-subtle)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
                      }`}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Clean Sidebar Footer */}
        <div className={`shrink-0 border-t border-[var(--sidebar-border)] py-3 ${collapsed ? "px-2 text-center" : "px-4"}`}>
          {!collapsed ? (
            <div className="flex items-center justify-between text-[11px] text-[var(--text-subtle)] font-bold">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Live Dispatch
              </span>
              <span>v2.0</span>
            </div>
          ) : (
            <div className="flex justify-center" title="Live Dispatch Engine Active">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5 font-extrabold tracking-tight">
      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500 text-slate-950 shrink-0">
        <Route className="h-4 w-4" />
      </span>
      {!compact && (
        <span className="text-sm font-extrabold text-[var(--foreground)]">
          GoShuttles<span className="ml-1 text-[10px] uppercase tracking-widest text-amber-500">Express</span>
        </span>
      )}
    </Link>
  );
}
