import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import {
  adminMessageStatusSchema,
  contactMessageStatusSchema,
  type ApiError,
  type ApiSuccess,
  type ContactMessageStatus,
  type ContactTopic,
} from '@repo/shared';
import { PrismaService } from '../../prisma/prisma.service.js';
import { createZodDto } from '../../validation/zod-dto.js';
import { AdminSecretGuard, AdminSessionGuard } from '../auth/admin-guards.js';

class StatusDto extends createZodDto(adminMessageStatusSchema) {}
class IdParams extends createZodDto(z.strictObject({ id: z.uuid() })) {}
class ListQuery extends createZodDto(
  z.strictObject({ status: contactMessageStatusSchema.optional() }),
) {}

export type InboxMessage = {
  id: string;
  name: string;
  email: string;
  topic: ContactTopic | null;
  message: string;
  status: ContactMessageStatus;
  createdAt: string;
};

export type Inbox = {
  messages: InboxMessage[];
  counts: Record<ContactMessageStatus, number>;
};

const notFound = () =>
  new NotFoundException({
    status: 404,
    message: 'That message no longer exists.',
    code: 'MESSAGE_NOT_FOUND',
  } satisfies ApiError);

// Contact messages, newest first. The keyed IP hash stays in the database:
// it's for spotting abuse, the inbox has no use for it
@Controller('admin/messages')
@UseGuards(AdminSecretGuard, AdminSessionGuard)
export class AdminInboxController {
  constructor(private readonly db: PrismaService) {}

  @Get()
  async list(@Query() { status }: ListQuery): Promise<ApiSuccess<Inbox>> {
    const [rows, grouped] = await this.db.$transaction([
      this.db.contactMessage.findMany({
        where: status ? { status } : { status: { not: 'ARCHIVED' } },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          topic: true,
          message: true,
          status: true,
          createdAt: true,
        },
      }),
      this.db.contactMessage.groupBy({
        by: ['status'],
        _count: { _all: true },
        orderBy: { status: 'asc' },
      }),
    ]);
    const counts = { NEW: 0, READ: 0, ARCHIVED: 0 };
    for (const group of grouped) {
      counts[group.status] = (group._count as { _all: number })._all;
    }
    return {
      status: 200,
      data: {
        messages: rows.map((row) => ({
          ...row,
          createdAt: row.createdAt.toISOString(),
        })),
        counts,
      },
      message: 'Fetched.',
      code: 'ADMIN_INBOX',
    };
  }

  @Put(':id/status')
  async setStatus(
    @Param() { id }: IdParams,
    @Body() { status }: StatusDto,
  ): Promise<ApiSuccess<null>> {
    const { count } = await this.db.contactMessage.updateMany({
      where: { id },
      data: { status },
    });
    if (count === 0) throw notFound();
    return {
      status: 200,
      data: null,
      message: 'Saved.',
      code: 'ADMIN_MESSAGE_SAVED',
    };
  }

  @Delete(':id')
  async remove(@Param() { id }: IdParams): Promise<ApiSuccess<null>> {
    const { count } = await this.db.contactMessage.deleteMany({
      where: { id },
    });
    if (count === 0) throw notFound();
    return {
      status: 200,
      data: null,
      message: 'Deleted.',
      code: 'ADMIN_MESSAGE_DELETED',
    };
  }
}
