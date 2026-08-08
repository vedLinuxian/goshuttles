"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, Ticket, CreditCard, Route, Megaphone, Info, Check, RefreshCw } from "lucide-react";

interface BellNotification {
  id: string;
  title: string;
  message: string;
  category: string;
  isRead: boolean;
  createdAt: string;
}

interface NotificationBellProps {
  userId: string;
  userRole?: string;
}

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  BOOKING: Ticket,
  PAYMENT: CreditCard,
  TRIP: Route,
  SYSTEM: Info,
  PROMO: Megaphone,
};

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(dateStr).toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}

function notificationsPath(role?: string): string {
  if (role === "ADMIN") return "/admin/notifications";
  if (role === "DRIVER") return "/driver/notifications";
  return "/passenger/notifications";
}

export function NotificationBell({ userId, userRole }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<BellNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchBell = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await fetch(`/api/notifications/bell?userId=${encodeURIComponent(userId)}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.unreadCount ?? 0);
        setNotifications(data.notifications ?? []);
      }
    } catch {
      // Non-blocking fallback
    }
  }, [userId]);

  // Fetch immediately on mount and poll every 15 seconds
  useEffect(() => {
    const initialFetch = window.setTimeout(() => {
      void fetchBell();
    }, 0);
    const interval = window.setInterval(() => {
      void fetchBell();
    }, 15000);
    return () => {
      window.clearTimeout(initialFetch);
      window.clearInterval(interval);
    };
  }, [fetchBell]);

  // Refetch when dropdown opens
  useEffect(() => {
    if (!open) return;
    const refresh = window.setTimeout(() => {
      setLoading(true);
      void fetchBell().finally(() => setLoading(false));
    }, 0);
    return () => window.clearTimeout(refresh);
  }, [open, fetchBell]);

  // Close dropdown on outside click
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const handleMarkAllRead = async () => {
    const prevCount = unreadCount;
    setUnreadCount(0);
    setNotifications((ns) => ns.map((n) => ({ ...n, isRead: true })));
    try {
      await fetch("/api/notifications/mark-all-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
    } catch {
      setUnreadCount(prevCount);
    }
  };

  const notifPath = notificationsPath(userRole);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`relative cursor-pointer rounded-xl border p-2.5 transition-all ${
          unreadCount > 0
            ? "border-amber-500/30 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20"
            : "border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
        }`}
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-amber-500 text-slate-950 text-[10px] font-extrabold flex items-center justify-center px-1 ring-2 ring-slate-950 shadow-md animate-pulse">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {open && (
        <div
          role="menu"
          aria-label="Notifications"
          className="glass-card-dark absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-3xl border border-[var(--border)] shadow-2xl glow-amber sm:w-96"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--muted)] px-4 py-3">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-extrabold text-[var(--foreground)]">Notifications</h3>
              {unreadCount > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 transition-colors"
                role="menuitem"
              >
                <Check className="h-3 w-3" />
                Mark all read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-[var(--border)]">
            {loading ? (
              <div className="px-4 py-8 text-center text-xs font-semibold text-slate-400 flex items-center justify-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin text-amber-400" />
                <span>Loading activity feed...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-8 text-center space-y-1">
                <Bell className="h-7 w-7 mx-auto text-slate-600 opacity-60" />
                <p className="text-xs font-bold text-slate-400">No notifications yet</p>
                <p className="text-[10px] text-slate-500">System updates and seat alerts will appear here.</p>
              </div>
            ) : (
              notifications.map((n) => {
                const Icon = CATEGORY_ICONS[n.category] || Info;
                return (
                  <div
                    key={n.id}
                    className={`flex items-start gap-3 px-4 py-3 transition-colors hover:bg-[var(--muted)] ${
                      !n.isRead ? "bg-amber-500/10" : ""
                    }`}
                  >
                    <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shrink-0 mt-0.5">
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-extrabold text-[var(--foreground)]">
                        {n.title}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-[var(--muted-foreground)]">
                        {n.message}
                      </p>
                      <span className="mt-1 block text-[10px] text-[var(--muted-foreground)]">
                        {timeAgo(n.createdAt)}
                      </span>
                    </div>
                    {!n.isRead && (
                      <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0 mt-1.5 animate-pulse" />
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <Link
            href={notifPath}
            className="block w-full border-t border-[var(--border)] py-3 text-center text-[11px] font-extrabold text-amber-500 transition-colors hover:bg-[var(--muted)] hover:text-amber-600 dark:text-amber-400 dark:hover:text-amber-300"
            onClick={() => setOpen(false)}
          >
            View all notifications →
          </Link>
        </div>
      )}
    </div>
  );
}
