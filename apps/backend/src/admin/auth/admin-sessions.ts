import { createHash, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

/** An idle session ends after 30 minutes, any session after 8 hours */
export const SESSION_IDLE_MS = 30 * 60 * 1000;
export const SESSION_MAX_MS = 8 * 60 * 60 * 1000;

// lastUsedAt is written at most once a minute, not on every request
const TOUCH_EVERY_MS = 60 * 1000;

const hashToken = (token: string) =>
  createHash('sha256').update(token).digest('hex');

export type AdminIdentity = {
  sessionId: string;
  userId: string;
  username: string;
  expiresAt: Date;
};

/**
 * Admin sessions live in the database, so signing out or changing the
 * password ends them for real, and the API can be restarted or asleep without
 * losing them. The browser holds the token (in an httpOnly cookie on the
 * site), the database only its SHA-256
 */
@Injectable()
export class AdminSessions {
  constructor(private readonly db: PrismaService) {}

  async start(userId: string): Promise<{ token: string; expiresAt: Date }> {
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + SESSION_MAX_MS);
    await this.db.$transaction([
      // tidy up while we're here, expired rows are useless
      this.db.adminSession.deleteMany({
        where: { expiresAt: { lt: new Date() } },
      }),
      this.db.adminSession.create({
        data: { tokenHash: hashToken(token), userId, expiresAt },
      }),
    ]);
    return { token, expiresAt };
  }

  /** The session behind a token, or null if it's unknown, idle or expired */
  async resume(token: string): Promise<AdminIdentity | null> {
    const session = await this.db.adminSession.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { user: { select: { username: true } } },
    });
    if (!session) return null;

    const now = Date.now();
    if (
      session.expiresAt.getTime() <= now ||
      session.lastUsedAt.getTime() + SESSION_IDLE_MS <= now
    ) {
      await this.db.adminSession
        .delete({ where: { id: session.id } })
        .catch(() => {
          // already gone
        });
      return null;
    }
    if (now - session.lastUsedAt.getTime() > TOUCH_EVERY_MS) {
      await this.db.adminSession.update({
        where: { id: session.id },
        data: { lastUsedAt: new Date(now) },
      });
    }
    return {
      sessionId: session.id,
      userId: session.userId,
      username: session.user.username,
      expiresAt: session.expiresAt,
    };
  }

  async end(sessionId: string) {
    await this.db.adminSession.deleteMany({ where: { id: sessionId } });
  }
}
