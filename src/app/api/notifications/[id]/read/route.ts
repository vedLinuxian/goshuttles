import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { rateLimit, getClientIp, RATE_LIMIT_ROUTES } from "@/lib/rate-limit";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // ---------- Rate limit ----------
  const ip = getClientIp(req);
  const { headers, limited } = await rateLimit(ip, RATE_LIMIT_ROUTES.NOTIFICATIONS_READ);
  if (limited) return limited;

  // ---------- Auth check ----------
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401, headers },
    );
  }

  try {
    const userId = session.user.id;
    const { id: notificationId } = await params;

    if (!notificationId || notificationId.length < 10) {
      return NextResponse.json(
        { error: "Invalid notification ID" },
        { status: 400, headers },
      );
    }

    // ---------- Fetch notification ----------
    const notification = await db.notification.findUnique({
      where: { id: notificationId },
      select: { id: true, userId: true, isRead: true },
    });

    if (!notification) {
      return NextResponse.json(
        { error: "Notification not found" },
        { status: 404, headers },
      );
    }

    // ---------- Ownership check ----------
    if (notification.userId !== userId) {
      return NextResponse.json(
        { error: "Forbidden: you do not own this notification" },
        { status: 403, headers },
      );
    }

    // Already read — idempotent
    if (notification.isRead) {
      return NextResponse.json(
        { data: { id: notification.id, isRead: true, message: "Already marked as read" } },
        { headers },
      );
    }

    // ---------- Mark as read ----------
    await db.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });

    return NextResponse.json(
      { data: { id: notification.id, isRead: true } },
      { headers },
    );
  } catch (error) {
    console.error("[PATCH /api/notifications/[id]/read]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers },
    );
  }
}
