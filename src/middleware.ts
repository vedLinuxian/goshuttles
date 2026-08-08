import { NextResponse, type NextRequest } from "next/server";

interface SessionUser {
  id: string;
  role: "ADMIN" | "DRIVER" | "CUSTOMER";
  isActive?: boolean;
  email?: string | null;
  phone?: string | null;
}

async function getSession(req: NextRequest): Promise<{ user: SessionUser | null }> {
  const cookieToken =
    req.cookies.get("better-auth.session_token")?.value ||
    req.cookies.get("__Secure-better-auth.session_token")?.value;

  if (!cookieToken) return { user: null };

  try {
    const authUrl = new URL("/api/auth/get-session", req.url);
    const res = await fetch(authUrl, {
      headers: { cookie: req.headers.get("cookie") || "" },
      cache: "no-store",
    });
    if (!res.ok) return { user: null };
    const data = (await res.json()) as { user?: SessionUser | null } | null;
    return { user: data?.user ?? null };
  } catch {
    return { user: null };
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Bypass internal assets and API routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/cron") ||
    pathname.startsWith("/api/auth") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const { user } = await getSession(req);
  const role = user?.role;

  // Redirect inactive users to login
  if (user && user.isActive === false) {
    const response = NextResponse.redirect(new URL("/login?error=Inactive", req.url));
    response.cookies.delete("better-auth.session_token");
    response.cookies.delete("__Secure-better-auth.session_token");
    return response;
  }

  const isAuthPage = pathname === "/login" || pathname === "/register";

  // Auto-redirect logged-in users away from login/register to their role dashboard
  if (isAuthPage && user) {
    if (role === "ADMIN") return NextResponse.redirect(new URL("/admin/dashboard", req.url));
    if (role === "DRIVER") return NextResponse.redirect(new URL("/driver/dashboard", req.url));
    return NextResponse.redirect(new URL("/passenger/dashboard", req.url));
  }

  // Strict Admin Route Isolation
  if (pathname.startsWith("/admin")) {
    if (!user) {
      return NextResponse.redirect(new URL(`/login?callbackUrl=${encodeURIComponent(pathname)}`, req.url));
    }
    if (role !== "ADMIN") {
      return NextResponse.redirect(new URL("/login?error=UnauthorizedAdmin", req.url));
    }
  }

  // Strict Driver Route Isolation
  if (pathname.startsWith("/driver")) {
    if (!user) {
      return NextResponse.redirect(new URL(`/login?callbackUrl=${encodeURIComponent(pathname)}`, req.url));
    }
    if (role !== "DRIVER") {
      return NextResponse.redirect(new URL("/login?error=UnauthorizedDriver", req.url));
    }
  }

  // Passenger Route Protection
  if (pathname.startsWith("/passenger")) {
    if (!user) {
      return NextResponse.redirect(new URL(`/login?callbackUrl=${encodeURIComponent(pathname)}`, req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};