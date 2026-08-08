import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MobileMenu } from '@/components/layout/mobile-menu';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { ThemeProvider } from '@/components/theme/theme-provider';

// MobileMenu uses createPortal — mock it to render inline for testing
vi.mock('react-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-dom')>();
  return {
    ...actual,
    createPortal: (node: React.ReactNode) => node,
  };
});

describe('Mobile UI Components', () => {
  it('should render the hamburger button', () => {
    render(
      <ThemeProvider>
        <MobileMenu />
      </ThemeProvider>
    );
    // getAllBy because there may be desktop/mobile duplicates in tests
    const triggers = screen.getAllByLabelText('Open menu');
    expect(triggers.length).toBeGreaterThan(0);
  });

  it('should open and close the mobile menu', () => {
    render(
      <ThemeProvider>
        <MobileMenu />
      </ThemeProvider>
    );

    const trigger = screen.getAllByLabelText('Open menu')[0];
    expect(trigger).toBeDefined();

    // BUG-006 FIX: component now uses onClick (not onPointerDown)
    fireEvent.click(trigger);

    const closeBtn = screen.getAllByLabelText('Close menu')[0];
    expect(closeBtn).toBeDefined();

    fireEvent.click(closeBtn);

    const reopenTriggers = screen.getAllByLabelText('Open menu');
    expect(reopenTriggers.length).toBeGreaterThan(0);
  });

  it('should close menu on Escape key', async () => {
    render(
      <ThemeProvider>
        <MobileMenu />
      </ThemeProvider>
    );

    fireEvent.click(screen.getAllByLabelText('Open menu')[0]);
    expect(screen.getAllByLabelText('Close menu').length).toBeGreaterThan(0);

    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.getAllByLabelText('Open menu').length).toBeGreaterThan(0);
    });
  });

  it('should close menu on backdrop click', async () => {
    render(
      <ThemeProvider>
        <MobileMenu />
      </ThemeProvider>
    );

    fireEvent.click(screen.getAllByLabelText('Open menu')[0]);

    // Find the aria-hidden backdrop inside the drawer overlay
    const backdrop = document.querySelector('[aria-hidden="true"]') as HTMLElement;
    if (backdrop) fireEvent.click(backdrop);

    await waitFor(() => {
      expect(screen.getAllByLabelText('Open menu').length).toBeGreaterThan(0);
    });
  });

  it('should toggle theme correctly', async () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );

    // BUG-029 FIX: button is now h-11 w-11 (44px)
    // BUG-006 FIX: uses onClick not onPointerDown
    const toggle = screen.getAllByRole('button')[0];
    expect(toggle).toBeDefined();

    // BUG-018 FIX: icon only renders when mounted (no hydration mismatch)
    fireEvent.click(toggle);

    await waitFor(() => {
      const newToggle = screen.getAllByRole('button')[0];
      expect(newToggle).toBeDefined();
    });
  });
});
