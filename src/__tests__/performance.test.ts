import { describe, it, expect, vi } from 'vitest';
import { db } from '@/lib/db';
import { cancelTrip } from '@/lib/trip-service';
import HomePage from '@/app/page';

vi.mock('@/lib/db', () => ({
  db: {
    trip: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    location: {
      findMany: vi.fn(),
    },
    $transaction: vi.fn((cb) => cb({
      trip: { findUnique: vi.fn(), update: vi.fn() },
      booking: { updateMany: vi.fn() },
      tripSeat: { updateMany: vi.fn() },
      ticket: { updateMany: vi.fn() },
      walletTransaction: { findMany: vi.fn().mockResolvedValue([]), create: vi.fn() },
      driverProfile: { updateMany: vi.fn() }
    }))
  }
}));

vi.mock('@/auth', () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: 'user-1' } })
}));

describe('Performance Tests', () => {
  it('HomePage fetches data efficiently', async () => {
    (db.location.findMany as any).mockResolvedValue([{ id: '1', name: 'Lucknow' }]);
    (db.trip.findMany as any).mockResolvedValue([]);
    
    // Test data fetching correctness
    const page = await HomePage();
    
    expect(db.location.findMany).toHaveBeenCalled();
    expect(db.trip.findMany).toHaveBeenCalled();
    expect(page).toBeDefined();
  });
  
  it('cancels trip and checks for N+1 query vulnerability', async () => {
    // In actual implementation this would use a real or deeply mocked DB 
    // to verify query counts, but we're just checking the function handles it.
    
    // We mock the transaction callback
    const mockTx = {
      trip: { 
        findUnique: vi.fn().mockResolvedValue({
          id: 'trip-1',
          status: 'SCHEDULED',
          driverId: 'driver-1',
          bookings: [
            { id: 'b1', seatId: 's1', status: 'CONFIRMED', paymentStatus: 'COLLECTED', totalAmount: 500, commissionAmount: 50 },
            { id: 'b2', seatId: 's2', status: 'CONFIRMED', paymentStatus: 'COLLECTED', totalAmount: 500, commissionAmount: 50 }
          ]
        }),
        update: vi.fn().mockResolvedValue({ id: 'trip-1', status: 'CANCELLED' })
      },
      booking: { updateMany: vi.fn() },
      tripSeat: { updateMany: vi.fn() },
      ticket: { updateMany: vi.fn() },
      walletTransaction: { 
        findMany: vi.fn().mockResolvedValue([]), 
        create: vi.fn(),
        createMany: vi.fn().mockResolvedValue({ count: 2 })
      },
      driverProfile: { updateMany: vi.fn() }
    };

    (db.$transaction as any).mockImplementation((cb: any) => cb(mockTx));
    
    await cancelTrip('trip-1');
    
    // BUG-022 FIX verification: after the fix, createMany is called ONCE (not N times in a loop)
    expect(mockTx.walletTransaction.createMany).toHaveBeenCalledTimes(1);
    expect(mockTx.walletTransaction.create).not.toHaveBeenCalled();
  });
});
