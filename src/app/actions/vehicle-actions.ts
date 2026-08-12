"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import {
  vehicleSchema as createVehicleSchema,
  updateVehicleSchema,
} from "@/lib/validators";
import { revalidatePath } from "next/cache";

type ActionResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

// ============================================================
// CREATE VEHICLE (createVehicle / addVehicle)
// ============================================================

export async function createVehicle(
  input: FormData | {
    regNumber: string;
    modelName?: string;
    vehicleType?: string;
    capacity?: number;
    fuelType?: string;
    regDate?: string;
    insuranceNumber?: string;
    insuranceExpiryDate?: string;
  }
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized — please sign in." };
  }
  const role = session.user.role;
  if (role !== "DRIVER" && role !== "ADMIN") {
    return { success: false, error: "Only drivers and admins can create vehicles." };
  }

  let rawData: Record<string, unknown>;
  if (input instanceof FormData) {
    rawData = {
      regNumber: input.get("regNumber"),
      modelName: input.get("modelName") || "Maruti Ertiga",
      vehicleType: input.get("vehicleType") || "SUV",
      capacity: input.get("capacity") || 6,
      fuelType: input.get("fuelType") || "CNG",
      regDate: input.get("regDate") || undefined,
      insuranceNumber: input.get("insuranceNumber") || undefined,
      insuranceExpiryDate: input.get("insuranceExpiryDate") || undefined,
    };
  } else {
    rawData = {
      regNumber: input.regNumber,
      modelName: input.modelName || "Maruti Ertiga",
      vehicleType: input.vehicleType || "SUV",
      capacity: input.capacity || 6,
      fuelType: input.fuelType || "CNG",
      regDate: input.regDate,
      insuranceNumber: input.insuranceNumber,
      insuranceExpiryDate: input.insuranceExpiryDate,
    };
  }

  const parsed = createVehicleSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid vehicle input" };
  }

  try {
    const vehicle = await db.vehicle.create({
      data: {
        ownerId: session.user.id,
        regNumber: parsed.data.regNumber,
        modelName: parsed.data.modelName,
        vehicleType: parsed.data.vehicleType,
        capacity: parsed.data.capacity,
        fuelType: parsed.data.fuelType ?? "CNG",
        regDate: parsed.data.regDate ? new Date(parsed.data.regDate) : null,
        insuranceNumber: parsed.data.insuranceNumber || null,
        insuranceExpiryDate: parsed.data.insuranceExpiryDate ? new Date(parsed.data.insuranceExpiryDate) : null,
      },
    });

    revalidatePath("/driver/profile");
    revalidatePath("/admin/vehicles");
    return { success: true, data: vehicle };
  } catch (e: unknown) {
    const message =
      e instanceof Error ? e.message : "Failed to create vehicle.";
    return { success: false, error: message };
  }
}

export async function addVehicle(
  _prevState: unknown,
  formData: FormData
): Promise<ActionResult> {
  return createVehicle(formData);
}

// ============================================================
// UPDATE VEHICLE
// ============================================================

