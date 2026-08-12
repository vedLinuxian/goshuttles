import { auth } from "@/auth";
import { Eye, LogOut } from "lucide-react";

export async function ImpersonationBanner() {
  const session = await auth();
  if (!session?.user?.isImpersonating) return null;

  return (
    <div className="bg-gradient-to-r from-indigo-950 via-indigo-900 to-purple-950 text-white px-4 py-2.5 text-xs font-bold flex items-center justify-between border-b border-indigo-500/40 sticky top-0 z-[99999] shadow-xl">
      <div className="flex items-center gap-2.5">
        <Eye className="h-4.5 w-4.5 text-amber-400 animate-pulse" />
        <span>
          IMPERSONATION SANDBOX: Viewing dashboard as <strong className="text-amber-300">{session.user.name || "User"}</strong> ({session.user.role})
        </span>
      </div>
      <a
        href="/api/auth/impersonate?action=exit"
        className="px-3.5 py-1 bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-extrabold rounded-xl flex items-center gap-1.5 transition-all shadow-md"
      >
        <LogOut className="h-3.5 w-3.5" /> Exit Sandbox &amp; Return to Admin
      </a>
    </div>
  );
}
