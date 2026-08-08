import { auth, getServerSession } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const session = await getServerSession(request.headers);
  if (!session || !session.user) {
    return NextResponse.json({ user: null });
  }
  return NextResponse.json({ user: session.user });
}
