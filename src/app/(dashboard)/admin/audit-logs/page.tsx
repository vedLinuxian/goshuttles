import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getAuditLogs } from "@/lib/notification-service";
import { AuditLogsClient, type AuditLogItem } from "./audit-logs-client";

export default async function AdminAuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login");

  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const action = typeof params.action === "string" ? params.action.trim() : "";
  const targetType = typeof params.targetType === "string" ? params.targetType.trim() : "";
  const sortField = typeof params.sort === "string" ? params.sort : "createdAt";
  const sortOrder = ((params.order as string) || "desc") as "asc" | "desc";

  const { logs, total, totalPages } = await getAuditLogs({
    page,
    limit: 20,
    q,
    action,
    targetType,
  });

  const formattedLogs: AuditLogItem[] = logs.map((log) => ({
    id: log.id,
    action: log.action,
    targetType: log.targetType,
    targetId: log.targetId,
    metadata: (log.metadata as Record<string, unknown>) || null,
    createdAt: log.createdAt.toISOString(),
    user: {
      id: log.user.id,
      name: log.user.name,
      phone: log.user.phone,
      email: log.user.email,
      role: log.user.role,
    },
  }));

  return (
    <AuditLogsClient
      logs={formattedLogs}
      page={page}
      totalPages={totalPages}
      totalCount={total}
      currentFilter={action || targetType}
      sortField={sortField}
      sortOrder={sortOrder}
    />
  );
}
