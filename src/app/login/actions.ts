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

  if (!user || !user.isActive) {
    return { error: "Invalid credentials. Please check your details and try again." };
  }

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