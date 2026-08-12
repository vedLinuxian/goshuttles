import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ error: "Demo login is disabled in production." }, { status: 404 });
}