export async function updateVehicle(
  _prevState: unknown,
  formData: FormData
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized — please sign in." };
  }

  const vehicleId = formData.get("vehicleId") as string;
  if (!vehicleId) {
    return { success: false, error: "Vehicle ID is required." };
  }

  const parsed = updateVehicleSchema.safeParse({
    vehicleId,
    regNumber: formData.get("regNumber") || undefined,
    modelName: formData.get("modelName") || undefined,
    vehicleType: formData.get("vehicleType") || undefined,
    capacity: formData.get("capacity") ? Number(formData.get("capacity")) : undefined,
    fuelType: formData.get("fuelType") || undefined,
    regDate: formData.get("regDate") || undefined,
    insuranceNumber: formData.get("insuranceNumber") || undefined,
    insuranceExpiryDate: formData.get("insuranceExpiryDate") || undefined,
    isActive: formData.get("isActive") ? formData.get("isActive") === "true" : undefined,
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid vehicle input" };
  }

  try {
    const updated = await db.$transaction(async (tx) => {
      const vehicle = await tx.vehicle.findUnique({ where: { id: vehicleId } });
      if (!vehicle) throw new Error("Vehicle not found.");

      const isOwner = vehicle.ownerId === session.user.id;
      const isAdmin = session.user.role === "ADMIN";
      if (!isOwner && !isAdmin) {
        throw new Error("Unauthorized — only the owner or an admin can edit vehicle details.");
      }

      return tx.vehicle.update({
        where: { id: vehicleId },
        data: {
          ...(parsed.data.regNumber ? { regNumber: parsed.data.regNumber } : {}),
          ...(parsed.data.modelName ? { modelName: parsed.data.modelName } : {}),
          ...(parsed.data.vehicleType ? { vehicleType: parsed.data.vehicleType } : {}),
          ...(parsed.data.capacity ? { capacity: parsed.data.capacity } : {}),
          ...(parsed.data.fuelType ? { fuelType: parsed.data.fuelType } : {}),
          ...(parsed.data.regDate !== undefined ? { regDate: parsed.data.regDate ? new Date(parsed.data.regDate) : null } : {}),
          ...(parsed.data.insuranceNumber !== undefined ? { insuranceNumber: parsed.data.insuranceNumber || null } : {}),
          ...(parsed.data.insuranceExpiryDate !== undefined ? { insuranceExpiryDate: parsed.data.insuranceExpiryDate ? new Date(parsed.data.insuranceExpiryDate) : null } : {}),
          ...(parsed.data.isActive !== undefined ? { isActive: parsed.data.isActive } : {}),
        },
      });
    });

    revalidatePath("/admin/vehicles");
    revalidatePath("/driver/profile");
    return { success: true, data: updated };
  } catch (e: unknown) {
    const message =
      e instanceof Error ? e.message : "Failed to update vehicle details.";
    return { success: false, error: message };
  }
}

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid vehicle update input" };
  }

  const data: Record<string, unknown> = {};
  if (parsed.data.regNumber) data.regNumber = parsed.data.regNumber;
  if (parsed.data.modelName) data.modelName = parsed.data.modelName;
  if (parsed.data.vehicleType) data.vehicleType = parsed.data.vehicleType;
  if (parsed.data.capacity) data.capacity = parsed.data.capacity;
  if (parsed.data.isActive !== undefined) data.isActive = parsed.data.isActive;

  try {
    const updated = await db.$transaction(async (tx) => {
      const vehicle = await tx.vehicle.findUnique({ where: { id: vehicleId } });
      if (!vehicle) {
        throw new Error("Vehicle not found.");
      }

      const isOwner = vehicle.ownerId === session.user.id;
      const isAdmin = session.user.role === "ADMIN";
      if (!isOwner && !isAdmin) {
        throw new Error("You can only edit your own vehicles.");
      }

      return tx.vehicle.update({
        where: { id: vehicleId },
        data,
      });
    });

    revalidatePath("/driver/profile");
    revalidatePath("/admin/vehicles");
    return { success: true, data: updated };
  } catch (e: unknown) {
    const message =
      e instanceof Error ? e.message : "Failed to update vehicle.";
    return { success: false, error: message };
  }
}

// ============================================================
// REMOVE VEHICLE (soft-delete)
// ============================================================

export async function removeVehicle(vehicleId: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized — please sign in." };
  }

  if (!vehicleId) {
    return { success: false, error: "Vehicle ID is required." };
  }

  try {
    await db.$transaction(async (tx) => {
      const vehicle = await tx.vehicle.findUnique({ where: { id: vehicleId } });
      if (!vehicle) {
        throw new Error("Vehicle not found.");
      }

      const isOwner = vehicle.ownerId === session.user.id;
      const isAdmin = session.user.role === "ADMIN";
      if (!isOwner && !isAdmin) {
        throw new Error("You can only remove your own vehicles.");
      }

      const activeTripCount = await tx.trip.count({
        where: { vehicleId, status: { in: ["SCHEDULED", "IN_PROGRESS"] } },
      });

      if (activeTripCount > 0) {
        throw new Error("Cannot remove a vehicle with active trips. Complete or cancel those trips first.");
      }

      return tx.vehicle.update({
        where: { id: vehicleId },
        data: { isActive: false },
      });
    });

    revalidatePath("/driver/profile");
    revalidatePath("/admin/vehicles");
    return { success: true, data: { vehicleId } };
  } catch (e: unknown) {
    const message =
      e instanceof Error ? e.message : "Failed to remove vehicle.";
    return { success: false, error: message };
  }
}

