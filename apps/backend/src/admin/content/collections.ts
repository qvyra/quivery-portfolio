import {
  adminContentSchemas,
  type AdminCollection,
  type PublishStatus,
} from '@repo/shared';
import type { z } from 'zod';
import { isDateKey } from '../../content/drafts.js';
import type { PrismaService } from '../../prisma/prisma.service.js';

/** A row of any publishable model, as far as the admin cares */
export type ContentRow = Record<string, unknown> & {
  id: string;
  publishStatus: PublishStatus;
  visible: boolean;
  sortOrder: number;
  draft: unknown;
  updatedAt: Date;
};

/**
 * The calls the admin makes on every publishable model. Prisma gives each
 * model its own delegate type, so they're used through this one shape, with
 * the arguments checked by the strict schemas before they get here
 */
export type ContentDelegate = {
  findMany(args: object): Promise<ContentRow[]>;
  findUnique(args: { where: { id: string } }): Promise<ContentRow | null>;
  create(args: { data: object }): Promise<ContentRow>;
  update(args: { where: { id: string }; data: object }): Promise<ContentRow>;
  delete(args: { where: { id: string } }): Promise<ContentRow>;
  aggregate(args: object): Promise<{ _max: { sortOrder: number | null } }>;
};

const models: Record<AdminCollection, string> = {
  sections: 'section',
  projects: 'project',
  stats: 'stat',
  skills: 'skill',
  services: 'service',
  testimonials: 'testimonial',
  contactLinks: 'contactLink',
};

export function delegateFor(
  db: PrismaService,
  collection: AdminCollection,
): ContentDelegate {
  return (db as unknown as Record<string, ContentDelegate>)[
    models[collection]
  ]!;
}

/** The content fields of a collection, from its strict schema */
export function contentKeys(collection: AdminCollection): string[] {
  return Object.keys(
    (adminContentSchemas[collection] as unknown as z.ZodObject).shape,
  );
}

/** A row's content fields in the shape its schema accepts */
export function toContent(
  collection: AdminCollection,
  row: ContentRow,
): Record<string, unknown> {
  return Object.fromEntries(
    contentKeys(collection).map((key) => {
      const value = row[key];
      return [
        key,
        isDateKey(key) && value instanceof Date
          ? value.toISOString().slice(0, 10)
          : value,
      ];
    }),
  );
}
