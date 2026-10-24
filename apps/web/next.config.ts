import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";
import { loadEnv } from "./lib/env";
import { securityHeaders } from "./lib/security-headers";
import { lanAddresses } from "./scripts/lan.mjs";

const pageExtensions = ["tsx", "ts", "jsx", "js"];

export default function nextConfig(phase: string): NextConfig {
  const dev = phase === PHASE_DEVELOPMENT_SERVER;
  // format checks only, instrumentation.ts enforces what each stage needs
  const { mediaOrigin, siteUrl } = loadEnv("development");

  return {
    // page.dev.tsx routes only exist under next dev. Production builds never
    // see them, so dev tools can't leak to the live site
    pageExtensions: dev ? ["dev.tsx", ...pageExtensions] : pageExtensions,

    // public pages are prerendered and cached, see lib/content.ts
    cacheComponents: true,
    partialPrefetching: true,

    // no AGENTS.md written by next dev
    agentRules: false,

    // published project slugs, snapshot by scripts/build.mjs and inlined at
    // build time. See app/(site)/projects/[slug]/page.tsx
    env: process.env.PUBLISHED_PROJECT_SLUGS
      ? { PUBLISHED_PROJECT_SLUGS: process.env.PUBLISHED_PROJECT_SLUGS }
      : undefined,

    // lets a phone on the local network load the dev server (npm run dev:lan)
    allowedDevOrigins: dev
      ? lanAddresses().map(({ address }) => address)
      : undefined,

    async headers() {
      return [
        ...securityHeaders({
          mediaOrigin,
          https: siteUrl.startsWith("https:"),
          dev,
        }),
        // the file names carry a content hash, see scripts/fonts.py
        {
          source: "/fonts/:file",
          headers: [
            {
              key: "Cache-Control",
              value: "public, max-age=31536000, immutable",
            },
          ],
        },
        // brand art and icons keep their names, so a week rather than
        // forever. Replacing one means a new file name, see lib/brand.ts
        ...["/brand/:file", "/icons/:file"].map((source) => ({
          source,
          headers: [
            {
              key: "Cache-Control",
              value: "public, max-age=604800, stale-while-revalidate=2592000",
            },
          ],
        })),
      ];
    },

    images: {
      // browsers keep optimized images a month instead of asking again on
      // every visit. Uploads get a new URL each, so nothing goes stale
      minimumCacheTTL: 2_678_400,
      remotePatterns: [
        // posters for YouTube embeds
        new URL("https://i.ytimg.com/vi/**"),
        // uploaded media, once it lives in object storage
        ...(mediaOrigin ? [new URL(`${mediaOrigin}/**`)] : []),
      ],
    },
  };
}
