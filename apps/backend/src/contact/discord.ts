import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { contactTopicLabels, type ContactTopic } from '@repo/shared';
import type { Env } from '../config/env.js';

/** A stored contact message, as it's announced */
export type ContactNotice = {
  id: string;
  name: string;
  email: string;
  topic: ContactTopic | null;
  message: string;
  createdAt: Date;
};

// the logo's pink
const BRAND_COLOR = 0xe91a85;

// Discord's embed limits are 4096 for the description, 1024 per field value
// and 6000 for the whole embed. These leave room for everything else
const LIMITS = { message: 3500, name: 200, email: 600 };

/** Visitor text shown as typed: every markdown character is escaped */
export const escapeMarkdown = (text: string) =>
  text.replace(/[\\*_~`|>#\-[\]()<]/g, '\\$&');

/**
 * Cuts text to `max` characters with an ellipsis, without leaving half of an
 * escape behind: a trailing lone backslash would escape the ellipsis
 */
export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  let cut = text.slice(0, max - 1);
  const trailing = /\\+$/.exec(cut)?.[0].length ?? 0;
  if (trailing % 2 === 1) cut = cut.slice(0, -1);
  return `${cut}…`;
}

/**
 * The webhook body for a new message. allowed_mentions with an empty parse
 * list means nothing in it can ping anyone, whatever a visitor writes:
 * @everyone, @here, roles or users
 */
export function buildDiscordPayload(notice: ContactNotice) {
  const field = (name: string, value: string, max: number) => ({
    name,
    value: truncate(escapeMarkdown(value), max),
    inline: true,
  });

  return {
    username: 'Quivery contact',
    allowed_mentions: { parse: [] as string[] },
    embeds: [
      {
        title: 'New contact message',
        description: truncate(escapeMarkdown(notice.message), LIMITS.message),
        color: BRAND_COLOR,
        fields: [
          field('From', notice.name, LIMITS.name),
          field('Email', notice.email, LIMITS.email),
          {
            name: 'Topic',
            value: notice.topic
              ? contactTopicLabels[notice.topic]
              : 'Not given',
            inline: true,
          },
        ],
        footer: { text: `Message ${notice.id}` },
        timestamp: notice.createdAt.toISOString(),
      },
    ],
  };
}

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Announces stored messages on Discord. Runs after the reply has gone out and
 * never throws: the message is already safe in the database, so a Discord
 * outage only costs the announcement. The webhook URL is a secret and never
 * appears in a log
 */
@Injectable()
export class DiscordNotifier implements OnModuleInit {
  private readonly logger = new Logger(DiscordNotifier.name);
  private readonly url: string | undefined;

  /** Waits between attempts, so three attempts in all */
  retryDelaysMs = [2_000, 10_000];

  constructor(config: ConfigService<Env, true>) {
    this.url = config.get('DISCORD_WEBHOOK_URL', { infer: true });
  }

  onModuleInit() {
    if (!this.url) {
      this.logger.warn(
        'DISCORD_WEBHOOK_URL is not set: contact messages are stored but not announced',
      );
    }
  }

  /** Fire and forget. Resolves once delivery has succeeded or given up */
  notify(notice: ContactNotice): Promise<void> {
    if (!this.url) return Promise.resolve();
    return this.deliver(this.url, notice).catch(() => {
      // deliver handles its own failures, this only guards the promise
    });
  }

  private async deliver(url: string, notice: ContactNotice) {
    const body = JSON.stringify(buildDiscordPayload(notice));
    const attempts = this.retryDelaysMs.length + 1;
    let failure = 'unknown error';

    for (let attempt = 1; attempt <= attempts; attempt++) {
      let wait = this.retryDelaysMs[attempt - 1] ?? 0;
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body,
          signal: AbortSignal.timeout(10_000),
        });
        if (response.ok) {
          this.logger.log(
            `Announced contact message ${notice.id} on Discord (${response.status}, mentions disabled)`,
          );
          return;
        }
        failure = `HTTP ${response.status}`;
        if (response.status === 429) {
          // Discord says how long to back off, in seconds
          const { retry_after } = (await response.json().catch(() => ({}))) as {
            retry_after?: number;
          };
          if (typeof retry_after === 'number') {
            wait = Math.min(Math.ceil(retry_after * 1000), 30_000);
          }
        } else if (response.status < 500) {
          // a bad or deleted webhook won't fix itself on a retry
          break;
        }
      } catch (error) {
        // the name or code only: a fetch error's message can include the URL
        const cause = (error as { cause?: { code?: string } }).cause;
        failure = cause?.code ?? (error as Error).name;
      }
      if (attempt < attempts) await sleep(wait);
    }

    this.logger.error(
      `Couldn't announce contact message ${notice.id} on Discord (${failure}). It's stored, nothing is lost`,
    );
  }
}
