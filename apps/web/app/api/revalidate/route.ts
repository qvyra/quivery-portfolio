// Refreshes cached pages by tag, server to server only. Once the admin panel
// exists the API calls this after edits. Pages keep serving the cached version
// and rebuild in the background on the next visit
import { createHash, timingSafeEqual } from "node:crypto";
import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { env } from "@/lib/env";

// only tags the site actually uses (see lib/content.ts): site, projects,
// project:<slug>
const tagSchema = z
  .string()
  .regex(/^(site|projects|project:[a-z0-9]+(?:-[a-z0-9]+)*)$/, "Unknown tag");

const bodySchema = z.strictObject({
  tags: z.array(tagSchema).min(1).max(50),
});

const reply = (status: number, code: string, message: string, data?: unknown) =>
  Response.json(
    { status, message, code, ...(data !== undefined && { data }) },
    { status },
  );

// constant-time compare, hashing first makes the lengths equal
function matches(given: string | null, expected: string) {
  if (!given) return false;
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(given), digest(expected));
}

// expects an x-revalidate-secret header and a body like
// { "tags": ["site", "projects", "project:geode"] }
export async function POST(request: Request) {
  const secret = env().revalidateSecret;
  if (!secret) {
    return reply(
      503,
      "REVALIDATION_DISABLED",
      "REVALIDATE_SECRET is not set, so revalidation is off.",
    );
  }
  if (!matches(request.headers.get("x-revalidate-secret"), secret)) {
    return reply(401, "UNAUTHORIZED", "Missing or wrong revalidation secret.");
  }

  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return reply(400, "INVALID_BODY", z.prettifyError(body.error));
  }

  const tags = [...new Set(body.data.tags)];
  // "max" serves the cached page while the new one renders in the background
  for (const tag of tags) revalidateTag(tag, "max");
  // the prerendered sitemap doesn't carry the tags of the projects it lists,
  // so it never refreshed with them
  if (tags.includes("projects")) revalidatePath("/sitemap.xml");
  return reply(200, "REVALIDATED", "Revalidated.", { tags });
}
