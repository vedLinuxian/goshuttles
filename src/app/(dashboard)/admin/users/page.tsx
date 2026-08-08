import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Prisma, Role } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { UsersClient } from "./users-client";

const PAGE_SIZE = 10;

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/");

  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const q = (params.q as string) || "";
  const roleFilter = (params.role as string) || "";

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

  const [users, totalCount, adminCount, driverCount, customerCount] = await Promise.all([
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
        _count: { select: { bookings: true, assignedTrips: true, vehicles: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.user.count({ where }),
    db.user.count({ where: { role: "ADMIN" } }),
    db.user.count({ where: { role: "DRIVER" } }),
    db.user.count({ where: { role: "CUSTOMER" } }),
  ]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <UsersClient
      users={users}
      page={page}
      totalPages={totalPages}
      totalCount={totalCount}
      pageSize={PAGE_SIZE}
      roleFilter={roleFilter}
      stats={{ adminCount, driverCount, customerCount, totalUsers: totalCount }}
      currentUserId={session.user.id!}
    />
  );
}
