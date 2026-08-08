"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { vehicleSeatPriceSchema, vehicleSeatTemplatesSchema } from "@/lib/validators";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") throw new Error("Admin access required.");
  return session.user.id;
}

export async function getVehicleSeatTemplates(vehicleId: string) {
  await requireAdmin();
  return db.vehicleSeatTemplate.findMany({ where: { vehicleId }, orderBy: { seatNumber: "asc" } });
}

export async function initializeVehicleSeatTemplates(vehicleId: string) {
  const adminId = await requireAdmin();
  const result = await db.$transaction(async (tx) => {
    const vehicle = await tx.vehicle.findUnique({ where: { id: vehicleId }, include: { seatTemplates: true } });
    if (!vehicle) throw new Error("Vehicle not found.");
    if (vehicle.seatTemplates.length > 0) throw new Error("This vehicle already has pricing templates.");
    const seats = Array.from({ length: vehicle.capacity }, (_, index) => ({
      vehicleId,
      seatNumber: index === 0 ? "F1" : `M${index}`,
      seatType: index === 0 ? "FRONT" as const : "MIDDLE" as const,
      basePrice: 250,
      isActive: true,
    }));
    await tx.vehicleSeatTemplate.createMany({ data: seats });
    await tx.activityLog.create({ data: { userId: adminId, action: "INITIALIZE_VEHICLE_SEAT_TEMPLATES", targetType: "vehicle", targetId: vehicleId, metadata: { capacity: vehicle.capacity } } });
    return vehicleId;
  });
  revalidatePath(`/admin/vehicles/${result}/pricing`);
  return { success: true };
}

export async function saveVehicleSeatTemplates(input: unknown) {
  const adminId = await requireAdmin();
  const parsed = vehicleSeatTemplatesSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message || "Invalid seat pricing." };

  try {
    const result = await db.$transaction(async (tx) => {
      const vehicle = await tx.vehicle.findUnique({ where: { id: parsed.data.vehicleId }, include: { seatTemplates: true } });
      if (!vehicle) throw new Error("Vehicle not found.");
      if (parsed.data.seats.length !== vehicle.capacity) throw new Error(`Vehicle capacity is ${vehicle.capacity}; configure exactly ${vehicle.capacity} seats.`);

      const previous = vehicle.seatTemplates.map((seat) => ({ seatNumber: seat.seatNumber, basePrice: seat.basePrice.toString(), isActive: seat.isActive }));
      await tx.vehicleSeatTemplate.deleteMany({ where: { vehicleId: vehicle.id } });
      await tx.vehicleSeatTemplate.createMany({
        data: parsed.data.seats.map((seat) => ({ vehicleId: vehicle.id, seatNumber: seat.seatNumber, seatType: seat.seatType, basePrice: seat.basePrice, isActive: seat.isActive })),
      });
      await tx.activityLog.create({
        data: { userId: adminId, action: "UPDATE_VEHICLE_SEAT_PRICING", targetType: "vehicle", targetId: vehicle.id, metadata: { previous, next: parsed.data.seats } },
      });
      return vehicle.id;
    });

    revalidatePath(`/admin/vehicles/${result}/pricing`);
    revalidatePath("/admin/vehicles");
    revalidatePath("/admin/trips");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unable to save seat pricing." };
  }
}

export async function updateVehicleSeatPrice(input: unknown) {
  const adminId = await requireAdmin();
  const parsed = vehicleSeatPriceSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message || "Invalid seat price." };

  try {
    const result = await db.$transaction(async (tx) => {
      const template = await tx.vehicleSeatTemplate.findUnique({ where: { vehicleId_seatNumber: { vehicleId: parsed.data.vehicleId, seatNumber: parsed.data.seatNumber } } });
      if (!template) throw new Error("Seat template not found.");
      const updated = await tx.vehicleSeatTemplate.update({ where: { id: template.id }, data: { basePrice: parsed.data.basePrice } });
      await tx.activityLog.create({ data: { userId: adminId, action: "UPDATE_VEHICLE_SEAT_PRICE", targetType: "vehicle_seat_template", targetId: template.id, metadata: { oldPrice: template.basePrice.toString(), newPrice: parsed.data.basePrice } } });
      return updated.vehicleId;
    });
    revalidatePath(`/admin/vehicles/${result}/pricing`);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unable to update seat price." };
  }
}

export async function deactivateVehicleSeatTemplate(templateId: string) {
  const adminId = await requireAdmin();
  try {
    const result = await db.$transaction(async (tx) => {
      const template = await tx.vehicleSeatTemplate.findUnique({ where: { id: templateId } });
      if (!template) throw new Error("Seat template not found.");
      const activeTripUse = await tx.tripSeat.count({ where: { seatNumber: template.seatNumber, trip: { vehicleId: template.vehicleId, status: { in: ["SCHEDULED", "IN_PROGRESS"] } } } });
      if (activeTripUse > 0) throw new Error("This seat is used by an active or future trip and cannot be deactivated.");
      const updated = await tx.vehicleSeatTemplate.update({ where: { id: templateId }, data: { isActive: false } });
      await tx.activityLog.create({ data: { userId: adminId, action: "DEACTIVATE_VEHICLE_SEAT_TEMPLATE", targetType: "vehicle_seat_template", targetId: templateId, metadata: { vehicleId: template.vehicleId } } });
      return updated.vehicleId;
    });
    revalidatePath(`/admin/vehicles/${result}/pricing`);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unable to deactivate seat template." };
  }
}
