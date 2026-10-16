import { z } from "zod";
import { httpUrlSchema, listItemStateInput, optionalText } from "./common.js";
import { mediaSchema } from "./media.js";

// Input schemas are strict whitelists: unknown keys are rejected, so a request
// body can never set a column it isn't meant to (mass assignment). Response
// schemas describe what the public API returns

const mediaId = z.uuid().nullable().optional();

// ── Profile (singleton) ─────────────────────────────────────────────────────

export const profileInputSchema = z.strictObject({
  brandName: z.string().trim().min(1).max(40),
  displayName: z.string().trim().min(1).max(40),
  headline: z.string().trim().min(1).max(120),
  tagline: z.string().trim().min(1).max(200),
  avatarId: mediaId,
  cvId: mediaId,
});
export type ProfileInput = z.input<typeof profileInputSchema>;

export const profileSchema = z.object({
  brandName: z.string(),
  displayName: z.string(),
  headline: z.string(),
  tagline: z.string(),
  avatar: mediaSchema.nullable(),
  cv: mediaSchema.nullable(),
});
export type Profile = z.infer<typeof profileSchema>;

// ── Stats ───────────────────────────────────────────────────────────────────

export const statInputSchema = z.strictObject({
  value: z.string().trim().min(1).max(16),
  label: z.string().trim().min(1).max(40),
  ...listItemStateInput,
});
export type StatInput = z.input<typeof statInputSchema>;

export const statSchema = z.object({
  id: z.uuid(),
  value: z.string(),
  label: z.string(),
});
export type Stat = z.infer<typeof statSchema>;

// ── Skills ──────────────────────────────────────────────────────────────────

export const skillTierSchema = z.enum(["PRIMARY", "SECONDARY"]);
export type SkillTier = z.infer<typeof skillTierSchema>;

export const skillInputSchema = z.strictObject({
  name: z.string().trim().min(1).max(60),
  category: optionalText(40),
  tier: skillTierSchema.default("PRIMARY"),
  description: optionalText(300),
  iconId: mediaId,
  ...listItemStateInput,
});
export type SkillInput = z.input<typeof skillInputSchema>;

export const skillSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  category: z.string().nullable(),
  tier: skillTierSchema,
  description: z.string().nullable(),
  icon: mediaSchema.nullable(),
});
export type Skill = z.infer<typeof skillSchema>;

// ── Services ────────────────────────────────────────────────────────────────

export const serviceInputSchema = z.strictObject({
  title: z.string().trim().min(1).max(80),
  summary: z.string().trim().min(1).max(400),
  highlights: z.array(z.string().trim().min(1).max(120)).max(8).default([]),
  iconId: mediaId,
  ...listItemStateInput,
});
export type ServiceInput = z.input<typeof serviceInputSchema>;

export const serviceSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  summary: z.string(),
  highlights: z.array(z.string()),
  icon: mediaSchema.nullable(),
});
export type Service = z.infer<typeof serviceSchema>;

// ── Testimonials (real ones only, never placeholders) ───────────────────────

export const testimonialInputSchema = z.strictObject({
  authorName: z.string().trim().min(1).max(80),
  authorRole: optionalText(80),
  authorUrl: httpUrlSchema.nullable().optional(),
  avatarId: mediaId,
  quote: z.string().trim().min(1).max(1_200),
  rating: z.number().int().min(1).max(5).nullable().optional(),
  // where it was given, e.g. "Talent Hub" or "Discord"
  source: optionalText(60),
  givenAt: z.iso.date().nullable().optional(),
  projectId: z.uuid().nullable().optional(),
  ...listItemStateInput,
});
export type TestimonialInput = z.input<typeof testimonialInputSchema>;

export const testimonialSchema = z.object({
  id: z.uuid(),
  authorName: z.string(),
  authorRole: z.string().nullable(),
  authorUrl: z.string().nullable(),
  avatar: mediaSchema.nullable(),
  quote: z.string(),
  rating: z.number().int().nullable(),
  source: z.string().nullable(),
  givenAt: z.iso.date().nullable(),
});
export type Testimonial = z.infer<typeof testimonialSchema>;

// ── Contact links ───────────────────────────────────────────────────────────

export const contactLinkTypeSchema = z.enum([
  "discord",
  "email",
  "github",
  "roblox-talent-hub",
  "kofi",
  "website",
  "other",
]);
export type ContactLinkType = z.infer<typeof contactLinkTypeSchema>;

const contactUrlSchema = z.union([
  httpUrlSchema,
  z
    .string()
    .regex(/^mailto:[^\s@]+@[^\s@]+\.[^\s@]+$/, "Must be a mailto: link"),
]);

export const contactLinkInputSchema = z.strictObject({
  type: contactLinkTypeSchema,
  label: z.string().trim().min(1).max(40),
  // what visitors see, e.g. the Discord handle or the email address
  value: z.string().trim().min(1).max(120),
  // null when there's nothing to open (a Discord handle gets copied instead)
  url: contactUrlSchema.nullable().optional(),
  // shown prominently, meant for the Discord handle
  featured: z.boolean().default(false),
  ...listItemStateInput,
});
export type ContactLinkInput = z.input<typeof contactLinkInputSchema>;

export const contactLinkSchema = z.object({
  id: z.uuid(),
  type: contactLinkTypeSchema,
  label: z.string(),
  value: z.string(),
  url: z.string().nullable(),
  featured: z.boolean(),
});
export type ContactLink = z.infer<typeof contactLinkSchema>;
