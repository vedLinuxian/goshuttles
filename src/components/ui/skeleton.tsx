import * as React from "react";
import { cn } from "@/lib/utils";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-xl bg-[var(--muted)] border border-[var(--border)]", className)}
      {...props}
    />
  );
}

export { Skeleton };
