"use server";

import { auth } from "@/auth";
import { runDataIntegrityAuditJob } from "@/lib/jobs/audit-job";
import { runSurgePricingJob } from "@/lib/jobs/pricing-job";
import { runRouteHeadwayAuditJob } from "@/lib/jobs/route-job";
import { runSeatLockCleanupJob } from "@/lib/jobs/seat-lock-job";
import { runTripLifecycleJob } from "@/lib/jobs/trip-lifecycle-job";
import { JobResult } from "@/lib/jobs/types";

export async function runSystemJobAction(
  jobKey: "seat_lock" | "pricing" | "audit" | "route" | "trip_lifecycle"
): Promise<{ success: boolean; result?: JobResult; error?: string }> {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return { success: false, error: "Unauthorized — admin access required." };
  }

  try {
    let result: JobResult;
    switch (jobKey) {
      case "seat_lock":
        result = await runSeatLockCleanupJob();
        break;
      case "pricing":
        result = await runSurgePricingJob();
        break;
      case "audit":
        result = await runDataIntegrityAuditJob();
        break;
      case "route":
        result = await runRouteHeadwayAuditJob();
        break;
      case "trip_lifecycle":
        result = await runTripLifecycleJob();
        break;
      default:
        return { success: false, error: "Invalid job key specified" };
    }

    return { success: true, result };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Job execution failed",
    };
  }
}

export async function runAllSystemJobsAction(): Promise<{
  success: boolean;
  results: Record<string, JobResult>;
  summary: { totalDurationMs: number; processedTotal: number };
  error?: string;
}> {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return {
      success: false,
      results: {},
      summary: { totalDurationMs: 0, processedTotal: 0 },
      error: "Unauthorized — admin access required.",
    };
  }

  const [res1, res2, res3, res4, res5] = await Promise.all([
    runSeatLockCleanupJob(),
    runSurgePricingJob(),
    runDataIntegrityAuditJob(),
    runRouteHeadwayAuditJob(),
    runTripLifecycleJob(),
  ]);

  const results = {
    seat_lock: res1,
    pricing: res2,
    audit: res3,
    route: res4,
    trip_lifecycle: res5,
  };

  const totalDurationMs =
    res1.durationMs + res2.durationMs + res3.durationMs + res4.durationMs + res5.durationMs;
  const processedTotal =
    res1.processedCount +
    res2.processedCount +
    res3.processedCount +
    res4.processedCount +
    res5.processedCount;

  return {
    success: true,
    results,
    summary: { totalDurationMs, processedTotal },
  };
}

