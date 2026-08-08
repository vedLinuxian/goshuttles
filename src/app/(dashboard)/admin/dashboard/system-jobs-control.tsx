"use client";

import { runAllSystemJobsAction, runSystemJobAction } from "@/app/actions/job-actions";
import { JobResult } from "@/lib/jobs/types";
import { Activity, Clock, Play, RefreshCw, Zap } from "lucide-react";
import { useState } from "react";

type SystemJobKey = "seat_lock" | "pricing" | "audit" | "route";

export function SystemJobsControlPanel() {
  const [isRunning, setIsRunning] = useState(false);
  const [activeJob, setActiveJob] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, JobResult>>({});

  async function handleRunSingle(jobKey: SystemJobKey) {
    setIsRunning(true);
    setActiveJob(jobKey);
    try {
      const res = await runSystemJobAction(jobKey);
      if (res.success && res.result) {
        setResults((prev) => ({ ...prev, [jobKey]: res.result! }));
      }
    } finally {
      setIsRunning(false);
      setActiveJob(null);
    }
  }

  async function handleRunAll() {
    setIsRunning(true);
    setActiveJob("ALL");
    try {
      const res = await runAllSystemJobsAction();
      if (res.success) {
        setResults(res.results);
      }
    } finally {
      setIsRunning(false);
      setActiveJob(null);
    }
  }

  return (
    <div className="bg-[var(--card)] text-[var(--foreground)] rounded-3xl p-6 border border-[var(--border)] space-y-6 shadow-xl transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-[var(--foreground)] flex items-center gap-2">
              System Operations & Maintenance Panel
            </h2>
            <p className="text-xs text-[var(--muted-foreground)]">
              Run background maintenance: seat lock release, dynamic surge calculation, QR ticket sync, and headway audit.
            </p>
          </div>
        </div>

        <button
          onClick={handleRunAll}
          disabled={isRunning}
          className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 rounded-xl font-bold text-xs shadow-md flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
        >
          {isRunning && activeJob === "ALL" ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Zap className="h-4 w-4 fill-slate-950" />
          )}
          <span>{isRunning && activeJob === "ALL" ? "Executing Maintenance..." : "Run All Maintenance Jobs"}</span>
        </button>
      </div>

      {/* Job Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { id: "seat_lock", name: "Seat Lock Cleanup", cat: "Concurrency Guard", color: "amber" },
          { id: "pricing", name: "Surge Pricing Calculation", cat: "Demand Adjust", color: "emerald" },
          { id: "audit", name: "Data Integrity & Ticket Audit", cat: "Ticket Sync", color: "purple" },
          { id: "route", name: "Route Headway Audit", cat: "Dispatch Check", color: "blue" },
        ].map((job) => {
          const res = results[job.id];
          const isThisRunning = isRunning && activeJob === job.id;

          return (
            <div
              key={job.id}
              className="bg-[var(--muted)]/40 rounded-2xl p-4 border border-[var(--border)] flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded">
                    {job.cat}
                  </span>
                  {res && (
                    <span
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${
                        res.status === "SUCCESS"
                          ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                          : res.status === "SKIPPED"
                          ? "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                          : "bg-red-500/20 text-red-600 dark:text-red-400"
                      }`}
                    >
                      {res.status}
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-bold text-[var(--foreground)]">{job.name}</h3>
                {res ? (
                  <p className="text-[11px] text-[var(--muted-foreground)] mt-1">
                    Processed: {res.processedCount} • Time: {res.durationMs}ms
                  </p>
                ) : (
                  <p className="text-[11px] text-[var(--muted-foreground)] opacity-70 mt-1">Ready for execution</p>
                )}
              </div>

              <button
                onClick={() => handleRunSingle(job.id as SystemJobKey)}
                disabled={isRunning}
                className="w-full py-2 bg-[var(--muted)] hover:bg-[var(--card)] text-[var(--foreground)] border border-[var(--border)] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isThisRunning ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin text-amber-500" />
                ) : (
                  <Play className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                )}
                <span>{isThisRunning ? "Running..." : "Run Job"}</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Execution Output Log */}
      {Object.keys(results).length > 0 && (
        <div className="bg-[var(--muted)]/50 rounded-2xl p-4 border border-[var(--border)] space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-[var(--muted-foreground)]">
            <span className="flex items-center gap-1.5">
              <Activity className="h-4 w-4 text-amber-500" />
              Latest Operations Job Output Log
            </span>
            <span>{Object.keys(results).length} Job Run(s) Recorded</span>
          </div>

          <div className="max-h-60 overflow-y-auto space-y-2 text-xs font-mono">
            {Object.entries(results).map(([key, res]) => (
              <div key={key} className="p-3 bg-[var(--card)] rounded-xl border border-[var(--border)] space-y-1">
                <div className="flex items-center justify-between font-bold text-amber-500">
                  <span>[{res.jobId}] Status: {res.status}</span>
                  <span className="text-[11px] text-[var(--muted-foreground)]">{res.durationMs}ms</span>
                </div>
                {res.logs.map((log, idx) => (
                  <div key={idx} className="text-[11px] text-[var(--foreground)] pl-2 border-l border-[var(--border)]">
                    <span className="text-[var(--muted-foreground)]">[{log.level}]</span> {log.message}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
