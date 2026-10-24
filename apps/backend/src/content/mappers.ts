import { Logger } from '@nestjs/common';
import { z } from 'zod';
import {
  contactLinkTypeSchema,
  linkSchema,
  type ContactLink,
  type Media,
  type Profile,
  type ProjectSummary,
  type Service,
  type Skill,
  type Stat,
  type Testimonial,
} from '@repo/shared';
import type { Prisma } from '../generated/prisma/client.js';

const logger = new Logger('ContentMappers');

/**
 * Parses a JSON array column item by item. Invalid items are logged and
 * dropped, so one bad block can't take a whole page down
 */
export function parseJsonList<T>(
  schema: z.ZodType<T>,
  value: unknown,
  context: string,
): T[] {
  if (!Array.isArray(value)) {
    logger.warn(`${context}: expected a JSON array, ignoring it`);
    return [];
  }
  return value.flatMap((item, index) => {
    const result = schema.safeParse(item);
    if (result.success) return [result.data];
    logger.warn(
      `${context}[${index}] is invalid and was dropped:\n${z.prettifyError(result.error)}`,
    );
    return [];
  });
}

export const toMedia = (
  row: (Prisma.MediaModel & { captions?: Prisma.MediaModel | null }) | null,
): Media | null =>
  row && {
    id: row.id,
    kind: row.kind,
    url: row.url,
    mimeType: row.mimeType,
    width: row.width,
    height: row.height,
    alt: row.alt,
    captionsUrl: row.captions?.url ?? null,
  };

export const toProfile = (
  row: Prisma.ProfileGetPayload<{ include: { avatar: true; cv: true } }>,
): Profile => ({
  brandName: row.brandName,
  displayName: row.displayName,
  headline: row.headline,
  tagline: row.tagline,
  avatar: toMedia(row.avatar),
  cv: toMedia(row.cv),
});

export const toStat = (row: Prisma.StatModel): Stat => ({
  id: row.id,
  value: row.value,
  label: row.label,
});

export const toSkill = (
  row: Prisma.SkillGetPayload<{ include: { icon: true } }>,
): Skill => ({
  id: row.id,
  name: row.name,
  category: row.category,
  tier: row.tier,
  description: row.description,
  icon: toMedia(row.icon),
});

export const toService = (
  row: Prisma.ServiceGetPayload<{ include: { icon: true } }>,
): Service => ({
  id: row.id,
  title: row.title,
  summary: row.summary,
  highlights: row.highlights,
  icon: toMedia(row.icon),
});

export const toTestimonial = (
  row: Prisma.TestimonialGetPayload<{ include: { avatar: true } }>,
): Testimonial => ({
  id: row.id,
  authorName: row.authorName,
  authorRole: row.authorRole,
  authorUrl: row.authorUrl,
  avatar: toMedia(row.avatar),
  quote: row.quote,
  rating: row.rating,
  source: row.source,
  givenAt: row.givenAt?.toISOString().slice(0, 10) ?? null,
});

export const toContactLink = (row: Prisma.ContactLinkModel): ContactLink => ({
  id: row.id,
  // free text in the database, so unknown values fall back to "other"
  type: contactLinkTypeSchema.catch('other').parse(row.type),
  label: row.label,
  value: row.value,
  url: row.url,
  featured: row.featured,
});

export const toProjectSummary = (
  row: Prisma.ProjectGetPayload<{ include: { cover: true } }>,
): ProjectSummary => ({
  id: row.id,
  slug: row.slug,
  title: row.title,
  summary: row.summary,
  tags: row.tags,
  links: parseJsonList(linkSchema, row.links, `Project(${row.slug}).links`),
  releaseStatus: row.releaseStatus,
  version: row.version,
  featured: row.featured,
  openSource: row.openSource,
  isPlaceholder: row.isPlaceholder,
  benchmarkUrl: row.benchmarkUrl,
  robloxPlaceId: row.robloxPlaceId,
  robloxUniverseId: row.robloxUniverseId,
  cover: toMedia(row.cover),
  updatedAt: row.updatedAt.toISOString(),
});
