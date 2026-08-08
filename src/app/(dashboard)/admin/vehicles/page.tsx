import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { VehiclesClient } from "./vehicles-client";

const PAGE_SIZE = 10;

export default async function AdminVehiclesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/");

  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const q = (params.q as string) || "";

  const where: Prisma.VehicleWhereInput = {};
  if (q) {
    where.OR = [
      { regNumber: { contains: q, mode: "insensitive" } },
      { modelName: { contains: q, mode: "insensitive" } },
      { owner: { name: { contains: q, mode: "insensitive" } } },
    ];
  }

  const [vehicles, totalCount] = await Promise.all([
    db.vehicle.findMany({
      where,
      include: { owner: { select: { name: true, phone: true } } },
      orderBy: { regNumber: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.vehicle.count({ where }),
  ]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <VehiclesClient
      vehicles={vehicles}
      page={page}
      totalPages={totalPages}
      totalCount={totalCount}
      pageSize={PAGE_SIZE}
    />
  );
}