// ============================================================
// TOGGLE VEHICLE ACTIVE STATUS
// ============================================================

export async function toggleVehicleActive(
  vehicleId: string,
  isActive?: boolean
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized — please sign in." };
  }

  if (!vehicleId) {
    return { success: false, error: "Vehicle ID is required." };
  }

  try {
    const updated = await db.$transaction(async (tx) => {
      const vehicle = await tx.vehicle.findUnique({ where: { id: vehicleId } });
      if (!vehicle) throw new Error("Vehicle not found.");

      const isOwner = vehicle.ownerId === session.user.id;
      const isAdmin = session.user.role === "ADMIN";
      if (!isOwner && !isAdmin) {
        throw new Error("Unauthorized — only the owner or an admin can toggle vehicle status.");
      }

      const newStatus = isActive !== undefined ? isActive : !vehicle.isActive;

      return tx.vehicle.update({
        where: { id: vehicleId },
        data: { isActive: newStatus },
      });
    });

    revalidatePath("/admin/vehicles");
    revalidatePath("/driver/profile");
    return { success: true, data: updated };
  } catch (e: unknown) {
    const message =
      e instanceof Error ? e.message : "Failed to toggle vehicle status.";
    return { success: false, error: message };
  }
}

export async function assignVehicleToDriverAction(
  vehicleId: string,
  driverId: string
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return { success: false, error: "Unauthorized — Admin role required." };
  }
  if (!vehicleId || !driverId) {
    return { success: false, error: "Vehicle ID and Driver ID are required." };
  }
  try {
    const adminUser = await db.user.findFirst({
      where: { role: "ADMIN" },
      select: { id: true },
    });
    const fallbackOwnerId = adminUser?.id || session.user.id;

    await db.$transaction(async (tx) => {
      // 1. Unassign any other vehicle currently assigned to this driver
      const existingVehicle = await tx.vehicle.findFirst({
        where: { ownerId: driverId, id: { not: vehicleId } },
      });
      if (existingVehicle) {
        await tx.vehicle.update({
          where: { id: existingVehicle.id },
          data: { ownerId: fallbackOwnerId },
        });
      }

      // 2. Assign target vehicle to driver
      await tx.vehicle.update({
        where: { id: vehicleId },
        data: { ownerId: driverId },
      });

      await tx.activityLog.create({
        data: {
          userId: session.user.id!,
          action: "ASSIGN_VEHICLE",
          targetType: "vehicle",
          targetId: vehicleId,
          metadata: { driverId, previousVehicleId: existingVehicle?.id ?? null },
        },
      });
    });

    revalidatePath("/admin/vehicles");
    revalidatePath("/admin/assign");
    revalidatePath("/admin/drivers");
    revalidatePath("/admin/trips");
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to assign vehicle" };
  }
}

export async function unassignVehicleAction(vehicleId: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return { success: false, error: "Unauthorized — Admin role required." };
  }
  try {
    const adminUser = await db.user.findFirst({
      where: { role: "ADMIN" },
      select: { id: true },
    });
    const fallbackOwnerId = adminUser?.id || session.user.id;

    await db.vehicle.update({
      where: { id: vehicleId },
      data: { ownerId: fallbackOwnerId },
    });

    revalidatePath("/admin/vehicles");
    revalidatePath("/admin/assign");
    revalidatePath("/admin/drivers");
    revalidatePath("/admin/trips");
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to unassign vehicle" };
  }
}

