import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300 hover:bg-amber-500/20",
        solidAmber:
          "border-transparent bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 shadow-md shadow-amber-500/20",
        secondary:
          "border-[var(--border)] bg-[var(--muted)] text-[var(--foreground)] hover:bg-[var(--card)]",
        destructive:
          "border-rose-500/40 bg-rose-500/10 text-rose-800 dark:text-rose-400 hover:bg-rose-500/20",
        outline: "border-[var(--border)] text-[var(--foreground)]",
        success:
          "border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 hover:bg-emerald-500/20",
        warning:
          "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300 hover:bg-amber-500/20",
        info:
          "border-sky-500/40 bg-sky-500/10 text-sky-800 dark:text-sky-400 hover:bg-sky-500/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
