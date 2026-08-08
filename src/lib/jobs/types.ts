export type JobStatus = "SUCCESS" | "FAILED" | "SKIPPED";

export interface JobExecutionLog {
  timestamp: string;
  level: "INFO" | "WARN" | "ERROR";
  message: string;
  details?: Record<string, unknown>;
}

export interface JobResult {
  jobId: string;
  name: string;
  status: JobStatus;
  startTime: string;
  endTime: string;
  durationMs: number;
  processedCount: number;
  logs: JobExecutionLog[];
  details: Record<string, unknown>;
}
