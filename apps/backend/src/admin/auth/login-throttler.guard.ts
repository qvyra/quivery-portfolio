import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { normalizeIp, ThrottlerGuard } from '@nestjs/throttler';
import type { Request } from 'express';
import type { ApiError } from '@repo/shared';
import { clientIp } from '../../common/client-ip.js';

const MINUTE = 60 * 1000;

/**
 * Login attempts: 5 per 15 minutes from one address, and 30 an hour from
 * everywhere together, so guessing from many addresses is slow too. On top of
 * that every attempt costs a deliberately slow scrypt hash
 */
export const LOGIN_RATE_LIMITS = [
  { name: 'loginPerIp', ttl: 15 * MINUTE, limit: 5 },
  {
    name: 'loginTotal',
    ttl: 60 * MINUTE,
    limit: 30,
    getTracker: () => 'all',
  },
];

@Injectable()
export class LoginThrottlerGuard extends ThrottlerGuard {
  // behind AdminSecretGuard, so the IP the site forwards can be trusted
  protected override getTracker(req: Record<string, unknown>): Promise<string> {
    return Promise.resolve(normalizeIp(clientIp(req as unknown as Request)));
  }

  protected override throwThrottlingException(): Promise<void> {
    throw new HttpException(
      {
        status: 429,
        message: 'Too many sign-in attempts. Wait a few minutes and try again.',
        code: 'ADMIN_LOGIN_RATE_LIMITED',
      } satisfies ApiError,
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
