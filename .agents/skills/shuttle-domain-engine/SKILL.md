---
name: shuttle-domain-engine
description: Domain engine rules and best practices for GoShuttles concurrency, seat locking, surge pricing, driver wallet settlements, and ticket issuance.
---

# GoShuttles Domain Engine Skill

This skill provides domain rules, invariant requirements, and concurrency strategies for the GoShuttles daily shuttle platform.

## Key Domain Rules & Invariants

1. **Seat Locking & Concurrency Guard**:
   - Seat locks expire after `seatLockTimeout` (default: 5 minutes).
   - Seat state transitions: `AVAILABLE` -> `LOCKED` -> `BOOKED` (or auto-release back to `AVAILABLE`).
   - All seat lock and booking attempts MUST use atomic database updates (`updateMany` with conditions or strict Prisma `$transaction`).
   - Avoid TOCTOU (Time-Of-Check To Time-Of-Use) race conditions by checking `status` and `lockedAt` atomically inside the transaction.

2. **Trip Manifest & Start Requirements**:
   - A trip cannot be started unless `100% occupancy` is met, OR an Admin explicitly approves an `adminOverrideStart`.
   - Before departure (`status = IN_PROGRESS`), `manifestLocked` must be set to `true`.
   - No new bookings or seat locks are allowed once `manifestLocked` is `true`.

3. **Dynamic Surge Pricing & Commission Calculation**:
   - Dynamic price calculation accounts for base seat fare, route multiplier, demand surge multiplier when route occupancy exceeds `occupancyThreshold` (default: 60%).
   - Commission is deducted at fixed percentage (`commissionRate`, default: 5%).
   - Driver earnings = `totalFare - commissionAmount`.

4. **Driver Wallet & Settlement Engine**:
   - Cash collected by drivers for offline or cash bookings creates a debit on cash collected and credits total earnings.
   - Wallet transactions track `TRIP_EARNING`, `CASH_COLLECTION`, `SETTLEMENT`, and `ADJUSTMENT`.
   - Settlement logic computes `totalCashCollected` vs `commissionDue` for driver payout periods.

5. **Ticket QR Code & Passenger Verification**:
   - Tickets are issued upon payment confirmation or upfront offline booking.
   - Unique ticket numbers follow `TKT-YYYYMMDD-XXXXXX`.
   - Drivers can scan passenger QR code or verify ticket status (`ISSUED` -> `USED`).
