"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import {
  startTrip as startTripService,
  completeTrip as completeTripService,
  cancelTrip as cancelTripService,
  canStartTrip as canStartTripService,
  updateTripGpsLocation as updateTripGpsLocationService,
} from "@/lib/trip-service";
import { getVehicleSeatTemplates } from "@/lib/trip-seat-template-service";
import { getCurrentUser } from "@/lib/auth/role-check";

// ============================================================
// TYPES
// ============================================================

type ActionResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

// ============================================================
// CONSTANTS
// ============================================================

/** Base fare in INR for each directed route (source → destination). */
const ROUTE_PRICES: Record<string, number> = {
  "Lucknow→Ayodhya": 300,
  "Ayodhya→Lucknow": 300,
  "Lucknow→Gorakhpur": 500,
  "Gorakhpur→Ayodhya": 350,
  "Ayodhya→Varanasi": 400,
  "Varanasi→Ayodhya": 400,
  "Lucknow→Varanasi": 600,
  "Ayodhya→Gorakhpur": 450,
};

type SeatDef = {
  number: string;
  type: "FRONT" | "MIDDLE" | "BACK";
};

const SEATS_CONFIG: SeatDef[] = [
  { number: "F1", type: "FRONT" },
  { number: "M1", type: "MIDDLE" },
  { number: "M2", type: "MIDDLE" },
  { number: "M3", type: "MIDDLE" },
  { number: "B1", type: "BACK" },
  { number: "B2", type: "BACK" },
];

const SEAT_TYPE_MULTIPLIER: Record<SeatDef["type"], number> = {
  FRONT: 1.2,
  MIDDLE: 1.0,
  BACK: 0.9,
};

// ============================================================
// ZOD SCHEMAS
// ============================================================

import {
  createTripSchema,
  completeTripSchema,
  cancelTripSchema,
} from "@/lib/validators";

// ============================================================
// HELPERS
// ============================================================

function getRoutePrice(sourceName: string, destName: string): number {
  const key = `${sourceName}→${destName}`;
  return ROUTE_PRICES[key] ?? 350; // default fallback
}

function seatsForRoute(sourceName: string, destName: string) {
  const base = getRoutePrice(sourceName, destName);
  return SEATS_CONFIG.map((s) => ({
    seatNumber: s.number,
    seatType: s.type,
    price: Math.round(base * SEAT_TYPE_MULTIPLIER[s.type]),
  }));
}

// ============================================================
// 1. createTrip
// ============================================================

export async function createTrip(
  input: z.infer<typeof createTripSchema>
): Promise<ActionResult<{ tripId: string; isPendingApproval?: boolean }>> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { success: false, error: "Unauthorized — please sign in." };
  }

  const role = currentUser.role;
  if (role !== "DRIVER" && role !== "ADMIN") {
    return { success: false, error: "Only drivers and admins can create trips." };
  }

  const parsed = createTripSchema.safeParse(input);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return { success: false, error: firstError?.message ?? "Invalid input" };
  }

  const { vehicleId, sourceId, destinationId, startTime: startTimeStr } = parsed.data;
  const startTime = new Date(
    startTimeStr.includes('+') || startTimeStr.includes('Z')
      ? startTimeStr
      : `${startTimeStr}:00+05:30`
  );

  try {
    if (isNaN(startTime.getTime()) || startTime.getTime() <= Date.now()) {
      return { success: false, error: "Trip departure time must be in the future." };
    }

    const vehicle = await db.vehicle.findUnique({
      where: { id: vehicleId },
      include: {
        owner: {
          select: {
            id: true,
            role: true,
            isActive: true,
            driverProfile: { select: { kycStatus: true, isAvailable: true } },
          },
        },
      },
    });
    if (!vehicle || !vehicle.isActive) {
      return { success: false, error: "Selected vehicle is not active or available." };
    }

    if (!vehicle.owner || !vehicle.owner.isActive) {
      return { success: false, error: "Vehicle owner account is inactive." };
    }

    if (vehicle.owner.role === "DRIVER" && vehicle.owner.driverProfile?.kycStatus !== "APPROVED") {
      return { success: false, error: "The vehicle owner must have an active account and approved KYC." };
    }

    if (role === "DRIVER" && vehicle.ownerId !== currentUser.id) {
      return { success: false, error: "You can only schedule trips using your own vehicles." };
    }

    const [source, destination] = await Promise.all([
      db.location.findUnique({ where: { id: sourceId } }),
      db.location.findUnique({ where: { id: destinationId } }),
    ]);

    if (!source || !destination) {
      return { success: false, error: "Source or destination location not found." };
    }

    const assignedDriverId = (parsed.data.driverId && parsed.data.driverId.length > 0)
      ? parsed.data.driverId
      : (vehicle.owner.role === "DRIVER" ? vehicle.ownerId : currentUser.id);

    const { createTrip: createTripService } = await import("@/lib/trip-service");
    const trip = await createTripService(
      assignedDriverId,
      vehicleId,
      sourceId,
      destinationId,
      startTime,
      role as "ADMIN" | "DRIVER",
      currentUser.id
    );

    revalidatePath("/driver/trips");
    revalidatePath("/admin/trips");
    revalidatePath("/admin/trips/approvals");

    return {
      success: true,
      data: {
        tripId: trip.id,
        isPendingApproval: trip.status === "PENDING_APPROVAL",
      },
    };
  } catch (e: unknown) {
    const message =
      e instanceof Error ? e.message : "An unexpected error occurred while creating the trip.";
    return { success: false, error: message };
  }
}

