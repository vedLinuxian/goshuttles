import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ready" });
  } catch (error) {
    console.error("[GET /api/ready]", error);
    return NextResponse.json({ status: "unavailable" }, { status: 503 });
  }
}
