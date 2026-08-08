"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Menu, X, ArrowRight, Sun, Moon } from "lucide-react";
import { useTheme } from "@/components/theme/theme-provider";
import { BrandMark } from "./brand-mark";

const links = [
  { label: "Departures", href: "/#booking-wizard", desc: "Select corridor & lock seats" },
  { label: "How It Works", href: "/#how-it-works", desc: "3-step booking flow" },
  { label: "FAQ", href: "/#faq", desc: "Common questions & help" },
];

export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close on route change (hash links)
  const close = () => setOpen(false);
  const toggle = () => setOpen((v) => !v);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  return (
    <>
      {/* Hamburger trigger — always visible on mobile, md:hidden */}
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={toggle}
        style={{ touchAction: "manipulation" }}
        className="flex h-11 w-11 select-none items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] md:hidden active:scale-95 transition-transform"
      >
        {open ? (
          <X className="h-5 w-5 text-amber-500" aria-hidden />
        ) : (
          <Menu className="h-5 w-5" aria-hidden />
        )}
      </button>

      {/* Portal to document.body escapes the header's backdrop-filter containing block.
          Using mounted state guarantees 100% SSR hydration match with zero hydration errors. */}
      {mounted && createPortal(
        <div
          aria-hidden={!open}
          className={`fixed inset-0 z-[9999] md:hidden ${open ? "pointer-events-auto" : "pointer-events-none"}`}
        >
        {/* Backdrop */}
        <div
          aria-hidden="true"
          onClick={close}
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            backdropFilter: "blur(4px)",
            WebkitBackdropFilter: "blur(4px)",
            transition: "opacity 250ms ease",
            opacity: open ? 1 : 0,
            cursor: "pointer",
            touchAction: "manipulation",
          }}
        />

        {/* Drawer panel — slides from left via translateX */}
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            bottom: 0,
            width: "min(80vw, 320px)",
            background: "var(--card)",
            borderRight: "1px solid var(--border)",
            boxShadow: "4px 0 32px rgba(0,0,0,0.25)",
            transform: open ? "translateX(0)" : "translateX(-100%)",
            transition: "transform 280ms cubic-bezier(0.4, 0, 0.2, 1)",
            display: "flex",
            flexDirection: "column",
            overflowY: "auto",
            willChange: "transform",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 20px",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <BrandMark />
            <button
              type="button"
              aria-label="Close menu"
              onClick={close}
              style={{ touchAction: "manipulation" }}
              className="flex h-9 w-9 select-none items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--muted)] text-[var(--foreground)]"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>

          {/* Nav Links */}
          <nav style={{ flex: 1, padding: "12px 12px 0" }} aria-label="Mobile navigation">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={close}
                style={{ touchAction: "manipulation", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px", borderRadius: "12px", marginBottom: "4px", color: "var(--foreground)", textDecoration: "none" }}
                className="font-bold text-sm hover:bg-[var(--muted)] hover:text-amber-500 transition-colors"
              >
                <div>
                  <span style={{ display: "block" }}>{link.label}</span>
                  <span style={{ display: "block", fontSize: "11px", fontWeight: 400, color: "var(--muted-foreground)" }}>
                    {link.desc}
                  </span>
                </div>
                <ArrowRight style={{ width: 16, height: 16, color: "var(--muted-foreground)", flexShrink: 0 }} aria-hidden />
              </Link>
            ))}
          </nav>

          {/* Theme Toggle Row */}
          <div
            style={{
              margin: "12px",
              padding: "12px 14px",
              borderRadius: "12px",
              border: "1px solid var(--border)",
              background: "var(--muted)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 700, color: "var(--foreground)" }}>
              {isDark ? <Moon style={{ width: 14, height: 14, color: "#f59e0b" }} aria-hidden /> : <Sun style={{ width: 14, height: 14, color: "#d97706" }} aria-hidden />}
              Appearance
            </span>
            <button
              type="button"
              aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
              onClick={() => setTheme(isDark ? "light" : "dark")}
              style={{
                touchAction: "manipulation",
                padding: "6px 14px",
                borderRadius: "10px",
                border: "1px solid var(--border)",
                background: "var(--background)",
                color: "var(--foreground)",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {isDark ? "Light" : "Dark"}
            </button>
          </div>

          {/* CTA Buttons */}
          <div style={{ padding: "0 12px 20px", display: "flex", flexDirection: "column", gap: 10, borderTop: "1px solid var(--border)", paddingTop: 16 }}>
            <Link
              href="/login"
              onClick={close}
              style={{
                touchAction: "manipulation",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "12px",
                borderRadius: "12px",
                border: "1px solid var(--border)",
                background: "var(--muted)",
                color: "var(--foreground)",
                fontWeight: 700,
                fontSize: 13,
                textDecoration: "none",
              }}
            >
              Sign In
            </Link>
            <Link
              href="/register"
              onClick={close}
              style={{
                touchAction: "manipulation",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                padding: "13px",
                borderRadius: "12px",
                background: "#f59e0b",
                color: "#030712",
                fontWeight: 900,
                fontSize: 13,
                textDecoration: "none",
              }}
            >
              Book Seat Now <ArrowRight style={{ width: 15, height: 15 }} aria-hidden />
            </Link>
          </div>
        </div>
      </div>,
      document.body
      )}
    </>
  );
}
