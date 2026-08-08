-- Add missing query indexes for performance

-- Vehicle lookups by owner
CREATE INDEX IF NOT EXISTS "vehicles_owner_id_idx" ON "vehicles"("owner_id");

-- Trip lookups by driver, vehicle, locations, and start time
CREATE INDEX IF NOT EXISTS "trips_driver_id_idx" ON "trips"("driver_id");
CREATE INDEX IF NOT EXISTS "trips_vehicle_id_idx" ON "trips"("vehicle_id");
CREATE INDEX IF NOT EXISTS "trips_source_id_idx" ON "trips"("source_id");
CREATE INDEX IF NOT EXISTS "trips_dest_id_idx" ON "trips"("dest_id");
CREATE INDEX IF NOT EXISTS "trips_start_time_idx" ON "trips"("start_time");

-- TripSeat lookups by the user who locked/booked the seat
CREATE INDEX IF NOT EXISTS "trip_seats_booked_by_user_id_idx" ON "trip_seats"("booked_by_user_id");

-- Notification queue for a user
CREATE INDEX IF NOT EXISTS "notifications_user_id_is_read_created_at_idx" ON "notifications"("user_id", "is_read", "created_at");

-- Review lookups
CREATE INDEX IF NOT EXISTS "reviews_passenger_id_idx" ON "reviews"("passenger_id");
CREATE INDEX IF NOT EXISTS "reviews_driver_id_idx" ON "reviews"("driver_id");

-- Complaint lookups
CREATE INDEX IF NOT EXISTS "complaints_user_id_idx" ON "complaints"("user_id");
CREATE INDEX IF NOT EXISTS "complaints_booking_id_idx" ON "complaints"("booking_id");

-- Activity log feed for a user
CREATE INDEX IF NOT EXISTS "activity_logs_user_id_created_at_idx" ON "activity_logs"("user_id", "created_at");