"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { TableHead } from "@/components/ui/table";

interface SortableHeaderProps {
  field: string;
  title: string;
  currentSortField?: string;
  currentSortOrder?: "asc" | "desc";
  onSort?: (field: string) => void;
  className?: string;
}

export function SortableHeader({
  field,
  title,
  currentSortField,
  currentSortOrder,
  onSort,
  className = "",
}: SortableHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // If onSort callback is not passed, use URL searchParams routing by default
  const activeField = currentSortField ?? searchParams.get("sort") ?? "";
  const activeOrder = (currentSortOrder ?? (searchParams.get("order") as "asc" | "desc")) || "desc";

  const isSorted = activeField === field;

  const handleClick = () => {
    if (onSort) {
      onSort(field);
      return;
    }

    const nextOrder = isSorted && activeOrder === "asc" ? "desc" : "asc";
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", field);
    params.set("order", nextOrder);
    params.set("page", "1"); // Reset to page 1 on sort change
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <TableHead className={`${className}`}>
      <button
        type="button"
        onClick={handleClick}
        className="group inline-flex items-center gap-1.5 font-bold text-xs hover:text-amber-400 focus:outline-none transition-colors cursor-pointer"
        title={`Sort by ${title} ${isSorted && activeOrder === "asc" ? "descending" : "ascending"}`}
      >
        <span>{title}</span>
        <span className="shrink-0 text-slate-400 group-hover:text-amber-400 transition-colors">
          {isSorted ? (
            activeOrder === "asc" ? (
              <ArrowUp className="h-3.5 w-3.5 text-amber-400 font-bold" />
            ) : (
              <ArrowDown className="h-3.5 w-3.5 text-amber-400 font-bold" />
            )
          ) : (
            <ArrowUpDown className="h-3.5 w-3.5 opacity-40 group-hover:opacity-100" />
          )}
        </span>
      </button>
    </TableHead>
  );
}
