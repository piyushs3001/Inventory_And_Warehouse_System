import type { NextConfig } from "next";

// Dev only: when the app is opened from a non-localhost origin (e.g. this
// machine's LAN IP, or another device on the network), Next.js otherwise blocks
// its internal dev resources — including the HMR websocket — for that origin.
// List the allowed extra origins here. Driven by DEV_ALLOWED_ORIGINS
// (comma-separated hostnames/IPs) so the machine-specific IP stays in the
// gitignored .env, not in source control. localhost is always allowed.
const devAllowedOrigins = (process.env.DEV_ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  allowedDevOrigins: devAllowedOrigins,
  // Shared workspace packages ship raw TS/TSX — Next must transpile them.
  transpilePackages: ["@iws/api-client", "@iws/ui", "@iws/auth"],
};

export default nextConfig;
