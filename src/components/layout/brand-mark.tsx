import Link from "next/link";
import { Route } from "lucide-react";

export function BrandMark({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-3" aria-label="GoShuttles home">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary)] text-[var(--primary-foreground)] shadow-sm">
        <Route className="h-5 w-5" aria-hidden="true" />
      </span>
      <span>
        <span className="block text-lg font-black tracking-tight text-[var(--foreground)]">Go<span className="text-amber-500">Shuttles</span></span>
        <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">Daily intercity rides</span>
      </span>
    </Link>
  );
}
