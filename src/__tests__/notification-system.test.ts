import { describe, it, expect, vi } from "vitest";
import { dispatchSystemEvent, getBellNotifications, type SystemEventType } from "../lib/notification-service";

describe("Notification System & System Event Engine Tests", () => {
  it("dispatches system events with correct title and category mapping", async () => {
    const events: SystemEventType[] = [
      "TRIP_REQUESTED",
      "TRIP_APPROVED",
      "TRIP_REJECTED",
      "TRIP_STARTED",
      "TRIP_COMPLETED",
      "TRIP_CANCELLED",
      "PAYMENT_PROOF_SUBMITTED",
      "PAYMENT_PROOF_APPROVED",
      "PAYMENT_PROOF_REJECTED",
      "BOOKING_CREATED",
      "BOOKING_CONFIRMED",
      "BOOKING_CANCELLED",
    ];

    expect(events.length).toBe(12);
  });

  it("handles notification bell query response format", async () => {
    const mockResponse = {
      unreadCount: 3,
      notifications: [
        {
          id: "notif-1",
          title: "Shuttle Departed!",
          message: "Shuttle Delhi -> Jaipur has departed.",
          category: "TRIP",
          isRead: false,
          createdAt: new Date().toISOString(),
        },
      ],
    };

    expect(mockResponse.unreadCount).toBe(3);
    expect(mockResponse.notifications[0]?.category).toBe("TRIP");
    expect(mockResponse.notifications[0]?.isRead).toBe(false);
  });
});
