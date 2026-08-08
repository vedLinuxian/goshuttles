import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { StepBookingWizard } from '@/components/home/step-booking-wizard';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

const mockLocations = [
  { id: 'loc1', name: 'City A' },
  { id: 'loc2', name: 'City B' },
];

const mockInitialRides = [
  {
    id: 'trip1',
    startTime: new Date(Date.now() + 86400000).toISOString(),
    source: { id: 'loc1', name: 'City A' },
    destination: { id: 'loc2', name: 'City B' },
    availableSeats: 5,
    totalSeats: 10,
    lowestFare: 100,
    seats: [
      { id: 'seat1', seatNumber: 'F1', seatType: 'Standard', price: 100, status: 'AVAILABLE' },
      { id: 'seat2', seatNumber: 'M1', seatType: 'Standard', price: 100, status: 'BOOKED' },
    ],
  },
];

describe('StepBookingWizard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Step 1 initially', () => {
    render(
      <StepBookingWizard
        locations={mockLocations}
        initialRides={mockInitialRides}
        isLoggedIn={false}
        today={new Date().toISOString()}
        tomorrow={new Date(Date.now() + 86400000).toISOString()}
      />
    );
    expect(screen.getByText(/Select Travel Corridor/i)).toBeDefined();
  });

  it('can search for departures and move to step 2', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: mockInitialRides, total: 1, page: 1, limit: 20 }),
      })
    ) as any;

    render(
      <StepBookingWizard
        locations={mockLocations}
        initialRides={mockInitialRides}
        isLoggedIn={false}
        today={new Date().toISOString()}
        tomorrow={new Date(Date.now() + 86400000).toISOString()}
      />
    );

    const searchBtn = screen.getAllByText(/Find Departures/i)[0];
    fireEvent.click(searchBtn);

    await waitFor(() => {
      expect(screen.getAllByText(/Choose Shuttle Departure/i)[0]).toBeDefined();
    });
  });

  it('can select a trip and move to step 3', async () => {
    render(
      <StepBookingWizard
        locations={mockLocations}
        initialRides={mockInitialRides}
        isLoggedIn={false}
        today={new Date().toISOString()}
        tomorrow={new Date(Date.now() + 86400000).toISOString()}
      />
    );

    // Force to step 2 by searching
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: mockInitialRides, total: 1, page: 1, limit: 20 }),
      })
    ) as any;
    fireEvent.pointerDown(screen.getAllByText(/Find Departures/i)[0]);

    await waitFor(() => {
      expect(screen.getAllByText(/Choose Shuttle Departure/i)[0]).toBeDefined();
    });

    const tripButton = screen.getAllByText(/City A/i)[0].closest('button');
    if (tripButton) fireEvent.click(tripButton);

    const selectCabinSeatBtn = screen.getByText(/Select Cabin Seat/i);
    fireEvent.click(selectCabinSeatBtn);

    await waitFor(() => {
      expect(screen.getAllByText(/Interactive SUV Cabin Seat Map/i)[0]).toBeDefined();
    });
  });

  it('can select a seat and move to step 4', async () => {
    render(
      <StepBookingWizard
        locations={mockLocations}
        initialRides={mockInitialRides}
        isLoggedIn={true}
        today={new Date().toISOString()}
        tomorrow={new Date(Date.now() + 86400000).toISOString()}
      />
    );

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: mockInitialRides, total: 1, page: 1, limit: 20 }),
      })
    ) as any;
    fireEvent.click(screen.getAllByText(/Find Departures/i)[0]);

    await waitFor(() => screen.getAllByText(/Choose Shuttle Departure/i)[0]);
    const tripButton = screen.getAllByText(/City A/i)[0].closest('button');
    if (tripButton) fireEvent.click(tripButton);
    fireEvent.click(screen.getByText(/Select Cabin Seat/i));

    await waitFor(() => screen.getAllByText(/Interactive SUV Cabin Seat Map/i)[0]);

    // Select seat
    const seatBtn = screen.getAllByText('F1')[0].closest('button');
    if (seatBtn) fireEvent.click(seatBtn);

    const proceedBtn = screen.getByText(/Proceed to Confirm/i);
    fireEvent.click(proceedBtn);

    await waitFor(() => {
      expect(screen.getByText(/Confirm Ticket/i)).toBeDefined();
    });
  });
});
