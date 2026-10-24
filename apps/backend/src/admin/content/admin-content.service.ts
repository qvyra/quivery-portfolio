import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  adminContentSchemas,
  type AdminCollection,
  type ApiError,
  type PublishStatus,
} from '@repo/shared';
import { z } from 'zod';
import type { Env } from '../../config/env.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ZodValidationException } from '../../validation/zod-validation.exception.js';
import { SiteUpdates, type DeployOutcome } from '../site-updates.js';
import { toColumns } from '../../content/drafts.js';
import { Prisma } from '../../generated/prisma/client.js';
import { delegateFor, toContent, type ContentRow } from './collections.js';

/** One item as the admin sees it: live content, state, and any draft */
export type AdminItem = {
  id: string;
  publishStatus: PublishStatus;
  visible: boolean;
  sortOrder: number;
  updatedAt: string;
  content: Record<string, unknown>;
  /** Unpublished edits to a published item, null when there are none */
  draft: Record<string, unknown> | null;
};

export type AdminChange = {
  item: AdminItem | null;
  /** Set when the change needed a deploy (project URLs changed) */
  deploy?: DeployOutcome;
};

const ordered = [{ sortOrder: 'asc' }, { createdAt: 'asc' }];

@Injectable()
export class AdminContentService {
  constructor(
    private readonly db: PrismaService,
    private readonly site: SiteUpdates,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async list(collection: AdminCollection): Promise<AdminItem[]> {
    const rows = await delegateFor(this.db, collection).findMany({
      orderBy: ordered,
    });
    return rows.map((row) => this.toItem(collection, row));
  }

  async get(collection: AdminCollection, id: string): Promise<AdminItem> {
    return this.toItem(collection, await this.find(collection, id));
  }

  /** New items start unpublished, at the end of the list */
  async create(
    collection: AdminCollection,
    body: unknown,
  ): Promise<AdminChange> {
    const content = this.validate(collection, body);
    const delegate = delegateFor(this.db, collection);
    const { _max } = await delegate.aggregate({ _max: { sortOrder: true } });
    const row = await delegate.create({
      data: {
        ...toColumns(content),
        publishStatus: 'DRAFT',
        sortOrder: (_max.sortOrder ?? -1) + 1,
      },
    });
    return { item: this.toItem(collection, row) };
  }

  /**
   * Saves an edit. A published item (or one with a draft already) keeps its
   * live content and gets the edit as a draft, so nothing changes on the site
   * until it's published. An unpublished item is edited in place
   */
  async update(
    collection: AdminCollection,
    id: string,
    body: unknown,
  ): Promise<AdminChange> {
    const content = this.validate(collection, body);
    const row = await this.find(collection, id);
    const asDraft = row.publishStatus === 'PUBLISHED' || row.draft !== null;
    const updated = await delegateFor(this.db, collection).update({
      where: { id },
      data: asDraft ? { draft: content } : toColumns(content),
    });
    return { item: this.toItem(collection, updated) };
  }

  /** Puts the item live, applying its draft if it has one */
  async publish(collection: AdminCollection, id: string): Promise<AdminChange> {
    const row = await this.find(collection, id);
    const draft =
      row.draft === null ? {} : toColumns(this.storedDraft(collection, row));
    return this.change(collection, id, {
      ...draft,
      // DbNull, a real NULL: a plain null on a Json column is stored as JSON
      // null, which SQL counts as a value (draft IS NOT NULL)
      draft: Prisma.DbNull,
      publishStatus: 'PUBLISHED',
    });
  }

  /** Takes the item off the site. Its content and any draft are kept */
  async unpublish(
    collection: AdminCollection,
    id: string,
  ): Promise<AdminChange> {
    await this.find(collection, id);
    return this.change(collection, id, { publishStatus: 'DRAFT' });
  }

  async discardDraft(
    collection: AdminCollection,
    id: string,
  ): Promise<AdminChange> {
    await this.find(collection, id);
    const row = await delegateFor(this.db, collection).update({
      where: { id },
      data: { draft: Prisma.DbNull },
    });
    return { item: this.toItem(collection, row) };
  }

  async setVisible(
    collection: AdminCollection,
    id: string,
    visible: boolean,
  ): Promise<AdminChange> {
    await this.find(collection, id);
    return this.change(collection, id, { visible });
  }

  /** The whole collection's new order. Every id has to be there, once */
  async reorder(
    collection: AdminCollection,
    ids: string[],
  ): Promise<AdminItem[]> {
    const delegate = delegateFor(this.db, collection);
    const rows = await delegate.findMany({ select: { id: true } });
    const known = new Set(rows.map((row) => row.id));
    if (ids.length !== known.size || ids.some((id) => !known.has(id))) {
      throw new ZodValidationException(
        new z.ZodError([
          {
            code: 'custom',
            path: ['ids'],
            message: 'The order has to list every item exactly once',
            input: ids,
          },
        ]),
      );
    }
    await this.db.$transaction(
      ids.map((id, sortOrder) =>
        delegate.update({ where: { id }, data: { sortOrder } }),
      ) as never,
    );
    this.site.refresh();
    return this.list(collection);
  }

  async remove(collection: AdminCollection, id: string): Promise<AdminChange> {
    const row = await this.find(collection, id);
    const before = await this.liveProjectUrls(collection);
    await delegateFor(this.db, collection).delete({ where: { id } });
    if (row.publishStatus === 'PUBLISHED') this.site.refresh();
    return {
      item: null,
      deploy: await this.deployIfUrlsChanged(collection, before),
    };
  }

  // Any change that can show on the site: refresh the pages, and deploy when
  // the set of live project URLs changed
  private async change(
    collection: AdminCollection,
    id: string,
    data: object,
  ): Promise<AdminChange> {
    const before = await this.liveProjectUrls(collection);
    const row = await delegateFor(this.db, collection).update({
      where: { id },
      data,
    });
    this.site.refresh();
    return {
      item: this.toItem(collection, row),
      deploy: await this.deployIfUrlsChanged(collection, before),
    };
  }

  private async deployIfUrlsChanged(
    collection: AdminCollection,
    before: string | null,
  ): Promise<DeployOutcome | undefined> {
    if (before === null) return undefined;
    const after = await this.liveProjectUrls(collection);
    return after === before
      ? undefined
      : this.site.deploy('the published project pages changed');
  }

  // the project slugs the public site serves, mirroring PublicContentService
  private async liveProjectUrls(
    collection: AdminCollection,
  ): Promise<string | null> {
    if (collection !== 'projects') return null;
    const production =
      this.config.get('NODE_ENV', { infer: true }) === 'production';
    const rows = await this.db.project.findMany({
      where: {
        publishStatus: 'PUBLISHED',
        visible: true,
        ...(production && { isPlaceholder: false }),
      },
      select: { slug: true },
    });
    return rows
      .map((row) => row.slug)
      .sort()
      .join(',');
  }

  private validate(collection: AdminCollection, body: unknown) {
    const result = adminContentSchemas[collection].safeParse(body);
    if (!result.success) throw new ZodValidationException(result.error);
    return result.data as Record<string, unknown>;
  }

  // a stored draft is re-checked before it goes live: a schema can tighten
  // between saving a draft and publishing it
  private storedDraft(collection: AdminCollection, row: ContentRow) {
    return this.validate(collection, row.draft);
  }

  private async find(
    collection: AdminCollection,
    id: string,
  ): Promise<ContentRow> {
    const row = await delegateFor(this.db, collection).findUnique({
      where: { id },
    });
    if (!row) {
      throw new NotFoundException({
        status: 404,
        message: 'That item no longer exists.',
        code: 'ADMIN_ITEM_NOT_FOUND',
      } satisfies ApiError);
    }
    return row;
  }

  private toItem(collection: AdminCollection, row: ContentRow): AdminItem {
    return {
      id: row.id,
      publishStatus: row.publishStatus,
      visible: row.visible,
      sortOrder: row.sortOrder,
      updatedAt: row.updatedAt.toISOString(),
      content: toContent(collection, row),
      draft:
        row.draft && typeof row.draft === 'object'
          ? (row.draft as Record<string, unknown>)
          : null,
    };
  }
}
