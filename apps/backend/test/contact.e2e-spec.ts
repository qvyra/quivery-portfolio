import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { DiscordNotifier } from '../src/contact/discord.js';
import { Prisma } from '../src/generated/prisma/client.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

// the e2e config sets CONTACT_API_SECRET to this
const SECRET = 'e2e-contact-secret-0123456789abcdef';

type Row = {
  id: string;
  idempotencyKey: string;
  ipHash: string;
  createdAt: Date;
};

// the contact table in memory, with the unique key Postgres enforces
function fakeContactTable() {
  const rows: Row[] = [];
  return {
    rows,
    contactMessage: {
      findUnique: ({ where }: { where: { idempotencyKey: string } }) =>
        Promise.resolve(
          rows.find((r) => r.idempotencyKey === where.idempotencyKey) ?? null,
        ),
      count: ({
        where,
      }: {
        where: { ipHash: string; createdAt: { gte: Date } };
      }) =>
        Promise.resolve(
          rows.filter(
            (r) =>
              r.ipHash === where.ipHash && r.createdAt >= where.createdAt.gte,
          ).length,
        ),
      create: ({ data }: { data: Omit<Row, 'id' | 'createdAt'> }) => {
        if (rows.some((r) => r.idempotencyKey === data.idempotencyKey)) {
          return Promise.reject(
            new Prisma.PrismaClientKnownRequestError(
              'Unique constraint failed',
              {
                code: 'P2002',
                clientVersion: 'e2e',
              },
            ),
          );
        }
        const row = { ...data, id: randomUUID(), createdAt: new Date() };
        rows.push(row);
        return Promise.resolve(row);
      },
    },
  };
}

const submission = (overrides: Record<string, unknown> = {}) => ({
  name: 'Ada',
  email: 'ada@example.com',
  topic: 'COMMISSION',
  message: '[TEST] I would like a DataStore layer for my game.',
  idempotencyKey: randomUUID(),
  trap: '',
  elapsedMs: 20_000,
  ...overrides,
});

describe('POST /contact (e2e)', () => {
  let app: INestApplication;
  let table: ReturnType<typeof fakeContactTable>;
  let discord: ReturnType<typeof vi.spyOn>;

  const send = (
    body: object,
    {
      secret = SECRET,
      ip = '203.0.113.7',
    }: { secret?: string | null; ip?: string } = {},
  ) => {
    const req = request(app.getHttpServer())
      .post('/contact')
      .set('x-client-ip', ip)
      .send(body);
    return secret === null ? req : req.set('x-contact-secret', secret);
  };

  beforeEach(async () => {
    table = fakeContactTable();
    // never reaches Discord: the webhook in the e2e config is a dummy too
    discord = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(null, { status: 204 }));

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(table)
      .compile();
    app = moduleFixture.createNestApplication();
    configureApp(app);
    app.get(DiscordNotifier).retryDelaysMs = [0, 0];
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    vi.restoreAllMocks();
  });

  it('stores a valid message once and announces it with mentions off', async () => {
    const res = await send(submission()).expect(201);

    expect(res.body).toEqual({
      status: 201,
      data: null,
      message: "Thanks, your message is in. I'll reply by email.",
      code: 'CONTACT_RECEIVED',
    });
    expect(table.rows).toHaveLength(1);
    expect(table.rows[0]?.ipHash).toMatch(/^[0-9a-f]{64}$/);
    await vi.waitFor(() => expect(discord).toHaveBeenCalledTimes(1));
    const body = JSON.parse(
      (discord.mock.calls[0] as [string, RequestInit])[1].body as string,
    ) as { allowed_mentions: unknown };
    expect(body.allowed_mentions).toEqual({ parse: [] });
  });

  it('stores a message sent twice with the same key once, and answers both the same', async () => {
    const body = submission();
    const first = await send(body).expect(201);
    const second = await send(body).expect(201);

    expect(second.body).toEqual(first.body);
    expect(table.rows).toHaveLength(1);
    await vi.waitFor(() => expect(discord).toHaveBeenCalledTimes(1));
  });

  it('refuses a submission without the shared secret, or with a wrong one', async () => {
    const missing = await send(submission(), { secret: null }).expect(401);
    await send(submission(), { secret: 'not-the-secret' }).expect(401);

    expect(missing.body.code).toBe('CONTACT_UNAUTHORIZED');
    expect(table.rows).toHaveLength(0);
    expect(discord).not.toHaveBeenCalled();
  });

  it('limits one visitor to 5 an hour with a clear 429, not everyone', async () => {
    for (let i = 0; i < 5; i++) await send(submission()).expect(201);
    const limited = await send(submission()).expect(429);

    expect(limited.body).toMatchObject({
      status: 429,
      code: 'CONTACT_RATE_LIMITED',
    });
    expect(limited.body.message).toMatch(/other ways to reach me/);
    expect(limited.headers['retry-after-hour']).toBeDefined();
    expect(table.rows).toHaveLength(5);
    // another visitor behind the same site is unaffected
    await send(submission(), { ip: '198.51.100.9' }).expect(201);
  });

  it('still answers a retry of a stored message after the limit', async () => {
    const first = submission();
    await send(first).expect(201);
    for (let i = 0; i < 4; i++) await send(submission()).expect(201);
    await send(submission()).expect(429);

    await send(first).expect(201);
    expect(table.rows).toHaveLength(5);
  });

  it('succeeds and keeps the message when Discord is down', async () => {
    discord.mockRejectedValue(
      Object.assign(new TypeError('fetch failed'), {
        cause: { code: 'ECONNREFUSED' },
      }),
    );
    await send(submission()).expect(201);

    expect(table.rows).toHaveLength(1);
    await vi.waitFor(() => expect(discord).toHaveBeenCalledTimes(3));
  });

  it('gives bots the same success but stores and announces nothing', async () => {
    const trapped = await send(
      submission({ trap: 'https://spam.example' }),
    ).expect(201);
    const tooFast = await send(submission({ elapsedMs: 900 })).expect(201);

    expect(trapped.body.code).toBe('CONTACT_RECEIVED');
    expect(tooFast.body.code).toBe('CONTACT_RECEIVED');
    expect(table.rows).toHaveLength(0);
    expect(discord).not.toHaveBeenCalled();
  });

  it('rejects a message with more than 3 links in the usual error shape', async () => {
    const links = Array.from(
      { length: 4 },
      (_, i) => `https://x.dev/${i}`,
    ).join(' ');
    const res = await send(submission({ message: links })).expect(400);

    expect(res.body).toEqual({
      status: 400,
      message: 'message: Include 3 links or fewer',
      code: 'VALIDATION_FAILURE_MESSAGE',
    });
    expect(table.rows).toHaveLength(0);
  });
});
