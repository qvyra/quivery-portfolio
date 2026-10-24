import { z } from "zod";
import { contactMessageStatusSchema } from "./contact.js";
import {
  contactLinkInputSchema,
  profileInputSchema,
  serviceInputSchema,
  skillInputSchema,
  statInputSchema,
  testimonialInputSchema,
} from "./content/entities.js";
import { mediaKindSchema, mediaUrlSchema } from "./content/media.js";
import { projectInputSchema } from "./content/project.js";
import {
  checkTitleHighlight,
  sectionInputBaseSchema,
} from "./content/section.js";

// What the admin panel sends. Every body is a strict whitelist: a key that
// isn't listed here is rejected, so a request can never set a column it isn't
// meant to (mass assignment)

/** The lists the admin edits, each with draft, publish, order and visibility */
export const adminCollectionSchema = z.enum([
  "sections",
  "projects",
  "stats",
  "skills",
  "services",
  "testimonials",
  "contactLinks",
]);
export type AdminCollection = z.infer<typeof adminCollectionSchema>;

// publish state, visibility and order have their own endpoints, so content
// edits can't touch them
const stateFields = {
  publishStatus: true,
  visible: true,
  sortOrder: true,
} as const;

/**
 * The editable content of each collection. Edits send the whole object: a
 * partial update would let defaults (an empty body, say) overwrite fields that
 * weren't sent
 */
export const adminContentSchemas = {
  sections: sectionInputBaseSchema
    .omit(stateFields)
    .superRefine(checkTitleHighlight),
  projects: projectInputSchema.omit(stateFields),
  stats: statInputSchema.omit(stateFields),
  skills: skillInputSchema.omit(stateFields),
  services: serviceInputSchema.omit(stateFields),
  testimonials: testimonialInputSchema.omit(stateFields),
  contactLinks: contactLinkInputSchema.omit(stateFields),
} as const satisfies Record<AdminCollection, z.ZodType>;

export type AdminContent<C extends AdminCollection> = z.output<
  (typeof adminContentSchemas)[C]
>;
export type AdminContentInput<C extends AdminCollection> = z.input<
  (typeof adminContentSchemas)[C]
>;

/** The profile is a singleton with no publish state, edits go live directly */
export const adminProfileSchema = profileInputSchema;

export const adminLoginSchema = z.strictObject({
  username: z.string().trim().min(1, "Enter your username").max(64),
  password: z.string().min(1, "Enter your password").max(200),
});
export type AdminLogin = z.input<typeof adminLoginSchema>;

/** The new order of a whole collection, first to last */
export const adminReorderSchema = z.strictObject({
  ids: z
    .array(z.uuid())
    .min(1)
    .max(500)
    .refine((ids) => new Set(ids).size === ids.length, "Ids must be unique"),
});

export const adminVisibilitySchema = z.strictObject({
  visible: z.boolean(),
});

export const adminMessageStatusSchema = z.strictObject({
  status: contactMessageStatusSchema,
});

/**
 * A file the browser has just put in object storage. The site checks it's
 * really there (size and type come from the store, not from this body)
 * before the API records it
 */
export const adminMediaRegisterSchema = z.strictObject({
  kind: mediaKindSchema,
  // object storage, or /uploads/... from the dev adapter
  url: mediaUrlSchema,
  alt: z.string().trim().max(300).default(""),
  width: z.number().int().positive().max(20_000).nullable().optional(),
  height: z.number().int().positive().max(20_000).nullable().optional(),
});

/** What the site sends the API: the register body plus what the store said */
export const adminMediaCreateSchema = adminMediaRegisterSchema.extend({
  mimeType: z.string().trim().min(1).max(100),
  sizeBytes: z.number().int().positive(),
  storageKey: z.string().trim().min(1).max(512),
});

export const adminMediaUpdateSchema = z.strictObject({
  alt: z.string().trim().max(300),
  // a WebVTT file shown as the captions of a video
  captionsId: z.uuid().nullable(),
});
