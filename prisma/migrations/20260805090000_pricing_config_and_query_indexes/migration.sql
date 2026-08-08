ALTER TABLE "pricing_configs" ADD COLUMN "config_key" TEXT;

UPDATE "pricing_configs"
SET "config_key" = 'default'
WHERE "id" = (
  SELECT "id"
  FROM "pricing_configs"
  ORDER BY "id"
  LIMIT 1
);

UPDATE "pricing_configs"
SET "config_key" = 'legacy-' || "id"
WHERE "config_key" IS NULL;

ALTER TABLE "pricing_configs" ALTER COLUMN "config_key" SET DEFAULT 'default';
ALTER TABLE "pricing_configs" ALTER COLUMN "config_key" SET NOT NULL;
CREATE UNIQUE INDEX "pricing_configs_config_key_key" ON "pricing_configs"("config_key");

CREATE INDEX "wallet_transactions_driver_id_created_at_id_idx"
  ON "wallet_transactions"("driver_id", "created_at", "id");

CREATE INDEX "trips_status_manifest_locked_is_cancelled_start_time_id_idx"
  ON "trips"("status", "manifest_locked", "is_cancelled", "start_time", "id");
