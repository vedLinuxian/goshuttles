import { runDataIntegrityAuditJob } from "@/lib/jobs/audit-job";
import { runSurgePricingJob } from "@/lib/jobs/pricing-job";
import { runRouteHeadwayAuditJob } from "@/lib/jobs/route-job";
import { runSeatLockCleanupJob } from "@/lib/jobs/seat-lock-job";
import { runTripLifecycleJob } from "@/lib/jobs/trip-lifecycle-job";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  return handleCronRequest(request);
}

export async function POST(request: Request) {
  return handleCronRequest(request);
}

export const maxDuration = 10;

async function handleCronRequest(request: Request) {
  // Bearer Token authentication check for cron jobs / QStash triggers
  const authHeader = request.headers.get("authorization");
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: "Unauthorized: Invalid or missing CRON_SECRET token" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const rawType = searchParams.get("type");
  const type = rawType as "seat_lock" | "pricing" | "audit" | "route" | "trip_lifecycle" | null;

  if (type) {
    const jobs = {
      seat_lock: runSeatLockCleanupJob,
      pricing: runSurgePricingJob,
      audit: runDataIntegrityAuditJob,
      route: runRouteHeadwayAuditJob,
      trip_lifecycle: runTripLifecycleJob,
    } as const;
    const job = type && jobs[type];
    if (!job) return NextResponse.json({ error: "Invalid job type" }, { status: 400 });
    return NextResponse.json({ success: true, result: await job() });
  }

  const results = [];
  results.push(await runSeatLockCleanupJob());
  results.push(await runSurgePricingJob());
  results.push(await runDataIntegrityAuditJob());
  results.push(await runRouteHeadwayAuditJob());
  results.push(await runTripLifecycleJob());
  return NextResponse.json(results);
}

