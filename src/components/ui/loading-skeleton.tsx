"use client";

import { Skeleton } from "./skeleton";

export { Skeleton };

export interface TableSkeletonProps {
  rows?: number;
  cols?: number;
}

export function TableSkeleton({ rows = 5, cols = 4 }: TableSkeletonProps) {
  return (
    <div className="w-full space-y-3">
      <div className="flex gap-4 pb-2 border-b border-[var(--border)]">
        {Array.from({ length: cols }).map((_, ci) => (
          <Skeleton
            key={`hdr-${ci}`}
            className="h-5 flex-1 bg-[var(--muted)]"
          />
        ))}
      </div>

      {Array.from({ length: rows }).map((_, ri) => (
        <div key={`row-${ri}`} className="flex gap-4">
          {Array.from({ length: cols }).map((_, ci) => (
            <Skeleton
              key={`cell-${ri}-${ci}`}
              className="h-4 flex-1 bg-[var(--muted)]"
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 space-y-4 shadow-xl">
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-5 w-1/3 bg-[var(--muted)]" />
          <Skeleton className="h-4 w-2/3 bg-[var(--muted)]" />
        </div>
        <Skeleton className="h-10 w-10 rounded-xl bg-[var(--muted)]" />
      </div>
      <Skeleton className="h-4 w-full bg-[var(--muted)]" />
      <div className="flex items-center gap-3 pt-2">
        <Skeleton className="h-8 w-20 rounded-full bg-[var(--muted)]" />
        <Skeleton className="h-8 w-20 rounded-full bg-[var(--muted)]" />
      </div>
    </div>
  );
}

export function KpiSkeleton() {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 space-y-4 shadow-xl">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24 bg-[var(--muted)]" />
        <Skeleton className="h-10 w-10 rounded-xl bg-[var(--muted)]" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-8 w-20 bg-[var(--muted)]" />
        <Skeleton className="h-3 w-28 bg-[var(--muted)]" />
      </div>
    </div>
  );
}

export function TableSkeletonCard() {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-xl">
      <TableSkeleton rows={4} cols={4} />
    </div>
  );
}

export function CardGridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div
      className="grid gap-6"
      style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export function KpiRowSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div
      className="grid gap-6"
      style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <KpiSkeleton key={i} />
      ))}
    </div>
  );
}
