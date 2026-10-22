import { Test, TestingModule } from '@nestjs/testing';
import { ServiceUnavailableException } from '@nestjs/common';
import { HealthController } from './health.controller.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('HealthController', () => {
  let controller: HealthController;
  const prisma = { $queryRaw: vi.fn() };

  beforeEach(async () => {
    prisma.$queryRaw.mockReset();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: PrismaService, useValue: prisma }],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('reports a healthy service', () => {
    expect(controller.check()).toMatchObject({
      status: 200,
      code: 'HEALTH_OK',
      data: { uptime: expect.any(Number) },
    });
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it('is ready when the database answers', async () => {
    prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
    await expect(controller.ready()).resolves.toMatchObject({
      status: 200,
      code: 'HEALTH_READY',
    });
  });

  it('is unavailable when the database does not answer', async () => {
    prisma.$queryRaw.mockRejectedValue(new Error('connection refused'));
    const error = await controller.ready().catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ServiceUnavailableException);
    expect((error as ServiceUnavailableException).getResponse()).toEqual({
      status: 503,
      message: 'The database is not reachable.',
      code: 'HEALTH_DATABASE_UNAVAILABLE',
    });
  });
});
