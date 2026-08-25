import type { NextConfig } from "next";

// GHPAGES=1 builds a static export served from /program-builder on GitHub Pages.
const ghPages = process.env.GHPAGES === "1";

const nextConfig: NextConfig = {
  ...(ghPages
    ? {
        output: "export" as const,
        basePath: "/program-builder",
        images: { unoptimized: true },
      }
    : {}),
};

export default nextConfig;
