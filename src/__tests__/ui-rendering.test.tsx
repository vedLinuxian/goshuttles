import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ThemeToggle } from "../components/layout/theme-toggle";
import { PublicHeader } from "../components/layout/public-header";
import { MobileMenu } from "../components/layout/mobile-menu";
import { ShuttleCabinPreview } from "../components/home/shuttle-cabin-preview";
import { FuturisticRouteExplorer } from "../components/home/futuristic-route-explorer";

// Auto-cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock theme provider
vi.mock("@/components/theme/theme-provider", () => ({
  useTheme: () => ({
    theme: "light",
    resolvedTheme: "light",
    setTheme: vi.fn()
  }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

// Mock BrandMark to avoid complex rendering
vi.mock("../components/layout/brand-mark", () => ({
  BrandMark: () => <div data-testid="brand-mark">BrandMark</div>
}));

describe("UI Rendering & Accessibility Tests", () => {
  describe("ThemeToggle", () => {
    it("renders without errors and has correct aria-label", () => {
      render(<ThemeToggle />);
      const btn = screen.getAllByRole("button")[0];
      expect(btn).toBeDefined();
      expect(btn.getAttribute("aria-label")).not.toBeNull();
    });
  });

  describe("PublicHeader", () => {
    it("renders header with appropriate semantic tags", () => {
      render(<PublicHeader />);
      const header = screen.getByRole("banner");
      expect(header).toBeDefined();
      const nav = screen.getByRole("navigation", { name: "Public navigation" });
      expect(nav).toBeDefined();
    });
  });

  describe("MobileMenu", () => {
    it("renders mobile menu with accessibility attributes", () => {
      render(<MobileMenu />);
      const triggerBtn = screen.getAllByRole("button")[0];
      expect(triggerBtn).toBeDefined();
      expect(triggerBtn.getAttribute("aria-expanded")).toBe("false");
      expect(triggerBtn.getAttribute("aria-haspopup")).toBe("dialog");
    });
  });

  describe("ShuttleCabinPreview", () => {
    it("renders seats with buttons and checks hardcoded dark mode colors", () => {
      render(<ShuttleCabinPreview />);
      const buttons = screen.getAllByRole("button");
      expect(buttons.length).toBeGreaterThan(0);
      
      // Verify theme-aware design system classes
      const container = buttons[0].closest('.bg-\\[var\\(--card\\)\\]');
      expect(container).not.toBeNull();
    });
  });

  describe("FuturisticRouteExplorer", () => {
    it("renders route tabs", () => {
      render(<FuturisticRouteExplorer />);
      const tabs = screen.getAllByRole("button");
      expect(tabs.length).toBeGreaterThan(0);
    });
  });
});
