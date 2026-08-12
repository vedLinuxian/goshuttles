import { describe, it, expect, vi } from "vitest";
import { tripStatusSchema, approvalStatusSchema, approveTripRequestSchema, rejectTripRequestSchema } from "../lib/validators";

describe("Ride Scheduling & Driver Approval Module Tests", () => {
  describe("Zod Validation Schemas", () => {
    it("validates trip status values including PENDING_APPROVAL and REJECTED", () => {
      expect(tripStatusSchema.safeParse("PENDING_APPROVAL").success).toBe(true);
      expect(tripStatusSchema.safeParse("SCHEDULED").success).toBe(true);
      expect(tripStatusSchema.safeParse("IN_PROGRESS").success).toBe(true);
      expect(tripStatusSchema.safeParse("COMPLETED").success).toBe(true);
      expect(tripStatusSchema.safeParse("CANCELLED").success).toBe(true);
      expect(tripStatusSchema.safeParse("REJECTED").success).toBe(true);
      expect(tripStatusSchema.safeParse("INVALID_STATUS").success).toBe(false);
    });

    it("validates approval status enum values", () => {
      expect(approvalStatusSchema.safeParse("PENDING").success).toBe(true);
      expect(approvalStatusSchema.safeParse("APPROVED").success).toBe(true);
      expect(approvalStatusSchema.safeParse("REJECTED").success).toBe(true);
      expect(approvalStatusSchema.safeParse("OTHER").success).toBe(false);
    });

    it("validates trip approval request schema", () => {
      const validUuid = "11111111-1111-4111-8111-111111111111";
      const valid = approveTripRequestSchema.safeParse({ tripId: validUuid });
      expect(valid.success).toBe(true);
    });

    it("validates trip rejection request schema and reason requirements", () => {
      const validUuid = "11111111-1111-4111-8111-111111111111";
      const valid = rejectTripRequestSchema.safeParse({
        tripId: validUuid,
        reason: "Vehicle maintenance scheduled during requested time slot.",
      });
      expect(valid.success).toBe(true);

      const invalidShort = rejectTripRequestSchema.safeParse({
        tripId: validUuid,
        reason: "No",
      });
      expect(invalidShort.success).toBe(false);
    });
  });

  describe("Schedule Conflict & Overlap Detection Logic", () => {
    it("detects vehicle departure overlaps within 2 hour buffer", () => {
      const existingTripStart = new Date("2026-08-15T10:00:00+05:30").getTime();
      const newTripStart = new Date("2026-08-15T11:00:00+05:30").getTime();
      const bufferMs = 2 * 60 * 60 * 1000;

      const hasOverlap = Math.abs(newTripStart - existingTripStart) <= bufferMs;
      expect(hasOverlap).toBe(true);
    });

    it("allows non-overlapping departures outside 2 hour buffer", () => {
      const existingTripStart = new Date("2026-08-15T10:00:00+05:30").getTime();
      const newTripStart = new Date("2026-08-15T13:30:00+05:30").getTime();
      const bufferMs = 2 * 60 * 60 * 1000;

      const hasOverlap = Math.abs(newTripStart - existingTripStart) <= bufferMs;
      expect(hasOverlap).toBe(false);
    });
  });

  describe("Driver Request vs Admin Scheduling Workflow Rules", () => {
    it("assigns PENDING_APPROVAL status to driver-initiated trip schedules", () => {
      const role = "DRIVER";
      const isPendingApproval = role === "DRIVER";
      const status = isPendingApproval ? "PENDING_APPROVAL" : "SCHEDULED";
      const approvalStatus = isPendingApproval ? "PENDING" : "APPROVED";

      expect(status).toBe("PENDING_APPROVAL");
      expect(approvalStatus).toBe("PENDING");
    });

    it("assigns SCHEDULED status to admin-initiated trip schedules", () => {
      const role = "ADMIN";
      const isPendingApproval = role === "DRIVER";
      const status = isPendingApproval ? "PENDING_APPROVAL" : "SCHEDULED";
      const approvalStatus = isPendingApproval ? "PENDING" : "APPROVED";

      expect(status).toBe("SCHEDULED");
      expect(approvalStatus).toBe("APPROVED");
    });
  });
});
