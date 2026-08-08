import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 60; // 60 requests per minute per IP+route

function createRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  try {
    return new Redis({ url, token });
  } catch {
    return null;
  }
}

const redis = createRedis();

// Local in-memory fallback for development / when Redis is not configured.
// This is NOT shared across serverless instances; production must configure Redis.
const localStore = new Map<string, RateLimitEntry>();

function localCleanup() {
  const now = Date.now();
  for (const [key, entry] of localStore) {
    if (now > entry.resetAt) localStore.delete(key);
  }
}

function buildHeaders(limit: number, remaining: number, resetAt: number, retryAfter?: number): Headers {
  const headers = new Headers();
  headers.set("X-RateLimit-Limit", String(limit));
  headers.set("X-RateLimit-Remaining", String(Math.max(0, remaining)));
  headers.set("X-RateLimit-Reset", String(Math.ceil(resetAt / 1000)));
  if (retryAfter !== undefined) headers.set("Retry-After", String(retryAfter));
  return headers;
}

async function rateLimitRedis(
  key: string,
  maxRequests: number,
  windowMs: number,
): Promise<{ headers: Headers; limited: NextResponse | null }> {
  const now = Date.now();
  const resetAt = now + windowMs;

  // Use a sliding-window counter stored in Redis with a TTL.
  const countKey = `rate_limit:${key}`;
  const current = (await redis?.get<number>(countKey)) ?? 0;

  if (current === 0) {
    await redis?.set(countKey, 1, { ex: Math.ceil(windowMs / 1000) });
  } else {
    await redis?.incr(countKey);
  }

  const count = current + 1;
  const remaining = Math.max(0, maxRequests - count);
  const headers = buildHeaders(maxRequests, remaining, resetAt);

  if (count > maxRequests) {
    const retryAfter = Math.ceil(windowMs / 1000);
    return {
      headers: buildHeaders(maxRequests, remaining, resetAt, retryAfter),
      limited: NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429, headers }),
    };
  }

  return { headers, limited: null };
}

function rateLimitMemory(key: string, maxRequests: number, windowMs: number): { headers: Headers; limited: NextResponse | null } {
  localCleanup();

  const now = Date.now();
  const entry = localStore.get(key);

  if (!entry || now > entry.resetAt) {
    const resetAt = now + windowMs;
    localStore.set(key, { count: 1, resetAt });
    return { headers: buildHeaders(maxRequests, maxRequests - 1, resetAt), limited: null };
  }

  entry.count++;
  const remaining = Math.max(0, maxRequests - entry.count);
  const headers = buildHeaders(maxRequests, remaining, entry.resetAt);

  if (entry.count > maxRequests) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return {
      headers: buildHeaders(maxRequests, remaining, entry.resetAt, retryAfter),
      limited: NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429, headers }),
    };
  }

  return { headers, limited: null };
}

/**
 * Rate limit by IP and route.
 * Uses Upstash Redis when configured, otherwise falls back to an in-memory store
 * (not shared across instances; configure Redis for production).
 */
export async function rateLimit(
  ip: string,
  route: string,
  maxRequests: number = MAX_REQUESTS,
  windowMs: number = WINDOW_MS,
): Promise<{ headers: Headers; limited: NextResponse | null }> {
  const key = `${ip}:${route}`;
  if (redis) {
    try {
      return await rateLimitRedis(key, maxRequests, windowMs);
    } catch (err) {
      console.warn("[RateLimiter] Upstash Redis error, falling back to memory:", err);
    }
  }
  return rateLimitMemory(key, maxRequests, windowMs);
}

/** Extract a best-effort client IP from request headers. */
export function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "127.0.0.1";
}

export const RATE_LIMIT_ROUTES = {
  TRIPS: "trips",
  TRIPS_ID: "trips_id",
  BOOKINGS: "bookings",
  NOTIFICATIONS: "notifications",
  NOTIFICATIONS_READ: "notifications_read",
  ADMIN_STATS: "admin_stats",
  DRIVER_STATS: "driver_stats",
  AUTH_LOGIN: "auth_login",
  AUTH_REGISTER: "auth_register",
} as const;