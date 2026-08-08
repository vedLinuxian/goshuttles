"use server";

import { db } from "@/lib/db";
import { registerSchema } from "@/lib/validators";
import { hash } from "bcryptjs";

export async function register(_prevState: unknown, formData: FormData) {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    email: formData.get("email") || undefined,
    password: formData.get("password"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  const { name, phone, email, password } = parsed.data;

  // Registration always creates a passenger/customer. Roles can only be assigned by an admin.
  const role = "CUSTOMER";

  const existing = await db.user.findUnique({ where: { phone } });
  if (existing) {
    return { error: "Phone number already registered" };
  }

  if (email) {
    const existingEmail = await db.user.findUnique({ where: { email } });
    if (existingEmail) {
      return { error: "Email already registered" };
    }
  }

  const passwordHash = await hash(password, 12);

  await db.user.create({
    data: {
      name,
      phone,
      email,
      passwordHash,
      role,
      passengerProfile: {
        create: { fullName: name },
      },
    },
  });

  return { success: "Account created! Please sign in." };
}
