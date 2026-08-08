import { describe, expect, it } from "vitest";
import { tripStatusSchema, locationSchema, vehicleSeatPriceSchema } from "./validators";
import { z } from "zod";

const validUuid = "11111111-1111-4111-8111-111111111111";

describe("Advanced Platform Scenarios & Mobile Parameters", () => {
  describe("Dynamic Surge Pricing & Commission Logic", () => {
    it("calculates surge prices correctly when occupancy threshold is met", () => {
      const baseFare = 300;
      const surgeMultiplier = 1.25;
      const occupancyThreshold = 0.6; // 60%
      const totalCapacity = 10;
      const bookedSeats = 7; // 70% occupancy -> exceeds 60%

      const isSurging = bookedSeats / totalCapacity >= occupancyThreshold;
      const finalFare = isSurging ? Math.round(baseFare * surgeMultiplier) : baseFare;

      expect(isSurging).toBe(true);
      expect(finalFare).toBe(375);
    });

    it("calculates platform commission split correctly", () => {
      const ticketFare = 400;
      const commissionRate = 5.0; // 5%

      const platformFee = Math.round(ticketFare * (commissionRate / 100));
      const driverPayout = ticketFare - platformFee;

      expect(platformFee).toBe(20);
      expect(driverPayout).toBe(380);
    });
  });

  describe("Mobile Search Parameters & Query Validation", () => {
    it("validates mobile date string format (YYYY-MM-DD)", () => {
      const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
      expect(dateSchema.safeParse("2026-08-07").success).toBe(true);
      expect(dateSchema.safeParse("07-08-2026").success).toBe(false);
      expect(dateSchema.safeParse("invalid-date").success).toBe(false);
    });

    it("parses trip status filter values safely", () => {
      expect(tripStatusSchema.safeParse("SCHEDULED").success).toBe(true);
      expect(tripStatusSchema.safeParse("IN_PROGRESS").success).toBe(true);
      expect(tripStatusSchema.safeParse("COMPLETED").success).toBe(true);
      expect(tripStatusSchema.safeParse("CANCELLED").success).toBe(true);
      expect(tripStatusSchema.safeParse("UNKNOWN_STATUS").success).toBe(false);
    });

    it("accepts valid location name and fare inputs", () => {
      const result = locationSchema.safeParse({
        name: "Lucknow (Alambagh Terminal)",
        baseFare: 250,
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty or excessively short location names", () => {
      const result = locationSchema.safeParse({
        name: "A",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("Vehicle Seat Pricing & Locking Rules", () => {
    it("validates vehicle seat price update schemas", () => {
      const valid = vehicleSeatPriceSchema.safeParse({
        vehicleId: validUuid,
        seatNumber: "F1",
        basePrice: 350,
      });
      expect(valid.success).toBe(true);

      const invalidPrice = vehicleSeatPriceSchema.safeParse({
        vehicleId: validUuid,
        seatNumber: "F1",
        basePrice: -50,
      });
      expect(invalidPrice.success).toBe(false);
    });
  });
});
