import { z } from "zod";
import {
  httpUrlSchema,
  linkSchema,
  listItemStateInput,
  robloxIdSchema,
  slugSchema,
} from "./common.js";
import { blocksSchema, resolvedBlockSchema } from "./blocks.js";
import { testimonialSchema } from "./entities.js";
import { mediaSchema } from "./media.js";

export const releaseStatusSchema = z.enum(["RELEASED", "IN_DEVELOPMENT"]);
export type ReleaseStatus = z.infer<typeof releaseStatusSchema>;

export const projectInputSchema = z.strictObject({
  slug: slugSchema,
  title: z.string().trim().min(1).max(80),
  summary: z.string().trim().min(1).max(300),
  // the project's own page
  body: blocksSchema.default([]),
  tags: z.array(z.string().trim().min(1).max(32)).max(12).default([]),
  links: z.array(linkSchema).max(20).default([]),
  releaseStatus: releaseStatusSchema,
  version: z.string().trim().min(1).max(32).nullable().optional(),
  // flagship projects are highlighted first
  featured: z.boolean().default(false),
  openSource: z.boolean().default(false),
  // development-only filler, never returned by the API in production
  isPlaceholder: z.boolean().default(false),
  // performance or safety claims have to link here (benchmark code + method)
  benchmarkUrl: httpUrlSchema.nullable().optional(),
  // TODO: live Roblox stats, these are reserved for it
  robloxPlaceId: robloxIdSchema.nullable().optional(),
  robloxUniverseId: robloxIdSchema.nullable().optional(),
  coverId: z.uuid().nullable().optional(),
  ...listItemStateInput,
});
export type ProjectInput = z.input<typeof projectInputSchema>;

export const projectSummarySchema = z.object({
  id: z.uuid(),
  slug: z.string(),
  title: z.string(),
  summary: z.string(),
  tags: z.array(z.string()),
  links: z.array(linkSchema),
  releaseStatus: releaseStatusSchema,
  version: z.string().nullable(),
  featured: z.boolean(),
  openSource: z.boolean(),
  isPlaceholder: z.boolean(),
  benchmarkUrl: z.string().nullable(),
  robloxPlaceId: z.string().nullable(),
  robloxUniverseId: z.string().nullable(),
  cover: mediaSchema.nullable(),
  updatedAt: z.iso.datetime(),
});
export type ProjectSummary = z.infer<typeof projectSummarySchema>;

export const projectDetailSchema = projectSummarySchema.extend({
  body: z.array(resolvedBlockSchema),
  testimonials: z.array(testimonialSchema),
});
export type ProjectDetail = z.infer<typeof projectDetailSchema>;
