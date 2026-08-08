import { PrismaClient, Location, User, Vehicle, SeatType } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Starting 6-Month GoShuttles Data Seeding...");

  // 1. Seed Pricing Config
  await prisma.pricingConfig.upsert({
    where: { id: "default-pricing-config" },
    update: {
      surgeMultiplier: 1.15,
      occupancyThreshold: 0.60,
      commissionRate: 5.00,
      surgeEnabled: true,
      seatLockTimeout: 5,
    },
    create: {
      id: "default-pricing-config",
      surgeMultiplier: 1.15,
      occupancyThreshold: 0.60,
      commissionRate: 5.00,
      surgeEnabled: true,
      seatLockTimeout: 5,
    },
  });
  console.log("✅ Pricing Config initialized.");

  // 2. Seed Locations
  const locationNames = [
    "Lucknow (Alambagh Bus Stand)",
    "Ayodhya (Dham Terminal)",
    "Varanasi (Cantt Station)",
    "Gorakhpur (Express Hub)",
    "Kanpur (Central Terminal)",
  ];

  const locations: Record<string, Location> = {};
  for (const name of locationNames) {
    const loc = await prisma.location.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    locations[name] = loc;
  }
  console.log(`✅ ${Object.keys(locations).length} Route Locations seeded.`);

  // 3. Seed Password Hashes
  const adminPasswordHash = await bcrypt.hash("admin123", 10);
  const driverPasswordHash = await bcrypt.hash("driver123", 10);
  const passengerPasswordHash = await bcrypt.hash("pass123", 10);

  // 4. Seed Admin User
  const admin = await prisma.user.upsert({
    where: { phone: "9999999999" },
    update: { email: "admin@goayodhya.com", passwordHash: adminPasswordHash, role: "ADMIN", isActive: true },
    create: {
      name: "System Admin",
      email: "admin@goayodhya.com",
      phone: "9999999999",
      passwordHash: adminPasswordHash,
      role: "ADMIN",
    },
  });
  console.log(`✅ Admin User created: ${admin.email}`);

  // 5. Seed Drivers & Profiles
  const driversData = [
    { name: "Rahul Sharma", phone: "9876543210", reg: "UP32 AB 1234", vehicle: "Maruti Ertiga ZXI+" },
    { name: "Suresh Kumar", phone: "9876543211", reg: "UP32 XY 5678", vehicle: "Toyota Innova Crysta" },
    { name: "Vikram Singh", phone: "9876543212", reg: "UP53 BC 9999", vehicle: "Force Traveller Express" },
    { name: "Amit Verma", phone: "9876543213", reg: "UP65 DE 4321", vehicle: "Kia Carens Luxury" },
    { name: "Deepak Yadav", phone: "9876543214", reg: "UP78 FG 8888", vehicle: "Maruti XL6 Premium" },
  ];

  const driverUsers: User[] = [];
  const vehicles: Vehicle[] = [];

  for (const d of driversData) {
    const user = await prisma.user.upsert({
      where: { phone: d.phone },
      update: { email: `${d.name.toLowerCase().replace(/\s+/g, ".")}@goayodhya.com`, passwordHash: driverPasswordHash, role: "DRIVER", isActive: true },
      create: {
        name: d.name,
        email: `${d.name.toLowerCase().replace(/\s+/g, ".")}@goayodhya.com`,
        phone: d.phone,
        passwordHash: driverPasswordHash,
        role: "DRIVER",
        driverProfile: {
          create: {
            fullName: d.name,
            aadhaarNumber: `1234 5678 ${Math.floor(1000 + Math.random() * 9000)}`,
            licenseNumber: `DL-UP${Math.floor(10000000 + Math.random() * 90000000)}`,
            kycStatus: "APPROVED",
            rating: (4.7 + Math.random() * 0.3).toFixed(1),
            walletBalance: 1500.00,
            totalEarnings: 28500.00,
          },
        },
      },
    });

    const vehicle = await prisma.vehicle.upsert({
      where: { id: `veh-${user.id}` },
      update: {},
      create: {
        id: `veh-${user.id}`,
        ownerId: user.id,
        regNumber: d.reg,
        modelName: d.vehicle,
        vehicleType: "SUV",
        capacity: 6,
        isActive: true,
      },
    });

    driverUsers.push(user);
    vehicles.push(vehicle);
  }
  console.log(`✅ ${driverUsers.length} Driver Partners & Vehicles seeded.`);

  // 6. Seed Passengers
  const passengerData = [
    { name: "Ananya Roy", phone: "9123456780", email: "ananya@example.com" },
    { name: "Priya Tripathi", phone: "9123456781", email: "priya@example.com" },
    { name: "Karan Gupta", phone: "9123456782", email: "karan@example.com" },
    { name: "Neha Mishra", phone: "9123456783", email: "neha@example.com" },
    { name: "Rohan Kapoor", phone: "9123456784", email: "rohan@example.com" },
  ];

  const passengerUsers: User[] = [];
  for (const p of passengerData) {
    const user = await prisma.user.upsert({
      where: { phone: p.phone },
      update: { email: p.phone === "9123456780" ? "passenger@goayodhya.com" : p.email, passwordHash: passengerPasswordHash, isActive: true },
      create: {
        name: p.name,
        email: p.phone === "9123456780" ? "passenger@goayodhya.com" : p.email,
        phone: p.phone,
        passwordHash: passengerPasswordHash,
        role: "CUSTOMER",
        passengerProfile: {
          create: { fullName: p.name, totalTrips: 5, isVip: true },
        },
      },
    });
    passengerUsers.push(user);
  }
  console.log(`✅ ${passengerUsers.length} Passenger Users seeded.`);

  // 7. Seed Trips for the Next 180 Days (6 Months!)
  console.log("⏳ Generating 180 Days of Scheduled Trips across routes...");

  const routes = [
    { source: locations["Lucknow (Alambagh Bus Stand)"], dest: locations["Ayodhya (Dham Terminal)"], price: 300 },
    { source: locations["Ayodhya (Dham Terminal)"], dest: locations["Lucknow (Alambagh Bus Stand)"], price: 300 },
    { source: locations["Lucknow (Alambagh Bus Stand)"], dest: locations["Varanasi (Cantt Station)"], price: 600 },
    { source: locations["Varanasi (Cantt Station)"], dest: locations["Lucknow (Alambagh Bus Stand)"], price: 600 },
    { source: locations["Ayodhya (Dham Terminal)"], dest: locations["Gorakhpur (Express Hub)"], price: 450 },
    { source: locations["Gorakhpur (Express Hub)"], dest: locations["Ayodhya (Dham Terminal)"], price: 450 },
  ];

  const timeSlots = [
    { hour: 7, minute: 0 },   // 7:00 AM
    { hour: 11, minute: 30 }, // 11:30 AM
    { hour: 16, minute: 0 },  // 4:00 PM
    { hour: 19, minute: 30 }, // 7:30 PM
  ];

  let tripSequenceCounter = 1;
  const now = new Date();
  const seatsData = [
    { seatNumber: "F1", seatType: "FRONT" },
    { seatNumber: "M1", seatType: "MIDDLE" },
    { seatNumber: "M2", seatType: "MIDDLE" },
    { seatNumber: "M3", seatType: "MIDDLE" },
    { seatNumber: "B1", seatType: "BACK" },
    { seatNumber: "B2", seatType: "BACK" },
  ];

  let totalTripsCreated = 0;

  for (let dayOffset = 0; dayOffset < 180; dayOffset++) {
    const tripDate = new Date(now);
    tripDate.setDate(now.getDate() + dayOffset);

    // Pick 2-3 routes per day
    for (let rIdx = 0; rIdx < routes.length; rIdx++) {
      if ((dayOffset + rIdx) % 2 === 0) {
        const route = routes[rIdx];
        const slot = timeSlots[(dayOffset + rIdx) % timeSlots.length];
        const driver = driverUsers[rIdx % driverUsers.length];
        const vehicle = vehicles[rIdx % vehicles.length];

        const startTime = new Date(tripDate);
        startTime.setHours(slot.hour, slot.minute, 0, 0);

        const trip = await prisma.trip.create({
          data: {
            vehicleId: vehicle.id,
            driverId: driver.id,
            sourceId: route.source.id,
            destinationId: route.dest.id,
            startTime,
            status: "SCHEDULED",
            totalFare: route.price,
            tripSequence: tripSequenceCounter++,
            seats: {
              create: seatsData.map((s) => ({
                seatNumber: s.seatNumber,
                 seatType: s.seatType as SeatType,
                price: route.price,
                status: "AVAILABLE",
              })),
            },
          },
        });

        totalTripsCreated++;
      }
    }
  }

  console.log(`🎉 Successfully Seeded ${totalTripsCreated} Shuttle Trips spanning the next 6 Months!`);
  console.log("\n🔑 Test Accounts Available:");
  console.log("   • Admin:     phone: 9999999999 / pass: admin123");
  console.log("   • Driver:    phone: 9876543210 / pass: driver123");
  console.log("   • Passenger: phone: 9123456780 / pass: pass123");
}

main()
  .catch((e) => {
    console.error("❌ Seed Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
