import { auth, applySetCookies } from "@/lib/auth";
import { db } from "@/lib/db";
import { getClientIp, rateLimit, RATE_LIMIT_ROUTES } from "@/lib/rate-limit";
import { compare } from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";

const DEMO_ACCOUNTS = {
  admin: { phone: "9999999999", role: "ADMIN" as const, redirectUrl: "/admin/dashboard" },
  driver: { phone: "9876543210", role: "DRIVER" as const, redirectUrl: "/driver/dashboard" },
  passenger: { phone: "9123456780", role: "CUSTOMER" as const, redirectUrl: "/passenger/dashboard" },
} as const;

type DemoKey = keyof typeof DEMO_ACCOUNTS;

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const { headers, limited } = await rateLimit(ip, RATE_LIMIT_ROUTES.AUTH_LOGIN, 10);
  if (limited) return limited;

  if (process.env.ENABLE_DEMO_LOGIN === "false") {
    return NextResponse.json({ error: "Demo login is disabled." }, { status: 404, headers });
  }

  try {
    const body = (await request.json()) as { key?: unknown; callbackUrl?: unknown };
    const key = body.key;
    if (typeof key !== "string" || !(key in DEMO_ACCOUNTS)) {
      return NextResponse.json({ error: "Invalid demo account." }, { status: 400, headers });
    }

    const account = DEMO_ACCOUNTS[key as DemoKey];
    const password = process.env[`DEMO_${key.toUpperCase()}_PASSWORD`] || (key === "admin" ? "admin123" : key === "driver" ? "driver123" : "pass123");

    const user = await db.user.findUnique({
      where: { phone: account.phone },
      select: { id: true, email: true, passwordHash: true, role: true, isActive: true },
    });

    if (!user || !user.isActive || user.role !== account.role || !user.email || !user.passwordHash) {
      return NextResponse.json({ error: "This demo account is not configured." }, { status: 503, headers });
    }

    if (!(await compare(password, user.passwordHash))) {
      return NextResponse.json({ error: "This demo account password is invalid." }, { status: 503, headers });
    }

    let credentialAccount = await db.account.findFirst({
      where: { userId: user.id, providerId: "credential" },
    });

    if (!credentialAccount) {
      const context = await (auth as unknown as { $context: Promise<{ password: { hash: (value: string) => Promise<string> } }> }).$context;
      const hashedPassword = await context.password.hash(password);
      credentialAccount = await db.account.create({
        data: {
          userId: user.id,
          providerId: "credential",
          accountId: user.id,
          password: hashedPassword,
        },
      });
    }

    const result = await auth.api.signInEmail({
      body: { email: user.email, password, rememberMe: true },
      headers: request.headers,
      returnHeaders: true,
    });

    const setCookieHeaders = result.headers?.getSetCookie ? result.headers.getSetCookie() : result.headers?.get("set-cookie");
    await applySetCookies(setCookieHeaders);

    const redirectTarget = typeof body.callbackUrl === "string" && body.callbackUrl && !body.callbackUrl.includes("/login")
      ? body.callbackUrl
      : account.redirectUrl;

    const response = NextResponse.json({ success: true, redirectUrl: redirectTarget }, { headers });
    if (setCookieHeaders) {
      const cookiesArray = Array.isArray(setCookieHeaders) ? setCookieHeaders : setCookieHeaders.split(/,(?=[^;]*=)/);
      cookiesArray.forEach((cookieStr) => {
        response.headers.append("set-cookie", cookieStr.trim());
      });
    }

    return response;
  } catch {
    return NextResponse.json({ error: "Demo sign-in failed. Please try again." }, { status: 500, headers });
  }
}
