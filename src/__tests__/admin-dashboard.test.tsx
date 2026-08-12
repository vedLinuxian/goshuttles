import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UsersClient } from '@/app/(dashboard)/admin/users/users-client';
import { LocationsClient } from '@/app/(dashboard)/admin/locations/locations-client';

// Mock Next.js router
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => "/admin/users",
  useSearchParams: () => new URLSearchParams(),
}));

// Mock server actions
vi.mock("@/app/actions/user-actions", () => ({
  updateUserRole: vi.fn().mockResolvedValue({ success: true }),
  toggleUserActiveStatus: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock("@/app/actions/location-actions", () => ({
  createLocation: vi.fn().mockResolvedValue({ success: true }),
  updateLocation: vi.fn().mockResolvedValue({ success: true }),
  deleteLocation: vi.fn().mockResolvedValue({ success: true }),
  savePricingConfigAction: vi.fn().mockResolvedValue({ success: true }),
}));

// Provide Next.js Link component mock
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode, href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe('Admin Dashboard - Users Management', () => {
  const mockUsers = [
    {
      id: "user-1",
      name: "Alice Admin",
      email: "alice@example.com",
      phone: "1234567890",
      role: "ADMIN" as const,
      isActive: true,
      createdAt: new Date("2024-01-01"),
      _count: { bookings: 0, assignedTrips: 0, vehicles: 0 },
    },
    {
      id: "user-2",
      name: "Bob Driver",
      email: "bob@example.com",
      phone: "0987654321",
      role: "DRIVER" as const,
      isActive: false,
      createdAt: new Date("2024-01-02"),
      _count: { bookings: 0, assignedTrips: 5, vehicles: 1 },
    }
  ];

  const mockStats = { adminCount: 1, driverCount: 1, customerCount: 0, totalUsers: 2 };

  it('renders the users table and stats', () => {
    render(
      <UsersClient
        users={mockUsers}
        page={1}
        totalPages={1}
        totalCount={2}
        pageSize={10}
        roleFilter=""
        stats={mockStats}
        currentUserId="admin-id"
      />
    );

    expect(screen.getAllByText('Alice Admin')[0]).toBeDefined();
    expect(screen.getAllByText('Bob Driver')[0]).toBeDefined();
    expect(screen.getAllByText('2')[0]).toBeDefined(); // Total users stat
  });

  it('opens role change modal when select is changed', async () => {
    render(
      <UsersClient
        users={mockUsers}
        page={1}
        totalPages={1}
        totalCount={2}
        pageSize={10}
        roleFilter=""
        stats={mockStats}
        currentUserId="admin-id"
      />
    );

    // Get the select for Bob Driver
    const selects = screen.getAllByRole('combobox');
    
    // We expect the first select for the search bar, then the selects for users
    // Actually the user role select is rendered.
    // The role filter select is also there.
    
    // Find the select associated with Bob Driver (DRIVER role)
    // There might be a mobile view and desktop view, so let's find by specific text or select value
    const driverSelects = screen.getAllByDisplayValue('DRIVER');
    
    fireEvent.change(driverSelects[0], { target: { value: 'CUSTOMER' } });

    // Modal should appear
    expect(screen.getByText('Change User Role')).toBeDefined();
    expect(screen.getAllByText(/Bob Driver/)[0]).toBeDefined();
    
    const updateButton = screen.getByRole('button', { name: 'Update Role' });
    expect(updateButton).toBeDefined();
  });
});

describe('Admin Dashboard - Locations Management', () => {
  const mockLocations = [
    {
      id: "loc-1",
      name: "City A",
      activeTripsFrom: 5,
      activeTripsTo: 3,
      totalTripsCount: 10,
    }
  ];

  const mockPricingConfig = {
    id: "config-1",
    surgeMultiplier: 1.5,
    occupancyThreshold: 0.8,
    commissionRate: 10,
    surgeEnabled: true,
    seatLockTimeout: 5,
  };

  it('renders the locations table and pricing config', () => {
    render(
      <LocationsClient
        locations={mockLocations}
        pricingConfig={mockPricingConfig}
        page={1}
        totalPages={1}
        totalCount={1}
        pageSize={10}
      />
    );

    expect(screen.getAllByText('City A')[0]).toBeDefined();
    expect(screen.getByDisplayValue('1.5')).toBeDefined(); // Surge Multiplier
    expect(screen.getByDisplayValue('0.8')).toBeDefined(); // Occupancy Threshold

  });

  it('calculates simulated fare correctly', async () => {
    render(
      <LocationsClient
        locations={mockLocations}
        pricingConfig={mockPricingConfig}
        page={1}
        totalPages={1}
        totalCount={1}
        pageSize={10}
      />
    );

    const baseFareInputs = screen.getAllByDisplayValue('300'); // Default base fare
    const baseFareInput = baseFareInputs[0];
    
    // Changing occupancy to 85% to trigger surge (threshold is 0.8 / 80%)
    const occupancyInputs = screen.getAllByDisplayValue('75'); // Default occupancy
    fireEvent.change(occupancyInputs[0], { target: { value: '85' } });

    // Original base is 300, multiplier is 1.5. 300 * 1.5 = 450
    // It should render 450
    await waitFor(() => {
      expect(screen.getByText('₹450')).toBeDefined();
    });
  });
});
