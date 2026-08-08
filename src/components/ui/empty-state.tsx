"use client";

import Link from "next/link";
import { type LucideIcon, Database, SearchX, Plus, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type EmptyStateVariant = "no-data" | "no-results";

interface EmptyStateProps {
  icon?: LucideIcon;
  title?: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  variant?: EmptyStateVariant;
  className?: string;
}

// ---------------------------------------------------------------------------
// Defaults per variant
// ---------------------------------------------------------------------------

const variantDefaults: Record<
  EmptyStateVariant,
  { icon: LucideIcon; title: string; description: string }
> = {
  "no-data": {
    icon: Database,
    title: "Nothing here yet",
    description:
      "Get started by creating your first entry. Once you add data, it will appear right here.",
  },
  "no-results": {
    icon: SearchX,
    title: "No results found",
    description:
      "Try adjusting your search or filters. If you think something should be here, let us know.",
  },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  actionHref,
  variant = "no-data",
  className,
}: EmptyStateProps) {
  const defaults = variantDefaults[variant];
  const Icon = icon ?? defaults.icon;
  const displayTitle = title ?? defaults.title;
  const displayDescription = description ?? defaults.description;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16 px-4 text-center text-[var(--foreground)]",
        className,
      )}
    >
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10 text-amber-500">
        <Icon className="h-7 w-7" />
      </div>

      <h3 className="mb-2 text-lg font-bold text-[var(--foreground)]">
        {displayTitle}
      </h3>

      <p className="max-w-sm text-sm leading-relaxed text-[var(--muted-foreground)]">
        {displayDescription}
      </p>

      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-white font-semibold text-sm shadow-sm shadow-amber-500/20 hover:shadow-md hover:shadow-amber-500/30 transition-all"
        >
          {variant === "no-data" && <Plus className="h-4 w-4" />}
          <span>{actionLabel}</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}
