import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { hashPassword } from '../src/admin/auth/password.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

// the e2e config sets these
const ADMIN_SECRET = 'e2e-admin-secret-0123456789abcdefgh';
const CONTACT_SECRET = 'e2e-contact-secret-0123456789abcdef';
const PASSWORD = 'a-long-test-password-1234';

type Session = {
  id: string;
  tokenHash: string;
  userId: string;
  createdAt: Date;
  lastUsedAt: Date;
  expiresAt: Date;
};

// the two auth tables in memory
async function fakeAuthTables() {
  const user = {
    id: randomUUID(),
    username: 'ether',
    passwordHash: await hashPassword(PASSWORD),
  };
  const sessions: Session[] = [];
  const db = {
    sessions,
    adminUser: {
      findUnique: ({ where }: { where: { username: string } }) =>
        Promise.resolve(where.username === user.username ? user : null),
    },
    adminSession: {
      create: ({
        data,
      }: {
        data: Omit<Session, 'id' | 'createdAt' | 'lastUsedAt'>;
      }) => {
        const row = {
          ...data,
          id: randomUUID(),
          createdAt: new Date(),
          lastUsedAt: new Date(),
        };
        sessions.push(row);
        return Promise.resolve(row);
      },
      findUnique: ({ where }: { where: { tokenHash: string } }) => {
        const row = sessions.find((s) => s.tokenHash === where.tokenHash);
        return Promise.resolve(
          row ? { ...row, user: { username: user.username } } : null,
        );
      },
      update: ({
        where,
        data,
      }: {
        where: { id: string };
        data: Partial<Session>;
      }) => {
        const row = sessions.find((s) => s.id === where.id)!;
        Object.assign(row, data);
        return Promise.resolve(row);
      },
      delete: ({ where }: { where: { id: string } }) => {
        sessions.splice(
          sessions.findIndex((s) => s.id === where.id),
          1,
        );
        return Promise.resolve();
      },
      deleteMany: ({
        where,
      }: {
        where: { id?: string; expiresAt?: { lt: Date } };
      }) => {
        // backwards, so removing one doesn't skip the next
        for (let i = sessions.length - 1; i >= 0; i--) {
          const s = sessions[i]!;
          if (
            (where.id && s.id === where.id) ||
            (where.expiresAt && s.expiresAt < where.expiresAt.lt)
          ) {
            sessions.splice(i, 1);
          }
        }
        return Promise.resolve();
      },
    },
    $transaction: (operations: Promise<unknown>[]) => Promise.all(operations),
  };
  return db;
}

describe('admin auth (e2e)', () => {
  let app: INestApplication;
  let db: Awaited<ReturnType<typeof fakeAuthTables>>;

  const post = (path: string, ip = '203.0.113.7') =>
    request(app.getHttpServer())
      .post(path)
      .set('x-admin-secret', ADMIN_SECRET)
      .set('x-client-ip', ip);
  const login = (password = PASSWORD, ip?: string) =>
    post('/admin/auth/login', ip).send({ username: 'ether', password });
  const session = (token?: string) => {
    const req = request(app.getHttpServer())
      .get('/admin/auth/session')
      .set('x-admin-secret', ADMIN_SECRET);
    return token ? req.set('x-admin-session', token) : req;
  };

  beforeEach(async () => {
    db = await fakeAuthTables();
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(db)
      .compile();
    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('signs in with the right password and the session works', async () => {
    const res = await login().expect(200);
    const { token, username, expiresAt, idleMinutes } = res.body.data;

    expect(username).toBe('ether');
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThanOrEqual(43);
    expect(new Date(expiresAt).getTime()).toBeGreaterThan(Date.now());
    expect(idleMinutes).toBe(30);
    // only the token's hash is stored
    expect(db.sessions[0]?.tokenHash).not.toBe(token);
    const me = await session(token).expect(200);
    expect(me.body.data.username).toBe('ether');
  });

  it('gives the same answer for a wrong password and an unknown username', async () => {
    const wrong = await login('not-the-password').expect(401);
    const unknown = await post('/admin/auth/login')
      .send({ username: 'nobody', password: PASSWORD })
      .expect(401);

    expect(wrong.body).toEqual(unknown.body);
    expect(wrong.body.code).toBe('ADMIN_LOGIN_FAILED');
    expect(db.sessions).toHaveLength(0);
  });

  it('refuses everything without the admin secret, and the contact secret is no substitute', async () => {
    const res = await request(app.getHttpServer())
      .post('/admin/auth/login')
      .set('x-admin-secret', CONTACT_SECRET)
      .send({ username: 'ether', password: PASSWORD })
      .expect(401);
    await request(app.getHttpServer())
      .post('/admin/auth/login')
      .send({ username: 'ether', password: PASSWORD })
      .expect(401);

    expect(res.body.code).toBe('ADMIN_UNAUTHORIZED');
  });

  it('refuses a missing, unknown or signed out session', async () => {
    const { token } = (await login().expect(200)).body.data;

    await session().expect(401);
    await session('made-up-token').expect(401);
    await post('/admin/auth/logout').set('x-admin-session', token).expect(200);
    const after = await session(token).expect(401);
    expect(after.body.code).toBe('ADMIN_SESSION_EXPIRED');
  });

  it('ends a session after 30 idle minutes', async () => {
    const { token } = (await login().expect(200)).body.data;
    db.sessions[0]!.lastUsedAt = new Date(Date.now() - 31 * 60 * 1000);

    await session(token).expect(401);
    expect(db.sessions).toHaveLength(0);
  });

  it('limits sign-in attempts to 5 per 15 minutes from one address', async () => {
    for (let i = 0; i < 5; i++) await login('wrong-password').expect(401);
    const limited = await login().expect(429);

    expect(limited.body.code).toBe('ADMIN_LOGIN_RATE_LIMITED');
    // another address can still sign in
    await login(PASSWORD, '198.51.100.9').expect(200);
  });

  it('rejects unknown fields in the login body', async () => {
    const res = await post('/admin/auth/login')
      .send({ username: 'ether', password: PASSWORD, admin: true })
      .expect(400);
    expect(res.body.code).toMatch(/^VALIDATION_FAILURE_/);
  });
});
