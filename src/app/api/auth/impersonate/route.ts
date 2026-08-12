import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { db } from "@/lib/db";
import crypto from "node:crypto";

export async function GET(req: NextRequest) {
  const session = await getServerSession(req.headers);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
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

  // Create temporary session token (valid 2 hours)
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);

  await db.session.create({
    data: {
      id: crypto.randomUUID(),
      userId: targetUser.id,
      token,
      expiresAt,
    },
  });

  // Determine redirect URL based on role
  let redirectPath = "/passenger/dashboard";
  if (targetUser.role === "DRIVER") redirectPath = "/driver/dashboard";
  if (targetUser.role === "ADMIN") redirectPath = "/admin/dashboard";

  const redirectUrl = new URL(redirectPath, req.url);
  const response = NextResponse.redirect(redirectUrl);

  // Set better-auth session cookies
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    expires: expiresAt,
  };

  response.cookies.set("better-auth.session_token", token, cookieOptions);
  response.cookies.set("__Secure-better-auth.session_token", token, cookieOptions);
  response.cookies.set("impersonating_admin_id", session.user.id, { ...cookieOptions, httpOnly: false });

  return response;
}
