import { db } from "@/lib/db";
import { startTrip, cancelTrip } from "@/lib/trip-service";
import { JobExecutionLog, JobResult } from "./types";

/**
 * Trip Lifecycle Job:
 * 1. Pre-departure manifest lock: locks bookings 5 minutes before startTime.
 * 2. Departure timing enforcement:
 *    - 15 minutes past departure time: auto-starts if 100% occupancy or admin override.
 *    - Otherwise auto-cancels/expires the trip and releases seats/bookings.
 */
export async function runTripLifecycleJob(): Promise<JobResult> {
  const startTime = new Date();
  const logs: JobExecutionLog[] = [];
  const jobId = "trip_lifecycle";
  const name = "Trip Lifecycle & Departure Timing Job";

  logs.push({
    timestamp: new Date().toISOString(),
    level: "INFO",
    message: "Starting trip lifecycle & departure timing audit",
  });

  try {
    const now = new Date();
    const manifestLockCutoff = new Date(now.getTime() + 5 * 60 * 1000);
    const departureGraceCutoff = new Date(now.getTime() - 15 * 60 * 1000);

    // 1. Lock manifests for upcoming trips starting within 5 minutes
    const manifestLockRes = await db.trip.updateMany({
      where: {
        status: "SCHEDULED",
        manifestLocked: false,
        isCancelled: false,
        startTime: { lte: manifestLockCutoff },
      },
      data: { manifestLocked: true },
    });

    if (manifestLockRes.count > 0) {
      logs.push({
        timestamp: new Date().toISOString(),
        level: "INFO",
        message: `Locked manifest for ${manifestLockRes.count} trip(s) within 5-minute pre-departure window`,
        details: { count: manifestLockRes.count },
      });
    }

    // 2. Overdue scheduled trips (departure time passed + 15 min grace period)
    const overdueTrips = await db.trip.findMany({
      where: {
        status: "SCHEDULED",
        isCancelled: false,
        startTime: { lte: departureGraceCutoff },
      },
      include: {
        seats: true,
      },
    });

    let autoStarted = 0;
    let autoCancelled = 0;
    let errors = 0;

    for (const trip of overdueTrips) {
      const totalSeats = trip.seats.length;
      const bookedSeats = trip.seats.filter((s) => s.status === "BOOKED").length;

      try {
        if (trip.adminOverrideStart || (totalSeats > 0 && bookedSeats === totalSeats)) {
          await startTrip(trip.id);
          autoStarted++;
          logs.push({
            timestamp: new Date().toISOString(),
            level: "INFO",
            message: `Auto-started trip ${trip.id.slice(0, 8)} (Occupancy: ${bookedSeats}/${totalSeats}, Override: ${trip.adminOverrideStart})`,
          });
        } else {
          await cancelTrip(
            trip.id,
            `Auto-cancelled: Missed departure time without 100% occupancy (${bookedSeats}/${totalSeats})`
          );
          autoCancelled++;
          logs.push({
            timestamp: new Date().toISOString(),
            level: "WARN",
            message: `Auto-cancelled trip ${trip.id.slice(0, 8)} (Insufficient occupancy: ${bookedSeats}/${totalSeats})`,
          });
        }
      } catch (err: unknown) {
        errors++;
        const msg = err instanceof Error ? err.message : String(err);
        logs.push({
          timestamp: new Date().toISOString(),
          level: "ERROR",
          message: `Error processing overdue trip ${trip.id.slice(0, 8)}: ${msg}`,
        });
      }
    }

    const endTime = new Date();
    const processedCount = manifestLockRes.count + autoStarted + autoCancelled;

    return {
      jobId,
      name,
      status: errors > 0 ? "FAILED" : "SUCCESS",
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      durationMs: endTime.getTime() - startTime.getTime(),
      processedCount,
      logs,
      details: {
        manifestsLocked: manifestLockRes.count,
        overdueTripsEvaluated: overdueTrips.length,
        autoStarted,
        autoCancelled,
        errors,
      },
    };
  } catch (err: unknown) {
    const endTime = new Date();
    const errorMessage = err instanceof Error ? err.message : String(err);
    logs.push({
      timestamp: new Date().toISOString(),
      level: "ERROR",
      message: `Trip lifecycle job failed: ${errorMessage}`,
    });
    return {
      jobId,
      name,
      status: "FAILED",
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      durationMs: endTime.getTime() - startTime.getTime(),
      processedCount: 0,
      logs,
      details: { error: errorMessage },
    };
  }
}
