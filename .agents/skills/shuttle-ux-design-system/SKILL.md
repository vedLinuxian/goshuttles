---
name: shuttle-ux-design-system
description: UI/UX design tokens, micro-interactions, responsive components, glassmorphism, and color aesthetics for GoShuttles.
---

# GoShuttles UI/UX Design System Skill

This skill defines visual aesthetic standards, component guidelines, color palettes, and interactive polish for the GoShuttles platform.

## Color Palette & Theme Tokens

- **Brand Primary**: Amber / Warm Gold (`#f59e0b`, `#d97706`, `#b45309`) - Energetic, trustworthy, modern transit tone.
- **Dark Surface**: Obsidian / Deep Slate (`#0f172a`, `#1e293b`, `#090d16`).
- **Light Surface**: Crisp Warm Snow (`#f8fafc`, `#f1f5f9`).
- **Accent Emerald**: Live/Online/Verified (`#10b981`, `#059669`).
- **Accent Rose**: Alert/Cancelled/Locked (`#f43f5e`, `#e11d48`).
- **Accent Indigo**: Analytics/System Loop (`#6366f1`, `#4f46e5`).

## Glassmorphism & Micro-Interactions

- Glass panels use `backdrop-filter: blur(16px)` with subtle border highlights (`rgba(255,255,255,0.1)` in dark mode or `rgba(226,232,240,0.8)` in light mode).
- Card hover effects feature 3D translation (`translateY(-3px)`) and subtle elevation drop shadows.
- Interactive seat status badges animate smoothly when locked or selected.
- Real-time live status indicators feature pulsing radar rings (`animate-ping`).

## Component Guidelines

1. **Seat Selection Grid**: Visual 3D-ish shuttle layout showing Driver cockpit, Front seats, Middle row, and Back row with clear price badges and live availability locks.
2. **Ticket Pass Card**: Digital board pass look with barcode/QR code, departure time, seat number, and passenger manifest details.
3. **Driver Manifest & Dispatch Deck**: Quick action buttons (Confirm Payment, Scan QR, Mark Completed, Emergency Admin Request).
4. **Admin AI Loop Control Panel**: Live telemetry stream showing loop executions, system self-healing status, dynamic pricing controls, and revenue analytics.
