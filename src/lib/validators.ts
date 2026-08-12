import { z } from "zod";

export const phoneSchema = z
  .string()
  .min(10, "Phone must be at least 10 digits")
  .max(15, "Phone too long")
  .regex(/^\+?\d+$/, "Phone must contain only digits");

export const passwordSchema = z
  .string()
  .min(6, "Password must be at least 6 characters")
  .max(100, "Password too long");

export const nameSchema = z
  .string()
  .min(2, "Name too short")
  .max(100, "Name too long");

export const seatNumberSchema = z
  .string()
  .regex(/^[FMB][0-9]{1,2}$/, "Invalid seat number (e.g., F1, M2, B3)");

export const paymentModeSchema = z.enum(["CASH", "ONLINE"]);

export const roleSchema = z.enum(["CUSTOMER", "DRIVER"]);

export const bookingStatusSchema = z.enum([
  "PENDING",
  "CONFIRMED",
  "CANCELLED",
  "COMPLETED",
  "NO_SHOW",
]);

export const tripStatusSchema = z.enum([
  "PENDING_APPROVAL",
  "SCHEDULED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
  "REJECTED",
]);

export const approvalStatusSchema = z.enum([
  "PENDING",
  "APPROVED",
  "REJECTED",
]);

export const approveTripRequestSchema = z.object({
  tripId: z.string().uuid("Invalid trip ID"),
  driverId: z.string().uuid("Invalid driver ID").optional(),
  vehicleId: z.string().uuid("Invalid vehicle ID").optional(),
});

export const rejectTripRequestSchema = z.object({
  tripId: z.string().uuid("Invalid trip ID"),
  reason: z.string().trim().min(3, "Rejection reason must be at least 3 characters").max(500, "Reason too long"),
});

export const emailSchema = z
  .string()
  .email("Invalid email address")
  .max(255, "Email too long");

export const credentialSchema = z.union([phoneSchema, emailSchema]);

export const loginSchema = z.object({
  credential: credentialSchema,
  password: passwordSchema,
});

export const registerSchema = z.object({
  name: nameSchema,
  phone: phoneSchema,
  email: emailSchema.optional(),
  password: passwordSchema,
  role: roleSchema,
});

export const publicRegisterSchema = z.object({
  name: nameSchema,
  phone: phoneSchema,
  email: emailSchema.optional(),
  password: passwordSchema,
}).strict();

export const jsonLoginSchema = z.object({
  emailOrPhone: credentialSchema,
  password: passwordSchema,
}).strict();

// ============================================================
// DOMAIN FIELD SCHEMAS
// ============================================================

