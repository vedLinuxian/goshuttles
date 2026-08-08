"use client";

import { useState } from "react";
import {
  History,
  ShieldCheck,
  Search,
  Filter,
  Download,
  Code,
  User,
  Clock,
  Tag,
  CheckCircle2,
  AlertTriangle,
  Info,
  X,
  Copy,
  Check
} from "lucide-react";
import {
  Card,
  Button,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  SortableHeader,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui";
import SearchBar from "@/components/ui/search-bar";
import PaginationControls from "@/components/ui/pagination";

export type AuditLogItem = {
  id: string;
  action: string;
  targetType: string;
  targetId: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    phone: string;
    email: string | null;
    role: string;
  };
};

interface AuditLogsClientProps {
  logs: AuditLogItem[];
  page: number;
  totalPages: number;
  totalCount: number;
  currentFilter?: string;
  sortField?: string;
  sortOrder?: "asc" | "desc";
}

export function AuditLogsClient({
  logs,
  page,
  totalPages,
  totalCount,
  currentFilter = "",
  sortField = "createdAt",
  sortOrder = "desc",
}: AuditLogsClientProps) {
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);
  const [copied, setCopied] = useState(false);
  const [clientSortField, setClientSortField] = useState(sortField);
  const [clientSortOrder, setClientSortOrder] = useState<"asc" | "desc">(sortOrder);

  const handleSort = (field: string) => {
    if (clientSortField === field) {
      setClientSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setClientSortField(field);
      setClientSortOrder("desc");
    }
  };

  const sortedLogs = [...logs].sort((a, b) => {
    const factor = clientSortOrder === "asc" ? 1 : -1;
    if (clientSortField === "createdAt") {
      return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * factor;
    }
    if (clientSortField === "action") {
      return a.action.localeCompare(b.action) * factor;
    }
    if (clientSortField === "actor") {
      const nameA = a.user.name || a.user.phone || "";
      const nameB = b.user.name || b.user.phone || "";
      return nameA.localeCompare(nameB) * factor;
    }
    if (clientSortField === "targetType") {
      return a.targetType.localeCompare(b.targetType) * factor;
    }
    return 0;
  });

  const handleCopyJson = () => {
    if (!selectedLog) return;
    navigator.clipboard.writeText(JSON.stringify(selectedLog, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportCsv = () => {
    const headers = ["Log ID,Timestamp,Actor Name,Actor Phone,Actor Role,Action,Target Type,Target ID,Metadata"];
    const rows = sortedLogs.map((l) => [
      `"${l.id}"`,
      `"${l.createdAt}"`,
      `"${l.user.name || "N/A"}"`,
      `"${l.user.phone}"`,
      `"${l.user.role}"`,
      `"${l.action}"`,
      `"${l.targetType}"`,
      `"${l.targetId}"`,
      `"${JSON.stringify(l.metadata || {}).replace(/"/g, '""')}"`
    ].join(","));

    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `goshuttles_audit_log_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="mx-auto max-w-[1500px] space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <History className="h-6 w-6 text-amber-400" />
            Enterprise Audit Logs
          </h1>
          <p className="text-sm text-slate-400">
            Real-time compliance feed &amp; security event telemetry for all platform activities.
          </p>
        </div>
        <Button
          type="button"
          onClick={handleExportCsv}
          className="bg-slate-900 hover:bg-slate-800 text-amber-400 border border-slate-800 rounded-xl text-xs font-bold px-4 h-10 shadow-md flex items-center gap-2 cursor-pointer transition-all"
        >
          <Download className="h-4 w-4" />
          Export CSV Audit Record
        </Button>
      </div>

      {/* Stats Quick Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1 backdrop-blur-xl">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Audit Events</span>
          <p className="text-2xl font-black text-white">{totalCount.toLocaleString()}</p>
        </div>
        <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1 backdrop-blur-xl">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Page Records</span>
          <p className="text-2xl font-black text-amber-400">{sortedLogs.length}</p>
        </div>
        <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1 backdrop-blur-xl">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Active Engine</span>
          <p className="text-2xl font-black text-emerald-400">100% Verified</p>
        </div>
        <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1 backdrop-blur-xl">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Retention</span>
          <p className="text-2xl font-black text-indigo-400">Infinite Log</p>
        </div>
      </div>

      {/* Search & Action Filters */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <SearchBar
          placeholder="Search by action, actor name, phone, or target ID..."
          className="flex-1"
        />
      </div>

      {/* Main Audit Table */}
      {sortedLogs.length === 0 ? (
        <Card variant="glass" className="p-12 text-center space-y-3">
          <History className="mx-auto h-10 w-10 text-amber-500/50" />
          <h2 className="text-lg font-bold text-white">No audit logs match your search criteria</h2>
          <p className="text-xs text-slate-400">Try clearing search filters or checking back later.</p>
        </Card>
      ) : (
        <Card variant="glass" className="border-amber-500/20 bg-slate-950/80 backdrop-blur-xl shadow-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-900/90 border-b border-slate-800">
                <TableRow className="hover:bg-transparent">
                  <SortableHeader
                    field="createdAt"
                    title="Timestamp"
                    currentSortField={clientSortField}
                    currentSortOrder={clientSortOrder}
                    onSort={handleSort}
                    className="w-[180px]"
                  />
                  <SortableHeader
                    field="actor"
                    title="Actor / User"
                    currentSortField={clientSortField}
                    currentSortOrder={clientSortOrder}
                    onSort={handleSort}
                    className="w-[220px]"
                  />
                  <SortableHeader
                    field="action"
                    title="Event Action"
                    currentSortField={clientSortField}
                    currentSortOrder={clientSortOrder}
                    onSort={handleSort}
                    className="w-[240px]"
                  />
                  <SortableHeader
                    field="targetType"
                    title="Target Entity"
                    currentSortField={clientSortField}
                    currentSortOrder={clientSortOrder}
                    onSort={handleSort}
                    className="w-[180px]"
                  />
                  <TableCell className="text-xs font-bold text-slate-300">Payload Metadata</TableCell>
                  <TableCell className="text-right text-xs font-bold text-slate-300">Inspect</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-slate-800/60">
                {sortedLogs.map((log) => {
                  const formattedTime = new Date(log.createdAt).toLocaleString("en-IN", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  });

                  return (
                    <TableRow
                      key={log.id}
                      onClick={() => setSelectedLog(log)}
                      className="hover:bg-slate-900/60 transition-colors cursor-pointer"
                    >
                      <TableCell className="py-3.5 text-xs text-slate-300 font-mono">
                        <span className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                          {formattedTime}
                        </span>
                      </TableCell>

                      <TableCell className="py-3.5">
                        <div className="space-y-0.5">
                          <p className="text-xs font-extrabold text-white flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            {log.user.name || "System Actor"}
                          </p>
                          <p className="text-[10px] text-slate-400 pl-5">
                            {log.user.phone} • <RoleBadge role={log.user.role} />
                          </p>
                        </div>
                      </TableCell>

                      <TableCell className="py-3.5">
                        <ActionBadge action={log.action} />
                      </TableCell>

                      <TableCell className="py-3.5">
                        <div className="space-y-0.5">
                          <span className="text-xs font-bold text-amber-400 font-mono">
                            {log.targetType}
                          </span>
                          <span className="text-[10px] text-slate-400 block truncate max-w-[150px] font-mono">
                            ID: {log.targetId.slice(0, 12)}...
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="py-3.5">
                        {log.metadata ? (
                          <span className="text-[11px] text-slate-400 font-mono block truncate max-w-xs">
                            {JSON.stringify(log.metadata)}
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-600 font-mono">—</span>
                        )}
                      </TableCell>

                      <TableCell className="py-3.5 text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLog(log);
                          }}
                          className="h-8 px-2.5 text-amber-400 hover:text-amber-300 hover:bg-slate-800 text-xs font-bold rounded-lg"
                        >
                          <Code className="h-3.5 w-3.5" />
                          Inspect
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Pagination */}
      <PaginationControls
        page={page}
        totalPages={totalPages}
        total={totalCount}
        pageSize={20}
      />

      {/* Inspect JSON Modal */}
      <Dialog open={Boolean(selectedLog)} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="sm:max-w-2xl bg-slate-950 border-amber-500/30 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between text-base font-extrabold text-amber-400">
              <span className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                Audit Event Telemetry Snapshot
              </span>
              <button
                type="button"
                onClick={handleCopyJson}
                className="flex items-center gap-1.5 px-3 py-1 bg-slate-900 hover:bg-slate-800 text-xs font-bold text-amber-400 border border-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? "Copied JSON" : "Copy JSON"}</span>
              </button>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Complete raw JSON record for audit log ID <span className="font-mono text-slate-200">{selectedLog?.id}</span>.
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-900/60 border border-slate-800 p-3 rounded-xl">
                <div>
                  <span className="text-[10px] uppercase text-slate-400 block font-bold">Actor</span>
                  <span className="font-extrabold text-white">{selectedLog.user.name || "System"} ({selectedLog.user.role})</span>
                  <span className="text-[10px] text-slate-400 block">{selectedLog.user.phone}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-400 block font-bold">Event Action</span>
                  <span className="font-extrabold text-amber-400">{selectedLog.action}</span>
                  <span className="text-[10px] text-slate-400 block">{new Date(selectedLog.createdAt).toLocaleString("en-IN")}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-bold text-slate-300 block">Structured Metadata Payload</span>
                <pre className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-amber-300 font-mono text-xs overflow-x-auto max-h-72 leading-relaxed">
                  {JSON.stringify(selectedLog, null, 2)}
                </pre>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setSelectedLog(null)}
              className="border-slate-800 text-slate-300 hover:bg-slate-900 text-xs font-bold"
            >
              Close Inspector
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const color = {
    ADMIN: "text-amber-400 font-bold",
    DRIVER: "text-indigo-400 font-bold",
    CUSTOMER: "text-emerald-400 font-bold",
  }[role] || "text-slate-400";

  return <span className={color}>{role}</span>;
}

function ActionBadge({ action }: { action: string }) {
  const isDanger = action.includes("CANCEL") || action.includes("DELETE") || action.includes("NO_SHOW");
  const isSuccess = action.includes("CONFIRM") || action.includes("CREATE") || action.includes("VERIFY");

  const style = isDanger
    ? "bg-rose-500/15 text-rose-400 border-rose-500/30"
    : isSuccess
    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
    : "bg-amber-500/15 text-amber-400 border-amber-500/30";

  return (
    <span className={`inline-flex px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold border truncate max-w-[220px] ${style}`}>
      {action}
    </span>
  );
}
