import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Prisma, Role } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { UsersClient } from "./users-client";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/");

  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const pageSize = [10, 20, 50, 100].includes(Number(params.pageSize)) ? Number(params.pageSize) : 20;
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const roleFilter = typeof params.role === "string" ? params.role.trim() : "";
  const statusFilter = typeof params.status === "string" ? params.status.trim() : "";

  const where: Prisma.UserWhereInput = {};
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { phone: { contains: q, mode: "insensitive" } },
    ];
  }
  if (roleFilter && Object.values(Role).includes(roleFilter as Role)) {
    where.role = roleFilter as Role;
  }
  if (statusFilter === "ACTIVE") {
    where.isActive = true;
  } else if (statusFilter === "DISABLED") {
    where.isActive = false;
  }

  const [users, totalCount, adminCount, driverCount, customerCount, disabledCount] = await Promise.all([
    db.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        driverProfile: {
          select: { kycStatus: true, walletBalance: true, totalEarnings: true, isAvailable: true },
        },
        _count: { select: { bookings: true, assignedTrips: true, vehicles: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.user.count({ where }),
    db.user.count({ where: { role: "ADMIN" } }),
    db.user.count({ where: { role: "DRIVER" } }),
    db.user.count({ where: { role: "CUSTOMER" } }),
    db.user.count({ where: { isActive: false } }),
  ]);

  const totalPages = Math.ceil(totalCount / pageSize);

  const serializedUsers = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    role: u.role,
    isActive: u.isActive,
    createdAt: u.createdAt ? u.createdAt.toISOString() : new Date().toISOString(),
    driverProfile: u.driverProfile
      ? {
          kycStatus: u.driverProfile.kycStatus,
          walletBalance: Number(u.driverProfile.walletBalance),
          totalEarnings: Number(u.driverProfile.totalEarnings),
          isAvailable: u.driverProfile.isAvailable,
        }
      : null,
    _count: u._count,
  }));

  return (
    <UsersClient
      users={serializedUsers}
      page={page}
      totalPages={totalPages}
      totalCount={totalCount}
      pageSize={pageSize}
      roleFilter={roleFilter}
      statusFilter={statusFilter}
      q={q}
      stats={{
        adminCount,
        driverCount,
        customerCount,
        disabledCount,
        totalUsers: totalCount,
      }}
      currentUserId={session.user.id!}
    />
  );
}
