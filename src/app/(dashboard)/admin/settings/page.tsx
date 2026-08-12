import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Settings } from "lucide-react";
import { CentralizedSettingsForm } from "@/components/profile/centralized-settings-form";

export default async function AdminSettingsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/login");
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--foreground)] tracking-tight flex items-center gap-2.5">
          <Settings className="h-7 w-7 text-amber-500" />
          Admin Platform Settings
        </h1>
        <p className="text-xs sm:text-sm text-[var(--muted-foreground)] mt-1">
          Manage your administrator profile, security credentials, contact details, and system preferences.
        </p>
      </div>

      <CentralizedSettingsForm
        user={{
          id: session.user.id!,
          name: session.user.name ?? null,
          email: session.user.email ?? null,
          phone: session.user.phone ?? null,
          role: session.user.role,
        }}
      />
    </div>
  );
}
