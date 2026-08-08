import { auth, applySetCookies, getPasswordContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { getClientIp, rateLimit, RATE_LIMIT_ROUTES } from "@/lib/rate-limit";
import { jsonLoginSchema } from "@/lib/validators";
import { compare } from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";

function getDefaultRedirect(role: "ADMIN" | "DRIVER" | "CUSTOMER") {
  if (role === "ADMIN") return "/admin/dashboard";
  if (role === "DRIVER") return "/driver/dashboard";
  return "/passenger/dashboard";
}

async function signInWithBetterAuth(email: string, password: string, reqHeaders: Headers) {
  const result = await auth.api.signInEmail({
    body: { email, password, rememberMe: true },
    headers: reqHeaders,
    returnHeaders: true,
  });
  await applySetCookies(result.headers?.get("set-cookie"));
  return result.response as { token: string; user: { id: string } };
}

async function createCredentialAccount(userId: string, password: string) {
  const ctx = await getPasswordContext();
  const hashed = await ctx.password.hash(password);
  return db.account.create({
    data: {
      userId,
      providerId: "credential",
      accountId: userId,
      password: hashed,
    },
  });
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const { headers, limited } = await rateLimit(ip, RATE_LIMIT_ROUTES.AUTH_LOGIN, 10);
  if (limited) return limited;

  try {
    const body: unknown = await req.json();
    const parsed = jsonLoginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid credentials." }, { status: 400, headers });
    }

    const credential = parsed.data.emailOrPhone.trim();
    const isEmail = credential.includes("@");
    const user = isEmail
      ? await db.user.findUnique({ where: { email: credential.toLowerCase() } })
      : await db.user.findUnique({ where: { phone: credential } });

    if (!user || !user.isActive || !user.email) {
      return NextResponse.json({ error: "Invalid credentials." }, { status: 401, headers });
    }

    const credentialAccount = await db.account.findFirst({
      where: { userId: user.id, providerId: "credential" },
    });

    if (credentialAccount) {
      try {
        await signInWithBetterAuth(user.email, parsed.data.password, req.headers);
      } catch {
        return NextResponse.json({ error: "Invalid credentials." }, { status: 401, headers });
      }
    } else {
      if (!user.passwordHash) {
        return NextResponse.json({ error: "Invalid credentials." }, { status: 401, headers });
      }
      const isValid = await compare(parsed.data.password, user.passwordHash);
      if (!isValid) {
        return NextResponse.json({ error: "Invalid credentials." }, { status: 401, headers });
      }
      await createCredentialAccount(user.id, parsed.data.password);
      try {
        await signInWithBetterAuth(user.email, parsed.data.password, req.headers);
      } catch {
        return NextResponse.json({ error: "Invalid credentials." }, { status: 401, headers });
      }
    }

    return NextResponse.json(
      {
        success: true,
        redirectUrl: getDefaultRedirect(user.role),
        user: { id: user.id, name: user.name, role: user.role },
      },
      { headers }
    );
  } catch {
    return NextResponse.json({ error: "Authentication failed." }, { status: 500, headers });
  }
}