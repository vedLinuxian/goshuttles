import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  driverId: z.string().uuid("Invalid driver ID"),
  vehicleId: z.string().uuid("Invalid vehicle ID"),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 422 });
  }

  const { driverId, vehicleId } = parsed.data;

  try {
    // Verify driver exists and has role DRIVER
    const driver = await db.user.findUnique({
      where: { id: driverId },
      select: { id: true, role: true, name: true },
    });
    if (!driver || driver.role !== "DRIVER") {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    }

    // Verify vehicle exists
    const vehicle = await db.vehicle.findUnique({
      where: { id: vehicleId },
      select: { id: true, regNumber: true, ownerId: true },
    });
    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    // Reassign vehicle owner to this driver
    await db.vehicle.update({
      where: { id: vehicleId },
      data: { ownerId: driverId },
    });

    return NextResponse.json({
      success: true,
      message: `Vehicle ${vehicle.regNumber} assigned to driver ${driver.name || driverId}`,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Assignment failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
