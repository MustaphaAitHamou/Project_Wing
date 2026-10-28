import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  // Dossier de build séparé possible (ex. tests E2E sur un build de production en parallèle du dev).
  distDir: process.env.NEXT_DIST_DIR || ".next",
  poweredByHeader: false,
  reactStrictMode: true,
  typedRoutes: false,
  serverExternalPackages: ["pg"],
  experimental: {
    serverActions: { bodySizeLimit: "12mb" },
  },
  images: { remotePatterns: [{ protocol: "https", hostname: "lh3.googleusercontent.com" }] },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
