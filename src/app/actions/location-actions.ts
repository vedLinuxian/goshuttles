"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { locationSchema } from "@/lib/validators";
import { revalidatePath } from "next/cache";

type ActionResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

// ============================================================
// CREATE LOCATION
// ============================================================

export async function createLocation(
  arg1: unknown,
  arg2?: FormData
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return { success: false, error: "Unauthorized — admin only." };
  }

  let name: string | undefined;
  let baseFare: number | undefined;

  if (arg1 instanceof FormData) {
    name = (arg1.get("name") as string)?.trim();
    const fare = arg1.get("baseFare");
    baseFare = fare ? Number(fare) : undefined;
  } else if (arg2 instanceof FormData) {
    name = (arg2.get("name") as string)?.trim();
    const fare = arg2.get("baseFare");
    baseFare = fare ? Number(fare) : undefined;
  } else if (typeof arg1 === "object" && arg1 !== null) {
    const obj = arg1 as { name?: string; baseFare?: number };
    name = obj.name?.trim();
    baseFare = obj.baseFare;
  } else if (typeof arg1 === "string") {
    name = arg1.trim();
  }

  const parsed = locationSchema.safeParse({ name, baseFare });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid location input" };
  }

  try {
    const existing = await db.location.findUnique({
      where: { name: parsed.data.name },
    });
    if (existing) {
      return { success: false, error: `Location "${parsed.data.name}" already exists.` };
    }

    const location = await db.location.create({
      data: { name: parsed.data.name },
    });

    revalidatePath("/admin/locations");
    return { success: true, data: location };
  } catch (e: unknown) {
    const message =
      e instanceof Error ? e.message : "Failed to create location.";
    return { success: false, error: message };
  }
}

// ============================================================
// UPDATE LOCATION
// ============================================================

export async function updateLocation(
  arg1: unknown,
  arg2?: FormData
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return { success: false, error: "Unauthorized — admin only." };
  }

  let locationId: string | undefined;
  let name: string | undefined;
  let baseFare: number | undefined;

  if (arg1 instanceof FormData) {
    locationId = arg1.get("locationId") as string;
    name = (arg1.get("name") as string)?.trim();
    const fare = arg1.get("baseFare");
    baseFare = fare ? Number(fare) : undefined;
  } else if (arg2 instanceof FormData) {
    locationId = arg2.get("locationId") as string;
    name = (arg2.get("name") as string)?.trim();
    const fare = arg2.get("baseFare");
    baseFare = fare ? Number(fare) : undefined;
  } else if (typeof arg1 === "object" && arg1 !== null) {
    const obj = arg1 as { locationId?: string; name?: string; baseFare?: number };
    locationId = obj.locationId;
    name = obj.name?.trim();
    baseFare = obj.baseFare;
  }

  if (!locationId) {
    return { success: false, error: "Location ID is required." };
  }

  const parsed = locationSchema.safeParse({ name, baseFare });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid location input" };
  }

  try {
    const nameCollision = await db.location.findFirst({
      where: { name: parsed.data.name, NOT: { id: locationId } },
    });
    if (nameCollision) {
      return { success: false, error: `Another location with name "${parsed.data.name}" already exists.` };
    }

    const location = await db.location.update({
      where: { id: locationId },
      data: { name: parsed.data.name },
    });

    revalidatePath("/admin/locations");
    return { success: true, data: location };
  } catch (e: unknown) {
    const message =
      e instanceof Error ? e.message : "Failed to update location.";
    return { success: false, error: message };
  }
}

// ============================================================
// DELETE LOCATION
// ============================================================

export async function deleteLocation(
  arg1: unknown,
  arg2?: FormData
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return { success: false, error: "Unauthorized — admin only." };
  }

  let locationId: string | undefined;

  if (typeof arg1 === "string") {
    locationId = arg1;
  } else if (arg1 instanceof FormData) {
    locationId = arg1.get("locationId") as string;
  } else if (arg2 instanceof FormData) {
    locationId = arg2.get("locationId") as string;
  } else if (typeof arg1 === "object" && arg1 !== null) {
    locationId = (arg1 as { locationId?: string; id?: string }).locationId || (arg1 as { id?: string }).id;
  }

  if (!locationId) {
    return { success: false, error: "Location ID is required." };
  }

  try {
    await db.$transaction(async (tx) => {
      const tripCount = await tx.trip.count({
        where: {
          OR: [{ sourceId: locationId }, { destinationId: locationId }],
        },
      });

      if (tripCount > 0) {
        throw new Error(`Cannot delete location — it is used in ${tripCount} trip(s). Remove those trips first.`);
      }

      await tx.location.delete({ where: { id: locationId } });
    });

    revalidatePath("/admin/locations");
    return { success: true, data: { id: locationId } };
  } catch (e: unknown) {
    const message =
      e instanceof Error ? e.message : "Failed to delete location.";
    return { success: false, error: message };
  }
}

export async function savePricingConfigAction(input: {
  surgeMultiplier: number;
  occupancyThreshold: number;
  commissionRate: number;
  seatLockTimeout: number;
  surgeEnabled: boolean;
}) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return { success: false, error: "Unauthorized — admin only." };
  }

  try {
    const { updatePricingConfig } = await import("@/lib/pricing-service");
    const updated = await updatePricingConfig(input);
    revalidatePath("/admin/locations");
    return { success: true, data: updated };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to update pricing rules." };
  }
}