export async function approveDriverTripAction(
  tripId: string,
  overrideDriverId?: string,
  overrideVehicleId?: string
): Promise<ActionResult<{ tripId: string; status: string }>> {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "ADMIN") {
    return { success: false, error: "Unauthorized — Admin access required." };
  }

  try {
    const { approveTripRequest } = await import("@/lib/trip-service");
    const updated = await approveTripRequest(tripId, currentUser.id, overrideDriverId, overrideVehicleId);

    revalidatePath("/admin/trips");
    revalidatePath("/admin/trips/approvals");
    revalidatePath("/driver/trips");

    return { success: true, data: { tripId: updated.id, status: updated.status } };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to approve trip request." };
  }
}

export async function rejectDriverTripAction(
  tripId: string,
  reason: string
): Promise<ActionResult<{ tripId: string; status: string }>> {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "ADMIN") {
    return { success: false, error: "Unauthorized — Admin access required." };
  }

  try {
    const { rejectTripRequest } = await import("@/lib/trip-service");
    const updated = await rejectTripRequest(tripId, currentUser.id, reason);

    revalidatePath("/admin/trips");
    revalidatePath("/admin/trips/approvals");
    revalidatePath("/driver/trips");

    return { success: true, data: { tripId: updated.id, status: updated.status } };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to decline trip request." };
  }
}

// ============================================================
// 2. startTrip & adminOverrideStartTrip
// ============================================================

export async function adminOverrideStartTrip(
  tripId: string,
  reason?: string
): Promise<ActionResult<{ tripId: string; status: string }>> {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return { success: false, error: "Unauthorized — admin access required." };
  }

  try {
    await db.trip.update({
      where: { id: tripId },
      data: {
        adminOverrideStart: true,
        overrideApprovedById: session.user.id,
        overrideApprovedAt: new Date(),
        overrideReason: reason || "Admin override departure",
      },
    });

    const updated = await startTripService(tripId);

    revalidatePath(`/driver/trips/${tripId}`);
    revalidatePath("/driver/trips");
    revalidatePath("/admin/trips");

    return { success: true, data: { tripId: updated.id, status: updated.status } };
  } catch (e: unknown) {
    const message =
      e instanceof Error ? e.message : "Failed to override and start trip.";
    return { success: false, error: message };
  }
}

export const overrideStartTrip = adminOverrideStartTrip;

