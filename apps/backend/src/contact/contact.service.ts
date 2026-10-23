import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';
import type { contactSubmissionSchema } from '@repo/shared';
import type { Env } from '../config/env.js';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { DAILY_LIMIT } from './contact.limits.js';
import { RATE_LIMITED } from './contact-throttler.guard.js';
import { DiscordNotifier } from './discord.js';
import { hashIp } from './ip-hash.js';
import { botSignal } from './spam.js';

type Submission = z.output<typeof contactSubmissionSchema>;

/** What happened to a submission. The visitor sees the same success for all */
export type ContactOutcome = 'stored' | 'duplicate' | 'dropped';

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifier: DiscordNotifier,
    private readonly config: ConfigService<Env, true>,
  ) {}

  /**
   * Stores first and announces after: once this resolves the message is safe,
   * and Discord can't make it fail
   */
  async submit(submission: Submission, ip: string): Promise<ContactOutcome> {
    const signal = botSignal(submission);
    if (signal) {
      this.logger.log(
        `Dropped a contact submission that looked automated (${signal})`,
      );
      return 'dropped';
    }

    const { idempotencyKey } = submission;
    if (await this.isStored(idempotencyKey)) return 'duplicate';

    // ContactSecretGuard has checked the secret is set before this runs
    const ipHash = hashIp(
      ip,
      this.config.get('CONTACT_API_SECRET', { infer: true })!,
    );
    const today = await this.prisma.contactMessage.count({
      where: {
        ipHash,
        createdAt: { gte: new Date(Date.now() - DAILY_LIMIT.ttl) },
      },
    });
    if (today >= DAILY_LIMIT.limit) {
      throw new HttpException(RATE_LIMITED, HttpStatus.TOO_MANY_REQUESTS);
    }

    let stored;
    try {
      stored = await this.prisma.contactMessage.create({
        data: {
          idempotencyKey,
          name: submission.name,
          email: submission.email,
          topic: submission.topic ?? null,
          message: submission.message,
          ipHash,
        },
      });
    } catch (error) {
      // the same draft sent twice at once: the other request stored it
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return 'duplicate';
      }
      throw error;
    }

    void this.notifier.notify(stored);
    return 'stored';
  }

  private async isStored(idempotencyKey: string) {
    const row = await this.prisma.contactMessage.findUnique({
      where: { idempotencyKey },
      select: { id: true },
    });
    return row !== null;
  }
}
