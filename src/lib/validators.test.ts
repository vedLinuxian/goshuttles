import { describe, expect, it } from "vitest";
import {
  bookSeatSchema,
  createTripSchema,
  jsonLoginSchema,
  publicRegisterSchema,
  submitPaymentProofSchema,
} from "./validators";

const validUuid = "11111111-1111-4111-8111-111111111111";

 describe("boundary validation", () => {
  it("rejects client-controlled registration roles", () => {
    const result = publicRegisterSchema.safeParse({
      name: "Passenger One",
      phone: "9876543210",
      email: "passenger@example.com",
      password: "secure-password",
      role: "ADMIN",
    });

    expect(result.success).toBe(false);
  });

  it("accepts only valid future trip input", () => {
    const result = createTripSchema.safeParse({
      vehicleId: validUuid,
      sourceId: validUuid,
      destinationId: "22222222-2222-4222-8222-222222222222",
      startTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    });

    expect(result.success).toBe(true);
  });

  it("rejects booking attempts with an invalid seat number", () => {
    const result = bookSeatSchema.safeParse({
      tripId: validUuid,
      seatNumber: "A1",
      paymentMode: "CASH",
    });

    expect(result.success).toBe(false);
  });

  it("requires a payment reference for payment-proof submissions", () => {
    const result = submitPaymentProofSchema.safeParse({
      bookingId: validUuid,
      utrNumber: "bad value",
    });

    expect(result.success).toBe(false);
  });

  it("validates phone/email login credentials", () => {
    expect(
      jsonLoginSchema.safeParse({
        emailOrPhone: "passenger@example.com",
        password: "secure-password",
      }).success,
    ).toBe(true);

    expect(
      jsonLoginSchema.safeParse({
        emailOrPhone: "not-an-email-or-phone",
        password: "secure-password",
      }).success,
    ).toBe(false);
  });
});