export const vehicleRegNumberSchema = z
  .string()
  .trim()
  .transform((val) => val.toUpperCase().replace(/\s+/g, ""))
  .pipe(
    z
      .string()
      .regex(
        /^[A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{4}$/,
        "Invalid registration number format. Example: UP32AB1234"
      )
  );

export const vehicleCapacitySchema = z.coerce
  .number()
  .int("Capacity must be a whole number")
  .min(4, "Vehicle capacity must be between 4 and 20 seats")
  .max(20, "Vehicle capacity must be between 4 and 20 seats");

export const aadhaarNumberSchema = z
  .string()
  .trim()
  .regex(/^\d{12}$/, "Aadhaar number must be exactly 12 digits");

export const licenseNumberSchema = z
  .string()
  .trim()
  .min(5, "License number must be at least 5 characters")
  .max(50, "License number cannot exceed 50 characters");

export const locationNameSchema = z
  .string()
  .trim()
  .min(2, "Location name must be at least 2 characters")
  .max(100, "Location name cannot exceed 100 characters");

export const baseFareSchema = z.coerce
  .number()
  .finite("Base fare must be a valid number")
  .positive("Base fare must be a positive number")
  .max(10000, "Base fare is unreasonably high");

export const vehicleSeatTemplateSchema = z.object({
  seatNumber: seatNumberSchema,
  seatType: z.enum(["FRONT", "MIDDLE", "BACK"]),
  basePrice: baseFareSchema,
  isActive: z.boolean().default(true),
});

export const vehicleSeatTemplatesSchema = z.object({
  vehicleId: z.string().uuid("Invalid vehicle ID"),
  seats: z.array(vehicleSeatTemplateSchema).min(1).max(20),
}).superRefine((value, ctx) => {
  const numbers = value.seats.map((seat) => seat.seatNumber);
  if (new Set(numbers).size !== numbers.length) {
    ctx.addIssue({ code: "custom", path: ["seats"], message: "Seat numbers must be unique." });
  }
});

export const vehicleSeatPriceSchema = z.object({
  vehicleId: z.string().uuid("Invalid vehicle ID"),
  seatNumber: seatNumberSchema,
  basePrice: baseFareSchema,
});

export const guestAgeSchema = z.coerce
  .number()
  .int("Age must be a whole number")
  .min(1, "Age must be at least 1")
  .max(120, "Age cannot exceed 120");

export const guestGenderSchema = z.enum(["Male", "Female", "Other"]);

export const utrNumberSchema = z
  .string()
  .trim()
  .regex(
    /^[A-Za-z0-9]{4,50}$/,
    "UTR number must be between 4 and 50 alphanumeric characters"
  );

// ============================================================
// ENTITY & ACTION SCHEMAS
// ============================================================

export const vehicleSchema = z.object({
  regNumber: vehicleRegNumberSchema,
  modelName: z.string().trim().min(1, "Model name required").max(100).default("Maruti Ertiga"),
  vehicleType: z.string().trim().min(1, "Vehicle type required").max(50).default("SUV"),
  capacity: vehicleCapacitySchema.default(6),
  fuelType: z.string().trim().default("CNG"),
  regDate: z.string().optional().or(z.literal("")),
  insuranceNumber: z.string().optional().or(z.literal("")),
  insuranceExpiryDate: z.string().optional().or(z.literal("")),
});

export const updateVehicleSchema = z.object({
  vehicleId: z.string().uuid("Invalid vehicle ID"),
  regNumber: vehicleRegNumberSchema.optional(),
  modelName: z.string().trim().min(1).max(100).optional(),
  vehicleType: z.string().trim().min(1).max(50).optional(),
  capacity: vehicleCapacitySchema.optional(),
  fuelType: z.string().trim().optional(),
  regDate: z.string().optional().or(z.literal("")),
  insuranceNumber: z.string().optional().or(z.literal("")),
  insuranceExpiryDate: z.string().optional().or(z.literal("")),
  isActive: z.coerce.boolean().optional(),
});

export const locationSchema = z.object({
  name: locationNameSchema,
  baseFare: baseFareSchema.optional(),
});

export const driverKycSchema = z.object({
  fullName: nameSchema,
  aadhaarNumber: aadhaarNumberSchema,
  licenseNumber: licenseNumberSchema,
});

export const updateDriverKycSchema = z.object({
  driverUserId: z.string().uuid("Invalid driver user ID"),
  fullName: nameSchema.optional(),
  aadhaarNumber: aadhaarNumberSchema.optional().or(z.literal("")),
  licenseNumber: licenseNumberSchema.optional().or(z.literal("")),
  kycStatus: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
});

export const tripSchedulingSchema = z
  .object({
    vehicleId: z.string().uuid("Invalid vehicle selection"),
    sourceId: z.string().uuid("Invalid source location"),
    destinationId: z.string().uuid("Invalid destination location"),
    driverId: z.string().uuid("Invalid driver ID").optional().or(z.literal("")),
    startTime: z.string().refine(
      (val) => {
        const d = new Date(val);
        return !isNaN(d.getTime()) && d.getTime() > Date.now();
      },
      { message: "Trip departure time must be in the future" }
    ),
  })
  .refine((data) => data.sourceId !== data.destinationId, {
    message: "Source and destination cannot be the same",
    path: ["destinationId"],
  });

export const createTripSchema = tripSchedulingSchema;

export const bookSeatSchema = z.object({
  tripId: z.string().uuid(),
  seatNumber: seatNumberSchema,
  paymentMode: paymentModeSchema,
});

export const offlineBookSchema = z.object({
  tripId: z.string().uuid("Invalid trip ID"),
  seatNumber: z.string().optional(),
  guestName: nameSchema,
  guestPhone: phoneSchema,
  guestAge: guestAgeSchema.optional(),
  guestGender: guestGenderSchema.optional(),
  paymentCollected: z.boolean().default(false),
  paymentMode: paymentModeSchema.default("CASH"),
});

export const confirmPaymentSchema = z.object({
  bookingId: z.string().uuid(),
});

export const cancelBookingSchema = z.object({
  bookingId: z.string().uuid(),
  reason: z.string().max(500).optional(),
});

export const submitPaymentProofSchema = z.object({
  bookingId: z.string().uuid("Invalid booking ID"),
  utrNumber: utrNumberSchema,
  screenshotUrl: z.string().max(500, "Screenshot URL or path too long").optional().or(z.literal("")),
});

export const verifyPaymentProofSchema = z.object({
  pvId: z.string().uuid("Invalid verification ID"),
  bookingId: z.string().uuid("Invalid booking ID"),
});

export const rejectPaymentProofSchema = z.object({
  pvId: z.string().uuid("Invalid verification ID"),
  reason: z.string().max(500, "Reason too long").optional(),
});

export const settleDriverSchema = z.object({
  settlementId: z.string().uuid("Invalid settlement ID"),
});

export const reviewSchema = z.object({
  bookingId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  driverRating: z.number().int().min(1).max(5).optional(),
  comment: z.string().max(500).optional(),
});

export const complaintSchema = z.object({
  bookingId: z.string().uuid().optional(),
  category: z.string().min(1),
  subject: z.string().min(1).max(200),
  message: z.string().min(1).max(2000),
});

export const completeTripSchema = z.object({
  tripId: z.string().uuid("Invalid trip ID"),
});

export const cancelTripSchema = z.object({
  tripId: z.string().uuid("Invalid trip ID"),
  reason: z.string().max(500).optional(),
});



