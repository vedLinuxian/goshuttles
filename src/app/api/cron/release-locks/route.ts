import { releaseExpiredLocks } from "@/lib/booking-service";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 10;

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const count = await releaseExpiredLocks();
  return NextResponse.json({ released: count });
}

