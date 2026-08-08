"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { Role } from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const userIdSchema = z.string().uuid();
const assignableRoleSchema = z.enum(["CUSTOMER", "DRIVER"]);

export async function updateUserRole(userId: string, newRole: Role) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return { success: false, error: "Unauthorized. Admin privileges required." };
  }

  const parsedUserId = userIdSchema.safeParse(userId);
  const parsedRole = assignableRoleSchema.safeParse(newRole);
  if (!parsedUserId.success || !parsedRole.success) {
    return { success: false, error: "Invalid user or role." };
  }

  if (userId === session.user.id && newRole !== "ADMIN") {
    return { success: false, error: "You cannot demote your own admin account." };
  }

  try {
    await db.$transaction(async (tx) => {
      const target = await tx.user.findUnique({ where: { id: userId }, select: { id: true, name: true, role: true } });
      if (!target) throw new Error("User not found.");
      if (target.role === "ADMIN" || newRole === "ADMIN") {
        throw new Error("The ADMIN role cannot be assigned or changed through user management.");
      }

      await tx.user.update({ where: { id: userId }, data: { role: newRole } });

      if (newRole === "DRIVER") {
        await tx.driverProfile.upsert({
          where: { userId },
          update: {},
          create: { userId, fullName: target.name || "Driver Partner", kycStatus: "PENDING" },
        });
      } else {
        await tx.passengerProfile.upsert({
          where: { userId },
          update: {},
          create: { userId, fullName: target.name || "Passenger" },
        });
      }

      await tx.activityLog.create({
        data: {
          userId: session.user.id!,
          action: "UPDATE_USER_ROLE",
          targetType: "user",
          targetId: userId,
          metadata: { previousRole: target.role, newRole },
        },
      });
    });

    revalidatePath("/admin/users");
    return { success: true };
  } catch {
    return { success: false, error: "Unable to update that user role." };
  }
}

export async function toggleUserActiveStatus(userId: string, isActive: boolean) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return { success: false, error: "Unauthorized. Admin privileges required." };
  }

  if (!userIdSchema.safeParse(userId).success || typeof isActive !== "boolean") {
    return { success: false, error: "Invalid user status request." };
  }
  if (userId === session.user.id) {
    return { success: false, error: "You cannot deactivate your own account." };
  }

  try {
    await db.$transaction(async (tx) => {
      await tx.user.update({ where: { id: userId }, data: { isActive } });
      await tx.activityLog.create({
        data: {
          userId: session.user.id!,
          action: isActive ? "ACTIVATE_USER" : "DEACTIVATE_USER",
          targetType: "user",
          targetId: userId,
        },
      });
    });

    revalidatePath("/admin/users");
    return { success: true };
  } catch {
    return { success: false, error: "Unable to update that user status." };
  }
}
