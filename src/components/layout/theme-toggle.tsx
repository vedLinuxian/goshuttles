"use client";

import { useTheme } from "@/components/theme/theme-provider";
import { Sun, Moon } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  // Read theme directly from DOM to avoid next-themes hydration delay
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    setMounted(true);
    // Read actual DOM state — the most reliable source of truth
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  // Keep isDark in sync when theme changes from elsewhere
  useEffect(() => {
    if (!mounted) return;
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, [mounted]);

  const toggle = () => {
    const next = isDark ? "light" : "dark";
    setTheme(next);
    // Optimistically update local state — don't wait for next-themes re-render
    setIsDark(!isDark);
  };

  return (
    <button
      type="button"
      aria-label={!mounted ? "Switch theme mode" : `Switch to ${isDark ? "light" : "dark"} mode`}
      onClick={toggle}
      style={{ touchAction: "manipulation" }}
      className="flex h-11 w-11 select-none items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--muted)]/50 text-[var(--foreground)] shadow-sm active:scale-95 transition-transform"
    >
      {!mounted ? null : isDark ? (
        <Sun className="h-4 w-4 text-amber-400" aria-hidden />
      ) : (
        <Moon className="h-4 w-4 text-indigo-600" aria-hidden />
      )}
    </button>
  );
}
