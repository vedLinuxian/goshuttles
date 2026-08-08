import { auth } from "@/auth";
import { redirect } from "next/navigation";
import {
  getNotificationsByCategory,
  getUnreadCount,
  type NotificationCategory,
} from "@/lib/notification-service";
import { NotificationListClient } from "@/components/notifications/notification-list-client";

interface DriverNotificationsPageProps {
  searchParams: Promise<{ page?: string; category?: string }>;
}

export default async function DriverNotificationsPage({
  searchParams,
}: DriverNotificationsPageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page || "1", 10) || 1);
  const category = params.category || "ALL";
  const limit = 10;

  const validCategories = ["ALL", "BOOKING", "PAYMENT", "TRIP", "SYSTEM", "PROMO"];
  const safeCategory: NotificationCategory | "ALL" = validCategories.includes(category)
    ? (category as NotificationCategory)
    : "ALL";

  const [data, unreadCount] = await Promise.all([
    getNotificationsByCategory(
      session.user.id!,
      safeCategory,
      page,
      limit
    ),
    getUnreadCount(session.user.id!),
  ]);

  const serialized = data.notifications.map((n) => ({
    ...n,
    createdAt: n.createdAt.toISOString(),
  }));

  return (
    <NotificationListClient
      notifications={serialized}
      total={data.total}
      page={data.page}
      totalPages={data.totalPages}
      currentCategory={safeCategory}
      unreadCount={unreadCount}
      notificationPath="/driver/notifications"
    />
  );
}
