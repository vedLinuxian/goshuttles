import { auth, applySetCookies } from "@/lib/auth";
import { db } from "@/lib/db";
import { getClientIp, rateLimit, RATE_LIMIT_ROUTES } from "@/lib/rate-limit";
import { publicRegisterSchema } from "@/lib/validators";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const { headers, limited } = await rateLimit(ip, RATE_LIMIT_ROUTES.AUTH_REGISTER, 5);
  if (limited) return limited;

  try {
    const body: unknown = await req.json();
    const parsed = publicRegisterSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid registration details." },
        { status: 400, headers }
      );
    }

    const name = parsed.data.name.trim();
    const phone = parsed.data.phone.trim();
    const email = parsed.data.email?.trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400, headers });
    }

    const existing = await db.user.findFirst({
      where: { OR: [{ phone }, { email }] },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json({ error: "An account with this phone or email already exists." }, { status: 409, headers });
    }

    const result = await auth.api.signUpEmail({
      body: {
        name,
        email,
        password: parsed.data.password,
        phone,
      },
      headers: req.headers,
      returnHeaders: true,
    });

    await applySetCookies(result.headers?.get("set-cookie"));

    const user = result.response?.user;
    if (!user?.id) {
      return NextResponse.json({ error: "Registration failed." }, { status: 500, headers });
    }

    await db.passengerProfile.create({
      data: { userId: user.id, fullName: name },
    });

    return NextResponse.json({ success: true, user }, { headers });
  } catch (err: unknown) {
    const errorCode =
      typeof err === "object" && err !== null && "body" in err &&
      typeof err.body === "object" && err.body !== null && "code" in err.body
        ? err.body.code
        : undefined;
    if (errorCode === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL") {
      return NextResponse.json(
        { error: "An account with this phone or email already exists." },
        { status: 409, headers }
      );
    }
    return NextResponse.json({ error: "Registration failed." }, { status: 500, headers });
  }
}