import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAuditLogs } from "@/lib/notification-service";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "20", 10);
  const q = searchParams.get("q") || "";
  const action = searchParams.get("action") || "";
  const targetType = searchParams.get("targetType") || "";

  try {
    const data = await getAuditLogs({ page, limit, q, action, targetType });
    return NextResponse.json(data);
  } catch (err) {
    console.error("[GET /api/admin/audit-logs]", err);
    return NextResponse.json({ error: "Failed to fetch audit logs" }, { status: 500 });
  }
}
