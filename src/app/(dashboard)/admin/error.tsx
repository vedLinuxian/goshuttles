"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Alert, Button, Card, CardContent } from "@/components/ui";

export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);

  return (
    <div className="mx-auto flex min-h-[40vh] max-w-xl items-center justify-center p-6">
      <Card className="w-full" role="alert"><CardContent className="space-y-4 p-6"><Alert variant="destructive"><strong>Admin workspace unavailable</strong><p className="mt-1 text-sm">We could not load this page. Please try again.</p></Alert><div className="flex flex-wrap gap-3"><Button type="button" onClick={reset}>Try again</Button><Link className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-700/80 px-4 py-2 text-sm font-medium text-slate-200 hover:border-amber-500/50 hover:text-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50" href="/admin/dashboard">Return to dashboard</Link></div></CardContent></Card>
    </div>
  );
}