export async function startTrip(
  tripId: string
): Promise<ActionResult<{ tripId: string; status: string }>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized — please sign in." };
  }

  try {
    const trip = await db.trip.findUnique({
      where: { id: tripId },
      select: { driverId: true, status: true },
    });
    if (!trip) {
      throw new Error("Trip not found.");
    }
    const isAdmin = session.user.role === "ADMIN";
    if (!isAdmin && trip.driverId !== session.user.id) {
      throw new Error("Only the assigned driver or an admin can start this trip.");
    }

    const updated = await startTripService(tripId);

    revalidatePath(`/driver/trips/${tripId}`);
    revalidatePath("/driver/trips");
    return { success: true, data: { tripId: updated.id, status: updated.status } };
  } catch (e: unknown) {
    const message =
      e instanceof Error ? e.message : "An unexpected error occurred while starting the trip.";
    return { success: false, error: message };
  }
}

export async function checkTripStartValidationAction(tripId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized — please sign in." };
  }
  try {
    const val = await canStartTripService(tripId);
    return { success: true, data: val };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "Validation check failed." };
  }
}

export async function updateDriverGpsLocationAction(tripId: string, lat: number, lng: number) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized — please sign in." };
  }
  try {
    const trip = await db.trip.findUnique({
      where: { id: tripId },
      select: { driverId: true, status: true },
    });
    if (!trip) throw new Error("Trip not found.");
    if (session.user.role !== "ADMIN" && trip.driverId !== session.user.id) {
      throw new Error("Only the assigned driver can broadcast location for this trip.");
    }
    if (trip.status !== "IN_PROGRESS" && trip.status !== "SCHEDULED") {
      throw new Error("Location updates are only allowed for active or upcoming trips.");
    }

    const updated = await updateTripGpsLocationService(tripId, lat, lng);
    return {
      success: true,
      data: {
        currentLat: Number(updated.currentLat),
        currentLong: Number(updated.currentLong),
        lastLocationUpdate: updated.lastLocationUpdate?.toISOString() ?? null,
      },
    };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to update GPS location." };
  }
}

// ============================================================
// 3. completeTrip
// ============================================================

export async function completeTrip(
  tripId: string
): Promise<ActionResult<{ tripId: string; status: string }>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized — please sign in." };
  }

  const parsed = completeTripSchema.safeParse({ tripId });
  if (!parsed.success) {
    return { success: false, error: "Invalid trip ID." };
  }

  try {
    // Ownership check, then delegate to the shared service (full settlement + NO_SHOW handling).
    const trip = await db.trip.findUnique({
      where: { id: tripId },
      select: { driverId: true, status: true },
    });
    if (!trip) {
      throw new Error("Trip not found.");
    }
    if (trip.driverId !== session.user.id) {
      throw new Error("Only the assigned driver can complete this trip.");
    }

    const updated = await completeTripService(tripId);

    revalidatePath(`/driver/trips/${tripId}`);
    revalidatePath("/driver/trips");
    revalidatePath("/admin/trips");

    return { success: true, data: { tripId: updated.id, status: updated.status } };
  } catch (e: unknown) {
    const message =
      e instanceof Error ? e.message : "An unexpected error occurred while completing the trip.";
    return { success: false, error: message };
  }
}

// ============================================================
// 4. cancelTrip
// ============================================================

export async function cancelTrip(
  tripId: string,
  reason?: string
): Promise<ActionResult<{ tripId: string; status: string }>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized — please sign in." };
  }

  const parsed = cancelTripSchema.safeParse({ tripId, reason });
  if (!parsed.success) {
    return { success: false, error: "Invalid trip ID." };
  }

  try {
    const trip = await db.trip.findUnique({
      where: { id: tripId },
      select: { id: true, driverId: true },
    });
    if (!trip) throw new Error("Trip not found.");
    if (session.user.role !== "ADMIN" && trip.driverId !== session.user.id) {
      throw new Error("Only the trip driver or an admin can cancel this trip.");
    }

    const updated = await cancelTripService(tripId, reason);

    revalidatePath(`/driver/trips/${tripId}`);
    revalidatePath("/driver/trips");
    revalidatePath("/admin/trips");

    return { success: true, data: { tripId: updated.id, status: updated.status } };
  } catch (e: unknown) {
    const message =
      e instanceof Error ? e.message : "An unexpected error occurred while cancelling the trip.";
    return { success: false, error: message };
  }
}

