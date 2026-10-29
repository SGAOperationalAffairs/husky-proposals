import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components: data is dynamic by default and cached only where we say
  // so with `use cache` and cache tags. Matches the "explicit caching only" rule.
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
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
