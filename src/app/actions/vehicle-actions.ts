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
  input: FormData | { regNumber: string; modelName?: string; vehicleType?: string; capacity?: number }
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
    };
  } else {
    rawData = {
      regNumber: input.regNumber,
      modelName: input.modelName || "Maruti Ertiga",
      vehicleType: input.vehicleType || "SUV",
      capacity: input.capacity || 6,
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
    isActive: formData.get("isActive") ? formData.get("isActive") === "true" : undefined,
  });

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

