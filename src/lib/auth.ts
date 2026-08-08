import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { parseSetCookieHeader, toCookieOptions } from "better-auth/cookies";
import { db } from "@/lib/db";
import { cookies, headers } from "next/headers";

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  database: prismaAdapter(db, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 6,
  },
  user: {
    additionalFields: {
      phone: {
        type: "string",
        required: false,
      },
      role: {
        type: "string",
        required: false,
        defaultValue: "CUSTOMER",
      },
      isActive: {
        type: "boolean",
        required: false,
        defaultValue: true,
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  plugins: [nextCookies()],
  databaseHooks: {
    user: {
      create: {
        before: (user) => {
          const data = user as Record<string, unknown>;
          const { role, isActive, passwordHash, ...safe } = data;
          void role;
          void isActive;
          void passwordHash;
          return Promise.resolve({
            data: {
              ...safe,
              role: "CUSTOMER",
              isActive: true,
              passwordHash: "",
            } as Record<string, unknown>,
          });
        },
      },
      update: {
        before: (user) => {
          const data = user as Record<string, unknown>;
          const { role, isActive, passwordHash, ...safe } = data;
          void role;
          void isActive;
          void passwordHash;
          return Promise.resolve({
            data: safe as Record<string, unknown>,
          });
        },
      },
    },
  },
});

export async function getServerSession(reqHeaders?: Headers) {
  try {
    const requestHeaders = reqHeaders ?? (await headers());
    const res = await auth.api.getSession({ headers: requestHeaders });
    if (!res || !res.user) return null;

    const dbUser = await db.user.findUnique({
      where: { id: res.user.id },
      select: { role: true, isActive: true, phone: true, name: true, email: true },
    });

    if (!dbUser || dbUser.isActive === false) return null;

    return {
      ...res,
      user: {
        ...res.user,
        id: res.user.id,
        name: dbUser.name ?? res.user.name ?? null,
        email: dbUser.email ?? res.user.email ?? null,
        phone: dbUser.phone || (res.user as { phone?: string }).phone || "",
        role: dbUser.role || "CUSTOMER",
        isActive: dbUser.isActive,
      },
    };
  } catch {
    return null;
  }
}

export async function applySetCookies(setCookie: string | string[] | null | undefined) {
  if (!setCookie) return;
  const cookieStrings = Array.isArray(setCookie) ? setCookie : [setCookie];
  const cookieStore = await cookies();
  for (const str of cookieStrings) {
    if (!str) continue;
    const parsed = parseSetCookieHeader(str);
    parsed.forEach((value: { value: string }, key: string) => {
      if (!key) return;
      try {
        cookieStore.set(key, value.value, toCookieOptions(value));
      } catch {
        // ignore invalid cookie
      }
    });
  }
}

export type SessionUser = NonNullable<Awaited<ReturnType<typeof getServerSession>>>["user"];

export type BetterAuthPasswordContext = {
  password: {
    hash: (password: string) => Promise<string>;
  };
};

export async function getPasswordContext() {
  const authWithContext = auth as unknown as { $context: Promise<BetterAuthPasswordContext> };
  return authWithContext.$context;
}