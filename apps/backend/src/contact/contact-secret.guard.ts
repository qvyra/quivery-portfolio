import { createHash, timingSafeEqual } from 'node:crypto';
import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import type { ApiError } from '@repo/shared';
import type { Env } from '../config/env.js';

export const CONTACT_SECRET_HEADER = 'x-contact-secret';

// constant-time compare, hashing first makes the lengths equal
function matches(given: string, expected: string) {
  const digest = (value: string) => createHash('sha256').update(value).digest();
  return timingSafeEqual(digest(given), digest(expected));
}

/**
 * Contact submissions only come from the site's server, which adds the shared
 * secret. Browsers never see it, so a direct POST to the API is refused, and
 * the client IP the site forwards can be trusted
 */
@Injectable()
export class ContactSecretGuard implements CanActivate {
  constructor(private readonly config: ConfigService<Env, true>) {}

  canActivate(context: ExecutionContext): boolean {
    const expected = this.config.get('CONTACT_API_SECRET', { infer: true });
    if (!expected) {
      throw new ServiceUnavailableException({
        status: 503,
        message: 'The contact form is not set up on this server.',
        code: 'CONTACT_DISABLED',
      } satisfies ApiError);
    }

    const given = context
      .switchToHttp()
      .getRequest<Request>()
      .header(CONTACT_SECRET_HEADER);
    if (!given || !matches(given, expected)) {
      throw new UnauthorizedException({
        status: 401,
        message: 'Contact messages have to come through the site.',
        code: 'CONTACT_UNAUTHORIZED',
      } satisfies ApiError);
    }
    return true;
  }
}
