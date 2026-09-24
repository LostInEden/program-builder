import type { NextConfig } from "next";

// GHPAGES=1 builds a static export served from /program-builder on GitHub Pages.
// A static site has no server, so that build leaves out route handlers
// (`route.ts` — the /api/ai model endpoint) and always uses the local engine.
const ghPages = process.env.GHPAGES === "1";

const nextConfig: NextConfig = {
  ...(ghPages
    ? {
        output: "export" as const,
        basePath: "/program-builder",
        images: { unoptimized: true },
        pageExtensions: ["tsx", "jsx"],
        env: { NEXT_PUBLIC_AI_PROVIDER: "local" },
      }
    : {}),
};

export default nextConfig;
