"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Bell,
  Ticket,
  CreditCard,
  Route,
  Info,
  Megaphone,
  Check,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { markNotificationRead, markAllNotificationsRead } from "@/app/actions/notification-actions";

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  category: string;
  isRead: boolean;
  createdAt: string;
};

interface NotificationListClientProps {
  notifications: NotificationItem[];
  total: number;
  page: number;
  totalPages: number;
  currentCategory: string;
  unreadCount: number;
  notificationPath: string;
}

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  BOOKING: Ticket,
  PAYMENT: CreditCard,
  TRIP: Route,
  SYSTEM: Info,
  PROMO: Megaphone,
};

const CATEGORY_COLORS: Record<string, string> = {
  BOOKING: "text-sky-400 bg-sky-500/10 border border-sky-500/20",
  PAYMENT: "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20",
  TRIP: "text-purple-400 bg-purple-500/10 border border-purple-500/20",
  SYSTEM: "text-[var(--foreground)] bg-[var(--muted)] border border-[var(--border)]/50",
  PROMO: "text-amber-400 bg-amber-500/10 border border-amber-500/20",
};

const CATEGORIES = [
  { key: "ALL", label: "All" },
  { key: "BOOKING", label: "Booking" },
  { key: "PAYMENT", label: "Payment" },
  { key: "TRIP", label: "Trip" },
  { key: "SYSTEM", label: "System" },
] as const;

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(dateStr).toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
  });
}

export function NotificationListClient({
  notifications,
  total,
  page,
  totalPages,
  currentCategory,
  unreadCount,
  notificationPath,
}: NotificationListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [optimisticRead, setOptimisticRead] = useState<Set<string>>(new Set());

  const handleCategoryChange = (category: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (category === "ALL") {
      params.delete("category");
    } else {
      params.set("category", category);
    }
    params.delete("page");
    router.push(`?${params.toString()}`);
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newPage <= 1) {
      params.delete("page");
    } else {
      params.set("page", String(newPage));
    }
    router.push(`?${params.toString()}`);
  };

  const handleMarkRead = async (id: string) => {
    setOptimisticRead((prev) => new Set(prev).add(id));
    await markNotificationRead(id);
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead(notificationPath);
  };

  const isRead = (id: string, actual: boolean) => {
    return optimisticRead.has(id) || actual;
  };

  if (notifications.length === 0) {
    return (
      <div className="space-y-6 max-w-2xl">
        <CategoryTabs
          current={currentCategory}
          onChange={handleCategoryChange}
        />
        <div className="text-center py-16 bg-[var(--background)]/90 backdrop-blur-xl rounded-3xl border border-[var(--border)] shadow-2xl">
          <Bell className="h-12 w-12 mx-auto mb-3 text-amber-500/40" />
          <p className="text-sm font-bold text-[var(--foreground)]">No notifications</p>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">
            {currentCategory === "ALL"
              ? "You're all caught up!"
              : `No ${currentCategory.toLowerCase()} notifications yet.`}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-[var(--foreground)] tracking-tight flex items-center gap-2">
          <Bell className="h-6 w-6 text-amber-400" />
          Notifications
        </h1>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
          >
            <Check className="h-4 w-4" />
            Mark all as read ({unreadCount})
          </button>
        )}
      </div>

      {/* Category Tabs */}
      <CategoryTabs current={currentCategory} onChange={handleCategoryChange} />

      {/* Notifications List */}
      <div className="space-y-3">
        {notifications.map((n) => {
          const Icon = CATEGORY_ICONS[n.category] || Info;
          const colorClasses =
            CATEGORY_COLORS[n.category] || CATEGORY_COLORS.SYSTEM;
          const read = isRead(n.id, n.isRead);
          return (
            <div
              key={n.id}
              className={`p-4 rounded-2xl border transition-all duration-300 ${
                read
                  ? "bg-[var(--background)]/90 border-[var(--border)] text-[var(--foreground)] backdrop-blur-xl"
                  : "bg-[var(--card)]/90 border-amber-500/40 text-[var(--foreground)] shadow-lg shadow-amber-500/5 glow-amber"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2.5 rounded-xl shrink-0 ${colorClasses}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-[var(--foreground)]">
                        {n.title}
                      </p>
                      <p className="text-xs text-[var(--foreground)] mt-1 leading-relaxed">
                        {n.message}
                      </p>
                    </div>
                    <span className="text-[10px] text-[var(--muted-foreground)] shrink-0 whitespace-nowrap font-mono">
                      {timeAgo(n.createdAt)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-3">
                    <span className="text-[10px] font-extrabold uppercase text-amber-400 tracking-wider">
                      {n.category}
                    </span>
                    {!read && (
                      <button
                        onClick={() => handleMarkRead(n.id)}
                        className="text-[11px] font-bold text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
                      >
                        Mark as read
                      </button>
                    )}
                  </div>
                </div>
                {!read && (
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0 mt-1.5 animate-pulse" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-[var(--muted-foreground)]">
            Showing {(page - 1) * 10 + 1}–{Math.min(page * 10, total)} of{" "}
            {total}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1}
              className="p-2 rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] hover:bg-[var(--muted)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => handlePageChange(p)}
                className={`w-8 h-8 rounded-xl text-xs font-bold transition-colors ${
                  p === page
                    ? "bg-amber-500 text-slate-950 font-extrabold shadow-md glow-amber"
                    : "bg-[var(--card)]/80 border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--muted)]"
                }`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= totalPages}
              className="p-2 rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] hover:bg-[var(--muted)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function CategoryTabs({
  current,
  onChange,
}: {
  current: string;
  onChange: (category: string) => void;
}) {
  return (
    <div className="flex items-center gap-1.5 bg-[var(--card)]/90 border border-[var(--border)] rounded-2xl p-1.5 w-fit">
      {CATEGORIES.map((cat) => (
        <button
          key={cat.key}
          onClick={() => onChange(cat.key)}
          className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            current === cat.key
              ? "bg-amber-500 text-slate-950 shadow-md glow-amber"
              : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          }`}
        >
          {cat.label}
        </button>
      ))}
    </div>
  );
}
