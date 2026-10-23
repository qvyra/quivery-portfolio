import { Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.js';
import {
  buildDiscordPayload,
  DiscordNotifier,
  escapeMarkdown,
  truncate,
  type ContactNotice,
} from './discord.js';

const notice: ContactNotice = {
  id: '0b8f3c1e-6d2a-4f7b-9a51-3e2c8d4f6a10',
  name: 'Ada',
  email: 'ada@example.com',
  topic: 'COMMISSION',
  message: 'Hello there',
  createdAt: new Date('2026-10-23T12:00:00.000Z'),
};

describe('buildDiscordPayload', () => {
  it('disables every mention, whatever the message says', () => {
    const payload = buildDiscordPayload({
      ...notice,
      name: '@everyone',
      message: '@here <@&123> <@456> ping!',
    });
    expect(payload.allowed_mentions).toEqual({ parse: [] });
  });

  it('builds one embed in the brand colour with the topic, sender and time', () => {
    const [embed] = buildDiscordPayload(notice).embeds;
    expect(embed).toMatchObject({
      title: 'New contact message',
      description: 'Hello there',
      color: 0xe91a85,
      timestamp: '2026-10-23T12:00:00.000Z',
      fields: [
        { name: 'From', value: 'Ada' },
        { name: 'Email', value: 'ada@example.com' },
        { name: 'Topic', value: 'Commission' },
      ],
    });
  });

  it('says when no topic was picked', () => {
    const [embed] = buildDiscordPayload({ ...notice, topic: null }).embeds;
    expect(embed?.fields[2]?.value).toBe('Not given');
  });

  it('escapes markdown in everything a visitor typed', () => {
    const [embed] = buildDiscordPayload({
      ...notice,
      name: '**Boss**',
      email: 'a_b@example.com',
      message: '# Big\n> quote `code` ||spoiler|| [link](https://x.dev)',
    }).embeds;
    expect(embed?.fields[0]?.value).toBe('\\*\\*Boss\\*\\*');
    expect(embed?.fields[1]?.value).toBe('a\\_b@example.com');
    expect(embed?.description).toBe(
      '\\# Big\n\\> quote \\`code\\` \\|\\|spoiler\\|\\| \\[link\\]\\(https://x.dev\\)',
    );
  });

  it('keeps a 5000 character message inside the embed limits', () => {
    const [embed] = buildDiscordPayload({
      ...notice,
      name: '*'.repeat(100),
      message: '_'.repeat(5000),
    }).embeds;
    expect(embed?.description.length).toBeLessThanOrEqual(4096);
    expect(embed?.fields.every((f) => f.value.length <= 1024)).toBe(true);
    const total =
      embed!.title.length +
      embed!.description.length +
      embed!.footer.text.length +
      embed!.fields.reduce((n, f) => n + f.name.length + f.value.length, 0);
    expect(total).toBeLessThanOrEqual(6000);
  });
});

describe('escapeMarkdown and truncate', () => {
  it('escapes backslashes too, so they cannot cancel an escape', () => {
    expect(escapeMarkdown('\\*')).toBe('\\\\\\*');
  });

  it('never ends a cut on half an escape', () => {
    // cut at 4 would leave "abc\" and the ellipsis would be escaped
    expect(truncate('abc\\*def', 5)).toBe('abc…');
    // a whole escape just before the cut stays
    expect(truncate('ab\\*cdef', 5)).toBe('ab\\*…');
    expect(truncate('ab\\\\cdef', 5)).toBe('ab\\\\…');
    expect(truncate('short', 10)).toBe('short');
  });
});

describe('DiscordNotifier', () => {
  const url = 'https://discord.com/api/webhooks/1/secret-token';
  const configWith = (webhook: string | undefined) =>
    ({ get: () => webhook }) as unknown as ConfigService<Env, true>;

  let fetchMock: ReturnType<typeof vi.spyOn>;
  let logs: string[];

  beforeEach(() => {
    fetchMock = vi.spyOn(globalThis, 'fetch');
    logs = [];
    for (const level of ['log', 'warn', 'error'] as const) {
      vi.spyOn(Logger.prototype, level).mockImplementation((message) => {
        logs.push(String(message));
      });
    }
  });

  afterEach(() => vi.restoreAllMocks());

  const notifier = (webhook: string | undefined) => {
    const n = new DiscordNotifier(configWith(webhook));
    n.retryDelaysMs = [0, 0];
    return n;
  };

  it('posts the payload once when Discord accepts it', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    await notifier(url).notify(notice);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [calledUrl, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(calledUrl).toBe(url);
    expect(JSON.parse(init.body as string)).toEqual(
      JSON.parse(JSON.stringify(buildDiscordPayload(notice))),
    );
  });

  it('retries twice on errors, then logs without the URL and never throws', async () => {
    fetchMock.mockRejectedValue(
      Object.assign(new TypeError(`fetch failed for ${url}`), {
        cause: { code: 'ECONNRESET' },
      }),
    );
    await expect(notifier(url).notify(notice)).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(logs.at(-1)).toMatch(/Couldn't announce .* \(ECONNRESET\)/);
    expect(logs.join('\n')).not.toContain('secret-token');
  });

  it('retries a 5xx but gives up on a 404 straight away', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 503 }));
    await notifier(url).notify(notice);
    expect(fetchMock).toHaveBeenCalledTimes(3);

    fetchMock.mockClear();
    fetchMock.mockResolvedValue(new Response(null, { status: 404 }));
    await notifier(url).notify(notice);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does nothing without a webhook, after one startup warning', async () => {
    const n = notifier(undefined);
    n.onModuleInit();
    await n.notify(notice);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(logs).toEqual([
      'DISCORD_WEBHOOK_URL is not set: contact messages are stored but not announced',
    ]);
  });
});
