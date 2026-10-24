import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { z } from 'zod';
import type {
  adminMediaCreateSchema,
  adminMediaUpdateSchema,
  ApiError,
} from '@repo/shared';
import { collectMediaIds } from '../../content/media-refs.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ZodValidationException } from '../../validation/zod-validation.exception.js';
import { SiteUpdates } from '../site-updates.js';

export type AdminMedia = {
  id: string;
  kind: 'IMAGE' | 'VIDEO' | 'FILE';
  url: string;
  storageKey: string | null;
  mimeType: string;
  sizeBytes: number | null;
  width: number | null;
  height: number | null;
  alt: string;
  captionsId: string | null;
  createdAt: string;
};

// the columns that point at media from typed fields, also checked in drafts
const mediaIdFields = ['avatarId', 'cvId', 'coverId', 'iconId'];

function invalid(path: string, message: string, input: unknown) {
  return new ZodValidationException(
    new z.ZodError([{ code: 'custom', path: [path], message, input }]),
  );
}

@Injectable()
export class AdminMediaService {
  constructor(
    private readonly db: PrismaService,
    private readonly site: SiteUpdates,
  ) {}

  async list(): Promise<AdminMedia[]> {
    const rows = await this.db.media.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toAdminMedia);
  }

  async create(
    input: z.output<typeof adminMediaCreateSchema>,
  ): Promise<AdminMedia> {
    return toAdminMedia(await this.db.media.create({ data: input }));
  }

  async update(
    id: string,
    input: z.output<typeof adminMediaUpdateSchema>,
  ): Promise<AdminMedia> {
    const media = await this.find(id);
    if (input.captionsId) {
      if (media.kind !== 'VIDEO') {
        throw invalid(
          'captionsId',
          'Only videos have captions',
          input.captionsId,
        );
      }
      const captions = await this.db.media.findUnique({
        where: { id: input.captionsId },
      });
      if (!captions || captions.mimeType !== 'text/vtt') {
        throw invalid(
          'captionsId',
          'Captions have to be a WebVTT (.vtt) file',
          input.captionsId,
        );
      }
    }
    const row = await this.db.media.update({ where: { id }, data: input });
    // alt text and captions show on the site straight away
    this.site.refresh();
    return toAdminMedia(row);
  }

  /**
   * Deletes the record and returns it, so the site can delete the file. A
   * file that anything still uses, published or in a draft, is refused, with
   * the list of what uses it
   */
  async remove(id: string): Promise<AdminMedia> {
    const media = await this.find(id);
    const usedBy = await this.usages(id);
    if (usedBy.length > 0) {
      throw new ConflictException({
        status: 409,
        message: `Still used by ${usedBy.join(', ')}. Remove it there first.`,
        code: 'MEDIA_IN_USE',
      } satisfies ApiError);
    }
    await this.db.media.delete({ where: { id } });
    return toAdminMedia(media);
  }

  private async usages(id: string): Promise<string[]> {
    const used = (value: unknown) =>
      collectMediaIds(value).has(id) ||
      (value !== null &&
        typeof value === 'object' &&
        mediaIdFields.some(
          (field) => (value as Record<string, unknown>)[field] === id,
        ));

    const [
      profile,
      projects,
      sections,
      skills,
      services,
      testimonials,
      captionsFor,
    ] = await this.db.$transaction([
      this.db.profile.findMany({
        where: { OR: [{ avatarId: id }, { cvId: id }] },
      }),
      this.db.project.findMany({
        select: { title: true, coverId: true, body: true, draft: true },
      }),
      this.db.section.findMany({
        select: { title: true, blocks: true, draft: true },
      }),
      this.db.skill.findMany({
        select: { name: true, iconId: true, draft: true },
      }),
      this.db.service.findMany({
        select: { title: true, iconId: true, draft: true },
      }),
      this.db.testimonial.findMany({
        select: { authorName: true, avatarId: true, draft: true },
      }),
      this.db.media.findMany({
        where: { captionsId: id },
        select: { url: true },
      }),
    ]);

    return [
      ...profile.map(() => 'the profile'),
      ...projects
        .filter((p) => p.coverId === id || used(p.body) || used(p.draft))
        .map((p) => `project "${p.title}"`),
      ...sections
        .filter((s) => used(s.blocks) || used(s.draft))
        .map((s) => `section "${s.title}"`),
      ...skills
        .filter((s) => s.iconId === id || used(s.draft))
        .map((s) => `skill "${s.name}"`),
      ...services
        .filter((s) => s.iconId === id || used(s.draft))
        .map((s) => `service "${s.title}"`),
      ...testimonials
        .filter((t) => t.avatarId === id || used(t.draft))
        .map((t) => `testimonial from ${t.authorName}`),
      ...captionsFor.map(() => 'a video, as its captions'),
    ];
  }

  private async find(id: string) {
    const media = await this.db.media.findUnique({ where: { id } });
    if (!media) {
      throw new NotFoundException({
        status: 404,
        message: 'That file no longer exists.',
        code: 'MEDIA_NOT_FOUND',
      } satisfies ApiError);
    }
    return media;
  }
}

function toAdminMedia(row: {
  id: string;
  kind: AdminMedia['kind'];
  url: string;
  storageKey: string | null;
  mimeType: string;
  sizeBytes: number | null;
  width: number | null;
  height: number | null;
  alt: string;
  captionsId: string | null;
  createdAt: Date;
}): AdminMedia {
  return { ...row, createdAt: row.createdAt.toISOString() };
}
