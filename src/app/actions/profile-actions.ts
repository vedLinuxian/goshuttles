"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/role-check";

import {
  aadhaarNumberSchema,
  licenseNumberSchema,
  nameSchema,
  guestAgeSchema,
  guestGenderSchema,
  phoneSchema,
} from "@/lib/validators";

// ============================================================
// VALIDATION SCHEMAS
// ============================================================

const updateDriverProfileSchema = z.object({
  fullName: nameSchema.optional(),
  aadhaarNumber: aadhaarNumberSchema.optional().or(z.literal("")),
  licenseNumber: licenseNumberSchema.optional().or(z.literal("")),
});

const updatePassengerProfileSchema = z.object({
  fullName: nameSchema.optional(),
  age: guestAgeSchema.optional(),
  gender: guestGenderSchema.optional(),
  emergencyContact: phoneSchema.optional().or(z.literal("")),
});

const updateUserSchema = z.object({
  name: nameSchema.optional(),
  phone: phoneSchema.optional(),
  email: z.string().email("Invalid email").max(255).optional().or(z.literal("")),
});

type ActionResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

// ============================================================
// DRIVER PROFILE ACTIONS
// ============================================================

export async function updateDriverProfile(
  _prevState: unknown,
  formData: FormData
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized — please sign in." };
  }
  if (session.user.role !== "DRIVER") {
    return { success: false, error: "Only drivers can update their profile." };
  }
  const userId = session.user.id;

  const parsed = updateDriverProfileSchema.safeParse({
    fullName: formData.get("fullName"),
    aadhaarNumber: formData.get("aadhaarNumber") || undefined,
    licenseNumber: formData.get("licenseNumber") || undefined,
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid driver profile input" };
  }

  const data: Record<string, string | null> = {};
  if (parsed.data.fullName) data.fullName = parsed.data.fullName;
  if (parsed.data.aadhaarNumber !== undefined) {
    data.aadhaarNumber = parsed.data.aadhaarNumber || null;
  }
  if (parsed.data.licenseNumber !== undefined) {
    data.licenseNumber = parsed.data.licenseNumber || null;
  }

  try {
    const profile = await db.$transaction(async (tx) => {
      const res = await tx.driverProfile.upsert({
        where: { userId },
        create: {
          userId,
          fullName: parsed.data.fullName || session.user.name || "Driver",
          aadhaarNumber: parsed.data.aadhaarNumber || null,
          licenseNumber: parsed.data.licenseNumber || null,
        },
        update: data,
      });

      if (parsed.data.fullName) {
        await tx.user.update({
          where: { id: userId },
          data: { name: parsed.data.fullName },
        });
      }

      return res;
    });

    revalidatePath("/driver/profile");
    return { success: true, data: profile };
  } catch (e: unknown) {
    const message =
      e instanceof Error ? e.message : "Failed to update driver profile.";
    return { success: false, error: message };
  }
}

// ============================================================
// PASSENGER PROFILE ACTIONS
// ============================================================

