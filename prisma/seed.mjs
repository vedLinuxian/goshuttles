import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  await db.pricingConfig.upsert({
    where: { configKey: "default" },
    update: {},
    create: {
      configKey: "default",
      surgeMultiplier: 1.1,
      occupancyThreshold: 0.6,
      commissionRate: 5.0,
      surgeEnabled: true,
      seatLockTimeout: 5,
    },
  });
  console.log("  Pricing config verified");

  await db.location.create({ data: { name: "Lucknow" } });
  await db.location.create({ data: { name: "Ayodhya" } });
  console.log("  Locations: Lucknow, Ayodhya");

  const adminHash = await hash("admin123", 12);
  await db.user.create({
    data: { name: "Admin", phone: "9999999999", passwordHash: adminHash, role: "ADMIN" },
  });
  console.log("  Admin user (phone: 9999999999, pw: admin123)");

  const driverHash = await hash("driver123", 12);
  const driver = await db.user.create({
    data: {
      name: "Driver One",
      phone: "8888888888",
      passwordHash: driverHash,
      role: "DRIVER",
      driverProfile: { create: { fullName: "Driver One", kycStatus: "APPROVED" } },
    },
  });
  await db.vehicle.create({
    data: { ownerId: driver.id, regNumber: "UP32XY0001", modelName: "Maruti Ertiga", vehicleType: "SUV", capacity: 6 },
  });
  console.log("  Driver + vehicle (phone: 8888888888, pw: driver123)");

  const passHash = await hash("pass123", 12);
  await db.user.create({
    data: {
      name: "Passenger One",
      phone: "7777777777",
      passwordHash: passHash,
      role: "CUSTOMER",
      passengerProfile: { create: { fullName: "Passenger One" } },
    },
  });
  console.log("  Passenger (phone: 7777777777, pw: pass123)");

  console.log("Seed complete!");
}

main()
  .catch((e) => { console.error("Seed failed:", e); process.exit(1); })
  .finally(async () => { await db.$disconnect(); });
