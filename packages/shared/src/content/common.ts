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

export const linkSchema = z.strictObject({
  label: z.string().trim().min(1).max(60),
  url: httpUrlSchema,
  type: linkTypeSchema,
});
export type Link = z.infer<typeof linkSchema>;
