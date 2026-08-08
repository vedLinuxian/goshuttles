import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { rateLimit, getClientIp, RATE_LIMIT_ROUTES } from "@/lib/rate-limit";
import type { Prisma } from "@/generated/prisma/client";

export async function GET(req: NextRequest) {
  // ---------- Rate limit ----------
  const ip = getClientIp(req);
  const { headers, limited } = await rateLimit(ip, RATE_LIMIT_ROUTES.NOTIFICATIONS);
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

    // ---------- Parse query params ----------
    const { searchParams } = req.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "30", 10) || 30));
    const category = searchParams.get("category");

    // ---------- Build where clause ----------
    const where: Prisma.NotificationWhereInput = {
      userId,
    };

    if (category) {
      where.category = category;
    }

    // ---------- Query ----------
    const [notifications, total, unreadCount] = await Promise.all([
      db.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          title: true,
          message: true,
          category: true,
          isRead: true,
          createdAt: true,
        },
      }),
      db.notification.count({ where }),
      db.notification.count({ where: { userId, isRead: false } }),
    ]);

    const pages = Math.ceil(total / limit);

    return NextResponse.json(
      { data: notifications, total, page, limit, pages, unreadCount },
      { headers },
    );
  } catch (error) {
    console.error("[GET /api/notifications]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers },
    );
  }
}