export async function updatePassengerProfile(
  _prevState: unknown,
  formData: FormData
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized — please sign in." };
  }
  const userId = session.user.id;

  const parsed = updatePassengerProfileSchema.safeParse({
    fullName: formData.get("fullName"),
    age: formData.get("age") ? Number(formData.get("age")) : undefined,
    gender: formData.get("gender") || undefined,
    emergencyContact: formData.get("emergencyContact") || undefined,
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  try {
    const data: Record<string, unknown> = {};
    if (parsed.data.fullName) data.fullName = parsed.data.fullName;
    if (parsed.data.age) data.age = parsed.data.age;
    if (parsed.data.gender) data.gender = parsed.data.gender;
    if (parsed.data.emergencyContact !== undefined) {
      data.emergencyContact = parsed.data.emergencyContact || null;
    }

    const profile = await db.$transaction(async (tx) => {
      const res = await tx.passengerProfile.upsert({
        where: { userId },
        create: {
          userId,
          fullName: parsed.data.fullName || session.user.name || "Passenger",
          age: parsed.data.age || null,
          gender: parsed.data.gender || null,
          emergencyContact: parsed.data.emergencyContact || null,
        },
        update: data,
      });

      if (parsed.data.fullName) {
        await tx.user.update({
          where: { id: userId },
          data: { name: parsed.data.fullName },
        });
      }

      return res;
    });

    revalidatePath("/passenger/profile");
    return { success: true, data: profile };
  } catch (e: unknown) {
    const message =
      e instanceof Error ? e.message : "Failed to update passenger profile.";
    return { success: false, error: message };
  }
}

// ============================================================
// USER ACTIONS (name, phone, email)
// ============================================================

export async function updateUserProfile(
  _prevState: unknown,
  formData: FormData
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized — please sign in." };
  }

  const parsed = updateUserSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    email: formData.get("email") || undefined,
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  try {
    const data: Record<string, string | null> = {};
    if (parsed.data.name) data.name = parsed.data.name;
    if (parsed.data.phone) data.phone = parsed.data.phone;
    if (parsed.data.email !== undefined) {
      data.email = parsed.data.email ? parsed.data.email.trim() : null;
    }

    const user = await db.user.update({
      where: { id: session.user.id },
      data,
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    revalidatePath("/passenger/profile");
    revalidatePath("/driver/profile");
    return { success: true, data: user };
  } catch (e: unknown) {
    const message =
      e instanceof Error ? e.message : "Failed to update user profile.";
    return { success: false, error: message };
  }
}

// ============================================================
// DRIVER KYC & AVAILABILITY ACTIONS
// ============================================================

export async function updateDriverKycStatus(
  driverUserId: string,
  kycStatus: "PENDING" | "APPROVED" | "REJECTED"
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return { success: false, error: "Unauthorized — admin only." };
  }

  try {
    const profile = await db.driverProfile.update({
      where: { userId: driverUserId },
      data: { kycStatus },
    });

    revalidatePath("/admin/drivers");
    return { success: true, data: profile };
  } catch (e: unknown) {
    const message =
      e instanceof Error ? e.message : "Failed to update KYC status.";
    return { success: false, error: message };
  }
}

export async function updateDriverKyc(
  driverUserId: string,
  kycData: { aadhaarNumber?: string; licenseNumber?: string; fullName?: string; kycStatus?: "PENDING" | "APPROVED" | "REJECTED" }
): Promise<ActionResult> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { success: false, error: "Unauthorized — please sign in." };
  }
  const parsedDriverId = z.string().uuid().safeParse(driverUserId);
  if (!parsedDriverId.success) return { success: false, error: "Invalid driver ID." };

  const isAdmin = currentUser.role === "ADMIN";
  const isDriverSelf = currentUser.role === "DRIVER" && currentUser.id === driverUserId;
  if (!isAdmin && !isDriverSelf) {
    return { success: false, error: "Unauthorized — cannot modify another driver's KYC." };
  }

  try {
    const data: Record<string, unknown> = {};
    if (kycData.aadhaarNumber !== undefined) {
      if (kycData.aadhaarNumber) {
        const parsedAadhaar = aadhaarNumberSchema.safeParse(kycData.aadhaarNumber);
        if (!parsedAadhaar.success) {
          return { success: false, error: parsedAadhaar.error.issues[0]?.message };
        }
        data.aadhaarNumber = parsedAadhaar.data;
      } else {
        data.aadhaarNumber = null;
      }
    }

    if (kycData.licenseNumber !== undefined) {
      if (kycData.licenseNumber) {
        const parsedDl = licenseNumberSchema.safeParse(kycData.licenseNumber);
        if (!parsedDl.success) {
          return { success: false, error: parsedDl.error.issues[0]?.message };
        }
        data.licenseNumber = parsedDl.data;
      } else {
        data.licenseNumber = null;
      }
    }

    if (kycData.fullName) {
      const parsedName = nameSchema.safeParse(kycData.fullName);
      if (!parsedName.success) {
        return { success: false, error: parsedName.error.issues[0]?.message };
      }
      data.fullName = parsedName.data;
    }

    if (isAdmin && kycData.kycStatus) {
      data.kycStatus = kycData.kycStatus;
    }

    const updated = await db.driverProfile.update({
      where: { userId: driverUserId },
      data,
    });

    revalidatePath("/admin/drivers");
    revalidatePath("/driver/profile");
    return { success: true, data: updated };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to update driver KYC.";
    return { success: false, error: message };
  }
}

