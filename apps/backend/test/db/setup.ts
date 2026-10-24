import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module.js';
import { configureApp } from '../../src/app.setup.js';
import { hashPassword } from '../../src/admin/auth/password.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';

const ADMIN_SECRET = 'db-test-admin-secret-0123456789abcdefgh';
const PASSWORD = 'db-test-password-0123456789';

/** Throws unless DATABASE_URL is a local database these tests may empty */
export function assertLocalDatabase() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('npm run test:db needs DATABASE_URL');
  const host = new URL(url).hostname;
  if (!['localhost', '127.0.0.1', '::1', 'postgres'].includes(host)) {
    throw new Error(`Refusing to run database tests against ${host}`);
  }
}

// every content table, never _prisma_migrations
const tables = [
  'AdminSession',
  'AdminUser',
  'ContactMessage',
  'Testimonial',
  'Section',
  'Project',
  'Stat',
  'Skill',
  'Service',
  'ContactLink',
  'Profile',
  'Media',
];

/** Empties every table, so the next suite (or CI's seed) starts clean */
export async function emptyDatabase(db: PrismaService) {
  await db.$executeRawUnsafe(
    `TRUNCATE ${tables.map((t) => `"${t}"`).join(', ')} CASCADE`,
  );
}

/** A real app on the test database, emptied, with one admin signed in */
export async function startApp() {
  assertLocalDatabase();
  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app: INestApplication = moduleFixture.createNestApplication();
  configureApp(app);
  await app.init();

  const db = app.get(PrismaService);
  await emptyDatabase(db);
  await db.adminUser.create({
    data: { username: 'ether', passwordHash: await hashPassword(PASSWORD) },
  });
  await db.profile.create({
    data: {
      brandName: 'Quivery',
      displayName: 'Ether',
      headline: 'Roblox systems engineer',
      tagline: 'Data, architecture and tooling',
    },
  });

  const login = await request(app.getHttpServer())
    .post('/admin/auth/login')
    .set('x-admin-secret', ADMIN_SECRET)
    .send({ username: 'ether', password: PASSWORD });
  const token = (login.body as { data: { token: string } }).data.token;

  // an admin request, signed in
  const admin = (method: 'get' | 'post' | 'put' | 'delete', path: string) =>
    request(app.getHttpServer())
      [method](path)
      .set('x-admin-secret', ADMIN_SECRET)
      .set('x-admin-session', token);

  return { app, db, admin };
}
