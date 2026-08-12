import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { AssignVehicleClient } from "./assign-client";

export interface DriverSerialized {
  id: string;
  name: string | null;
  email: string | null;
  phone: string;
  isActive: boolean;
  driverProfile: {
    kycStatus: string;
    isAvailable: boolean;
    rating: number;
  } | null;
  vehicles: {
    id: string;
    regNumber: string;
    modelName: string;
    vehicleType: string;
    capacity: number;
    fuelType: string;
    isActive: boolean;
  }[];
  activeTripCount: number;
}

export interface VehicleSerialized {
  id: string;
  regNumber: string;
  modelName: string;
  vehicleType: string;
  capacity: number;
  fuelType: string;
  isActive: boolean;
  ownerId: string;
  owner: {
    id: string;
    name: string | null;
    phone: string;
    role: string;
  } | null;
  activeTripCount: number;
}

export default async function AssignVehiclePage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login");

  const [drivers, vehicles] = await Promise.all([
    db.user.findMany({
      where: { role: "DRIVER", isActive: true },
      include: {
        driverProfile: { select: { kycStatus: true, isAvailable: true, rating: true } },
        vehicles: {
          select: {
            id: true,
            regNumber: true,
            modelName: true,
            vehicleType: true,
            capacity: true,
            fuelType: true,
            isActive: true,
          },
        },
        _count: {
          select: {
            assignedTrips: {
              where: { status: { in: ["SCHEDULED", "IN_PROGRESS"] } },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    }),
    db.vehicle.findMany({
      where: { isActive: true },
      include: {
        owner: { select: { id: true, name: true, phone: true, role: true } },
        _count: {
          select: {
            trips: {
              where: { status: { in: ["SCHEDULED", "IN_PROGRESS"] } },
            },
          },
        },
      },
      orderBy: { regNumber: "asc" },
    }),
  ]);

  const serializedDrivers: DriverSerialized[] = drivers.map((driver) => ({
    id: driver.id,
    name: driver.name,
    email: driver.email,
    phone: driver.phone,
    isActive: driver.isActive,
    driverProfile: driver.driverProfile
      ? {
          kycStatus: driver.driverProfile.kycStatus,
          isAvailable: driver.driverProfile.isAvailable,
          rating: driver.driverProfile.rating ? Number(driver.driverProfile.rating) : 5.0,
        }
      : null,
    vehicles: driver.vehicles.map((v) => ({
      id: v.id,
      regNumber: v.regNumber,
      modelName: v.modelName,
      vehicleType: v.vehicleType,
      capacity: v.capacity,
      fuelType: v.fuelType,
      isActive: v.isActive,
    })),
    activeTripCount: driver._count.assignedTrips,
  }));

  const serializedVehicles: VehicleSerialized[] = vehicles.map((vehicle) => ({
    id: vehicle.id,
    regNumber: vehicle.regNumber,
    modelName: vehicle.modelName,
    vehicleType: vehicle.vehicleType,
    capacity: vehicle.capacity,
    fuelType: vehicle.fuelType,
    isActive: vehicle.isActive,
    ownerId: vehicle.ownerId,
    owner: vehicle.owner
      ? {
          id: vehicle.owner.id,
          name: vehicle.owner.name,
          phone: vehicle.owner.phone,
          role: vehicle.owner.role,
        }
      : null,
    activeTripCount: vehicle._count.trips,
  }));

  return <AssignVehicleClient drivers={serializedDrivers} vehicles={serializedVehicles} />;
}

