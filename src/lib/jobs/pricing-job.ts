import { db } from "@/lib/db";
import { JobExecutionLog, JobResult } from "./types";

export async function runSurgePricingJob(): Promise<JobResult> {
  const startTime = new Date();
  const logs: JobExecutionLog[] = [{ timestamp: startTime.toISOString(), level: "INFO", message: "Initiating dynamic surge pricing calculation" }];
  const jobId = "surge_pricing_calculation";
  const name = "Dynamic Surge Pricing Calculation";

  try {
    const config = await db.pricingConfig.findFirst() || { surgeMultiplier: 1.15, occupancyThreshold: 0.6, surgeEnabled: true };
    if (!config.surgeEnabled) {
      const endTime = new Date();
      return { jobId, name, status: "SKIPPED", startTime: startTime.toISOString(), endTime: endTime.toISOString(), durationMs: endTime.getTime() - startTime.getTime(), processedCount: 0, logs, details: { surgeEnabled: false } };
    }

    const trips = await db.trip.findMany({ where: { status: "SCHEDULED", isCancelled: false, startTime: { gt: new Date() } }, include: { seats: true, source: true, destination: true } });
    let seatsAdjusted = 0;
    const threshold = Number(config.occupancyThreshold);
    const multiplier = Number(config.surgeMultiplier);

    for (const trip of trips) {
      const booked = trip.seats.filter((seat) => seat.status === "BOOKED").length;
      const occupancy = trip.seats.length ? booked / trip.seats.length : 0;
      for (const seat of trip.seats) {
        const basePrice = Number(seat.basePrice ?? seat.price);
        const targetPrice = occupancy >= threshold ? Math.round(basePrice * multiplier) : basePrice;
        if (seat.status === "AVAILABLE" && Number(seat.price) !== targetPrice) {
          const result = await db.tripSeat.updateMany({ where: { id: seat.id, status: "AVAILABLE" }, data: { price: targetPrice } });
          seatsAdjusted += result.count;
        }
      }
      if (occupancy >= threshold) logs.push({ timestamp: new Date().toISOString(), level: "INFO", message: `Surge applied to ${trip.source.name} -> ${trip.destination.name} at ${(occupancy * 100).toFixed(0)}% occupancy` });
    }

    const endTime = new Date();
    return { jobId, name, status: "SUCCESS", startTime: startTime.toISOString(), endTime: endTime.toISOString(), durationMs: endTime.getTime() - startTime.getTime(), processedCount: seatsAdjusted, logs, details: { evaluatedTrips: trips.length, seatsAdjusted } };
  } catch (error) {
    const endTime = new Date();
    const message = error instanceof Error ? error.message : "Unknown pricing error";
    logs.push({ timestamp: new Date().toISOString(), level: "ERROR", message: `Surge pricing failed: ${message}` });
    return { jobId, name, status: "FAILED", startTime: startTime.toISOString(), endTime: endTime.toISOString(), durationMs: endTime.getTime() - startTime.getTime(), processedCount: 0, logs, details: { error: message } };
  }
}
