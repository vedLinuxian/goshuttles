import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await getServerSession(req.headers);
  if (!session?.user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");

  // Handle EXIT Impersonation Sandbox
  if (action === "exit") {
    const response = NextResponse.redirect(new URL("/admin/users", req.url));
    response.cookies.delete("impersonate_target_id");
    return response;
  }

  // Handle START Impersonation Sandbox
  // Requester must be an actual ADMIN
  if (session.user.role !== "ADMIN" && !session.user.isImpersonating) {
    return NextResponse.json({ error: "Admin access required for impersonation." }, { status: 403 });
  }

  const targetUserId = searchParams.get("userId");
  if (!targetUserId) {
    return NextResponse.json({ error: "Target userId is required." }, { status: 400 });
  }

  const targetUser = await db.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, name: true, role: true, isActive: true },
  });

  if (!targetUser) {
    return NextResponse.json({ error: "Target user not found." }, { status: 404 });
  }
  if (!targetUser.isActive) {
    return NextResponse.json({ error: "Cannot impersonate an inactive user." }, { status: 400 });
  }

  let redirectPath = "/passenger/dashboard";
  if (targetUser.role === "DRIVER") redirectPath = "/driver/dashboard";
  if (targetUser.role === "ADMIN") redirectPath = "/admin/dashboard";

  const response = NextResponse.redirect(new URL(redirectPath, req.url));

  // Set non-destructive impersonation cookie
  response.cookies.set("impersonate_target_id", targetUser.id, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}
