// Server environment for the web app. The variables are documented in
// .env.example
import { z } from "zod";

const unsetIfEmpty = (value: unknown) => (value === "" ? undefined : value);

const schema = z.object({
  API_URL: z.preprocess(unsetIfEmpty, z.url().optional()),
  SITE_URL: z.preprocess(unsetIfEmpty, z.url().optional()),
  REVALIDATE_SECRET: z.preprocess(
    unsetIfEmpty,
    z.string().min(32, "must be at least 32 characters").optional(),
  ),
  // sent to the API with every contact form submission, which it requires
  CONTACT_API_SECRET: z.preprocess(
    unsetIfEmpty,
    z.string().min(32, "must be at least 32 characters").optional(),
  ),
  // sent to the API with every admin request. Its own secret, not the
  // contact form's
  ADMIN_API_SECRET: z.preprocess(
    unsetIfEmpty,
    z.string().min(32, "must be at least 32 characters").optional(),
  ),
  // Vercel Blob, where admin uploads go. Vercel sets it once a Blob store is
  // connected to the project. Without it, development stores uploads in
  // public/uploads and production refuses uploads
  BLOB_READ_WRITE_TOKEN: z.preprocess(unsetIfEmpty, z.string().optional()),
  // where uploaded media is served from once it moves to object storage
  MEDIA_ORIGIN: z.preprocess(unsetIfEmpty, z.url().optional()),
  // "on" once Web Analytics is enabled for the Vercel project. Before that
  // its script would 404 on every page
  WEB_ANALYTICS: z.preprocess(unsetIfEmpty, z.enum(["on", "off"]).optional()),
});

export type Stage = "development" | "build" | "server";

export type Env = {
  /** Base URL of the Nest API, without a trailing slash */
  apiUrl: string;
  /** Public origin of this site, for canonical and Open Graph URLs */
  siteUrl: string;
  revalidateSecret: string | null;
  contactApiSecret: string | null;
  adminApiSecret: string | null;
  blobToken: string | null;
  mediaOrigin: string | null;
  webAnalytics: boolean;
};

export function currentStage(): Stage {
  if (process.env.NEXT_PHASE === "phase-production-build") return "build";
  return process.env.NODE_ENV === "production" ? "server" : "development";
}

// Development has a local default for everything. Builds need API_URL and
// SITE_URL, since pages prerender from the API and canonical URLs can't point
// at localhost. next start also needs REVALIDATE_SECRET, which the API sends to
// refresh cached pages, CONTACT_API_SECRET, which the contact form sends to the
// API, and ADMIN_API_SECRET for the admin. instrumentation.ts runs this at
// startup so a bad config fails right away with a clear message
export function loadEnv(
  stage: Stage,
  source: Record<string, string | undefined> = process.env,
): Env {
  const result = schema.safeParse(source);
  if (!result.success) {
    throw new Error(
      `Invalid environment variables:\n${z.prettifyError(result.error)}`,
    );
  }
  const env = result.data;

  const missing: string[] = [];
  if (stage !== "development") {
    if (!env.API_URL) missing.push("API_URL");
    if (!env.SITE_URL) missing.push("SITE_URL");
  }
  if (stage === "server" && !env.REVALIDATE_SECRET) {
    missing.push("REVALIDATE_SECRET");
  }
  if (stage === "server" && !env.CONTACT_API_SECRET) {
    missing.push("CONTACT_API_SECRET");
  }
  if (stage === "server" && !env.ADMIN_API_SECRET) {
    missing.push("ADMIN_API_SECRET");
  }
  if (missing.length > 0) {
    throw new Error(
      `Missing environment variables (${stage}): ${missing.join(", ")}. See apps/web/.env.example.`,
    );
  }

  return {
    apiUrl: (env.API_URL ?? "http://localhost:5005").replace(/\/+$/, ""),
    siteUrl: new URL(env.SITE_URL ?? "http://localhost:3000").origin,
    revalidateSecret: env.REVALIDATE_SECRET ?? null,
    contactApiSecret: env.CONTACT_API_SECRET ?? null,
    adminApiSecret: env.ADMIN_API_SECRET ?? null,
    blobToken: env.BLOB_READ_WRITE_TOKEN ?? null,
    mediaOrigin: env.MEDIA_ORIGIN ? new URL(env.MEDIA_ORIGIN).origin : null,
    webAnalytics: env.WEB_ANALYTICS === "on",
  };
}

let cached: Env | undefined;

/** Environment for app code, validated for the current stage */
export function env(): Env {
  cached ??= loadEnv(currentStage());
  return cached;
}
