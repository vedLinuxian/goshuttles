import { Skeleton } from "@/components/ui/skeleton";

export default function AdminLoading() {
  return <div className="mx-auto max-w-[1400px] space-y-6 p-2" aria-busy="true" aria-label="Loading admin workspace">
    <div className="space-y-2"><Skeleton className="h-8 w-64" /><Skeleton className="h-4 w-40" /></div>
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}</div>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-36 rounded-2xl" />)}</div>
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]"><Skeleton className="h-44 rounded-2xl" /><Skeleton className="h-44 rounded-2xl" /></div>
    <Skeleton className="h-80 rounded-2xl" />
  </div>;
}
