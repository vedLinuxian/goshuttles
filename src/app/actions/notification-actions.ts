"use server";

import { auth } from "@/auth";
import { markAsRead, markAllAsRead } from "@/lib/notification-service";
import { revalidatePath } from "next/cache";

export async function markNotificationRead(notificationId: string) {
  const session = await auth();
  if (!session?.user?.id) return;
  // Security: only mark as read if the notification belongs to the current user
  await markAsRead(notificationId, session.user.id);
  revalidatePath("/", "layout");
}

export async function markAllNotificationsRead(path?: string) {
  const session = await auth();
  if (!session?.user?.id) return;
  await markAllAsRead(session.user.id);
  if (path) revalidatePath(path);
  revalidatePath("/", "layout");
}