// ============================================================
// 5. getTripDetail (server action for re-fetching after mutations)
// ============================================================

export async function getTripDetail(tripId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  const parsedTripId = z.string().uuid().safeParse(tripId);
  if (!parsedTripId.success) {
    return { success: false, error: "Invalid trip ID." };
  }

  try {
    const access = await db.trip.findUnique({
      where: { id: tripId },
      select: { id: true, driverId: true },
    });
    if (!access) {
      return { success: false, error: "Trip not found." };
    }

    const isAuthorized =
      session.user.role === "ADMIN" ||
      session.user.isImpersonating ||
      (session.user.role === "DRIVER" && (access.driverId === session.user.id || !access.driverId));
    if (!isAuthorized) {
      return { success: false, error: "Forbidden." };
    }

    const trip = await db.trip.findUnique({
      where: { id: tripId },
      include: {
        source: true,
        destination: true,
        driver: { select: { id: true, name: true, phone: true } },
        vehicle: true,
        seats: { orderBy: { seatNumber: "asc" } },
        bookings: {
          include: {
            user: { select: { id: true, name: true, phone: true } },
            seat: true,
            ticket: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!trip) {
      return { success: false, error: "Trip not found." };
    }

    const totalSeats = trip.seats.length;
    const bookedSeats = trip.seats.filter((s) => s.status === "BOOKED").length;
    const availableSeats = trip.seats.filter((s) => s.status === "AVAILABLE").length;
    const lockedSeats = trip.seats.filter((s) => s.status === "LOCKED").length;

    return {
      success: true,
      data: {
        ...trip,
        startTime: trip.startTime.toISOString(),
        actualStartTime: trip.actualStartTime?.toISOString() ?? null,
        actualEndTime: trip.actualEndTime?.toISOString() ?? null,
        availability: { totalSeats, bookedSeats, availableSeats, lockedSeats },
        seats: trip.seats.map((s) => ({
          ...s,
          price: s.price ? s.price.toString() : "0",
          lockedAt: s.lockedAt?.toISOString() ?? null,
        })),
        bookings: trip.bookings.map((b) => ({
          ...b,
          totalAmount: b.totalAmount ? b.totalAmount.toString() : "0",
          commissionAmount: b.commissionAmount ? b.commissionAmount.toString() : "0",
          createdAt: b.createdAt.toISOString(),
          cancelledAt: b.cancelledAt?.toISOString() ?? null,
          seat: b.seat
            ? { ...b.seat, price: b.seat.price ? b.seat.price.toString() : "0", lockedAt: b.seat.lockedAt?.toISOString() ?? null }
            : null,
          ticket: b.ticket
            ? {
                ...b.ticket,
                ticketPrice: b.ticket.ticketPrice ? b.ticket.ticketPrice.toString() : "0",
                tripDate: b.ticket.tripDate ? b.ticket.tripDate.toISOString() : new Date().toISOString(),
                issuedAt: b.ticket.issuedAt ? b.ticket.issuedAt.toISOString() : new Date().toISOString(),
              }
            : null,
        })),
      },
    };

  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to fetch trip details.";
    return { success: false, error: message };
  }
}

// ============================================================
// 6. getDriverVehicles & getLocations (for form dropdowns)
// ============================================================

export async function getDriverVehicles() {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const vehicles = await db.vehicle.findMany({
      where: {
        ownerId: session.user.id,
        isActive: true,
      },
      select: { id: true, regNumber: true, modelName: true },
      orderBy: { regNumber: "asc" },
    });

    return { success: true, data: vehicles };
  } catch (e: unknown) {
    return { success: false, error: "Failed to fetch vehicles." };
  }
}

export async function getLocations() {
  try {
    const locations = await db.location.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
    return { success: true, data: locations };
  } catch (e: unknown) {
    return { success: false, error: "Failed to fetch locations." };
  }
}
