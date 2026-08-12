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

export function computeTargetUrl(category: string, title: string, userRole?: string): string {
  const role = userRole || "CUSTOMER";
  const titleLower = title.toLowerCase();

  if (category === "TRIP" || titleLower.includes("trip") || titleLower.includes("shuttle")) {
    if (role === "ADMIN") {
      if (titleLower.includes("request")) return "/admin/trips/approvals";
      return "/admin/trips";
    }
    if (role === "DRIVER") {
      if (titleLower.includes("approved") || titleLower.includes("declined")) return "/driver/trips";
      return "/driver/trips";
    }
    return "/passenger/bookings";
  }

  if (category === "BOOKING" || category === "PAYMENT" || titleLower.includes("payment") || titleLower.includes("booking") || titleLower.includes("utr")) {
    if (role === "ADMIN") {
      if (titleLower.includes("utr") || titleLower.includes("verification")) return "/admin/trips/approvals";
      return "/admin/bookings";
    }
    if (role === "DRIVER") return "/driver/bookings";
    return "/passenger/bookings";
  }

  if (titleLower.includes("settlement") || titleLower.includes("earnings") || titleLower.includes("payout")) {
    if (role === "DRIVER") return "/driver/earnings";
    if (role === "ADMIN") return "/admin/finance";
  }

  if (role === "ADMIN") return "/admin/notifications";
  if (role === "DRIVER") return "/driver/notifications";
  return "/passenger/notifications";
}

export async function getBellNotifications(userId: string) {
  const [user, unreadCount, notifications] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { role: true } }),
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

  const mapped = notifications.map((n) => ({
    ...n,
    targetUrl: computeTargetUrl(n.category, n.title, user?.role),
  }));

  return { unreadCount, notifications: mapped };
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
  | "PAYMENT_PROOF_SUBMITTED"
  | "PAYMENT_PROOF_APPROVED"
  | "PAYMENT_PROOF_REJECTED"
  | "TRIP_REQUESTED"
  | "TRIP_APPROVED"
  | "TRIP_REJECTED"
  | "TRIP_STARTED"
  | "TRIP_COMPLETED"
  | "TRIP_CANCELLED"
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
    let title = (metadata.customTitle as string) || "System Notification";
    let message = (metadata.customMessage as string) || "A system activity has occurred.";
    let category: NotificationCategory = (metadata.category as NotificationCategory) || "SYSTEM";

    if (!metadata.customTitle) {
      switch (type) {
        case "TRIP_REQUESTED": {
          title = "New Trip Schedule Request";
          message = `Driver requested trip ${metadata.route || "shuttle"} for ${metadata.startTime || "departure"}. Pending admin approval.`;
          category = "TRIP";
          break;
        }
        case "TRIP_APPROVED": {
          title = "Trip Schedule Approved";
          message = `Shuttle trip ${metadata.route || ""} on ${metadata.startTime || "schedule"} was approved by admin. Bookings open!`;
          category = "TRIP";
          break;
        }
        case "TRIP_REJECTED": {
          title = "Trip Schedule Declined";
          message = `Shuttle trip request ${metadata.route || ""} was declined: ${metadata.reason || "Operator decision"}.`;
          category = "TRIP";
          break;
        }
        case "TRIP_STARTED": {
          title = "Shuttle Departed!";
          message = `Shuttle ${metadata.route || "trip"} has departed! Track live route location in app.`;
          category = "TRIP";
          break;
        }
        case "TRIP_COMPLETED": {
          title = "Trip Arrived & Completed";
          message = `Shuttle ${metadata.route || "trip"} has safely arrived. Thank you for riding GoShuttles!`;
          category = "TRIP";
          break;
        }
        case "TRIP_CANCELLED": {
          title = "Trip Cancelled";
          message = `Shuttle ${metadata.route || "trip"} was cancelled: ${metadata.reason || "Operational delay"}.`;
          category = "TRIP";
          break;
        }
        case "PAYMENT_PROOF_SUBMITTED": {
          title = "Payment Verification Submitted";
          message = `UTR ${metadata.utrNumber || ""} submitted for seat ${metadata.seatNumber || ""}. Awaiting verification.`;
          category = "PAYMENT";
          break;
        }
        case "PAYMENT_PROOF_APPROVED": {
          title = "Payment Verified & Ticket Issued";
          message = `Payment proof for seat ${metadata.seatNumber || ""} verified! Your e-ticket is active.`;
          category = "PAYMENT";
          break;
        }
        case "PAYMENT_PROOF_REJECTED": {
          title = "Payment Verification Declined";
          message = `Payment proof for seat ${metadata.seatNumber || ""} was declined: ${metadata.reason || "Invalid transaction ID"}.`;
          category = "PAYMENT";
          break;
        }
        case "BOOKING_CREATED": {
          title = "Seat Lock Reserved";
          message = `Seat ${metadata.seatNumber || ""} held for 5 minutes (${metadata.route || "Corridor"}).`;
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

    // Always notify Admins for system alerts (excluding admin's own recipient notifications)
    await notifyAllAdmins(`[Notice] ${title}`, `${message}`, category);

  } catch (err) {
    console.error("[dispatchSystemEvent:createNotifications] Error:", err);
  }
}
