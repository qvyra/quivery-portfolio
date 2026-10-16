import { z } from "zod";
import { listItemStateInput, optionalText, slugSchema } from "./common.js";
import { blocksSchema, resolvedBlockSchema } from "./blocks.js";
import {
  contactLinkSchema,
  profileSchema,
  serviceSchema,
  skillSchema,
  statSchema,
  testimonialSchema,
} from "./entities.js";
import { projectSummarySchema } from "./project.js";

// Sections make up the homepage, in sortOrder. A typed section renders its
// matching list (e.g. "projects" renders the published projects) with its
// blocks as an optional intro, and a "custom" section is blocks only. Stored as
// a string rather than a database enum, so a new type needs no migration
export const sectionTypeSchema = z.enum([
  "hero",
  "stats",
  "services",
  "projects",
  "skills",
  "testimonials",
  "contact",
  "custom",
]);
export type SectionType = z.infer<typeof sectionTypeSchema>;

// the fields without cross-field checks, for building partial or draft schemas
export const sectionInputBaseSchema = z.strictObject({
  // also the in-page anchor, e.g. /#works
  slug: slugSchema,
  type: sectionTypeSchema,
  title: z.string().trim().min(1).max(80),
  // part of the title shown in the accent gradient (e.g. "the gameplay."),
  // kept apart so the title stays plain text
  titleHighlight: optionalText(80),
  // small heading above the title
  eyebrow: optionalText(60),
  // short label for the site nav, defaults to the title
  navLabel: optionalText(24),
  blocks: blocksSchema.default([]),
  ...listItemStateInput,
});

export const sectionInputSchema = sectionInputBaseSchema.superRefine(
  (section, ctx) => {
    if (
      section.titleHighlight &&
      !section.title.includes(section.titleHighlight)
    ) {
      ctx.addIssue({
        code: "custom",
        message: "The highlight must be part of the title, exactly as written",
        path: ["titleHighlight"],
      });
    }
  },
);
export type SectionInput = z.input<typeof sectionInputSchema>;

const sectionBase = {
  id: z.uuid(),
  slug: z.string(),
  title: z.string(),
  titleHighlight: z.string().nullable(),
  eyebrow: z.string().nullable(),
  navLabel: z.string().nullable(),
  blocks: z.array(resolvedBlockSchema),
};

// Sections as the public API returns them. Sections with nothing to show (no
// published testimonials, say) are left out, so lists here are never empty and
// nothing has to be faked
export const siteSectionSchema = z.discriminatedUnion("type", [
  z.object({ ...sectionBase, type: z.literal("hero") }),
  z.object({
    ...sectionBase,
    type: z.literal("stats"),
    stats: z.array(statSchema).min(1),
  }),
  z.object({
    ...sectionBase,
    type: z.literal("services"),
    services: z.array(serviceSchema).min(1),
  }),
  z.object({
    ...sectionBase,
    type: z.literal("projects"),
    projects: z.array(projectSummarySchema).min(1),
  }),
  z.object({
    ...sectionBase,
    type: z.literal("skills"),
    skills: z.array(skillSchema).min(1),
  }),
  z.object({
    ...sectionBase,
    type: z.literal("testimonials"),
    testimonials: z.array(testimonialSchema).min(1),
  }),
  z.object({ ...sectionBase, type: z.literal("contact") }),
  z.object({
    ...sectionBase,
    type: z.literal("custom"),
    blocks: z.array(resolvedBlockSchema).min(1),
  }),
]);
export type SiteSection = z.infer<typeof siteSectionSchema>;

// everything the homepage needs, in one response
export const siteSchema = z.object({
  profile: profileSchema,
  // used by the contact section and site-wide (header, footer)
  contactLinks: z.array(contactLinkSchema),
  sections: z.array(siteSectionSchema),
});
export type Site = z.infer<typeof siteSchema>;
