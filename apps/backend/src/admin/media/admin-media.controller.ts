import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import {
  adminMediaCreateSchema,
  adminMediaUpdateSchema,
  type ApiSuccess,
} from '@repo/shared';
import { createZodDto } from '../../validation/zod-dto.js';
import { AdminSecretGuard, AdminSessionGuard } from '../auth/admin-guards.js';
import { AdminMediaService, type AdminMedia } from './admin-media.service.js';

class MediaCreateDto extends createZodDto(adminMediaCreateSchema) {}
class MediaUpdateDto extends createZodDto(adminMediaUpdateSchema) {}
class IdParams extends createZodDto(z.strictObject({ id: z.uuid() })) {}

// Records of uploaded files. The files themselves go straight from the
// browser to object storage, so no upload ever passes through this API (and
// no multipart parsing happens here at all)
@Controller('admin/media')
@UseGuards(AdminSecretGuard, AdminSessionGuard)
export class AdminMediaController {
  constructor(private readonly media: AdminMediaService) {}

  @Get()
  async list(): Promise<ApiSuccess<AdminMedia[]>> {
    return {
      status: 200,
      data: await this.media.list(),
      message: 'Fetched.',
      code: 'ADMIN_MEDIA',
    };
  }

  @Post()
  async create(@Body() body: MediaCreateDto): Promise<ApiSuccess<AdminMedia>> {
    return {
      status: 201,
      data: await this.media.create(body),
      message: 'Added.',
      code: 'ADMIN_MEDIA_CREATED',
    };
  }

  @Put(':id')
  async update(
    @Param() { id }: IdParams,
    @Body() body: MediaUpdateDto,
  ): Promise<ApiSuccess<AdminMedia>> {
    return {
      status: 200,
      data: await this.media.update(id, body),
      message: 'Saved.',
      code: 'ADMIN_MEDIA_SAVED',
    };
  }

  @Delete(':id')
  async remove(@Param() { id }: IdParams): Promise<ApiSuccess<AdminMedia>> {
    return {
      status: 200,
      data: await this.media.remove(id),
      message: 'Deleted.',
      code: 'ADMIN_MEDIA_DELETED',
    };
  }
}
