-- PostgreSQL Row Level Security (RLS) Policies for GoShuttles

-- 1. Enable RLS on core entities
ALTER TABLE IF EXISTS "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "passenger_profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "driver_profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "bookings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "tickets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "wallet_transactions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "trip_seats" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "payment_verifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "activity_logs" ENABLE ROW LEVEL SECURITY;

-- 2. Create Security Policies (Bypass for app db user / strict role checks)
-- Users policy: users can read their own profile
CREATE POLICY IF NOT EXISTS user_self_access ON "users"
  FOR ALL
  USING (id = current_setting('app.current_user_id', true) OR current_setting('app.current_user_role', true) = 'ADMIN');

-- Bookings policy: passengers read their own bookings, drivers read bookings on assigned trips, admin reads all
CREATE POLICY IF NOT EXISTS booking_isolation ON "bookings"
  FOR ALL
  USING (
    user_id = current_setting('app.current_user_id', true)
    OR current_setting('app.current_user_role', true) = 'ADMIN'
    OR current_setting('app.current_user_role', true) = 'DRIVER'
  );

-- Tickets policy: passengers read their own issued tickets
CREATE POLICY IF NOT EXISTS ticket_isolation ON "tickets"
  FOR ALL
  USING (
    booking_id IN (
      SELECT id FROM "bookings" WHERE user_id = current_setting('app.current_user_id', true)
    )
    OR current_setting('app.current_user_role', true) = 'ADMIN'
    OR current_setting('app.current_user_role', true) = 'DRIVER'
  );
