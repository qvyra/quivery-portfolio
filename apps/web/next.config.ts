import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";
import { loadEnv } from "./lib/env";
import { lanAddresses } from "./scripts/lan.mjs";

const pageExtensions = ["tsx", "ts", "jsx", "js"];

export default function nextConfig(phase: string): NextConfig {
  const dev = phase === PHASE_DEVELOPMENT_SERVER;
  // format checks only, instrumentation.ts enforces what each stage needs
  const { mediaOrigin } = loadEnv("development");

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

    images: {
      remotePatterns: [
        // posters for YouTube embeds
        new URL("https://i.ytimg.com/vi/**"),
        // uploaded media, once it lives in object storage
        ...(mediaOrigin ? [new URL(`${mediaOrigin}/**`)] : []),
      ],
    },
  };
}
