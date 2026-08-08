CREATE TABLE "vehicle_seat_templates" (
  "id" TEXT NOT NULL,
  "vehicle_id" TEXT NOT NULL,
  "seat_number" TEXT NOT NULL,
  "seat_type" "SeatType" NOT NULL,
  "base_price" DECIMAL(65,30) NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "vehicle_seat_templates_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "trip_seats" ADD COLUMN "base_price" DECIMAL(65,30);

CREATE UNIQUE INDEX "vehicle_seat_templates_vehicle_id_seat_number_key" ON "vehicle_seat_templates"("vehicle_id", "seat_number");
CREATE INDEX "vehicle_seat_templates_vehicle_id_is_active_idx" ON "vehicle_seat_templates"("vehicle_id", "is_active");
ALTER TABLE "vehicle_seat_templates" ADD CONSTRAINT "vehicle_seat_templates_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "vehicle_seat_templates" ("id", "vehicle_id", "seat_number", "seat_type", "base_price", "is_active", "created_at", "updated_at")
SELECT md5(v."id" || ':F1'), v."id", 'F1', 'FRONT'::"SeatType", 250, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM "vehicles" v
UNION ALL
SELECT md5(v."id" || ':M1'), v."id", 'M1', 'MIDDLE'::"SeatType", 250, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM "vehicles" v
UNION ALL
SELECT md5(v."id" || ':M2'), v."id", 'M2', 'MIDDLE'::"SeatType", 250, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM "vehicles" v
UNION ALL
SELECT md5(v."id" || ':M3'), v."id", 'M3', 'MIDDLE'::"SeatType", 250, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM "vehicles" v
UNION ALL
SELECT md5(v."id" || ':B1'), v."id", 'B1', 'BACK'::"SeatType", 250, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM "vehicles" v
UNION ALL
SELECT md5(v."id" || ':B2'), v."id", 'B2', 'BACK'::"SeatType", 250, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM "vehicles" v;

UPDATE "trip_seats" SET "base_price" = "price" WHERE "base_price" IS NULL;
