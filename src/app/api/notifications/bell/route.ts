import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getBellNotifications } from "@/lib/notification-service";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = req.nextUrl.searchParams.get("userId");
  // Only allow fetching own notifications via auth, but accept userId for client convenience
  const targetUserId = userId && userId === session.user.id ? userId : session.user.id;

  try {
    const data = await getBellNotifications(targetUserId);
    return NextResponse.json(data);
  } catch (error) {
    console.error("[GET /api/notifications/bell]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
