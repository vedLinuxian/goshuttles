"use server";

import { auth } from "@/auth";
import { settleDriverSettlement } from "@/lib/analytics-queries";
import { settleDriverSchema } from "@/lib/validators";
import { revalidatePath } from "next/cache";

export async function settleAction(settlementId: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized — admin access required.");
  }

  const parsed = settleDriverSchema.safeParse({ settlementId });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message || "Invalid settlement ID");
  }

  await settleDriverSettlement(parsed.data.settlementId);
  revalidatePath("/admin/finance");
}

