import { db } from "./db";

export async function getVehicleSeatTemplates(vehicleId: string) {
  const templates = await db.vehicleSeatTemplate.findMany({ where: { vehicleId, isActive: true }, orderBy: { seatNumber: "asc" } });
  return templates;
}

