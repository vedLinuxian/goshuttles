"use server";

import { applySetCookies, auth as betterAuth, getPasswordContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { compare } from "bcryptjs";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

const emailSchema = z.string().email();

function getDefaultRedirect(role: "ADMIN" | "DRIVER" | "CUSTOMER") {
  if (role === "ADMIN") return "/admin/dashboard";
  if (role === "DRIVER") return "/driver/dashboard";
  return "/passenger/dashboard";
}

async function signInWithBetterAuth(email: string, password: string) {
  const result = await betterAuth.api.signInEmail({
    body: { email, password, rememberMe: true },
    headers: await headers(),
    returnHeaders: true,
  });
  const setCookies = result.headers?.getSetCookie ? result.headers.getSetCookie() : result.headers?.get("set-cookie");
  await applySetCookies(setCookies);
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

const DEMO_ACCOUNTS = {
  admin: { phone: "9999999999", email: "admin@goayodhya.com", role: "ADMIN" as const },
  driver: { phone: "9876543210", email: "rahul.driver@goayodhya.com", role: "DRIVER" as const },
  passenger: { phone: "9123456780", email: "passenger@goayodhya.com", role: "CUSTOMER" as const },
} as const;

type DemoKey = keyof typeof DEMO_ACCOUNTS;

export async function demoLogin(key: DemoKey, callbackUrl?: string) {
  if (process.env.ENABLE_DEMO_LOGIN === "false") {
    return { error: "Demo login is disabled." };
  }

  const account = DEMO_ACCOUNTS[key];
  if (!account) return { error: "Invalid demo account." };

  const user = await db.user.findFirst({
    where: {
      OR: [{ phone: account.phone }, { email: account.email }],
    },
    select: { id: true, email: true, phone: true, passwordHash: true, role: true, isActive: true },
  });

  if (!user || !user.isActive || user.role !== account.role) {
    return { error: "This demo account is not configured." };
  }

  const password = process.env[`DEMO_${key.toUpperCase()}_PASSWORD`] || (key === "admin" ? "admin123" : key === "driver" ? "driver123" : "pass123");

  const formData = new FormData();
  formData.set("credential", user.email || user.phone || account.phone);
  formData.set("password", password);
  if (callbackUrl) {
    formData.set("callbackUrl", callbackUrl);
  }
  return login(null, formData);
}

export async function login(_prevState: unknown, formData: FormData) {
  const credential = ((formData.get("credential") as string) || "").trim();
  const password = (formData.get("password") as string) || "";
  const callbackUrl = ((formData.get("callbackUrl") as string) || "").trim();

  if (!credential || !password) {
    return { error: "Please provide your phone number/email and password." };
  }

  const isEmail = emailSchema.safeParse(credential).success;
  const user = isEmail
    ? await db.user.findUnique({ where: { email: credential.toLowerCase() } })
    : await db.user.findUnique({ where: { phone: credential } });

  // BUG-038 fix: single generic error for all user-not-found / inactive cases
  if (!user || !user.isActive) {
    return { error: "Invalid credentials. Please check your details and try again." };
  }

  // BUG-037 fix: phone-only users have no email — they can only authenticate via passwordHash.
  // If the user has an email AND a credential account, use better-auth flow.
  // Otherwise fall through to passwordHash comparison below.

  const credentialAccount = user.email
    ? await db.account.findFirst({
        where: { userId: user.id, providerId: "credential" },
      })
    : null;

  if (user.email && credentialAccount) {
    try {
      await signInWithBetterAuth(user.email, password);
    } catch {
      return { error: "Invalid credentials. Please check your details and try again." };
    }
  } else if (user.email) {
    // User has email but no credential account — fall through to passwordHash
    if (!user.passwordHash) {
      return { error: "Invalid credentials. Please check your details and try again." };
    }
    const isValid = await compare(password, user.passwordHash);
    if (!isValid) {
      return { error: "Invalid credentials. Please check your details and try again." };
    }
    await createCredentialAccount(user.id, password);
    try {
      await signInWithBetterAuth(user.email, password);
    } catch {
      return { error: "Invalid credentials. Please check your details and try again." };
    }
  } else {
    // Phone-only user (no email): authenticate directly via passwordHash
    if (!user.passwordHash) {
      return { error: "Invalid credentials. Please check your details and try again." };
    }
    const isValid = await compare(password, user.passwordHash);
    if (!isValid) {
      return { error: "Invalid credentials. Please check your details and try again." };
    }
  }

  const isSafeCallback = callbackUrl.startsWith("/") && !callbackUrl.startsWith("//");
  const targetRedirect = isSafeCallback ? callbackUrl : getDefaultRedirect(user.role);

  redirect(targetRedirect);
}