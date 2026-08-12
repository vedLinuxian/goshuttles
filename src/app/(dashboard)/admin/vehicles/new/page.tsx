import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { RegisterVehicleFormClient } from "./register-vehicle-form-client";

export default async function RegisterVehiclePage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login");

  return <RegisterVehicleFormClient />;
}
