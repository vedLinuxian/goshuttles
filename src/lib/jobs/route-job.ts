import { db } from "@/lib/db";
import { JobExecutionLog, JobResult } from "./types";

export async function runRouteHeadwayAuditJob(): Promise<JobResult> {
  const startTime = new Date();
  const logs: JobExecutionLog[] = [];
  const jobId = "route_headway_audit";
  const name = "Route Schedule & Headway Audit";

  logs.push({
    timestamp: new Date().toISOString(),
    level: "INFO",
    message: "Starting route headway clash audit",
  });

  try {
    const scheduledTrips = await db.trip.findMany({
      where: {
        status: "SCHEDULED",
        startTime: { gte: new Date() },
      },
      include: { source: true, destination: true },
      orderBy: { startTime: "asc" },
    });

    let clashesFound = 0;
    let adjustedCount = 0;

    // Pre-fetch booking counts for all scheduled trips in one query — eliminates N+1 in the nested loop
    const bookingCounts = await db.booking.groupBy({
      by: ["tripId"],
      where: { tripId: { in: scheduledTrips.map((t) => t.id) } },
      _count: { id: true },
    });
    const bookingCountMap = new Map<string, number>(
      bookingCounts.map((bc) => [bc.tripId, bc._count.id])
    );

    for (let i = 0; i < scheduledTrips.length; i++) {
      for (let j = i + 1; j < scheduledTrips.length; j++) {
        const t1 = scheduledTrips[i];
        const t2 = scheduledTrips[j];
        if (t1.sourceId === t2.sourceId && t1.destinationId === t2.destinationId) {
          const diffMs = Math.abs(t1.startTime.getTime() - t2.startTime.getTime());
          const diffMins = Math.round(diffMs / (1000 * 60));
          if (diffMins < 15) {
            clashesFound++;
            logs.push({
              timestamp: new Date().toISOString(),
              level: "WARN",
              message: `Headway clash (<15m): ${t1.source.name} -> ${t1.destination.name} at ${t1.startTime.toLocaleTimeString()} and ${t2.startTime.toLocaleTimeString()}`,
            });

            // Use pre-fetched booking count — no extra DB query needed
            const t2BookingCount = bookingCountMap.get(t2.id) ?? 0;
            if (t2BookingCount === 0) {
              const newTime = new Date(t2.startTime.getTime() + 20 * 60 * 1000);
              await db.trip.update({
                where: { id: t2.id },
                data: { startTime: newTime },
              });
              adjustedCount++;
            }
          }
        }
      }
    }

    const endTime = new Date();
    return {
      jobId,
      name,
      status: "SUCCESS",
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      durationMs: endTime.getTime() - startTime.getTime(),
      processedCount: adjustedCount,
      logs,
      details: { scheduledTripsCount: scheduledTrips.length, clashesFound, adjustedCount },
    };
  } catch (err: unknown) {
    const endTime = new Date();
    const errorMessage = err instanceof Error ? err.message : String(err);
    logs.push({
      timestamp: new Date().toISOString(),
      level: "ERROR",
      message: `Route headway job failed: ${errorMessage}`,
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
