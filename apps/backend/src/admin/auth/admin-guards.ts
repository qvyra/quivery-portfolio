import {
  createParamDecorator,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import type { ApiError } from '@repo/shared';
import { secretMatches } from '../../common/secret.js';
import type { Env } from '../../config/env.js';
import { AdminSessions, type AdminIdentity } from './admin-sessions.js';

export const ADMIN_SECRET_HEADER = 'x-admin-secret';
export const ADMIN_SESSION_HEADER = 'x-admin-session';

type AdminRequest = Request & { admin?: AdminIdentity };

/**
 * Every admin route only answers the site's server, which adds this secret.
 * It's its own secret, not the contact form's, so leaking one doesn't open the
 * other. This, not the hidden /admin URL, is what keeps the admin closed
 */
@Injectable()
export class AdminSecretGuard implements CanActivate {
  constructor(private readonly config: ConfigService<Env, true>) {}

  canActivate(context: ExecutionContext): boolean {
    const expected = this.config.get('ADMIN_API_SECRET', { infer: true });
    if (!expected) {
      throw new ServiceUnavailableException({
        status: 503,
        message: 'The admin is not set up on this server.',
        code: 'ADMIN_DISABLED',
      } satisfies ApiError);
    }
    const given = context
      .switchToHttp()
      .getRequest<Request>()
      .header(ADMIN_SECRET_HEADER);
    if (!secretMatches(given, expected)) {
      throw new UnauthorizedException({
        status: 401,
        message: 'Admin requests have to come through the site.',
        code: 'ADMIN_UNAUTHORIZED',
      } satisfies ApiError);
    }
    return true;
  }
}

/** The signed-in admin, from the session token the site forwards */
@Injectable()
export class AdminSessionGuard implements CanActivate {
  constructor(private readonly sessions: AdminSessions) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AdminRequest>();
    const token = request.header(ADMIN_SESSION_HEADER);
    const identity = token ? await this.sessions.resume(token) : null;
    if (!identity) {
      throw new UnauthorizedException({
        status: 401,
        message: 'Your session has ended. Sign in again.',
        code: 'ADMIN_SESSION_EXPIRED',
      } satisfies ApiError);
    }
    request.admin = identity;
    return true;
  }
}

/** The identity AdminSessionGuard attached to the request */
export const CurrentAdmin = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AdminIdentity => {
    const identity = context.switchToHttp().getRequest<AdminRequest>().admin;
    if (!identity) {
      throw new Error('CurrentAdmin used without AdminSessionGuard');
    }
    return identity;
  },
);
