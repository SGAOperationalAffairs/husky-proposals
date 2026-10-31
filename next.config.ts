import type { NextConfig } from "next";

// Dev-only routes (the playground, #29) use the `.dev.tsx` extension and are
// compiled only for local and test builds, so a production build cannot
// contain them. This build-time switch is the one read of process.env outside
// src/env.ts: the config runs before the app, and only needs this one value.
const devRoutes = ["local", "test"].includes(process.env.APP_ENV ?? "");

const nextConfig: NextConfig = {
  pageExtensions: devRoutes ? ["tsx", "ts", "dev.tsx"] : ["tsx", "ts"],
  // Cache Components: data is dynamic by default and cached only where we say
  // so with `use cache` and cache tags. Matches the "explicit caching only" rule.
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  // The poster image reads its fonts and the board colors from files at
  // request time (#64), so the deployment must include them.
  outputFileTracingIncludes: {
    "/ideas/[number]/poster": ["./src/app/_share/fonts/*.woff", "./design/tokens.css"],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // Public, but not searchable (PRD D18). The metadata in the root layout also
  // sends a robots meta tag; this header covers responses with no HTML too.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex" }],
      },
    ];
  },
};

export default nextConfig;
