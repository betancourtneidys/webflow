import type { NextConfig } from "next";

// No basePath/assetPrefix here: Webflow Cloud sets them at build time from the
// environment's mount path. Client code reads NEXT_PUBLIC_BASE_PATH instead.
const nextConfig: NextConfig = {
  // Dev only: lets the dev server serve its assets when opened through the
  // network IP instead of localhost. Ignored by production builds.
  allowedDevOrigins: ["100.70.211.44"],
};

export default nextConfig;
