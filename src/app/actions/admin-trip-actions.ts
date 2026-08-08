"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { cancelTrip as cancelTripService, completeTrip as completeTripService, startTrip as startTripService } from "@/lib/trip-service";
import { baseFareSchema } from "@/lib/validators";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const tripIdSchema = z.string().uuid();
const reasonSchema = z.string().trim().min(3).max(500);

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") throw new Error("Admin access required.");
  return session.user.id;
}

function revalidateTrip(tripId: string) {
  revalidatePath("/admin/trips");
  revalidatePath(`/admin/trips/${tripId}`);
  revalidatePath("/admin/bookings");
  revalidatePath("/admin/tickets");
}

export async function startAdminTrip(tripId: string, reason: string) {
  const adminId = await requireAdmin();
  const parsed = z.object({ tripId: tripIdSchema, reason: reasonSchema }).safeParse({ tripId, reason });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message || "A reason is required.");
  await db.trip.update({ where: { id: tripId }, data: { adminOverrideStart: true, overrideApprovedById: adminId, overrideApprovedAt: new Date(), overrideReason: parsed.data.reason } });
  try {
    const updated = await startTripService(tripId);
    await db.activityLog.create({ data: { userId: adminId, action: "ADMIN_START_TRIP", targetType: "trip", targetId: tripId, metadata: { reason: parsed.data.reason } } });
    revalidateTrip(tripId);
    return { success: true, status: updated.status };
  } catch (error) {
    await db.trip.update({ where: { id: tripId }, data: { adminOverrideStart: false, overrideApprovedById: null, overrideApprovedAt: null, overrideReason: null } });
    throw error;
  }
}

export async function completeAdminTrip(tripId: string) {
  const adminId = await requireAdmin();
  const updated = await completeTripService(tripId);
  await db.activityLog.create({ data: { userId: adminId, action: "ADMIN_COMPLETE_TRIP", targetType: "trip", targetId: tripId } });
  revalidateTrip(tripId);
  return { success: true, status: updated.status };
}

export async function cancelAdminTrip(tripId: string, reason: string) {
  const adminId = await requireAdmin();
  const parsed = z.object({ tripId: tripIdSchema, reason: reasonSchema }).safeParse({ tripId, reason });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message || "A reason is required.");
  const updated = await cancelTripService(tripId, parsed.data.reason);
  await db.activityLog.create({ data: { userId: adminId, action: "ADMIN_CANCEL_TRIP", targetType: "trip", targetId: tripId, metadata: { reason: parsed.data.reason } } });
  revalidateTrip(tripId);
  return { success: true, status: updated.status };
}

export async function rescheduleAdminTrip(tripId: string, startTime: string) {
  const adminId = await requireAdmin();
  const parsed = z.object({ tripId: tripIdSchema, startTime: z.string().refine((value) => new Date(value).getTime() > Date.now(), "Departure must be in the future.") }).safeParse({ tripId, startTime });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message || "Invalid departure time.");
  const updated = await db.trip.updateMany({ where: { id: tripId, status: "SCHEDULED", manifestLocked: false }, data: { startTime: new Date(parsed.data.startTime) } });
  if (updated.count === 0) throw new Error("Only unlocked scheduled trips can be rescheduled.");
  await db.activityLog.create({ data: { userId: adminId, action: "RESCHEDULE_TRIP", targetType: "trip", targetId: tripId, metadata: { startTime: parsed.data.startTime } } });
  revalidateTrip(tripId);
  return { success: true };
}

export async function updateAvailableTripSeatPrice(tripId: string, price: number) {
  const adminId = await requireAdmin();
  const parsed = z.object({ tripId: tripIdSchema, price: baseFareSchema }).safeParse({ tripId, price });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message || "Invalid seat price.");
  const result = await db.$transaction(async (tx) => {
    const trip = await tx.trip.findUnique({ where: { id: tripId }, select: { status: true, manifestLocked: true } });
    if (!trip || trip.status !== "SCHEDULED" || trip.manifestLocked) throw new Error("Only unlocked scheduled trips can be repriced.");
    const updated = await tx.tripSeat.updateMany({ where: { tripId, status: "AVAILABLE" }, data: { basePrice: parsed.data.price, price: parsed.data.price } });
    await tx.activityLog.create({ data: { userId: adminId, action: "UPDATE_TRIP_AVAILABLE_SEAT_PRICE", targetType: "trip", targetId: tripId, metadata: { price: parsed.data.price, seatsUpdated: updated.count } } });
    return updated.count;
  });
  revalidateTrip(tripId);
  return { success: true, seatsUpdated: result };
}
