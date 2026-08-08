"use client";

import { usePathname } from "next/navigation";
import { NotificationBell } from "@/components/ui/notification-bell";
import { ThemeToggle } from "./theme-toggle";
import { navigationByRole } from "./sidebar";
import { UserProfileMenu, type UserInfo } from "./user-profile-menu";

type Role = "ADMIN" | "DRIVER" | "CUSTOMER";
function roleOf(value?: string): Role {
  return value === "ADMIN" || value === "DRIVER" ? value : "CUSTOMER";
}

export function TopHeader({ user }: { user: UserInfo }) {
  const pathname = usePathname();
  const role = roleOf(user.role);
  const items = navigationByRole[role].flatMap((section) => section.items);
  const current = items.find(
    (item) => pathname === item.href || item.children?.some((prefix) => pathname?.startsWith(prefix))
  );
  const title = current?.label ?? "Workspace";
  const crumbs = pathname?.split("/").filter(Boolean) ?? [];

  return (
    <header className="flex min-h-16 shrink-0 items-center justify-between gap-4 border-b border-[var(--border)] bg-[var(--background)] px-4 sm:px-6">
      {/* Title & Breadcrumbs */}
      <div className="min-w-0">
        <p className="truncate text-base font-extrabold text-[var(--foreground)]">{title}</p>
        <nav aria-label="Breadcrumb" className="hidden items-center gap-1 text-[11px] text-[var(--text-subtle)] sm:flex">
          <span>Workspace</span>
          {crumbs.slice(1).map((crumb) => (
            <span key={crumb} className="flex items-center gap-1">
              <span aria-hidden="true">/</span>
              <span className="capitalize">{crumb.replaceAll("-", " ")}</span>
            </span>
          ))}
        </nav>
      </div>

      {/* Top Right Controls: Theme Toggle, Notifications, User Profile Menu */}
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <ThemeToggle />
        <NotificationBell userId={user.id || ""} userRole={user.role} />
        <UserProfileMenu user={user} />
      </div>
    </header>
  );
}
