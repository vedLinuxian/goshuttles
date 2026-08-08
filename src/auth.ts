import { auth as betterAuthServer, applySetCookies, getServerSession } from "@/lib/auth";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

export const auth = getServerSession;

export async function signOut(options?: { redirectTo?: string }) {
  try {
    const result = await betterAuthServer.api.signOut({
      headers: await headers(),
      returnHeaders: true,
    });
    await applySetCookies(result.headers?.get("set-cookie"));
  } catch {
    // fall through to cookie cleanup
  }

  try {
    const cookieStore = await cookies();
    cookieStore.delete("better-auth.session_token");
    cookieStore.delete("__Secure-better-auth.session_token");
  } catch {
    // ignore cookie errors
  }

  if (options?.redirectTo) {
    redirect(options.redirectTo);
  }
}