"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button, buttonVariants } from "@/components/ui";

export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 p-8 text-center" role="alert">
      <h1 className="text-lg font-semibold text-[var(--foreground)]">Driver workspace unavailable</h1>
      <p className="max-w-md text-sm text-[var(--muted-foreground)]">We could not load this page. Please try again.</p>
      <div className="flex items-center gap-3">
        <Button type="button" onClick={reset} size="sm">Try Again</Button>
        <Link href="/driver/dashboard" className={buttonVariants({ variant: "secondary", size: "sm" })}>Back to dashboard</Link>
      </div>
    </div>
  );
}