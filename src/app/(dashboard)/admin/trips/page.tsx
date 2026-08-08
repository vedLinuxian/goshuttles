import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getAdminTripList, getAdminTripSummary } from "@/lib/admin-trip-operations";
import { AdminTripsClient } from "./trips-client";

export default async function AdminTripsPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login");
  const params = await searchParams;
  const result = await getAdminTripList({ page: Number(params.page) || 1, pageSize: Number(params.pageSize) || 20, q: typeof params.q === "string" ? params.q : "", status: typeof params.status === "string" ? params.status : "", date: typeof params.date === "string" ? params.date : "", readiness: ["READY", "AT_RISK", "NO_DRIVER", "PAYMENT_REVIEW", "TICKET_GAP"].includes(String(params.readiness)) ? params.readiness as never : undefined });
  const summary = await getAdminTripSummary();
  return <AdminTripsClient trips={result.trips} page={result.page} pageSize={result.pageSize} totalPages={result.totalPages} totalCount={result.total} summary={summary} filters={{ q: typeof params.q === "string" ? params.q : "", status: typeof params.status === "string" ? params.status : "", date: typeof params.date === "string" ? params.date : "", readiness: typeof params.readiness === "string" ? params.readiness : "" }} />;
}
