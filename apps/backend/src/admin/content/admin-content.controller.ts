import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import {
  adminCollectionSchema,
  adminReorderSchema,
  adminVisibilitySchema,
  type ApiSuccess,
} from '@repo/shared';
import { createZodDto } from '../../validation/zod-dto.js';
import { AdminSecretGuard, AdminSessionGuard } from '../auth/admin-guards.js';
import {
  AdminContentService,
  type AdminChange,
  type AdminItem,
} from './admin-content.service.js';

class CollectionParams extends createZodDto(
  z.strictObject({ collection: adminCollectionSchema }),
) {}
class ItemParams extends createZodDto(
  z.strictObject({ collection: adminCollectionSchema, id: z.uuid() }),
) {}
class ReorderDto extends createZodDto(adminReorderSchema) {}
class VisibilityDto extends createZodDto(adminVisibilitySchema) {}

// The body's schema depends on the collection in the URL, so the pipe only
// checks it's an object here and the service checks it against that
// collection's strict schema
class ContentBody extends createZodDto(z.record(z.string(), z.unknown())) {}

const ok = <T>(data: T, message: string, code: string): ApiSuccess<T> => ({
  status: 200,
  data,
  message,
  code,
});

@Controller('admin/collections/:collection')
@UseGuards(AdminSecretGuard, AdminSessionGuard)
export class AdminContentController {
  constructor(private readonly content: AdminContentService) {}

  @Get()
  async list(
    @Param() { collection }: CollectionParams,
  ): Promise<ApiSuccess<AdminItem[]>> {
    return ok(await this.content.list(collection), 'Fetched.', 'ADMIN_ITEMS');
  }

  @Post()
  async create(
    @Param() { collection }: CollectionParams,
    @Body() body: ContentBody,
  ): Promise<ApiSuccess<AdminChange>> {
    return {
      ...ok(
        await this.content.create(collection, body),
        'Created as a draft.',
        'ADMIN_ITEM_CREATED',
      ),
      status: 201,
    };
  }

  @Post('reorder')
  @HttpCode(200)
  async reorder(
    @Param() { collection }: CollectionParams,
    @Body() { ids }: ReorderDto,
  ): Promise<ApiSuccess<AdminItem[]>> {
    return ok(
      await this.content.reorder(collection, ids),
      'Reordered.',
      'ADMIN_REORDERED',
    );
  }

  @Get(':id')
  async get(
    @Param() { collection, id }: ItemParams,
  ): Promise<ApiSuccess<AdminItem>> {
    return ok(await this.content.get(collection, id), 'Fetched.', 'ADMIN_ITEM');
  }

  @Put(':id')
  async update(
    @Param() { collection, id }: ItemParams,
    @Body() body: ContentBody,
  ): Promise<ApiSuccess<AdminChange>> {
    return ok(
      await this.content.update(collection, id, body),
      'Saved.',
      'ADMIN_ITEM_SAVED',
    );
  }

  @Post(':id/publish')
  @HttpCode(200)
  async publish(
    @Param() { collection, id }: ItemParams,
  ): Promise<ApiSuccess<AdminChange>> {
    return ok(
      await this.content.publish(collection, id),
      'Published.',
      'ADMIN_ITEM_PUBLISHED',
    );
  }

  @Post(':id/unpublish')
  @HttpCode(200)
  async unpublish(
    @Param() { collection, id }: ItemParams,
  ): Promise<ApiSuccess<AdminChange>> {
    return ok(
      await this.content.unpublish(collection, id),
      'Unpublished.',
      'ADMIN_ITEM_UNPUBLISHED',
    );
  }

  @Post(':id/discard')
  @HttpCode(200)
  async discard(
    @Param() { collection, id }: ItemParams,
  ): Promise<ApiSuccess<AdminChange>> {
    return ok(
      await this.content.discardDraft(collection, id),
      'Draft discarded.',
      'ADMIN_DRAFT_DISCARDED',
    );
  }

  @Put(':id/visibility')
  async visibility(
    @Param() { collection, id }: ItemParams,
    @Body() { visible }: VisibilityDto,
  ): Promise<ApiSuccess<AdminChange>> {
    return ok(
      await this.content.setVisible(collection, id, visible),
      visible ? 'Shown.' : 'Hidden.',
      'ADMIN_VISIBILITY',
    );
  }

  @Delete(':id')
  async remove(
    @Param() { collection, id }: ItemParams,
  ): Promise<ApiSuccess<AdminChange>> {
    return ok(
      await this.content.remove(collection, id),
      'Deleted.',
      'ADMIN_ITEM_DELETED',
    );
  }
}
