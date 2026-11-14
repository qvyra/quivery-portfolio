import { z } from "zod";

export const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Use lowercase letters, numbers and single dashes",
  );

export const httpUrlSchema = z.url({ protocol: /^https?$/ });

// Roblox place and universe IDs outgrow 32-bit ints, so they travel as strings
export const robloxIdSchema = z
  .string()
  .regex(/^[1-9]\d{0,19}$/, "Must be a numeric Roblox ID");

export const publishStatusSchema = z.enum(["DRAFT", "PUBLISHED"]);
export type PublishStatus = z.infer<typeof publishStatusSchema>;

// State every list item shares: draft or published, a visibility toggle (hide
// published content without unpublishing it) and a manual sort order. Public
// reads only return PUBLISHED + visible items
export const listItemStateInput = {
  publishStatus: publishStatusSchema.default("DRAFT"),
  visible: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(0),
};

/** Optional text field: absent leaves it unset, null clears it */
export const optionalText = (max: number) =>
  z.string().trim().min(1).max(max).nullable().optional();

export const linkTypeSchema = z.enum([
  // a page on this site, by path
  "internal",
  "repository",
  "package",
  "devforum",
  "creator-store",
  "roblox-game",
  "documentation",
  "website",
  "video",
  "other",
]);
export type LinkType = z.infer<typeof linkTypeSchema>;

/**
 * What's wrong with a path to a page on this site, or null when it's fine.
 * It has to start with one slash: "//host" and "/\host" are other sites to a
 * browser, and a scheme makes it a full URL
 */
export function sitePathProblem(path: string): string | null {
  if (/^[a-z][a-z\d+.-]*:/i.test(path)) {
    return "That's a full URL. Pick another link type for it, or keep only the path, e.g. /projects/geode";
  }
  if (!path.startsWith("/")) return "Must start with /, e.g. /projects/geode";
  if (/^\/[/\\]/.test(path)) {
    return "Must start with a single /, e.g. /projects/geode";
  }
  if (/[\s\\]/.test(path)) return "Can't contain spaces or backslashes";
  return null;
}

// the URL's rule depends on the type, so it's checked on the whole link and
// reported on url
export const linkSchema = z
  .strictObject({
    label: z.string().trim().min(1).max(60),
    url: z.string().trim().min(1).max(2048),
    type: linkTypeSchema,
  })
  .superRefine((link, ctx) => {
    const problem =
      link.type === "internal"
        ? sitePathProblem(link.url)
        : (httpUrlSchema.safeParse(link.url).error?.issues[0]?.message ?? null);
    if (problem)
      ctx.addIssue({ code: "custom", path: ["url"], message: problem });
  });
export type Link = z.infer<typeof linkSchema>;
