import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { TopHeader } from "@/components/layout/top-header";
import { ToastProvider } from "@/components/ui/toast";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <ToastProvider>
      <div className="flex min-h-screen flex-col bg-[var(--background)] font-sans text-[var(--foreground)] selection:bg-amber-500 selection:text-slate-950 transition-colors lg:h-screen lg:flex-row lg:overflow-hidden">
        <div className="dashboard-sidebar shrink-0"><Sidebar user={session.user} /></div>
        <div className="flex min-h-0 flex-1 flex-col bg-[var(--background)]">
          <div className="dashboard-header shrink-0"><TopHeader user={session.user} /></div>
          <main className="min-h-0 flex-1 p-4 text-[var(--foreground)] transition-colors sm:p-6 lg:overflow-y-auto lg:p-8">
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