export async function toggleDriverAvailability(
  isAvailable?: boolean
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "DRIVER") {
    return { success: false, error: "Only drivers can change availability." };
  }

  const userId = session.user.id;
  try {
    const profile = await db.driverProfile.findUnique({ where: { userId } });
    if (!profile) {
      return { success: false, error: "Driver profile not found." };
    }

    const newStatus = isAvailable !== undefined ? isAvailable : !profile.isAvailable;

    const updated = await db.driverProfile.update({
      where: { userId },
      data: { isAvailable: newStatus },
    });

    revalidatePath("/driver/dashboard");
    revalidatePath("/driver/profile");
    revalidatePath("/admin/drivers");

    return { success: true, data: updated };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to toggle driver availability.";
    return { success: false, error: message };
  }
}

import { compare, hash } from "bcryptjs";
import { getPasswordContext } from "@/lib/auth";

export async function updateUserProfileAndSecurityAction(input: {
  name?: string;
  phone?: string;
  email?: string;
  currentPassword?: string;
  newPassword?: string;
}): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized — please sign in." };
  }
  const userId = session.user.id;
  const { name, phone, email, currentPassword, newPassword } = input;

  try {
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) return { success: false, error: "User not found." };

    if (email && email.trim() && email.toLowerCase() !== user.email?.toLowerCase()) {
      const existingEmail = await db.user.findUnique({ where: { email: email.toLowerCase() } });
      if (existingEmail) return { success: false, error: "An account with this email address already exists." };
    }
    if (phone && phone.trim() && phone !== user.phone) {
      const existingPhone = await db.user.findUnique({ where: { phone } });
      if (existingPhone) return { success: false, error: "An account with this phone number already exists." };
    }

    let newPasswordHash: string | undefined = undefined;

    if (newPassword && newPassword.trim().length > 0) {
      if (newPassword.trim().length < 6) {
        return { success: false, error: "New password must be at least 6 characters long." };
      }
      if (!currentPassword) {
        return { success: false, error: "Current password is required to set a new password." };
      }
      if (user.passwordHash) {
        const isValid = await compare(currentPassword, user.passwordHash);
        if (!isValid) {
          return { success: false, error: "Current password provided is incorrect." };
        }
      }
      newPasswordHash = await hash(newPassword.trim(), 10);
    }

    await db.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          ...(name !== undefined ? { name } : {}),
          ...(phone !== undefined ? { phone } : {}),
          ...(email !== undefined ? { email: email.trim().toLowerCase() } : {}),
          ...(newPasswordHash ? { passwordHash: newPasswordHash } : {}),
        },
      });

      if (newPassword && newPasswordHash) {
        try {
          const ctx = await getPasswordContext();
          const betterAuthHash = await ctx.password.hash(newPassword.trim());
          const existingAcc = await tx.account.findFirst({
            where: { userId, providerId: "credential" },
          });
          if (existingAcc) {
            await tx.account.update({
              where: { id: existingAcc.id },
              data: { password: betterAuthHash },
            });
          } else {
            await tx.account.create({
              data: { userId, providerId: "credential", accountId: userId, password: betterAuthHash },
            });
          }
        } catch {
          // Fallback
        }
      }

      await tx.activityLog.create({
        data: {
          userId,
          action: "UPDATE_PROFILE_SETTINGS",
          targetType: "user",
          targetId: userId,
        },
      });
    });

    revalidatePath("/admin/settings");
    revalidatePath("/driver/profile");
    revalidatePath("/passenger/profile");
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to update profile settings." };
  }
}
