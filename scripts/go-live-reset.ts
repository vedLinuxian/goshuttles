import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import { hash } from "bcryptjs";

async function goLiveReset() {
  console.log("🧹 Starting production database wipe...");

  // Dynamically import db after env vars are loaded
  const { db: prisma } = await import("../src/lib/db");
  const { getPasswordContext } = await import("../src/lib/auth");

  // Wipe all operational & demo data in correct foreign key order
  await prisma.refundRecord.deleteMany({});
  await prisma.taxInvoice.deleteMany({});
  await prisma.ticket.deleteMany({});
  await prisma.paymentVerification.deleteMany({});
  await prisma.booking.deleteMany({});
  await prisma.tripSeat.deleteMany({});
  await prisma.vehicleSeatTemplate.deleteMany({});
  await prisma.trip.deleteMany({});
  await prisma.vehicleMaintenance.deleteMany({});
  await prisma.vehicle.deleteMany({});
  await prisma.driverSettlement.deleteMany({});
  await prisma.walletTransaction.deleteMany({});
  await prisma.platformLedger.deleteMany({});
  await prisma.driverProfile.deleteMany({});
  await prisma.passengerProfile.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.activityLog.deleteMany({});
  await prisma.complaint.deleteMany({});
  await prisma.review.deleteMany({});
  await prisma.session.deleteMany({});
  await prisma.account.deleteMany({});
  await prisma.verification.deleteMany({});
  await prisma.user.deleteMany({});

  console.log("✅ All operational and test data successfully deleted.");

  // Create single Super Admin account
  const adminEmail = "goayodhya@gmail.com";
  const adminPassword = "Hello@Ayodhya101";
  const bcryptPasswordHash = await hash(adminPassword, 10);

  const adminUser = await prisma.user.create({
    data: {
      email: adminEmail.toLowerCase(),
      name: "GoAyodhya Admin",
      phone: "+919999999999",
      role: "ADMIN",
      isActive: true,
      emailVerified: true,
      passwordHash: bcryptPasswordHash,
    },
  });

  // Create BetterAuth credential account
  try {
    const ctx = await getPasswordContext();
    const betterAuthHash = await ctx.password.hash(adminPassword);

    await prisma.account.create({
      data: {
        userId: adminUser.id,
        providerId: "credential",
        accountId: adminUser.id,
        password: betterAuthHash,
      },
    });
    console.log("✅ BetterAuth credential account linked.");
  } catch (err) {
    console.warn("⚠️ Could not create BetterAuth account via context, falling back to bcrypt hash:", err);
    await prisma.account.create({
      data: {
        userId: adminUser.id,
        providerId: "credential",
        accountId: adminUser.id,
        password: bcryptPasswordHash,
      },
    });
  }

  // Create default shuttle locations (Lucknow, Ayodhya, Varanasi, Gorakhpur)
  const defaultLocations = ["Lucknow", "Ayodhya", "Varanasi", "Gorakhpur"];
  for (const name of defaultLocations) {
    await prisma.location.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  console.log("✅ Default terminal locations initialized (Lucknow, Ayodhya, Varanasi, Gorakhpur).");
  console.log("🎉 Production environment ready!");
  console.log(`🔑 Super Admin Email: ${adminEmail}`);
  console.log(`🔐 Super Admin Password: ${adminPassword}`);

  await prisma.$disconnect();
}

goLiveReset()
  .catch((e) => {
    console.error("❌ Reset error:", e);
    process.exit(1);
  });
