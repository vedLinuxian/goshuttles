import { releaseExpiredLocks } from "@/lib/booking-service";
import { db } from "@/lib/db";
import { JobExecutionLog, JobResult } from "./types";

export async function runSeatLockCleanupJob(): Promise<JobResult> {
  const startTime = new Date();
  const logs: JobExecutionLog[] = [];
  const jobId = "seat_lock_cleanup";
  const name = "Seat Lock Expiry Cleanup";

  logs.push({
    timestamp: new Date().toISOString(),
    level: "INFO",
    message: "Starting seat lock expiry cleanup job",
  });

  try {
    const config = await db.pricingConfig.findFirst();
    const lockTimeoutMinutes = config?.seatLockTimeout || 5;

    // 1. Release expired locks
    const releasedCount = await releaseExpiredLocks();
    logs.push({
      timestamp: new Date().toISOString(),
      level: "INFO",
      message: `Released ${releasedCount} expired seat lock(s)`,
      details: { releasedCount, lockTimeoutMinutes },
    });

    // 2. Cancel orphaned pending bookings
    const orphanedCleaned = await db.booking.updateMany({
      where: {
        status: "PENDING",
        seat: { status: "AVAILABLE" },
      },
      data: {
        status: "CANCELLED",
        cancellationReason: "Auto-cleaned: Seat lock expired",
        cancelledAt: new Date(),
      },
    });

    if (orphanedCleaned.count > 0) {
      logs.push({
        timestamp: new Date().toISOString(),
        level: "WARN",
        message: `Cancelled ${orphanedCleaned.count} orphaned pending booking(s)`,
        details: { count: orphanedCleaned.count },
      });
    }

    const endTime = new Date();
    return {
      jobId,
      name,
      status: "SUCCESS",
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      durationMs: endTime.getTime() - startTime.getTime(),
      processedCount: releasedCount + orphanedCleaned.count,
      logs,
      details: { releasedCount, orphanedCleanedCount: orphanedCleaned.count },
    };
  } catch (err: unknown) {
    const endTime = new Date();
    const errorMessage = err instanceof Error ? err.message : String(err);
    logs.push({
      timestamp: new Date().toISOString(),
      level: "ERROR",
      message: `Seat lock job failed: ${errorMessage}`,
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
