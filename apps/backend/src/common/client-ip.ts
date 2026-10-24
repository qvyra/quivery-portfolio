import { isIP } from 'node:net';
import type { Request } from 'express';

export const CLIENT_IP_HEADER = 'x-client-ip';

/**
 * The visitor's IP, which the site forwards from Vercel's own header. Only
 * read behind ContactSecretGuard, so nobody else can set it. Without it every
 * visitor would share the limits of one Vercel function's address
 */
export function clientIp(request: Request): string {
  const forwarded = request.header(CLIENT_IP_HEADER)?.trim();
  if (forwarded && isIP(forwarded)) return forwarded;
  return request.ip ?? request.socket.remoteAddress ?? 'unknown';
}
