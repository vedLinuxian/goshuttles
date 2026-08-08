import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";

export async function getCurrentUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, isActive: true, name: true, phone: true, email: true },
  });
  return user?.isActive ? user : null;
}

export async function requireCurrentRole(role: "ADMIN" | "DRIVER" | "CUSTOMER") {
  const user = await getCurrentUser();
  if (!user || user.role !== role) return null;
  return user;
}

export async function requireCurrentUser() {
  return getCurrentUser();
}

export async function requireAuth() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session;
}

export async function requireAdmin() {
  const session = await requireAuth();
  if (session.user.role !== "ADMIN") redirect("/");
  return session;
}

export async function requireDriver() {
  const session = await requireAuth();
  if (session.user.role !== "DRIVER") redirect("/");
  return session;
}

export async function requirePassenger() {
  const session = await requireAuth();
  if (session.user.role !== "CUSTOMER") redirect("/");
  return session;
}

export function isAdmin(role?: string) {
  return role === "ADMIN";
}

export function isDriver(role?: string) {
  return role === "DRIVER";
}

export function isPassenger(role?: string) {
  return role === "CUSTOMER";
}
