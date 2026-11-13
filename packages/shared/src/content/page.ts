import { z } from "zod";
import { listItemStateInput, optionalText, slugSchema } from "./common.js";
import { blocksSchema, resolvedBlockSchema } from "./blocks.js";
import { checkTitleHighlight } from "./section.js";

// Standalone pages at /<slug>, made of the same blocks as a custom section.
// They live at the top level of the site, so a slug can't take a path the app
// already uses (or will: icon and twitter-image are Next's metadata routes)
export const reservedPageSlugs = [
  "admin",
  "api",
  "projects",
  "dev",
  "preview",
  "sitemap",
  "robots",
  "manifest",
  "favicon",
  "icon",
  "apple-icon",
  "opengraph-image",
  "twitter-image",
  "fonts",
  "brand",
  "icons",
  "uploads",
  "not-found",
] as const;

const reserved = new Set<string>(reservedPageSlugs);

export const pageSlugSchema = slugSchema.refine(
  (slug) => !reserved.has(slug),
  "That URL is used by the site already, pick another",
);

export const pageInputBaseSchema = z.strictObject({
  // the URL, /<slug>
  slug: pageSlugSchema,
  title: z.string().trim().min(1).max(80),
  // part of the title shown in the accent gradient
  titleHighlight: optionalText(80),
  // small heading above the title
  eyebrow: optionalText(60),
  // the browser tab and search result title, defaults to the title
  seoTitle: optionalText(70),
  // the search result and link preview text
  seoDescription: z.string().trim().min(1).max(200),
  blocks: blocksSchema.default([]),
  ...listItemStateInput,
});

export const pageInputSchema =
  pageInputBaseSchema.superRefine(checkTitleHighlight);
export type PageInput = z.input<typeof pageInputSchema>;

/** What lists of pages need: the sitemap, the build's URL snapshot */
export const pageSummarySchema = z.object({
  id: z.uuid(),
  slug: z.string(),
  title: z.string(),
  seoTitle: z.string().nullable(),
  seoDescription: z.string(),
  updatedAt: z.iso.datetime(),
});
export type PageSummary = z.infer<typeof pageSummarySchema>;

export const pageDetailSchema = pageSummarySchema.extend({
  titleHighlight: z.string().nullable(),
  eyebrow: z.string().nullable(),
  blocks: z.array(resolvedBlockSchema),
});
export type PageDetail = z.infer<typeof pageDetailSchema>;
