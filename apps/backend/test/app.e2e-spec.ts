import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';
import { configureApp } from './../src/app.setup.js';
import { PrismaService } from './../src/prisma/prisma.service.js';

describe('App (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      // none of these routes need the database
      .overrideProvider(PrismaService)
      .useValue({})
      .compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  it('GET /health reports a healthy service', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect((res) => {
        expect(res.body).toMatchObject({ status: 200, code: 'HEALTH_OK' });
      });
  });

  it('allows CORS from the web origin only, with credentials', () => {
    return request(app.getHttpServer())
      .get('/health')
      .set('Origin', 'http://localhost:3000')
      .expect('Access-Control-Allow-Origin', 'http://localhost:3000')
      .expect('Access-Control-Allow-Credentials', 'true');
  });

  // there's no public sign-up or login, so none of these may be routed
  it.each([
    ['post', '/users/register'],
    ['post', '/users/login'],
    ['get', '/players'],
  ] as const)('%s %s is not routed', async (method, path) => {
    await request(app.getHttpServer())[method](path).expect(404);
  });

  afterEach(async () => {
    await app.close();
  });
});
