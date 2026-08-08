import { Prisma } from "@/generated/prisma/client";
import { db } from "./db";

export type NotificationCategory = "BOOKING" | "PAYMENT" | "TRIP" | "SYSTEM" | "PROMO";

export async function createNotification(
  userId: string,
  title: string,
  message: string,
  category: NotificationCategory = "SYSTEM"
) {
  return db.notification.create({
    data: { userId, title, message, category },
  });
}

export async function notifyAllAdmins(
  title: string,
  message: string,
  category: NotificationCategory = "SYSTEM"
) {
  const admins = await db.user.findMany({
    where: { role: "ADMIN", isActive: true },
    select: { id: true },
  });

  if (admins.length === 0) return;

  return db.notification.createMany({
    data: admins.map((admin) => ({
      userId: admin.id,
      title,
      message,
      category,
    })),
  });
}

export async function getUnreadCount(userId: string) {
  return db.notification.count({
    where: { userId, isRead: false },
  });
}

export async function getNotifications(
  userId: string,
  page: number = 1,
  limit: number = 10
) {
  const skip = (page - 1) * limit;
  const [notifications, total] = await Promise.all([
    db.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    db.notification.count({ where: { userId } }),
  ]);

  return {
    notifications,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getNotificationsByCategory(
  userId: string,
  category: NotificationCategory | "ALL",
  page: number = 1,
  limit: number = 10
) {
  const skip = (page - 1) * limit;
  const where = category === "ALL" ? { userId } : { userId, category };

  const [notifications, total] = await Promise.all([
    db.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    db.notification.count({ where }),
  ]);

  return {
    notifications,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function markAsRead(notificationId: string, userId?: string) {
  return db.notification.updateMany({
    where: userId ? { id: notificationId, userId } : { id: notificationId },
    data: { isRead: true },
  });
}

export async function markAllAsRead(userId: string) {
  return db.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
}

export async function getBellNotifications(userId: string) {
  const [unreadCount, notifications] = await Promise.all([
    db.notification.count({ where: { userId, isRead: false } }),
    db.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true,
        title: true,
        message: true,
        category: true,
        isRead: true,
        createdAt: true,
      },
    }),
  ]);

  return { unreadCount, notifications };
}

// ============================================================
// ENTERPRISE AUDIT LOG ENGINE
// ============================================================

export async function logActivity(
  userId: string,
  action: string,
  targetType: string,
  targetId: string,
  metadata?: Prisma.InputJsonValue
) {
  return db.activityLog.create({
    data: { userId, action, targetType, targetId, metadata },
  });
}

export async function getAuditLogs(options: {
  page?: number;
  limit?: number;
  q?: string;
  action?: string;
  targetType?: string;
  userId?: string;
}) {
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(100, Math.max(1, options.limit || 20));
  const skip = (page - 1) * limit;

  const where: Prisma.ActivityLogWhereInput = {};

  if (options.action) where.action = options.action;
  if (options.targetType) where.targetType = options.targetType;
  if (options.userId) where.userId = options.userId;

  if (options.q) {
    where.OR = [
      { action: { contains: options.q, mode: "insensitive" } },
      { targetType: { contains: options.q, mode: "insensitive" } },
      { targetId: { contains: options.q, mode: "insensitive" } },
      { user: { name: { contains: options.q, mode: "insensitive" } } },
      { user: { phone: { contains: options.q, mode: "insensitive" } } },
    ];
  }

  const [logs, total] = await Promise.all([
    db.activityLog.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, phone: true, role: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    db.activityLog.count({ where }),
  ]);

  return {
    logs,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

// ============================================================
// SYSTEM EVENT DISPATCHER (Multi-Role Notification + Audit)
// ============================================================

export type SystemEventType =
  | "BOOKING_CREATED"
  | "BOOKING_CONFIRMED"
  | "BOOKING_CANCELLED"
  | "BOOKING_NO_SHOW"
  | "TRIP_STATUS_CHANGED"
  | "DRIVER_ASSIGNED"
  | "SETTLEMENT_PROCESSED"
  | "COMPLAINT_CREATED";

export async function dispatchSystemEvent(event: {
  type: SystemEventType;
  actorId: string;
  targetId: string;
  recipientUserIds?: string[];
  metadata?: Record<string, unknown>;
}) {
  const { type, actorId, targetId, recipientUserIds = [], metadata = {} } = event;

  // 1. Audit Log Entry
  try {
    await logActivity(actorId, type, type.split("_")[0], targetId, metadata as Prisma.InputJsonValue);
  } catch (err) {
    console.error("[dispatchSystemEvent:logActivity] Error:", err);
  }

  // 2. Notification Dispatching per Event Type
  try {
    let title = "System Notification";
    let message = "A system activity has occurred.";
    let category: NotificationCategory = "SYSTEM";

    switch (type) {
      case "BOOKING_CREATED": {
        title = "Seat Lock Reserved";
        message = `Seat ${metadata.seatNumber || ""} held exclusively for 5 minutes (${metadata.route || "Corridor"}).`;
        category = "BOOKING";
        break;
      }
      case "BOOKING_CONFIRMED": {
        title = "Booking Confirmed!";
        message = `Seat ${metadata.seatNumber || ""} confirmed for ${metadata.route || "your shuttle"}. Boarding pass generated.`;
        category = "BOOKING";
        break;
      }
      case "BOOKING_CANCELLED": {
        title = "Reservation Cancelled";
        message = `Booking for ${metadata.route || "shuttle"} seat ${metadata.seatNumber || ""} was cancelled.`;
        category = "BOOKING";
        break;
      }
      case "TRIP_STATUS_CHANGED": {
        title = `Trip ${metadata.newStatus || "Updated"}`;
        message = `Shuttle ${metadata.route || ""} status is now ${metadata.newStatus}.`;
        category = "TRIP";
        break;
      }
      case "DRIVER_ASSIGNED": {
        title = "Driver Partner Assigned";
        message = `Driver ${metadata.driverName || ""} assigned to ${metadata.route || "shuttle"}.`;
        category = "TRIP";
        break;
      }
      case "SETTLEMENT_PROCESSED": {
        title = "Wallet Settlement Payout";
        message = `Settlement of ₹${metadata.amount || 0} processed successfully.`;
        category = "PAYMENT";
        break;
      }
      case "COMPLAINT_CREATED": {
        title = "Support Ticket Logged";
        message = `Complaint #${targetId.slice(0, 8)} registered. Operations team will review.`;
        category = "SYSTEM";
        break;
      }
    }

    // Notify specific recipients
    const uniqueRecipients = Array.from(new Set(recipientUserIds.filter(Boolean)));
    if (uniqueRecipients.length > 0) {
      await db.notification.createMany({
        data: uniqueRecipients.map((uid) => ({
          userId: uid,
          title,
          message,
          category,
        })),
      });
    }

    // Always notify Admins for critical events
    await notifyAllAdmins(`[Audit Alert] ${title}`, `${message} (Target ID: ${targetId.slice(0, 8)})`, category);

  } catch (err) {
    console.error("[dispatchSystemEvent:createNotifications] Error:", err);
  }
}
