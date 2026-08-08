import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--primary)] text-[var(--primary-foreground)] hover:brightness-105 font-semibold shadow-lg shadow-amber-500/20",
        destructive:
          "bg-rose-600 text-white hover:bg-rose-500 font-semibold shadow-lg shadow-rose-600/20",
        outline:
          "border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] hover:bg-[var(--muted)] hover:text-amber-600 dark:hover:text-amber-400 shadow-sm",
        secondary:
          "bg-[var(--muted)] text-[var(--foreground)] hover:bg-[var(--card)] border border-[var(--border)]",
        ghost:
          "text-[var(--foreground)] hover:bg-[var(--muted)] hover:text-amber-600 dark:hover:text-amber-400",
        link:
          "text-amber-600 dark:text-amber-400 underline-offset-4 hover:underline hover:text-amber-500 dark:hover:text-amber-300 p-0 h-auto",
        amberOutline:
          "border border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 hover:border-amber-500",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-lg px-3 text-xs",
        lg: "h-12 rounded-xl px-6 text-base font-semibold",
        icon: "h-10 w-10 p-0 shrink-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
