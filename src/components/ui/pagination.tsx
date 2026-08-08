"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationControlsProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  basePath?: string;
}

export default function PaginationControls({
  page,
  totalPages,
  total,
  pageSize,
  basePath,
}: PaginationControlsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const goToPage = useCallback(
    (target: number) => {
      const params = new URLSearchParams(searchParams.toString());
      if (target <= 1) {
        params.delete("page");
      } else {
        params.set("page", String(target));
      }
      const qs = params.toString();
      const path = basePath || pathname;
      router.push(qs ? `${path}?${qs}` : path);
    },
    [router, searchParams, basePath, pathname]
  );

  const start = total === 0 ? 0 : Math.min((page - 1) * pageSize + 1, total);
  const end = Math.min(page * pageSize, total);
  const pages = buildPageRange(page, totalPages);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[var(--border)] mt-4">
      <p className="text-xs text-[var(--muted-foreground)] font-medium">
        Showing{" "}
        <span className="font-extrabold text-amber-500">
          {start}-{end}
        </span>{" "}
        of <span className="font-extrabold text-amber-500">{total}</span> items
      </p>

      {totalPages > 1 && (
        <div className="flex items-center gap-1.5">
          {/* Prev */}
          <button
            onClick={() => goToPage(page - 1)}
            disabled={page <= 1}
            title="Previous page"
            className="p-2 rounded-xl text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] border border-[var(--border)] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {/* Page numbers */}
          {pages.map((p, i) =>
            typeof p === "number" ? (
              <button
                key={i}
                onClick={() => goToPage(p)}
                className={`min-w-[36px] h-9 px-2 rounded-xl text-xs font-bold transition-all ${
                  p === page
                    ? "bg-amber-500 text-slate-950 shadow-md font-extrabold"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] bg-[var(--card)] border border-[var(--border)] hover:bg-[var(--muted)]"
                }`}
              >
                {p}
              </button>
            ) : (
              <span
                key={i}
                className="px-1 text-[var(--muted-foreground)] text-xs select-none"
              >
                …
              </span>
            )
          )}

          {/* Next */}
          <button
            onClick={() => goToPage(page + 1)}
            disabled={page >= totalPages}
            title="Next page"
            className="p-2 rounded-xl text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] border border-[var(--border)] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

function buildPageRange(
  current: number,
  total: number
): (number | string)[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const range: (number | string)[] = [1];

  if (current > 3) {
    range.push("…");
  }

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) {
    range.push(i);
  }

  if (current < total - 2) {
    range.push("…");
  }

  range.push(total);

  return range;
}
