import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  type ExecutionContext,
} from '@nestjs/common';
import {
  normalizeIp,
  ThrottlerGuard,
  type ThrottlerLimitDetail,
} from '@nestjs/throttler';
import type { Request } from 'express';
import { z } from 'zod';
import type { ApiError } from '@repo/shared';
import { PrismaService } from '../prisma/prisma.service.js';
import { clientIp } from './client-ip.js';

export const RATE_LIMITED: ApiError = {
  status: 429,
  message:
    "That's a lot of messages from one connection. Try again in a while, or use one of the other ways to reach me on this page.",
  code: 'CONTACT_RATE_LIMITED',
};

/**
 * Per visitor limits (see ContactModule), keyed on the forwarded client IP.
 * A retry of a message that's already stored is let through, so it gets its
 * original success back instead of a 429
 */
@Injectable()
export class ContactThrottlerGuard extends ThrottlerGuard {
  // property injection, so the base class constructor stays as it is
  @Inject(PrismaService) private readonly prisma!: PrismaService;

  protected override getTracker(req: Record<string, unknown>): Promise<string> {
    return Promise.resolve(normalizeIp(clientIp(req as unknown as Request)));
  }

  protected override async shouldSkip(
    context: ExecutionContext,
  ): Promise<boolean> {
    const body: unknown = context.switchToHttp().getRequest<Request>().body;
    const key = z.object({ idempotencyKey: z.uuid() }).safeParse(body);
    if (!key.success) return false;

    const stored = await this.prisma.contactMessage.findUnique({
      where: { idempotencyKey: key.data.idempotencyKey },
      select: { id: true },
    });
    return stored !== null;
  }

  protected override throwThrottlingException(
    _context: ExecutionContext,
    _detail: ThrottlerLimitDetail,
  ): Promise<void> {
    throw new HttpException(RATE_LIMITED, HttpStatus.TOO_MANY_REQUESTS);
  }
}
