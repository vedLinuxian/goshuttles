"use server";

/**
 * Wrapper server actions compatible with <form action={...}>
 * 
 * React/Next.js form action prop requires: (formData: FormData) => Promise<void>
 * These wrappers bridge our domain actions (which use ActionResult / custom params)
 * to the FormData-first API expected by <form action>.
 */

import { auth } from "@/auth";
import { cancelBooking } from "@/lib/booking-service";
import { addVehicle as addVehicleAction, createVehicle as createVehicleAction, removeVehicle as removeVehicleAction, toggleVehicleActive as toggleVehicleActiveAction } from "./vehicle-actions";
import { updateDriverProfile as updateDriverProfileAction, updatePassengerProfile as updatePassengerProfileAction, updateDriverKycStatus as updateDriverKycStatusAction, toggleDriverAvailability as toggleDriverAvailabilityAction } from "./profile-actions";
import { createLocation as createLocationAction, updateLocation as updateLocationAction, deleteLocation as deleteLocationAction } from "./location-actions";
import { createTrip as createTripAction, startTrip as startTripAction, completeTrip as completeTripAction, cancelTrip as cancelTripAction, adminOverrideStartTrip as adminOverrideStartTripAction } from "./trip-actions";
import { revalidatePath } from "next/cache";

// ─── BOOKING ────────────────────────────────────────────────

export async function cancelBookingForm(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return;

  const bookingId = formData.get("bookingId") as string;
  const reason = (formData.get("reason") as string) || undefined;
  try {
    await cancelBooking(bookingId, reason, session.user.id, session.user.role);
  } catch {
    // Errors are surfaced in the booking UI via useActionState/toast; keep the form submission safe.
  }
  revalidatePath(`/passenger/booking/${bookingId}`);
  revalidatePath("/passenger/bookings");
  revalidatePath("/admin/tickets");
}

// ─── VEHICLE ────────────────────────────────────────────────

export async function createVehicleForm(formData: FormData) {
  await createVehicleAction(formData);
  revalidatePath("/driver/profile");
  revalidatePath("/admin/vehicles");
}

export async function removeVehicleForm(formData: FormData) {
  const vehicleId = formData.get("vehicleId") as string;
  await removeVehicleAction(vehicleId);
  revalidatePath("/driver/profile");
  revalidatePath("/admin/vehicles");
}

export async function toggleVehicleActiveForm(formData: FormData) {
  const vehicleId = formData.get("vehicleId") as string;
  const isActiveStr = formData.get("isActive") as string;
  const isActive = isActiveStr !== null ? isActiveStr === "true" : undefined;
  await toggleVehicleActiveAction(vehicleId, isActive);
  revalidatePath("/admin/vehicles");
}

export async function addVehicleForm(formData: FormData) {
  await addVehicleAction(null, formData);
  revalidatePath("/driver/profile");
}

// ─── LOCATION ───────────────────────────────────────────────

export async function createLocationForm(formData: FormData) {
  await createLocationAction(null, formData);
  revalidatePath("/admin/locations");
}

export async function updateLocationForm(formData: FormData) {
  await updateLocationAction(null, formData);
  revalidatePath("/admin/locations");
}

export async function deleteLocationForm(formData: FormData) {
  await deleteLocationAction(null, formData);
  revalidatePath("/admin/locations");
}

// ─── DRIVER PROFILE & AVAILABILITY ─────────────────────────

export async function updateDriverProfileForm(formData: FormData) {
  await updateDriverProfileAction(null, formData);
  revalidatePath("/driver/profile");
}

export async function toggleDriverAvailabilityForm(formData: FormData) {
  const isAvailable = formData.get("isAvailable") === "true";
  await toggleDriverAvailabilityAction(isAvailable);
  revalidatePath("/driver/dashboard");
  revalidatePath("/driver/profile");
}

// ─── PASSENGER PROFILE ──────────────────────────────────────

export async function updatePassengerProfileForm(formData: FormData) {
  await updatePassengerProfileAction(null, formData);
  revalidatePath("/passenger/profile");
}

// ─── KYC ───────────────────────────────────────────────────

export async function approveKycForm(formData: FormData) {
  const driverUserId = formData.get("driverUserId") as string;
  await updateDriverKycStatusAction(driverUserId, "APPROVED");
  revalidatePath("/admin/drivers");
}

export async function rejectKycForm(formData: FormData) {
  const driverUserId = formData.get("driverUserId") as string;
  await updateDriverKycStatusAction(driverUserId, "REJECTED");
  revalidatePath("/admin/drivers");
}

// ─── TRIP ───────────────────────────────────────────────────

export async function createTripForm(formData: FormData) {
  const vehicleId = formData.get("vehicleId") as string;
  const sourceId = formData.get("sourceId") as string;
  const destinationId = formData.get("destinationId") as string;
  const startTime = formData.get("startTime") as string;

  await createTripAction({ vehicleId, sourceId, destinationId, startTime });
  revalidatePath("/driver/trips");
  revalidatePath("/admin/trips");
}

export async function startTripForm(formData: FormData) {
  const tripId = formData.get("tripId") as string;
  await startTripAction(tripId);
  revalidatePath(`/driver/trips/${tripId}`);
  revalidatePath("/driver/trips");
  revalidatePath("/admin/trips");
}

export async function completeTripForm(formData: FormData) {
  const tripId = formData.get("tripId") as string;
  await completeTripAction(tripId);
  revalidatePath(`/driver/trips/${tripId}`);
  revalidatePath("/driver/trips");
  revalidatePath("/admin/trips");
}

export async function cancelTripForm(formData: FormData) {
  const tripId = formData.get("tripId") as string;
  const reason = (formData.get("reason") as string) || undefined;
  await cancelTripAction(tripId, reason);
  revalidatePath(`/driver/trips/${tripId}`);
  revalidatePath("/driver/trips");
  revalidatePath("/admin/trips");
}

export async function overrideStartTripForm(formData: FormData) {
  const tripId = formData.get("tripId") as string;
  const reason = (formData.get("reason") as string) || undefined;
  await adminOverrideStartTripAction(tripId, reason);
  revalidatePath(`/driver/trips/${tripId}`);
  revalidatePath("/driver/trips");
  revalidatePath("/admin/trips");
}

