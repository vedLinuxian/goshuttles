import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { markAllAsRead } from "@/lib/notification-service";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const userId = body?.userId || session.user.id;

    // Security: only allow marking own notifications as read
    if (userId !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const result = await markAllAsRead(userId);
    return NextResponse.json({ success: true, count: result.count });
  } catch (error) {
    console.error("[POST /api/notifications/mark-all-read]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
