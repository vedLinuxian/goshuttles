import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { POST as assignVehicleRoute } from "../app/api/admin/assign-vehicle/route";
import { GET as tripsRoute } from "../app/api/trips/route";
import { POST as registerRoute } from "../app/api/auth/register-json/route";
import * as authLib from "../auth";
import { db } from "../lib/db";
import * as rateLimitLib from "../lib/rate-limit";

vi.mock("../auth", () => ({
  auth: vi.fn(),
}));

vi.mock("../lib/db", () => ({
  db: {
    user: { findUnique: vi.fn(), findFirst: vi.fn() },
    vehicle: { findUnique: vi.fn(), update: vi.fn() },
    trip: { findMany: vi.fn() },
    passengerProfile: { create: vi.fn() }
  },
}));

vi.mock("../lib/rate-limit", () => ({
  rateLimit: vi.fn(),
  getClientIp: vi.fn(),
  RATE_LIMIT_ROUTES: { ADMIN_ASSIGN_VEHICLE: "admin", TRIPS: "trips", AUTH_REGISTER: "auth" },
}));

vi.mock("../lib/auth", () => ({
  auth: {
    api: {
      signUpEmail: vi.fn(),
    }
  },
  applySetCookies: vi.fn(),
}));

describe("API Routes Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/admin/assign-vehicle", () => {
    it("should return 401 if not authorized", async () => {
      vi.mocked(authLib.auth).mockResolvedValueOnce(null);
      const req = new NextRequest("http://localhost/api/admin/assign-vehicle", { method: "POST" });
      const res = await assignVehicleRoute(req);
      expect(res.status).toBe(401);
    });

    it("should return 422 on invalid input", async () => {
      vi.mocked(authLib.auth).mockResolvedValueOnce({
        user: { id: "1", role: "ADMIN", name: "Admin", email: "admin@test.com", phone: "9999999999", isActive: true, emailVerified: true, createdAt: new Date(), updatedAt: new Date() },
        session: { id: "1", userId: "1", expiresAt: new Date(), ipAddress: "", userAgent: "", createdAt: new Date(), updatedAt: new Date(), token: "token" }
      });
      const req = new NextRequest("http://localhost/api/admin/assign-vehicle", {
        method: "POST",
        body: JSON.stringify({ driverId: "not-uuid", vehicleId: "not-uuid" }),
      });
      const res = await assignVehicleRoute(req);
      expect(res.status).toBe(422);
    });
  });

  describe("GET /api/trips", () => {
    it("should handle rate limiting gracefully", async () => {
      vi.mocked(rateLimitLib.rateLimit).mockResolvedValueOnce({
        headers: new Headers(),
        limited: new NextResponse("Too many requests", { status: 429 }) as any,
      });
      const req = new NextRequest("http://localhost/api/trips");
      const res = await tripsRoute(req);
      expect(res.status).toBe(429);
    });

    it("should return 400 on invalid date format", async () => {
      vi.mocked(rateLimitLib.rateLimit).mockResolvedValueOnce({
        headers: new Headers(),
        limited: null as any,
      });
      const req = new NextRequest("http://localhost/api/trips?date=invalid-date");
      const res = await tripsRoute(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/Date must use/);
    });
  });

  describe("POST /api/auth/register-json", () => {
    it("should return 400 on missing required fields", async () => {
      vi.mocked(rateLimitLib.rateLimit).mockResolvedValueOnce({
        headers: new Headers(),
        limited: null as any,
      });
      const req = new NextRequest("http://localhost/api/auth/register-json", {
        method: "POST",
        body: JSON.stringify({}),
      });
      const res = await registerRoute(req);
      expect(res.status).toBe(400);
    });
  });
});
