import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow network access from mobile devices on local network in dev mode
  allowedDevOrigins: ["10.47.56.202:3000", "10.47.56.202", "localhost:3000"],
  serverExternalPackages: ["@prisma/adapter-pg", "pg", "prisma", "@prisma/client"],

  // ─── Performance: Client Router Cache ───────────────────────────────────────
  // Make navigation feel instant like a desktop app:
  // - dynamic pages stay fresh in client cache for 30s (avoids unnecessary re-fetches on back/forward)
  // - static pages cached for 5 minutes
  experimental: {
    staleTimes: {
      dynamic: 30,
      static: 300,
    },
    // Inline CSS for faster initial paint
    inlineCss: true,
    // Optimize package imports to tree-shake large icon libraries
    optimizePackageImports: ["lucide-react", "recharts"],
  },

  // ─── Production: compress responses ─────────────────────────────────────────
  compress: true,

  // ─── Security headers ────────────────────────────────────────────────────────
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
        ],
      },
    ];
  },
};

export default nextConfig;
