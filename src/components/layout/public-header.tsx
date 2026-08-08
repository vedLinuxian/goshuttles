"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui";
import { BrandMark } from "./brand-mark";
import { ThemeToggle } from "./theme-toggle";
import { MobileMenu } from "./mobile-menu";

const links = [
  { label: "Departures", href: "/#booking-wizard" },
  { label: "How It Works", href: "/#how-it-works" },
  { label: "FAQ", href: "/#faq" },
];

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--card)]/90 backdrop-blur-2xl transition-all">
      <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <BrandMark />

        <nav className="hidden md:flex items-center gap-6" aria-label="Public navigation">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)] transition-colors hover:text-amber-500"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <ThemeToggle />
          <Link
            href="/login"
            className={`touch-manipulation ${buttonVariants({ variant: "ghost", size: "sm" })} text-[var(--foreground)] hover:bg-[var(--muted)] rounded-xl font-bold text-xs`}
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className={`touch-manipulation ${buttonVariants({ size: "sm" })} bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-4 h-9 rounded-xl shadow-md flex items-center gap-1.5 text-xs transition-transform active:scale-95`}
          >
            <span>Book Seat</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Mobile Header Actions (Theme Toggle + New Touch Mobile Menu) */}
        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}
