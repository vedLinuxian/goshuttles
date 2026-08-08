import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="max-w-[1400px] mx-auto space-y-6 animate-pulse p-2">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48 bg-slate-800/80 rounded-xl" />
          <Skeleton className="h-4 w-32 bg-slate-900/80 rounded-lg" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28 bg-slate-800/80 rounded-xl" />
          <Skeleton className="h-9 w-32 bg-amber-500/20 rounded-xl" />
        </div>
      </div>

      {/* KPI Cards Grid Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 space-y-3">
            <Skeleton className="h-3 w-16 bg-slate-800/80 rounded" />
            <Skeleton className="h-7 w-24 bg-slate-800/80 rounded-lg" />
            <Skeleton className="h-2.5 w-20 bg-slate-900/80 rounded" />
          </div>
        ))}
      </div>

      {/* Chart Skeleton */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 h-64 space-y-4">
        <Skeleton className="h-4 w-40 bg-slate-800/80 rounded" />
        <Skeleton className="h-48 w-full bg-slate-800/40 rounded-xl" />
      </div>

      {/* Tables Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 space-y-4">
          <Skeleton className="h-5 w-36 bg-slate-800/80 rounded" />
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full bg-slate-800/40 rounded-xl" />
          ))}
        </div>
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 space-y-4">
          <Skeleton className="h-5 w-36 bg-slate-800/80 rounded" />
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full bg-slate-800/40 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
